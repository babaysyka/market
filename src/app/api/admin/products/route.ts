import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db";
import { getCatalogProducts } from "@/lib/db/catalog";
import {
  adminAuditLogs,
  brands,
  categories,
  productMedia,
  products,
} from "@/lib/db/schema";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-|-$/g, "");
}

export async function GET(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json(
      { message: "Доступ разрешён только администратору." },
      { status: 403 },
    );
  }

  const items = await getCatalogProducts();
  const db = getDatabase();
  const logs = await db
    .select()
    .from(adminAuditLogs)
    .orderBy(desc(adminAuditLogs.createdAt))
    .limit(20);

  return NextResponse.json({ products: items, auditLogs: logs });
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json(
      { message: "Только администратор может добавлять товары." },
      { status: 403 },
    );
  }

  let body: {
    name?: unknown;
    priceUzs?: unknown;
    description?: unknown;
    categorySlug?: unknown;
    brandName?: unknown;
    stockQuantity?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректные данные товара." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const priceUzs = Number(body.priceUzs);
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const categorySlug =
    typeof body.categorySlug === "string" && body.categorySlug.trim()
      ? body.categorySlug.trim()
      : "smartphones";
  const brandName =
    typeof body.brandName === "string" && body.brandName.trim()
      ? body.brandName.trim().toUpperCase()
      : "SAMSUNG";
  const stockQuantity =
    Number.isInteger(Number(body.stockQuantity)) && Number(body.stockQuantity) >= 0
      ? Number(body.stockQuantity)
      : 10;

  if (!name || !Number.isFinite(priceUzs) || priceUzs <= 0) {
    return NextResponse.json(
      { message: "Укажите название товара и положительную цену в сумах." },
      { status: 400 },
    );
  }

  const db = getDatabase();

  const [categoryRow] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, categorySlug))
    .limit(1);

  const [fallbackCategory] = await db.select().from(categories).limit(1);
  const resolvedCategoryId = categoryRow?.id ?? fallbackCategory?.id;

  if (!resolvedCategoryId) {
    return NextResponse.json({ message: "Категория каталога не найдена." }, { status: 400 });
  }

  const brandSlug = slugify(brandName) || "brand";
  await db
    .insert(brands)
    .values({ slug: brandSlug, name: brandName })
    .onConflictDoNothing();

  const [brandRow] = await db
    .select()
    .from(brands)
    .where(eq(brands.name, brandName))
    .limit(1);

  const [fallbackBrand] = await db.select().from(brands).limit(1);
  const resolvedBrandId = brandRow?.id ?? fallbackBrand?.id;

  if (!resolvedBrandId) {
    return NextResponse.json({ message: "Бренд каталога не найден." }, { status: 400 });
  }

  const suffix = Date.now().toString(36);
  const productId = `custom-${suffix}`;
  const productSlug = `${slugify(name) || "product"}-${suffix}`;
  const sku = `EM-ADM-${suffix.toUpperCase()}`;

  await db.insert(products).values({
    id: productId,
    sku,
    slug: productSlug,
    name,
    categoryId: resolvedCategoryId,
    brandId: resolvedBrandId,
    priceUzs: Math.round(priceUzs),
    stockQuantity,
    isPublished: true,
    color: "Чёрный",
    description,
    specs: [{ label: "Гарантия", value: "Официальная · 12 месяцев" }],
  });

  await db.insert(productMedia).values({
    productId,
    storageKey: "/products/phone.jpg",
    altText: name,
    sortOrder: 0,
  });

  await db.insert(adminAuditLogs).values({
    actorUserId: sessionUser.userId,
    action: "product.create",
    targetType: "product",
    targetId: productId,
    details: {
      name,
      priceUzs: Math.round(priceUzs),
      stockQuantity,
    },
  });

  return NextResponse.json({
    product: {
      id: productId,
      slug: productSlug,
      name,
      price: Math.round(priceUzs),
      inStock: stockQuantity > 0,
    },
    message: "Товар добавлен в базу каталога и записан в журнал аудита.",
  });
}

export async function PATCH(request: Request) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json(
      { message: "Только администратор может изменять товары." },
      { status: 403 },
    );
  }

  let body: {
    productId?: unknown;
    priceUzs?: unknown;
    stockQuantity?: unknown;
    isPublished?: unknown;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: "Некорректный формат запроса." }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!productId) {
    return NextResponse.json({ message: "Укажите ID товара." }, { status: 400 });
  }

  const db = getDatabase();
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ message: "Товар не найден." }, { status: 404 });
  }

  const nextPrice =
    body.priceUzs !== undefined ? Math.round(Number(body.priceUzs)) : Number(existing.priceUzs);
  const nextStock =
    body.stockQuantity !== undefined ? Math.round(Number(body.stockQuantity)) : existing.stockQuantity;
  const nextPublished =
    typeof body.isPublished === "boolean" ? body.isPublished : existing.isPublished;

  if (!Number.isFinite(nextPrice) || nextPrice <= 0 || !Number.isFinite(nextStock) || nextStock < 0) {
    return NextResponse.json(
      { message: "Цена должна быть положительной, а остаток неотрицательным." },
      { status: 400 },
    );
  }

  await db
    .update(products)
    .set({
      priceUzs: nextPrice,
      stockQuantity: nextStock,
      isPublished: nextPublished,
      updatedAt: new Date(),
    })
    .where(eq(products.id, productId));

  await db.insert(adminAuditLogs).values({
    actorUserId: sessionUser.userId,
    action: "product.update",
    targetType: "product",
    targetId: productId,
    details: {
      priceUzs: nextPrice,
      stockQuantity: nextStock,
      isPublished: nextPublished,
    },
  });

  return NextResponse.json({
    updated: true,
    product: {
      id: productId,
      priceUzs: nextPrice,
      stockQuantity: nextStock,
      isPublished: nextPublished,
    },
  });
}
