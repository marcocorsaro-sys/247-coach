// ============================================================================
// Messaggi del coach all'atleta: Telegram (se ha collegato il bot) e, in
// alternativa, email (se Resend è configurato). Usato per:
//  - "ho aggiornato la tua tabella" dopo ogni revisione (chat, Claude, domenica)
//  - la buonanotte serale con l'allenamento di domani
// ============================================================================
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/notify/email";
import { describeSteps, type StepLite } from "@/lib/training/describe";
import type { Discipline, Fitness } from "@/lib/training/zones";
import { loadReadiness } from "@/lib/server/readiness";
import { tomorrowWeather } from "@/lib/server/weather";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
const ICON: Record<string, string> = { swim: "🏊", bike: "🚴", run: "🏃", athletics: "🏃", other: "💪" };
const GIORNI_IT = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato", "domenica"];
const GIORNI_EN = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

type Admin = ReturnType<typeof createAdminClient>;
export type AthleteCtx = { athleteId: string; firstName: string; coach: string; lang: "it" | "en"; chatId: number | null; email: string | null; notifyPlan: boolean; notifyEvening: boolean };

export async function tgSend(chatId: number | string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => null);
  return !!r?.ok;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function athleteCtx(admin: Admin, athleteId: string): Promise<AthleteCtx> {
  const [{ data: p }, { data: ai }, au] = await Promise.all([
    admin.from("profiles").select("full_name, lang").eq("id", athleteId).maybeSingle(),
    admin.from("ai_athlete_profiles").select("coach_name, telegram_chat_id, notify_plan, notify_evening").eq("athlete_id", athleteId).maybeSingle(),
    admin.auth.admin.getUserById(athleteId).catch(() => null),
  ]);
  const pp = (p ?? {}) as { full_name?: string | null; lang?: string | null };
  const a = (ai ?? {}) as { coach_name?: string | null; telegram_chat_id?: number | null; notify_plan?: boolean; notify_evening?: boolean };
  return {
    athleteId,
    firstName: (pp.full_name ?? "").split(" ")[0] || "",
    coach: a.coach_name?.trim() || "Coach",
    lang: pp.lang === "en" ? "en" : "it",
    chatId: a.telegram_chat_id ?? null,
    email: au?.data?.user?.email ?? null,
    notifyPlan: a.notify_plan !== false,
    notifyEvening: a.notify_evening !== false,
  };
}

/** Invia su Telegram; se non collegato, via email (se configurata). */
async function deliver(c: AthleteCtx, subject: string, html: string): Promise<"telegram" | "email" | "none"> {
  if (c.chatId && (await tgSend(c.chatId, html))) return "telegram";
  if (c.email) {
    const body = html.replace(/\n/g, "<br>");
    const r = await sendEmail({
      to: c.email,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.55;color:#111">${body}</div>`,
      text: html.replace(/<[^>]+>/g, ""),
      brand: "247",
    });
    if (r.status === "sent") return "email";
  }
  return "none";
}

type Sess = { id: string; date: string; dow: number; discipline: string; title: string | null; volume_value: string | null; notes: string | null };

async function sessionsBetween(admin: Admin, athleteId: string, from: string, to: string): Promise<Sess[]> {
  const { data: wks } = await admin.from("training_weeks").select("id, week_start").eq("athlete_id", athleteId).eq("status", "published").gte("week_start", addDays(from, -6)).lte("week_start", to);
  const ws = (wks ?? []) as { id: string; week_start: string }[];
  if (!ws.length) return [];
  const { data } = await admin.from("sessions").select("id, week_id, day_of_week, discipline, title, volume_value, notes, sort_order").in("week_id", ws.map((w) => w.id));
  const start = new Map(ws.map((w) => [w.id, w.week_start]));
  return ((data ?? []) as (Omit<Sess, "date" | "dow"> & { week_id: string; day_of_week: number; sort_order: number | null })[])
    .map((s) => ({ ...s, dow: s.day_of_week, date: addDays(start.get(s.week_id)!, s.day_of_week), so: s.sort_order ?? 0 }))
    .filter((s) => s.date >= from && s.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || a.so - b.so);
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date());
}

