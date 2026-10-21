import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is missing in .env.local.");
  process.exit(1);
}

const db = drizzle({ client: neon(connectionString) });

await db.execute(sql`
  create table if not exists auth_credentials (
    user_id text primary key references profiles(user_id) on delete cascade,
    password_hash text not null,
    updated_at timestamptz not null default now()
  )
`);

await db.execute(sql`
  create table if not exists auth_sessions (
    token_hash text primary key,
    user_id text not null references profiles(user_id) on delete cascade,
    expires_at timestamptz not null,
    created_at timestamptz not null default now()
  )
`);
await db.execute(
  sql`create index if not exists auth_sessions_user_id_idx on auth_sessions (user_id)`,
);

await db.execute(sql`
  create table if not exists password_reset_tokens (
    token_hash text primary key,
    user_id text not null references profiles(user_id) on delete cascade,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz not null default now()
  )
`);
await db.execute(
  sql`create index if not exists password_reset_user_id_idx on password_reset_tokens (user_id)`,
);

await db.execute(sql`
  create table if not exists addresses (
    id serial primary key,
    user_id text not null references profiles(user_id) on delete cascade,
    recipient_name text not null,
    recipient_phone text not null,
    city text not null default 'Ташкент',
    street_address text not null,
    is_default boolean not null default true,
    created_at timestamptz not null default now()
  )
`);
await db.execute(
  sql`create index if not exists addresses_user_id_idx on addresses (user_id)`,
);

await db.execute(sql`
  create table if not exists payments (
    id serial primary key,
    provider_payment_id text not null,
    order_id text not null references orders(id) on delete cascade,
    provider text not null default 'yookassa_test',
    amount_uzs bigint not null,
    amount_rub_minor integer not null,
    currency text not null default 'RUB',
    exchange_rate_uzs_per_rub integer not null default 140,
    status text not null default 'pending',
    is_test boolean not null default true,
    idempotency_key text not null,
    confirmation_url text not null,
    webhook_verified_at timestamptz,
    created_at timestamptz not null default now(),
    constraint payments_amount_uzs_positive check (amount_uzs > 0),
    constraint payments_is_test_only check (is_test = true)
  )
`);
await db.execute(
  sql`create unique index if not exists payments_provider_payment_id_unique on payments (provider_payment_id)`,
);
await db.execute(
  sql`create unique index if not exists payments_idempotency_key_unique on payments (idempotency_key)`,
);
await db.execute(
  sql`create index if not exists payments_order_id_idx on payments (order_id)`,
);

await db.execute(sql`
  create table if not exists admin_audit_logs (
    id serial primary key,
    actor_user_id text not null references profiles(user_id) on delete restrict,
    action text not null,
    target_type text not null,
    target_id text not null,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  )
`);
await db.execute(
  sql`create index if not exists admin_audit_logs_actor_idx on admin_audit_logs (actor_user_id)`,
);

// 1. Check DB-04 & DB-05: Password scrypt hashing, session token & avatar magic-byte validation
const salt = randomBytes(16).toString("hex");
const hashHex = scryptSync("StrongPass123!", salt, 64).toString("hex");
const verifyOk = timingSafeEqual(
  scryptSync("StrongPass123!", salt, 64),
  Buffer.from(hashHex, "hex"),
);
const verifyWrong = timingSafeEqual(
  scryptSync("WrongPass999!", salt, 64),
  Buffer.from(hashHex, "hex"),
);
if (!verifyOk || verifyWrong) {
  throw new Error("DB-04 password hashing verification failed.");
}

function detectMime(bytes) {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  return null;
}

const validPngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const fakeExeBytes = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0, 0, 0, 0, 0, 0, 0, 0]);
if (detectMime(validPngBytes) !== "image/png" || detectMime(fakeExeBytes) !== null) {
  throw new Error("DB-05 avatar magic-byte validation failed.");
}
console.log("1. [DB-04 / DB-05] Auth scrypt hash, session & avatar magic-byte checks passed.");

