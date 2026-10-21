"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PaymentResult = {
  paymentStatus?: "paid" | "pending" | "canceled";
  confirmationUrl?: string | null;
  message?: string;
};

export function PaymentReturnStatus({
  orderId,
  returnToken,
  canceledReturn,
}: {
  orderId: string;
  returnToken: string;
  canceledReturn: boolean;
}) {
  const [result, setResult] = useState<PaymentResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadPayment = useCallback(async (): Promise<PaymentResult> => {
    try {
      if (!returnToken) {
        return { message: "Ссылка для проверки заказа недоступна в этой вкладке." };
      }
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, returnToken }),
      });
      const payload = (await response.json()) as PaymentResult;
      return response.ok ? payload : { message: payload.message ?? "Не удалось проверить оплату." };
    } catch {
      return { message: "Нет связи с сервером. Попробуйте проверить оплату ещё раз." };
    }
  }, [orderId, returnToken]);

  const checkPayment = useCallback(async () => {
    setLoading(true);
    setResult(await loadPayment());
    setLoading(false);
  }, [loadPayment]);

  useEffect(() => {
    let active = true;
    void loadPayment().then((paymentResult) => {
      if (active) setResult(paymentResult);
    });
    return () => {
      active = false;
    };
  }, [loadPayment]);

  const isPaid = result?.paymentStatus === "paid";
  const isCanceled = result?.paymentStatus === "canceled";
  const isPending = result?.paymentStatus === "pending";

  return (
    <section className="checkout-success payment-return-card" aria-live="polite">
      <strong>
        {isPaid
          ? "Тестовая оплата подтверждена"
          : isCanceled
            ? "Платёж отменён"
            : canceledReturn
              ? "Оплата не завершена"
              : "Проверяем оплату"}
      </strong>
      {isPaid ? (
        <span>Провайдер подтвердил платёж для заказа {orderId}. Реальные деньги не списывались.</span>
      ) : isPending ? (
        <span>Пока нет подтверждения от платёжного сервиса. Статус проверяется на стороне сервера.</span>
      ) : isCanceled ? (
        <span>Провайдер сообщил, что тестовый платёж отменён. Заказ остался в истории покупок.</span>
      ) : result?.message ? (
        <span role="alert">{result.message}</span>
      ) : (
        <span>Получаем актуальный статус платежа у провайдера.</span>
      )}

      <div className="hero-cta-row payment-return-actions">
        {result?.confirmationUrl && (
          <a className="button button-primary" href={result.confirmationUrl}>
            Продолжить оплату
          </a>
        )}
        {!isPaid && (
          <button className="button button-outline" type="button" onClick={() => void checkPayment()} disabled={loading}>
            {loading ? "Проверяем…" : "Проверить ещё раз"}
          </button>
        )}
        <Link className="button button-outline" href="/account/orders">Мои заказы</Link>
        <Link className="button button-outline" href="/catalog">В каталог</Link>
      </div>
    </section>
  );
}
