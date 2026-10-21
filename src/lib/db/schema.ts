import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type ProductSpecItem = {
  label: string;
  value: string;
};

export const userRoleValues = ["customer", "admin"] as const;
export type UserRole = (typeof userRoleValues)[number];

export const profiles = pgTable(
  "profiles",
  {
    userId: text("user_id").primaryKey(),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone"),
    avatarKey: text("avatar_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("profiles_email_unique").on(table.email)],
);

export const userRoles = pgTable(
  "user_roles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    role: text("role").$type<UserRole>().default("customer").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("user_roles_role_check", sql`${table.role} in ('customer', 'admin')`),
  ],
);

export const authCredentials = pgTable("auth_credentials", {
  userId: text("user_id")
    .primaryKey()
    .references(() => profiles.userId, { onDelete: "cascade" }),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("password_reset_user_id_idx").on(table.userId)],
);

export const telegramLinks = pgTable(
  "telegram_links",
  {
    telegramUserId: text("telegram_user_id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    telegramUsername: text("telegram_username"),
    firstName: text("first_name").notNull(),
    linkedAt: timestamp("linked_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("telegram_links_user_id_unique").on(table.userId)],
);

export const addresses = pgTable(
  "addresses",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    city: text("city").notNull().default("Ташкент"),
    streetAddress: text("street_address").notNull(),
    isDefault: boolean("is_default").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("addresses_user_id_idx").on(table.userId)],
);

export const categories = pgTable(
  "categories",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    shortName: text("short_name").notNull(),
    note: text("note").notNull().default(""),
    imageKey: text("image_key").notNull().default(""),
    tone: text("tone").notNull().default("category-blue"),
    parentId: integer("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "set null",
    }),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("categories_slug_unique").on(table.slug),
    check("categories_sort_order_check", sql`${table.sortOrder} >= 0`),
  ],
);

export const brands = pgTable(
  "brands",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("brands_slug_unique").on(table.slug),
    uniqueIndex("brands_name_unique").on(table.name),
  ],
);

export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    sku: text("sku").notNull(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    brandId: integer("brand_id")
      .notNull()
      .references(() => brands.id, { onDelete: "restrict" }),
    priceUzs: bigint("price_uzs", { mode: "number" }).notNull(),
    oldPriceUzs: bigint("old_price_uzs", { mode: "number" }),
    stockQuantity: integer("stock_quantity").default(0).notNull(),
    isPublished: boolean("is_published").default(true).notNull(),
    color: text("color").notNull().default(""),
    label: text("label"),
    rating: text("rating").notNull().default("4,8"),
    reviewsCount: integer("reviews_count").default(0).notNull(),
    description: text("description").notNull().default(""),
    specs: jsonb("specs").$type<ProductSpecItem[]>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("products_sku_unique").on(table.sku),
    uniqueIndex("products_slug_unique").on(table.slug),
    index("products_category_id_idx").on(table.categoryId),
    index("products_brand_id_idx").on(table.brandId),
    index("products_published_idx").on(table.isPublished),
    check("products_price_uzs_positive", sql`${table.priceUzs} > 0`),
    check(
      "products_old_price_uzs_check",
      sql`${table.oldPriceUzs} is null or ${table.oldPriceUzs} >= ${table.priceUzs}`,
    ),
    check("products_stock_non_negative", sql`${table.stockQuantity} >= 0`),
    check("products_reviews_non_negative", sql`${table.reviewsCount} >= 0`),
  ],
);

export const productMedia = pgTable(
  "product_media",
  {
    id: serial("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    altText: text("alt_text").notNull().default(""),
    sortOrder: integer("sort_order").default(0).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("product_media_product_id_idx").on(table.productId),
    uniqueIndex("product_media_product_sort_unique").on(table.productId, table.sortOrder),
    check("product_media_sort_order_check", sql`${table.sortOrder} >= 0`),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("cart_items_user_product_unique").on(table.userId, table.productId),
    check("cart_items_quantity_bounds", sql`${table.quantity} >= 1 and ${table.quantity} <= 9`),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "restrict" }),
    recipientName: text("recipient_name").notNull(),
    recipientPhone: text("recipient_phone").notNull(),
    shippingAddress: text("shipping_address").notNull(),
    deliveryUzs: bigint("delivery_uzs", { mode: "number" }).notNull().default(0),
    totalUzs: bigint("total_uzs", { mode: "number" }).notNull(),
    status: text("status").notNull().default("Новый"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    source: text("source").notNull().default("web"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("orders_user_id_idx").on(table.userId),
    uniqueIndex("orders_idempotency_key_unique").on(table.idempotencyKey),
    check("orders_total_positive", sql`${table.totalUzs} > 0`),
    check("orders_delivery_non_negative", sql`${table.deliveryUzs} >= 0`),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: serial("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    productTitle: text("product_title").notNull(),
    unitPriceUzs: bigint("unit_price_uzs", { mode: "number" }).notNull(),
    quantity: integer("quantity").notNull(),
    lineTotalUzs: bigint("line_total_uzs", { mode: "number" }).notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").on(table.orderId),
    check("order_items_quantity_positive", sql`${table.quantity} >= 1`),
    check("order_items_unit_price_positive", sql`${table.unitPriceUzs} > 0`),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: serial("id").primaryKey(),
    providerPaymentId: text("provider_payment_id").notNull(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("yookassa_test"),
    amountUzs: bigint("amount_uzs", { mode: "number" }).notNull(),
    amountRubMinor: integer("amount_rub_minor").notNull(),
    currency: text("currency").notNull().default("RUB"),
    exchangeRateUzsPerRub: integer("exchange_rate_uzs_per_rub").notNull().default(140),
    status: text("status").notNull().default("pending"),
    isTest: boolean("is_test").notNull().default(true),
    idempotencyKey: text("idempotency_key").notNull(),
    confirmationUrl: text("confirmation_url").notNull(),
    webhookVerifiedAt: timestamp("webhook_verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("payments_provider_payment_id_unique").on(table.providerPaymentId),
    uniqueIndex("payments_idempotency_key_unique").on(table.idempotencyKey),
    index("payments_order_id_idx").on(table.orderId),
    check("payments_amount_uzs_positive", sql`${table.amountUzs} > 0`),
    check("payments_is_test_only", sql`${table.isTest} = true`),
  ],
);

export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: text("actor_user_id")
      .notNull()
      .references(() => profiles.userId, { onDelete: "restrict" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    details: jsonb("details").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("admin_audit_logs_actor_idx").on(table.actorUserId)],
);
