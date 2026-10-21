import { AdminNav } from "@/components/account-nav";
import { Breadcrumbs } from "@/components/catalog-tools";
import { AdminProductForm, StoreNote } from "@/components/store-forms";
import { formatPrice, products } from "@/data/catalog";

export default function AdminProductsPage() {
  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Админ-панель", href: "/admin" }, { label: "Товары" }]} />
    <div className="page-title-row"><div><h1>Товары</h1><p>Каталог, ассортимент и актуальные цены.</p></div></div>
    <div className="admin-layout"><AdminNav active="/admin/products" /><div className="admin-content"><StoreNote>Следите за ассортиментом и наличием позиций.</StoreNote>
      <section className="admin-panel"><h2>Каталог товаров</h2>{products.map((product) => <div className="admin-product-row" key={product.id}><strong>{product.name}</strong><span>{formatPrice(product.price)}</span><span className="pill">{product.inStock ? "В наличии" : "Нет"}</span></div>)}</section>
      <section className="admin-panel"><h2>Добавить товар</h2><AdminProductForm /></section>
    </div></div>
  </main>;
}
