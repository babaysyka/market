"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowsLeftRight, ArrowRight, X } from "@phosphor-icons/react";
import { Breadcrumbs } from "@/components/catalog-tools";
import { useStore } from "@/components/store-provider";
import { formatPrice, products } from "@/data/catalog";

export default function ComparePage() {
  const { compareIds, toggleCompare } = useStore();
  const items = compareIds.map((id) => products.find((product) => product.id === id)).filter((product) => product !== undefined);
  const specificationNames = Array.from(new Set(items.flatMap((product) => product.specs.map((spec) => spec.label))));

  function clearComparison() {
    for (const id of compareIds) toggleCompare(id);
  }

  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Сравнение" }]} />
    <div className="page-title-row compare-page-heading">
      <div><h1>Сравнение товаров</h1><p>Сопоставь цены и характеристики перед покупкой.</p></div>
      {items.length > 0 && <button className="button button-outline" type="button" onClick={clearComparison}>Очистить список</button>}
    </div>
    {!items.length ? <div className="empty-state">
      <div><span className="empty-state-icon"><ArrowsLeftRight size={24} /></span><strong>Список сравнения пуст</strong><span>Добавь товары в сравнение прямо из карточек каталога.</span><p><Link className="button button-primary" href="/catalog">Перейти в каталог <ArrowRight size={16} /></Link></p></div>
    </div> : <>
      {items.length === 1 && <p className="compare-hint">Добавь ещё один товар, чтобы увидеть различия.</p>}
      <div className="comparison-scroll">
        <table className="comparison-table">
          <thead><tr>
            <th className="comparison-label" scope="col">Товар</th>
            {items.map((product) => <th scope="col" key={product.id}>
              <div className="comparison-product">
                <button className="comparison-remove" type="button" aria-label={"Убрать " + product.name + " из сравнения"} onClick={() => toggleCompare(product.id)}><X size={17} /></button>
                <Link className="comparison-product-image" href={"/product/" + product.slug}>
                  <Image src={product.image} alt={product.name} width={240} height={170} unoptimized />
                </Link>
                <Link className="comparison-product-name" href={"/product/" + product.slug}>{product.name}</Link>
                <span className="comparison-product-brand">{product.brand} · {product.color}</span>
                <strong className="comparison-product-price">{formatPrice(product.price)}</strong>
              </div>
            </th>)}
          </tr></thead>
          <tbody>
            <tr><th className="comparison-label" scope="row">В наличии</th>{items.map((product) => <td key={product.id}>{product.inStock ? "Есть в наличии" : "Нет в наличии"}</td>)}</tr>
            <tr><th className="comparison-label" scope="row">Рейтинг</th>{items.map((product) => <td key={product.id}>{product.rating} · {product.reviews} отзывов</td>)}</tr>
            {specificationNames.map((name) => <tr key={name}>
              <th className="comparison-label" scope="row">{name}</th>
              {items.map((product) => <td key={product.id}>{product.specs.find((spec) => spec.label === name)?.value ?? "—"}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
    </>}
  </main>;
}
