// ============================================================================
// Sorveglianza atleti "sotto osservazione" (tabella athlete_watch): importa da
// Intervals le attività degli ultimi giorni e, per ognuna nuova, manda al
// titolare su Telegram il confronto con la seduta prevista in tabella.
// GET /api/ai/watch  (cron, Authorization: Bearer CRON_SECRET) o ?secret=
// ============================================================================
import { NextResponse } from "next/server";
import { aiAthleteIds } from "@/lib/server/appScope";
import { tgSend } from "@/lib/notify/athlete";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadIntervalsConnection } from "@/lib/server/intervals";
import { syncIcuActivities } from "@/lib/server/icuSync";

export const maxDuration = 120;

type Act = { icu_activity_id: string; name: string | null; discipline: string; start_date: string | null; distance_m: number | null; moving_time_s: number | null; total_elevation_gain: number | null; average_heartrate: number | null; max_heartrate: number | null; average_speed: number | null; average_watts: number | null; training_load: number | null; trainer: boolean | null };
type Ses = { discipline: string; title: string; volume_value: string | null; notes: string | null };

const DISC_IT: Record<string, string> = { swim: "🏊 Nuoto", bike: "🚴 Bici", run: "🏃 Corsa", other: "🏋️ Altro" };

function fmtDur(s: number | null) {
  if (!s) return "—";
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h}h${String(m).padStart(2, "0")}'` : `${m}'`;
}
function plannedMin(v: string | null): number | null {
  if (!v) return null;
  const h = v.match(/(\d+)\s*h/); const m = v.match(/(\d+)\s*'/);
  if (!h && !m) return null;
  return (h ? +h[1] * 60 : 0) + (m ? +m[1] : 0);
}
function plannedM(v: string | null): number | null {
  const m = v?.match(/(\d+)\s*m\b/); return m ? +m[1] : null;
}
function pace(a: Act) {
  if (!a.average_speed || a.average_speed <= 0) return null;
  if (a.discipline === "run") { const s = 1000 / a.average_speed; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/km`; }
  if (a.discipline === "swim") { const s = 100 / a.average_speed; return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}/100m`; }
  return `${(a.average_speed * 3.6).toFixed(1)} km/h`;
}

const DISC_ACT: Record<string, string> = { run: "la tua corsa", bike: "la tua uscita in bici", swim: "la tua nuotata", other: "il tuo allenamento" };

async function tg(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
  }).catch(() => null);
  return !!r?.ok;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const ok = secret && (url.searchParams.get("secret") === secret || req.headers.get("authorization") === `Bearer ${secret}`);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  const dry = url.searchParams.get("dry") === "1";

  const admin = createAdminClient();
  const ai = await aiAthleteIds();

  // Messaggi del coach in coda (coach_outbox): partono a ogni giro, solo atleti 24/7 Coach.
  // Niente messaggi di notte: la coda parte solo tra le 7 e le 22 (ora italiana).
  const romeH = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", hour: "2-digit", hour12: false }).format(new Date()));
  if (!dry && romeH >= 7 && romeH < 22) {
    const { data: queued } = await admin.from("coach_outbox" as never).select("id, athlete_id, text").is("sent_at", null).order("created_at");
    for (const q of (queued ?? []) as { id: string; athlete_id: string; text: string }[]) {
      if (!ai.has(q.athlete_id)) { await admin.from("coach_outbox" as never).update({ error: "non 247" } as never).eq("id", q.id); continue; }
      const { data: p } = await admin.from("ai_athlete_profiles").select("telegram_chat_id").eq("athlete_id", q.athlete_id).maybeSingle();
      const chat = (p as { telegram_chat_id?: number | string | null } | null)?.telegram_chat_id;
      const sent = chat ? await tgSend(chat, q.text) : false;
      await admin.from("coach_outbox" as never).update((sent ? { sent_at: new Date().toISOString(), error: null } : { error: chat ? "invio fallito" : "telegram non collegato" }) as never).eq("id", q.id);
      if (sent) await admin.from("ai_feedback").insert({ athlete_id: q.athlete_id, message: "[messaggio del coach]", kind: "message", decision: "answer", coach_reply: q.text, consumed_at: new Date().toISOString() } as never);
    }
  }

  const { data: watch } = await admin.from("athlete_watch" as never).select("athlete_id, note");
  // Tutti gli atleti di 24/7 Coach con Intervals collegato: chi è in athlete_watch
  // manda il riepilogo anche al titolare, tutti ricevono il commento del coach su Telegram.
  const watched = new Map(((watch ?? []) as { athlete_id: string; note: string | null }[]).map((w) => [w.athlete_id, w]));
  const { data: icuConns } = await admin.from("intervals_connections").select("athlete_id").eq("enabled", true);
  const ids = new Set<string>([...watched.keys(), ...((icuConns ?? []) as { athlete_id: string }[]).map((c) => c.athlete_id).filter((x) => ai.has(x))]);
  const out: unknown[] = [];

  for (const id of ids) {
    const w = watched.get(id) ?? { athlete_id: id, note: null };
    const conn = await loadIntervalsConnection(admin as never, id);
    if (conn) await syncIcuActivities(admin as never, id, conn, 4).catch(() => null);
    const { data: aip } = await admin.from("ai_athlete_profiles").select("coach_name, telegram_chat_id, rest_days, shadow_plan").eq("athlete_id", id).maybeSingle();
    const ap = (aip ?? {}) as { coach_name?: string | null; telegram_chat_id?: number | null; rest_days?: number[] | null; shadow_plan?: boolean };
    if (ap.shadow_plan) continue; // segue un altro coach: nessun confronto con la tabella 247
    const coach = ap.coach_name?.trim() || "Coach";

    const [{ data: prof }, { data: fit }, { data: acts }, { data: sent }] = await Promise.all([
      admin.from("profiles").select("full_name").eq("id", id).maybeSingle(),
      admin.from("athlete_fitness").select("ftp_watts, lthr, max_hr, threshold_pace_run_s_per_km").eq("athlete_id", id).maybeSingle(),
      admin.from("icu_activities").select("icu_activity_id,name,discipline,start_date,distance_m,moving_time_s,total_elevation_gain,average_heartrate,max_heartrate,average_speed,average_watts,training_load,trainer").eq("is_duplicate" as never, false as never)
        .eq("athlete_id", id).gte("start_date", new Date(Date.now() - 4 * 86400000).toISOString()).order("start_date"),
      admin.from("athlete_watch_log" as never).select("icu_activity_id").eq("athlete_id", id),
    ]);
    const done = new Set(((sent ?? []) as { icu_activity_id: string }[]).map((s) => s.icu_activity_id));
    // Primo giro per un atleta: segna le attività già presenti senza mandare messaggi.
    if (!done.size && !dry) {
      const seed = ((acts ?? []) as Act[]).map((a) => ({ athlete_id: id, icu_activity_id: a.icu_activity_id }));
      if (seed.length) await admin.from("athlete_watch_log" as never).insert(seed as never);
      continue;
    }
    const name = (prof as { full_name?: string } | null)?.full_name ?? "Atleta";
    const f = (fit ?? {}) as { ftp_watts?: number; lthr?: number };

    for (const a of (acts ?? []) as Act[]) {
      if (done.has(a.icu_activity_id) || !a.start_date) continue;
      // Registrazioni di prova o partite per sbaglio (meno di 3 minuti): nessun messaggio.
      if (((a as { moving_time_s?: number | null }).moving_time_s ?? 0) < 180) continue;
      const day = a.start_date.slice(0, 10);
      const d = new Date(day + "T12:00:00Z");
      const dow = (d.getUTCDay() + 6) % 7;
      const monday = new Date(d.getTime() - dow * 86400000).toISOString().slice(0, 10);
      const { data: wk } = await admin.from("training_weeks").select("id").eq("athlete_id", id).eq("week_start", monday).eq("status", "published").order("version", { ascending: false }).limit(1).maybeSingle();
      let plan: Ses[] = [];
      if (wk) {
        const { data: ss } = await admin.from("sessions").select("discipline,title,volume_value,notes").eq("week_id", (wk as { id: string }).id).eq("day_of_week", dow).order("sort_order");
        plan = (ss ?? []) as Ses[];
      }
      const match = plan.find((p) => p.discipline === a.discipline) ?? null;

      const lines: string[] = [];
      lines.push(`📊 ${name} · ${DISC_IT[a.discipline] ?? a.discipline} · ${day}`);
      lines.push(`Fatto: ${fmtDur(a.moving_time_s)}${a.distance_m ? ` · ${(a.distance_m / 1000).toFixed(a.discipline === "swim" ? 2 : 1)} km` : ""}${pace(a) ? ` · ${pace(a)}` : ""}${a.total_elevation_gain ? ` · D+ ${Math.round(a.total_elevation_gain)} m` : ""}`);
      const extra: string[] = [];
      if (a.average_heartrate) extra.push(`FC media ${Math.round(a.average_heartrate)}${f.lthr ? ` (${Math.round((a.average_heartrate / f.lthr) * 100)}% soglia)` : ""}`);
      if (a.max_heartrate) extra.push(`max ${Math.round(a.max_heartrate)}`);
      if (a.average_watts) extra.push(`${Math.round(a.average_watts)} W${f.ftp_watts ? ` (${Math.round((a.average_watts / f.ftp_watts) * 100)}% FTP)` : ""}`);
      if (a.training_load) extra.push(`carico ${Math.round(a.training_load)}`);
      if (extra.length) lines.push(extra.join(" · "));

      if (match) {
        lines.push(`Previsto: ${match.title} (${match.volume_value ?? "—"})`);
        const pm = plannedMin(match.volume_value), pmt = plannedM(match.volume_value);
        if (pm && a.moving_time_s) {
          const pct = Math.round((a.moving_time_s / 60 / pm) * 100);
          lines.push(`Aderenza durata: ${pct}% ${pct < 80 ? "⚠️ sotto" : pct > 120 ? "⚠️ sopra" : "✅"}`);
        } else if (pmt && a.distance_m) {
          const pct = Math.round((a.distance_m / pmt) * 100);
          lines.push(`Aderenza distanza: ${pct}% ${pct < 80 ? "⚠️ sotto" : pct > 120 ? "⚠️ sopra" : "✅"}`);
        }
        if (a.discipline === "run" && f.lthr && a.average_heartrate && a.average_heartrate > f.lthr * 0.95 && /Z1|Z2|facile|aerob/i.test(`${match.title} ${match.notes ?? ""}`) && !/gara|race|test/i.test(match.title ?? "")) {
          lines.push("⚠️ Corsa prevista facile ma FC vicina alla soglia (verifica anche i valori FC del profilo)");
        }
      } else if (plan.length) {
        lines.push(`Previsto oggi: ${plan.map((p) => `${DISC_IT[p.discipline] ?? p.discipline} ${p.title} (${p.volume_value ?? "—"})`).join(" + ")}`);
        lines.push("⚠️ Disciplina diversa dal piano");
      } else {
        lines.push("Fuori programma: nessuna seduta prevista oggi" + ((ap.rest_days ?? []).includes(dow) ? " (era giorno di riposo)" : ""));
      }
      if (w.note) lines.push(`📝 ${w.note}`);

      const text = lines.join("\n");
      out.push({ athlete: name, act: a.icu_activity_id, text });
      // Messaggio all'atleta dal suo coach (Telegram), in seconda persona.
      const mine: string[] = [`👏 <b>${coach}</b>: ho visto ${DISC_ACT[a.discipline] ?? "l'allenamento"} di ${day === new Date().toISOString().slice(0, 10) ? "oggi" : day}.`];
      mine.push(`${fmtDur(a.moving_time_s)}${a.distance_m ? ` · ${(a.distance_m / 1000).toFixed(a.discipline === "swim" ? 2 : 1)} km` : ""}${pace(a) ? ` · ${pace(a)}` : ""}${a.average_heartrate ? ` · FC ${Math.round(a.average_heartrate)}` : ""}${a.average_watts ? ` · ${Math.round(a.average_watts)} W` : ""}`);
      const adh = lines.find((l) => l.startsWith("Aderenza"));
      if (match) mine.push(`In tabella: ${match.title} (${match.volume_value ?? "—"})${adh ? ` · ${adh.replace("Aderenza ", "").replace(/ ✅$/, " ✅ perfetto")}` : ""}`);
      const warn = lines.filter((l) => l.startsWith("⚠️") && !l.includes("verifica anche")).map((l) => l.replace("⚠️ ", "⚠️ "));
      mine.push(...warn);
      if (!match && !plan.length) mine.push("Era fuori programma: ne tengo conto nella revisione.");
      mine.push("", "Com'è andata? Rispondimi qui: sensazioni, fatica, dolori. Se serve adatto la tabella.");

      let delivered = false;
      if (!dry) {
        // Il titolare riceve il riepilogo di ogni allenamento di tutti gli atleti 247.
        delivered = (await tg(text)) || delivered;
        if (ap.telegram_chat_id) delivered = (await tgSend(ap.telegram_chat_id, mine.join("\n"))) || delivered;
        if (delivered) {
          await admin.from("athlete_watch_log" as never).insert({ athlete_id: id, icu_activity_id: a.icu_activity_id } as never);
        }
      }
    }
  }
  return NextResponse.json({ ok: true, sent: out });
}
