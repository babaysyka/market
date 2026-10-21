"use client";

import { ArrowsLeftRight, Basket, Check, Heart } from "@phosphor-icons/react";
import type { Product } from "@/data/catalog";
import { useStore } from "@/components/store-provider";
import { useCartFeedback } from "@/components/use-cart-feedback";

export function DetailActions({ product }: { product: Product }) {
  const { addToCart, compareIds, favorites, toggleCompare, toggleFavorite } = useStore();
  const { added, animationKey, showAdded } = useCartFeedback();
  const favorite = favorites.includes(product.id);
  const compared = compareIds.includes(product.id);
  return <div className="detail-buy-row">
    <button className={`button button-primary add-to-cart-button ${added ? "is-added" : ""}`} type="button" disabled={!product.inStock} onClick={() => { addToCart(product.id); showAdded(); }}>
      <span className={`cart-add-icon ${added ? "is-added" : ""}`} key={animationKey} aria-hidden="true">
        {added ? <Check size={19} weight="bold" /> : <Basket size={19} />}
      </span>
      {added ? "Добавлено в корзину" : "Добавить в корзину"}
    </button>
    <button className={`button button-outline detail-favorite ${favorite ? "is-favorite" : ""}`} type="button" aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"} aria-pressed={favorite} onClick={() => toggleFavorite(product.id)}>
      <Heart size={19} weight={favorite ? "fill" : "regular"} />
    </button>
    <button className={compared ? "button button-outline detail-compare is-compared" : "button button-outline detail-compare"} type="button" aria-label={compared ? "Убрать из сравнения" : compareIds.length >= 4 ? "Сравнение ограничено четырьмя товарами" : "Добавить в сравнение"} aria-pressed={compared} disabled={!compared && compareIds.length >= 4} onClick={() => toggleCompare(product.id)}>
      <ArrowsLeftRight size={19} />
    </button>
  </div>;
}
