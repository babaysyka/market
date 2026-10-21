import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing. Add it to .env.local before running db:seed.");
  process.exit(1);
}

const catalogSource = readFileSync(resolve("src/data/catalog.ts"), "utf8");

function loadCatalogFixtures(source) {
  const transformed = source
    .replace(/export type[\s\S]*?;\n\n/g, "")
    .replace(/:\s*Category\[\]/g, "")
    .replace(/:\s*Product\[\]/g, "")
    .replace(/:\s*Product\["specs"\]/g, "")
    .replace(/:\s*Partial<Pick<Product,[^>]+>>/g, "")
    .replace(/:\s*Product\s*=>/g, " =>")
    .replace(/:\s*string/g, "")
    .replace(/:\s*number/g, "")
    .replace(/export const /g, "const ")
    .replace(/export function formatPrice[\s\S]*$/g, "");

  const factory = new Function(`${transformed}\nreturn { categories, products };`);
  return factory();
}

function slugifyBrand(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const { categories: seedCategories, products: seedProducts } = loadCatalogFixtures(catalogSource);
const db = drizzle({ client: neon(connectionString) });

console.log(`Seeding ${seedCategories.length} categories and ${seedProducts.length} products...`);

for (let i = 0; i < seedCategories.length; i += 1) {
  const item = seedCategories[i];
  await db.execute(sql`
    insert into categories (slug, name, short_name, note, image_key, tone, sort_order)
    values (${item.slug}, ${item.name}, ${item.shortName}, ${item.note}, ${item.image}, ${item.tone}, ${i})
    on conflict (slug) do update set
      name = excluded.name,
      short_name = excluded.short_name,
      note = excluded.note,
      image_key = excluded.image_key,
      tone = excluded.tone,
      sort_order = excluded.sort_order
  `);
}

const uniqueBrands = Array.from(new Set(seedProducts.map((p) => p.brand))).sort();
for (const brandName of uniqueBrands) {
  const brandSlug = slugifyBrand(brandName);
  await db.execute(sql`
    insert into brands (slug, name)
    values (${brandSlug}, ${brandName})
    on conflict (slug) do update set
      name = excluded.name
  `);
}

const categoryRows = await db.execute(sql`select id, slug from categories`);
const categoryIdBySlug = new Map(categoryRows.rows.map((r) => [String(r.slug), Number(r.id)]));

const brandRows = await db.execute(sql`select id, name from brands`);
const brandIdByName = new Map(brandRows.rows.map((r) => [String(r.name), Number(r.id)]));

for (let index = 0; index < seedProducts.length; index += 1) {
  const item = seedProducts[index];
  const categoryId = categoryIdBySlug.get(item.category);
  const brandId = brandIdByName.get(item.brand);

  if (!categoryId || !brandId) {
    throw new Error(`Missing category or brand reference for product ${item.slug}`);
  }

  const sku = `EM-${String(index + 1).padStart(4, "0")}-${item.id.toUpperCase().replace(/[^A-Z0-9]/g, "")}`;
  const stockQuantity = item.inStock ? 12 : 0;
  const oldPriceUzs = item.oldPrice ?? null;
  const label = item.label ?? null;
  const specsJson = JSON.stringify(item.specs ?? []);

  await db.execute(sql`
    insert into products (
      id, sku, slug, name, category_id, brand_id,
      price_uzs, old_price_uzs, stock_quantity, is_published,
      color, label, rating, reviews_count, description, specs, updated_at
    )
    values (
      ${item.id}, ${sku}, ${item.slug}, ${item.name}, ${categoryId}, ${brandId},
      ${item.price}, ${oldPriceUzs}, ${stockQuantity}, true,
      ${item.color}, ${label}, ${item.rating}, ${item.reviews}, ${item.description}, ${specsJson}::jsonb, now()
    )
    on conflict (id) do update set
      sku = excluded.sku,
      slug = excluded.slug,
      name = excluded.name,
      category_id = excluded.category_id,
      brand_id = excluded.brand_id,
      price_uzs = excluded.price_uzs,
      old_price_uzs = excluded.old_price_uzs,
      stock_quantity = excluded.stock_quantity,
      is_published = excluded.is_published,
      color = excluded.color,
      label = excluded.label,
      rating = excluded.rating,
      reviews_count = excluded.reviews_count,
      description = excluded.description,
      specs = excluded.specs,
      updated_at = now()
  `);

  await db.execute(sql`
    insert into product_media (product_id, storage_key, alt_text, sort_order)
    values (${item.id}, ${item.image}, ${item.name}, 0)
    on conflict (product_id, sort_order) do update set
      storage_key = excluded.storage_key,
      alt_text = excluded.alt_text
  `);
}

const [{ count: categoryCount }] = (await db.execute(sql`select count(*)::int as count from categories`)).rows;
const [{ count: brandCount }] = (await db.execute(sql`select count(*)::int as count from brands`)).rows;
const [{ count: productCount }] = (await db.execute(sql`select count(*)::int as count from products`)).rows;

console.log(`Seed complete: ${categoryCount} categories, ${brandCount} brands, ${productCount} products in Neon.`);
