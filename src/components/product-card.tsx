"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowsLeftRight, Basket, Heart, Star } from "@phosphor-icons/react";
import { useState } from "react";
import { formatPrice, type Product } from "@/data/catalog";
import { useStore } from "@/components/store-provider";

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, compareIds, favorites, toggleCompare, toggleFavorite } = useStore();
  const [added, setAdded] = useState(false);
  const [compareNotice, setCompareNotice] = useState("");
  const favorite = favorites.includes(product.id);
  const compared = compareIds.includes(product.id);

  function handleAdd() {
    addToCart(product.id);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  function handleCompare() {
    const changed = toggleCompare(product.id);
    setCompareNotice(changed ? "" : "Можно сравнить до 4 товаров");
    if (!changed) window.setTimeout(() => setCompareNotice(""), 2200);
  }

  return <article className="product-card">
    <div className="product-visual">
      {product.label && <span className="product-tag">{product.label}</span>}
      <button className={`favorite-button ${favorite ? "is-favorite" : ""}`} type="button" aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"} aria-pressed={favorite} onClick={() => toggleFavorite(product.id)}>
        <Heart size={19} weight={favorite ? "fill" : "regular"} />
      </button>
      <Link className="product-image-link" href={`/product/${product.slug}`} aria-label={`Открыть ${product.name}`}>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 680px) 48vw, (max-width: 1100px) 30vw, 250px" unoptimized />
      </Link>
      <button className={compared ? "compare-toggle is-compared" : "compare-toggle"} type="button" aria-pressed={compared} onClick={handleCompare}>
        <ArrowsLeftRight size={15} weight={compared ? "bold" : "regular"} />{compared ? "В сравнении" : "Сравнить"}
      </button>
      {!product.inStock && <span className="stock-label">Нет в наличии</span>}
    </div>
    <div className="product-info">
      <div className="product-rating"><Star size={14} weight="fill" /><span>{product.rating}</span><span className="rating-count">({product.reviews})</span></div>
      <Link className="product-title" href={`/product/${product.slug}`}>{product.name}</Link>
      <span className="product-brand">{product.brand} · {product.color}</span>
      {compareNotice && <span className="compare-notice" role="status">{compareNotice}</span>}
      <div className="product-price-row"><div><strong>{formatPrice(product.price)}</strong>{product.oldPrice && <del>{formatPrice(product.oldPrice)}</del>}</div>
        <button className={`add-icon-button ${added ? "added" : ""}`} type="button" aria-label={added ? "Добавлено в корзину" : `Добавить ${product.name} в корзину`} disabled={!product.inStock} onClick={handleAdd}>
          <Basket size={18} weight={added ? "fill" : "regular"} />
        </button>
      </div>
    </div>
  </article>;
}
