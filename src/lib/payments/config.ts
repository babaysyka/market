import "server-only";

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import Stripe from "stripe";

export type TestPaymentProvider = "stripe_test";

export function getPositiveExchangeRate(name: string) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function makeIdempotencyKeys(
  provider: TestPaymentProvider,
  orderId: string,
  requestKey: string,
) {
  const digest = createHash("sha256")
    .update(`${provider}:${orderId}:${requestKey}`)
    .digest("hex");

  return {
    database: `${provider}:${digest}`,
    provider: digest,
  };
}

export function createOrderReturnToken(orderId: string, orderAccessKey: string) {
  return createHmac("sha256", orderAccessKey).update(orderId).digest("base64url");
}

export function verifyOrderReturnToken(
  orderId: string,
  orderAccessKey: string,
  returnToken: string,
) {
  const expected = Buffer.from(createOrderReturnToken(orderId, orderAccessKey));
  const received = Buffer.from(returnToken);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function getStripeTestClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey?.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test-mode key (sk_test_...).");
  }

  return new Stripe(secretKey);
}

