// Ricerca unica del sito: gare (per nome, città, paese) e atleti (per nome). ?q=…&lang=it
import { NextResponse } from "next/server";
import { isLang, type Lang } from "@/lib/i18n/config";
import { listRaces, racePath, raceTitle } from "@/lib/site/races";
import { athletePath, searchAthletes } from "@/lib/site/athletes";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  const l = url.searchParams.get("lang") ?? "en";
  const lang: Lang = isLang(l) ? l : "en";
  if (q.length < 2) return NextResponse.json({ races: [], athletes: [] });
  const words = norm(q).split(/\s+/).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  const [all, hits] = await Promise.all([listRaces(lang), searchAthletes(q, null, 8)]);
  const races = all
    .filter((r) => { const hay = norm([r.name, r.official_name, r.city, r.region, r.country, r.slug].filter(Boolean).join(" ")); return words.every((w) => hay.includes(w)); })
    .sort((a, b) => Number((a.race_date ?? "") < today) - Number((b.race_date ?? "") < today) || (a.race_date ?? "").localeCompare(b.race_date ?? ""))
    .slice(0, 6)
    .map((r) => ({ title: raceTitle(r), href: racePath(r, lang), date: r.race_date, place: [r.city, r.country].filter(Boolean).join(", ") }));
  const athletes = hits.map((h) => ({ name: h.name, country: h.country, races: h.races, best_full: h.best_full, best_half: h.best_half, href: athletePath(lang, h.slug) }));
  return NextResponse.json({ races, athletes }, { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600", "X-Robots-Tag": "noindex" } });
}
