"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { structureWeek } from "@/lib/ai/structurer";
import { parsePace, parseSpeedKmh } from "@/lib/training/zones";
import { parseZonePaste } from "@/lib/training/customZones";
import { mondayOf, addDays, toISODate, weekLabel, parseDate } from "@/lib/training/weeks";
import { notifyWeekPublished } from "@/lib/notify";
import { verifyIntervals } from "@/lib/intervals/api";
import { cleanupIntervalsDuplicates, pushWeekToIntervals } from "@/lib/server/icuPush";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";

const VALID_DISCIPLINES = ["swim", "bike", "run", "athletics", "other"];

/**
 * Crea una tabella settimanale vuota (bozza) e apre l'editor.
 * Se `week_start` è indicato, crea la settimana che contiene quella data
 * (allineata al lunedì); se esiste già una tabella per quel lunedì apre quella.
 * Senza data, sceglie il primo lunedì libero dalla settimana in corso.
 * Il nome è il numero di settimana ISO (es. "week20") e non è modificabile.
 */
export async function createWeek(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return;
  const chosen = str(formData.get("week_start"));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("training_weeks")
    .select("id, week_start")
    .eq("athlete_id", athleteId);
  const existingRows = (existing ?? []) as unknown as { id: string; week_start: string }[];
  const byStart = new Map(existingRows.map((r) => [r.week_start.slice(0, 10), r.id]));

  let monday: Date;
  if (chosen) {
    monday = mondayOf(chosen);
    const existingId = byStart.get(toISODate(monday));
    if (existingId) redirect(`/coach/atleta/${athleteId}/griglia?w=${toISODate(monday)}`);
  } else {
    monday = mondayOf(new Date());
    for (let i = 0; i < 520 && byStart.has(toISODate(monday)); i++) {
      monday = addDays(monday, 7);
    }
  }
  const weekStart = toISODate(monday);

  const { data, error } = await supabase
    .from("training_weeks")
    .insert({
      athlete_id: athleteId,
      coach_id: user.id,
      created_by: user.id,
      week_start: weekStart,
      label: weekLabel(monday),
      status: "draft",
    } as never)
    .select("id")
    .single();
  const week = data as unknown as { id: string } | null;
  if (error || !week) {
    revalidatePath(`/coach/atleta/${athleteId}`);
    return;
  }

  redirect(`/coach/atleta/${athleteId}/griglia?w=${weekStart}`);
}

/**
 * Invia (manualmente) la notifica email/SMS all'atleta per una tabella,
 * annunciandone il nome — senza cambiarne lo stato di pubblicazione. Utile per
 * ri-avvisare l'atleta o per testare l'invio. Best-effort: non solleva mai,
 * riporta l'esito nel banner della scheda atleta (?notice=).
 */
