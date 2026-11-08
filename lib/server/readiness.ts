// ============================================================================
// Prontezza (readiness) giornaliera dai dati di benessere che Garmin & co.
// passano a Intervals.icu: HRV notturna, FC a riposo, sonno, più il carico
// (CTL/ATL). Garmin non espone il suo "Training Readiness" alle API terze,
// quindi lo ricostruiamo con gli stessi ingredienti, confrontando ogni valore
// con la baseline personale delle ultime 4 settimane.
// ============================================================================
import type { IntervalsConnectionRow } from "@/lib/server/intervals";

const BASE = "https://intervals.icu/api/v1";
/** "i123456" | "123456" | vuoto → id per l'API ("0" = l'atleta della API key). */
export const icuId = (raw: string | null | undefined) => { const r = (raw ?? "").trim(); return !r ? "0" : r.startsWith("i") ? r : `i${r}`; };
type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Raw = Record<string, unknown>;

const n = (v: unknown): number | null => (typeof v === "number" && isFinite(v) ? v : typeof v === "string" && v.trim() && isFinite(+v) ? +v : null);

/** Scarica e salva il benessere degli ultimi `days` giorni. */
export async function syncWellness(db: Db, athleteId: string, conn: Pick<IntervalsConnectionRow, "intervals_athlete_id" | "api_key">, days = 45, timeoutMs = 15000): Promise<number> {
  const now = new Date();
  const oldest = new Date(now.getTime() - days * 864e5).toISOString().slice(0, 10);
  const newest = now.toISOString().slice(0, 10);
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(`${BASE}/athlete/${icuId(conn.intervals_athlete_id)}/wellness?oldest=${oldest}&newest=${newest}`, {
      headers: { Authorization: `Basic ${Buffer.from(`API_KEY:${conn.api_key}`).toString("base64")}` },
      signal: ctrl.signal,
      cache: "no-store",
    });
    if (!r.ok) return 0;
    const arr = (await r.json()) as Raw[];
    const rows = arr
      .filter((w) => typeof w.id === "string")
      .map((w) => ({
        athlete_id: athleteId,
        day: w.id as string,
        ctl: n(w.ctl), atl: n(w.atl), resting_hr: n(w.restingHR), hrv: n(w.hrv) ?? n(w.hrvSDNN),
        sleep_secs: n(w.sleepSecs), sleep_score: n(w.sleepScore), sleep_quality: n(w.sleepQuality),
        spo2: n(w.spO2), readiness: n(w.readiness), soreness: n(w.soreness), fatigue: n(w.fatigue), stress: n(w.stress),
        steps: n(w.steps), weight: n(w.weight), raw: w, updated_at: new Date().toISOString(),
      }));
    if (rows.length) await db.from("icu_wellness").upsert(rows, { onConflict: "athlete_id,day" });
    return rows.length;
  } catch {
    return 0;
  } finally {
    clearTimeout(tm);
  }
}

export type WellRow = {
  day: string; ctl: number | null; atl: number | null; resting_hr: number | null; hrv: number | null;
  sleep_secs: number | null; sleep_score: number | null; readiness: number | null; updated_at?: string;
};

export type Factor = { key: "hrv" | "rhr" | "sleep" | "load"; label: string; score: number; value: string; base: string; note: string };
export type Readiness = {
  day: string;
  score: number;
  level: "pronto" | "moderato" | "basso" | "recupera";
  advice: string;
  factors: Factor[];
  series: { day: string; score: number | null }[];
  source: string;
};

