import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { ProductCard } from "@/components/product-card";
import { categories, products, type Product } from "@/data/catalog";

export type CatalogQuery = { q?: string; brand?: string; min?: string; max?: string; stock?: string; discount?: string; sort?: string };
export type RawCatalogQuery = Record<string, string | string[] | undefined>;

export function normalizeCatalogQuery(raw: RawCatalogQuery): CatalogQuery {
  const value = (key: string) => Array.isArray(raw[key]) ? raw[key]?.[0] : raw[key];
  return { q: value("q"), brand: value("brand"), min: value("min"), max: value("max"), stock: value("stock"), discount: value("discount"), sort: value("sort") };
}

export function filterProducts(items: Product[], query: CatalogQuery) {
  const q = query.q?.trim().toLocaleLowerCase("ru") ?? "";
  const min = Number(query.min) || 0;
  const max = Number(query.max) || Number.POSITIVE_INFINITY;
  const result = items.filter((product) => {
    const matchesQuery = !q || `${product.name} ${product.brand} ${product.description}`.toLocaleLowerCase("ru").includes(q);
    const matchesBrand = !query.brand || product.brand === query.brand;
    const matchesPrice = product.price >= min && product.price <= max;
    const matchesStock = query.stock !== "on" || product.inStock;
    const matchesDiscount = query.discount !== "on" || Boolean(product.oldPrice);
    return matchesQuery && matchesBrand && matchesPrice && matchesStock && matchesDiscount;
  });

  if (query.sort === "price-asc") result.sort((a, b) => a.price - b.price);
  if (query.sort === "price-desc") result.sort((a, b) => b.price - a.price);
  if (query.sort === "popular") result.sort((a, b) => b.reviews - a.reviews);
  return result;
}

export function CatalogFilters({ action, query = {}, brands: customBrands }: { action: string; query?: CatalogQuery; brands?: string[] }) {
  const brands = customBrands ?? Array.from(new Set(products.map((product) => product.brand))).sort();
  return <form className="filter-panel" action={action}>
    <h2>Подбор товаров</h2>
    <label>Поиск<input name="q" type="search" defaultValue={query.q} placeholder="Название или модель" /></label>
    <label>Бренд<select name="brand" defaultValue={query.brand ?? ""}><option value="">Все бренды</option>{brands.map((brand) => <option value={brand} key={brand}>{brand}</option>)}</select></label>
    <label>Цена от, сум<input name="min" inputMode="numeric" type="number" min="0" defaultValue={query.min} placeholder="0" /></label>
    <label>Цена до, сум<input name="max" inputMode="numeric" type="number" min="0" defaultValue={query.max} placeholder="Без ограничения" /></label>
    <label className="check-label"><input name="stock" type="checkbox" defaultChecked={query.stock === "on"} /><span>Только в наличии</span></label>
    <label className="check-label"><input name="discount" type="checkbox" defaultChecked={query.discount === "on"} /><span>Товары со скидкой</span></label>
    <label>Сортировка<select name="sort" defaultValue={query.sort ?? "popular"}><option value="popular">Сначала популярные</option><option value="price-asc">Сначала дешевле</option><option value="price-desc">Сначала дороже</option></select></label>
    <div className="filter-actions"><button className="button button-primary" type="submit">Показать товары</button><Link className="button button-outline" href={action}>Сбросить</Link></div>
  </form>;
}

export function ProductGrid({ items }: { items: Product[] }) {
  if (!items.length) return <div className="empty-state"><div><strong>Ничего не нашлось</strong><span>Измени фильтры или посмотри другие разделы.</span></div></div>;
  return <div className="product-grid catalog-grid">{items.map((product) => <ProductCard product={product} key={product.id} />)}</div>;
}

export function CategoryShortcuts({ active, items = categories }: { active?: string; items?: typeof categories }) {
  return <div className="category-shortcuts" aria-label="Категории">
    <Link className={`category-chip ${!active ? "is-active" : ""}`} href="/catalog">Все товары</Link>
    {items.map((category) => <Link className={`category-chip ${active === category.slug ? "is-active" : ""}`} href={`/catalog/${category.slug}`} key={category.slug}>{category.shortName}</Link>)}
  </div>;
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return <nav className="breadcrumbs" aria-label="Навигационная цепочка">
    <Link href="/">Главная</Link><span aria-hidden="true">/</span>
    {items.map((item, index) => <span key={`${item.label}-${index}`} className="breadcrumb-entry">
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
      {index < items.length - 1 && <span aria-hidden="true">/</span>}
    </span>)}
  </nav>;
}

export function ListHeader({ title, description, count }: { title: string; description: string; count: number }) {
  return <div className="page-title-row"><div><h1>{title}</h1><p>{description}</p></div><span className="meta-pill">{count} товаров</span></div>;
}

export function RelatedCategories() {
  return <div className="related-links">{categories.slice(0, 4).map((category) => <Link href={`/catalog/${category.slug}`} key={category.slug}>{category.shortName}<ArrowRight size={14} /></Link>)}</div>;
}
