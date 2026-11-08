// ============================================================================
// Abbinamento automatico allenamento ↔ seduta (solo atleti 24/7 Coach).
// Se l'atleta si allena nello stesso sport previsto quel giorno, la seduta
// diventa "svolta" da sola, con il riepilogo reale e lo scostamento dal
// previsto. Non tocca mai una seduta già segnata a mano (svolta o non svolta).
// ============================================================================
type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const romeDay = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date(iso));
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7)); return d.toISOString().slice(0, 10); };

function parseVolume(v: string | null): { min?: number; m?: number } {
  if (!v) return {};
  const s = v.toLowerCase().replace(",", ".");
  const km = s.match(/([\d.]+)\s*km/);
  if (km) return { m: parseFloat(km[1]) * 1000 };
  const m = s.match(/([\d.]+)\s*m(?!in)\b/);
  if (m && !/h/.test(s)) return { m: parseFloat(m[1]) };
  const h = s.match(/(\d+)\s*h\s*(\d+)?/);
  if (h) return { min: parseInt(h[1]) * 60 + (h[2] ? parseInt(h[2]) : 0) };
  const mi = s.match(/(\d+)\s*('|min)/);
  if (mi) return { min: parseInt(mi[1]) };
  return {};
}

export async function autoMatchActivities(db: Db, athleteId: string, days = 4): Promise<number> {
  // Tabella ombra: l'atleta segue un altro coach, i suoi allenamenti non "svolgono" le sedute 247.
  const { data: sh } = await db.from("ai_athlete_profiles").select("shadow_plan").eq("athlete_id", athleteId).maybeSingle();
  if ((sh as { shadow_plan?: boolean } | null)?.shadow_plan) return 0;
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data: acts } = await db
    .from("icu_activities")
    .select("start_date, discipline, name, distance_m, moving_time_s, average_heartrate").eq("is_duplicate" as never, false as never)
    .eq("athlete_id", athleteId)
    .gte("start_date", since)
    .order("start_date");
  const A = ((acts ?? []) as { start_date: string; discipline: string; name: string | null; distance_m: number | null; moving_time_s: number | null; average_heartrate: number | null }[]).filter((a) => (a.moving_time_s ?? 0) >= 180);
  if (!A.length) return 0;
  const firstDay = romeDay(A[0].start_date);
  const { data: wks } = await db.from("training_weeks").select("id, week_start").eq("athlete_id", athleteId).eq("status", "published").gte("week_start", mondayOf(firstDay));
  const W = (wks ?? []) as { id: string; week_start: string }[];
  if (!W.length) return 0;
  const { data: ss } = await db.from("sessions").select("id, week_id, day_of_week, discipline, title, volume_value").in("week_id", W.map((w) => w.id));
  const S = ((ss ?? []) as { id: string; week_id: string; day_of_week: number; discipline: string; title: string | null; volume_value: string | null }[]).map((s) => ({
    ...s,
    date: addDays(W.find((w) => w.id === s.week_id)!.week_start, s.day_of_week),
  }));
  if (!S.length) return 0;
  // Le righe con stato "planned" sono solo segnaposto: la seduta resta da abbinare.
  const { data: logs } = await db.from("session_logs").select("session_id, status, athlete_note").eq("athlete_id", athleteId).in("session_id", S.map((s) => s.id));
  const L = (logs ?? []) as { session_id: string; status: string; athlete_note: string | null }[];
  const logged = new Set(L.filter((l) => l.status !== "planned").map((l) => l.session_id));
  // Note scritte dall'atleta (non quelle automatiche, per non duplicarle).
  const prevNote = new Map(L.filter((l) => l.athlete_note && !/^Rilevato da orologio|^Nessun allenamento rilevato|^Non svolta come prevista/.test(l.athlete_note)).map((l) => [l.session_id, l.athlete_note!]));
  let n = 0;
  const used = new Set<string>();
  for (const a of A) {
    const day = romeDay(a.start_date);
    const s = S.find((x) => x.date === day && x.discipline === a.discipline && !logged.has(x.id) && !used.has(x.id));
    if (!s) continue;
    used.add(s.id);
    const vol = parseVolume(s.volume_value);
    const ratio = vol.min && a.moving_time_s ? a.moving_time_s / 60 / vol.min : vol.m && a.distance_m ? a.distance_m / vol.m : null;
    const what = [a.name, a.moving_time_s ? `${Math.round(a.moving_time_s / 60)}'` : "", a.distance_m ? `${(a.distance_m / 1000).toFixed(a.discipline === "swim" ? 2 : 1)} km` : "", a.average_heartrate ? `FC ${Math.round(a.average_heartrate)}` : ""].filter(Boolean).join(" · ");
    const dev = ratio == null ? "" : ratio < 0.75 ? ` — più corto del previsto (${Math.round(ratio * 100)}%)` : ratio > 1.3 ? ` — più lungo del previsto (${Math.round(ratio * 100)}%)` : "";
    const { error } = await db.from("session_logs").upsert({
      session_id: s.id,
      athlete_id: athleteId,
      status: "completed",
      completed_at: a.start_date,
      actual_duration_seconds: a.moving_time_s,
      actual_distance_meters: a.distance_m,
      athlete_note: [prevNote.get(s.id), `Rilevato da orologio: ${what}${dev}`].filter(Boolean).join("\n"),
    }, { onConflict: "session_id,athlete_id" });
    if (!error) n++;
  }
  return n;
}
