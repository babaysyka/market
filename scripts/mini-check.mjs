import { createHmac, timingSafeEqual } from "node:crypto";
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
  create table if not exists telegram_links (
    telegram_user_id text primary key,
    user_id text not null references profiles(user_id) on delete cascade,
    telegram_username text,
    first_name text not null,
    linked_at timestamptz not null default now()
  )
`);
await db.execute(
  sql`create unique index if not exists telegram_links_user_id_unique on telegram_links (user_id)`,
);

await db.execute(sql`
  create table if not exists cart_items (
    id serial primary key,
    user_id text not null references profiles(user_id) on delete cascade,
    product_id text not null references products(id) on delete cascade,
    quantity integer not null default 1,
    updated_at timestamptz not null default now(),
    constraint cart_items_quantity_bounds check (quantity >= 1 and quantity <= 9)
  )
`);
await db.execute(
  sql`create unique index if not exists cart_items_user_product_unique on cart_items (user_id, product_id)`,
);

await db.execute(sql`
  create table if not exists orders (
    id text primary key,
    user_id text not null references profiles(user_id) on delete restrict,
    recipient_name text not null,
    recipient_phone text not null,
    shipping_address text not null,
    delivery_uzs bigint not null default 0,
    total_uzs bigint not null,
    status text not null default 'Новый',
    payment_status text not null default 'pending',
    source text not null default 'web',
    idempotency_key text not null,
    created_at timestamptz not null default now(),
    constraint orders_total_positive check (total_uzs > 0),
    constraint orders_delivery_non_negative check (delivery_uzs >= 0)
  )
`);
await db.execute(sql`create index if not exists orders_user_id_idx on orders (user_id)`);
await db.execute(
  sql`create unique index if not exists orders_idempotency_key_unique on orders (idempotency_key)`,
);

await db.execute(sql`
  create table if not exists order_items (
    id serial primary key,
    order_id text not null references orders(id) on delete cascade,
    product_id text not null references products(id) on delete restrict,
    product_title text not null,
    unit_price_uzs bigint not null,
    quantity integer not null,
    line_total_uzs bigint not null,
    constraint order_items_quantity_positive check (quantity >= 1),
    constraint order_items_unit_price_positive check (unit_price_uzs > 0)
  )
`);
await db.execute(
  sql`create index if not exists order_items_order_id_idx on order_items (order_id)`,
);

function signInitData(user, botToken, authDate) {
  const params = new URLSearchParams();
  params.set("auth_date", String(authDate));
  params.set("query_id", "AAHdF6IQAAAAAN0XohDhrOrc");
  params.set("user", JSON.stringify(user));

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

function checkInitDataSignature(raw, botToken) {
  const params = new URLSearchParams(raw);
  const hash = params.get("hash") ?? "";
  const pairs = [];
  for (const [k, v] of params.entries()) {
    if (k !== "hash") pairs.push(`${k}=${v}`);
  }
  pairs.sort((a, b) => a.localeCompare(b));
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(pairs.join("\n")).digest("hex");
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"));
}

const testToken = "test_bot_token_for_verification_only";
const validInitData = signInitData(
  { id: 90123456, first_name: "Азиза", username: "aziza_uz" },
  testToken,
  Math.floor(Date.now() / 1000),
);
const tamperedInitData = validInitData.replace("aziza_uz", "attacker_uz");

if (!checkInitDataSignature(validInitData, testToken)) {
  throw new Error("Valid Telegram initData signature failed verification.");
}
if (checkInitDataSignature(tamperedInitData, testToken)) {
  throw new Error("Tampered Telegram initData signature was erroneously accepted.");
}
console.log("1. Telegram initData HMAC-SHA256 verification passed (valid accepted, tampered rejected).");

const testUserId = "usr_miniapp_check";
const testEmail = "miniapp.check@electromarket.uz";
const testTgId = "90123456";

await db.execute(sql`
  insert into profiles (user_id, email, full_name, phone)
  values (${testUserId}, ${testEmail}, 'Азиза Каримова', '+998 90 123 45 67')
  on conflict (email) do update set full_name = excluded.full_name, updated_at = now()
`);

await db.execute(sql`
  insert into telegram_links (telegram_user_id, user_id, telegram_username, first_name)
  values (${testTgId}, ${testUserId}, 'aziza_uz', 'Азиза')
  on conflict (telegram_user_id) do update set user_id = excluded.user_id, linked_at = now()
`);

await db.execute(sql`
  insert into cart_items (user_id, product_id, quantity)
  values (${testUserId}, 'nova-one', 2)
  on conflict (user_id, product_id) do update set quantity = excluded.quantity, updated_at = now()
`);

const cartCheck = await db.execute(
  sql`select product_id, quantity from cart_items where user_id = ${testUserId}`,
);
if (cartCheck.rows.length !== 1 || Number(cartCheck.rows[0].quantity) !== 2) {
  throw new Error("Shared cart synchronization check failed.");
}
console.log("2. Explicit Telegram account link & shared cart sync verified in Neon.");

const testIdempotencyKey = "idem_miniapp_test_order_01";
const testOrderId = "EM-MINI01";

await db.execute(sql`
  insert into orders (
    id, user_id, recipient_name, recipient_phone, shipping_address,
    delivery_uzs, total_uzs, status, payment_status, source, idempotency_key
  )
  values (
    ${testOrderId}, ${testUserId}, 'Азиза Каримова', '+998 90 123 45 67',
    'Ташкент, Юнусабадский район, дом 12', 0, 8978000, 'Новый', 'pending',
    'telegram_mini_app', ${testIdempotencyKey}
  )
  on conflict (idempotency_key) do nothing
`);

await db.execute(sql`
  insert into orders (
    id, user_id, recipient_name, recipient_phone, shipping_address,
    delivery_uzs, total_uzs, status, payment_status, source, idempotency_key
  )
  values (
    'EM-MINI02-DUPLICATE', ${testUserId}, 'Азиза Каримова', '+998 90 123 45 67',
    'Ташкент, Юнусабадский район, дом 12', 0, 8978000, 'Новый', 'pending',
    'telegram_mini_app', ${testIdempotencyKey}
  )
  on conflict (idempotency_key) do nothing
`);

const orderCountRes = await db.execute(
  sql`select count(*)::int as count from orders where idempotency_key = ${testIdempotencyKey}`,
);
if (Number(orderCountRes.rows[0].count) !== 1) {
  throw new Error("Order idempotency check failed: duplicate order was created.");
}
console.log("3. Order idempotency check passed: repeated submission did not duplicate order.");

await db.execute(sql`delete from orders where id = ${testOrderId}`);
await db.execute(sql`delete from cart_items where user_id = ${testUserId}`);
await db.execute(sql`delete from telegram_links where telegram_user_id = ${testTgId}`);
await db.execute(sql`delete from profiles where user_id = ${testUserId}`);

console.log("Stage 3 (Telegram Mini App) checks passed.");
