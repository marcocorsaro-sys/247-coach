// Classifica completa di un'edizione (segmento "athletes"). Il codice è in components/site/AthletePages.
import type { Metadata } from "next";
import { EditionPage, editionMetadata } from "@/components/site/AthletePages";

type Props = { params: Promise<{ lang: string; slug: string; edition: string }>; searchParams: Promise<Record<string, string | undefined>> };
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> { const p = await params; return editionMetadata(p.lang, p.slug, p.edition, await searchParams); }
export default async function Page({ params, searchParams }: Props) {
  const p = await params;
  return <EditionPage lang={p.lang} seg="athletes" seg0={p.slug} id={p.edition} sp={await searchParams} />;
}
