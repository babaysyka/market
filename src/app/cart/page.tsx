"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Basket, Minus, Plus, Trash } from "@phosphor-icons/react";
import { Breadcrumbs } from "@/components/catalog-tools";
import { useStore } from "@/components/store-provider";
import { formatPrice, products } from "@/data/catalog";

export default function CartPage() {
  const { cart, setQuantity, removeFromCart } = useStore();
  const lines = cart.flatMap((line) => {
    const product = products.find((item) => item.id === line.productId);
    return product ? [{ ...line, product }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);

  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Корзина" }]} />
    <div className="page-title-row"><div><h1>Корзина</h1><p>Проверь состав заказа перед оформлением.</p></div></div>
    {lines.length === 0 ? <div className="cart-panel cart-empty"><span className="cart-empty-icon"><Basket size={25} /></span><h2>Корзина пока пуста</h2><p>Добавь понравившийся товар из каталога.</p><Link className="button button-primary" href="/catalog">Перейти к товарам <ArrowRight size={17} /></Link></div> : <div className="cart-layout">
      <section className="cart-panel" aria-label="Товары в корзине">{lines.map(({ product, quantity }) => <article className="cart-line" key={product.id}>
        <Link className="cart-line-image" href={`/product/${product.slug}`}><Image src={product.image} alt={product.name} fill sizes="100px" unoptimized /></Link>
        <div className="cart-line-copy"><Link href={`/product/${product.slug}`}>{product.name}</Link><span>{product.brand} · {formatPrice(product.price)} за штуку</span></div>
        <div className="quantity-control" aria-label={`Количество: ${quantity}`}><button type="button" aria-label="Уменьшить количество" onClick={() => setQuantity(product.id, quantity - 1)}><Minus size={13} /></button><span>{quantity}</span><button type="button" aria-label="Увеличить количество" onClick={() => setQuantity(product.id, quantity + 1)}><Plus size={13} /></button></div>
        <div className="cart-line-price"><strong>{formatPrice(product.price * quantity)}</strong><button type="button" onClick={() => removeFromCart(product.id)}><Trash size={13} /> Убрать</button></div>
      </article>)}</section>
      <aside className="cart-summary"><h2>Ваш заказ</h2><div className="summary-row"><span>Товары</span><strong>{formatPrice(subtotal)}</strong></div><div className="summary-row"><span>Доставка</span><span>Рассчитаем при оформлении</span></div><div className="summary-row summary-total"><span>Итого</span><strong>{formatPrice(subtotal)}</strong></div><Link className="button button-primary button-wide" href="/checkout">Перейти к оформлению <ArrowRight size={17} /></Link><p className="summary-row">Доставка по Ташкенту и регионам</p></aside>
    </div>}
  </main>;
}
