"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, SignOut, X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ProfileAvatar } from "@/components/profile-avatar";
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
  const [avatarOpen, setAvatarOpen] = useState(false);
  const closeAvatarButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!avatarOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeAvatarButtonRef.current?.focus();

    function handleModalKeys(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAvatarOpen(false);
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeAvatarButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", handleModalKeys);
    return () => {
      document.removeEventListener("keydown", handleModalKeys);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [avatarOpen]);

  if (!user) return null;
  const hasAvatar = Boolean(user.avatarKey || user.avatarUrl);

  return <>
    <div className="profile-summary">
      {hasAvatar ? (
        <button
          className="profile-avatar-trigger"
          type="button"
          aria-label={`Увеличить фото профиля: ${user.name}`}
          onClick={() => setAvatarOpen(true)}
        >
          <ProfileAvatar name={user.name} avatarKey={user.avatarKey} avatarUrl={user.avatarUrl} />
        </button>
      ) : <ProfileAvatar name={user.name} />}
      <div><strong>{user.name}</strong><p>{user.email}</p></div>
      <button className="button button-outline sign-out-button" type="button" onClick={() => { signOut(); router.replace("/account/sign-in"); }}>
        <SignOut size={17} />Выйти
      </button>
    </div>
    <p className="auth-switch account-security-note"><ArrowRight size={15} />Личные разделы доступны после входа в аккаунт.</p>
    {avatarOpen && hasAvatar && typeof document !== "undefined" && createPortal(
      <div
        className="avatar-lightbox"
        role="presentation"
        onClick={(event) => {
          if (event.target === event.currentTarget) setAvatarOpen(false);
        }}
      >
        <section className="avatar-lightbox-dialog" role="dialog" aria-modal="true" aria-label={`Фото профиля: ${user.name}`}>
          <button
            className="avatar-lightbox-close"
            type="button"
            aria-label="Закрыть фото профиля"
            onClick={() => setAvatarOpen(false)}
            ref={closeAvatarButtonRef}
          >
            <X size={21} aria-hidden="true" />
          </button>
          <ProfileAvatar
            name={user.name}
            avatarKey={user.avatarKey}
            avatarUrl={user.avatarUrl}
            size={640}
            responsive
            className="avatar-lightbox-image"
          />
        </section>
      </div>,
      document.body,
    )}
  </>;
}

export function ProtectedAccountLink({ href, children }: { href: string; children: React.ReactNode }) {
  const { user } = useStore();
  const target = user ? href : "/account/sign-in?next=" + encodeURIComponent(href);
  return <Link href={target}>{children}</Link>;
}
