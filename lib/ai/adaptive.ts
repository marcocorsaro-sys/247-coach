// ============================================================================
// Coach adattivo 24/7: il coach "si accorge da solo" di cosa ha fatto l'atleta.
//
// Ogni mattina (cron /api/ai/adaptive) per ogni atleta:
//   1. sincronizza le attività recenti da Intervals (Garmin/Suunto/Strava...);
//   2. confronta IERI pianificato vs IERI svolto;
//   3. sugli scostamenti significativi reagisce:
//        - fuori programma / volume molto superiore / sport diverso
//          → revisione AUTOMATICA del piano (stesso motore del dialogo col
//            coach), con nota visibile nell'app su cosa è cambiato;
//        - seduta saltata → caso AMBIGUO (stanchezza? fastidio? impegni?):
//          il coach fa una domanda nell'app, la risposta dell'atleta passa
//          dal normale dialogo e genera la revisione giusta.
//
// Soglie prudenti: le piccole differenze (10' in più su un fondo) NON toccano
// il piano. Un solo evento (il più significativo) per giorno per atleta, e il
// vincolo unique su (athlete, giorno, tipo) rende il cron idempotente.
// ============================================================================

import { createAdminClient } from "@/lib/supabase/admin";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";
import { pushAllPublishedWeeksFromNow } from "@/lib/server/icuPush";
import { generateInitialPlan, parseVolume } from "@/lib/ai/plan";
import { addDays, mondayOf, toISODate } from "@/lib/training/weeks";

type Admin = ReturnType<typeof createAdminClient>;

const DISC_LABEL: Record<string, string> = {
  run: "corsa",
  bike: "bici",
  swim: "nuoto",
  athletics: "palestra/forza",
  other: "attività",
};

function fmtDur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h${m > 0 ? `${String(m).padStart(2, "0")}'` : ""}` : `${m}'`;
}

interface PlannedSession {
  id: string;
  discipline: string;
  title: string | null;
  volume_value: string | null;
}
interface Activity {
  discipline: string;
  sport_type: string | null;
  name: string | null;
  moving_time_s: number | null;
  distance_m: number | null;
  training_load: number | null;
}

function actLine(a: Activity): string {
  const parts = [DISC_LABEL[a.discipline] ?? a.discipline];
  if (a.name) parts.push(`"${a.name}"`);
  if (a.moving_time_s) parts.push(fmtDur(a.moving_time_s));
  if (a.distance_m && a.distance_m > 1000) parts.push(`${Math.round(a.distance_m / 100) / 10} km`);
  if (a.training_load) parts.push(`carico ${Math.round(a.training_load)}`);
  return parts.join(" ");
}

// Sotto queste soglie non reagiamo: attività brevi o differenze modeste.
const SIGNIFICANT_S = 45 * 60; // un'attività "vera" dura almeno 45'
const OVERDONE_RATIO = 1.5; //   svolto ≥ 150% del previsto...
const OVERDONE_MIN_EXTRA_S = 30 * 60; // ...e almeno 30' in più
const SKIPPED_MAX_DONE_S = 20 * 60; // sotto 20' totali il giorno conta come saltato

export interface Deviation {
  kind: "unplanned_activity" | "overdone" | "different_sport" | "skipped";
  action: "revised" | "asked";
  /** Testo per l'atleta (per 'asked' è la domanda mostrata nell'app). */
  detail: string;
  /** Messaggio sintetico passato al motore di revisione (solo azioni auto). */
  feedback?: string;
}

/**
 * Confronta pianificato e svolto di un giorno e individua lo scostamento più
 * significativo (o null se il giorno è andato secondo i piani, o quasi).
 * Esportata pura per poterla testare senza database.
 */
