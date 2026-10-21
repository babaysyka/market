import "server-only";

import { and, desc, eq, ne } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { orders, payments } from "@/lib/db/schema";
import { getStripeTestClient } from "./config";

type StoredPayment = typeof payments.$inferSelect;
type VerifiedStatus = "pending" | "succeeded" | "canceled";

async function readStripeStatus(payment: StoredPayment): Promise<VerifiedStatus> {
  const stripe = getStripeTestClient();
  const session = await stripe.checkout.sessions.retrieve(payment.providerPaymentId);

  if (
    session.id !== payment.providerPaymentId ||
    session.livemode !== false ||
    session.client_reference_id !== payment.orderId ||
    session.metadata?.orderId !== payment.orderId ||
    session.metadata?.test !== "true" ||
    session.currency?.toLowerCase() !== payment.currency.toLowerCase() ||
    session.amount_total !== payment.amountMinor
  ) {
    throw new Error("Stripe payment details do not match the order.");
  }

  if (session.payment_status === "paid") return "succeeded";
  if (session.status === "expired") return "canceled";
  return "pending";
}

export async function syncPaymentFromProvider(payment: StoredPayment) {
  const db = getDatabase();

  if (payment.status === "succeeded") {
    await db
      .update(orders)
      .set({ paymentStatus: "paid" })
      .where(and(eq(orders.id, payment.orderId), ne(orders.paymentStatus, "paid")));
    return "succeeded" as const;
  }

  const verifiedStatus =
    payment.provider === "stripe_test" ? await readStripeStatus(payment) : null;

  if (!verifiedStatus) throw new Error("Unsupported test payment provider.");

  if (verifiedStatus === "succeeded") {
    await db
      .update(payments)
      .set({ status: "succeeded", webhookVerifiedAt: new Date() })
      .where(and(eq(payments.id, payment.id), ne(payments.status, "succeeded")));
    await db
      .update(orders)
      .set({ paymentStatus: "paid" })
      .where(and(eq(orders.id, payment.orderId), ne(orders.paymentStatus, "paid")));
  } else if (verifiedStatus === "canceled") {
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
  }

  return verifiedStatus;
}

export async function getLatestPaymentForOrder(orderId: string) {
  const db = getDatabase();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.orderId, orderId))
    .orderBy(desc(payments.createdAt))
    .limit(1);
  return payment;
}
