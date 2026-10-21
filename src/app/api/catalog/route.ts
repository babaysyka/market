import { NextResponse } from "next/server";
import { normalizeCatalogQuery } from "@/components/catalog-tools";
import {
  getCatalogBrands,
  getCatalogCategories,
  getCatalogProductBySlug,
  getCatalogProducts,
} from "@/lib/db/catalog";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const categorySlug = searchParams.get("category") ?? undefined;

  if (slug) {
    const product = await getCatalogProductBySlug(slug);
    if (!product) {
      return NextResponse.json({ message: "Товар не найден." }, { status: 404 });
    }
    return NextResponse.json({ product });
  }

  const query = normalizeCatalogQuery({
    q: searchParams.get("q") ?? undefined,
    brand: searchParams.get("brand") ?? undefined,
    min: searchParams.get("min") ?? undefined,
    max: searchParams.get("max") ?? undefined,
    stock: searchParams.get("stock") ?? undefined,
    discount: searchParams.get("discount") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
  });

  const [categories, brands, products] = await Promise.all([
    getCatalogCategories(),
    getCatalogBrands(categorySlug),
    getCatalogProducts({ categorySlug, query }),
  ]);

  return NextResponse.json({
    categories,
    brands,
    products,
  });
}
