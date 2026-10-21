import { AdminNav } from "@/components/account-nav";
import { Breadcrumbs } from "@/components/catalog-tools";
import { AdminProductForm, StoreNote } from "@/components/store-forms";
import { formatPrice, products } from "@/data/catalog";

export default function AdminPage() {
  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Панель управления" }]} />
    <div className="page-title-row"><div><h1>Панель управления</h1><p>Каталог, заказы и основные показатели магазина.</p></div></div>
    <div className="admin-layout"><AdminNav active="/admin" /><div className="admin-content">
      <StoreNote>Следите за новыми заказами и наличием популярных товаров.</StoreNote>
      <section className="admin-panel"><h2>Обзор магазина</h2><div className="admin-cards"><div className="admin-stat"><span>Товары в каталоге</span><strong>{products.length}</strong></div><div className="admin-stat"><span>Новые заказы</span><strong>2</strong></div><div className="admin-stat"><span>Средний рейтинг</span><strong>4,8</strong></div></div></section>
      <div className="admin-sections"><section className="admin-panel"><h2>Популярные товары</h2>{products.slice(0, 5).map((product) => <div className="admin-product-row" key={product.id}><strong>{product.name}</strong><span>{formatPrice(product.price)}</span><span className="pill">{product.inStock ? "В наличии" : "Нет"}</span></div>)}</section><section className="admin-panel"><h2>Новый товар</h2><AdminProductForm /></section></div>
    </div></div>
  </main>;
}
