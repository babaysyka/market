import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser, resolveUserIdFromEmail } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { getCatalogProducts } from "@/lib/db/catalog";
import { cartItems, profiles } from "@/lib/db/schema";

type CartLineInput = {
  productId?: unknown;
  quantity?: unknown;
};

async function ensureProfile(email: string, name = "Покупатель") {
  const db = getDatabase();
  const normalizedEmail = email.trim().toLowerCase();
  const fallbackUserId = resolveUserIdFromEmail(normalizedEmail);

  await db
    .insert(profiles)
    .values({
      userId: fallbackUserId,
      email: normalizedEmail,
      fullName: name,
    })
    .onConflictDoNothing();

  const [existing] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.email, normalizedEmail))
    .limit(1);

  return existing?.userId ?? fallbackUserId;
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  const { searchParams } = new URL(request.url);
  const requestedEmail = searchParams.get("email")?.trim().toLowerCase() ?? "";

  if (sessionUser && requestedEmail && requestedEmail !== sessionUser.email) {
    return NextResponse.json(
      { message: "Доступ к чужой корзине запрещён." },
      { status: 403 },
    );
  }

  const targetEmail = sessionUser?.email || requestedEmail;
  if (!targetEmail || !process.env.DATABASE_URL) {
    return NextResponse.json({ items: [], subtotalUzs: 0 });
  }

  try {
    const db = getDatabase();
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, targetEmail))
      .limit(1);

    if (!profile) {
      return NextResponse.json({ items: [], subtotalUzs: 0 });
    }

    const [rows, catalogProducts] = await Promise.all([
      db
        .select({
          productId: cartItems.productId,
          quantity: cartItems.quantity,
        })
        .from(cartItems)
        .where(eq(cartItems.userId, profile.userId)),
      getCatalogProducts(),
    ]);

    const priceById = new Map(catalogProducts.map((p) => [p.id, p.price]));
    const enriched = rows.map((row) => {
      const unitPriceUzs = priceById.get(row.productId) ?? 0;
      return {
        productId: row.productId,
        quantity: row.quantity,
        unitPriceUzs,
        lineTotalUzs: unitPriceUzs * row.quantity,
      };
    });
    const subtotalUzs = enriched.reduce((sum, item) => sum + item.lineTotalUzs, 0);

    return NextResponse.json({ items: enriched, subtotalUzs });
  } catch {
    return NextResponse.json({ items: [], subtotalUzs: 0 });
  }
}

export async function PUT(request: Request) {
  const sessionUser = await getSessionUser(request);

  let body: { email?: unknown; name?: unknown; items?: unknown; merge?: unknown };
  try {
    body = (await request.json()) as {
      email?: unknown;
      name?: unknown;
      items?: unknown;
      merge?: unknown;
    };
  } catch {
    return NextResponse.json({ message: "Некорректный формат корзины." }, { status: 400 });
  }

  const bodyEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (sessionUser && bodyEmail && bodyEmail !== sessionUser.email) {
    return NextResponse.json(
      { message: "Нельзя изменять корзину другого аккаунта." },
      { status: 403 },
    );
  }

  const email = sessionUser?.email || bodyEmail;
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "Укажите email пользователя." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? (body.items as CartLineInput[]) : [];
  const normalizedMap = new Map<string, number>();

  for (const line of rawItems) {
    if (typeof line?.productId !== "string") continue;
    const qty = Number(line.quantity);
    if (!Number.isInteger(qty) || qty < 1) continue;
    const current = normalizedMap.get(line.productId) ?? 0;
    normalizedMap.set(line.productId, Math.min(9, current + qty));
  }

  const catalogProducts = await getCatalogProducts();
  const productMap = new Map(catalogProducts.map((p) => [p.id, p]));

  if (!process.env.DATABASE_URL) {
    const items = Array.from(normalizedMap.entries())
      .filter(([productId]) => productMap.has(productId))
      .map(([productId, quantity]) => {
        const unitPriceUzs = productMap.get(productId)?.price ?? 0;
        return {
          productId,
          quantity,
          unitPriceUzs,
          lineTotalUzs: unitPriceUzs * quantity,
        };
      });
    const subtotalUzs = items.reduce((sum, item) => sum + item.lineTotalUzs, 0);
    return NextResponse.json({ items, subtotalUzs });
  }

  try {
    const db = getDatabase();
    const userId =
      sessionUser?.userId ??
      (await ensureProfile(
        email,
        typeof body.name === "string" && body.name.trim() ? body.name.trim() : "Покупатель",
      ));

    if (body.merge === true) {
      const existingRows = await db
        .select()
        .from(cartItems)
        .where(eq(cartItems.userId, userId));

      for (const row of existingRows) {
        const guestQty = normalizedMap.get(row.productId) ?? 0;
        normalizedMap.set(row.productId, Math.min(9, row.quantity + guestQty));
      }
    }

    await db.delete(cartItems).where(eq(cartItems.userId, userId));

    const validEntries = Array.from(normalizedMap.entries()).filter(([productId]) => {
      const product = productMap.get(productId);
      return Boolean(product && product.inStock);
    });

    for (const [productId, quantity] of validEntries) {
      await db.insert(cartItems).values({
        userId,
        productId,
        quantity: Math.min(9, Math.max(1, quantity)),
      });
    }

    const saved = validEntries.map(([productId, quantity]) => {
      const unitPriceUzs = productMap.get(productId)?.price ?? 0;
      return {
        productId,
        quantity,
        unitPriceUzs,
        lineTotalUzs: unitPriceUzs * quantity,
      };
    });
    const subtotalUzs = saved.reduce((sum, item) => sum + item.lineTotalUzs, 0);

    return NextResponse.json({ items: saved, subtotalUzs });
  } catch {
    return NextResponse.json({ message: "Не удалось синхронизировать корзину." }, { status: 500 });
  }
}
