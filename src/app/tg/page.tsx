import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Basket,
  MagnifyingGlass,
  Package,
  TelegramLogo,
} from "@phosphor-icons/react/dist/ssr";
import { CategoryShortcuts } from "@/components/catalog-tools";
import { ProductCard } from "@/components/product-card";
import { getCatalogCategories, getCatalogProducts } from "@/lib/db/catalog";

export default async function TelegramMiniAppPage() {
  const [categories, products] = await Promise.all([
    getCatalogCategories(),
    getCatalogProducts(),
  ]);

  const featured = products.slice(0, 8);
  const discounted = products.filter((item) => Boolean(item.oldPrice)).slice(0, 4);

  return (
    <main className="page-wrap page-main tg-home-main">
      <section className="tg-hero-card" aria-labelledby="tg-hero-heading">
        <div className="tg-hero-copy">
          <span className="tg-hero-chip">
            <TelegramLogo size={14} weight="fill" />
            ЭлектроМаркет в Telegram
          </span>
          <h1 id="tg-hero-heading">Выбирай и заказывай технику прямо в чате</h1>
          <p>
            Единый каталог, актуальные цены в сумах и общая корзина с сайтом магазина.
          </p>
          <div className="tg-hero-actions">
            <Link className="button button-primary" href="/catalog">
              Открыть каталог <ArrowUpRight size={17} />
            </Link>
            <Link className="button button-outline" href="/account/orders">
              <Package size={17} /> Мои заказы
            </Link>
          </div>
        </div>
        {featured[0] && (
          <div className="tg-hero-preview">
            <Image
              src={featured[0].image}
              alt={featured[0].name}
              fill
              sizes="(max-width: 620px) 100vw, 320px"
              unoptimized
            />
          </div>
        )}
      </section>

      <form className="search-field tg-inline-search" action="/search">
        <MagnifyingGlass size={19} aria-hidden="true" />
        <input
          aria-label="Поиск товара в Mini App"
          type="search"
          name="q"
          placeholder="Смартфон, ноутбук, бренд или модель"
        />
        <button type="submit" className="button button-primary tg-search-submit">
          Найти
        </button>
      </form>

      <CategoryShortcuts items={categories} />

      <section className="section-block tg-section" aria-labelledby="tg-popular-heading">
        <div className="section-heading">
          <div>
            <h2 id="tg-popular-heading">Популярные товары</h2>
            <p>Актуальное наличие со склада в Ташкенте</p>
          </div>
          <Link className="text-link" href="/catalog">
            Все товары <ArrowRight size={15} />
          </Link>
        </div>
        <div className="product-grid">{featured.map((product) => <ProductCard product={product} key={product.id} />)}</div>
      </section>

      {discounted.length > 0 && (
        <section className="section-block tg-section" aria-labelledby="tg-deals-heading">
          <div className="section-heading">
            <div>
              <h2 id="tg-deals-heading">Выгодные предложения</h2>
              <p>Позиции со сниженной ценой</p>
            </div>
            <Link className="text-link" href="/catalog?discount=on">
              Все скидки <ArrowRight size={15} />
            </Link>
          </div>
          <div className="product-grid">
            {discounted.map((product) => (
              <ProductCard product={product} key={product.id} />
            ))}
          </div>
        </section>
      )}

      <section className="tg-quick-bar" aria-label="Быстрые переходы">
        <Link href="/cart" className="button button-primary">
          <Basket size={18} /> Перейти в корзину
        </Link>
        <Link href="/checkout" className="button button-outline">
          Оформить заказ <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
