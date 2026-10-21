import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/catalog-tools";
import { AuthForm } from "@/components/store-forms";

export default function RegisterPage() {
  return <main className="page-wrap page-main">
    <Breadcrumbs items={[{ label: "Регистрация" }]} />
    <div className="auth-layout">
      <aside className="auth-aside"><div><h2>Начни с простого выбора</h2><p>Сохраняй понравившиеся товары и следи за заказами.</p></div><div className="auth-aside-visual"><Image src="/products/phone.jpg" alt="Смартфон Samsung Galaxy A36 5G" width={700} height={360} priority /></div></aside>
      <section className="auth-panel"><h1>Создать аккаунт</h1><p>Заполни несколько полей — и всё готово.</p><AuthForm mode="register" /><p className="auth-switch">Уже есть аккаунт? <Link href="/account/sign-in">Войти</Link></p></section>
    </div>
  </main>;
}
