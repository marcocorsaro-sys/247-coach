// Helper di formattazione per le attività Strava (puri, usabili lato server e client).

export interface StravaActivityLite {
  id: string;
  name: string | null;
  sport_type: string | null;
  discipline: string | null;
  start_date: string | null;
  distance_m: number | null;
  moving_time_s: number | null;
  average_heartrate: number | null;
  total_elevation_gain: number | null;
  average_watts: number | null;
}

/** Attività con tutti i campi importati + payload grezzo (per il dettaglio nel giorno). */
export interface StravaActivityFull extends StravaActivityLite {
  elapsed_time_s: number | null;
  max_heartrate: number | null;
  average_speed: number | null;
  max_speed: number | null;
  average_cadence: number | null;
  calories: number | null;
  trainer: boolean | null;
  raw: unknown;
}

export const DISCIPLINE_LABEL: Record<string, string> = {
  run: "Corsa",
  bike: "Bici",
  swim: "Nuoto",
  athletics: "Forza",
  other: "Altro",
};

export const DISCIPLINE_ICON: Record<string, string> = {
  run: "🏃",
  bike: "🚴",
  swim: "🏊",
  athletics: "🏋️",
  other: "🟢",
};

/**
 * Colore d'accento per disciplina, allineato al linguaggio visivo dell'app
 * (gli stessi colori usati da `.disc-*` e `.session-block`): così le attività
 * Strava parlano la stessa lingua delle sessioni pianificate.
 */
export const DISCIPLINE_ACCENT: Record<string, string> = {
  run: "var(--lime)",
  bike: "var(--amber)",
  swim: "var(--cyan)",
  athletics: "var(--violet)",
  other: "var(--text-3)",
};

const MESI_SHORT = ["gen", "feb", "mar", "apr", "mag", "giu", "lug", "ago", "set", "ott", "nov", "dic"];

export function fmtActivityDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MESI_SHORT[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export function fmtDistance(m: number | null): string | null {
  if (m == null || m <= 0) return null;
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 2 : 1)} km`;
}

export function fmtDuration(s: number | null): string | null {
  if (s == null || s <= 0) return null;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}'`;
  return `${m}'${String(sec).padStart(2, "0")}"`;
}

