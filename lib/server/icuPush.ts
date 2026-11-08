// ============================================================================
// Push degli allenamenti pianificati verso Intervals.icu (→ Garmin/Suunto/
// COROS/Wahoo dell'atleta). Usato sia dal bottone manuale nella pagina
// allenamento, sia AUTOMATICAMENTE alla pubblicazione di una settimana:
// per gli atleti collegati ogni sessione pubblicata parte da sola.
// Best-effort: gli errori non bloccano mai salvataggi o pubblicazioni.
// ============================================================================

import type { createClient } from "@/lib/supabase/server";
import {
  createWorkoutEvent,
  updateWorkoutEvent,
  deleteEvent,
  listEvents,
  type IntervalsCalendarEvent,
  type IntervalsConn,
} from "@/lib/intervals/api";
import {
  buildIcuWorkoutDoc,
  icuType,
  totalsFromSteps,
  type IcuStepRow,
} from "@/lib/intervals/workoutText";
import { loadIntervalsConnection, type IntervalsConnectionRow } from "@/lib/server/intervals";
import { aiAthleteIds } from "@/lib/server/appScope";
import { closedSessionIds } from "@/lib/server/closePlanned";
import { loadCustomZones } from "@/lib/server/customZones";
import type { CustomZones } from "@/lib/training/customZones";
import type { Discipline, Fitness } from "@/lib/training/zones";
import { addDays, mondayOf, parseDate, toISODate } from "@/lib/training/weeks";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type PushStatus = "ok" | "noconn" | "err";
export interface PushResult {
  status: PushStatus;
  detail?: string;
}

interface SessRow {
  id: string;
  week_id: string;
  day_of_week: number;
  discipline: string;
  title: string | null;
  notes: string | null;
  raw_text: string | null;
  volume_value: string | null;
}

const DISC_NAME: Record<string, string> = {
  swim: "Nuoto",
  bike: "Bici",
  run: "Corsa",
  athletics: "Forza",
  other: "Allenamento",
};

/** "1h10'", "45'", "2500m", "12.5km" — o il volume dichiarato come fallback. */
function fmtTotal(seconds: number, meters: number, volume: string | null): string {
  if (seconds >= 60) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}h${String(m).padStart(2, "0")}'` : `${h}h`;
    return `${m}'`;
  }
  if (meters > 0) {
    return meters >= 10000 ? `${parseFloat((meters / 1000).toFixed(1))}km` : `${meters}m`;
  }
  return volume?.trim() ?? "";
}

/**
 * Nome dell'evento su Intervals/Garmin: "Corsa 1h10' · Titolo".
 * Sport sempre davanti (sul calendario Garmin si capisce a colpo d'occhio),
 * salvo quando il titolo inizia già con il nome dello sport.
 */
function buildEventName(sess: SessRow, steps: IcuStepRow[]): string {
  const disc = DISC_NAME[sess.discipline] ?? DISC_NAME.other;
  const { seconds, meters } = totalsFromSteps(steps);
  const tot = fmtTotal(seconds, meters, sess.volume_value);
  const title = sess.title?.trim() ?? "";
  const titleHasDisc = title.toLowerCase().startsWith(disc.toLowerCase());
  const head = [titleHasDisc ? "" : disc, tot].filter(Boolean).join(" ");
  if (head && title) return `${head} · ${title}`;
  return head || title || disc;
}

