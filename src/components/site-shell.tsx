"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  ArrowsLeftRight,
  Basket,
  CaretDown,
  CheckCircle,
  CookingPot,
  DeviceMobile,
  Headphones,
  Heart,
  HouseLine,
  Laptop,
  Lightning,
  MagnifyingGlass,
  Package,
  SquaresFour,
  UserCircle,
} from "@phosphor-icons/react";
import { categories, products } from "@/data/catalog";
import { ProfileAvatar } from "@/components/profile-avatar";
import { useStore } from "@/components/store-provider";

const categoryIcons = {
  smartphones: DeviceMobile,
  computers: Laptop,
  audio: Headphones,
  home: HouseLine,
  kitchen: CookingPot,
};

export function SiteHeader() {
  const { cartCount, compareIds, favorites, user } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const catalogButtonRef = useRef<HTMLButtonElement>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const featuredProduct = products.find((product) => product.id === "tono-studio") ?? products[0];

  const openMenu = useCallback(() => {
    if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = null;
    setMenuMounted(true);
    setMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    if (closeTimeoutRef.current !== null) window.clearTimeout(closeTimeoutRef.current);

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimeoutRef.current = window.setTimeout(() => {
      setMenuMounted(false);
      closeTimeoutRef.current = null;
    }, prefersReducedMotion ? 1 : 240);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !headerRef.current?.contains(event.target)) closeMenu();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
        catalogButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [closeMenu, menuOpen]);

  return <header className="site-header" ref={headerRef}>
    <div className="announcement-bar"><Package size={15} weight="fill" /> Бесплатная доставка от 1 000 000 сум</div>
    <div className="header-main page-wrap">
      <Link className="brand" href="/" aria-label="ЭлектроМаркет — главная">
        <span className="brand-mark" aria-hidden="true"><Lightning size={18} weight="fill" /></span>
        <span>электро<span>маркет</span></span>
      </Link>
      <button
        className={`catalog-trigger ${menuOpen ? "is-open" : ""}`}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="catalog-panel"
        onClick={() => (menuOpen ? closeMenu() : openMenu())}
        ref={catalogButtonRef}
      >
        <SquaresFour size={18} weight="fill" aria-hidden="true" />
        Каталог
        <CaretDown className="catalog-caret" size={14} weight="bold" aria-hidden="true" />
      </button>
      <form className="search-field header-search" action="/search">
        <MagnifyingGlass size={19} weight="regular" aria-hidden="true" />
        <input aria-label="Поиск по каталогу" type="search" name="q" placeholder="Найти технику или бренд" />
        <kbd>↵</kbd>
      </form>
      <nav className="header-actions" aria-label="Личный раздел">
      <Link href={user ? "/account/profile" : "/account/sign-in?next=/account/profile"} className="header-action">
        {user
          ? <ProfileAvatar name={user.name} avatarKey={user.avatarKey} avatarUrl={user.avatarUrl} size={30} shape="circle" className="header-profile-avatar" />
          : <UserCircle size={20} weight="regular" />}
        <span>{user ? "Профиль" : "Войти"}</span>
      </Link>
      <Link href="/compare" className="header-action action-count" aria-label={compareIds.length ? "Сравнение, " + compareIds.length + " товаров" : "Сравнение"}>
        <ArrowsLeftRight size={20} weight="regular" /><span>Сравнение</span>{compareIds.length > 0 && <b>{compareIds.length}</b>}
      </Link>
        <Link href="/favorites" className="header-action action-count" aria-label={`Избранное${favorites.length ? `, ${favorites.length} товаров` : ""}`}>
          <Heart size={20} weight="regular" /><span>Избранное</span>{favorites.length > 0 && <b>{favorites.length}</b>}
        </Link>
        <Link href="/cart" className="header-action action-count" aria-label={`Корзина${cartCount ? `, ${cartCount} товаров` : ""}`}>
          <Basket size={20} weight="regular" /><span>Корзина</span>{cartCount > 0 && <b>{cartCount}</b>}
        </Link>
      </nav>
    </div>
    {menuMounted && <div className="catalog-layer" data-state={menuOpen ? "open" : "closing"} aria-hidden={!menuOpen}>
      <button className="catalog-backdrop" type="button" aria-label="Закрыть каталог" tabIndex={-1} disabled={!menuOpen} onClick={closeMenu} />
      <section
        className="catalog-menu page-wrap"
        id="catalog-panel"
        aria-label="Каталог товаров"
        inert={!menuOpen}
      >
        <aside className="catalog-menu-feature">
          <div className="catalog-feature-copy">
            <span className="catalog-feature-kicker">Выбор редакции</span>
            <h2>Технологии для твоего ритма</h2>
            <p>Находи вещи, которые делают каждый день удобнее.</p>
            <Link href={`/product/${featuredProduct.slug}`} onClick={closeMenu}>Открыть подборку <ArrowRight size={16} /></Link>
          </div>
          <Image src={featuredProduct.image} alt="" fill sizes="300px" unoptimized />
          <span className="catalog-feature-glow" />
        </aside>
        <div className="catalog-menu-main">
          <div className="catalog-menu-heading">
            <div><span className="catalog-eyebrow">ЭлектроМаркет</span><h2>Категории</h2></div>
            <Link href="/catalog" onClick={closeMenu}>Весь каталог <ArrowUpRight size={16} /></Link>
          </div>
          <nav className="catalog-menu-links" aria-label="Категории товаров">
            {categories.map((category) => {
              const CategoryIcon = categoryIcons[category.slug as keyof typeof categoryIcons];
              const count = products.filter((product) => product.category === category.slug).length;
              return <Link className="catalog-category-link" href={`/catalog/${category.slug}`} key={category.slug} onClick={closeMenu}>
                <span className={`catalog-category-icon ${category.tone}`}><CategoryIcon size={21} weight="regular" /></span>
                <span className="catalog-category-copy"><strong>{category.name}</strong><small>{category.note}</small></span>
                <span className="catalog-category-count">{count}</span>
                <ArrowUpRight className="catalog-category-arrow" size={16} />
              </Link>;
            })}
          </nav>
          <div className="catalog-menu-service"><CheckCircle size={17} weight="fill" /><span>Подбор, доставка и гарантия — всё в одном месте</span></div>
        </div>
      </section>
    </div>}
    <div className="mobile-search page-wrap">
      <form className="search-field" action="/search">
        <MagnifyingGlass size={19} aria-hidden="true" />
        <input aria-label="Поиск по каталогу" type="search" name="q" placeholder="Найти технику или бренд" />
      </form>
    </div>
  </header>;
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="page-wrap footer-main">
      <div className="footer-brand">
        <Link className="brand" href="/"><span className="brand-mark" aria-hidden="true"><Lightning size={18} weight="fill" /></span><span>электро<span>маркет</span></span></Link>
        <p>Техника для обычных дней<br />и больших планов.</p>
      </div>
      <div><h3>Покупателям</h3><Link href="/catalog">Каталог</Link><Link href="/account/orders">История заказов</Link><Link href="/account/profile">Личный кабинет</Link></div>
      <div><h3>Разделы</h3>{categories.slice(0, 4).map((category) => <Link key={category.slug} href={`/catalog/${category.slug}`}>{category.shortName}</Link>)}</div>
      <div className="footer-note"><span>Поможем с выбором</span><p>Найди подходящую технику для дома, работы и отдыха.</p><Link href="/catalog">Смотреть каталог <ArrowRight size={15} /></Link></div>
    </div>
    <div className="page-wrap footer-bottom"><span>© 2026 ЭлектроМаркет</span><span>Узбекистан · цены в сумах</span><Link href="/account/settings">Настройки профиля</Link></div>
  </footer>;
}
