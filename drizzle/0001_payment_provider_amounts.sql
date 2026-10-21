ALTER TABLE "payments" RENAME COLUMN "amount_rub_minor" TO "amount_minor";
ALTER TABLE "payments" RENAME COLUMN "exchange_rate_uzs_per_rub" TO "exchange_rate_uzs_per_unit";
ALTER TABLE "payments"
  ALTER COLUMN "exchange_rate_uzs_per_unit" TYPE numeric(12, 4)
  USING "exchange_rate_uzs_per_unit"::numeric(12, 4);
ALTER TABLE "payments" ALTER COLUMN "exchange_rate_uzs_per_unit" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'stripe_test';
ALTER TABLE "payments" ALTER COLUMN "currency" SET DEFAULT 'USD';
-- Preserve historical test rows while rejecting new payment providers.
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_provider_test_only"
  CHECK ("provider" = 'stripe_test') NOT VALID;
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_amount_minor_positive"
  CHECK ("amount_minor" > 0);
ALTER TABLE "payments"
  ADD CONSTRAINT "payments_exchange_rate_positive"
  CHECK ("exchange_rate_uzs_per_unit" > 0);
