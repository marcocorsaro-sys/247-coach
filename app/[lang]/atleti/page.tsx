// Atleti: ricerca per nome (segmento "atleti"). Il codice è in components/site/AthletePages.
import type { Metadata } from "next";
import { HubPage, hubMetadata } from "@/components/site/AthletePages";

type Props = { params: Promise<{ lang: string }>; searchParams: Promise<{ race?: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> { return hubMetadata((await params).lang); }
export default async function Page({ params, searchParams }: Props) {
  return <HubPage lang={(await params).lang} seg="atleti" race={(await searchParams).race} />;
}
