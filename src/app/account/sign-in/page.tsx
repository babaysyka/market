import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog-tools";
import { AuthForm } from "@/components/store-forms";

export default function SignInPage() {
  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Вход" }]} />
    <div className="auth-layout">
      <aside className="auth-aside"><div><h2>Твоя техника — под рукой</h2><p>История покупок, избранное и настройки — в одном аккаунте.</p></div><div className="auth-aside-visual"><Image src="/products/laptop.jpg" alt="Ноутбук Lenovo IdeaPad Slim 3" width={700} height={360} priority /></div></aside>
      <section className="auth-panel"><h1>С возвращением</h1><p>Войди, чтобы открыть личный кабинет.</p><AuthForm mode="sign-in" /><p className="auth-switch">Впервые здесь? <Link href="/account/register">Создать аккаунт</Link></p></section>
    </div>
  </main>;
}
