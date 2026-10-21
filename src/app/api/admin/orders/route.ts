import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { adminAuditLogs, orderItems, orders } from "@/lib/db/schema";

const ALLOWED_ORDER_STAGES = new Set([
  "Новый",
  "Собирается",
  "Передан в доставку",
  "Завершён",
]);

const STAGE_CODE_MAP: Record<string, string> = {
  new: "Новый",
  assembly: "Собирается",
  delivery: "Передан в доставку",
  done: "Завершён",
};

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json(
      { message: "Доступ к заказам админ-панели разрешён только администратору." },
      { status: 403 },
    );
  }

  const db = getDatabase();
  const [allOrders, allItems, auditRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)),
    db.select().from(orderItems),
    db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(20),
  ]);

  const itemsByOrder = new Map<string, typeof allItems>();
  for (const item of allItems) {
    const current = itemsByOrder.get(item.orderId) ?? [];
    current.push(item);
    itemsByOrder.set(item.orderId, current);
  }

  return NextResponse.json({
    orders: allOrders.map((order) => {
      const lines = itemsByOrder.get(order.id) ?? [];
      return {
        id: order.id,
        customer: order.recipientName,
        phone: order.recipientPhone,
        item:
          lines.map((l) => `${l.productTitle} · ${l.quantity} шт.`).join(", ") ||
          "Товары ЭлектроМаркет",
        total: Number(order.totalUzs),
        status: order.status,
        paymentStatus: order.paymentStatus,
      };
    }),
    auditLogs: auditRows,
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json(
      { message: "Только администратор может менять этап обработки заказа." },
      { status: 403 },
    );
  }

  let body: {
    orderId?: unknown;
    status?: unknown;
    paymentStatus?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный формат запроса." }, { status: 400 });
  }

  if (body.paymentStatus !== undefined) {
    return NextResponse.json(
      {
        message:
          "Администратор не может вручную выставлять статус оплаты. Оплата подтверждается только событием платёжного провайдера.",
      },
      { status: 400 },
    );
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const rawStatus = typeof body.status === "string" ? body.status.trim() : "";
  const mappedStatus = STAGE_CODE_MAP[rawStatus] ?? rawStatus;

  if (!orderId || !ALLOWED_ORDER_STAGES.has(mappedStatus)) {
    return NextResponse.json(
      { message: "Укажите корректный заказ и допустимый этап обработки." },
      { status: 400 },
    );
  }

  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ message: "Заказ не найден." }, { status: 404 });
  }

  await db
    .update(orders)
    .set({ status: mappedStatus })
    .where(eq(orders.id, orderId));

  await db.insert(adminAuditLogs).values({
    actorUserId: sessionUser.userId,
    action: "order.stage_change",
    targetType: "order",
    targetId: orderId,
    details: {
      previousStage: existing.status,
      nextStage: mappedStatus,
    },
  });

  return NextResponse.json({
    updated: true,
    order: {
      id: orderId,
      status: mappedStatus,
      paymentStatus: existing.paymentStatus,
    },
    message: `Статус заказа ${orderId} изменён на «${mappedStatus}».`,
  });
}
