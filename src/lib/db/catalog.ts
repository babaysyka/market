import "server-only";

import { asc, eq } from "drizzle-orm";
import { filterProducts, type CatalogQuery } from "@/components/catalog-tools";
import {
  categories as fallbackCategories,
  products as fallbackProducts,
  type Category,
  type Product,
} from "@/data/catalog";
import { getDatabase } from "./index";
import { brands, categories, productMedia, products } from "./schema";

function mapDbRowToProduct(row: {
  id: string;
  slug: string;
  name: string;
  brandName: string;
  categorySlug: string;
  priceUzs: number;
  oldPriceUzs: number | null;
  stockQuantity: number;
  color: string;
  label: string | null;
  rating: string;
  reviewsCount: number;
  description: string;
  specs: { label: string; value: string }[];
  imageKey: string | null;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brandName,
    category: row.categorySlug,
    price: Number(row.priceUzs),
    ...(row.oldPriceUzs ? { oldPrice: Number(row.oldPriceUzs) } : {}),
    rating: row.rating,
    reviews: row.reviewsCount,
    image: row.imageKey || "/products/phone.jpg",
    color: row.color,
    ...(row.label ? { label: row.label } : {}),
    description: row.description,
    specs: Array.isArray(row.specs) ? row.specs : [],
    inStock: row.stockQuantity > 0,
  };
}

export async function getCatalogCategories(): Promise<Category[]> {
  if (!process.env.DATABASE_URL) {
    return fallbackCategories;
  }

  try {
    const db = getDatabase();
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.id));

    if (!rows.length) {
      return fallbackCategories;
    }

    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      shortName: row.shortName,
      note: row.note,
      image: row.imageKey || "/products/phone.jpg",
      tone: row.tone,
    }));
  } catch {
    return fallbackCategories;
  }
}

export async function getCatalogCategoryBySlug(slug: string): Promise<Category | undefined> {
  const all = await getCatalogCategories();
  return all.find((category) => category.slug === slug);
}

export async function getCatalogProducts(options?: {
  categorySlug?: string;
  query?: CatalogQuery;
}): Promise<Product[]> {
  let items: Product[] = fallbackProducts;

  if (process.env.DATABASE_URL) {
    try {
      const db = getDatabase();
      const rows = await db
        .select({
          id: products.id,
          slug: products.slug,
          name: products.name,
          brandName: brands.name,
          categorySlug: categories.slug,
          priceUzs: products.priceUzs,
          oldPriceUzs: products.oldPriceUzs,
          stockQuantity: products.stockQuantity,
          color: products.color,
          label: products.label,
          rating: products.rating,
          reviewsCount: products.reviewsCount,
          description: products.description,
          specs: products.specs,
          imageKey: productMedia.storageKey,
        })
        .from(products)
        .innerJoin(categories, eq(products.categoryId, categories.id))
        .innerJoin(brands, eq(products.brandId, brands.id))
        .leftJoin(productMedia, eq(productMedia.productId, products.id))
        .where(eq(products.isPublished, true))
        .orderBy(asc(products.createdAt), asc(products.id));

      if (rows.length > 0) {
        const deduplicated = new Map<string, Product>();
        for (const row of rows) {
          if (!deduplicated.has(row.id)) {
            deduplicated.set(row.id, mapDbRowToProduct(row));
          }
        }
        items = Array.from(deduplicated.values());
      }
    } catch {
      items = fallbackProducts;
    }
  }

  const scoped = options?.categorySlug
    ? items.filter((item) => item.category === options.categorySlug)
    : items;

  return options?.query ? filterProducts(scoped, options.query) : scoped;
}

export async function getCatalogProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getCatalogProducts();
  return all.find((item) => item.slug === slug);
}

export async function getCatalogBrands(categorySlug?: string): Promise<string[]> {
  const items = await getCatalogProducts(categorySlug ? { categorySlug } : undefined);
  return Array.from(new Set(items.map((product) => product.brand))).sort();
}
