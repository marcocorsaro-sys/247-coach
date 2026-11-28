// Scheda atleta, confronto e rimozione (segmento "atleti"). Il codice è in components/site/AthletePages.
import type { Metadata } from "next";
import { SlugPage, slugMetadata } from "@/components/site/AthletePages";

type Props = { params: Promise<{ lang: string; slug: string }>; searchParams: Promise<Record<string, string | undefined>> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> { const p = await params; return slugMetadata(p.lang, p.slug, await searchParams); }
export default async function Page({ params, searchParams }: Props) {
  const p = await params;
  return <SlugPage lang={p.lang} seg="atleti" slug={p.slug} sp={await searchParams} />;
}
