import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getDatabase } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";
import { getStripeTestClient } from "@/lib/payments/config";
import { getLatestPaymentForOrder, syncPaymentFromProvider } from "@/lib/payments/verify";

const handledEvents = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ message: "Stripe webhook не настроен." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    const body = await request.text();
    const stripe = getStripeTestClient();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ message: "Подпись тестового webhook Stripe не прошла проверку." }, { status: 400 });
  }

  if (event.livemode) {
    return NextResponse.json({ message: "Принимаются только события Stripe TEST." }, { status: 400 });
  }
  if (!handledEvents.has(event.type)) return NextResponse.json({ received: true });

  const session = event.data.object as { id?: unknown };
  const sessionId = typeof session.id === "string" ? session.id : "";
  if (!sessionId) return NextResponse.json({ message: "В событии нет ID Checkout Session." }, { status: 400 });

  try {
    const db = getDatabase();
    const [payment] = await db
      .select()
      .from(payments)
      .where(eq(payments.providerPaymentId, sessionId))
      .limit(1);

    if (!payment || payment.provider !== "stripe_test" || !payment.isTest) {
      return NextResponse.json({ received: true, ignored: true });
    }

    let status = await syncPaymentFromProvider(payment);
    if (event.type === "checkout.session.async_payment_failed" && status !== "succeeded") {
      const [updatedPayment] = await db
        .update(payments)
        .set({ status: "canceled", webhookVerifiedAt: new Date() })
        .where(and(eq(payments.id, payment.id), eq(payments.status, "pending")))
        .returning({ id: payments.id });
      if (updatedPayment) {
        const latestPayment = await getLatestPaymentForOrder(payment.orderId);
        if (latestPayment?.id === payment.id) {
          await db
            .update(orders)
            .set({ paymentStatus: "canceled" })
            .where(and(eq(orders.id, payment.orderId), ne(orders.paymentStatus, "paid")));
        }
      }
      status = "canceled";
    }
    return NextResponse.json({
      received: true,
      verified: true,
      orderId: payment.orderId,
      paymentStatus: status === "succeeded" ? "paid" : status,
    });
  } catch {
    return NextResponse.json(
      { message: "Не удалось проверить Checkout Session Stripe. Stripe повторит уведомление." },
      { status: 503 },
    );
  }
}
