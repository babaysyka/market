import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog-tools";
import { PaymentReturnStatus } from "@/components/payment-return-status";

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; returnToken?: string; cancelled?: string }>;
}) {
  const params = await searchParams;
  const orderId = params.orderId?.trim() ?? "";

  return (
    <main className="page-wrap page-main">
      <Breadcrumbs items={[{ label: "Корзина", href: "/cart" }, { label: "Статус оплаты" }]} />
      <div className="page-title-row">
        <div>
          <h1>Статус оплаты</h1>
          <p>Заказ считается оплаченным только после проверки платёжного сервиса.</p>
        </div>
      </div>
      {orderId ? (
        <PaymentReturnStatus
          orderId={orderId}
          returnToken={params.returnToken ?? ""}
          canceledReturn={params.cancelled === "1"}
        />
      ) : (
        <div className="empty-state">
          <div>
            <strong>Не найден номер заказа</strong>
            <span>Откройте заказ в личном кабинете, чтобы проверить оплату.</span>
            <p><Link className="text-link" href="/account/orders">Мои заказы</Link></p>
          </div>
        </div>
      )}
    </main>
  );
}
