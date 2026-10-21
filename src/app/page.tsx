import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CreditCard, ShieldCheck, Sparkle, Truck } from "@phosphor-icons/react/dist/ssr";
import { ProductCard } from "@/components/product-card";
import { products as fallbackProducts } from "@/data/catalog";
import { getCatalogCategories, getCatalogProducts } from "@/lib/db/catalog";

export default async function HomePage() {
  const [categories, products] = await Promise.all([
    getCatalogCategories(),
    getCatalogProducts(),
  ]);
  const heroProduct = products[0] ?? fallbackProducts[0];

  return <main className="page-wrap home-main">
    <section className="hero-panel" aria-labelledby="hero-title">
      <div className="hero-copy">
        <span className="hero-kicker"><span className="hero-kicker-mark"><Sparkle size={14} weight="fill" /></span> Подборка техники на каждый день</span>
        <h1 id="hero-title">Техника для <span>твоих</span> планов</h1>
        <p>Смартфоны, ноутбуки и техника для дома — в одном понятном каталоге.</p>
        <div className="hero-cta-row">
          <Link className="button button-primary" href="/catalog/smartphones">Смотреть каталог <ArrowUpRight size={18} /></Link>
          <Link className="button-link" href="/catalog">Все разделы <ArrowRight size={16} /></Link>
        </div>
        <div className="hero-footnote"><ShieldCheck size={16} weight="fill" /> Официальная гарантия производителя</div>
      </div>
      <div className="hero-visual" aria-label={heroProduct.name}>
        <Image src={heroProduct.image} alt={heroProduct.name} fill priority loading="eager" sizes="(max-width: 620px) 100vw, 50vw" unoptimized />
        <div className="hero-image-shade" />
        <div className="hero-sticker">выбор<br />недели</div>
        <div className="hero-photo-caption"><strong>{heroProduct.name}</strong><span>цвет «{heroProduct.color}»</span></div>
      </div>
    </section>

    <div className="benefit-row" aria-label="Особенности магазина">
      <div className="benefit-item"><span className="benefit-icon"><Truck size={19} weight="regular" /></span><div><strong>Доставка по стране</strong><span>Ташкент и регионы</span></div></div>
      <div className="benefit-item"><span className="benefit-icon"><CreditCard size={19} weight="regular" /></span><div><strong>Удобная оплата</strong><span>Онлайн или при получении</span></div></div>
      <div className="benefit-item"><span className="benefit-icon"><ShieldCheck size={19} weight="regular" /></span><div><strong>Гарантия и сервис</strong><span>Поддержка после покупки</span></div></div>
    </div>

    <section className="section-block" aria-labelledby="categories-title">
      <div className="section-heading">
        <div><h2 id="categories-title">Найди своё</h2><p>Техника для работы, дома и отдыха</p></div>
        <Link className="text-link" href="/catalog">Весь каталог <ArrowRight size={16} /></Link>
      </div>
      <div className="category-grid">
        {categories.map((category, index) => <Link className={`category-tile category-tile--${index} ${category.tone}`} href={`/catalog/${category.slug}`} key={category.slug}>
          <div className="category-copy"><span>{category.note}</span><h3>{category.shortName}</h3></div>
          <span className="category-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span>
          <Image src={category.image} alt="" fill sizes="(max-width: 620px) 48vw, (max-width: 1100px) 40vw, 320px" unoptimized />
        </Link>)}
      </div>
    </section>

    <section className="section-block products-section" aria-labelledby="popular-title">
      <div className="section-heading">
        <div><h2 id="popular-title">Выбор недели</h2><p>Техника, к которой хочется возвращаться</p></div>
        <Link className="text-link" href="/catalog">Смотреть всё <ArrowRight size={16} /></Link>
      </div>
      <div className="product-grid">{products.slice(0, 4).map((product) => <ProductCard product={product} key={product.id} />)}</div>
    </section>

    <section className="section-block products-section" aria-labelledby="new-title">
      <div className="section-heading">
        <div><h2 id="new-title">Ещё немного техники</h2><p>Идеи для дома, кухни и рабочего места</p></div>
        <Link className="text-link" href="/catalog">Перейти к выбору <ArrowRight size={16} /></Link>
      </div>
      <div className="product-grid">{products.slice(4, 8).map((product) => <ProductCard product={product} key={product.id} />)}</div>
    </section>

    <section className="section-block products-section" aria-labelledby="arrivals-title">
      <div className="section-heading">
        <div><h2 id="arrivals-title">Свежие поступления</h2><p>Ещё больше техники для твоих планов</p></div>
        <Link className="text-link" href="/catalog">Весь каталог <ArrowRight size={16} /></Link>
      </div>
      <div className="product-grid">{products.slice(-10, -6).map((product) => <ProductCard product={product} key={product.id} />)}</div>
    </section>

    <section className="service-band">
      <div><h2>Собирай свою технику в одном месте</h2><p>Сохраняй понравившиеся товары и возвращайся к выбору в удобное время.</p></div>
      <Link className="button button-outline" href="/catalog">Перейти к каталогу <ArrowRight size={17} /></Link>
    </section>
  </main>;
}