export async function sendWeekNotice(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const weekId = String(formData.get("week_id") ?? "");
  if (!athleteId || !weekId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let notice = "Notifica non inviata";
  try {
    const { data: wkData } = await supabase
      .from("training_weeks")
      .select("label, week_start")
      .eq("id", weekId)
      .single();
    const wk = wkData as unknown as { label: string | null; week_start: string } | null;

    const { data: athData } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", athleteId)
      .single();
    const ath = athData as unknown as {
      full_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;

    if (wk) {
      const res = await notifyWeekPublished({
        athleteName: ath?.full_name ?? "atleta",
        athleteEmail: ath?.email ?? null,
        athletePhone: ath?.phone ?? null,
        weekLabel: wk.label ?? weekLabel(mondayOf(wk.week_start)),
        appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://irene-coletto-tabella.vercel.app",
      });
      console.log("[send-week-notice]", weekId, JSON.stringify(res));
      const sent: string[] = [];
      if (res.email.status === "sent") sent.push("email");
      if (res.sms.status === "sent") sent.push("SMS");
      if (sent.length) notice = `Notifica inviata: ${sent.join(" + ")} → ${ath?.email ?? ""}`.trim();
      else if (res.email.status === "error" || res.sms.status === "error")
        notice = "Errore invio notifica — controlla i log/Resend";
      else notice = "Notifica non configurata (manca email atleta o env)";
    }
  } catch (e) {
    console.error("[send-week-notice] errore", (e as Error).message);
  }

  redirect(`/coach/atleta/${athleteId}?notice=${encodeURIComponent(notice)}`);
}

/** Pubblica in blocco tutte le bozze di un atleta (le rende visibili). */
export async function publishAllWeeks(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: draftRows } = await supabase
    .from("training_weeks")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("status", "draft");

  await supabase
    .from("training_weeks")
    .update({ status: "published", published_at: new Date().toISOString() } as never)
    .eq("athlete_id", athleteId)
    .eq("status", "draft");

  // Push automatico al dispositivo per ogni settimana appena pubblicata.
  const published = (draftRows ?? []) as unknown as { id: string }[];
  for (const w of published) {
    await pushWeekToIntervals(supabase, w.id);
  }

  // Strutturatore AI in background sulle settimane appena pubblicate.
  // In parallelo, non in fila: ogni settimana è una chiamata AI da ~1 minuto e
  // quattro di seguito sforavano i 300 s della funzione (timeout del 8/10, con
  // una settimana rimasta senza step). Il ri-push resta sequenziale dentro
  // ogni settimana, e pushWeekToIntervals si limita da solo sulle richieste.
  after(async () => {
    await Promise.allSettled(
      published.map(async (w) => {
        try {
          const r = await structureWeek(w.id);
          if (r.structured > 0) await pushWeekToIntervals(supabase, w.id);
        } catch (e) {
          console.error("[structurer] publishAllWeeks", w.id, (e as Error).message);
        }
      }),
    );
  });

  revalidatePath(`/coach/atleta/${athleteId}`);
  redirect(`/coach/atleta/${athleteId}`);
}

/** Pubblica/ritira una singola settimana restando sulla scheda atleta. */
export async function toggleWeekPublish(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const weekId = String(formData.get("week_id") ?? "");
  const publish = String(formData.get("publish") ?? "") === "1";
  if (!athleteId || !weekId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase
    .from("training_weeks")
    .update(
      (publish
        ? { status: "published", published_at: new Date().toISOString() }
        : { status: "draft" }) as never,
    )
    .eq("id", weekId);

  // Alla pubblicazione, push automatico degli allenamenti al dispositivo,
  // poi strutturatore AI in background (e ri-push se ha generato step).
  if (publish) {
    await pushWeekToIntervals(supabase, weekId);
    after(async () => {
      try {
        const r = await structureWeek(weekId);
        if (r.structured > 0) await pushWeekToIntervals(supabase, weekId);
      } catch (e) {
        console.error("[structurer] toggleWeekPublish", (e as Error).message);
      }
    });
  }

  revalidatePath(`/coach/atleta/${athleteId}`);
  redirect(`/coach/atleta/${athleteId}`);
}

// --- periodi flessibili / ferie ---------------------------------------------

/** Crea un periodo di ferie (bozza) e apre l'editor del roaster. */
export async function createPeriod(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const start = str(formData.get("start_date"));
  const end = str(formData.get("end_date"));
  if (!athleteId || !start || !end) return;
  // normalizza l'ordine se invertito
  const [s, e] = start <= end ? [start, end] : [end, start];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("vacation_periods")
    .insert({
      athlete_id: athleteId,
      coach_id: user.id,
      created_by: user.id,
      label: str(formData.get("label")),
      start_date: s,
      end_date: e,
      note: str(formData.get("note")),
      status: "draft",
    } as never)
    .select("id")
    .single();
  const period = data as unknown as { id: string } | null;

  if (period) redirect(`/coach/ferie/${period.id}`);
  revalidatePath(`/coach/atleta/${athleteId}`);
}

/** Elimina un periodo di ferie (roaster, giorni e scelte vanno a cascata). */
export async function deletePeriod(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const periodId = String(formData.get("period_id") ?? "");
  if (!periodId) return;
  const supabase = await createClient();
  await supabase.from("vacation_periods").delete().eq("id", periodId);
  revalidatePath(`/coach/atleta/${athleteId}`);
}

function num(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return isFinite(n) ? n : null;
}

function int(v: FormDataEntryValue | null): number | null {
  const n = num(v);
  return n == null ? null : Math.round(n);
}

function str(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

// --- scheda fisiologica ------------------------------------------------------

export async function saveFitness(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // FTP: se è indicato il "watt medi test 20'" calcolo FTP = watt medi −5%
  // (formula di Irene), altrimenti uso l'FTP inserito direttamente.
  const wattMedi20 = int(formData.get("ftp_watt_medi"));
  const ftpDirect = int(formData.get("ftp_watts"));
  const ftpWatts = wattMedi20 ? Math.round(wattMedi20 * 0.95) : ftpDirect;

  const payload = {
    athlete_id: athleteId,
    birth_date: str(formData.get("birth_date")),
    sex: str(formData.get("sex")),
    height_cm: num(formData.get("height_cm")),
    weight_kg: num(formData.get("weight_kg")),
    resting_hr: int(formData.get("resting_hr")),
    max_hr: int(formData.get("max_hr")),
    lthr: int(formData.get("lthr")),
    // Corsa: Irene ragiona in km/h. Se è indicata la velocità la converto in
    // passo (s/km); altrimenti uso il passo scritto direttamente (min:sec/km).
    threshold_pace_run_s_per_km:
      parseSpeedKmh(str(formData.get("run_speed_kmh"))) ??
      parsePace(str(formData.get("threshold_pace_run"))),
    ftp_watts: ftpWatts,
    css_swim_s_per_100m: parsePace(str(formData.get("css_swim"))),
    swim_test_400_s: parsePace(str(formData.get("swim_test_400"))),
    zone_model: str(formData.get("zone_model")) === "irene" ? "irene" : "standard",
    vo2max: num(formData.get("vo2max")),
    notes: str(formData.get("notes")),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  await supabase
    .from("athlete_fitness")
    .upsert(payload as never, { onConflict: "athlete_id" });

  revalidatePath(`/coach/atleta/${athleteId}`);
}

// --- test / metriche ---------------------------------------------------------

/**
 * Interpreta il campo "Valore" di un test in modo tollerante:
 *  - numero puro (es. "150", "5.04") → metric_value numerico;
 *  - passo/tempo o testo (es. "5:04", "4:30/km", "z3") → metric_text.
 * Così i passi corsa (min/km) non finiscono più come "—".
 */
function metricValueFields(formData: FormData): {
  metric_value: number | null;
  metric_text: string | null;
} {
  const raw = str(formData.get("metric_value"));
  const n = num(formData.get("metric_value"));
  if (n != null) return { metric_value: n, metric_text: str(formData.get("metric_text")) };
  // non numerico: conservo il testo così com'è (es. "5:04").
  return { metric_value: null, metric_text: raw ?? str(formData.get("metric_text")) };
}

export async function addMetric(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const key = str(formData.get("metric_key"));
  if (!athleteId || !key) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const row = {
    athlete_id: athleteId,
    metric_key: key,
    ...metricValueFields(formData),
    unit: str(formData.get("unit")),
    discipline: str(formData.get("discipline")),
    recorded_at: str(formData.get("recorded_at")) ?? new Date().toISOString().slice(0, 10),
    recorded_by: user.id,
    note: str(formData.get("note")),
  };

  await supabase.from("athlete_metrics").insert(row as never);
  revalidatePath(`/coach/atleta/${athleteId}`);
}

/** Modifica un test/soglia esistente (senza doverlo eliminare e riscrivere). */
export async function updateMetric(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const id = String(formData.get("metric_id") ?? "");
  const key = str(formData.get("metric_key"));
  if (!athleteId || !id || !key) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const row = {
    metric_key: key,
    ...metricValueFields(formData),
    unit: str(formData.get("unit")),
    discipline: str(formData.get("discipline")),
    recorded_at: str(formData.get("recorded_at")) ?? new Date().toISOString().slice(0, 10),
    note: str(formData.get("note")),
  };

  await supabase.from("athlete_metrics").update(row as never).eq("id", id);
  revalidatePath(`/coach/atleta/${athleteId}`);
}

export async function deleteMetric(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const id = String(formData.get("metric_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("athlete_metrics").delete().eq("id", id);
  revalidatePath(`/coach/atleta/${athleteId}`);
}

// --- range di zona personalizzati (copia-incolla) ---------------------------

/**
 * Salva i range di zona incollati a mano per una disciplina. Il testo viene
 * conservato verbatim: sostituisce in blocco le zone esistenti di quella
 * disciplina (textarea vuota = azzera). Nessun ricalcolo: l'atleta vede i
 * numeri esatti della coach.
 */
export async function saveCustomZones(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const discipline = str(formData.get("discipline"));
  if (!athleteId || !discipline || !VALID_DISCIPLINES.includes(discipline)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const parsed = parseZonePaste(String(formData.get("zones_text") ?? ""));

  await supabase
    .from("athlete_custom_zones")
    .delete()
    .eq("athlete_id", athleteId)
    .eq("discipline", discipline);

  if (parsed.length > 0) {
    const rows = parsed.map((z, i) => ({
      athlete_id: athleteId,
      discipline,
      sort_order: i,
      zone_name: z.name,
      range_text: z.range,
    }));
    await supabase.from("athlete_custom_zones").insert(rows as never);
  }

  revalidatePath(`/coach/atleta/${athleteId}`);
}

// --- connessione Intervals.icu (ponte verso Garmin) ------------------------

/**
 * Salva/aggiorna la connessione Intervals.icu dell'atleta (API key + athlete
 * id). Verifica la chiave prima di salvarla. API key vuota = scollega.
 * Richiamabile dal coach (per un suo atleta) grazie alla RLS.
 */
export async function saveIntervalsConnection(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const apiKey = str(formData.get("api_key"));
  const intervalsId = str(formData.get("intervals_athlete_id"));
  const channels = formData
    .getAll("channels")
    .map((v) => String(v))
    .filter(Boolean)
    .join(", ");

  if (!apiKey) {
    await supabase.from("intervals_connections").delete().eq("athlete_id", athleteId);
    redirect(`/coach/atleta/${athleteId}?notice=intervals_off&tab=dispositivi`);
  }

  const v = await verifyIntervals({ intervals_athlete_id: intervalsId, api_key: apiKey! });

  await supabase.from("intervals_connections").upsert(
    {
      athlete_id: athleteId,
      intervals_athlete_id: intervalsId,
      api_key: apiKey,
      channels: channels || null,
      enabled: true,
      last_ok_at: v.ok ? new Date().toISOString() : null,
    } as never,
    { onConflict: "athlete_id" },
  );

  redirect(`/coach/atleta/${athleteId}?notice=${v.ok ? "intervals_ok" : "intervals_bad"}&tab=dispositivi`);
}

/**
 * Push in blocco: invia al dispositivo TUTTI gli allenamenti delle settimane
 * pubblicate da quella corrente in poi (le passate non si mandano: sul
 * calendario Garmin non servirebbero). Utile al primo aggancio di un atleta,
 * per allineare in un colpo tutto ciò che è già stato creato.
 */
export async function pushAllWeeksToDevice(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const fromMonday = toISODate(mondayOf(new Date()));
  const { data: weeksData } = await supabase
    .from("training_weeks")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("status", "published")
    .gte("week_start", fromMonday)
    .order("week_start", { ascending: true });
  const weeks = (weeksData ?? []) as unknown as { id: string }[];

  let sent = 0;
  let failed = 0;
  let noconn = false;
  for (const w of weeks) {
    const r = await pushWeekToIntervals(supabase, w.id);
    if (r.sent == null) {
      noconn = true;
      break;
    }
    sent += r.sent;
    failed += r.failed;
  }

  revalidatePath(`/coach/atleta/${athleteId}`);
  if (noconn) redirect(`/coach/atleta/${athleteId}?notice=intervals_noconn&tab=dispositivi`);
  redirect(`/coach/atleta/${athleteId}?notice=intervals_pushed_${sent}_${failed}&tab=dispositivi`);
}

/**
 * Bonifica dei duplicati su Intervals/Garmin: cancella dal calendario Intervals
 * tutti gli eventi creati da noi e ri-pusha pulite le settimane pubblicate.
 */
export async function cleanupIntervalsEvents(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const res = await cleanupIntervalsDuplicates(supabase, athleteId);
  revalidatePath(`/coach/atleta/${athleteId}`);
  if (res.status === "noconn") redirect(`/coach/atleta/${athleteId}?notice=intervals_noconn&tab=dispositivi`);
  if (res.status === "err" && res.deleted === 0 && res.sent === 0) {
    redirect(`/coach/atleta/${athleteId}?notice=intervals_cleanerr&tab=dispositivi`);
  }
  redirect(`/coach/atleta/${athleteId}?notice=intervals_cleaned_${res.deleted}_${res.sent}&tab=dispositivi`);
}

/** Il coach importa le attività svolte dell'atleta (ultimi 90 giorni). */
export async function syncIntervalsActivities(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  if (!athleteId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conn = await loadIntervalsConnection(supabase, athleteId);
  if (!conn) redirect(`/coach/atleta/${athleteId}?notice=intervals_noconn&tab=dispositivi`);

  const res = await syncIcuActivities(supabase, athleteId, conn!);
  revalidatePath(`/coach/atleta/${athleteId}`);
  redirect(
    `/coach/atleta/${athleteId}?notice=${
      res.ok ? `intervals_synced_${res.imported}` : "intervals_syncerr"
    }`,
  );
}

// --- inserimento allenamento da una data (vista mensile) --------------------

/**
 * Crea un allenamento in una data specifica dalla vista mensile: individua la
 * settimana (lunedì) che contiene la data, la crea come bozza se non esiste,
 * aggiunge una sessione vuota nel giorno giusto e apre il builder. Così Irene
 * può pianificare direttamente dal mese, non solo dall'editor settimanale.
 */
export async function addSessionOnDate(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const date = str(formData.get("date"));
  if (!athleteId || !date) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const monday = mondayOf(date);
  const weekStart = toISODate(monday);
  // Giorno della settimana 0=lun..6=dom, dalla distanza dal lunedì.
  const dow = Math.min(
    6,
    Math.max(0, Math.round((parseDate(date).getTime() - monday.getTime()) / 86_400_000)),
  );

  // Settimana esistente per quel lunedì, altrimenti creala (bozza).
  const { data: existing } = await supabase
    .from("training_weeks")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("week_start", weekStart)
    .maybeSingle();
  let weekId = (existing as unknown as { id: string } | null)?.id ?? null;

  if (!weekId) {
    const { data: created } = await supabase
      .from("training_weeks")
      .insert({
        athlete_id: athleteId,
        coach_id: user.id,
        created_by: user.id,
        week_start: weekStart,
        label: weekLabel(monday),
        status: "draft",
      } as never)
      .select("id")
      .single();
    weekId = (created as unknown as { id: string } | null)?.id ?? null;
  }

  if (!weekId) {
    revalidatePath(`/coach/atleta/${athleteId}/mese`);
    return;
  }

  const { data: sess } = await supabase
    .from("sessions")
    .insert({
      week_id: weekId,
      day_of_week: dow,
      discipline: "run",
      volume_unit: "time",
      sort_order: 50,
    } as never)
    .select("id")
    .single();
  const sessId = (sess as unknown as { id: string } | null)?.id ?? null;

  if (sessId) redirect(`/coach/sessione/${sessId}`);
  redirect(`/coach/settimana/${weekId}`);
}

// --- gare --------------------------------------------------------------------

export async function addRace(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const name = str(formData.get("name"));
  if (!athleteId || !name) return;

  const supabase = await createClient();
  const row = {
    athlete_id: athleteId,
    name,
    race_date: str(formData.get("race_date")),
    location: str(formData.get("location")),
    sport: str(formData.get("sport")),
    priority: str(formData.get("priority")),
    distance_label: str(formData.get("distance_label")),
    target_time: str(formData.get("target_time")),
  };
  await supabase.from("races").insert(row as never);
  revalidatePath(`/coach/atleta/${athleteId}`);
}

export async function deleteRace(formData: FormData) {
  const athleteId = String(formData.get("athlete_id") ?? "");
  const id = String(formData.get("race_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase.from("races").delete().eq("id", id);
  revalidatePath(`/coach/atleta/${athleteId}`);
}
