"use client";

import { ArrowsLeftRight, Basket, Heart } from "@phosphor-icons/react";
import { useState } from "react";
import type { Product } from "@/data/catalog";
import { useStore } from "@/components/store-provider";

export function DetailActions({ product }: { product: Product }) {
  const { addToCart, compareIds, favorites, toggleCompare, toggleFavorite } = useStore();
  const [added, setAdded] = useState(false);
  const favorite = favorites.includes(product.id);
  const compared = compareIds.includes(product.id);
  return <div className="detail-buy-row">
    <button className="button button-primary" type="button" disabled={!product.inStock} onClick={() => { addToCart(product.id); setAdded(true); window.setTimeout(() => setAdded(false), 1400); }}>
      <Basket size={19} />{added ? "Добавлено в корзину" : "Добавить в корзину"}
    </button>
    <button className={`button button-outline detail-favorite ${favorite ? "is-favorite" : ""}`} type="button" aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"} aria-pressed={favorite} onClick={() => toggleFavorite(product.id)}>
      <Heart size={19} weight={favorite ? "fill" : "regular"} />
    </button>
    <button className={compared ? "button button-outline detail-compare is-compared" : "button button-outline detail-compare"} type="button" aria-label={compared ? "Убрать из сравнения" : compareIds.length >= 4 ? "Сравнение ограничено четырьмя товарами" : "Добавить в сравнение"} aria-pressed={compared} disabled={!compared && compareIds.length >= 4} onClick={() => toggleCompare(product.id)}>
      <ArrowsLeftRight size={19} />
    </button>
  </div>;
}
