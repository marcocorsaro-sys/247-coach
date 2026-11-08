// ============================================================================
// Strumenti dell'atleta 24/7 Coach: piano, attività, proiezione gara, messaggi
// al coach. Un'unica implementazione per il server MCP (Claude/ChatGPT) e per
// l'agente Telegram.
// ============================================================================
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { describeSteps, type StepLite } from "@/lib/training/describe";
import type { Discipline, Fitness } from "@/lib/training/zones";
import { weeklyReview } from "@/lib/ai/plan";
import { handleCoachMessage } from "@/lib/ai/coachMessage";
import { eveningMessage } from "@/lib/notify/athlete";
import { athletePerformance } from "@/lib/server/raceHistory";
import { freshReadiness, readinessText } from "@/lib/server/readiness";
import { loadIntervalsConnection } from "@/lib/server/intervals";

const GIORNI = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];

type Admin = ReturnType<typeof createAdminClient>;
export type Ctx = { admin: Admin; athleteId: string; name: string; lang: "it" | "en"; coach: string };
export type Json = Record<string, unknown>;

export const TOOLS = [
  {
    name: "coach_overview",
    title: "Riepilogo atleta e prossimi 7 giorni",
    description:
      "Start here. Returns the athlete's profile as known by their 24/7 Coach: today's readiness (0-100 from Garmin HRV, resting HR, sleep and training load), goals, target races with dates and target times, thresholds (FTP, LTHR, run threshold pace, swim CSS), rest days, weekly availability, and the planned sessions for the next 7 days. Also explains how plan reviews work.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_plan",
    title: "Tabella di allenamento",
    description:
      "Returns the published training plan in detail (each session with its structured steps, target zones converted to the athlete's HR/power/pace, and coach notes). Use it to explain a workout or to look ahead.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "Start date YYYY-MM-DD (default: Monday of the current week)." },
        weeks: { type: "integer", minimum: 1, maximum: 8, description: "Number of weeks (default 1)." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "tomorrow_briefing",
    title: "Domani",
    description: "Returns tomorrow's workout explained step by step (zones in the athlete's HR/power/pace), with today's readiness: the same 'good night' briefing the coach sends on Telegram in the evening.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "get_activities",
    title: "Allenamenti svolti",
    description:
      "Returns the workouts the athlete actually completed (synced from Garmin/Strava via Intervals.icu): date, sport, name, distance, duration, average HR, power and speed/pace, each matched with the session planned that day. Use it to compare what was done with the plan.",
    inputSchema: {
      type: "object",
      properties: { days: { type: "integer", minimum: 1, maximum: 90, description: "How many days back (default 14)." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "race_projection",
    title: "Storico gare e proiezione obiettivo",
    description:
      "Returns the races rebuilt from the athlete's history, performance insights and a projection of the finishing time for the main target race versus the goal time, with the levers (bike power, run pace) needed to reach it.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true },
  },
  {
    name: "coach_messages",
    title: "Conversazione con il coach",
    description: "Returns the latest messages the athlete exchanged with the 24/7 Coach (athlete message, coach reply, decision taken).",
    inputSchema: {
      type: "object",
      properties: { limit: { type: "integer", minimum: 1, maximum: 30, description: "Default 10." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true },
  },
  {
    name: "message_coach",
    title: "Scrivi al coach",
    description:
      "Sends a message to the athlete's 24/7 Coach, exactly like the chat in the app (e.g. how a workout went, pain or fatigue, travel, a change of availability). The coach triages it: answers only, keeps it for the Sunday-evening review, or changes the plan from tomorrow. Returns the coach's reply and decision. Only send what the athlete actually asked to send; write it in the athlete's own words.",
    inputSchema: {
      type: "object",
      properties: { message: { type: "string", minLength: 2, maxLength: 12000, description: "The message for the coach. Long plans or structures are fine: send them in full, never truncated." } },
      required: ["message"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "save_gym_plan",
    title: "Salva la scheda palestra",
    description:
      "Saves the athlete's strength/gym routine (exercises, sets, reps, rest, seasonal progression) so the coach uses it for EVERY gym session in the plan from now on, instead of inventing exercises. Send the full routine as text. Use it when the athlete shares or builds a gym plan and asks the coach to use it.",
    inputSchema: {
      type: "object",
      properties: { plan: { type: "string", minLength: 20, maxLength: 12000, description: "The full gym routine in plain text." } },
      required: ["plan"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
  {
    name: "request_plan_review",
    title: "Rivedi la tabella adesso",
    description:
      "Forces an immediate review of the plan instead of waiting for the automatic Sunday-evening review. Optionally pass a note with wishes for the coming days (e.g. 'Saturday I have 4 hours, Sunday nothing'). The new plan is ready in 2-4 minutes in the app, on the watch and in the calendar. Only call it when the athlete explicitly asks for a review.",
    inputSchema: {
      type: "object",
      properties: { note: { type: "string", maxLength: 12000, description: "Optional wishes or constraints for the review." } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false },
  },
] as const;

// ----------------------------------------------------------------- helpers
function mondayISO(d = new Date()): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = (x.getUTCDay() + 6) % 7;
  x.setUTCDate(x.getUTCDate() - dow);
  return x.toISOString().slice(0, 10);
}
function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function hms(s: number | null | undefined): string {
  if (!s) return "?";
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}'`;
}
function pace(disc: string, speed: number | null | undefined): string {
  if (!speed || speed <= 0) return "";
  if (disc === "run") { const s = 1000 / speed; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/km`; }
  if (disc === "swim") { const s = 100 / speed; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/100m`; }
  return `${(speed * 3.6).toFixed(1)} km/h`;
}
const fmtPace = (s: number | null | undefined, unit: string) =>
  s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}${unit}` : "?";

async function loadFitness(ctx: Ctx): Promise<Fitness & Json> {
  const { data } = await ctx.admin.from("athlete_fitness").select("*").eq("athlete_id", ctx.athleteId).maybeSingle();
  return (data ?? { max_hr: null, resting_hr: null, lthr: null, threshold_pace_run_s_per_km: null, ftp_watts: null, css_swim_s_per_100m: null }) as Fitness & Json;
}

async function planText(ctx: Ctx, from: string, weeks: number, detailed: boolean): Promise<string> {
  const to = addDays(from, weeks * 7 - 1);
  const { data: wks } = await ctx.admin
    .from("training_weeks")
    .select("id, week_start, coach_comment")
    .eq("athlete_id", ctx.athleteId)
    .eq("status", "published")
    .gte("week_start", addDays(from, -6))
    .lte("week_start", to)
    .order("week_start");
  const ws = (wks ?? []) as { id: string; week_start: string; coach_comment: string | null }[];
  if (!ws.length) return "Nessuna tabella pubblicata in questo periodo.";
  const { data: ss } = await ctx.admin
    .from("sessions")
    .select("id, week_id, day_of_week, discipline, title, volume_value, notes, sort_order")
    .in("week_id", ws.map((w) => w.id));
  const sess = (ss ?? []) as { id: string; week_id: string; day_of_week: number; discipline: string; title: string | null; volume_value: string | null; notes: string | null; sort_order: number | null }[];
  const steps = new Map<string, StepLite[]>();
  const fit = detailed ? await loadFitness(ctx) : null;
  if (detailed && sess.length) {
    const { data } = await ctx.admin.from("session_steps").select("*").in("session_id", sess.map((s) => s.id));
    for (const st of (data ?? []) as (StepLite & { session_id: string })[]) steps.set(st.session_id, [...(steps.get(st.session_id) ?? []), st]);
  }
  const out: string[] = [];
  for (const w of ws) {
    const daySess = sess.filter((s) => s.week_id === w.id).sort((a, b) => a.day_of_week - b.day_of_week || (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const lines: string[] = [];
    for (const s of daySess) {
      const date = addDays(w.week_start, s.day_of_week);
      if (date < from || date > to) continue;
      lines.push(`- ${GIORNI[s.day_of_week]} ${date} · ${s.discipline} · ${s.title ?? ""} (${s.volume_value ?? "?"})`);
      if (detailed) {
        const st = steps.get(s.id) ?? [];
        for (const b of describeSteps(st, (s.discipline as Discipline) ?? "other", fit!)) {
          lines.push(`    • ${b.label}${b.detail ? `: ${b.detail}` : ""}`);
          for (const c of b.children ?? []) lines.push(`        – ${c.label}${c.detail ? `: ${c.detail}` : ""}`);
        }
        if (s.notes) lines.push(`    Note del coach: ${s.notes}`);
      }
    }
    if (!lines.length) continue;
    out.push(`Settimana del ${w.week_start}${w.coach_comment ? ` — focus: ${w.coach_comment}` : ""}`, ...lines);
  }
  return out.join("\n") || "Nessuna seduta in questo periodo (giorni di riposo).";
}

// ------------------------------------------------------------------- tools
export async function callTool(ctx: Ctx, name: string, args: Json): Promise<string> {
  const { admin, athleteId } = ctx;
  switch (name) {
    case "coach_overview": {
      const [{ data: ai }, { data: races }, fit] = await Promise.all([
        admin.from("ai_athlete_profiles").select("*").eq("athlete_id", athleteId).maybeSingle(),
        admin.from("races").select("name, race_date, distance_label, priority, target_time, location").eq("athlete_id", athleteId).gte("race_date", new Date().toISOString().slice(0, 10)).order("race_date"),
        loadFitness(ctx),
      ]);
      const a = (ai ?? {}) as Json;
      const rest = Array.isArray(a.rest_days) && (a.rest_days as number[]).length ? (a.rest_days as number[]).map((d) => GIORNI[d]).join(", ") : "nessuna preferenza";
      const today = new Date().toISOString().slice(0, 10);
      return [
        `ATLETA: ${ctx.name}${ctx.coach !== "Coach" ? ` · il suo coach si chiama ${ctx.coach}` : ""}`,
        `Sport: ${a.sport ?? "triathlon"} · livello: ${a.experience_level ?? "?"}`,
        `Obiettivo: ${a.goal_notes ?? "—"}`,
        `Gare: ${((races ?? []) as Json[]).map((r) => `${r.name} ${r.race_date} (${r.distance_label ?? "?"}, priorità ${r.priority ?? "?"}, obiettivo ${r.target_time ?? "finire"})`).join("; ") || "nessuna"}`,
        `Soglie: FTP ${fit.ftp_watts ?? "?"} W · FC soglia ${fit.lthr ?? "?"} · FC max ${fit.max_hr ?? "?"} · FC riposo ${fit.resting_hr ?? "?"} · soglia corsa ${fmtPace(fit.threshold_pace_run_s_per_km, "/km")} · CSS nuoto ${fmtPace(fit.css_swim_s_per_100m, "/100m")} · peso ${fit.weight_kg ?? "?"} kg`,
        `Disponibilità: ${a.availability_days ?? "?"} giorni, ~${a.availability_hours ?? "?"} h/settimana · giorni di riposo: ${rest}`,
        a.fixed_constraints ? `Vincoli: ${a.fixed_constraints}` : "",
        readinessText(await freshReadiness(admin as never, athleteId, await loadIntervalsConnection(admin as never, athleteId).catch(() => null)).catch(() => null)),
        "",
        "PROSSIMI 7 GIORNI:",
        await planText(ctx, today, 1, false),
        "",
        "COME FUNZIONA: la tabella viene rivista automaticamente ogni domenica sera in base agli allenamenti svolti e ai messaggi. L'atleta può scrivere al coach in qualsiasi momento (message_coach) o forzare una revisione subito (request_plan_review). Gli allenamenti arrivano sull'orologio tramite Intervals.icu e nel calendario personale. App: https://247coachai.com/atleta",
      ].filter((x) => x !== "").join("\n");
    }
    case "get_plan": {
      const from = typeof args.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(args.from) ? args.from : mondayISO();
      const weeks = Math.min(8, Math.max(1, Number(args.weeks) || 1));
      return planText(ctx, from, weeks, true);
    }
    case "tomorrow_briefing": {
      const m = await eveningMessage(athleteId);
      return m ? m.text.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&") : "Nessun dato.";
    }
    case "get_activities": {
      const days = Math.min(90, Math.max(1, Number(args.days) || 14));
      const since = new Date(Date.now() - days * 864e5).toISOString();
      const { data } = await admin
        .from("icu_activities")
        .select("start_date, discipline, name, distance_m, moving_time_s, elapsed_time_s, average_heartrate, average_watts, average_speed").eq("is_duplicate" as never, false as never)
        .eq("athlete_id", athleteId)
        .gte("start_date", since)
        .order("start_date", { ascending: false })
        .limit(150);
      // Doppioni Garmin+Strava e righe vuote: una riga per uscita.
      const seen = new Set<string>();
      const acts = ((data ?? []) as Json[]).filter((a) => {
        if (!a.distance_m && !a.moving_time_s && !a.elapsed_time_s) return false;
        const k = `${String(a.start_date).slice(0, 16)}|${a.discipline}|${Math.round(Number(a.distance_m ?? 0) / 100)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (!acts.length) return `Nessuna attività negli ultimi ${days} giorni (Intervals.icu collegato? L'atleta può collegarlo da https://247coachai.com/atleta/dispositivi).`;
      const planned = await planText(ctx, addDays(new Date().toISOString().slice(0, 10), -days), Math.ceil(days / 7) + 1, false);
      const rows = acts.map((a) => {
        const d = String(a.discipline ?? "other");
        return `- ${String(a.start_date).slice(0, 16).replace("T", " ")} · ${d} · ${a.name ?? ""} · ${a.distance_m ? `${(Number(a.distance_m) / 1000).toFixed(1)} km` : ""} · ${hms(Number(a.moving_time_s ?? a.elapsed_time_s))}${a.average_heartrate ? ` · FC ${Math.round(Number(a.average_heartrate))}` : ""}${a.average_watts ? ` · ${Math.round(Number(a.average_watts))} W` : ""}${a.average_speed ? ` · ${pace(d, Number(a.average_speed))}` : ""}`;
      });
      return `ATTIVITÀ SVOLTE (ultimi ${days} giorni):\n${rows.join("\n")}\n\nPIANIFICATO NELLO STESSO PERIODO:\n${planned}`;
    }
    case "race_projection": {
      try {
        return (await athletePerformance(admin, athleteId)).text || "Storico insufficiente per una proiezione.";
      } catch {
        return "Storico non disponibile: serve collegare Intervals.icu.";
      }
    }
    case "coach_messages": {
      const limit = Math.min(30, Math.max(1, Number(args.limit) || 10));
      const { data } = await admin
        .from("ai_feedback")
        .select("created_at, message, coach_reply, decision")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(limit);
      const rows = (data ?? []) as Json[];
      if (!rows.length) return "Nessun messaggio ancora.";
      return rows
        .reverse()
        .map((r) => `[${String(r.created_at).slice(0, 16).replace("T", " ")}] Atleta: ${r.message}\n  Coach: ${r.coach_reply ?? "(in revisione)"}${r.decision ? ` · decisione: ${r.decision}` : ""}`)
        .join("\n");
    }
    case "message_coach": {
      const message = String(args.message ?? "").trim().slice(0, 12000);
      if (message.length < 2) throw new Error("Messaggio vuoto.");
      const t = await handleCoachMessage(athleteId, message, "mcp");
      const what = t.decision === "now" ? `${t.coach} sta rivedendo la tabella da domani (pronta in 2-4 minuti); all'atleta arriva un avviso con le modifiche.` : t.decision === "sunday" ? `${t.coach} ne terrà conto nella revisione di domenica sera.` : "Risposta senza modifiche alla tabella.";
      return `Risposta di ${t.coach}: ${t.reply}\n\n${what}`;
    }
    case "save_gym_plan": {
      const plan = String(args.plan ?? "").trim().slice(0, 12000);
      if (plan.length < 20) throw new Error("Scheda vuota.");
      await admin.from("ai_athlete_profiles").update({ gym_plan: plan, gym_plan_at: new Date().toISOString() } as never).eq("athlete_id", athleteId);
      return `Scheda palestra salvata: ${ctx.coach} la userà per tutte le sedute di forza dalla prossima revisione (domenica sera, o subito con request_plan_review).`;
    }
    case "request_plan_review": {
      const note = String(args.note ?? "").trim().slice(0, 12000);
      if (note) await admin.from("ai_feedback").insert({ athlete_id: athleteId, message: `${note} [via Claude/ChatGPT]`, kind: "next_week" } as never);
      const { data } = await admin.from("ai_athlete_profiles").select("ai_generation_started_at").eq("athlete_id", athleteId).maybeSingle();
      const started = (data as { ai_generation_started_at: string | null } | null)?.ai_generation_started_at;
      if (started && Date.now() - new Date(started).getTime() < 10 * 60_000) return "Una revisione è già in corso: la nuova tabella sarà pronta a breve.";
      await admin.from("ai_athlete_profiles").update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null }).eq("athlete_id", athleteId);
      after(async () => {
        try { await weeklyReview(athleteId); } catch (e) { console.error("[mcp] weekly review fallita", (e as Error).message); }
      });
      return "Revisione avviata. La nuova tabella sarà pronta in 2-4 minuti nell'app, sull'orologio e nel calendario. Usa get_plan tra qualche minuto per vederla.";
    }
    default:
      throw new Error(`Tool sconosciuto: ${name}`);
  }
}
