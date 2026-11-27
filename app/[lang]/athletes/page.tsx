// Atleti: ricerca per nome (segmento "athletes"). Il codice è in components/site/AthletePages.
import type { Metadata } from "next";
import { HubPage, hubMetadata } from "@/components/site/AthletePages";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ race?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { return hubMetadata((await params).lang); }
export default async function Page({ params, searchParams }: Props) {
  return <HubPage lang={(await params).lang} seg="athletes" race={(await searchParams).race} />;
}