const clamp = (x: number, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const sd = (a: number[]) => { const m = mean(a); return Math.sqrt(mean(a.map((x) => (x - m) ** 2))) || 1; };

function scoreDay(rows: WellRow[], i: number): { score: number; factors: Factor[] } | null {
  const d = rows[i];
  const base = rows.slice(Math.max(0, i - 28), i);
  const factors: Factor[] = [];
  const W: Record<Factor["key"], number> = { hrv: 30, sleep: 25, rhr: 20, load: 25 };

  const hrvB = base.map((r) => r.hrv).filter((x): x is number => x != null);
  if (d.hrv != null && hrvB.length >= 5) {
    const z = (d.hrv - mean(hrvB)) / Math.max(sd(hrvB), mean(hrvB) * 0.05);
    const s = clamp(65 + z * 18);
    factors.push({ key: "hrv", label: "HRV notturna", score: s, value: `${Math.round(d.hrv)} ms`, base: `media ${Math.round(mean(hrvB))} ms`, note: z > 0.5 ? "sopra la tua media" : z < -1 ? "sotto la tua media: sistema nervoso sotto stress" : "nella tua norma" });
  }
  const rhrB = base.map((r) => r.resting_hr).filter((x): x is number => x != null);
  if (d.resting_hr != null && rhrB.length >= 5) {
    const diff = d.resting_hr - mean(rhrB);
    const s = clamp(70 - diff * 7);
    factors.push({ key: "rhr", label: "FC a riposo", score: s, value: `${Math.round(d.resting_hr)} bpm`, base: `media ${Math.round(mean(rhrB))}`, note: diff >= 5 ? "alta: possibile fatica o malanno" : diff >= 2 ? "un po' alta" : diff <= -2 ? "bassa: buon recupero" : "nella tua norma" });
  }
  if (d.sleep_score != null || d.sleep_secs != null) {
    const h = (d.sleep_secs ?? 0) / 3600;
    const s = d.sleep_score != null ? clamp(d.sleep_score) : clamp(25 + h * 9);
    factors.push({ key: "sleep", label: "Sonno", score: s, value: `${d.sleep_score != null ? `${Math.round(d.sleep_score)}/100 · ` : ""}${h ? `${Math.floor(h)}h${String(Math.round((h % 1) * 60)).padStart(2, "0")}` : ""}`, base: "", note: s >= 80 ? "ottimo" : s >= 65 ? "discreto" : "scarso" });
  }
  if (d.ctl != null && d.atl != null) {
    const tsb = d.ctl - d.atl;
    const s = clamp(72 + tsb * 1.1);
    factors.push({ key: "load", label: "Carico recente", score: s, value: `TSB ${tsb > 0 ? "+" : ""}${Math.round(tsb)}`, base: `CTL ${Math.round(d.ctl)} · ATL ${Math.round(d.atl)}`, note: tsb < -30 ? "fatica accumulata alta" : tsb < -10 ? "in carico" : tsb > 10 ? "fresco" : "equilibrato" });
  }
  if (!factors.length || (factors.length === 1 && factors[0].key === "load")) return null;
  const wsum = factors.reduce((s, f) => s + W[f.key], 0);
  let score = factors.reduce((s, f) => s + f.score * W[f.key], 0) / wsum;
  // Un campanello d'allarme forte pesa più della media (come fa Garmin).
  const worst = Math.min(...factors.map((f) => f.score));
  if (worst < 30) score = Math.min(score, worst + 25);
  return { score: Math.round(score), factors };
}

function level(s: number): Readiness["level"] {
  return s >= 75 ? "pronto" : s >= 55 ? "moderato" : s >= 35 ? "basso" : "recupera";
}
const ADVICE: Record<Readiness["level"], string> = {
  pronto: "Corpo recuperato: giornata buona per la seduta di qualità o il lungo in programma.",
  moderato: "Recupero discreto: fai la seduta prevista, ma tieni le intensità nella parte bassa delle zone.",
  basso: "Recupero incompleto: meglio solo lavoro facile oggi. Se hai qualità in programma, valuta di scriverlo al coach.",
  recupera: "Segnali di fatica marcati: oggi riposo o recupero attivo leggero. Avvisa il coach se dura più di un giorno.",
};

/** Legge il benessere salvato e calcola la prontezza di oggi + serie 14 giorni. */
export async function loadReadiness(db: Db, athleteId: string): Promise<Readiness | null> {
  const since = new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10);
  const { data } = await db.from("icu_wellness").select("day, ctl, atl, resting_hr, hrv, sleep_secs, sleep_score, readiness, updated_at").eq("athlete_id", athleteId).gte("day", since).order("day");
  const rows = ((data ?? []) as WellRow[]).map((r) => ({ ...r, ctl: n(r.ctl), atl: n(r.atl), resting_hr: n(r.resting_hr), hrv: n(r.hrv), sleep_score: n(r.sleep_score), sleep_secs: n(r.sleep_secs) }));
  if (!rows.length) return null;
  // Oggi = ultimo giorno con dati notturni (HRV, FC riposo o sonno).
  let idx = -1;
  for (let i = rows.length - 1; i >= Math.max(0, rows.length - 3); i--) {
    if (rows[i].hrv != null || rows[i].resting_hr != null || rows[i].sleep_secs != null) { idx = i; break; }
  }
  if (idx < 0) return null;
  const today = scoreDay(rows, idx);
  if (!today) return null;
  const series = rows.slice(-14).map((r) => {
    const j = rows.indexOf(r);
    return { day: r.day, score: scoreDay(rows, j)?.score ?? null };
  });
  const lv = level(today.score);
  return { day: rows[idx].day, score: today.score, level: lv, advice: ADVICE[lv], factors: today.factors, series, source: "Garmin via Intervals.icu" };
}

/** Riga di testo per i prompt (piano, MCP). */
export function readinessText(r: Readiness | null): string {
  if (!r) return "";
  const last7 = r.series.slice(-7).map((s) => `${s.day.slice(5)} ${s.score ?? "–"}`).join(", ");
  return `PRONTEZZA (HRV, FC riposo, sonno, carico; 0-100): oggi ${r.day} ${r.score} (${r.level}). ${r.factors.map((f) => `${f.label} ${f.value} (${f.note})`).join(" · ")}. Ultimi 7 giorni: ${last7}.`;
}

/** Come loadReadiness, ma prima aggiorna da Intervals se i dati hanno più di un'ora. */
export async function freshReadiness(db: Db, athleteId: string, conn: Pick<IntervalsConnectionRow, "intervals_athlete_id" | "api_key"> | null): Promise<Readiness | null> {
  const { data: last } = await db.from("icu_wellness").select("updated_at").eq("athlete_id", athleteId).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  const at = (last as { updated_at?: string } | null)?.updated_at;
  if (conn && (!at || Date.now() - new Date(at).getTime() > 60 * 60_000)) await syncWellness(db, athleteId, conn, at ? 4 : 45, 4000);
  return loadReadiness(db, athleteId);
}