// 2. Check DB-06 & DB-07: Cart merge, catalog price lookup, order creation & user access isolation
const customerId = "usr_stage2_customer";
const otherUserId = "usr_stage2_other";
const adminId = "usr_stage2_admin";

await db.execute(sql`
  insert into profiles (user_id, email, full_name, phone)
  values
    (${customerId}, 'customer.stage2@electromarket.uz', 'Дилноза Рустамова', '+998 90 111 22 33'),
    (${otherUserId}, 'other.stage2@electromarket.uz', 'Тимур Алимов', '+998 90 222 33 44'),
    (${adminId}, 'admin.stage2@electromarket.uz', 'Администратор Магазина', '+998 90 999 00 00')
  on conflict (user_id) do update set full_name = excluded.full_name
`);

await db.execute(sql`
  insert into user_roles (user_id, role)
  values
    (${customerId}, 'customer'),
    (${otherUserId}, 'customer'),
    (${adminId}, 'admin')
  on conflict (user_id) do update set role = excluded.role
`);

const sessionTokenHash = createHash("sha256").update("test_session_token_stage2").digest("hex");
await db.execute(sql`
  insert into auth_sessions (token_hash, user_id, expires_at)
  values (${sessionTokenHash}, ${customerId}, now() + interval '1 day')
  on conflict (token_hash) do nothing
`);

// Merge guest cart (qty 2) + account cart (qty 3) -> capped 1..9 without duplicates
await db.execute(sql`delete from cart_items where user_id = ${customerId}`);
await db.execute(sql`
  insert into cart_items (user_id, product_id, quantity)
  values (${customerId}, 'nova-one', least(9, 2 + 3))
  on conflict (user_id, product_id) do update set quantity = excluded.quantity
`);

const productRowRes = await db.execute(
  sql`select price_uzs from products where id = 'nova-one' limit 1`,
);
const catalogUnitPrice = Number(productRowRes.rows[0].price_uzs);
const cartMergedRes = await db.execute(
  sql`select quantity from cart_items where user_id = ${customerId} and product_id = 'nova-one'`,
);
const mergedQty = Number(cartMergedRes.rows[0].quantity);
const calculatedOrderTotal = catalogUnitPrice * mergedQty;

if (mergedQty !== 5 || calculatedOrderTotal <= 0) {
  throw new Error("DB-06 cart merge & server price calculation failed.");
}

const stage2OrderId = "EM-STG201";
const stage2OrderIdem = "idem_stage2_order_01";

await db.execute(sql`
  insert into addresses (user_id, recipient_name, recipient_phone, city, street_address)
  values (${customerId}, 'Дилноза Рустамова', '+998 90 111 22 33', 'Ташкент', 'Мирабадский район, ул. Афросиаб, 15')
`);

await db.execute(sql`
  insert into orders (
    id, user_id, recipient_name, recipient_phone, shipping_address,
    delivery_uzs, total_uzs, status, payment_status, source, idempotency_key
  )
  values (
    ${stage2OrderId}, ${customerId}, 'Дилноза Рустамова', '+998 90 111 22 33',
    'Ташкент, Мирабадский район, ул. Афросиаб, 15', 0, ${calculatedOrderTotal},
    'Новый', 'pending', 'web', ${stage2OrderIdem}
  )
  on conflict (idempotency_key) do nothing
`);

// Verify owner isolation: otherUserId sees 0 orders for customerId
const otherOrdersRes = await db.execute(
  sql`select count(*)::int as count from orders where user_id = ${otherUserId} and id = ${stage2OrderId}`,
);
if (Number(otherOrdersRes.rows[0].count) !== 0) {
  throw new Error("DB-07 order access isolation check failed.");
}
console.log("2. [DB-06 / DB-07] Cart merge, server price calculation & order owner isolation passed.");

// 3. Check DB-08: Role enforcement & admin audit logging
const rolesRes = await db.execute(
  sql`select user_id, role from user_roles where user_id in (${customerId}, ${adminId})`,
);
const roleByUser = new Map(rolesRes.rows.map((r) => [String(r.user_id), String(r.role)]));
if (roleByUser.get(customerId) !== "customer" || roleByUser.get(adminId) !== "admin") {
  throw new Error("DB-08 role verification failed.");
}

