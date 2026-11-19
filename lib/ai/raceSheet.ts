// ============================================================================
// Scheda gara per il motore del piano: per le gare obiettivo dell'atleta che
// sono gare IRONMAN / 70.3 del sito (event_races) aggiunge al contesto il
// percorso (tratti chiave), il meteo e l'acqua attesi, i cut-off e i tempi
// mediani dell'ultima edizione. Così il coach costruisce le sedute sulla gara
// vera: salite, caldo, vento, nuoto senza muta.
// L'aggancio è per data (stesso giorno) e distanza, poi per somiglianza del nome.
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

type AthleteRace = { name?: unknown; race_date?: unknown; location?: unknown; distance_label?: unknown; priority?: unknown };
type Ev = { id: string; name: string; official_name: string | null; city: string | null; country: string | null; distance: string; race_date: string; swim_km: string | null; bike_km: string | null; bike_dplus_m: number | null; run_km: string | null; water_type: string | null };

const norm = (s: unknown) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ");
const isHalf = (r: AthleteRace) => /70\.?3|half|mezzo|113/.test(norm(`${r.name} ${r.distance_label}`).replace(/ /g, "")) || /70 3/.test(norm(`${r.name} ${r.distance_label}`));

function score(r: AthleteRace, e: Ev): number {
  const hay = norm(`${r.name} ${r.location}`);
  let s = 0;
  for (const tok of norm(`${e.name} ${e.city ?? ""} ${e.official_name ?? ""}`).split(" ").filter((t) => t.length > 3 && !["ironman", "championship", "european"].includes(t))) if (hay.includes(tok)) s += 2;
  if ((e.distance === "half") === isHalf(r)) s += 1;
  return s;
}

export async function raceSheetText(admin: SupabaseClient, races: AthleteRace[]): Promise<string> {
  const mine = races.filter((r) => /ironman|70\.?3/i.test(`${r.name} ${r.distance_label}`) && typeof r.race_date === "string").slice(0, 3);
  if (!mine.length) return "";
  const { data: evs } = await admin.from("event_races").select("id,name,official_name,city,country,distance,race_date,swim_km,bike_km,bike_dplus_m,run_km,water_type").in("race_date", mine.map((r) => r.race_date as string));
  const out: string[] = [];
  for (const r of mine) {
    const cands = ((evs ?? []) as Ev[]).filter((e) => e.race_date === r.race_date).map((e) => ({ e, s: score(r, e) })).sort((a, b) => b.s - a.s);
    // serve almeno una parola del nome o del luogo in comune (oltre alla data)
    if (!cands.length || cands[0].s < 2) continue;
    const e = cands[0].e;
    const [{ data: f }, { data: segs }] = await Promise.all([
      admin.from("event_race_facts").select("geo_label,climate,water,official,results,results_year").eq("race_id", e.id).maybeSingle(),
      admin.from("event_race_segments").select("leg,km_from,km_to,title,note,grade_pct,dplus_m").eq("race_id", e.id).order("leg").order("position").limit(16),
    ]);
    const c = (f?.climate ?? null) as Record<string, number> | null;
    const w = (f?.water ?? null) as Record<string, number> | null;
    const o = (f?.official ?? {}) as { cutoffs?: unknown; wetsuit_note?: string | null; start_times?: unknown };
    const res = (f?.results ?? null) as { finishers?: number; starters?: number; dnf?: number; median?: Record<string, string> } | null;
    const weeks = Math.max(0, Math.round((Date.parse(e.race_date) - Date.now()) / (7 * 864e5)));
    const L: string[] = [
      `GARA: ${e.distance === "half" ? "IRONMAN 70.3" : "IRONMAN"} ${e.name} (${e.race_date}, tra ${weeks} settimane) — ${f?.geo_label ?? [e.city, e.country].filter(Boolean).join(", ")}`,
      `Distanze: nuoto ${e.swim_km ?? "?"} km (${e.water_type ?? "?"}), bici ${e.bike_km ?? "?"} km con ${e.bike_dplus_m ?? "?"} m di dislivello, corsa ${e.run_km ?? "?"} km.`,
    ];
    const S = (segs ?? []) as { leg: string; km_from: number | null; km_to: number | null; title: string | null; note: string | null; grade_pct: number | null; dplus_m: number | null }[];
    if (S.length) L.push(`Tratti del percorso:\n${S.map((s) => `  ${s.leg} km ${s.km_from ?? "?"}-${s.km_to ?? "?"}: ${s.title ?? ""}${s.grade_pct != null ? ` (pendenza ${s.grade_pct}%)` : ""}${s.dplus_m ? ` +${s.dplus_m} m` : ""}${s.note ? ` — ${String(s.note).slice(0, 160)}` : ""}`).join("\n")}`);
    if (c) L.push(`Meteo atteso nella settimana di gara (media storica ${c.years ?? "?"} anni): massima ${c.tmax_avg}°C (punte ${c.tmax_hi}°C), minima ${c.tmin_avg}°C, umidità ${c.humidity_avg}%, giorni con pioggia ${c.rain_days_pct}%, vento ${c.wind_avg_kmh} km/h con raffiche ${c.gust_avg_kmh} km/h.`);
    if (w) L.push(`Acqua: media ${w.avg_c}°C (min ${w.min_c}, max ${w.max_c}).${o.wetsuit_note ? ` Muta: ${o.wetsuit_note}` : ""}`);
    if (Array.isArray(o.cutoffs) && o.cutoffs.length) L.push(`Cut-off ufficiali: ${JSON.stringify(o.cutoffs).slice(0, 400)}`);
    if (res?.median) L.push(`Ultima edizione (${f?.results_year ?? "?"}): ${res.finishers ?? "?"} arrivati su ${res.starters ?? "?"} partenti; tempo mediano uomini ${res.median.M ?? "?"}, donne ${res.median.F ?? "?"}.`);
    out.push(L.join("\n"));
  }
  if (!out.length) return "";
  return `=== SCHEDA GARA (dati di 247coachai.com: percorso, meteo e acqua reali della gara obiettivo) ===
${out.join("\n\n")}
Come usarla: costruisci la specificità sulla gara vera, in modo proporzionato alle settimane che mancano. Dislivello e tratti in salita -> lavori in salita o di forza in bici e corsa collinare nei blocchi specifici; percorso piatto e ventoso -> lunghi tratti continui in posizione aero. Caldo o umidità alti -> acclimatazione nelle ultime 3-4 settimane e strategia di idratazione nei lunghi. Acqua calda (sopra ~24.5°C la muta di norma non è ammessa) -> nuoto senza muta nei blocchi specifici; acqua fredda -> uscite in acque libere con la muta. Usa i tempi mediani e i cut-off per tarare obiettivi realistici. Quando una seduta nasce da un dato della scheda, dillo nel campo "notes" (es. "per la salita al km 40 di gara"). Non citare numeri della gara che non sono qui.
=== FINE SCHEDA GARA ===`;
}
