"use client";

import Link from "next/link";
import { Breadcrumbs, ProductGrid } from "@/components/catalog-tools";
import { useStore } from "@/components/store-provider";
import { products } from "@/data/catalog";

export default function FavoritesPage() {
  const { favorites } = useStore();
  const items = products.filter((product) => favorites.includes(product.id));
  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Избранное" }]} />
    <div className="page-title-row"><div><h1>Избранное</h1><p>Сохрани товары, чтобы вернуться к ним позже.</p></div></div>
    {items.length ? <ProductGrid items={items} /> : <div className="empty-state"><div><strong>Пока ничего нет</strong><span>Нажми на сердечко в карточке товара, чтобы сохранить его здесь.</span><p><Link className="text-link" href="/catalog">Перейти в каталог</Link></p></div></div>}
  </main>;
}
