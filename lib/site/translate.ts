// ============================================================================
// Traduzioni con Claude: dizionario UI (site_ui_i18n) e contenuti gara
// (event_race_translations, event_race_article_translations). Sorgente it
// per i contenuti, en per la UI. Nomi propri (gare, luoghi, marchi) invariati.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured, AI_MODEL } from "@/lib/ai/claude";
import { EN } from "@/lib/i18n/dict";
import { LANG_NAME, type Lang } from "@/lib/i18n/config";
import type { Race, RaceArticle, RaceReview, RaceSegment } from "@/lib/site/races";

const SYSTEM = (lang: Lang) => `Sei un traduttore madrelingua ${LANG_NAME[lang]} specializzato in triathlon e sport di endurance. Traduci in ${LANG_NAME[lang]} in modo naturale, con il lessico che usano gli atleti age-group di quel paese (termini tecnici come FTP, CTL, Z2, T1/T2, wetsuit/muta, split restano quelli in uso locale). Regole: mantieni invariati nomi di gare, luoghi, marchi, URL, numeri, unità e segnaposto tra graffe come {year} o {name}; mantieni la struttura markdown; non aggiungere né togliere informazioni; tono diretto, frasi corte.`;

const ENTRIES_SCHEMA = { type: "object", additionalProperties: false, required: ["entries"], properties: { entries: { type: "array", items: { type: "object", additionalProperties: false, required: ["k", "v"], properties: { k: { type: "string" }, v: { type: "string" } } } } } };

export async function translateUi(admin: SupabaseClient, lang: Lang) {
  const entries = Object.entries(EN);
  // blocchi da ~270 voci: un'unica richiesta supera il limite di token nelle lingue più verbose (tedesco, norvegese)
  const CH = 270, dict: Record<string, string> = {};
  for (let i = 0; i < entries.length; i += CH) {
    const part = entries.slice(i, i + CH);
    const prompt = `Traduci i valori (campo v) di queste voci di interfaccia di un sito di gare di triathlon. Restituisci TUTTE le ${part.length} chiavi, con la stessa k.\n\n${JSON.stringify(part.map(([k, v]) => ({ k, v })))}`;
    const r = await generateStructured<{ entries: { k: string; v: string }[] }>({ system: SYSTEM(lang), prompt, schema: ENTRIES_SCHEMA, effort: "medium", maxTokens: 30000 });
    if (!r.ok || !r.data) return { ok: false as const, lang, error: r.error ?? "traduzione fallita" };
    for (const e of r.data.entries) if (e.k in EN && e.v) dict[e.k] = e.v;
  }
  const { error } = await admin.from("site_ui_i18n").upsert({ lang, dict, model: AI_MODEL, updated_at: new Date().toISOString() });
  if (error) return { ok: false as const, lang, error: error.message };
  return { ok: true as const, lang, keys: Object.keys(dict).length, missing: entries.length - Object.keys(dict).length };
}

interface RaceOut {
  name: string; tagline: string; intro: string;
  kpis: { v: string; l: string }[]; legs: { swim: string[]; bike: string[]; run: string[] };
  splits: { goal: string }[]; demands: { t: string; b: string }[]; tips: { t: string; p: string }[]; logistics: { t: string; p: string }[]; faq: { q: string; a: string }[];
  segments: { position: number; leg: string; title: string; note: string }[];
  reviews: { id: string; title: string; body: string; sources_note: string }[];
}
const S = (props: Record<string, unknown>, req?: string[]) => ({ type: "object", additionalProperties: false, required: req ?? Object.keys(props), properties: props });
const A = (items: unknown) => ({ type: "array", items });
const RACE_SCHEMA = S({
  name: { type: "string" }, tagline: { type: "string" }, intro: { type: "string" },
  kpis: A(S({ v: { type: "string" }, l: { type: "string" } })),
  legs: S({ swim: A({ type: "string" }), bike: A({ type: "string" }), run: A({ type: "string" }) }),
  splits: A(S({ goal: { type: "string" } })),
  demands: A(S({ t: { type: "string" }, b: { type: "string" } })),
  tips: A(S({ t: { type: "string" }, p: { type: "string" } })),
  logistics: A(S({ t: { type: "string" }, p: { type: "string" } })),
  faq: A(S({ q: { type: "string" }, a: { type: "string" } })),
  segments: A(S({ position: { type: "integer" }, leg: { type: "string" }, title: { type: "string" }, note: { type: "string" } })),
  reviews: A(S({ id: { type: "string" }, title: { type: "string" }, body: { type: "string" }, sources_note: { type: "string" } })),
});

