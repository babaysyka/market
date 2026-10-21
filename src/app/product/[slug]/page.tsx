import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle, ShieldCheck, Star, Truck } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog-tools";
import { DetailActions } from "@/components/detail-actions";
import { ProductCard } from "@/components/product-card";
import { formatPrice, products as fallbackProducts } from "@/data/catalog";
import { getCatalogCategoryBySlug, getCatalogProductBySlug, getCatalogProducts } from "@/lib/db/catalog";

type PageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return fallbackProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);
  if (!product) return { title: "Товар не найден | ЭлектроМаркет" };
  return {
    title: `${product.name} — купить в ЭлектроМаркет`,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const [product, allProducts] = await Promise.all([
    getCatalogProductBySlug(slug),
    getCatalogProducts(),
  ]);
  if (!product) notFound();
  const category = await getCatalogCategoryBySlug(product.category);
  const categoryProducts = allProducts.filter((item) => item.category === product.category && item.id !== product.id);
  const hasCategoryRecommendations = categoryProducts.length > 0;
  const relatedProducts = (hasCategoryRecommendations ? categoryProducts : allProducts.filter((item) => item.id !== product.id)).slice(0, 4);

  return <main className="page-wrap page-main product-page">
    <Breadcrumbs items={[{ label: "Каталог", href: "/catalog" }, ...(category ? [{ label: category.shortName, href: `/catalog/${category.slug}` }] : []), { label: product.name }]} />
    <div className="detail-layout">
      <div className="detail-image">
        <span className="detail-image-label"><CheckCircle size={15} weight="fill" /> Оригинальная техника</span>
        <Image src={product.image} alt={product.name} fill sizes="(max-width: 620px) 100vw, 55vw" priority unoptimized />
      </div>
      <div className="detail-info">
        <span className="detail-brand">{product.brand} <span>·</span> {product.color}</span>
        <h1>{product.name}</h1>
        <a className="detail-rating" href="#customer-reviews" aria-label={`Рейтинг ${product.rating}, ${product.reviews} отзывов`}><Star size={16} weight="fill" /> <strong>{product.rating}</strong><span>{product.reviews} отзывов</span></a>
        <div className="detail-price-row"><span className="detail-price">{formatPrice(product.price)}</span>{product.oldPrice && <><del>{formatPrice(product.oldPrice)}</del><span className="detail-discount">−{Math.round((1 - product.price / product.oldPrice) * 100)}%</span></>}</div>
        <div className={`availability ${product.inStock ? "" : "is-out"}`}><span className="availability-indicator" />{product.inStock ? "В наличии" : "Ожидается поступление"}</div>
        <DetailActions product={product} />
        <div className="detail-perks">
          <div><span><Truck size={18} /></span><div><strong>Удобная доставка</strong><small>По Ташкенту и регионам</small></div></div>
          <div><span><ShieldCheck size={18} /></span><div><strong>Гарантия качества</strong><small>Поддержка после покупки</small></div></div>
        </div>
        <p className="detail-description">{product.description}</p>
      </div>
    </div>

    <section className="product-information" aria-label="Описание и характеристики товара">
      <div className="product-overview"><span className="section-eyebrow">Подробности</span><h2>Продуман до мелочей</h2><p>{product.description}</p><p>Сочетает в себе функциональность, аккуратный дизайн и удобство в повседневном использовании. Подходит для тех, кто ценит надёжную технику и внимание к деталям.</p></div>
      <div className="product-specifications"><h2>Характеристики</h2><dl>{product.specs.map((spec) => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl></div>
    </section>

    <section className="product-reviews" id="customer-reviews" aria-labelledby="reviews-title">
      <div><span className="section-eyebrow">Мнение покупателей</span><h2 id="reviews-title">Отзывы о товаре</h2></div>
      <div className="review-score"><Star size={20} weight="fill" /><strong>{product.rating}</strong><span>на основе {product.reviews} отзывов</span></div>
    </section>

    {relatedProducts.length > 0 && <section className="section-block products-section product-related" aria-labelledby="related-title">
      <div className="section-heading"><div><h2 id="related-title">{hasCategoryRecommendations ? "Другие товары в категории" : "С этим товаром смотрят"}</h2><p>Ещё несколько удачных вариантов</p></div><Link className="text-link" href={`/catalog/${product.category}`}>В категорию <ArrowRight size={16} /></Link></div>
      <div className="product-grid">{relatedProducts.map((item) => <ProductCard product={item} key={item.id} />)}</div>
    </section>}
  </main>;
}
