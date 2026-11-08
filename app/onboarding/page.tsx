import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAiCoachMode } from "@/lib/ai/mode";
import { saveOnboarding } from "./actions";
import { deleteRace, setRacePriority } from "@/app/atleta/actions";
import { getT } from "@/lib/app-i18n/server";
import LangToggle from "@/components/LangToggle";
import { resolveViewAs } from "@/lib/server/viewAs";
import CalendarFeedCard from "@/components/CalendarFeedCard";
import CoachPrefsCard from "@/components/CoachPrefsCard";
import ReferencePlanCard from "@/components/ReferencePlanCard";

/**
 * Onboarding 24/7 Coach: tutto quello che chiederebbe il miglior personal
 * trainer al primo incontro. Al salvataggio si sblocca la generazione del
 * piano (che legge anche lo storico Garmin/Strava importato via Intervals).
 */
export const maxDuration = 300;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; generating?: string; fb?: string; race?: string; ref?: string; msg?: string }>;
}) {
  if (!isAiCoachMode()) redirect("/atleta");
  const { saved, error, generating, fb, race: raceSlug, ref: refParam, msg: refMsg } = await searchParams;
  const { t, lang } = await getT();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  // Super admin che guarda come un atleta: dati e salvataggi sono dell'atleta.
  const va = await resolveViewAs(supabase, user.id);
  const athleteId = va.athleteId ?? user.id;

  const { data: aiProfData } = await supabase
    .from("ai_athlete_profiles" as never)
    .select("*")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const ai = (aiProfData ?? {}) as Record<string, string | number | null>;
  const done = Boolean(ai.onboarding_completed_at) || Boolean(saved);
  const planReady = Boolean(ai.plan_generated_at);
  const startedAt = ai.ai_generation_started_at ? new Date(String(ai.ai_generation_started_at)).getTime() : null;
  const running = startedAt != null && Date.now() - startedAt < 10 * 60_000;
  const lastError = ai.ai_last_error ? String(ai.ai_last_error) : null;

  // Arrivo dalla pagina di attesa e il piano è pronto → dritto alla tabella.
  if (generating && planReady && !running) redirect("/atleta?plan=ready");

  const { data: racesData } = await supabase
    .from("races")
    .select("id, name, race_date, distance_label, priority, target_time")
    .eq("athlete_id", athleteId)
    .gte("race_date", new Date().toISOString().slice(0, 10))
    .order("race_date");
  const myRaces = (racesData ?? []) as unknown as {
    id: string;
    name: string;
    race_date: string;
    distance_label: string | null;
    priority: string | null;
    target_time: string | null;
  }[];

  // Catalogo gare del sito: l'atleta sceglie la gara obiettivo da qui
  // (preselezionata se arriva dalla CTA "crea la tua tabella" di una scheda gara).
  const { data: catData } = await supabase
    .from("event_races" as never)
    .select("slug, official_name, name, distance, race_date, country")
    .eq("status", "published")
    .gte("race_date", new Date().toISOString().slice(0, 10))
    .order("race_date");
  const catalog = (catData ?? []) as { slug: string; official_name: string | null; name: string; distance: string; race_date: string; country: string | null }[];
  const preRace = raceSlug ? catalog.find((c) => c.slug === raceSlug) ?? null : null;

  const { data: connData } = await supabase
    .from("intervals_connections" as never)
    .select("api_key, intervals_athlete_id")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const conn = (connData ?? null) as { api_key: string; intervals_athlete_id: string | null } | null;

  // Dati fisici/soglie già salvati: la scheda deve rimostrarli (altrimenti
  // sembrano "non memorizzati" a ogni riapertura).
  const { data: fitData } = await supabase
    .from("athlete_fitness")
    .select("birth_date, height_cm, weight_kg, body_fat_pct, resting_hr, max_hr, lthr, ftp_watts, threshold_pace_run_s_per_km, css_swim_s_per_100m")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const fit = (fitData ?? null) as {
    birth_date: string | null; height_cm: number | null; weight_kg: number | null;
    body_fat_pct: number | null; resting_hr: number | null;
    max_hr: number | null; lthr: number | null; ftp_watts: number | null;
    threshold_pace_run_s_per_km: number | null; css_swim_s_per_100m: number | null;
  } | null;
  const secToPace = (s: number | null | undefined) =>
    s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}` : "";
  const numOrEmpty = (n: number | null | undefined) => (n != null ? String(n) : "");

  return (
    <div className="wrap-tight" style={{ maxWidth: 780, margin: "0 auto", paddingTop: 32 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 24 }}>
        <div className="brand">
          <span className="dot">24</span>
          <span className="name">24/7 Coach<em>.</em></span>
        </div>
        <LangToggle lang={lang} />
      </div>

      <div className="hero">
        <div>
          <span className="mono">// ONBOARDING</span>
          <h1>
            {t("Raccontami di")} <em>{t("te")}</em>.
          </h1>
          <p>
            {t("Queste risposte sono quello che il miglior coach ti chiederebbe al primo incontro. Più sei preciso, migliore sarà il piano. Il tuo storico Garmin/Strava lo leggo da solo se colleghi Intervals.")}
          </p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20, display: "grid", gap: 12 }}>
        <span className="mono">{t("// COME FUNZIONA · 10 MINUTI")}</span>
        {[
          ["1", t("Racconti chi sei"), t("Obiettivo, gara, disponibilità e livello: le domande che ti farebbe un coach al primo incontro.")],
          ["2", t("Colleghi il tuo storico"), conn ? t("✓ Intervals già collegato.") : t("Consigliato: con Intervals leggo anni di Garmin/Strava e il piano parte da dati veri. Guida passo-passo in fondo (sezione 5).")],
          ["3", t("Ricevi il piano"), t("In 2-4 minuti scrivo periodizzazione e prime due settimane. Poi lo adatto a come ti alleni davvero.")],
        ].map(([n, title, d]) => (
          <div key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span className="dot" style={{ flex: "none" }}>{n}</span>
            <div><strong>{title}</strong><div style={{ color: "var(--text-2)", fontSize: ".88rem", lineHeight: 1.5 }}>{d}</div></div>
          </div>
        ))}
        {!conn ? <a href="#intervals" className="mono" style={{ textDecoration: "underline" }}>{t("→ Vai subito al collegamento Intervals")}</a> : null}
      </div>

      {error ? (
        <div className="pill err" style={{ marginBottom: 16, whiteSpace: "pre-wrap" }}>
          ✗ {t(error)}
        </div>
      ) : null}

      {running ? (
        <>
          {/* La pagina si ricontrolla da sola finché il piano non è pronto. */}
          <meta httpEquiv="refresh" content="6" />
          <div className="card" style={{ marginBottom: 20, borderTop: "3px solid var(--lime)" }}>
            {fb ? (
              <>
                <strong>{t("💬 Ho letto il tuo messaggio: sto adattando il piano…")}</strong>
                <p style={{ marginTop: 8, color: "var(--text-2)", lineHeight: 1.6 }}>
                  {t("Rivedo le sedute da domani in avanti in base a quello che mi hai scritto, con la stessa cura del piano iniziale: ci vogliono")}
                  <b> {t("2-4 minuti")}</b>. {t("Appena pronto ti porto alla tabella aggiornata, con la spiegazione di cosa ho cambiato e perché.")}
                </p>
              </>
            ) : (
              <>
                <strong>{t("🤖 Sto costruendo il tuo piano…")}</strong>
                <p style={{ marginTop: 8, color: "var(--text-2)", lineHeight: 1.6 }}>
                  {t("Analizzo il tuo storico, l'obiettivo e i vincoli, poi scrivo la periodizzazione e le prime due settimane. Di solito ci vogliono")}
                  <b> {t("2-4 minuti")}</b>. {t("Questa pagina si aggiorna da sola: puoi anche chiuderla e tornare più tardi.")}
                </p>
              </>
            )}
            <div className="progress-track">
              <div className="bar" />
            </div>
            <span className="mono" style={{ display: "block", marginTop: 8, color: "var(--text-3)", fontSize: ".72rem" }}>
              {t("Il coach sta lavorando — la pagina si aggiorna da sola")}
            </span>
          </div>
        </>
      ) : null}

      {lastError && !running ? (
        <div className="pill err" style={{ marginBottom: 16, whiteSpace: "pre-wrap" }}>
          ✗ {t("La generazione non è andata a buon fine:")} {lastError}
          {"\n"}{t("Riprova qui sotto — se succede ancora, scrivi a chi gestisce l'app.")}
        </div>
      ) : null}

      {done && !running ? (
        <div className="card" style={{ marginBottom: 20, borderTop: "3px solid var(--lime)" }}>
          <strong>{t("✓ Dati salvati.")}</strong>
          <p style={{ marginTop: 8, color: "var(--text-2)" }}>
            {planReady
              ? t("Il tuo piano esiste già: rigenerarlo lo ricostruisce da zero sulle prossime due settimane.")
              : t("Ora posso costruire il tuo piano: analizzo storico, obiettivo e vincoli. Premi una volta sola: ci vogliono 2-3 minuti e la pagina ti tiene aggiornato.")}
          </p>
          <form action="/api/ai/generate" method="post" style={{ marginTop: 12 }}>
            <button className="btn btn-primary btn-lg" type="submit">
              🤖 {planReady ? t("Rigenera il piano") : t("Genera il mio piano")}
            </button>
          </form>
          {planReady ? (
            <p className="mono" style={{ marginTop: 10, fontSize: ".78rem" }}>
              <a href="/atleta" style={{ textDecoration: "underline" }}>{t("← Torna al tuo piano")}</a>
            </p>
          ) : null}
        </div>
      ) : null}

      {done ? (() => {
        const main = myRaces.find((r) => r.priority === "A") ?? myRaces[0] ?? null;
        const weeksLeft = main ? Math.max(0, Math.round((new Date(main.race_date).getTime() - Date.now()) / (7 * 86400000))) : null;
        return (
          <div className="card" style={{ marginBottom: 20, borderLeft: "3px solid var(--lime)" }}>
            <span className="mono" style={{ color: "var(--lime)" }}>{t("// IL TUO OBIETTIVO")}</span>
            {main ? (
              <h2 style={{ margin: "6px 0 4px" }}>⭐ {main.name}</h2>
            ) : (
              <h2 style={{ margin: "6px 0 4px" }}>{t("Nessuna gara obiettivo")}</h2>
            )}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "var(--text-2)", fontSize: ".9rem" }}>
              {main ? <span>📅 {main.race_date}{weeksLeft != null ? ` · ${t("tra {n} settimane", { n: weeksLeft })}` : ""}</span> : null}
              {main?.distance_label ? <span>📏 {main.distance_label}</span> : null}
              <span>⏱ {t("Tempo obiettivo")}: <b>{main?.target_time ?? t("non indicato")}</b></span>
              <span>😴 {t("Riposo")}: {Array.isArray(ai.rest_days) && (ai.rest_days as unknown as number[]).length ? (ai.rest_days as unknown as number[]).map((d) => t(["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"][d])).join(", ") : t("lo sceglie il coach")}</span>
              <span>🕒 {t("Disponibilità")}: {ai.availability_hours ?? "—"} {t("h/settimana")} · {t("feriali max")} {ai.weekday_minutes_max ?? "—"}′ · {t("weekend max")} {ai.weekend_hours_max ?? "—"} h</span>
            </div>
            {ai.goal_notes ? <p style={{ margin: "8px 0 0" }}>🎯 {String(ai.goal_notes)}</p> : null}
            {myRaces.length > 1 ? <p className="mono" style={{ margin: "8px 0 0", fontSize: ".8rem", color: "var(--text-2)" }}>{t("Altre gare")}: {myRaces.filter((r) => r !== main).map((r) => `${r.name} (${r.race_date})`).join(" · ")}</p> : null}
            <p className="mono" style={{ margin: "10px 0 0", fontSize: ".8rem" }}>
              ✏️ <a href="#obiettivo" style={{ textDecoration: "underline" }}>{t("Modifica gara e obiettivo")}</a> · <a href="#tempo" style={{ textDecoration: "underline" }}>{t("Modifica disponibilità")}</a> — {t("salvando, il coach ricalibra la tabella da domani.")}
            </p>
          </div>
        );
      })() : null}

      <form action={saveOnboarding}>
        {/* ------------------------------ sport & esperienza */}
        <h2 className="sec"><span className="l">{t("1 · Sport ed esperienza")}</span></h2>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ width: 200 }}>
              <label className="label">{t("Focus")}</label>
              <select className="input" name="sport" defaultValue={String(ai.sport ?? "triathlon")}>
                <option value="triathlon">Triathlon</option>
                <option value="trail">{t("Trail running")}</option>
                <option value="ultra_endurance">{t("Ultra endurance (trail + bici lunga)")}</option>
              </select>
            </div>
            <div className="field" style={{ width: 200 }}>
              <label className="label">{t("Livello")}</label>
              <select className="input" name="experience_level" defaultValue={String(ai.experience_level ?? "")}>
                <option value="">—</option>
                <option value="principiante">{t("Principiante")}</option>
                <option value="intermedio">{t("Intermedio")}</option>
                <option value="avanzato">{t("Avanzato")}</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label className="label">{t("Background (anni di sport, gare fatte, da dove vieni)")}</label>
            <textarea className="input" name="experience_notes" rows={2} defaultValue={String(ai.experience_notes ?? "")} placeholder={t("Es. corro da 5 anni, 2 mezze maratone, primo triathlon l'anno scorso…")} />
          </div>
          <div className="field">
            <label className="label">{t("Infortuni o limitazioni attuali")}</label>
            <textarea className="input" name="injuries" rows={2} defaultValue={String(ai.injuries ?? "")} placeholder={t("Es. fascite plantare a marzo, ora ok; evitare troppa corsa su asfalto")} />
          </div>
        </div>

        {/* ------------------------------ obiettivo */}
        <h2 className="sec" id="obiettivo"><span className="l">{t("2 · Obiettivo")}</span></h2>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label className="label">{t("Raccontami il tuo obiettivo")}</label>
            <textarea className="input" name="goal_notes" rows={2} defaultValue={String(ai.goal_notes ?? "")} placeholder={t("Es. finire il mio primo 70.3 a giugno sotto le 6 ore")} />
          </div>
          {myRaces.length > 0 ? (
            <div>
              <label className="label">{t("Le tue gare in calendario (A ⭐ = obiettivo principale)")}</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {/* I controlli usano l'attributo form= verso mini-form esterni:
                    dentro il form principale non si possono annidare form. */}
                {myRaces.map((r) => (
                  <div
                    key={r.id}
                    style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}
                  >
                    <span className="mono" style={{ fontSize: ".85rem", flex: 1, minWidth: 220 }}>
                      {r.priority === "A" ? "⭐" : "🏁"} {r.name} · {r.race_date}
                      {r.distance_label ? ` · ${r.distance_label}` : ""}
                    </span>
                    <input type="hidden" name="race_id" value={r.id} form={`race-prio-${r.id}`} />
                    <input
                      className="input"
                      name="target_time"
                      defaultValue={r.target_time ?? ""}
                      placeholder={t("tempo obiettivo")}
                      form={`race-prio-${r.id}`}
                      style={{ width: 120, padding: "4px 8px", fontSize: ".8rem" }}
                    />
                    <select
                      className="input"
                      name="priority"
                      defaultValue={r.priority ?? ""}
                      form={`race-prio-${r.id}`}
                      style={{ width: 72, padding: "4px 8px", fontSize: ".8rem" }}
                    >
                      <option value="">—</option>
                      <option value="A">A ⭐</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
                    <button
                      className="btn btn-subtle btn-sm"
                      type="submit"
                      form={`race-prio-${r.id}`}
                      title={t("Salva priorità e tempo obiettivo")}
                    >
                      ✓
                    </button>
                    <input type="hidden" name="race_id" value={r.id} form={`race-del-${r.id}`} />
                    <button
                      className="btn btn-subtle btn-sm"
                      type="submit"
                      form={`race-del-${r.id}`}
                      title={t("Elimina gara")}
                      style={{ color: "var(--rose)" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <div className="field">
            <label className="label">{t("🏁 Scegli la tua gara dal catalogo ({n} gare Ironman e 70.3)", { n: catalog.length })}</label>
            <select className="input" name="catalog_race" defaultValue={preRace?.slug ?? ""}>
              <option value="">{t("— nessuna / la inserisco a mano —")}</option>
              {catalog.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.race_date} · {c.official_name ?? c.name}{c.country ? ` (${c.country})` : ""}
                </option>
              ))}
            </select>
            {preRace ? <span className="pill ok pill-plain" style={{ marginTop: 6 }}>✓ {t("Gara selezionata:")} {preRace.official_name ?? preRace.name} · {preRace.race_date}</span> : null}
          </div>
          <p className="mono" style={{ margin: 0, fontSize: ".82rem" }}>
            📅 <a href="/atleta/calendario" style={{ textDecoration: "underline" }}>
              {t("Scegli le tue gare dal catalogo del circuito Ironman →")}
            </a>{" "}
            <span style={{ color: "var(--text-2)" }}>{t("(poi torna qui)")}</span> {t("— oppure inseriscine una a mano:")}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 180 }}>
              <label className="label">{t("Gara obiettivo (nome)")}</label>
              <input className="input" name="race_name" type="text" placeholder={t("Es. Ironman 70.3 Jesolo")} />
            </div>
            <div className="field" style={{ width: 160 }}>
              <label className="label">{t("Data")}</label>
              <input className="input" name="race_date" type="date" />
            </div>
            <div className="field" style={{ width: 140 }}>
              <label className="label">{t("Distanza")}</label>
              <input className="input" name="race_distance" type="text" placeholder="70.3 / 42km / 25km D+1500" />
            </div>
            <div className="field" style={{ width: 140 }}>
              <label className="label">{t("Tempo obiettivo")}</label>
              <input className="input" name="race_target" type="text" placeholder={t("es. 5h45'")} />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="label">{t("Priorità")}</label>
              <select className="input" name="race_priority" defaultValue="A">
                <option value="A">A ⭐</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
          </div>
        </div>

        {/* ------------------------------ disponibilità */}
        <h2 className="sec" id="tempo"><span className="l">{t("3 · Tempo e mezzi")}</span></h2>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ width: 180 }}>
              <label className="label">{t("Giorni a settimana")}</label>
              <input className="input" name="availability_days" type="number" min={2} max={7} defaultValue={ai.availability_days != null ? String(ai.availability_days) : ""} placeholder="5" />
            </div>
            <div className="field" style={{ width: 180 }}>
              <label className="label">{t("Ore a settimana")}</label>
              <input className="input" name="availability_hours" type="number" step="0.5" min={2} max={25} defaultValue={ai.availability_hours != null ? String(ai.availability_hours) : ""} placeholder="8" />
            </div>
          </div>
          <div className="field">
            <div className="row" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <div className="field" style={{ width: 200 }}>
                <label className="label">{t("Max minuti/seduta lun-ven")}</label>
                <input className="input" name="weekday_minutes_max" type="number" min={20} max={240} defaultValue={ai.weekday_minutes_max != null ? String(ai.weekday_minutes_max) : ""} placeholder="80" />
              </div>
              <div className="field" style={{ width: 200 }}>
                <label className="label">{t("Ore max nel weekend")}</label>
                <input className="input" name="weekend_hours_max" type="number" step="0.5" min={0} max={16} defaultValue={ai.weekend_hours_max != null ? String(ai.weekend_hours_max) : ""} placeholder="5" />
              </div>
              <div className="field" style={{ width: 200 }}>
                <label className="label">{t("Palestra (sedute/sett.)")}</label>
                <input className="input" name="strength_sessions_per_week" type="number" min={0} max={5} defaultValue={ai.strength_sessions_per_week != null ? String(ai.strength_sessions_per_week) : ""} placeholder="2" />
              </div>
            </div>
            <label className="label">{t("Palestra: cosa fai e con chi")}</label>
            <textarea className="input" name="strength_notes" rows={2} defaultValue={String(ai.strength_notes ?? "")} placeholder={t("Es. forza gambe 2x/sett. su scheda della mia trainer, martedì e giovedì")} />
            <label className="label">{t("Giorno di riposo preferito")}</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d, i) => (
                <label key={d} className="chip" style={{ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer" }}>
                  <input type="checkbox" name="rest_days" value={i} defaultChecked={Array.isArray(ai.rest_days) && (ai.rest_days as unknown as number[]).includes(i)} />
                  {t(d)}
                </label>
              ))}
            </div>
            <span className="mono" style={{ color: "var(--text-2)", fontSize: ".74rem" }}>{t("Nessuna spunta = decide il coach. In quel giorno non ci saranno sedute.")}</span>
            <label className="label">{t("Vincoli fissi")}</label>
            <textarea className="input" name="fixed_constraints" rows={2} defaultValue={String(ai.fixed_constraints ?? "")} placeholder={t("Es. piscina solo martedì e giovedì; il lungo solo la domenica; mercoledì riposo")} />
          </div>
          <div className="field">
            <label className="label">{t("Attrezzatura")}</label>
            <textarea className="input" name="equipment" rows={2} defaultValue={String(ai.equipment ?? "")} placeholder={t("Es. bici con rulli smart, palestra, zona collinare per il trail")} />
          </div>
        </div>

        {/* ------------------------------ dati fisici e soglie */}
        <h2 className="sec"><span className="l">{t("4 · Dati fisici e soglie (se le conosci)")}</span></h2>
        <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div className="field" style={{ width: 160 }}>
            <label className="label">{t("Data di nascita")}</label>
            <input className="input" name="birth_date" type="date" defaultValue={fit?.birth_date ?? ""} />
          </div>
          <div className="field" style={{ width: 110 }}>
            <label className="label">{t("Altezza (cm)")}</label>
            <input className="input" name="height_cm" type="number" defaultValue={numOrEmpty(fit?.height_cm)} />
            <label className="label">{t("Peso (kg)")}</label>
            <input className="input" name="weight_kg" type="number" step="0.1" defaultValue={numOrEmpty(fit?.weight_kg)} />
            <label className="label">{t("Massa grassa (%)")}</label>
            <input className="input" name="body_fat_pct" type="number" step="0.5" defaultValue={numOrEmpty(fit?.body_fat_pct)} />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label className="label">{t("FC riposo")}</label>
            <input className="input" name="resting_hr" type="number" defaultValue={numOrEmpty(fit?.resting_hr)} />
          </div>
          <div className="field" style={{ width: 110 }}>
            <label className="label">{t("FC max")}</label>
            <input className="input" name="max_hr" type="number" defaultValue={numOrEmpty(fit?.max_hr)} />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label className="label">{t("FC soglia")}</label>
            <input className="input" name="lthr" type="number" defaultValue={numOrEmpty(fit?.lthr)} />
          </div>
          <div className="field" style={{ width: 130 }}>
            <label className="label">{t("FTP bici (W)")}</label>
            <input className="input" name="ftp_watts" type="number" defaultValue={numOrEmpty(fit?.ftp_watts)} />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">{t("Passo soglia corsa")}</label>
            <input className="input" name="threshold_pace" type="text" placeholder={t("es. 4:30")} defaultValue={secToPace(fit?.threshold_pace_run_s_per_km)} />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">{t("CSS nuoto /100m")}</label>
            <input className="input" name="css_100m" type="text" placeholder={t("es. 1:45")} defaultValue={secToPace(fit?.css_swim_s_per_100m)} />
          </div>
          <span className="mono" style={{ width: "100%", color: "var(--text-2)", fontSize: ".76rem" }}>
            {t("Se non le conosci, nessun problema: il piano inserirà i test per stabilirle.")}
          </span>
        </div>

        {/* ------------------------------ intervals */}
        <h2 className="sec" id="intervals"><span className="l">{t("5 · Collega il tuo storico (Garmin/Strava via Intervals)")}</span></h2>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, color: "var(--text-2)", fontSize: ".92rem", lineHeight: 1.6 }}>
            <b>{t("Cos'è Intervals.icu:")}</b> {t("un servizio gratuito che raccoglie le attività di Garmin, Strava, Polar, Coros, Suunto e le espone in modo sicuro. Io lo uso per due cose:")}{" "}
            <b>{t("leggere il tuo storico")}</b> {t("(volumi, ritmi, potenza, carico) e")}
            <b> {t("mandare gli allenamenti del piano sul tuo orologio")}</b>. {t("Non pubblico nulla e non modifico le tue attività.")}
          </p>
          <ol style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 10, color: "var(--text-2)", fontSize: ".9rem", lineHeight: 1.55 }}>
            <li><b>{t("Crea l'account.")}</b> {t("Vai su")} <a href="https://intervals.icu" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>intervals.icu</a> → <i>Sign up</i>{t(", con email o con Google. È gratis.")}</li>
            <li><b>{t("Collega il tuo dispositivo.")}</b> {t("In Intervals apri l'icona ingranaggio")} <i>Settings</i> → {t("sezione")} <i>Connections</i> {t("e premi")} <i>Connect</i> {t("su")} <b>Garmin</b> {t("(o Strava, Polar, Coros, Suunto). Autorizza l'accesso. Per Garmin spunta anche")} <i>Upload planned workouts</i>{t(": serve a ricevere gli allenamenti sull'orologio.")}</li>
            <li><b>{t("Aspetta l'import.")}</b> {t("Intervals scarica lo storico in qualche minuto (a volte fino a mezz'ora). Se usi Strava, scarica solo ciò che Strava mette a disposizione.")}</li>
            <li><b>{t("Prendi la API key.")}</b> {t("Sempre in")} <i>Settings</i> {t("scorri fino in fondo a")} <i>Developer Settings</i> → <i>Generate API Key</i>. {t("Copiala e incollala qui sotto.")}</li>
            <li><b>{t("Copia il tuo Athlete ID.")}</b> {t("È il codice tipo")} <code>i123456</code> {t("che trovi nella stessa sezione")} <i>Developer Settings</i> {t("e nell'indirizzo del tuo calendario su Intervals. Se lo lasci vuoto funziona lo stesso: con la API key riconosco il tuo account.")}</li>
            <li><b>{t("Premi \"Salva i miei dati\".")}</b> {t("Verifico la chiave e importo le attività. Se qualcosa non torna ti avviso qui in alto.")}</li>
          </ol>
          <a className="btn btn-ghost" href="https://t.me/Coachai247_bot?start=intervals" target="_blank" rel="noreferrer" style={{ alignSelf: "flex-start" }}>
            {t("📲 Ricevi questa guida su Telegram")}
          </a>
          <div className="mono" style={{ color: "var(--text-2)", fontSize: ".74rem", lineHeight: 1.6 }}>
            {t("🔒 La chiave resta salvata solo sul tuo profilo, la puoi rigenerare o revocare da Intervals in qualsiasi momento.")}{" "}
            {t("Puoi anche saltare questo passaggio e collegarlo dopo: il piano parte lo stesso dalle risposte che hai dato, con meno precisione sui carichi iniziali.")}
          </div>
          {conn ? <div className="pill ok">{t("✓ Intervals collegato")}{conn.intervals_athlete_id ? ` (${conn.intervals_athlete_id})` : ""}</div> : null}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: 1, minWidth: 220 }}>
              <label className="label">{t("API key Intervals.icu")}</label>
              <input className="input" name="icu_api_key" type="text" autoComplete="off" defaultValue={conn?.api_key ?? ""} placeholder={t("incolla la API key")} />
            </div>
            <div className="field" style={{ width: 140 }}>
              <label className="label">{t("Athlete ID")}</label>
              <input className="input" name="icu_athlete_id" type="text" defaultValue={conn?.intervals_athlete_id ?? ""} placeholder="i123456" />
            </div>
          </div>
          <label className="mono" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input
              type="checkbox"
              name="push_planned"
              defaultChecked={(conn as { push_planned?: boolean } | null)?.push_planned !== false}
            />
            {t("⌚ Invia gli allenamenti del piano al mio orologio")}
          </label>
          <span className="mono" style={{ color: "var(--text-2)", fontSize: ".72rem" }}>
            {t("Togli la spunta se sull'orologio segui già un altro piano e non vuoi doppioni: leggo comunque le tue attività svolte.")}
          </span>
        </div>

        <div style={{ margin: "20px 0 60px" }}>
          {planReady ? (
            <>
              <input type="hidden" name="regen" value="1" />
              <button className="btn btn-primary btn-lg" type="submit">
                {t("Salva e aggiorna la tabella")} <span className="arrow">→</span>
              </button>
              <p className="mono" style={{ marginTop: 8, fontSize: ".78rem", color: "var(--text-2)" }}>
                {t("Il coach ricalibra le prossime settimane da domani con i nuovi obiettivi e la nuova disponibilità (2-4 minuti). Quello che hai già fatto resta.")}
              </p>
            </>
          ) : (
            <button className="btn btn-primary btn-lg" type="submit">
              {t("Salva i miei dati")} <span className="arrow">→</span>
            </button>
          )}
        </div>
      </form>

      {/* Solo 24/7 Coach: gli atleti di Irene seguono il loro percorso. */}
      {isAiCoachMode() ? (
        <>
          <CoachPrefsCard athleteId={athleteId} t={t} back="/onboarding#coach-prefs" />
          <ReferencePlanCard athleteId={athleteId} t={t} back="/onboarding" status={refParam} msg={refMsg} />
          <CalendarFeedCard athleteId={athleteId} t={t} />
        </>
      ) : null}

      {/* Mini-form esterni per priorità/eliminazione gare (vedi sezione 2). */}
      {myRaces.map((r) => (
        <span key={r.id}>
          <form id={`race-prio-${r.id}`} action={setRacePriority} />
          <form id={`race-del-${r.id}`} action={deleteRace} />
        </span>
      ))}
    </div>
  );
}
