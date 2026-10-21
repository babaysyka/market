import Link from "next/link";
import { ClipboardText, GearSix, House, Package, UserCircle } from "@phosphor-icons/react/dist/ssr";

const accountLinks = [
  { href: "/account/profile", label: "Обзор", icon: House },
  { href: "/account/settings", label: "Настройки", icon: GearSix },
  { href: "/account/orders", label: "Мои покупки", icon: Package },
];

export function AccountNav({ active }: { active: string }) {
  return <nav className="account-nav" aria-label="Личный кабинет">{accountLinks.map(({ href, label, icon: Icon }) => <Link className={active === href ? "is-active" : ""} href={href} key={href}><Icon size={19} />{label}</Link>)}</nav>;
}

export function AdminNav({ active }: { active: string }) {
  const links = [
    { href: "/admin", label: "Обзор", icon: ClipboardText },
    { href: "/admin/products", label: "Товары", icon: Package },
    { href: "/admin/orders", label: "Заказы", icon: UserCircle },
  ];
  return <nav className="account-nav" aria-label="Разделы панели администратора">{links.map(({ href, label, icon: Icon }) => <Link className={active === href ? "is-active" : ""} href={href} key={href}><Icon size={19} />{label}</Link>)}</nav>;
}
