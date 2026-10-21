import { desc, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser, resolveUserIdFromEmail } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { getCatalogProducts } from "@/lib/db/catalog";
import { addresses, cartItems, orderItems, orders, products, profiles } from "@/lib/db/schema";

type OrderItemInput = {
  productId?: unknown;
  quantity?: unknown;
};

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  const { searchParams } = new URL(request.url);
  const requestedEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (sessionUser && requestedEmail && requestedEmail !== sessionUser.email) {
    return NextResponse.json(
      { message: "Доступ к заказам другого пользователя запрещён." },
      { status: 403 },
    );
  }

  const email = sessionUser?.email || requestedEmail;
  if (!email || !process.env.DATABASE_URL) {
    return NextResponse.json({ orders: [] });
  }

  try {
    const db = getDatabase();
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ orders: [] });
    }

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, profile.userId))
      .orderBy(desc(orders.createdAt));

    const allItems = await db.select().from(orderItems);
    const itemsByOrder = new Map<string, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const formatted = userOrders.map((order) => {
      const lines = itemsByOrder.get(order.id) ?? [];
      const titleSummary =
        lines.map((l) => `${l.productTitle} · ${l.quantity} шт.`).join(", ") ||
        "Товары ЭлектроМаркет";
      const dateFormatted = new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(order.createdAt);

      return {
        id: order.id,
        date: dateFormatted,
        title: titleSummary,
        total: Number(order.totalUzs),
        deliveryUzs: Number(order.deliveryUzs),
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        source: order.source,
        items: lines.map((line) => ({
          productId: line.productId,
          productTitle: line.productTitle,
          unitPriceUzs: Number(line.unitPriceUzs),
          quantity: line.quantity,
          lineTotalUzs: Number(line.lineTotalUzs),
        })),
      };
    });

    return NextResponse.json({ orders: formatted });
  } catch {
    return NextResponse.json({ orders: [] });
  }
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);

  let body: {
    email?: unknown;
    name?: unknown;
    phone?: unknown;
    address?: unknown;
    source?: unknown;
    idempotencyKey?: unknown;
    items?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректные данные заказа." }, { status: 400 });
  }

  const recipientName = typeof body.name === "string" ? body.name.trim() : "";
  const recipientPhone = typeof body.phone === "string" ? body.phone.trim() : "";
  const shippingAddress = typeof body.address === "string" ? body.address.trim() : "";
  const bodyEmail =
    typeof body.email === "string" && body.email.trim().includes("@")
      ? body.email.trim().toLowerCase()
      : "";

  if (sessionUser && bodyEmail && bodyEmail !== sessionUser.email) {
    return NextResponse.json(
      { message: "Нельзя оформлять заказ от имени чужого аккаунта." },
      { status: 403 },
    );
  }

  const email = sessionUser?.email || bodyEmail || "guest@electromarket.uz";
  const source = body.source === "telegram_mini_app" ? "telegram_mini_app" : "web";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : "";

  if (!recipientName || !recipientPhone || !shippingAddress) {
    return NextResponse.json(
      { message: "Заполните имя получателя, телефон и адрес доставки." },
      { status: 400 },
    );
  }

  if (!idempotencyKey) {
    return NextResponse.json(
      { message: "Отсутствует ключ защиты от повторного создания заказа (idempotencyKey)." },
      { status: 400 },
    );
  }

  const rawItems = Array.isArray(body.items) ? (body.items as OrderItemInput[]) : [];
  if (rawItems.length === 0) {
    return NextResponse.json({ message: "Корзина пуста." }, { status: 400 });
  }

  const catalogProducts = await getCatalogProducts();
  const productById = new Map(catalogProducts.map((p) => [p.id, p]));

  const mergedQuantities = new Map<string, number>();
  for (const item of rawItems) {
    if (typeof item?.productId !== "string") continue;
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty < 1) continue;
    const prev = mergedQuantities.get(item.productId) ?? 0;
    mergedQuantities.set(item.productId, Math.min(9, prev + qty));
  }

  const validatedLines: {
    productId: string;
    productTitle: string;
    unitPriceUzs: number;
    quantity: number;
    lineTotalUzs: number;
  }[] = [];

  for (const [productId, boundedQty] of mergedQuantities.entries()) {
    const product = productById.get(productId);
    if (!product || !product.inStock) {
      return NextResponse.json(
        { message: `Товар «${product?.name ?? productId}» недоступен для заказа.` },
        { status: 409 },
      );
    }

    validatedLines.push({
      productId: product.id,
      productTitle: product.name,
      unitPriceUzs: product.price,
      quantity: boundedQty,
      lineTotalUzs: product.price * boundedQty,
    });
  }

  if (validatedLines.length === 0) {
    return NextResponse.json({ message: "Нет доступных позиций для оформления заказа." }, { status: 400 });
  }

  const subtotal = validatedLines.reduce((sum, line) => sum + line.lineTotalUzs, 0);
  const deliveryUzs = subtotal >= 1_000_000 ? 0 : 40_000;
  const totalUzs = subtotal + deliveryUzs;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      order: {
        id: "EM-2609",
        total: totalUzs,
        deliveryUzs,
        status: "Новый",
        paymentStatus: "pending",
        source,
      },
      deduplicated: false,
    });
  }

  try {
    const db = getDatabase();

    const [existingOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existingOrder) {
      return NextResponse.json({
        order: {
          id: existingOrder.id,
          total: Number(existingOrder.totalUzs),
          deliveryUzs: Number(existingOrder.deliveryUzs),
          status: existingOrder.status,
          paymentStatus: existingOrder.paymentStatus,
          source: existingOrder.source,
        },
        deduplicated: true,
      });
    }

    const fallbackUserId = sessionUser?.userId ?? resolveUserIdFromEmail(email);
    await db
      .insert(profiles)
      .values({
        userId: fallbackUserId,
        email,
        fullName: recipientName,
        phone: recipientPhone,
      })
      .onConflictDoNothing();

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email))
      .limit(1);

    const userId = profile?.userId ?? fallbackUserId;

    await db.insert(addresses).values({
      userId,
      recipientName,
      recipientPhone,
      city: "Ташкент",
      streetAddress: shippingAddress,
      isDefault: true,
    });

    const orderNumber = `EM-${String(Math.floor(1000 + Math.random() * 9000))}`;

    await db.insert(orders).values({
      id: orderNumber,
      userId,
      recipientName,
      recipientPhone,
      shippingAddress,
      deliveryUzs,
      totalUzs,
      status: "Новый",
      paymentStatus: "pending",
      source,
      idempotencyKey,
    });

    for (const line of validatedLines) {
      await db.insert(orderItems).values({
        orderId: orderNumber,
        productId: line.productId,
        productTitle: line.productTitle,
        unitPriceUzs: line.unitPriceUzs,
        quantity: line.quantity,
        lineTotalUzs: line.lineTotalUzs,
      });

      await db.execute(sql`
        update products
        set stock_quantity = greatest(0, stock_quantity - ${line.quantity}),
            updated_at = now()
        where id = ${line.productId}
      `);
    }

    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    return NextResponse.json({
      order: {
        id: orderNumber,
        total: totalUzs,
        deliveryUzs,
        status: "Новый",
        paymentStatus: "pending",
        source,
      },
      deduplicated: false,
    });
  } catch {
    return NextResponse.json(
      { message: "Ошибка сохранения заказа. Проверьте соединение и повторите попытку." },
      { status: 500 },
    );
  }
}
