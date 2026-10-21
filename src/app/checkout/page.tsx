"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CreditCard, Money, ShieldCheck } from "@phosphor-icons/react";
import { Breadcrumbs } from "@/components/catalog-tools";
import { CheckoutForm, StoreNote } from "@/components/store-forms";
import { useStore } from "@/components/store-provider";
import { formatPrice, products } from "@/data/catalog";

type TestPaymentInfo = {
  providerPaymentId: string;
  orderId: string;
  amountUzs: number;
  amountRub: string;
  currency: string;
  exchangeRateUzsPerRub: number;
  status: string;
  isTest: boolean;
};

export default function CheckoutPage() {
  const { cart } = useStore();
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [testPayment, setTestPayment] = useState<TestPaymentInfo | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const delivery = subtotal >= 1_000_000 ? 0 : 40_000;

  async function handleStartYookassaTest(orderId: string) {
    setPaymentLoading(true);
    setPaymentMessage("");
    try {
      const response = await fetch("/api/payments/yookassa/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          idempotencyKey: `yk_idem_${orderId}`,
        }),
      });
      const data = (await response.json()) as {
        payment?: TestPaymentInfo;
        message?: string;
      };
      if (!response.ok || !data.payment) {
        setPaymentMessage(data.message ?? "Не удалось создать тестовый платёж ЮKassa.");
        return;
      }
      setTestPayment(data.payment);
      setPaymentMessage(
        "Тестовый платёж ЮKassa создан. Возврат на сайт сам по себе не помечает заказ оплаченным до подтверждения webhook.",
      );
    } catch {
      setPaymentMessage("Ошибка соединения при создании тестового платежа.");
    } finally {
      setPaymentLoading(false);
    }
  }

  async function handleConfirmTestWebhook() {
    if (!testPayment) return;
    setPaymentLoading(true);
    try {
      const response = await fetch("/api/payments/yookassa/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "payment.succeeded",
          object: {
            id: testPayment.providerPaymentId,
            status: "succeeded",
            paid: true,
            test: true,
            amount: {
              value: testPayment.amountRub,
              currency: testPayment.currency,
            },
            metadata: {
              orderId: testPayment.orderId,
            },
          },
        }),
      });
      const data = (await response.json()) as {
        verified?: boolean;
        paymentStatus?: string;
        alreadyProcessed?: boolean;
        message?: string;
      };
      if (response.ok && data.verified) {
        setTestPayment({ ...testPayment, status: "succeeded" });
        setPaymentMessage(
          data.alreadyProcessed
            ? "Повторное уведомление webhook распознано: статус оплаты уже был подтверждён ранее."
            : "Сервер проверил уведомление ЮKassa TEST и отметил заказ оплаченным (тестовый платёж, реальные деньги не списываются).",
        );
      } else {
        setPaymentMessage(data.message ?? "Уведомление платежа не прошло проверку.");
      }
    } catch {
      setPaymentMessage("Ошибка при отправке тестового уведомления.");
    } finally {
      setPaymentLoading(false);
    }
  }

  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Корзина", href: "/cart" }, { label: "Оформление" }]} />
    <div className="page-title-row"><div><h1>Оформление заказа</h1><p>Остался последний шаг — укажи данные для доставки.</p></div></div>
    {createdOrderId ? (
      <div className="checkout-success" role="status">
        <strong>Заказ {createdOrderId} оформлен (ТЕСТОВЫЙ КОНТУР)</strong>
        <span>
          Заказ сохранён в истории покупок. Вы можете протестировать оплату через тестовый магазин ЮKassa (без реального списания средств).
        </span>
        {testPayment && (
          <div className="store-note" style={{ marginTop: "12px" }}>
            <div>
              <strong>ЮKassa TEST · Платёж {testPayment.providerPaymentId}</strong>
              <div>
                Сумма заказа: {formatPrice(testPayment.amountUzs)} · Тестовая конвертация (1 RUB ={" "}
                {testPayment.exchangeRateUzsPerRub} сум):{" "}
                <b>
                  {testPayment.amountRub} {testPayment.currency}
                </b>{" "}
                · Статус: <b>{testPayment.status === "succeeded" ? "Оплачен (TEST)" : "Ожидает подтверждения"}</b>
              </div>
            </div>
          </div>
        )}
        {paymentMessage && <p className="form-message" style={{ marginTop: "10px" }}>{paymentMessage}</p>}
        <div className="hero-cta-row">
          {!testPayment ? (
            <button
              type="button"
              className="button button-primary"
              disabled={paymentLoading}
              onClick={() => void handleStartYookassaTest(createdOrderId)}
            >
              {paymentLoading ? "Создаём платёж…" : "Оплатить через ЮKassa (TEST)"}
            </button>
          ) : (
            <button
              type="button"
              className="button button-primary"
              disabled={paymentLoading}
              onClick={() => void handleConfirmTestWebhook()}
            >
              {paymentLoading ? "Проверяем…" : "Подтвердить тестовый webhook ЮKassa"}
            </button>
          )}
          <Link className="button button-outline" href="/account/orders">Мои заказы</Link>
          <Link className="button button-outline" href="/catalog">Продолжить покупки</Link>
        </div>
      </div>
    ) : !lines.length ? <div className="empty-state"><div><strong>Нет товаров для оформления</strong><span>Сначала добавь товар в корзину.</span><p><Link className="text-link" href="/catalog">Открыть каталог</Link></p></div></div> : <div className="checkout-layout">
      <section className="content-panel checkout-form-panel">
        <StoreNote>Проверь контактный номер и адрес — это поможет доставить заказ вовремя.</StoreNote>
        <div className="checkout-step-label"><span>01</span> Контактные данные</div>
        <CheckoutForm onComplete={(orderId) => setCreatedOrderId(orderId)} />
        <fieldset className="payment-options"><legend>Способ оплаты</legend>
          <label className="payment-option"><input type="radio" name="payment" defaultChecked /><span className="payment-option-icon"><CreditCard size={18} /></span><span><strong>ЮKassa (Тестовый магазин · TEST)</strong><small>Безопасное подтверждение без списания реальных денег</small></span></label>
          <label className="payment-option"><input type="radio" name="payment" /><span className="payment-option-icon"><Money size={18} /></span><span><strong>Наличными при получении</strong><small>Оплата курьеру</small></span></label>
        </fieldset>
        <p className="secure-checkout"><ShieldCheck size={16} /> Ваши данные защищены · тестовый режим</p>
      </section>
      <aside className="cart-summary"><h2>Состав заказа</h2>{lines.map(({ product, quantity }) => <div className="checkout-item" key={product.id}><span className="checkout-item-image"><Image src={product.image} alt="" fill sizes="52px" unoptimized /></span><span>{product.name}<small>× {quantity}</small></span><strong>{formatPrice(product.price * quantity)}</strong></div>)}<div className="summary-row"><span>Товары</span><strong>{formatPrice(subtotal)}</strong></div><div className="summary-row"><span>Доставка</span><strong>{delivery ? formatPrice(delivery) : "Бесплатно"}</strong></div><div className="summary-row summary-total"><span>Итого</span><strong>{formatPrice(subtotal + delivery)}</strong></div></aside>
    </div>}
  </main>;
}
