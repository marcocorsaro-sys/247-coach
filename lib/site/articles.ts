// ============================================================================
// Generatore articoli per gara: Claude legge scheda + fonti indicizzate e
// scrive un articolo per tema (nuoto, bici, corsa, logistica, nutrizione,
// materiale, giorno di gara) con le fonti citate. Salvati come bozza
// (published=false) salvo ?publish=1. Niente frasi attribuite a persone reali:
// si parafrasa e si cita l'URL.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured } from "@/lib/ai/claude";
import type { Race, RaceSource } from "@/lib/site/races";

const TOPICS = ["swim", "bike", "run", "logistics", "nutrition", "gear", "raceday"] as const;
type Topic = (typeof TOPICS)[number];

interface ArticleOut {
  slug: string; topic: Topic; title: string; dek: string; body_md: string; reading_min: number; source_urls: string[];
}
interface Out { articles: ArticleOut[]; faq: { q: string; a: string }[] }

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["articles", "faq"],
  properties: {
    articles: {
      type: "array",
      items: {
        type: "object", additionalProperties: false,
        required: ["slug", "topic", "title", "dek", "body_md", "reading_min", "source_urls"],
        properties: {
          slug: { type: "string", description: "kebab-case, italiano, max 60 caratteri" },
          topic: { type: "string", enum: [...TOPICS] },
          title: { type: "string" },
          dek: { type: "string", description: "sottotitolo di una frase" },
          body_md: { type: "string", description: "markdown: ## sezioni, paragrafi, elenchi; 500-900 parole" },
          reading_min: { type: "integer" },
          source_urls: { type: "array", items: { type: "string" }, description: "URL delle fonti usate, solo tra quelle fornite" },
        },
      },
    },
    faq: { type: "array", items: { type: "object", additionalProperties: false, required: ["q", "a"], properties: { q: { type: "string" }, a: { type: "string" } } } },
  },
} as const;

const SYSTEM = `Sei il redattore di una guida indipendente alle gare di triathlon long distance, scritta in italiano per atleti age-group che stanno decidendo se iscriversi o che si stanno preparando. Tono: diretto, concreto, da atleta esperto che parla a un pari; frasi corte; numeri quando esistono. Non sei affiliato all'organizzatore: cita il nome della gara in modo descrittivo, mai come marchio proprio.
Regole:
- Usa SOLO le informazioni della scheda e delle fonti fornite. Dove le fonti divergono, dillo. Dove mancano dati, dichiara che l'informazione non è disponibile invece di inventare.
- Non attribuire frasi virgolettate a persone reali: parafrasa ("diversi race report segnalano…") e cita l'URL della fonte in source_urls.
- Niente consigli medici o di integrazione oltre il buon senso per atleti allenati.
- Ogni articolo deve dare a chi legge qualcosa da fare: una decisione, un test, una scelta di materiale, un piano B.`;

export async function generateRaceArticles(admin: SupabaseClient, race: Race, sources: RaceSource[], opts: { publish: boolean; topics?: Topic[] }) {
  const wanted = opts.topics?.length ? opts.topics : [...TOPICS];
  const srcList = sources.slice(0, 60).map((s, i) => `[${i + 1}] (${s.kind}${s.edition_year ? ` ${s.edition_year}` : ""}${s.lang ? ` ${s.lang}` : ""}) ${s.title ?? s.url}\n    URL: ${s.url}${s.author ? `\n    Autore: ${s.author}` : ""}${s.excerpt ? `\n    Estratto: ${s.excerpt}` : ""}`).join("\n");
  const scheda = JSON.stringify({
    nome: race.name, nome_ufficiale: race.official_name, luogo: [race.city, race.region, race.country].filter(Boolean).join(", "), data: race.race_date,
    distanza: race.distance, nuoto_km: race.swim_km, acqua: race.water_type, bici_km: race.bike_km, bici_dplus_m: race.bike_dplus_m, corsa_km: race.run_km, corsa_piatta: race.run_flat,
    intro: race.intro, kpis: race.kpis, frazioni: race.legs, split_per_livello: race.splits, richieste_del_percorso: race.demands, consigli: race.tips, logistica: race.logistics, faq: race.faq, versione_percorso: race.course_version,
  }, null, 1);
  const prompt = `GARA (scheda attuale):\n${scheda}\n\nFONTI INDICIZZATE (${sources.length}):\n${srcList || "(nessuna: scrivi solo da scheda e dichiara i limiti)"}\n\nCOMPITO: scrivi un articolo per ciascuno di questi temi: ${wanted.join(", ")}.
Significato dei temi: swim = la frazione di nuoto (acqua, partenza, muta, correnti, come prepararla); bike = la frazione bici (segmenti, pacing, discese, vento, rapporti); run = la maratona (percorso, caldo, ristori, pacing); logistics = arrivare, dormire, zona cambio, bici, famiglia, iscrizione e costi noti; nutrition = strategia alimentare e idrica per QUESTO percorso e clima; gear = scelte di materiale specifiche per questo percorso; raceday = cronologia del giorno di gara e dei giorni prima, errori tipici, piano B.
Poi aggiorna le FAQ: 6-10 domande che un iscritto fa davvero, con risposte brevi basate sulle fonti.`;

  const r = await generateStructured<Out>({ system: SYSTEM, prompt, schema: SCHEMA as unknown as Record<string, unknown>, effort: "high", maxTokens: 40000 });
  if (!r.ok || !r.data) return { ok: false as const, error: r.error ?? "generazione fallita", refusal: r.refusal };

  const byUrl = new Map(sources.map((s) => [s.url, s.id]));
  let saved = 0;
  for (const a of r.data.articles) {
    if (!wanted.includes(a.topic)) continue;
    const source_ids = a.source_urls.map((u) => byUrl.get(u)).filter((x): x is string => Boolean(x));
    const slug = a.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || a.topic;
    const row = { race_id: race.id, slug, topic: a.topic, title: a.title, dek: a.dek, body_md: a.body_md, source_ids, author_type: "ai", edition_year: race.race_date ? Number(race.race_date.slice(0, 4)) : null, reading_min: a.reading_min, published: opts.publish, updated_at: new Date().toISOString() };
    // Un articolo per tema: sostituisce l'eventuale precedente dello stesso tema.
    await admin.from("event_race_articles").delete().eq("race_id", race.id).eq("topic", a.topic);
    const { error } = await admin.from("event_race_articles").insert(row);
    if (error) return { ok: false as const, error: `articles: ${error.message}` };
    saved++;
  }
  if (r.data.faq?.length) {
    await admin.from("event_races").update({ faq: r.data.faq, updated_at: new Date().toISOString() }).eq("id", race.id);
  }
  return { ok: true as const, model: r.model, saved, faq: r.data.faq?.length ?? 0, published: opts.publish };
}
