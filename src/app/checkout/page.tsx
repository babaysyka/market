"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CreditCard, Money, ShieldCheck } from "@phosphor-icons/react";
import { Breadcrumbs } from "@/components/catalog-tools";
import { CheckoutForm, StoreNote } from "@/components/store-forms";
import { useStore } from "@/components/store-provider";
import { formatPrice, products } from "@/data/catalog";

type PaymentProvider = "stripe_test";
type PaymentChoice = PaymentProvider | "cash";
type TestPaymentInfo = {
  provider: PaymentProvider;
  providerPaymentId: string;
  orderId: string;
  amountUzs: number;
  amount: string;
  currency: string;
  exchangeRateUzsPerUnit: number;
  status: string;
  isTest: boolean;
  confirmationUrl: string;
};

export default function CheckoutPage() {
  const { cart } = useStore();
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [createdOrderAccessKey, setCreatedOrderAccessKey] = useState("");
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>("stripe_test");
  const [testPayment, setTestPayment] = useState<TestPaymentInfo | null>(null);
  const [paymentMessage, setPaymentMessage] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [requestKeys, setRequestKeys] = useState<Partial<Record<PaymentProvider, string>>>({});

  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const delivery = subtotal >= 1_000_000 ? 0 : 40_000;

  async function handleStartPayment(orderId: string) {
    if (paymentChoice === "cash") return;
    if (!createdOrderAccessKey) {
      setPaymentMessage("Не удалось проверить доступ к заказу. Обнови страницу и оформи заказ ещё раз.");
      return;
    }

    const provider = paymentChoice;
    const requestKey = requestKeys[provider] ?? globalThis.crypto.randomUUID();
    if (!requestKeys[provider]) {
      setRequestKeys((current) => ({ ...current, [provider]: requestKey }));
    }

    setPaymentLoading(true);
    setPaymentMessage("");
    try {
      const response = await fetch("/api/payments/stripe/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, orderAccessKey: createdOrderAccessKey, idempotencyKey: requestKey }),
      });
      const data = (await response.json()) as { payment?: TestPaymentInfo; message?: string };
      if (!response.ok || !data.payment) {
        setPaymentMessage(data.message ?? "Не удалось создать тестовый платёж.");
        return;
      }
      setTestPayment(data.payment);
      setPaymentMessage("Ссылка создана. Проверьте сумму и курс, затем перейдите на защищённую страницу провайдера.");
    } catch {
      setPaymentMessage("Не удалось связаться с сервером оплаты. Попробуйте ещё раз.");
    } finally {
      setPaymentLoading(false);
    }
  }

  const paymentMethodOptions = (
    <PaymentMethodOptions value={paymentChoice} onChange={setPaymentChoice} disabled={Boolean(testPayment)} />
  );

  return (
    <main className="page-wrap page-main">
      <Breadcrumbs items={[{ label: "Корзина", href: "/cart" }, { label: "Оформление" }]} />
      <div className="page-title-row">
        <div>
          <h1>Оформление заказа</h1>
          <p>Укажи данные для доставки и выбери способ оплаты.</p>
        </div>
      </div>

      {createdOrderId ? (
        <section className="checkout-success payment-checkout-card" aria-live="polite">
          <strong>Заказ {createdOrderId} оформлен · тестовый контур</strong>
          <span>Заказ сохранён. Тестовая оплата не списывает реальные деньги и не запускает доставку.</span>

          {!testPayment && paymentMethodOptions}

          {testPayment && (
            <div className="payment-quote">
              <p><b>Сумма заказа:</b> {formatPrice(testPayment.amountUzs)}</p>
              <p>
                <b>К оплате в TEST:</b> {testPayment.amount} {testPayment.currency}
              </p>
              <p>
                <b>Курс:</b> 1 {testPayment.currency} = {testPayment.exchangeRateUzsPerUnit.toLocaleString("ru-RU")} сум
              </p>
              <p className="payment-quote-provider">
                Stripe TEST · реальные деньги не списываются
              </p>
            </div>
          )}

          {paymentChoice === "cash" && !testPayment ? (
            <p className="secure-checkout"><Money size={16} /> Оплатишь наличными при получении.</p>
          ) : !testPayment ? (
            <button
              type="button"
              className="button button-primary payment-create-button"
              disabled={paymentLoading}
              onClick={() => void handleStartPayment(createdOrderId)}
            >
              {paymentLoading ? "Создаём тестовую оплату…" : "Создать ссылку · Stripe"}
            </button>
          ) : (
            <a className="button button-primary payment-create-button" href={testPayment.confirmationUrl}>
              Перейти к оплате в Stripe
            </a>
          )}

          {paymentMessage && <p className="form-message payment-message" role="status">{paymentMessage}</p>}
          <div className="hero-cta-row payment-return-actions">
            <Link className="button button-outline" href="/account/orders">Мои заказы</Link>
            <Link className="button button-outline" href="/catalog">Продолжить покупки</Link>
          </div>
        </section>
      ) : !lines.length ? (
        <div className="empty-state">
          <div>
            <strong>Нет товаров для оформления</strong>
            <span>Сначала добавь товар в корзину.</span>
            <p><Link className="text-link" href="/catalog">Открыть каталог</Link></p>
          </div>
        </div>
      ) : (
        <div className="checkout-layout">
          <section className="content-panel checkout-form-panel">
            <StoreNote>Проверь контактный номер и адрес — это поможет доставить заказ вовремя.</StoreNote>
            <div className="checkout-step-label"><span>01</span> Контактные данные</div>
            <CheckoutForm onComplete={(orderId, orderAccessKey) => {
              setCreatedOrderId(orderId);
              setCreatedOrderAccessKey(orderAccessKey);
            }}>
              {paymentMethodOptions}
              <p className="secure-checkout"><ShieldCheck size={16} /> Только TEST-режим · реальные деньги не списываются</p>
            </CheckoutForm>
          </section>

          <aside className="cart-summary">
            <h2>Состав заказа</h2>
            {lines.map(({ product, quantity }) => (
              <div className="checkout-item" key={product.id}>
                <span className="checkout-item-image">
                  <Image src={product.image} alt="" fill sizes="52px" unoptimized />
                </span>
                <span>{product.name}<small>× {quantity}</small></span>
                <strong>{formatPrice(product.price * quantity)}</strong>
              </div>
            ))}
            <div className="summary-row"><span>Товары</span><strong>{formatPrice(subtotal)}</strong></div>
            <div className="summary-row"><span>Доставка</span><strong>{delivery ? formatPrice(delivery) : "Бесплатно"}</strong></div>
            <div className="summary-row summary-total"><span>Итого</span><strong>{formatPrice(subtotal + delivery)}</strong></div>
          </aside>
        </div>
      )}
    </main>
  );
}

function PaymentMethodOptions({
  value,
  onChange,
  disabled,
}: {
  value: PaymentChoice;
  onChange: (value: PaymentChoice) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="payment-options">
      <legend>Способ оплаты</legend>
      <label className="payment-option">
        <input
          type="radio"
          name="payment"
          value="stripe_test"
          checked={value === "stripe_test"}
          onChange={() => onChange("stripe_test")}
          disabled={disabled}
        />
        <span className="payment-option-icon"><CreditCard size={18} /></span>
        <span><strong>Stripe · тестовый режим</strong><small>Оплата на странице Stripe, сумма в USD</small></span>
      </label>
      <label className="payment-option">
        <input
          type="radio"
          name="payment"
          value="cash"
          checked={value === "cash"}
          onChange={() => onChange("cash")}
          disabled={disabled}
        />
        <span className="payment-option-icon"><Money size={18} /></span>
        <span><strong>Наличными при получении</strong><small>Онлайн-платёж не создаётся</small></span>
      </label>
    </fieldset>
  );
}