async function loadFitness(supabase: SupabaseClient, athleteId: string): Promise<Fitness> {
  const { data } = await supabase
    .from("athlete_fitness")
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const fit = (data ?? null) as unknown as Record<string, unknown> | null;
  return {
    max_hr: (fit?.max_hr as number) ?? null,
    resting_hr: (fit?.resting_hr as number) ?? null,
    lthr: (fit?.lthr as number) ?? null,
    threshold_pace_run_s_per_km: (fit?.threshold_pace_run_s_per_km as number) ?? null,
    ftp_watts: (fit?.ftp_watts as number) ?? null,
    css_swim_s_per_100m: (fit?.css_swim_s_per_100m as number) ?? null,
    swim_test_400_s: (fit?.swim_test_400_s as number) ?? null,
    zone_model: (fit?.zone_model as string) ?? "standard",
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Esegue `fn` su ogni elemento a lotti piccoli invece che tutti in parallelo:
 * con settimane piene (10+ sessioni) le chiamate simultanee verso Intervals
 * tornavano 429 (rate limit) su una parte di esse, lasciando alcuni
 * allenamenti senza evento sul calendario. Un lotto alla volta, con una
 * piccola pausa fra un lotto e l'altro, resta sotto il limite.
 */
async function pushInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize = 6,
  pauseMs = 700,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) await sleep(pauseMs);
  }
  return results;
}

/**
 * Mappa external_id → event id sul calendario Intervals (finestra larga).
 * È la base dell'upsert fatto da noi: Intervals ignora l'uid del client,
 * quindi il match va fatto per external_id con lista + PUT/POST.
 */
async function loadExistingByExt(icuConn: IntervalsConn): Promise<Map<string, number[]> | null> {
  const today = new Date();
  const oldest = toISODate(addDays(today, -180));
  const newest = toISODate(addDays(today, 400));
  const listed = await listEvents(icuConn, oldest, newest);
  if (!listed.ok) return null; // lista non disponibile: si degrada a POST semplice
  const map = new Map<string, number[]>();
  for (const e of (Array.isArray(listed.data) ? listed.data : []) as IntervalsCalendarEvent[]) {
    if (!e.external_id) continue;
    const arr = map.get(e.external_id) ?? [];
    arr.push(e.id);
    map.set(e.external_id, arr);
  }
  return map;
}

async function pushOne(
  supabase: SupabaseClient,
  sess: SessRow,
  weekStart: string,
  conn: IntervalsConnectionRow,
  fitness: Fitness,
  customZones: CustomZones,
  existingByExt: Map<string, number[]> | null,
): Promise<PushResult> {
  const { data: sd } = await supabase
    .from("session_steps")
    .select(
      "id, parent_step_id, sort_order, step_type, repeat_count, duration_seconds, distance_meters, raw_fragment, target_type, target_low, target_high, target_unit, recovery_text, note, cadence_rpm",
    )
    .eq("session_id", sess.id)
    .order("sort_order", { ascending: true });
  const steps = (sd ?? []) as unknown as IcuStepRow[];

  const discipline = sess.discipline as Discipline;
  const lapPress = conn.warmup_lap_press === true;
  // Il documento strutturato è l'unico canale che porta le note della coach
  // FINO ALL'OROLOGIO: è il campo "Testo da mostrare all'atleta" di Intervals,
  // mentre il testo in coda alla riga della descrizione si ferma nell'app.
  //
  // ATTENZIONE alla precedenza (verificata via API): se si inviano ENTRAMBI,
  // alla creazione (POST) vince la descrizione — Intervals la ri-analizza e
  // sovrascrive il documento, perdendo le note — mentre in aggiornamento
  // (PUT) vince il documento. Comportamento ambiguo: quando abbiamo gli step
  // si invia SOLO il documento, completo dei totali che calcoliamo noi
  // (altrimenti Intervals lascerebbe l'evento senza durata né distanza).
  const doc = buildIcuWorkoutDoc({
    steps,
    discipline,
    fitness,
    customZones,
    warmupLapPress: lapPress,
  });
  const { seconds: totSec, meters: totM } = totalsFromSteps(steps);
  const fullDoc = doc
    ? {
        ...doc,
        ...(totSec > 0 ? { duration: totSec } : {}),
        ...(totM > 0 ? { distance: totM } : {}),
      }
    : null;
  // Senza step strutturati resta il testo libero della seduta.
  const description = fullDoc ? "" : (sess.notes?.trim() || sess.raw_text?.trim() || "");

  const dateISO = toISODate(addDays(parseDate(weekStart), sess.day_of_week));
  const icuConn = { intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key };
  const event = {
    external_id: sess.id,
    name: buildEventName(sess, steps),
    type: icuType(discipline),
    start_date_local: `${dateISO}T07:00:00`,
    description,
    ...(fullDoc ? { workout_doc: fullDoc } : {}),
  };

  // Upsert per external_id: se l'evento esiste lo AGGIORNO (e cancello le
  // eventuali copie in più), altrimenti lo creo. Così il ri-push non duplica
  // mai e ripara da solo i doppioni residui.
  const existing = existingByExt?.get(sess.id) ?? [];
  let res;
  if (existing.length > 0) {
    const [keep, ...extra] = existing;
    res = await updateWorkoutEvent(icuConn, keep, event);
    for (const dup of extra) {
      const d = await deleteEvent(icuConn, dup);
      if (!d.ok) console.error("[icu-push] dedup delete", sess.id, dup, d.detail);
    }
  } else {
    res = await createWorkoutEvent(icuConn, event);
  }
  if (res.ok) return { status: "ok" };
  return { status: "err", detail: `HTTP ${res.status}: ${res.detail ?? ""}`.trim() };
}

