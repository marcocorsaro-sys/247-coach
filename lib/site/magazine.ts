// ============================================================================
// Magazine 24/7 Coach. Tre tipi di pezzo:
//  - preview: anteprima di una gara in arrivo (scheda + articoli + Instagram recente)
//  - recap:   il giorno dopo la gara; podio e vincitori AG da risultati ufficiali
//             (CoachCox imstats) renderizzati in tabella DETERMINISTICA, il testo
//             lo scrive Claude solo da quei dati + didascalie IG pubbliche.
//  - feature: speciale libero (es. recap Kona) da brief.
// Nessuna frase virgolettata attribuita a persone: si parafrasa e si cita.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured, TRANSLATE_MODEL } from "@/lib/ai/claude";
import { LANG_NAME, type Lang } from "@/lib/i18n/config";
import { raceSeg, type Race } from "@/lib/site/races";

export type MagKind = "preview" | "recap" | "feature";
export interface MagPost {
  id: string; slug: string; kind: MagKind; race_id: string | null; week_start: string; title: string; dek: string | null; body_md: string;
  data: MagData; source_urls: string[]; reading_min: number | null; published: boolean; published_at: string | null;
}
export interface Finisher { name: string; country?: string; div: string; time: string; pos?: number }
export interface MagData {
  results?: { source: string; url: string; starters: number; finishers: number; dnf: number; overall: { M: Finisher[]; F: Finisher[] }; ag: Finisher[] };
  ig?: { handle: string; url: string; caption: string; likes?: number }[];
  race_slug?: string; race_seg?: string; race_name?: string; race_date?: string;
}

const mondayOf = (d: Date) => { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.toISOString().slice(0, 10); };
const hms = (s: number) => `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["title", "dek", "body_md", "reading_min"],
  properties: { title: { type: "string" }, dek: { type: "string", description: "sottotitolo di una frase" }, body_md: { type: "string", description: "markdown con ## sezioni; 350-650 parole" }, reading_min: { type: "integer" } },
} as const;

const SYSTEM = `Sei il caporedattore del magazine di 24/7 Coach, testata indipendente di triathlon long distance. Scrivi in italiano per atleti age-group: tono diretto, giornalistico, frasi corte, numeri quando ci sono. Non sei affiliato a organizzatori o marchi: i nomi delle gare sono descrittivi.
Regole ferree:
- Usa SOLO i dati forniti (scheda, risultati, post Instagram). Nulla di inventato: niente meteo, ritiri, record, nomi o storie non presenti nei dati. Se un dato manca, scrivilo o salta il punto.
- Nessuna citazione virgolettata di persone: parafrasa e indica sempre l'autore del post come @handle.
- I post Instagram sono contenuti di terzi: raccontali ("diversi atleti raccontano su Instagram…"), non copiarli.
- Ogni pezzo chiude con un "Cosa porti a casa" di 2-3 punti pratici per chi corre quella gara.`;

async function fetchIg(admin: SupabaseClient, raceId: string, from?: string, to?: string) {
  let q = admin.from("event_race_media").select("author_handle,url,caption,likes,taken_at").eq("race_id", raceId).eq("platform", "instagram").not("caption", "is", null);
  if (from) q = q.gte("taken_at", from);
  if (to) q = q.lte("taken_at", to);
  const { data } = await q.order("likes", { ascending: false, nullsFirst: false }).limit(12);
  return ((data ?? []) as { author_handle: string | null; url: string; caption: string; likes: number | null }[]).filter((m) => m.author_handle).map((m) => ({ handle: m.author_handle as string, url: m.url, caption: m.caption.slice(0, 400), likes: m.likes ?? undefined }));
}

async function save(admin: SupabaseClient, p: { slug: string; kind: MagKind; race_id: string | null; week_start: string; out: { title: string; dek: string; body_md: string; reading_min: number }; data: MagData; publish: boolean }) {
  const row = { slug: p.slug, kind: p.kind, race_id: p.race_id, week_start: p.week_start, title: p.out.title, dek: p.out.dek, body_md: p.out.body_md, reading_min: p.out.reading_min, data: p.data, published: p.publish, published_at: p.publish ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
  const { error } = await admin.from("site_magazine_posts").upsert(row, { onConflict: "slug" });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, slug: p.slug };
}

export async function generatePreview(admin: SupabaseClient, race: Race, opts: { publish: boolean; today?: Date }) {
  const today = opts.today ?? new Date();
  const days = race.race_date ? Math.round((Date.parse(race.race_date) - today.getTime()) / 864e5) : null;
  const ig = await fetchIg(admin, race.id);
  const { data: arts } = await admin.from("event_race_articles").select("topic,title,dek").eq("race_id", race.id).eq("published", true);
  const scheda = { nome: race.name, luogo: [race.city, race.country].filter(Boolean).join(", "), data: race.race_date, giorni_alla_gara: days, data_confermata: race.date_confirmed, distanza: race.distance, acqua: race.water_type, bici_km: race.bike_km, bici_dplus_m: race.bike_dplus_m, corsa_piatta: race.run_flat, kpis: race.kpis, richieste_del_percorso: race.demands, consigli: race.tips, articoli_sul_sito: arts };
  const prompt = `ANTEPRIMA DELLA SETTIMANA. Scrivi l'anteprima di questa gara per il magazine (taglio: cosa la rende speciale, cosa decide la gara, cosa raccontano gli atleti che la fanno, countdown).\n\nSCHEDA:\n${JSON.stringify(scheda, null, 1)}\n\nPOST INSTAGRAM PUBBLICI RECENTI (${ig.length}):\n${ig.map((m) => `@${m.handle}: ${m.caption}`).join("\n") || "(nessuno disponibile: non citare Instagram)"}`;
  const r = await generateStructured<{ title: string; dek: string; body_md: string; reading_min: number }>({ system: SYSTEM, prompt, schema: SCHEMA as unknown as Record<string, unknown>, effort: "medium", maxTokens: 8000 });
  if (!r.ok || !r.data) return { ok: false as const, error: r.error ?? "generazione fallita" };
  const wk = mondayOf(today);
  return save(admin, { slug: `anteprima-${race.slug}-${wk}`, kind: "preview", race_id: race.id, week_start: wk, out: r.data, data: { ig: ig.slice(0, 6), race_slug: race.slug, race_seg: raceSeg(race), race_name: race.name, race_date: race.race_date ?? undefined }, publish: opts.publish });
}

