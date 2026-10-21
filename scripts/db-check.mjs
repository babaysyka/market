import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const connectionString = process.env.DATABASE_URL;

const requiredTables = [
  "profiles",
  "user_roles",
  "auth_credentials",
  "auth_sessions",
  "password_reset_tokens",
  "telegram_links",
  "addresses",
  "categories",
  "brands",
  "products",
  "product_media",
  "cart_items",
  "orders",
  "order_items",
  "payments",
  "admin_audit_logs",
];

if (!connectionString) {
  console.error("DATABASE_URL is missing. Copy .env.example to .env.local and add your Neon connection string.");
  process.exitCode = 1;
} else {
  const db = drizzle({ client: neon(connectionString) });

  try {
    await db.execute(sql`select 1`);
    console.log("Neon connection through Drizzle is working.");

    const result = await db.execute(sql`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name in (
          'profiles',
          'user_roles',
          'auth_credentials',
          'auth_sessions',
          'password_reset_tokens',
          'telegram_links',
          'addresses',
          'categories',
          'brands',
          'products',
          'product_media',
          'cart_items',
          'orders',
          'order_items',
          'payments',
          'admin_audit_logs'
        )
      order by table_name
    `);

    const existing = new Set(result.rows.map((row) => String(row.table_name)));
    const missing = requiredTables.filter((name) => !existing.has(name));

    if (missing.length > 0) {
      console.error(`Missing tables in database: ${missing.join(", ")}. Run "npm run db:generate && npm run db:migrate".`);
      process.exitCode = 1;
    } else {
      console.log(`Verified store schema tables: ${requiredTables.join(", ")}.`);
      const [{ count: categoryCount }] = (await db.execute(sql`select count(*)::int as count from categories`)).rows;
      const [{ count: productCount }] = (await db.execute(sql`select count(*)::int as count from products`)).rows;
      console.log(`Catalog records in Neon: ${categoryCount} categories, ${productCount} products.`);
    }
  } catch {
    console.error("Database ping failed. Check DATABASE_URL and confirm that the Neon project is active.");
    process.exitCode = 1;
  }
}
