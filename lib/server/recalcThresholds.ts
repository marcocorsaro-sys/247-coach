// ============================================================================
// Ricalcolo soglie di corsa da uno sforzo massimale recente (gara o test):
//  - FC soglia (LTHR): FC media di uno sforzo a tutta di 40'-2h ≈ 98-100% LTHR
//  - passo soglia: passo equivalente a 60' (Riegel, esponente 1.06)
//  - FC max: se osservata più alta di quella impostata
// Solo atleti 24/7 Coach. Scrive su athlete_fitness con una nota di origine.
// ============================================================================
type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type RecalcResult = { ok: boolean; text: string; changes?: Record<string, [unknown, unknown]> };

const fmtPace = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/km`;

export async function recalcRunThresholds(db: Db, athleteId: string, days = 180): Promise<RecalcResult> {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data: acts } = await db
    .from("icu_activities")
    .select("start_date, name, distance_m, moving_time_s, average_heartrate, max_heartrate, average_speed")
    .eq("athlete_id", athleteId)
    .eq("is_duplicate", false)
    .eq("discipline", "run")
    .gte("start_date", since);
  type A = { start_date: string; name: string | null; distance_m: number | null; moving_time_s: number | null; average_heartrate: number | null; max_heartrate: number | null; average_speed: number | null };
  const A = ((acts ?? []) as A[])
    .filter((a) => (a.moving_time_s ?? 0) >= 40 * 60 && (a.moving_time_s ?? 0) <= 130 * 60 && a.average_heartrate && a.average_speed && a.average_speed < 6.45);
  if (!A.length) return { ok: false, text: "Nessuno sforzo di corsa di 40'-2h negli ultimi 6 mesi da cui ricalcolare le soglie." };
  // Per ogni sforzo: stima FC soglia e passo soglia equivalente a 60'.
  // Una gara corsa stanchi (TSB molto negativo) dà FC e passo più bassi del reale:
  // per questo si prende il MIGLIORE degli ultimi 6 mesi, non l'ultimo.
  const est = A.map((a) => {
    const dur = a.moving_time_s! / 60;
    const pace = 1000 / a.average_speed!;
    const hrFrac = Math.max(0.97, Math.min(1.02, 1.01 - ((dur - 40) / 65) * 0.02));
    return { a, dur, pace, lthr: Math.round(a.average_heartrate! / hrFrac), tPace: Math.round(pace * Math.pow(60 / dur, 0.06)) };
  });
  const byHr = [...est].sort((x, y) => y.lthr - x.lthr)[0];
  const byPace = [...est].sort((x, y) => x.tPace - y.tPace)[0];
  const lthr = byHr.lthr;
  const tPace = byPace.tPace;
  const maxObs = Math.max(...A.map((a) => a.max_heartrate ?? 0));

  const { data: cur } = await db.from("athlete_fitness").select("*").eq("athlete_id", athleteId).maybeSingle();
  const c = (cur ?? {}) as Record<string, unknown>;
  const upd: Record<string, unknown> = { lthr, threshold_pace_run_s_per_km: tPace };
  if (maxObs > Number(c.max_hr ?? 0)) upd.max_hr = Math.round(maxObs);
  const changes: Record<string, [unknown, unknown]> = {};
  for (const [k, v] of Object.entries(upd)) if (c[k] !== v) changes[k] = [c[k] ?? null, v];
  const src = (e: typeof byHr) => `${e.a.name ?? "corsa"} del ${e.a.start_date.slice(0, 10)} (${Math.round(e.dur)}' a ${fmtPace(e.pace)}, FC media ${Math.round(e.a.average_heartrate!)})`;
  const origin = byHr === byPace ? src(byPace) : `passo da ${src(byPace)}, FC da ${src(byHr)}`;
  const note = `Soglie corsa ricalcolate il ${new Date().toISOString().slice(0, 10)} dal miglior sforzo degli ultimi 6 mesi — ${origin}: FC soglia ${lthr}, passo soglia ${fmtPace(tPace)}${upd.max_hr ? `, FC max ${upd.max_hr}` : ""}.`;
  const row = { ...upd, notes: [c.notes, note].filter(Boolean).join("\n"), updated_at: new Date().toISOString(), updated_by: athleteId };
  if (cur) await db.from("athlete_fitness").update(row).eq("athlete_id", athleteId);
  else await db.from("athlete_fitness").insert({ athlete_id: athleteId, ...row });
  const before = (k: string, f: (v: number) => string) => (c[k] != null ? ` (prima ${f(Number(c[k]))})` : "");
  return {
    ok: true,
    changes,
    text: `Ho ricalcolato le soglie di corsa dal tuo miglior sforzo degli ultimi 6 mesi (${origin}; una gara corsa stanchi da sola le sottostima): FC soglia ${lthr}${before("lthr", String)}, passo soglia ${fmtPace(tPace)}${before("threshold_pace_run_s_per_km", fmtPace)}${upd.max_hr ? `, FC max ${upd.max_hr}` : ""}. Da ora zone e passi delle sedute usano questi valori; la revisione di stasera ne tiene conto.`,
  };
}
