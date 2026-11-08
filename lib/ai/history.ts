// ============================================================================
// Sintesi dello storico attività (icu_activities: Garmin/Strava/... via
// Intervals) in un testo compatto per il prompt: settimane aggregate per
// disciplina + qualche best effort. Il modello ragiona sul profilo reale
// dell'atleta, non su autodichiarazioni.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

interface ActRow {
  sport_type: string | null;
  start_date: string | null;
  distance_m: number | null;
  moving_time_s: number | null;
  total_elevation_gain: number | null;
  average_heartrate: number | null;
  average_speed: number | null;
  training_load: number | null;
}

function sportBucket(t: string | null): "run" | "bike" | "swim" | "strength" | "other" {
  const s = (t ?? "").toLowerCase();
  if (s.includes("weight") || s.includes("strength") || s.includes("gym")) return "strength";
  if (s.includes("run") || s.includes("hike")) return "run";
  if (s.includes("ride") || s.includes("bike") || s.includes("cycl")) return "bike";
  if (s.includes("swim")) return "swim";
  return "other";
}

function h(sec: number): string {
  return (sec / 3600).toFixed(1) + "h";
}

/** Riassunto testuale delle ultime `weeks` settimane di attività. */
export async function summarizeHistory(
  admin: SupabaseClient,
  athleteId: string,
  weeks = 26,
): Promise<{ text: string; totalActivities: number }> {
  const from = new Date();
  from.setDate(from.getDate() - weeks * 7);
  const { data } = await admin
    .from("icu_activities")
    .select(
      "sport_type, start_date, distance_m, moving_time_s, total_elevation_gain, average_heartrate, average_speed, training_load",
    ).eq("is_duplicate" as never, false as never)
    .eq("athlete_id", athleteId)
    .gte("start_date", from.toISOString())
    .order("start_date", { ascending: true });
  const acts = (data ?? []) as unknown as ActRow[];
  if (acts.length === 0) {
    return { text: "Nessuno storico attività disponibile.", totalActivities: 0 };
  }

  // Aggregazione per settimana ISO (lunedì) e disciplina.
  const byWeek = new Map<string, Record<string, { n: number; sec: number; m: number; elev: number }>>();
  for (const a of acts) {
    if (!a.start_date) continue;
    const d = new Date(a.start_date);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const wk = monday.toISOString().slice(0, 10);
    const disc = sportBucket(a.sport_type);
    const w = byWeek.get(wk) ?? {};
    const cell = w[disc] ?? { n: 0, sec: 0, m: 0, elev: 0 };
    cell.n += 1;
    cell.sec += a.moving_time_s ?? 0;
    cell.m += a.distance_m ?? 0;
    cell.elev += a.total_elevation_gain ?? 0;
    w[disc] = cell;
    byWeek.set(wk, w);
  }

  const lines: string[] = [];
  for (const [wk, w] of [...byWeek.entries()].sort()) {
    const parts = Object.entries(w).map(([disc, c]) => {
      if (disc === "strength") return `forza ${c.n}x ${h(c.sec)}`;
      const dist =
        disc === "swim"
          ? `${Math.round(c.m)}m`
          : `${(c.m / 1000).toFixed(0)}km`;
      const elev = disc !== "swim" && c.elev > 50 ? ` D+${Math.round(c.elev)}m` : "";
      return `${disc} ${c.n}x ${h(c.sec)} ${dist}${elev}`;
    });
    lines.push(`${wk}: ${parts.join(" | ")}`);
  }

  // Statistiche di sintesi.
  const weeksN = byWeek.size;
  const totSec = acts.reduce((s, a) => s + (a.moving_time_s ?? 0), 0);
  const avgWeekly = weeksN > 0 ? h(totSec / weeksN) : "0h";
  const hrAvgs = acts.map((a) => a.average_heartrate).filter((x): x is number => x != null && x > 0);
  const hrLine = hrAvgs.length
    ? `FC media tipica: ${Math.round(hrAvgs.reduce((s, x) => s + x, 0) / hrAvgs.length)} bpm.`
    : "";

  const text = [
    `Attività totali (${weeks} settimane): ${acts.length}. Settimane con allenamenti: ${weeksN}. Volume medio: ${avgWeekly}/settimana. ${hrLine}`,
    "Dettaglio per settimana (disciplina, sedute, ore, distanza):",
    ...lines.slice(-26),
  ].join("\n");

  return { text, totalActivities: acts.length };
}
