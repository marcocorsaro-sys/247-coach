// ============================================================================
// Archivio risultati: tutte le edizioni di tutte le gare IRONMAN e 70.3, atleta
// per atleta (frazioni, transizioni, categoria, esito). Fonte: CoachCox imstats,
// la stessa che usiamo per i risultati dell'ultima edizione.
// La coda è ir_editions (pending → done); il cron ne lavora poche per volta e
// con una pausa tra una e l'altra, per non pesare sul sito sorgente.
// Tabelle private: i nomi stanno in ir_athletes, separati dai tempi (ir_results).
// ============================================================================
import type { SupabaseClient } from "@supabase/supabase-js";

const UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const BASE = "https://www.coachcox.co.uk";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type CcRow = Record<string, string | number | null | undefined>;
const int = (v: unknown): number | null => { const n = Number(v); return v == null || v === "" || !Number.isFinite(n) ? null : Math.round(n); };
const GENDER: Record<string, string> = { Male: "M", Female: "F" };

async function apiPath(raceId: number): Promise<string> {
  const page = `${BASE}/imstats/race/${raceId}/results/`;
  const h = await fetch(page, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(25_000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
  return /wp-json\/imstats\/v[\d.]+\/race\/results\//.exec(h)?.[0] ?? "wp-json/imstats/v1.93/race/results/";
}

async function chunked<T>(rows: T[], size: number, fn: (part: T[]) => Promise<{ error: { message: string } | null }>) {
  for (let i = 0; i < rows.length; i += size) {
    const { error } = await fn(rows.slice(i, i + size));
    if (error) throw new Error(error.message);
  }
}

/** Scarica e salva un'edizione. Restituisce righe e arrivati. */
export async function harvestEdition(admin: SupabaseClient, raceId: number, api: string): Promise<{ rows: number; finishers: number }> {
  const res = await fetch(`${BASE}/${api}${raceId}`, { headers: { "user-agent": UA, referer: `${BASE}/imstats/race/${raceId}/results/` }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = (await res.json()) as CcRow[] | { data?: CcRow[] };
  const rows: CcRow[] = Array.isArray(j) ? j : (j.data ?? []);
  if (!rows.length) return { rows: 0, finishers: 0 };
  const athletes = new Map<number, { aid: number; name: string | null; country: string | null; gender: string | null }>();
  const results = new Map<number, Record<string, unknown>>();
  rows.forEach((x, i) => {
    // senza id atleta uso un id negativo legato alla riga: resta unico dentro l'edizione
    const aid = int(x.aid) ?? -(raceId * 10000 + i);
    if (aid > 0) athletes.set(aid, { aid, name: (x.n as string) ?? null, country: (x.c as string) ?? null, gender: GENDER[String(x.g)] ?? null });
    results.set(aid, {
      race_id: raceId, aid, bib: x.bi == null ? null : String(x.bi), division: (x.di as string) ?? null, status: (x.fs as string) ?? null,
      swim: int(x.st), t1: int(x.t1t), bike: int(x.bt), t2: int(x.t2t), run: int(x.rt), total: int(x.ot),
      rank_overall: int(x.or), rank_div: int(x.odr), rank_gender: int(x.ogr),
    });
  });
  await chunked([...athletes.values()], 1000, async (p) => admin.from("ir_athletes").upsert(p, { onConflict: "aid" }));
  await chunked([...results.values()], 1000, async (p) => admin.from("ir_results").upsert(p, { onConflict: "race_id,aid" }));
  return { rows: results.size, finishers: rows.filter((x) => x.fs === "FIN").length };
}

/** Lavora la coda: le edizioni più recenti per prime, finché c'è tempo. */
export async function harvestQueue(admin: SupabaseClient, opts: { max?: number; budgetMs?: number; pauseMs?: number } = {}) {
  const t0 = Date.now(), max = opts.max ?? 8, budget = opts.budgetMs ?? 220_000, pause = opts.pauseMs ?? 2500;
  const { data } = await admin.from("ir_editions").select("race_id,tries").in("status", ["pending", "error"]).lt("tries", 4).order("status", { ascending: false }).order("year", { ascending: false }).limit(max);
  const queue = (data ?? []) as { race_id: number; tries: number }[];
  const out: { race: number; rows?: number; error?: string }[] = [];
  if (!queue.length) return { done: out, left: 0 };
  const api = await apiPath(queue[0].race_id);
  for (const e of queue) {
    if (Date.now() - t0 > budget) break;
    try {
      const r = await harvestEdition(admin, e.race_id, api);
      await admin.from("ir_editions").update({ status: r.rows ? "done" : "empty", rows: r.rows, finishers: r.finishers, error: null, tries: e.tries + 1, fetched_at: new Date().toISOString() }).eq("race_id", e.race_id);
      out.push({ race: e.race_id, rows: r.rows });
    } catch (err) {
      const msg = (err as Error).message.slice(0, 300);
      await admin.from("ir_editions").update({ status: "error", error: msg, tries: e.tries + 1 }).eq("race_id", e.race_id);
      out.push({ race: e.race_id, error: msg });
      // se la fonte rifiuta o è giù, inutile insistere in questo giro
      if (/HTTP (403|429|5\d\d)/.test(msg)) break;
    }
    await sleep(pause);
  }
  const { count } = await admin.from("ir_editions").select("race_id", { count: "exact", head: true }).in("status", ["pending", "error"]).lt("tries", 4);
  return { done: out, left: count ?? 0 };
}

/** Edizioni nuove: le pagine indice elencano l'ultima edizione di ogni gara. */
export async function discoverLatest(admin: SupabaseClient) {
  let added = 0;
  for (const [path, half] of [["im", false], ["him", true]] as const) {
    const h = await fetch(`${BASE}/imstats/${path}/`, { headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(40_000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
    const found = new Map<number, number>();
    for (const m of h.matchAll(/imstats\/race\/(\d+)\/"\s+title="Summary Stats for [^"]*?((?:19|20)\d\d)"/g)) found.set(Number(m[1]), Number(m[2]));
    if (!found.size) continue;
    const ids = [...found.keys()];
    const { data } = await admin.from("ir_editions").select("race_id").in("race_id", ids);
    const have = new Set(((data ?? []) as { race_id: number }[]).map((x) => x.race_id));
    const fresh = ids.filter((id) => !have.has(id)).map((id) => ({ race_id: id, year: found.get(id), half }));
    if (fresh.length) { const { error } = await admin.from("ir_editions").insert(fresh); if (!error) added += fresh.length; }
    await sleep(1500);
  }
  return added;
}
