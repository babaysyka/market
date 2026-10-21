import { Breadcrumbs, CatalogFilters, ListHeader, ProductGrid, normalizeCatalogQuery, type RawCatalogQuery } from "@/components/catalog-tools";
import { getCatalogBrands, getCatalogProducts } from "@/lib/db/catalog";

type PageProps = { searchParams: Promise<RawCatalogQuery> };

export default async function SearchPage({ searchParams }: PageProps) {
  const rawQuery = await searchParams;
  const query = normalizeCatalogQuery(rawQuery);
  const [brands, items] = await Promise.all([
    getCatalogBrands(),
    getCatalogProducts({ query }),
  ]);
  const title = query.q ? `По запросу «${query.q}»` : "Поиск по каталогу";

  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Поиск" }]} />
    <ListHeader title={title} description="Ищи по названию, бренду или модели." count={items.length} />
    <div className="catalog-layout">
      <CatalogFilters action="/search" query={query} brands={brands} />
      <section aria-label="Результаты поиска"><div className="catalog-toolbar"><span>Результаты по запросу</span><span>{items.length} позиций</span></div><ProductGrid items={items} /></section>
    </div>
  </main>;
}
