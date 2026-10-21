"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, SignOut, UserCircle } from "@phosphor-icons/react";
import { useEffect, useSyncExternalStore } from "react";
import { useStore } from "@/components/store-provider";

const subscribeHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function AccountGate({ children }: { children: React.ReactNode }) {
  const { user } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const ready = useSyncExternalStore(subscribeHydration, getClientSnapshot, getServerSnapshot);

  useEffect(() => {
    if (!ready || user) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem("electromarket-user") ?? "null") as { name?: unknown; email?: unknown } | null;
      if (typeof stored?.name === "string" && typeof stored.email === "string") return;
    } catch {
      // An invalid local session is treated as signed out.
    }
    router.replace("/account/sign-in?next=" + encodeURIComponent(pathname));
  }, [pathname, ready, router, user]);

  if (!ready) return <main className="page-wrap page-main"><p className="auth-loading" role="status">Проверяем вход…</p></main>;
  if (!user) return <main className="page-wrap page-main"><p className="auth-loading" role="status">Перенаправляем ко входу…</p></main>;
  return children;
}

export function ProfileIdentity() {
  const { user, signOut } = useStore();
  const router = useRouter();
  if (!user) return null;
  const initials = user.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toLocaleUpperCase("ru");

  return <>
    <div className="profile-summary">
      <span className="avatar-placeholder" aria-label={"Профиль " + user.name}>{initials || <UserCircle size={25} />}</span>
      <div><strong>{user.name}</strong><p>{user.email}</p></div>
      <button className="button button-outline sign-out-button" type="button" onClick={() => { signOut(); router.replace("/account/sign-in"); }}>
        <SignOut size={17} />Выйти
      </button>
    </div>
    <p className="auth-switch account-security-note"><ArrowRight size={15} />Личные разделы доступны после входа в аккаунт.</p>
  </>;
}

export function ProtectedAccountLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { user } = useStore();
  const target = user ? href : "/account/sign-in?next=" + encodeURIComponent(href);
  return <Link href={target}>{children}</Link>;
}