const line = (s: Sess, en: boolean) =>
  `${ICON[s.discipline] ?? "•"} <b>${(en ? GIORNI_EN : GIORNI_IT)[s.dow]}</b> · ${esc(s.title ?? s.discipline)}${s.volume_value ? ` (${esc(s.volume_value)})` : ""}`;

/** Dopo una revisione: cosa ha cambiato il coach e i prossimi 3 giorni. */
export async function notifyPlanUpdated(athleteId: string, opts: { reason?: string; reply?: string } = {}): Promise<string> {
  const admin = createAdminClient();
  const c = await athleteCtx(admin, athleteId);
  if (!c.notifyPlan) return "off";
  const en = c.lang === "en";
  const today = romeToday();
  const next = await sessionsBetween(admin, athleteId, addDays(today, 1), addDays(today, 3));
  const { data: wk } = await admin.from("training_weeks").select("coach_comment").eq("athlete_id", athleteId).eq("status", "published").lte("week_start", addDays(today, 1)).order("week_start", { ascending: false }).limit(1).maybeSingle();
  const focus = (wk as { coach_comment?: string | null } | null)?.coach_comment;
  const parts = [
    en ? `🔄 <b>${esc(c.coach)} updated your plan</b>` : `🔄 <b>${esc(c.coach)} ha aggiornato la tua tabella</b>`,
    opts.reason ? (en ? `You said: <i>“${esc(opts.reason.slice(0, 300))}”</i>` : `Mi avevi scritto: <i>“${esc(opts.reason.slice(0, 300))}”</i>`) : en ? "Weekly review based on your workouts and messages." : "Revisione settimanale sui tuoi allenamenti e messaggi.",
    opts.reply ? esc(opts.reply) : "",
    focus ? `${en ? "Focus" : "Focus"}: ${esc(focus.slice(0, 400))}` : "",
    "",
    next.length ? (en ? "<b>Next days</b>" : "<b>Prossimi giorni</b>") : "",
    ...next.map((s) => line(s, en)),
    "",
    en ? `Already on your watch and calendar. Details: ${APP}/atleta` : `È già sull'orologio e nel calendario. Dettagli: ${APP}/atleta`,
  ].filter((x, i, a) => x !== "" || (i > 0 && a[i - 1] !== ""));
  return deliver(c, en ? `${c.coach} updated your plan` : `${c.coach} ha aggiornato la tua tabella`, parts.join("\n"));
}

