import { AdminNav } from "@/components/account-nav";
import { Breadcrumbs } from "@/components/catalog-tools";
import { OrderStatusControl, StoreNote } from "@/components/store-forms";
import { formatPrice } from "@/data/catalog";

const orders = [
  { id: "EM-2608", customer: "Мадина Ахмедова", item: "Samsung Galaxy A36 5G, 256 ГБ · 1 шт.", total: 4_489_000 },
  { id: "EM-2604", customer: "Дилшод Каримов", item: "JBL Tune 520 · 1 шт.", total: 790_000 },
];

export default function AdminOrdersPage() {
  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Админ-панель", href: "/admin" }, { label: "Заказы" }]} />
    <div className="page-title-row"><div><h1>Заказы</h1><p>Состав заказа, клиент и статус доставки.</p></div></div>
    <div className="admin-layout"><AdminNav active="/admin/orders" /><div className="admin-content"><StoreNote>Изменяйте статус, когда заказ переходит на следующий этап.</StoreNote>
      <section className="admin-panel"><h2>Последние заказы</h2><div className="admin-order-list">{orders.map((order) => <article className="admin-order-row" key={order.id}><div><strong>{order.id}</strong><span>{order.customer} · {order.item}</span><b>{formatPrice(order.total)}</b></div><OrderStatusControl orderId={order.id} /></article>)}</div></section>
    </div></div>
  </main>;
}
