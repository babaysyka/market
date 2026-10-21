import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";
import {
  createOrderReturnToken,
  getPositiveExchangeRate,
  getStripeTestClient,
  makeIdempotencyKeys,
} from "@/lib/payments/config";

export async function POST(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ message: "База данных не настроена для тестовой оплаты." }, { status: 503 });
  }

  let body: { orderId?: unknown; orderAccessKey?: unknown; idempotencyKey?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный запрос создания платежа." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const orderAccessKey = typeof body.orderAccessKey === "string" ? body.orderAccessKey.trim() : "";
  const requestKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : "";
  if (!orderId || !/^[\w-]{8,128}$/.test(orderAccessKey) || !/^[\w-]{8,128}$/.test(requestKey)) {
    return NextResponse.json({ message: "Укажите номер заказа и ключ платежа." }, { status: 400 });
  }

  const exchangeRate = getPositiveExchangeRate("STRIPE_TEST_UZS_PER_USD");
  if (!exchangeRate) {
    return NextResponse.json(
      { message: "Задайте курс STRIPE_TEST_UZS_PER_USD (сум за 1 USD)." },
      { status: 503 },
    );
  }

  let stripe: ReturnType<typeof getStripeTestClient>;
  try {
    stripe = getStripeTestClient();
  } catch {
    return NextResponse.json({ message: "Добавьте тестовый ключ Stripe на сервер (sk_test_...)." }, { status: 503 });
  }

  const db = getDatabase();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.idempotencyKey !== orderAccessKey) {
    return NextResponse.json({ message: "Заказ для оплаты не найден." }, { status: 404 });
  }

  const keys = makeIdempotencyKeys("stripe_test", orderId, requestKey);
  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.idempotencyKey, keys.database))
    .limit(1);

  if (existingPayment) {
    if (existingPayment.orderId !== orderId || existingPayment.provider !== "stripe_test") {
      return NextResponse.json({ message: "Ключ уже использован для другого платежа." }, { status: 409 });
    }
    return NextResponse.json({ payment: toClientPayment(existingPayment), deduplicated: true });
  }

  const [activePayment] = await db
    .select()
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "pending")))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  if (activePayment) {
    return NextResponse.json(
      { message: "Для этого заказа уже создана ссылка на оплату. Завершите её перед выбором другого способа." },
      { status: 409 },
    );
  }

  if (order.paymentStatus === "paid") {
    return NextResponse.json({ message: "Этот заказ уже оплачен." }, { status: 409 });
  }

  const amountUzs = Number(order.totalUzs);
  const amountMinor = Math.round((amountUzs / exchangeRate) * 100);
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 50 || amountMinor > 99_999_999) {
    return NextResponse.json({ message: "Сумма заказа после конвертации не подходит для тестовой оплаты Stripe." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const returnToken = createOrderReturnToken(order.id, order.idempotencyKey);
  let session: Awaited<ReturnType<typeof stripe.checkout.sessions.create>>;
  try {
    session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        currency: "usd",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: amountMinor,
              product_data: { name: `Оплата заказа ${order.id}` },
            },
            quantity: 1,
          },
        ],
        client_reference_id: order.id,
        metadata: { orderId: order.id, test: "true" },
        payment_intent_data: { metadata: { orderId: order.id, test: "true" } },
        success_url: `${origin}/checkout/return?orderId=${encodeURIComponent(order.id)}&returnToken=${encodeURIComponent(returnToken)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/checkout/return?orderId=${encodeURIComponent(order.id)}&returnToken=${encodeURIComponent(returnToken)}&cancelled=1`,
      },
      { idempotencyKey: keys.provider },
    );
  } catch {
    return NextResponse.json(
      { message: "Stripe не создал тестовую оплату. Проверьте тестовый аккаунт и настройки валюты." },
      { status: 502 },
    );
  }

  if (!session.id || session.livemode || !session.url?.startsWith("https://checkout.stripe.com")) {
    return NextResponse.json({ message: "Stripe вернул неожиданные данные тестовой сессии." }, { status: 502 });
  }

  try {
    const [payment] = await db
      .insert(payments)
      .values({
        providerPaymentId: session.id,
        orderId: order.id,
        provider: "stripe_test",
        amountUzs,
        amountMinor,
        currency: "USD",
        exchangeRateUzsPerUnit: exchangeRate,
        status: "pending",
        isTest: true,
        idempotencyKey: keys.database,
        confirmationUrl: session.url,
      })
      .returning();
    await db.update(orders).set({ paymentStatus: "pending" }).where(eq(orders.id, order.id));
    return NextResponse.json({ payment: toClientPayment(payment), deduplicated: false });
  } catch {
    return NextResponse.json({ message: "Не удалось сохранить тестовый платёж. Повторите запрос с тем же ключом." }, { status: 503 });
  }
}

function toClientPayment(payment: typeof payments.$inferSelect) {
  return {
    provider: payment.provider,
    providerPaymentId: payment.providerPaymentId,
    orderId: payment.orderId,
    amountUzs: Number(payment.amountUzs),
    amount: (payment.amountMinor / 100).toFixed(2),
    currency: payment.currency,
    exchangeRateUzsPerUnit: payment.exchangeRateUzsPerUnit,
    status: payment.status,
    isTest: payment.isTest,
    confirmationUrl: payment.confirmationUrl,
  };
}
