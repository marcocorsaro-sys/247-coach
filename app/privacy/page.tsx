import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import { PRIVACY } from "@/lib/legal/content";

export const metadata: Metadata = { title: "privacy · 24/7 Coach", robots: { index: true, follow: true } };

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const l = lang === "en" ? "en" : "it";
  return <LegalPage doc={PRIVACY[l]} lang={l} base="/privacy" other={l === "en" ? "it" : "en"} />;
}
