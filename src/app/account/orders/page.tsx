"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AccountGate } from "@/components/account-access";
import { AccountNav } from "@/components/account-nav";
import { Breadcrumbs } from "@/components/catalog-tools";
import { useStore } from "@/components/store-provider";
import { formatPrice } from "@/data/catalog";

type OrderSummary = {
  id: string;
  date: string;
  title: string;
  total: number;
  status: string;
  source?: string;
};

const fallbackOrders: OrderSummary[] = [
  { id: "EM-2608", date: "18 октября 2026", title: "Samsung Galaxy A36 5G, 256 ГБ · 1 шт.", total: 4_489_000, status: "Доставлен" },
  { id: "EM-2604", date: "12 октября 2026", title: "JBL Tune 520 · 1 шт.", total: 790_000, status: "В пути" },
];

export default function OrdersPage() {
  const { user } = useStore();
  const [orders, setOrders] = useState<OrderSummary[]>(fallbackOrders);

  useEffect(() => {
    if (!user?.email) return;
    let active = true;

    fetch(`/api/orders?email=${encodeURIComponent(user.email)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { orders?: OrderSummary[] } | null) => {
        if (!active || !data?.orders) return;
        if (data.orders.length > 0) {
          setOrders([...data.orders, ...fallbackOrders]);
        }
      })
      .catch(() => {
        // Fallback orders remain visible if network request fails.
      });

    return () => {
      active = false;
    };
  }, [user?.email]);

  return <AccountGate><main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Личный кабинет", href: "/account/profile" }, { label: "Мои покупки" }]} />
    <div className="page-title-row"><div><h1>История заказов</h1><p>Все покупки на сайте и в Telegram Mini App и их текущий статус.</p></div></div>
    <div className="account-layout"><AccountNav active="/account/orders" /><section className="content-panel"><div className="orders-list">{orders.map((order) => <article className="order-row" key={order.id}><div><strong>Заказ {order.id}</strong><span>{order.date} · {order.title}</span><span>{formatPrice(order.total)}</span></div><span className="order-status">{order.status}</span></article>)}</div><p className="auth-switch"><Link href="/catalog">Продолжить покупки</Link></p></section></div>
  </main></AccountGate>;
}
