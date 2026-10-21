import type { Metadata } from "next";
import "@fontsource-variable/golos-text/wght.css";
import { SiteFooter, SiteHeader } from "@/components/site-shell";
import { StoreProvider } from "@/components/store-provider";
import { TelegramMiniAppShell } from "@/components/telegram-mini-app";
import "./globals.css";

export const metadata: Metadata = {
  title: "ЭлектроМаркет — техника для твоих планов",
  description: "ЭлектроМаркет — интернет-магазин электроники, гаджетов и техники для дома с удобной доставкой по Узбекистану.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" data-scroll-behavior="smooth">
    <body>
      <StoreProvider>
        <TelegramMiniAppShell />
        <SiteHeader />
        {children}
        <SiteFooter />
      </StoreProvider>
    </body>
  </html>;
}