/** Solo l'ora di inizio (HH:mm) dalla data ISO. */
export function fmtClock(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Passo in min'sec" per km (corsa) o per 100m (nuoto). */
export function fmtPace(
  distanceM: number | null,
  movingS: number | null,
  per: "km" | "100m" = "km",
): string | null {
  if (!distanceM || !movingS || distanceM <= 0 || movingS <= 0) return null;
  const unit = per === "km" ? 1000 : 100;
  const secPer = movingS / (distanceM / unit);
  const m = Math.floor(secPer / 60);
  const s = Math.round(secPer % 60);
  const ss = s === 60 ? 0 : s;
  const mm = s === 60 ? m + 1 : m;
  return `${mm}'${String(ss).padStart(2, "0")}"/${per}`;
}

/** Velocità in km/h da m/s (o da distanza/tempo se la velocità manca). */
export function fmtSpeed(
  speedMs: number | null,
  distanceM?: number | null,
  movingS?: number | null,
): string | null {
  let ms = speedMs;
  if ((ms == null || ms <= 0) && distanceM && movingS && movingS > 0) ms = distanceM / movingS;
  if (ms == null || ms <= 0) return null;
  return `${(ms * 3.6).toFixed(1)} km/h`;
}

/**
 * Distribuisce le attività nei 7 giorni della settimana (0 = lunedì) a partire
 * da week_start (lunedì). Usa la data locale di Strava (`start_date_local`) se
 * presente, così l'attività cade nel giorno giusto a prescindere dal fuso.
 */
export function bucketByWeekday<T extends StravaActivityFull>(
  activities: T[],
  weekStartISO: string,
): Record<number, T[]> {
  const out: Record<number, T[]> = {};
  const base = new Date(`${weekStartISO.slice(0, 10)}T00:00:00`);
  for (const a of activities) {
    const localIso =
      (a.raw && typeof a.raw === "object" && "start_date_local" in a.raw
        ? (a.raw as { start_date_local?: string }).start_date_local
        : null) ?? a.start_date;
    if (!localIso) continue;
    const d = new Date(`${localIso.slice(0, 10)}T00:00:00`);
    const idx = Math.round((d.getTime() - base.getTime()) / 86_400_000);
    if (idx < 0 || idx > 6) continue;
    (out[idx] ??= []).push(a);
  }
  return out;
}

/** Estrae dal payload grezzo Strava un elenco di metriche aggiuntive etichettate. */
export function extraRawMetrics(raw: unknown): { label: string; value: string }[] {
  if (!raw || typeof raw !== "object") return [];
  const r = raw as Record<string, unknown>;
  const num = (k: string): number | null => (typeof r[k] === "number" ? (r[k] as number) : null);
  const out: { label: string; value: string }[] = [];
  const push = (label: string, v: string | null) => {
    if (v != null) out.push({ label, value: v });
  };
  push("Potenza pesata", num("weighted_average_watts") != null ? `${Math.round(num("weighted_average_watts")!)} W` : null);
  push("Potenza max", num("max_watts") != null ? `${Math.round(num("max_watts")!)} W` : null);
  push("Lavoro", num("kilojoules") != null ? `${Math.round(num("kilojoules")!)} kJ` : null);
  push("Sforzo relativo", num("suffer_score") != null ? `${Math.round(num("suffer_score")!)}` : null);
  push("Temperatura", num("average_temp") != null ? `${Math.round(num("average_temp")!)} °C` : null);
  push("Quota max", num("elev_high") != null ? `${Math.round(num("elev_high")!)} m` : null);
  push("Quota min", num("elev_low") != null ? `${Math.round(num("elev_low")!)} m` : null);
  push("Record personali", num("pr_count") != null ? `${num("pr_count")}` : null);
  push("Obiettivi", num("achievement_count") != null ? `${num("achievement_count")}` : null);
  return out;
}

// ---------------------------------------------------------------------------
// Vista unificata di un'attività
// ---------------------------------------------------------------------------
// Un'unica sorgente di verità per il modo in cui un'attività Strava viene
// rappresentata, condivisa da card dettaglio e lista. Le metriche sono divise
// per gerarchia di lettura: `primary` (i 2-3 numeri che contano), `secondary`
// (supporto: FC, potenza, dislivello…), `detail` (dati grezzi, a richiesta).

export interface ActivityMetric {
  label: string;
  value: string;
}

export interface ActivityView {
  disc: string;
  label: string;
  icon: string;
  accent: string;
  title: string;
  clock: string | null;
  indoor: boolean;
  primary: ActivityMetric[];
  secondary: ActivityMetric[];
  detail: ActivityMetric[];
}

type AnyActivity = StravaActivityLite & Partial<StravaActivityFull>;

/** Costruisce la vista di un'attività, indipendentemente dai campi disponibili. */
export function buildActivityView(a: AnyActivity): ActivityView {
  const disc = a.discipline ?? "other";
  const round = (n: number) => Math.round(n);

  const primary: ActivityMetric[] = [];
  const dist = fmtDistance(a.distance_m);
  if (dist) primary.push({ label: "Distanza", value: dist });
  const moving = fmtDuration(a.moving_time_s);
  if (moving) primary.push({ label: "Movimento", value: moving });
  if (disc === "bike") {
    const sp = fmtSpeed(a.average_speed ?? null, a.distance_m, a.moving_time_s);
    if (sp) primary.push({ label: "Vel. media", value: sp });
  } else if (disc === "swim") {
    const pace = fmtPace(a.distance_m, a.moving_time_s, "100m");
    if (pace) primary.push({ label: "Passo", value: pace });
  } else {
    const pace = fmtPace(a.distance_m, a.moving_time_s, "km");
    if (pace) primary.push({ label: "Passo", value: pace });
  }

  const secondary: ActivityMetric[] = [];
  if (a.average_heartrate) secondary.push({ label: "FC media", value: `${round(a.average_heartrate)} bpm` });
  if (a.max_heartrate) secondary.push({ label: "FC max", value: `${round(a.max_heartrate)} bpm` });
  if (a.average_watts) secondary.push({ label: "Potenza", value: `${round(a.average_watts)} W` });
  if (disc !== "swim" && a.total_elevation_gain) {
    secondary.push({ label: "Dislivello", value: `${round(a.total_elevation_gain)} m` });
  }
  if (a.average_cadence) secondary.push({ label: "Cadenza", value: `${round(a.average_cadence)}` });
  if (a.elapsed_time_s && a.moving_time_s && a.elapsed_time_s !== a.moving_time_s) {
    const tot = fmtDuration(a.elapsed_time_s);
    if (tot) secondary.push({ label: "Totale", value: tot });
  }
  if (a.calories) secondary.push({ label: "Calorie", value: `${round(a.calories)} kcal` });

  const localIso =
    (a.raw && typeof a.raw === "object" && "start_date_local" in a.raw
      ? (a.raw as { start_date_local?: string }).start_date_local
      : null) ?? a.start_date;

  return {
    disc,
    label: DISCIPLINE_LABEL[disc] ?? disc,
    icon: DISCIPLINE_ICON[disc] ?? "🟢",
    accent: DISCIPLINE_ACCENT[disc] ?? DISCIPLINE_ACCENT.other,
    title: a.name?.trim() || DISCIPLINE_LABEL[disc] || "Attività",
    clock: fmtClock(localIso),
    indoor: a.trainer === true,
    primary,
    secondary,
    detail: extraRawMetrics(a.raw),
  };
}

/** Etichetta di giorno relativa: "Oggi", "Ieri", oppure "mar 14 giu". */
export function fmtDayLabel(iso: string | null): string {
  if (!iso) return "Senza data";
  const d = new Date(iso);
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const now = new Date();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (diff === 0) return "Oggi";
  if (diff === 1) return "Ieri";
  const wd = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"][d.getDay()];
  return `${wd} ${d.getDate()} ${MESI_SHORT[d.getMonth()]}`;
}

/** Raggruppa attività (già ordinate) per giorno di calendario, preservando l'ordine. */
export function groupByDay<T extends { start_date: string | null }>(
  items: T[],
): { key: string; label: string; items: T[] }[] {
  const groups = new Map<string, { label: string; items: T[] }>();
  for (const it of items) {
    const key = it.start_date ? it.start_date.slice(0, 10) : "—";
    let g = groups.get(key);
    if (!g) {
      g = { label: fmtDayLabel(it.start_date), items: [] };
      groups.set(key, g);
    }
    g.items.push(it);
  }
  return [...groups.entries()].map(([key, g]) => ({ key, label: g.label, items: g.items }));
}