interface CcRow { n: string; c?: string; g?: string; di?: string; fs?: string; ot?: number | string }
export const COACHCOX = (id: number | string) => `https://www.coachcox.co.uk/wp-json/imstats/v1.92/race/results/${id}`;

export async function loadResults(resultsId: number): Promise<NonNullable<MagData["results"]> | null> {
  const res = await fetch(COACHCOX(resultsId), { headers: { "user-agent": "Mozilla/5.0 247coach-magazine" } });
  if (!res.ok) return null;
  const j = (await res.json()) as CcRow[] | { data?: CcRow[] };
  const rows: CcRow[] = Array.isArray(j) ? j : (j.data ?? []);
  if (!rows.length) return null;
  const t = (x: CcRow) => Number(x.ot);
  const fin = rows.filter((x) => x.fs === "FIN" && t(x) > 0);
  const toF = (x: CcRow, pos?: number): Finisher => ({ name: x.n, country: x.c, div: x.di ?? "", time: hms(t(x)), pos });
  const pro = (g: "M" | "F") => fin.filter((x) => x.di === `${g}PRO`).sort((a, b) => t(a) - t(b)).slice(0, 3).map((x, i) => toF(x, i + 1));
  const ag = fin.filter((x) => x.di && /^[MF]\d\d/.test(x.di));
  const by = new Map<string, CcRow>();
  for (const x of ag) { const c = by.get(x.di as string); if (!c || t(x) < t(c)) by.set(x.di as string, x); }
  const winners = [...by.values()].sort((a, b) => (a.di as string).localeCompare(b.di as string)).map((x) => toF(x));
  const overall = (g: "M" | "F") => { const p = pro(g); return p.length ? p : fin.filter((x) => x.di?.[0] === g).sort((a, b) => t(a) - t(b)).slice(0, 3).map((x, i) => toF(x, i + 1)); };
  const starters = rows.filter((x) => x.fs !== "DNS").length;
  return { source: "CoachCox imstats (tempi ufficiali)", url: COACHCOX(resultsId), starters, finishers: fin.length, dnf: rows.filter((x) => x.fs === "DNF").length, overall: { M: overall("M"), F: overall("F") }, ag: winners };
}

