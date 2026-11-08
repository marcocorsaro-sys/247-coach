import type { Metadata } from "next";
import LegalPage from "@/components/site/LegalPage";
import { TERMS } from "@/lib/legal/content";

export const metadata: Metadata = { title: "terms · 24/7 Coach", robots: { index: true, follow: true } };

export default async function Page({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const { lang } = await searchParams;
  const l = lang === "en" ? "en" : "it";
  return <LegalPage doc={TERMS[l]} lang={l} base="/terms" other={l === "en" ? "it" : "en"} />;
}
