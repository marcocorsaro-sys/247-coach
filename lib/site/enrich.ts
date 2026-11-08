// ============================================================================
// Arricchimento automatico di una scheda base: riceve i FATTI raccolti (pagina
// ufficiale + race report pubblici) e li trasforma nella scheda in italiano.
// Regola: solo ciò che è nei fatti; dove manca → null / omesso. Tutto marcato
// "scheda automatica" in course_version finché non viene rivista.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { generateStructured } from "@/lib/ai/claude";
import { upsertSources, type SourceRow } from "@/lib/site/admin";
import type { Race } from "@/lib/site/races";

const S = { type: "array", items: { type: "string" } } as const;
const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["region", "water_type", "bike_dplus_m", "run_flat", "heat_idx", "wind_idx", "fast_idx", "season", "tagline", "intro", "kpis", "legs", "splits", "demands", "tips", "logistics", "faq"],
  properties: {
    region: { type: ["string", "null"] },
    water_type: { type: "string", enum: ["mare", "lago", "fiume", "ignoto"] },
    bike_dplus_m: { type: ["integer", "null"], description: "solo se presente nei fatti, altrimenti null" },
    run_flat: { type: ["boolean", "null"] },
    heat_idx: { type: "integer", description: "0 fresco, 1 medio, 2 caldo/umido" },
    wind_idx: { type: "integer", description: "0..3" },
    fast_idx: { type: "integer", description: "0 lento/duro .. 3 velocissimo" },
    season: { type: "string", enum: ["prim", "est", "aut", "inv", "ignoto"] },
    tagline: { type: "string" },
    intro: { type: "string" },
    kpis: { type: "array", items: { type: "object", additionalProperties: false, required: ["v", "l"], properties: { v: { type: "string" }, l: { type: "string" } } } },
    legs: { type: "object", additionalProperties: false, required: ["swim", "bike", "run"], properties: { swim: { type: "object", additionalProperties: false, required: ["bullets"], properties: { bullets: S } }, bike: { type: "object", additionalProperties: false, required: ["bullets"], properties: { bullets: S } }, run: { type: "object", additionalProperties: false, required: ["bullets"], properties: { bullets: S } } } },
    splits: { type: "array", items: { type: "object", additionalProperties: false, required: ["goal", "swim", "bike", "run", "total"], properties: { goal: { type: "string" }, swim: { type: "string" }, bike: { type: "string" }, run: { type: "string" }, total: { type: "string" } } } },
    demands: { type: "array", items: { type: "object", additionalProperties: false, required: ["t", "b"], properties: { t: { type: "string" }, b: { type: "string" } } } },
    tips: { type: "array", items: { type: "object", additionalProperties: false, required: ["t", "p"], properties: { t: { type: "string" }, p: { type: "string" } } } },
    logistics: { type: "array", items: { type: "object", additionalProperties: false, required: ["t", "p"], properties: { t: { type: "string" }, p: { type: "string" } } } },
    faq: { type: "array", items: { type: "object", additionalProperties: false, required: ["q", "a"], properties: { q: { type: "string" }, a: { type: "string" } } } },
  },
} as const;

const SYSTEM = `Sei il redattore di una guida indipendente alle gare IRONMAN e 70.3 nel mondo, in italiano, per atleti age-group. Tono diretto, concreto, frasi corte. Non sei affiliato all'organizzatore.
Costruisci la scheda della gara usando ESCLUSIVAMENTE i FATTI forniti (pagina ufficiale e fonti pubbliche). Regole:
- Nessun dato inventato: se un numero (dislivello, temperatura, tempo limite, quota) non è nei fatti, non scriverlo; usa null o omissione. Meglio una scheda corta e vera che lunga e inventata.
- bike_dplus_m solo se un dislivello è nei fatti. water_type: mare/lago/fiume solo se chiaro.
- legs: 3-5 bullet per frazione, solo cose supportate dai fatti.
- kpis: 4-6 voci (distanza e dati verificati).
- splits: 4 profili (Finisher sereno / obiettivo medio / obiettivo veloce / top age-group) con tempi realistici per la distanza e il profilo dichiarato; sono stime orientative, non dati ufficiali, e il testo dell'intro lo dichiara.
- demands/tips/logistics: 3-5 voci ciascuna, pratiche (cosa fare), niente generalità vuote. logistics solo con informazioni dai fatti.
- faq: 5-8 domande che un iscritto fa davvero, risposte brevi basate sui fatti; se il fatto manca, rispondi che va verificato sul sito ufficiale.
- Nessuna frase virgolettata di persone. Non usare i marchi come tuoi.
- Gli indici heat/wind/fast sono giudizi sul clima e sul percorso: se i fatti non bastano, usa 1/1/2 (neutri) e dillo nell'intro.`;

export async function enrichRace(admin: SupabaseClient, race: Race, facts: string, sources: SourceRow[]) {
  if (sources.length) await upsertSources(admin, race.id, sources.map((s) => ({ quality: 3, fetched_via: "enrich", ...s })));
  const scheda = { nome: race.name, nome_ufficiale: race.official_name, luogo: [race.city, race.country].filter(Boolean).join(", "), paese: race.country, data: race.race_date, distanza: race.distance === "half" ? "70.3 (1,9 km / 90 km / 21,1 km)" : "full (3,8 km / 180 km / 42,2 km)" };
  const r = await generateStructured<Record<string, unknown>>({ system: SYSTEM, prompt: `GARA:\n${JSON.stringify(scheda)}\n\nFATTI RACCOLTI:\n${facts.slice(0, 24000)}\n\nFONTI: ${sources.map((s) => s.url).join(" | ")}`, schema: SCHEMA as unknown as Record<string, unknown>, effort: "medium", maxTokens: 14000 });
  if (!r.ok || !r.data) return { ok: false as const, error: r.error ?? "generazione fallita" };
  const d = r.data as Record<string, unknown> & { splits: unknown[]; legs: unknown };
  for (const k of ["water_type", "season"]) if (d[k] === "ignoto") d[k] = null;
  const upd = { ...d, course_version: `Scheda automatica da fonti pubbliche (${new Date().toISOString().slice(0, 7)}): da rivedere`, updated_at: new Date().toISOString() };
  const { error } = await admin.from("event_races").update(upd).eq("id", race.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, slug: race.slug, dplus: d.bike_dplus_m ?? null };
}
