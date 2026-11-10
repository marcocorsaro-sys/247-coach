// Un messaggio dell'atleta al suo coach, da qualunque canale (app, Claude/
// ChatGPT via MCP, Telegram): triage → salva in ai_feedback → se serve,
// revisione del piano in background (che poi notifica l'atleta).
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateInitialPlan, upcomingPlanText } from "@/lib/ai/plan";
import { triageMessage, type Triage } from "@/lib/ai/triage";
import { loadReadiness, readinessText } from "@/lib/server/readiness";
import { recalcRunThresholds } from "@/lib/server/recalcThresholds";
import { verifyCoachReply } from "@/lib/ai/verifyReply";
import { ownerCopyFromAthlete, tgSend } from "@/lib/notify/athlete";

export async function coachName(athleteId: string): Promise<string> {
  const { data } = await createAdminClient().from("ai_athlete_profiles").select("coach_name").eq("athlete_id", athleteId).maybeSingle();
  return (data as { coach_name?: string | null } | null)?.coach_name?.trim() || "Coach";
}

export async function handleCoachMessage(
  athleteId: string,
  message: string,
  source: "app" | "mcp" | "telegram",
): Promise<Triage & { coach: string }> {
  const admin = createAdminClient();
  const [{ data: lp }, coach, upcoming, ready] = await Promise.all([
    admin.from("profiles").select("lang").eq("id", athleteId).maybeSingle(),
    coachName(athleteId),
    upcomingPlanText(admin, athleteId),
    loadReadiness(admin as never, athleteId).catch(() => null),
  ]);
  const lang = (lp as { lang?: string } | null)?.lang === "en" ? "en" : "it";
  // Cosa ha fatto davvero nelle ultime 48 ore (per non dire "va bene" a un lungo il giorno prima della gara).
  const { data: recent } = await admin
    .from("icu_activities")
    .select("start_date, discipline, name, moving_time_s, distance_m, average_heartrate, average_watts, training_load")
    .eq("athlete_id", athleteId)
    .eq("is_duplicate" as never, false as never)
    .gte("start_date", new Date(Date.now() - 48 * 3600_000).toISOString())
    .order("start_date");
  const recentTxt = ((recent ?? []) as { start_date: string; discipline: string; name: string | null; moving_time_s: number | null; distance_m: number | null; average_heartrate: number | null; average_watts: number | null; training_load: number | null }[])
    .filter((a) => (a.moving_time_s ?? 0) >= 180)
    .map((a) => `${new Date(a.start_date).toLocaleString("it-IT", { timeZone: "UTC", weekday: "short", hour: "2-digit", minute: "2-digit" })} ${a.discipline} ${a.name ?? ""} ${Math.round((a.moving_time_s ?? 0) / 60)}'${a.distance_m ? ` ${(a.distance_m / 1000).toFixed(1)} km` : ""}${a.average_heartrate ? ` FC ${Math.round(a.average_heartrate)}` : ""}${a.average_watts ? ` ${Math.round(a.average_watts)} W` : ""}${a.training_load ? ` carico ${Math.round(a.training_load)}` : ""}`)
    .join("; ");
  const todayLabel = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Rome" });
  // Richiesta esplicita di ricalcolo soglie: lo facciamo davvero, dai dati.
  if (/(soglie|soglia|threshold|zone)/i.test(message) && /(ricalcol|ricircol|aggiorn|rivedi|recalc|update)/i.test(message)) {
    const r = await recalcRunThresholds(admin as never, athleteId);
    const reply = r.ok ? r.text : `${r.text} Se vuoi, fai un test (es. 30' a tutta in corsa) e lo uso per aggiornarle.`;
    await admin.from("ai_feedback").insert({ athlete_id: athleteId, message: `${message}${source === "mcp" ? " [via Claude/ChatGPT]" : source === "telegram" ? " [via Telegram]" : ""}`, kind: "message", decision: "answer", coach_reply: reply, consumed_at: new Date().toISOString() } as never);
    return { decision: "answer", reply, coach } as unknown as Triage & { coach: string };
  }
  // Confronti con lo storico: se chiede di gare passate / mezze / maratone / storico,
  // passa al coach le uscite di corsa su distanze da gara (10k, mezza, maratona) degli ultimi 3 anni.
  let historyTxt = "";
  const { data: vp } = await admin.from("ai_athlete_profiles").select("verify_replies").eq("athlete_id", athleteId).maybeSingle();
  const verifyOn = !!(vp as { verify_replies?: boolean } | null)?.verify_replies;
  if (verifyOn || /(mezz|marato|confront|compar|storic|gare|gara|10 ?k|diecimila|record|personale|pb)/i.test(message)) {
    const { data: hist } = await admin
      .from("icu_activities")
      .select("start_date, name, distance_m, moving_time_s, average_heartrate, average_speed")
      .eq("athlete_id", athleteId)
      .eq("is_duplicate" as never, false as never)
      .eq("discipline", "run")
      .gte("start_date", new Date(Date.now() - 3 * 365 * 864e5).toISOString())
      .order("start_date");
    const near = (d: number, x: number) => d >= x * 0.97 && d <= x * 1.06;
    const label = (d: number) => (near(d, 42195) ? "maratona" : near(d, 21097) ? "mezza" : near(d, 10000) ? "10 km" : "");
    const rows = ((hist ?? []) as { start_date: string; name: string | null; distance_m: number | null; moving_time_s: number | null; average_heartrate: number | null; average_speed: number | null }[])
      .filter((a) => a.distance_m && label(Number(a.distance_m)))
      .map((a) => {
        const s = a.moving_time_s ?? 0;
        const p = a.average_speed ? 1000 / Number(a.average_speed) : 0;
        return `${new Date(a.start_date).toLocaleDateString("it-IT", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" })} ${new Date(a.start_date).toLocaleTimeString("it-IT", { timeZone: "UTC", hour: "2-digit", minute: "2-digit" })} [${label(Number(a.distance_m))}] "${a.name ?? ""}" ${(Number(a.distance_m) / 1000).toFixed(2)} km in ${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}'${String(s % 60).padStart(2, "0")}" a ${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}/km${a.average_heartrate ? ` FC media ${Math.round(Number(a.average_heartrate))}` : " FC n.d."}`;
      });
    if (rows.length) historyTxt = `STORICO CORSE SU DISTANZE DA GARA, ultimi 3 anni (dati reali da Intervals; i nomi sono quelli dell'orologio e possono essere generici o sbagliati: riconosci le gare da data, ora e distanza, e se non sei sicuro di quale sia quella citata dall'atleta dillo e chiedi conferma; le distanze GPS sono spesso un po' più lunghe di quella ufficiale): ${rows.join("; ")}`;
  }
  const t = await triageMessage({ message, todayLabel, upcoming, lang, coachName: coach, context: [readinessText(ready), historyTxt, recentTxt ? `ALLENAMENTI SVOLTI NELLE ULTIME 48 ORE (confrontali col piano: se ha fatto molto più o molto meno del previsto, soprattutto vicino a una gara, dillo con franchezza e spiega le conseguenze): ${recentTxt}` : ""].filter(Boolean).join("\n") });
  // Secondo controllo prima dell'invio (atleti con verify_replies).
  let verifyNote: string | null = null;
  if (verifyOn) {
    const { data: fit } = await admin.from("athlete_fitness").select("lthr, max_hr, threshold_pace_run_s_per_km, ftp_w, css_s_per_100m, notes").eq("athlete_id", athleteId).maybeSingle();
    const v = await verifyCoachReply({
      coachName: coach,
      message,
      draft: t.reply,
      decision: t.decision,
      todayLabel,
      upcoming,
      context: [readinessText(ready), recentTxt ? `ALLENAMENTI SVOLTI NELLE ULTIME 48 ORE: ${recentTxt}` : "", historyTxt, fit ? `SOGLIE NEL PROFILO: ${JSON.stringify(fit)}` : ""].filter(Boolean).join("\n"),
    }).catch(() => null);
    if (v && !v.ok && v.reply.trim()) {
      verifyNote = `Bozza corretta: ${v.issues}\n--- bozza originale ---\n${t.reply}`;
      t.reply = v.reply.trim();
    } else if (v) verifyNote = "Bozza verificata: ok";
  }
  const tag = source === "mcp" ? " [via Claude/ChatGPT]" : source === "telegram" ? " [via Telegram]" : "";
  const { error } = await admin.from("ai_feedback").insert({
    athlete_id: athleteId,
    message: `${message}${tag}`,
    kind: t.decision === "sunday" ? "next_week" : "message",
    decision: t.decision,
    coach_reply: t.reply,
    verify_note: verifyNote,
    consumed_at: t.decision === "answer" ? new Date().toISOString() : null,
  } as never);
  if (error) throw new Error(error.message);
  // Il webhook Telegram inoltra già al titolare; dall'app e da Claude/ChatGPT no.
  if (source !== "telegram") await ownerCopyFromAthlete(athleteId, `${message.slice(0, 1500)}${source === "mcp" ? " [via Claude/ChatGPT]" : " [dall'app]"}`);
  // Idea o richiesta di una funzione che non c'è: va al team (Marco) subito.
  if (t.feature_request?.trim()) {
    const { data: pr } = await admin.from("profiles").select("full_name").eq("id", athleteId).maybeSingle();
    const who = (pr as { full_name?: string | null } | null)?.full_name ?? "Atleta";
    await admin.from("feature_requests" as never).insert({ athlete_id: athleteId, request: t.feature_request.trim(), message } as never);
    const owner = process.env.TELEGRAM_CHAT_ID;
    if (owner) await tgSend(owner, `💡 Richiesta funzione da ${who}: ${t.feature_request.trim()}\n\nMessaggio: ${message.slice(0, 400)}`).catch(() => false);
  }
  if (t.decision === "now") {
    await admin.from("ai_athlete_profiles").update({ ai_generation_started_at: new Date().toISOString(), ai_last_error: null }).eq("athlete_id", athleteId);
    after(async () => {
      try {
        await generateInitialPlan(athleteId, { feedback: message });
      } catch (e) {
        console.error("[coach-message] revisione fallita", (e as Error).message);
      }
    });
  }
  return { ...t, coach };
}
