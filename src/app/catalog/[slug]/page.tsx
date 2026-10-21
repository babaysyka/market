import { notFound } from "next/navigation";
import { Breadcrumbs, CatalogFilters, CategoryShortcuts, ListHeader, ProductGrid, normalizeCatalogQuery, type RawCatalogQuery } from "@/components/catalog-tools";
import { categories as fallbackCategories } from "@/data/catalog";
import { getCatalogBrands, getCatalogCategories, getCatalogCategoryBySlug, getCatalogProducts } from "@/lib/db/catalog";

type PageProps = { params: Promise<{ slug: string }>; searchParams: Promise<RawCatalogQuery> };

export function generateStaticParams() {
  return fallbackCategories.map((category) => ({ slug: category.slug }));
}

export default async function CategoryPage({ params, searchParams }: PageProps) {
  const [{ slug }, rawQuery] = await Promise.all([params, searchParams]);
  const query = normalizeCatalogQuery(rawQuery);
  const [category, categories, brands, items] = await Promise.all([
    getCatalogCategoryBySlug(slug),
    getCatalogCategories(),
    getCatalogBrands(slug),
    getCatalogProducts({ categorySlug: slug, query }),
  ]);
  if (!category) notFound();

  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Каталог", href: "/catalog" }, { label: category.shortName }]} />
    <ListHeader title={category.name} description={category.note} count={items.length} />
    <CategoryShortcuts active={category.slug} items={categories} />
    <div className="catalog-layout">
      <CatalogFilters action={`/catalog/${category.slug}`} query={query} brands={brands} />
      <section aria-label="Товары категории"><div className="catalog-toolbar"><span>Популярные модели и новинки</span><span>{items.length} позиций</span></div><ProductGrid items={items} /></section>
    </div>
  </main>;
}