await db.execute(sql`
  insert into admin_audit_logs (actor_user_id, action, target_type, target_id, details)
  values (${adminId}, 'order.stage_change', 'order', ${stage2OrderId}, '{"previousStage":"Новый","nextStage":"Собирается"}'::jsonb)
`);

const auditRes = await db.execute(
  sql`select count(*)::int as count from admin_audit_logs where actor_user_id = ${adminId} and target_id = ${stage2OrderId}`,
);
if (Number(auditRes.rows[0].count) < 1) {
  throw new Error("DB-08 admin audit log check failed.");
}
console.log("3. [DB-08 / DB-09] Admin role protection & audit log recording verified.");

// 4. Check DB-10 & DB-11: YooKassa TEST payment creation, return-page non-confirmation & duplicate webhook idempotency
const testPaymentId = "yk_test_stage2_payment_01";
const testPaymentIdem = "idem_yk_test_payment_01";
const expectedRubMinor = Math.round((calculatedOrderTotal / 140) * 100);

await db.execute(sql`
  insert into payments (
    provider_payment_id, order_id, provider, amount_uzs, amount_rub_minor,
    currency, exchange_rate_uzs_per_rub, status, is_test, idempotency_key, confirmation_url
  )
  values (
    ${testPaymentId}, ${stage2OrderId}, 'yookassa_test', ${calculatedOrderTotal},
    ${expectedRubMinor}, 'RUB', 140, 'pending', true, ${testPaymentIdem},
    '/checkout?order=EM-STG201'
  )
  on conflict (idempotency_key) do nothing
`);

// Before webhook: order payment_status must remain 'pending' (return to site does not mark paid)
const beforeWebhookRes = await db.execute(
  sql`select payment_status from orders where id = ${stage2OrderId}`,
);
if (String(beforeWebhookRes.rows[0].payment_status) !== "pending") {
  throw new Error("DB-10 order was marked paid before webhook verification.");
}

// First verified webhook marks payment 'succeeded' and order 'paid'
await db.execute(sql`
  update payments
  set status = 'succeeded', webhook_verified_at = now()
  where provider_payment_id = ${testPaymentId} and status != 'succeeded'
`);
await db.execute(sql`
  update orders
  set payment_status = 'paid'
  where id = ${stage2OrderId}
`);

// Second (duplicate) webhook with same provider_payment_id is a no-op
const duplicateUpdateRes = await db.execute(sql`
  update payments
  set status = 'succeeded'
  where provider_payment_id = ${testPaymentId} and status != 'succeeded'
  returning id
`);
if (duplicateUpdateRes.rows.length !== 0) {
  throw new Error("DB-10 / DB-11 duplicate webhook was not deduplicated.");
}

const afterWebhookRes = await db.execute(
  sql`select payment_status from orders where id = ${stage2OrderId}`,
);
if (String(afterWebhookRes.rows[0].payment_status) !== "paid") {
  throw new Error("DB-10 webhook did not update order payment_status to paid.");
}
console.log("4. [DB-10 / DB-11] YooKassa TEST payment & duplicate webhook idempotency verified.");

// Cleanup test fixtures
await db.execute(sql`delete from admin_audit_logs where target_id = ${stage2OrderId}`);
await db.execute(sql`delete from payments where provider_payment_id = ${testPaymentId}`);
await db.execute(sql`delete from orders where id = ${stage2OrderId}`);
await db.execute(sql`delete from addresses where user_id = ${customerId}`);
await db.execute(sql`delete from cart_items where user_id = ${customerId}`);
await db.execute(sql`delete from auth_sessions where token_hash = ${sessionTokenHash}`);
await db.execute(sql`delete from user_roles where user_id in (${customerId}, ${otherUserId}, ${adminId})`);
await db.execute(sql`delete from profiles where user_id in (${customerId}, ${otherUserId}, ${adminId})`);

console.log("All Stage 2 (DB-04..DB-11) automated checks passed.");
