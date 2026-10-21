import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";

type YookassaWebhookPayload = {
  event?: unknown;
  object?: {
    id?: unknown;
    status?: unknown;
    paid?: unknown;
    test?: unknown;
    amount?: {
      value?: unknown;
      currency?: unknown;
    };
    metadata?: {
      orderId?: unknown;
    };
  };
};

export async function POST(request: Request) {
  let body: YookassaWebhookPayload;
  try {
    body = (await request.json()) as YookassaWebhookPayload;
  } catch {
    return NextResponse.json({ message: "Некорректный формат уведомления ЮKassa." }, { status: 400 });
  }

  const event = typeof body.event === "string" ? body.event : "";
  const paymentObj = body.object;
  const providerPaymentId =
    typeof paymentObj?.id === "string" ? paymentObj.id.trim() : "";
  const orderId =
    typeof paymentObj?.metadata?.orderId === "string"
      ? paymentObj.metadata.orderId.trim()
      : "";
  const amountValue =
    typeof paymentObj?.amount?.value === "string"
      ? Number(paymentObj.amount.value)
      : Number(paymentObj?.amount?.value);
  const currency =
    typeof paymentObj?.amount?.currency === "string"
      ? paymentObj.amount.currency.trim()
      : "";

  if (!providerPaymentId || !orderId || !Number.isFinite(amountValue) || !currency) {
    return NextResponse.json(
      { message: "В уведомлении отсутствуют обязательные поля платежа или заказа." },
      { status: 400 },
    );
  }

  if (paymentObj?.test !== true) {
    return NextResponse.json(
      { message: "Принимаются только тестовые платежи ЮKassa (test: true)." },
      { status: 400 },
    );
  }

  const db = getDatabase();
  const [storedPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.providerPaymentId, providerPaymentId))
    .limit(1);

  if (!storedPayment) {
    return NextResponse.json({ message: "Платёж не найден в системе магазина." }, { status: 404 });
  }

  const expectedMinor = storedPayment.amountRubMinor;
  const incomingMinor = Math.round(amountValue * 100);

  if (
    storedPayment.orderId !== orderId ||
    storedPayment.currency !== currency ||
    expectedMinor !== incomingMinor
  ) {
    return NextResponse.json(
      { message: "Сумма, валюта или заказ в уведомлении не совпадают с созданным платежом." },
      { status: 400 },
    );
  }

  if (storedPayment.status === "succeeded") {
    return NextResponse.json({
      verified: true,
      alreadyProcessed: true,
      orderId: storedPayment.orderId,
      paymentStatus: "paid",
    });
  }

  if (event === "payment.succeeded" && paymentObj?.status === "succeeded") {
    const now = new Date();
    await db
      .update(payments)
      .set({
        status: "succeeded",
        webhookVerifiedAt: now,
      })
      .where(eq(payments.providerPaymentId, providerPaymentId));

    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
      })
      .where(eq(orders.id, storedPayment.orderId));

    return NextResponse.json({
      verified: true,
      alreadyProcessed: false,
      orderId: storedPayment.orderId,
      paymentStatus: "paid",
    });
  }

  if (event === "payment.canceled" || paymentObj?.status === "canceled") {
    await db
      .update(payments)
      .set({
        status: "canceled",
        webhookVerifiedAt: new Date(),
      })
      .where(eq(payments.providerPaymentId, providerPaymentId));

    await db
      .update(orders)
      .set({
        paymentStatus: "canceled",
      })
      .where(eq(orders.id, storedPayment.orderId));

    return NextResponse.json({
      verified: true,
      alreadyProcessed: false,
      orderId: storedPayment.orderId,
      paymentStatus: "canceled",
    });
  }

  return NextResponse.json({ message: "Событие платежа не требует смены статуса." });
}
