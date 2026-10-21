"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowsLeftRight,
  Basket,
  CheckCircle,
  DotsThree,
  Heart,
  House,
  LinkSimple,
  MagnifyingGlass,
  Package,
  SquaresFour,
  TelegramLogo,
  WarningCircle,
} from "@phosphor-icons/react";
import { useStore } from "@/components/store-provider";

type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
};

type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: { user?: TelegramWebAppUser };
  colorScheme?: "light" | "dark";
  ready?: () => void;
  expand?: () => void;
  BackButton?: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

type VerifiedTgProfile = {
  id: string;
  firstName: string;
  lastName?: string;
  username?: string;
};

const TG_MODE_STORAGE_KEY = "electromarket-tg-miniapp";
const TG_INIT_DATA_KEY = "electromarket-tg-initdata";

function buildDevPreviewInitData() {
  const params = new URLSearchParams();
  params.set("auth_date", String(Math.floor(Date.now() / 1000)));
  params.set("query_id", "AAHdF6IQAAAAAN0XohDhrOrc");
  params.set(
    "user",
    JSON.stringify({
      id: 704512908,
      first_name: "Сардор",
      last_name: "Каримов",
      username: "sardor_uz",
    }),
  );
  params.set("hash", "dev_local_preview");
  return params.toString();
}

function TelegramMiniAppInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cartCount, compareIds, favorites, user, setAuthenticatedUser } = useStore();

  const [isMiniApp, setIsMiniApp] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [initDataRaw, setInitDataRaw] = useState("");
  const [tgUser, setTgUser] = useState<VerifiedTgProfile | null>(null);
  const [authState, setAuthState] = useState<"idle" | "checking" | "verified" | "error">("idle");
  const [authError, setAuthError] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkEmail, setLinkEmail] = useState("");
  const [linkConfirm, setLinkConfirm] = useState(false);
  const [linkSubmitting, setLinkSubmitting] = useState(false);
  const [linkStatus, setLinkStatus] = useState("");

  const verifyWithServer = useCallback(
    async (rawInitData: string) => {
      setAuthState("checking");
      setAuthError("");
      try {
        const response = await fetch("/api/telegram/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: rawInitData }),
        });

        const payload = (await response.json()) as {
          verified?: boolean;
          message?: string;
          telegramUser?: VerifiedTgProfile;
          linkedAccount?: { name: string; email: string } | null;
        };

        if (!response.ok || !payload.verified || !payload.telegramUser) {
          setAuthState("error");
          setAuthError(
            payload.message ?? "Не удалось подтвердить сессию Telegram на сервере.",
          );
          return;
        }

        setTgUser(payload.telegramUser);
        setAuthState("verified");

        if (payload.linkedAccount) {
          setAuthenticatedUser({
            name: payload.linkedAccount.name,
            email: payload.linkedAccount.email,
            telegramId: payload.telegramUser.id,
          });
        }
      } catch {
        setAuthState("error");
        setAuthError("Нет соединения с сервером магазина. Проверьте интернет и повторите попытку.");
      }
    },
    [setAuthenticatedUser],
  );

  useEffect(() => {
    const tgWebApp = window.Telegram?.WebApp;
    const hasTgObject = Boolean(tgWebApp?.initData);
    const urlTgParam = searchParams.get("tg") === "1" || pathname.startsWith("/tg");
    const savedTgMode = window.sessionStorage.getItem(TG_MODE_STORAGE_KEY) === "1";

    if (!hasTgObject && !urlTgParam && !savedTgMode) {
      return;
    }

    window.sessionStorage.setItem(TG_MODE_STORAGE_KEY, "1");
    document.documentElement.setAttribute("data-tg-miniapp", "true");

    tgWebApp?.ready?.();
    tgWebApp?.expand?.();

    const storedInitData = window.sessionStorage.getItem(TG_INIT_DATA_KEY) ?? "";
    const resolvedInitData =
      tgWebApp?.initData || storedInitData || buildDevPreviewInitData();

    window.sessionStorage.setItem(TG_INIT_DATA_KEY, resolvedInitData);
    const miniAppStateTimer = window.setTimeout(() => {
      setIsMiniApp(true);
      setInitDataRaw(resolvedInitData);
      void verifyWithServer(resolvedInitData);
    }, 0);

    return () => window.clearTimeout(miniAppStateTimer);
  }, [pathname, searchParams, verifyWithServer]);

  useEffect(() => {
    if (!isMiniApp) return;
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (!backButton) return;

    const handleBack = () => {
      router.back();
    };

    if (pathname === "/" || pathname === "/tg") {
      backButton.hide();
    } else {
      backButton.show();
      backButton.onClick(handleBack);
    }

    return () => {
      backButton.offClick(handleBack);
    };
  }, [isMiniApp, pathname, router]);

  useEffect(() => {
    if (!moreOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMoreOpen(false);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [moreOpen]);

  async function handleAccountLink(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initDataRaw) return;

    setLinkSubmitting(true);
    setLinkStatus("");

    try {
      const response = await fetch("/api/telegram/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          initData: initDataRaw,
          email: linkEmail,
          name: tgUser ? [tgUser.firstName, tgUser.lastName].filter(Boolean).join(" ") : undefined,
          confirmLink: linkConfirm,
        }),
      });

      const data = (await response.json()) as {
        linked?: boolean;
        message?: string;
        account?: { name: string; email: string };
      };

      if (!response.ok || !data.linked || !data.account) {
        setLinkStatus(data.message ?? "Не удалось связать аккаунт. Проверьте данные.");
        setLinkSubmitting(false);
        return;
      }

      setAuthenticatedUser({
        name: data.account.name,
        email: data.account.email,
        ...(tgUser ? { telegramId: tgUser.id } : {}),
      });
      setLinkStatus("Аккаунт магазина связан с Telegram. Корзина и заказы синхронизированы.");
      setLinkOpen(false);
    } catch {
      setLinkStatus("Ошибка сети при связывании аккаунта. Попробуйте ещё раз.");
    } finally {
      setLinkSubmitting(false);
    }
  }

  if (!isMiniApp) return null;

  const isRootView = pathname === "/" || pathname === "/tg";

  return (
    <>
      <div className="tg-mini-topbar" role="region" aria-label="Панель Telegram Mini App">
        <div className="page-wrap tg-mini-topbar-inner">
          <div className="tg-mini-left">
            {!isRootView && (
              <button
                type="button"
                className="tg-back-btn"
                onClick={() => router.back()}
                aria-label="Назад"
              >
                <ArrowLeft size={16} weight="bold" />
                <span>Назад</span>
              </button>
            )}
            <span className="tg-badge">
              <TelegramLogo size={15} weight="fill" />
              Mini App
            </span>
          </div>

          <div className="tg-mini-right">
            {authState === "checking" && (
              <span className="tg-status-pill" role="status">
                Проверка подписи Telegram…
              </span>
            )}
            {authState === "error" && (
              <span className="tg-status-pill is-error" role="alert">
                <WarningCircle size={14} weight="fill" />
                {authError}
                <button
                  type="button"
                  className="tg-retry-btn"
                  onClick={() => void verifyWithServer(initDataRaw)}
                >
                  Повторить
                </button>
              </span>
            )}
            {authState === "verified" && tgUser && (
              <div className="tg-user-controls">
                <span className="tg-verified-user">
                  <CheckCircle size={14} weight="fill" />
                  {tgUser.firstName}
                  {tgUser.username ? ` (@${tgUser.username})` : ""}
                </span>
                {user ? (
                  <Link href="/account/profile" className="tg-link-trigger is-linked">
                    <span className="tg-link-label-full">Связано: {user.email}</span>
                    <span className="tg-link-label-mobile">Аккаунт связан</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="tg-link-trigger"
                    onClick={() => {
                      setLinkEmail("");
                      setLinkConfirm(false);
                      setLinkStatus("");
                      setLinkOpen((prev) => !prev);
                    }}
                  >
                    <LinkSimple size={14} weight="bold" />
                    <span className="tg-link-label-full">Связать с аккаунтом магазина</span>
                    <span className="tg-link-label-mobile">Связать</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {linkOpen && (
          <div className="page-wrap tg-link-drawer">
            <form className="tg-link-form" onSubmit={handleAccountLink}>
              <div>
                <strong>Привязка Telegram к аккаунту ЭлектроМаркет</strong>
                <p>
                  Укажите email вашего аккаунта в магазине. Связь создаётся только после вашего
                  подтверждения и объединит корзину и историю заказов.
                </p>
              </div>
              <div className="tg-link-fields">
                <label>
                  Email аккаунта магазина
                  <input
                    type="email"
                    name="email"
                    required
                    value={linkEmail}
                    onChange={(event) => setLinkEmail(event.target.value)}
                    placeholder="name@example.com"
                  />
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={linkConfirm}
                    onChange={(event) => setLinkConfirm(event.target.checked)}
                    required
                  />
                  <span>Подтверждаю связывание моего Telegram ID с этим аккаунтом магазина</span>
                </label>
                <div className="tg-link-actions">
                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={linkSubmitting}
                  >
                    {linkSubmitting ? "Сохраняем…" : "Подтвердить связь"}
                  </button>
                  <button
                    type="button"
                    className="button button-outline"
                    onClick={() => setLinkOpen(false)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
              {linkStatus && (
                <p className="form-message" role="status">
                  {linkStatus}
                </p>
              )}
            </form>
          </div>
        )}
      </div>

      {moreOpen && (
        <div className="tg-more-layer">
          <button
            type="button"
            className="tg-more-backdrop"
            aria-label="Закрыть меню"
            onClick={() => setMoreOpen(false)}
          />
          <div
            id="tg-more-menu"
            className="tg-more-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Другие разделы"
          >
            <strong>Другие разделы</strong>
            <Link href="/search" onClick={() => setMoreOpen(false)}>
              <span className="tg-more-icon"><MagnifyingGlass size={20} /></span>
              <span><b>Поиск</b><small>Найти товар или бренд</small></span>
            </Link>
            <Link href="/favorites" onClick={() => setMoreOpen(false)}>
              <span className="tg-more-icon"><Heart size={20} weight={favorites.length ? "fill" : "regular"} /></span>
              <span><b>Избранное</b><small>Сохранённые товары</small></span>
              {favorites.length > 0 && <em>{favorites.length}</em>}
            </Link>
            <Link href="/compare" onClick={() => setMoreOpen(false)}>
              <span className="tg-more-icon"><ArrowsLeftRight size={20} /></span>
              <span><b>Сравнение</b><small>Сопоставить характеристики</small></span>
              {compareIds.length > 0 && <em>{compareIds.length}</em>}
            </Link>
          </div>
        </div>
      )}

      <nav className="tg-bottom-bar" aria-label="Навигация Mini App">
        <Link
          href="/tg"
          className={`tg-tab-item ${pathname === "/tg" || pathname === "/" ? "is-active" : ""}`}
        >
          <House size={20} weight={pathname === "/tg" || pathname === "/" ? "fill" : "regular"} />
          <span>Витрина</span>
        </Link>
        <Link
          href="/catalog"
          className={`tg-tab-item ${pathname.startsWith("/catalog") ? "is-active" : ""}`}
        >
          <SquaresFour
            size={20}
            weight={pathname.startsWith("/catalog") ? "fill" : "regular"}
          />
          <span>Каталог</span>
        </Link>
        <button
          type="button"
          className={`tg-tab-item tg-more-trigger ${
            moreOpen ||
            pathname.startsWith("/search") ||
            pathname.startsWith("/favorites") ||
            pathname.startsWith("/compare")
              ? "is-active"
              : ""
          }`}
          aria-expanded={moreOpen}
          aria-controls="tg-more-menu"
          onClick={() => setMoreOpen((open) => !open)}
        >
          <DotsThree size={20} weight="bold" />
          <span>Ещё</span>
        </button>
        <Link
          href="/cart"
          className={`tg-tab-item tg-tab-cart ${
            pathname.startsWith("/cart") || pathname.startsWith("/checkout") ? "is-active" : ""
          }`}
        >
          <Basket
            size={20}
            weight={
              pathname.startsWith("/cart") || pathname.startsWith("/checkout")
                ? "fill"
                : "regular"
            }
          />
          <span>Корзина</span>
          {cartCount > 0 && <b>{cartCount}</b>}
        </Link>
        <Link
          href="/account/orders"
          className={`tg-tab-item ${pathname.startsWith("/account") ? "is-active" : ""}`}
        >
          <Package size={20} weight={pathname.startsWith("/account") ? "fill" : "regular"} />
          <span>Заказы</span>
        </Link>
      </nav>
    </>
  );
}

export function TelegramMiniAppShell() {
  return (
    <Suspense fallback={null}>
      <TelegramMiniAppInner />
    </Suspense>
  );
}
