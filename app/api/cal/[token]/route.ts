import { createAdminClient } from "@/lib/supabase/admin";
import { aiAthleteIds } from "@/lib/server/appScope";
import { describeSteps, type StepLite } from "@/lib/training/describe";
import type { Discipline, Fitness } from "@/lib/training/zones";

/**
 * Feed iCal privato dell'atleta: GET /api/cal/<token>.ics
 * L'atleta lo aggiunge una volta a Google Calendar / Apple Calendar / Outlook
 * ("iscriviti da URL") e il calendario si aggiorna da solo quando il piano
 * cambia (revisione domenicale, revisione forzata, modifiche del coach).
 * Il token (profiles.ical_token) è l'unica chiave: niente login.
 */
export const dynamic = "force-dynamic";

const ICON: Record<string, string> = { swim: "🏊", bike: "🚴", run: "🏃", athletics: "🏃", other: "💪" };
const DISC_IT: Record<string, string> = { swim: "Nuoto", bike: "Bici", run: "Corsa", athletics: "Atletica", other: "Forza / altro" };
const DISC_EN: Record<string, string> = { swim: "Swim", bike: "Bike", run: "Run", athletics: "Track", other: "Strength / other" };

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
}
/** Spezza le righe a 75 ottetti come chiede RFC 5545. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let cur = "";
  for (const ch of line) {
    const limit = out.length ? 74 : 75;
    if (Buffer.byteLength(cur + ch, "utf8") > limit) {
      out.push(cur);
      cur = ch;
    } else cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}
function addDays(iso: string, n: number): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token: raw } = await ctx.params;
  const token = raw.replace(/\.ics$/i, "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) return new Response("Not found", { status: 404 });

  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("id, full_name, lang")
    .eq("ical_token" as never, token)
    .maybeSingle();
  const p = prof as { id: string; full_name: string | null; lang: string | null } | null;
  if (!p) return new Response("Not found", { status: 404 });
  // Solo atleti di 24/7 Coach.
  if (!(await aiAthleteIds()).has(p.id)) return new Response("Not found", { status: 404 });
  const en = p.lang === "en";
  const athleteId = p.id;

  // Da 4 settimane fa in avanti: abbastanza storia per il contesto, tutto il futuro.
  const since = new Date(Date.now() - 28 * 864e5).toISOString().slice(0, 10);
  const [{ data: weeks }, { data: fit }, { data: races }] = await Promise.all([
    admin
      .from("training_weeks")
      .select("id, week_start, coach_comment")
      .eq("athlete_id", athleteId)
      .eq("status", "published")
      .gte("week_start", since)
      .order("week_start"),
    admin.from("athlete_fitness").select("*").eq("athlete_id", athleteId).maybeSingle(),
    admin.from("races").select("id, name, race_date, distance_label, target_time, location").eq("athlete_id", athleteId),
  ]);
  const wk = (weeks ?? []) as { id: string; week_start: string; coach_comment: string | null }[];
  const weekById = new Map(wk.map((w) => [w.id, w]));

  type Sess = {
    id: string; week_id: string; day_of_week: number; discipline: string; title: string | null;
    volume_value: string | null; notes: string | null; sort_order: number | null;
  };
  let sessions: Sess[] = [];
  if (wk.length) {
    const { data } = await admin
      .from("sessions")
      .select("id, week_id, day_of_week, discipline, title, volume_value, notes, sort_order")
      .in("week_id", wk.map((w) => w.id));
    sessions = (data ?? []) as Sess[];
  }
  const stepsBy = new Map<string, StepLite[]>();
  if (sessions.length) {
    const ids = sessions.map((s) => s.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await admin.from("session_steps").select("*").in("session_id", ids.slice(i, i + 200));
      for (const st of (data ?? []) as (StepLite & { session_id: string })[]) {
        const arr = stepsBy.get(st.session_id) ?? [];
        arr.push(st);
        stepsBy.set(st.session_id, arr);
      }
    }
  }

  const fitness = (fit ?? {
    max_hr: null, resting_hr: null, lthr: null, threshold_pace_run_s_per_km: null, ftp_watts: null, css_swim_s_per_100m: null,
  }) as Fitness;
  const site = "https://247coachai.com";
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//77OS//24-7 Coach//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(en ? "24/7 Coach · Training" : "24/7 Coach · Allenamenti")}`,
    "X-WR-TIMEZONE:Europe/Rome",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const s of sessions.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))) {
    const w = weekById.get(s.week_id);
    if (!w) continue;
    const day = addDays(w.week_start, s.day_of_week);
    const disc = (DISC_IT[s.discipline] ? s.discipline : "other") as Discipline;
    const summary = `${ICON[disc] ?? "•"} ${s.title || (en ? DISC_EN : DISC_IT)[disc]}${s.volume_value ? ` · ${s.volume_value}` : ""}`;
    const desc: string[] = [];
    const steps = stepsBy.get(s.id) ?? [];
    if (steps.length) {
      for (const b of describeSteps(steps, disc, fitness)) {
        desc.push(`• ${b.label}${b.detail ? `: ${b.detail}` : ""}`);
        for (const c of b.children ?? []) desc.push(`   – ${c.label}${c.detail ? `: ${c.detail}` : ""}`);
      }
    }
    if (s.notes) desc.push("", s.notes);
    if (w.coach_comment) desc.push("", `${en ? "Week focus" : "Focus della settimana"}: ${w.coach_comment}`);
    desc.push("", `${en ? "Open in the app" : "Apri nell'app"}: ${site}/atleta`);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${s.id}@247coachai.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${ymd(day)}`,
      `DTEND;VALUE=DATE:${ymd(addDays(w.week_start, s.day_of_week + 1))}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(desc.join("\n"))}`,
      `URL:${site}/atleta`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }

  for (const r of (races ?? []) as { id: string; name: string; race_date: string; distance_label: string | null; target_time: string | null; location: string | null }[]) {
    if (!r.race_date) continue;
    lines.push(
      "BEGIN:VEVENT",
      `UID:race-${r.id}@247coachai.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${r.race_date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${ymd(addDays(r.race_date, 1))}`,
      `SUMMARY:${esc(`🏁 ${r.name}${r.distance_label ? ` (${r.distance_label})` : ""}`)}`,
      `DESCRIPTION:${esc(`${en ? "Goal" : "Obiettivo"}: ${r.target_time ?? (en ? "finish" : "finire")}`)}`,
      ...(r.location ? [`LOCATION:${esc(r.location)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.map(fold).join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="247coach.ics"',
      "Cache-Control": "no-store",
    },
  });
}