export function detectDeviation(
  dayLabel: string,
  planned: PlannedSession[],
  activities: Activity[],
  logsCompleted: Set<string>,
): Deviation | null {
  const acts = activities.filter((a) => (a.moving_time_s ?? 0) > 0);
  const bigActs = acts.filter((a) => (a.moving_time_s ?? 0) >= SIGNIFICANT_S);
  const doneSec = acts.reduce((t, a) => t + (a.moving_time_s ?? 0), 0);
  const plannedSec = planned.reduce((t, s) => t + (parseVolume(s.volume_value) ?? 0), 0);
  const plannedText = planned
    .map((s) => `${DISC_LABEL[s.discipline] ?? s.discipline} — ${s.title ?? "seduta"} (${s.volume_value ?? "?"})`)
    .join("; ");
  const doneText = acts.map(actLine).join("; ");

  // Giorno di riposo previsto + attività importante svolta → fuori programma.
  if (planned.length === 0) {
    if (!bigActs.length) return null;
    return {
      kind: "unplanned_activity",
      action: "revised",
      detail: `${dayLabel} era previsto riposo, ma risulta svolto: ${doneText}.`,
      feedback: `[Rilevato automaticamente dalla sincronizzazione delle attività — non è un messaggio scritto dall'atleta] ${dayLabel} era previsto riposo, ma l'atleta ha svolto: ${doneText}. Tieni conto di questo carico extra nei prossimi giorni (recupero se serve) e spiega in athlete_message cosa hai cambiato e perché.`,
    };
  }

  // Volume molto superiore al previsto → alleggerire i giorni successivi.
  if (
    plannedSec > 0 &&
    doneSec >= plannedSec * OVERDONE_RATIO &&
    doneSec - plannedSec >= OVERDONE_MIN_EXTRA_S
  ) {
    return {
      kind: "overdone",
      action: "revised",
      detail: `${dayLabel} era previsto ${plannedText} (~${fmtDur(plannedSec)}), svolto molto di più: ${doneText} (${fmtDur(doneSec)} totali).`,
      feedback: `[Rilevato automaticamente dalla sincronizzazione delle attività — non è un messaggio scritto dall'atleta] ${dayLabel} era previsto: ${plannedText} (~${fmtDur(plannedSec)}). L'atleta ha svolto molto di più: ${doneText} (${fmtDur(doneSec)} totali). Adatta i prossimi giorni a questo carico extra e spiega in athlete_message cosa hai cambiato e perché.`,
    };
  }

  // Sport diverso da quello previsto (nessuna attività della disciplina attesa).
  const plannedDiscs = new Set(planned.map((s) => s.discipline));
  const matchesPlanned = acts.some((a) => plannedDiscs.has(a.discipline));
  if (bigActs.length && !matchesPlanned) {
    return {
      kind: "different_sport",
      action: "revised",
      detail: `${dayLabel} era previsto ${plannedText}, svolto invece: ${doneText}.`,
      feedback: `[Rilevato automaticamente dalla sincronizzazione delle attività — non è un messaggio scritto dall'atleta] ${dayLabel} era previsto: ${plannedText}. L'atleta ha svolto invece: ${doneText}. Valuta se la seduta prevista va recuperata, spostata o lasciata andare, adatta i prossimi giorni e spiega in athlete_message cosa hai cambiato e perché.`,
    };
  }

  // Seduta saltata: caso ambiguo (stanchezza? fastidio? tempo?) → domanda.
  // Se l'atleta l'ha spuntata come svolta nell'app, l'orologio può non aver
  // registrato: nessuna reazione.
  const allLogged = planned.every((s) => logsCompleted.has(s.id));
  if (doneSec <= SKIPPED_MAX_DONE_S && !allLogged) {
    return {
      kind: "skipped",
      action: "asked",
      detail: `${dayLabel} era previsto ${plannedText}, ma non risulta nessuna attività. Tutto ok? Se hai saltato per stanchezza, un fastidio o impegni, scrivimelo qui sotto: adatto il piano di conseguenza.`,
    };
  }

  return null;
}

export interface AdaptiveResult {
  ok: boolean;
  synced?: number;
  event?: string; // "kind → action" oppure motivo dello skip
  error?: string;
}

/**
 * Controllo adattivo quotidiano per un atleta: sync attività recenti,
 * confronto di ieri, reazione. Idempotente: ricontrollare lo stesso giorno
 * non produce doppie revisioni.
 */
