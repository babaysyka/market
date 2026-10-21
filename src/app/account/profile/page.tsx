import Link from "next/link";
import { ArrowRight, Basket, Heart, Package } from "@phosphor-icons/react/dist/ssr";
import { AccountGate, ProfileIdentity } from "@/components/account-access";
import { AccountNav } from "@/components/account-nav";
import { Breadcrumbs } from "@/components/catalog-tools";

export default function ProfilePage() {
  return <AccountGate><main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Личный кабинет" }]} />
    <div className="page-title-row"><div><h1>Личный кабинет</h1><p>Управляй заказами, избранным и настройками профиля.</p></div></div>
    <div className="account-layout"><AccountNav active="/account/profile" />
      <section className="content-panel">
        <ProfileIdentity />
        <div className="account-cards">
          <Link className="account-card" href="/account/orders"><Package size={20} color="#315bd6" /><strong>История покупок</strong><span>Здесь будут статусы и состав заказов</span></Link>
          <Link className="account-card" href="/cart"><Basket size={20} color="#315bd6" /><strong>Корзина</strong><span>Собранные товары этого устройства</span></Link>
          <Link className="account-card" href="/favorites"><Heart size={20} color="#315bd6" /><strong>Избранное</strong><span>Товары, которые хочется сохранить</span></Link>
          <Link className="account-card" href="/account/settings"><ArrowRight size={20} color="#315bd6" /><strong>Настройки профиля</strong><span>Имя, контакт и фото</span></Link>
        </div>
      </section>
    </div>
  </main></AccountGate>;
}