/** Buonanotte serale: l'allenamento di domani spiegato + prontezza. */
export async function eveningMessage(athleteId: string): Promise<{ text: string; ctx: AthleteCtx } | null> {
  const admin = createAdminClient();
  const c = await athleteCtx(admin, athleteId);
  const en = c.lang === "en";
  const tomorrow = addDays(romeToday(), 1);
  const ss = await sessionsBetween(admin, athleteId, tomorrow, tomorrow);
  const { data: fit } = await admin.from("athlete_fitness").select("*").eq("athlete_id", athleteId).maybeSingle();
  const f = (fit ?? { max_hr: null, resting_hr: null, lthr: null, threshold_pace_run_s_per_km: null, ftp_watts: null, css_swim_s_per_100m: null }) as Fitness;
  const out: string[] = [en ? `🌙 <b>Good night${c.firstName ? `, ${esc(c.firstName)}` : ""}!</b>` : `🌙 <b>Buonanotte${c.firstName ? ` ${esc(c.firstName)}` : ""}!</b>`];
  if (!ss.length) {
    out.push(en ? "Tomorrow is a <b>rest day</b>: sleep well, eat well, legs up. Recovery is training too." : "Domani <b>riposo</b>: dormi bene, mangia bene, gambe in alto. Anche il recupero è allenamento.");
  } else {
    out.push(en ? "<b>Tomorrow:</b>" : "<b>Domani ti aspetta:</b>");
    const ids = ss.map((s) => s.id);
    const { data: st } = await admin.from("session_steps").select("*").in("session_id", ids);
    const by = new Map<string, StepLite[]>();
    for (const x of (st ?? []) as (StepLite & { session_id: string })[]) by.set(x.session_id, [...(by.get(x.session_id) ?? []), x]);
    for (const s of ss) {
      out.push(line(s, en));
      const blocks = describeSteps(by.get(s.id) ?? [], (s.discipline as Discipline) ?? "other", f).slice(0, 5);
      for (const b of blocks) {
        out.push(`   • ${esc(b.label)}${b.detail ? `: ${esc(b.detail)}` : ""}`);
        for (const ch of b.children ?? []) out.push(`      – ${esc(ch.label)}${ch.detail ? `: ${esc(ch.detail)}` : ""}`);
      }
      if (s.notes) out.push(`   <i>${esc(s.notes.slice(0, 220))}</i>`);
    }
  }
  // Meteo di domani (località scelte dall'atleta: feriali / weekend).
  const { data: wl } = await admin.from("ai_athlete_profiles").select("weather_weekday, weather_weekend").eq("athlete_id", athleteId).maybeSingle();
  const w = (wl ?? {}) as { weather_weekday?: string | null; weather_weekend?: string | null };
  const tDow = (new Date(`${tomorrow}T12:00:00Z`).getUTCDay() + 6) % 7;
  const place = (tDow >= 5 ? w.weather_weekend || w.weather_weekday : w.weather_weekday || w.weather_weekend)?.trim();
  if (place) {
    const meteo = await tomorrowWeather(place, tomorrow);
    if (meteo) out.push("", `${en ? "Weather tomorrow" : "Meteo di domani"}: ${esc(meteo)}`);
  }
  const r = await loadReadiness(admin as never, athleteId).catch(() => null);
  if (r) {
    const tip = r.score < 45 ? (en ? "Recovery has been low: if you wake up tired, tell me and I'll lighten tomorrow." : "Il recupero è basso: se domattina ti svegli stanco scrivimelo e alleggerisco.") : r.score >= 75 ? (en ? "You're well recovered: go for it." : "Sei ben recuperato: domani puoi spingere quanto previsto.") : "";
    out.push("", `${en ? "Readiness today" : "Prontezza di oggi"}: <b>${r.score}/100</b>${tip ? ` · ${tip}` : ""}`);
  }
  out.push("", en ? `Reply here to talk to ${esc(c.coach)}.` : `Rispondi qui per scrivere a ${esc(c.coach)}.`);
  return { text: out.join("\n"), ctx: c };
}

export async function sendEvening(athleteId: string): Promise<string> {
  const m = await eveningMessage(athleteId);
  if (!m || !m.ctx.notifyEvening) return "off";
  return deliver(m.ctx, m.ctx.lang === "en" ? `Tomorrow with ${m.ctx.coach}` : `Domani con ${m.ctx.coach}`, m.text);
}

/** /oggi su Telegram: le sedute di oggi. */
export async function todayMessage(athleteId: string): Promise<string> {
  const admin = createAdminClient();
  const c = await athleteCtx(admin, athleteId);
  const en = c.lang === "en";
  const d = romeToday();
  const ss = await sessionsBetween(admin, athleteId, d, d);
  if (!ss.length) return en ? "Today is a rest day. 😴" : "Oggi riposo. 😴";
  return [en ? "<b>Today:</b>" : "<b>Oggi:</b>", ...ss.map((s) => line(s, en) + (s.notes ? `\n   <i>${esc(s.notes.slice(0, 220))}</i>` : ""))].join("\n");
}
