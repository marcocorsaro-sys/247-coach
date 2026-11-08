import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ViewAsGlobal from "@/components/ViewAsGlobal";
import { APP_TITLE, APP_DESCRIPTION, IS_AI_APP } from "@/lib/branding";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? (IS_AI_APP ? "https://247coachai.com" : "https://irene-coletto-tabella.vercel.app");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  openGraph: { siteName: IS_AI_APP ? "24/7 Coach" : "Tabella", locale: "it_IT", type: "website" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
        {IS_AI_APP ? (
          // Tema 24/7 Coach: Barlow + Barlow Condensed (pettorale / cartelli di gara)
          <link
            href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Barlow+Condensed:wght@600;700;800;900&display=swap"
            rel="stylesheet"
          />
        ) : null}
        {!IS_AI_APP ? (
          // Font del sito irenecolettocoaching.com (tema "Irene")
          <link
            href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Jost:wght@300;400;500;600;700&family=DM+Mono&display=swap"
            rel="stylesheet"
          />
        ) : null}
      </head>
      <body className={IS_AI_APP ? "theme-247" : "theme-irene"}>
        {children}
        <ViewAsGlobal />
        {IS_AI_APP ? (
          // DataFast analytics: solo 247coachai.com (non la tabella di Irene).
          <Script
            src="https://datafa.st/js/script.js"
            data-website-id="dfid_Eu8S4LdzoHuFWuGIwxsru"
            data-domain="247coachai.com"
            strategy="afterInteractive"
          />
        ) : null}
      </body>
    </html>
  );
}