export async function generateRecap(admin: SupabaseClient, race: Race, resultsId: number, opts: { publish: boolean; today?: Date }) {
  const results = await loadResults(resultsId);
  if (!results) return { ok: false as const, error: "risultati non disponibili" };
  const d = race.race_date ?? new Date().toISOString().slice(0, 10);
  const to = new Date(Date.parse(d) + 4 * 864e5).toISOString();
  const ig = await fetchIg(admin, race.id, new Date(Date.parse(d) - 864e5).toISOString(), to);
  const scheda = { nome: race.name, luogo: [race.city, race.country].filter(Boolean).join(", "), data: d, bici_km: race.bike_km, bici_dplus_m: race.bike_dplus_m };
  const prompt = `RECAP POST-GARA. Racconta com'è andata la gara in base ai soli risultati ufficiali e ai post pubblici sotto. La tabella di podio e vincitori per categoria è già mostrata dal sito sotto il testo: non ripeterla tutta, commenta (chi ha vinto, tempi, distacchi se calcolabili, partiti/arrivati/ritirati, categorie più veloci) e racconta cosa dicono gli atleti su Instagram.\n\nGARA: ${JSON.stringify(scheda)}\n\nRISULTATI: ${JSON.stringify({ partiti: results.starters, arrivati: results.finishers, ritirati: results.dnf, podio_M: results.overall.M, podio_F: results.overall.F, vincitori_per_categoria: results.ag })}\n\nPOST INSTAGRAM (${ig.length}):\n${ig.map((m) => `@${m.handle}: ${m.caption}`).join("\n") || "(nessuno disponibile: non citare Instagram)"}`;
  const r = await generateStructured<{ title: string; dek: string; body_md: string; reading_min: number }>({ system: SYSTEM, prompt, schema: SCHEMA as unknown as Record<string, unknown>, effort: "medium", maxTokens: 8000 });
  if (!r.ok || !r.data) return { ok: false as const, error: r.error ?? "generazione fallita" };
  return save(admin, { slug: `recap-${race.slug}-${d}`, kind: "recap", race_id: race.id, week_start: mondayOf(new Date(d)), out: r.data, data: { results, ig: ig.slice(0, 6), race_slug: race.slug, race_seg: raceSeg(race), race_name: race.name, race_date: d }, publish: opts.publish });
}

export async function generateFeature(admin: SupabaseClient, brief: string, facts: string, opts: { publish: boolean; slug?: string; today?: Date }) {
  const r = await generateStructured<{ title: string; dek: string; body_md: string; reading_min: number }>({ system: SYSTEM, prompt: `SPECIALE. Brief: ${brief}\n\nDATI DISPONIBILI (unica fonte ammessa):\n${facts}`, schema: SCHEMA as unknown as Record<string, unknown>, effort: "medium", maxTokens: 8000 });
  if (!r.ok || !r.data) return { ok: false as const, error: r.error ?? "generazione fallita" };
  const now = opts.today ?? new Date();
  return save(admin, { slug: opts.slug ?? `speciale-${slugify(r.data.title)}`, kind: "feature", race_id: null, week_start: mondayOf(now), out: r.data, data: {}, publish: opts.publish });
}

export async function translateMagazine(admin: SupabaseClient, post: MagPost, lang: Lang) {
  const r = await generateStructured<{ title: string; dek: string; body_md: string }>({
    system: `Sei un traduttore madrelingua ${LANG_NAME[lang]} specializzato in triathlon. Traduci dall'italiano in modo naturale con il lessico degli atleti age-group locali; lascia invariati nomi di gare, luoghi, @handle, URL, numeri e tempi; mantieni il markdown; non aggiungere né togliere informazioni.`,
    prompt: JSON.stringify({ title: post.title, dek: post.dek ?? "", body_md: post.body_md }),
    schema: { type: "object", additionalProperties: false, required: ["title", "dek", "body_md"], properties: { title: { type: "string" }, dek: { type: "string" }, body_md: { type: "string" } } },
    effort: "medium", maxTokens: 12000, model: TRANSLATE_MODEL,
  });
  if (!r.ok || !r.data) return { lang, ok: false, error: r.error ?? "fallita" };
  const { error } = await admin.from("site_magazine_translations").upsert({ post_id: post.id, lang, title: r.data.title, dek: r.data.dek || null, body_md: r.data.body_md, updated_at: new Date().toISOString() }, { onConflict: "post_id,lang" });
  return { lang, ok: !error, error: error?.message };
}
