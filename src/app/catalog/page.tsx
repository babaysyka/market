import { Breadcrumbs, CatalogFilters, CategoryShortcuts, ListHeader, ProductGrid, normalizeCatalogQuery, type RawCatalogQuery } from "@/components/catalog-tools";
import { getCatalogBrands, getCatalogCategories, getCatalogProducts } from "@/lib/db/catalog";

type PageProps = { searchParams: Promise<RawCatalogQuery> };

export default async function CatalogPage({ searchParams }: PageProps) {
  const rawQuery = await searchParams;
  const query = normalizeCatalogQuery(rawQuery);
  const [categories, brands, items] = await Promise.all([
    getCatalogCategories(),
    getCatalogBrands(),
    getCatalogProducts({ query }),
  ]);

  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Каталог" }]} />
    <ListHeader title="Каталог техники" description="Подбирай технику по разделу, бренду и цене." count={items.length} />
    <CategoryShortcuts items={categories} />
    <div className="catalog-layout">
      <CatalogFilters action="/catalog" query={query} brands={brands} />
      <section aria-label="Результаты каталога"><div className="catalog-toolbar"><span>Подобрано для тебя</span><span>{items.length} позиций</span></div><ProductGrid items={items} /></section>
    </div>
  </main>;
}
