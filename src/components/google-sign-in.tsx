"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore, type StoreUser } from "@/components/store-provider";

type GoogleCredentialResponse = { credential: string };

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select: false;
          }) => void;
          renderButton: (element: HTMLElement, options: {
            theme: "outline";
            size: "large";
            text: "continue_with";
            shape: "rectangular";
            width: number;
            locale: "ru";
          }) => void;
        };
      };
    };
  }
}

const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function getSafeNextPath() {
  const requested = new URLSearchParams(window.location.search).get("next");
  return requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/account/profile";
}

export function GoogleSignInButton({ onMessage }: { onMessage: (message: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const { setAuthenticatedUser } = useStore();
  const router = useRouter();

  useEffect(() => {
    const container = containerRef.current;
    if (!clientId || !scriptLoaded || !container || !window.google) return;

    window.google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,
      callback: async ({ credential }) => {
        setLoading(true);
        onMessage("");
        try {
          const response = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential }),
          });
          const result: { user?: StoreUser; error?: string } = await response.json();
          if (!response.ok || !result.user) throw new Error(result.error || "Не удалось войти через Google.");
          setAuthenticatedUser(result.user);
          router.replace(getSafeNextPath());
        } catch (error) {
          onMessage(error instanceof Error ? error.message : "Не удалось войти через Google.");
        } finally {
          setLoading(false);
        }
      },
    });

    container.replaceChildren();
    window.google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: Math.min(360, Math.floor(container.clientWidth)),
      locale: "ru",
    });
  }, [onMessage, router, scriptLoaded, setAuthenticatedUser]);

  if (!clientId) {
    return <div className="google-sign-in-unconfigured">
      <button className="button button-outline button-wide" type="button" disabled>Продолжить с Google</button>
      <small>Google-вход появится после настройки OAuth Client ID.</small>
    </div>;
  }

  return <>
    <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptLoaded(true)} onError={() => onMessage("Не удалось загрузить окно входа Google.")} />
    <div className={"google-sign-in" + (loading ? " is-loading" : "")} ref={containerRef} aria-label="Войти с помощью Google" />
  </>;
}