export async function translateRace(admin: SupabaseClient, race: Race, segments: RaceSegment[], reviews: RaceReview[], lang: Lang) {
  const src = {
    name: race.name, tagline: race.tagline ?? "", intro: race.intro ?? "",
    kpis: race.kpis ?? [], legs: { swim: race.legs?.swim?.bullets ?? [], bike: race.legs?.bike?.bullets ?? [], run: race.legs?.run?.bullets ?? [] },
    splits: (race.splits ?? []).map((s) => ({ goal: s.goal })), demands: race.demands ?? [], tips: race.tips ?? [], logistics: race.logistics ?? [], faq: race.faq ?? [],
    segments: segments.map((s) => ({ position: s.position, leg: s.leg, title: s.title, note: s.note ?? "" })),
    reviews: reviews.filter((r) => r.source === "synthesis").map((r) => ({ id: r.id, title: r.title ?? "", body: r.body ?? "", sources_note: r.sources_note ?? "" })),
  };
  const prompt = `Traduci dall'italiano la scheda di questa gara. Il campo "name" è il nome della città/gara: usa l'esonimo corrente nella lingua di destinazione (es. Nizza → Nice in inglese/francese, Nizza in tedesco; Copenaghen → Copenhagen/København...). Mantieni gli stessi array con lo stesso numero di elementi e lo stesso ordine; in "segments" e "reviews" ricopia position/leg/id invariati.\n\n${JSON.stringify(src)}`;
  const r = await generateStructured<RaceOut>({ system: SYSTEM(lang), prompt, schema: RACE_SCHEMA, effort: "medium", maxTokens: 20000 });
  if (!r.ok || !r.data) return { ok: false as const, lang, error: r.error ?? "traduzione fallita" };
  const d = r.data;
  const splits = (race.splits ?? []).map((s, i) => ({ ...s, goal: d.splits[i]?.goal ?? s.goal }));
  const row = {
    race_id: race.id, lang, name: d.name || race.name, tagline: d.tagline || null, intro: d.intro || null,
    kpis: d.kpis.length ? d.kpis : null,
    legs: race.legs ? { swim: { bullets: d.legs.swim }, bike: { bullets: d.legs.bike }, run: { bullets: d.legs.run } } : null,
    splits: race.splits ? splits : null, demands: d.demands.length ? d.demands : null, tips: d.tips.length ? d.tips : null,
    logistics: d.logistics.length ? d.logistics : null, faq: d.faq.length ? d.faq : null,
    segments: d.segments.length ? d.segments : null, reviews: d.reviews.length ? d.reviews : null,
    model: r.model ?? AI_MODEL, updated_at: new Date().toISOString(),
  };
  const { error } = await admin.from("event_race_translations").upsert(row, { onConflict: "race_id,lang" });
  if (error) return { ok: false as const, lang, error: error.message };
  return { ok: true as const, lang, name: row.name };
}

const ART_SCHEMA = S({ title: { type: "string" }, dek: { type: "string" }, body_md: { type: "string" } });

export async function translateArticles(admin: SupabaseClient, articles: RaceArticle[], lang: Lang) {
  let done = 0;
  const errors: string[] = [];
  for (const a of articles) {
    const r = await generateStructured<{ title: string; dek: string; body_md: string }>({
      system: SYSTEM(lang), prompt: `Traduci dall'italiano questo articolo (titolo, sottotitolo, corpo in markdown).\n\n${JSON.stringify({ title: a.title, dek: a.dek ?? "", body_md: a.body_md })}`,
      schema: ART_SCHEMA, effort: "medium", maxTokens: 12000,
    });
    if (!r.ok || !r.data) { errors.push(`${a.slug}: ${r.error ?? "fallita"}`); continue; }
    const { error } = await admin.from("event_race_article_translations").upsert({ article_id: a.id, lang, title: r.data.title, dek: r.data.dek || null, body_md: r.data.body_md, model: r.model ?? AI_MODEL, updated_at: new Date().toISOString() }, { onConflict: "article_id,lang" });
    if (error) errors.push(`${a.slug}: ${error.message}`); else done++;
  }
  return { lang, done, errors };
}

const PLACES_SCHEMA = { type: "object", additionalProperties: false, required: ["items"], properties: { items: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "title", "body"], properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" } } } } } };

export async function translatePlaces(admin: SupabaseClient, places: { id: string; title: string; body: string | null }[], lang: Lang) {
  if (!places.length) return { lang, done: 0, errors: [] as string[] };
  const r = await generateStructured<{ items: { id: string; title: string; body: string }[] }>({
    system: SYSTEM(lang),
    prompt: `Traduci dall'italiano titolo e testo di queste schede pratiche (alberghi, arrivo, dove vedere la gara, percorsi per allenarsi). Restituisci lo stesso id per ogni scheda.\n\n${JSON.stringify(places.map((p) => ({ id: p.id, title: p.title, body: p.body ?? "" })))}`,
    schema: PLACES_SCHEMA, effort: "medium", maxTokens: 16000,
  });
  if (!r.ok || !r.data) return { lang, done: 0, errors: [r.error ?? "fallita"] };
  const rows = r.data.items.filter((x) => places.some((p) => p.id === x.id)).map((x) => ({ place_id: x.id, lang, title: x.title, body: x.body || null }));
  const { error } = await admin.from("event_race_place_translations").upsert(rows, { onConflict: "place_id,lang" });
  return { lang, done: error ? 0 : rows.length, errors: error ? [error.message] : [] };
}