export async function adaptiveCheck(athleteId: string): Promise<AdaptiveResult> {
  const admin = createAdminClient();

  // 1) Sync corto: bastano gli ultimi 3 giorni, l'import è idempotente.
  let synced = 0;
  const conn = await loadIntervalsConnection(admin as never, athleteId);
  if (conn) {
    const res = await syncIcuActivities(admin as never, athleteId, conn, 3);
    if (res.ok) synced = res.imported;
  }

  const { data: sh } = await admin.from("ai_athlete_profiles").select("shadow_plan").eq("athlete_id", athleteId).maybeSingle();
  if ((sh as { shadow_plan?: boolean } | null)?.shadow_plan) return { ok: true, synced, event: "skip: tabella ombra (segue un altro coach)" };

  // 2) Il giorno da esaminare: ieri.
  const yesterday = addDays(new Date(), -1);
  const yISO = toISODate(yesterday);
  const todayISO = toISODate(new Date());
  const dow = (yesterday.getDay() + 6) % 7; // 0=lunedì … 6=domenica
  const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
  const dayLabel = `Ieri (${GIORNI[dow]} ${yISO})`;

  // Se l'atleta ha già scritto al coach da ieri in poi, il piano è già stato
  // rivisto con il contesto completo: non reagire una seconda volta.
  const { data: fb } = await admin
    .from("ai_feedback")
    .select("id")
    .eq("athlete_id", athleteId)
    .gte("created_at", yISO)
    .limit(1);
  if (fb?.length) return { ok: true, synced, event: "skip: dialogo recente col coach" };

  // 3) Pianificato di ieri (settimana pubblicata che contiene ieri).
  const monday = toISODate(mondayOf(yesterday));
  const { data: wk } = await admin
    .from("training_weeks")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("week_start", monday)
    .eq("status", "published")
    .maybeSingle();
  let planned: PlannedSession[] = [];
  if (wk) {
    const { data: sess } = await admin
      .from("sessions")
      .select("id, discipline, title, volume_value")
      .eq("week_id", (wk as { id: string }).id)
      .eq("day_of_week", dow);
    planned = (sess ?? []) as PlannedSession[];
  } else {
    // Nessuna settimana pubblicata: niente piano con cui confrontare.
    return { ok: true, synced, event: "skip: nessuna settimana pubblicata" };
  }

  // 4) Svolto di ieri (da Intervals) + eventuali spunte manuali nell'app.
  const { data: actsData } = await admin
    .from("icu_activities")
    .select("discipline, sport_type, name, moving_time_s, distance_m, training_load").eq("is_duplicate" as never, false as never)
    .eq("athlete_id", athleteId)
    .gte("start_date", yISO)
    .lt("start_date", todayISO);
  const activities = (actsData ?? []) as Activity[];

  const logsCompleted = new Set<string>();
  if (planned.length) {
    const { data: logs } = await admin
      .from("session_logs")
      .select("session_id, status")
      .eq("athlete_id", athleteId)
      .in("session_id", planned.map((s) => s.id));
    for (const l of (logs ?? []) as { session_id: string; status: string }[]) {
      if (l.status === "completed") logsCompleted.add(l.session_id);
    }
  }

  const dev = detectDeviation(dayLabel, planned, activities, logsCompleted);
  if (!dev) return { ok: true, synced, event: "nessuno scostamento" };

  // 5) Registra l'evento; se esiste già (cron rilanciato) non reagire due
  //    volte — TRANNE quando la revisione precedente è morta a metà (evento
  //    'revised' senza resolved_at): in quel caso si riprova.
  const { data: existingData } = await admin
    .from("ai_adaptive_events")
    .select("id, action, resolved_at")
    .eq("athlete_id", athleteId)
    .eq("event_date", yISO)
    .eq("kind", dev.kind)
    .maybeSingle();
  const existing = existingData as { id: string; action: string; resolved_at: string | null } | null;
  let eventId: string;
  if (existing) {
    if (existing.action !== "revised" || existing.resolved_at) {
      return { ok: true, synced, event: `skip: ${dev.kind} già gestito` };
    }
    eventId = existing.id; // revisione interrotta: riprova
  } else {
    const { data: inserted, error: insErr } = await admin
      .from("ai_adaptive_events")
      .insert({
        athlete_id: athleteId,
        event_date: yISO,
        kind: dev.kind,
        detail: dev.detail,
        action: dev.action,
      } as never)
      .select("id")
      .single();
    if (insErr || !inserted) return { ok: false, synced, error: insErr?.message ?? "insert fallita" };
    eventId = (inserted as { id: string }).id;
  }

  // 6) Reazione: revisione automatica (con nota) o domanda all'atleta.
  if (dev.action === "revised" && dev.feedback) {
    const res = await generateInitialPlan(athleteId, { feedback: dev.feedback });
    await admin
      .from("ai_adaptive_events")
      .update(
        res.ok
          ? ({ coach_note: res.message ?? null, resolved_at: new Date().toISOString() } as never)
          : ({ coach_note: null } as never),
      )
      .eq("id", eventId);
    if (!res.ok) return { ok: false, synced, event: dev.kind, error: res.error };
    // Il piano rivisto arriva subito anche all'orologio (se il push è attivo).
    try {
      await pushAllPublishedWeeksFromNow(admin as never, athleteId);
    } catch (e) {
      console.error("[adaptive] push post-revisione fallito", (e as Error).message);
    }
  }

  return { ok: true, synced, event: `${dev.kind} → ${dev.action}` };
}
