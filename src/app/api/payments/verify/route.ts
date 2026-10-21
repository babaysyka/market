import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { verifyOrderReturnToken } from "@/lib/payments/config";
import { getLatestPaymentForOrder, syncPaymentFromProvider } from "@/lib/payments/verify";

export async function POST(request: Request) {
  let body: { orderId?: unknown; returnToken?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный запрос проверки оплаты." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const returnToken = typeof body.returnToken === "string" ? body.returnToken.trim() : "";
  if (!orderId || !returnToken) {
    return NextResponse.json({ message: "Не удалось проверить доступ к заказу." }, { status: 404 });
  }

  try {
    const db = getDatabase();
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || !verifyOrderReturnToken(orderId, order.idempotencyKey, returnToken)) {
      return NextResponse.json({ message: "Заказ не найден." }, { status: 404 });
    }

    const payment = await getLatestPaymentForOrder(orderId);
    if (!payment) return NextResponse.json({ message: "Платёж для заказа не найден." }, { status: 404 });

    const providerStatus = await syncPaymentFromProvider(payment);
    const status = providerStatus === "pending" && payment.status === "canceled"
      ? "canceled"
      : providerStatus;

    return NextResponse.json({
      orderId: payment.orderId,
      provider: payment.provider,
      paymentStatus: status === "succeeded" ? "paid" : status,
      confirmationUrl: status === "pending" ? payment.confirmationUrl : null,
      isTest: payment.isTest,
    });
  } catch {
    return NextResponse.json({ message: "Не удалось проверить платёж у провайдера." }, { status: 503 });
  }
}