/** Push di una singola sessione (bottone manuale). */
export async function pushSessionToIntervals(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<PushResult> {
  const { data: sessData } = await supabase
    .from("sessions")
    .select("id, week_id, day_of_week, discipline, title, notes, raw_text, volume_value")
    .eq("id", sessionId)
    .single();
  const sess = sessData as unknown as SessRow | null;
  if (!sess) return { status: "err", detail: "Sessione non trovata." };

  const { data: weekData } = await supabase
    .from("training_weeks")
    .select("athlete_id, week_start")
    .eq("id", sess.week_id)
    .single();
  const week = weekData as unknown as { athlete_id: string; week_start: string } | null;
  if (!week) return { status: "err", detail: "Settimana non trovata." };

  const conn = await loadIntervalsConnection(supabase, week.athlete_id);
  if (!conn?.api_key) return { status: "noconn" };
  if (conn.push_planned === false) {
    return { status: "err", detail: "L'atleta ha disattivato l'invio dei pianificati al dispositivo." };
  }

  const [fitness, customZones, existingByExt] = await Promise.all([
    loadFitness(supabase, week.athlete_id),
    loadCustomZones(supabase, week.athlete_id),
    loadExistingByExt({ intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key }),
  ]);
  const r = await pushOne(supabase, sess, week.week_start, conn, fitness, customZones, existingByExt);
  if (r.status === "ok") {
    await supabase
      .from("intervals_connections")
      .update({ last_ok_at: new Date().toISOString() } as never)
      .eq("athlete_id", week.athlete_id);
  }
  return r;
}

export interface WeekPushResult {
  /** null = atleta non collegato (nessun invio tentato). */
  sent: number | null;
  failed: number;
}

/**
 * Push automatico di TUTTE le settimane pubblicate dell'atleta, da quella
 * corrente in poi. Usato all'apertura dell'app atleta (throttled): chi ha
 * collegato Intervals si ritrova sempre tutti gli allenamenti sul dispositivo,
 * senza che nessuno debba premere nulla. Idempotente: ri-push = aggiornamento.
 */
export async function pushAllPublishedWeeksFromNow(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<{ sent: number; failed: number }> {
  const fromMonday = toISODate(mondayOf(new Date()));
  const { data } = await supabase
    .from("training_weeks")
    .select("id, week_start")
    .eq("athlete_id", athleteId)
    .eq("status", "published")
    .gte("week_start", fromMonday)
    .order("week_start", { ascending: true });

  // Una sola lettura del calendario Intervals per TUTTE le settimane: la
  // mappa external_id→id viene riusata da ogni push (prima veniva ricaricata
  // per settimana: lentissimo con molte settimane pubblicate).
  const conn = await loadIntervalsConnection(supabase, athleteId);
  if (!conn?.api_key || conn.push_planned === false) return { sent: 0, failed: 0 };
  const existingByExt = await loadExistingByExt({
    intervals_athlete_id: conn.intervals_athlete_id,
    api_key: conn.api_key,
  });

  let sent = 0;
  let failed = 0;
  // Orizzonte scelto dall'atleta: oltre, niente invio (e la pulizia toglie quelli già inviati).
  const horizon = conn.push_days == null ? null : toISODate(addDays(new Date(), conn.push_days));
  const weekIds = ((data ?? []) as unknown as { id: string; week_start?: string }[])
    .filter((w) => horizon == null || !w.week_start || w.week_start <= horizon)
    .map((w) => w.id);
  for (const id of weekIds) {
    const r = await pushWeekToIntervals(supabase, id, existingByExt);
    sent += r.sent ?? 0;
    failed += r.failed;
  }

  // 24/7 Coach: ogni revisione AI crea sessioni NUOVE (nuova versione della
  // settimana), quindi gli eventi delle versioni superate restavano su
  // Intervals → doppioni su Garmin. Da oggi in avanti si cancellano tutti gli
  // eventi nostri che non corrispondono a una sessione attualmente pubblicata
  // (solo da oggi: i giorni passati restano abbinati alle attività svolte).
  // Solo atleti 24/7 Coach: l'iter di Irene non cambia.
  if ((await aiAthleteIds()).has(athleteId)) {
    try {
      await pruneStalePlanned(supabase, athleteId, weekIds, { intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key }, toISODate(new Date()));
    } catch (e) {
      console.error("[icu-prune]", athleteId, (e as Error).message);
    }
  }
  return { sent, failed };
}

const UUID_RX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cancella da Intervals (da `fromDate` in poi) gli eventi nostri superati o doppi. */
export async function pruneStalePlanned(
  supabase: SupabaseClient,
  athleteId: string,
  publishedWeekIds: string[],
  icuConn: { intervals_athlete_id: string | null; api_key: string },
  fromDate: string,
): Promise<number> {
  const current = new Set<string>();
  if (publishedWeekIds.length) {
    const { data: ss } = await supabase.from("sessions").select("id").in("week_id", publishedWeekIds);
    for (const s of (ss ?? []) as unknown as { id: string }[]) current.add(s.id);
  }
  const listed = await listEvents(icuConn as never, fromDate, toISODate(addDays(new Date(), 400)));
  if (!listed.ok) return 0;
  const events = (Array.isArray(listed.data) ? listed.data : []) as IntervalsCalendarEvent[];
  const seen = new Set<string>();
  let deleted = 0;
  for (const e of events) {
    const key = e.external_id ?? e.uid ?? "";
    if (!UUID_RX.test(key)) continue; // non è nostro
    if ((e.start_date_local ?? "").slice(0, 10) < fromDate) continue;
    const stale = !current.has(key);
    const dup = !stale && seen.has(key);
    seen.add(key);
    if (stale || dup) {
      const r = await deleteEvent(icuConn as never, e.id);
      if (r.ok) deleted++;
    }
  }
  if (deleted) console.log("[icu-prune]", athleteId, "eventi rimossi:", deleted);
  return deleted;
}

export interface CleanupResult {
  status: PushStatus;
  deleted: number;
  sent: number;
  detail?: string;
}

/**
 * Bonifica dei DUPLICATI su Intervals: i push storici non inviavano il campo
 * `uid`, quindi l'upsert non agganciava mai e ogni ri-push creava un evento
 * nuovo (visibile poi come allenamenti doppi su Garmin). Qui cancelliamo dal
 * calendario Intervals TUTTI gli eventi creati da noi (riconosciuti dal loro
 * external_id = id di una nostra sessione) e ri-pushiamo pulite le settimane
 * pubblicate da quella corrente in poi, stavolta con uid: da lì in avanti i
 * ri-push aggiornano invece di duplicare.
 */
/**
 * Rimuove da Intervals TUTTI gli allenamenti pianificati inviati da noi per
 * questo atleta, senza reinviarli. Usata quando l'atleta spegne l'invio al
 * dispositivo: al sync successivo spariscono anche da Garmin.
 */
export async function removePushedPlanned(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<CleanupResult> {
  return cleanupIntervalsDuplicates(supabase, athleteId, { repush: false });
}

export async function cleanupIntervalsDuplicates(
  supabase: SupabaseClient,
  athleteId: string,
  opts: { repush: boolean } = { repush: true },
): Promise<CleanupResult> {
  const conn = await loadIntervalsConnection(supabase, athleteId);
  if (!conn?.api_key) return { status: "noconn", deleted: 0, sent: 0 };

  // Id delle sessioni dell'atleta: servono a riconoscere gli eventi nostri.
  const { data: weeksData } = await supabase
    .from("training_weeks")
    .select("id")
    .eq("athlete_id", athleteId);
  const weekIds = ((weeksData ?? []) as unknown as { id: string }[]).map((w) => w.id);
  const sessionIds = new Set<string>();
  if (weekIds.length > 0) {
    const { data: sessData } = await supabase
      .from("sessions")
      .select("id")
      .in("week_id", weekIds);
    for (const s of (sessData ?? []) as unknown as { id: string }[]) sessionIds.add(s.id);
  }

  // Riconosce i NOSTRI eventi: external_id/uid uguale all'id di una sessione
  // esistente, oppure — per gli orfani di sessioni poi cancellate/ricreate —
  // un external_id/uid a forma di UUID (Intervals non li genera così; li
  // mettiamo solo noi). Il filtro resta dentro category=WORKOUT.
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isOurs = (e: IntervalsCalendarEvent) =>
    (e.external_id != null && (sessionIds.has(e.external_id) || UUID_RE.test(e.external_id))) ||
    (e.uid != null && (sessionIds.has(e.uid) || UUID_RE.test(e.uid)));

  // Finestra larga: copre sia i push storici sia le settimane future.
  const today = new Date();
  const oldest = toISODate(addDays(today, -180));
  const newest = toISODate(addDays(today, 400));
  const icuConn = { intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key };

  // Più giri: se la lista torna a blocchi (limite lato API) un passaggio solo
  // non basta. Ci si ferma quando un giro non trova più nulla di nostro.
  let deleted = 0;
  let deleteFailed = 0;
  for (let round = 0; round < 6; round++) {
    const listed = await listEvents(icuConn, oldest, newest);
    if (!listed.ok) {
      if (round === 0) {
        return {
          status: "err",
          deleted: 0,
          sent: 0,
          detail: `Lettura eventi fallita — HTTP ${listed.status}: ${listed.detail ?? ""}`.trim(),
        };
      }
      break;
    }
    const events = (Array.isArray(listed.data) ? listed.data : []) as IntervalsCalendarEvent[];
    const ours = events.filter(isOurs);
    if (ours.length === 0) break;
    let roundDeleted = 0;
    for (const e of ours) {
      const r = await deleteEvent(icuConn, e.id);
      if (r.ok) {
        deleted++;
        roundDeleted++;
      } else {
        deleteFailed++;
        console.error("[icu-cleanup]", athleteId, e.id, r.detail);
      }
    }
    // Giro a vuoto (tutti i delete falliti): inutile insistere.
    if (roundDeleted === 0) break;
  }

  const sent = opts.repush
    ? (await pushAllPublishedWeeksFromNow(supabase, athleteId)).sent
    : 0;
  return {
    status: deleteFailed > 0 ? "err" : "ok",
    deleted,
    sent,
    detail: deleteFailed > 0 ? `${deleteFailed} eventi non cancellati` : undefined,
  };
}

/**
 * Push automatico di TUTTE le sessioni di una settimana (alla pubblicazione).
 * Se l'atleta non è collegato non fa nulla. Gli errori vengono contati e
 * loggati ma non bloccano la pubblicazione.
 */
export async function pushWeekToIntervals(
  supabase: SupabaseClient,
  weekId: string,
  preloadedByExt?: Map<string, number[]> | null,
): Promise<WeekPushResult> {
  try {
    const { data: weekData } = await supabase
      .from("training_weeks")
      .select("athlete_id, week_start")
      .eq("id", weekId)
      .single();
    const week = weekData as unknown as { athlete_id: string; week_start: string } | null;
    if (!week) return { sent: null, failed: 0 };

    const conn = await loadIntervalsConnection(supabase, week.athlete_id);
    if (!conn?.api_key || conn.push_planned === false) return { sent: null, failed: 0 };

    const { data: sessData } = await supabase
      .from("sessions")
      .select("id, week_id, day_of_week, discipline, title, notes, raw_text, volume_value")
      .eq("week_id", weekId);
    let sessions = (sessData ?? []) as unknown as SessRow[];
    // 24/7 Coach: non si rimandano all'orologio le sedute dei giorni passati né quelle già svolte
    // (closePastPlanned le toglie dal calendario, il ri-push non deve ricrearle).
    if ((await aiAthleteIds()).has(week.athlete_id)) {
      const todayRome = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
      const closed = await closedSessionIds(supabase as never, week.athlete_id, sessions.map((s) => s.id));
      sessions = sessions.filter((s) => toISODate(addDays(parseDate(week.week_start), s.day_of_week)) >= todayRome && !closed.has(s.id));
    }
    if (sessions.length === 0) return { sent: 0, failed: 0 };

    const [fitness, customZones, existingByExt] = await Promise.all([
      loadFitness(supabase, week.athlete_id),
      loadCustomZones(supabase, week.athlete_id),
      preloadedByExt !== undefined
        ? Promise.resolve(preloadedByExt)
        : loadExistingByExt({ intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key }),
    ]);

    // Sessioni a lotti (non tutte in parallelo): con settimane piene
    // Intervals risponde 429 se le chiamate arrivano tutte insieme.
    const results = await pushInBatches(sessions, (s) =>
      pushOne(supabase, s, week.week_start, conn, fitness, customZones, existingByExt),
    );
    let sent = 0;
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === "ok") sent++;
      else {
        failed++;
        console.error("[icu-push]", weekId, sessions[i].id, r.detail);
      }
    });
    if (sent > 0) {
      await supabase
        .from("intervals_connections")
        .update({ last_ok_at: new Date().toISOString() } as never)
        .eq("athlete_id", week.athlete_id);
    }
    return { sent, failed };
  } catch (e) {
    console.error("[icu-push] settimana", weekId, (e as Error).message);
    return { sent: null, failed: 0 };
  }
}


/** Pulizia periodica (sync orario) per gli atleti 247: rimuove eventi superati/doppi da oggi in avanti. */
export async function pruneForAthlete(supabase: SupabaseClient, athleteId: string): Promise<number> {
  const conn = await loadIntervalsConnection(supabase, athleteId);
  if (!conn?.api_key || conn.push_planned === false) return 0;
  if (!(await aiAthleteIds()).has(athleteId)) return 0;
  const fromMonday = toISODate(mondayOf(new Date()));
  const { data } = await supabase.from("training_weeks").select("id, week_start").eq("athlete_id", athleteId).eq("status", "published").gte("week_start", fromMonday);
  const horizon = conn.push_days == null ? null : toISODate(addDays(new Date(), conn.push_days));
  const ids = ((data ?? []) as unknown as { id: string; week_start: string }[]).filter((w) => horizon == null || w.week_start <= horizon).map((w) => w.id);
  if (!ids.length) return 0; // senza piano pubblicato non si tocca nulla
  const today = toISODate(new Date());
  return pruneStalePlanned(supabase, athleteId, ids, { intervals_athlete_id: conn.intervals_athlete_id, api_key: conn.api_key }, today);
}
