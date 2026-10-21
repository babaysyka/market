import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";

const TEST_EXCHANGE_RATE_UZS_PER_RUB = 140;

export async function POST(request: Request) {
  const secretKey = process.env.YOOKASSA_TEST_SECRET_KEY ?? "test_mock_key_safe";
  if (secretKey.startsWith("live_")) {
    return NextResponse.json(
      { message: "Боевые ключи ЮKassa запрещены. Разрешён только тестовый магазин (test_*)." },
      { status: 403 },
    );
  }

  let body: {
    orderId?: unknown;
    idempotencyKey?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный запрос создания платежа." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const idempotencyKey =
    typeof body.idempotencyKey === "string" && body.idempotencyKey.trim()
      ? body.idempotencyKey.trim()
      : "";

  if (!orderId || !idempotencyKey) {
    return NextResponse.json(
      { message: "Укажите номер заказа (orderId) и ключ идемпотентности (idempotencyKey)." },
      { status: 400 },
    );
  }

  const db = getDatabase();

  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existingPayment) {
    return NextResponse.json({
      payment: {
        providerPaymentId: existingPayment.providerPaymentId,
        orderId: existingPayment.orderId,
        amountUzs: Number(existingPayment.amountUzs),
        amountRub: (existingPayment.amountRubMinor / 100).toFixed(2),
        currency: existingPayment.currency,
        exchangeRateUzsPerRub: existingPayment.exchangeRateUzsPerRub,
        status: existingPayment.status,
        isTest: existingPayment.isTest,
        confirmationUrl: existingPayment.confirmationUrl,
      },
      deduplicated: true,
    });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json({ message: "Заказ для оплаты не найден." }, { status: 404 });
  }

  const amountUzs = Number(order.totalUzs);
  const amountRubMinor = Math.max(
    100,
    Math.round((amountUzs / TEST_EXCHANGE_RATE_UZS_PER_RUB) * 100),
  );
  const providerPaymentId = `yk_test_${randomBytes(10).toString("hex")}`;
  const confirmationUrl = `/checkout?order=${encodeURIComponent(order.id)}&testPayment=${encodeURIComponent(providerPaymentId)}`;

  await db.insert(payments).values({
    providerPaymentId,
    orderId: order.id,
    provider: "yookassa_test",
    amountUzs,
    amountRubMinor,
    currency: "RUB",
    exchangeRateUzsPerRub: TEST_EXCHANGE_RATE_UZS_PER_RUB,
    status: "pending",
    isTest: true,
    idempotencyKey,
    confirmationUrl,
  });

  return NextResponse.json({
    payment: {
      providerPaymentId,
      orderId: order.id,
      amountUzs,
      amountRub: (amountRubMinor / 100).toFixed(2),
      currency: "RUB",
      exchangeRateUzsPerRub: TEST_EXCHANGE_RATE_UZS_PER_RUB,
      status: "pending",
      isTest: true,
      confirmationUrl,
    },
    deduplicated: false,
  });
}
