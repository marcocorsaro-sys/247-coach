import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import type { Tables } from "@/supabase/database.types";
import {
  type Fitness,
  fmtPace,
  paceToKmh,
  ageFromBirth,
  type Zone,
} from "@/lib/training/zones";
import {
  saveFitness,
  addMetric,
  updateMetric,
  deleteMetric,
  saveCustomZones,
  saveIntervalsConnection,
  syncIntervalsActivities,
  pushAllWeeksToDevice,
  cleanupIntervalsEvents,
  addRace,
  deleteRace,
  createPeriod,
  deletePeriod,
} from "./actions";
import { zoneGroups, zonesToText } from "@/lib/training/customZones";
import { loadCustomZones } from "@/lib/server/customZones";
import { loadSkippedSessions } from "@/lib/server/skipped";
import { loadIntervalsConnection, ICU_CHANNELS } from "@/lib/server/intervals";
import { CATEGORY_LABEL } from "@/lib/training/categories";
import { fmtPeriodRange } from "@/lib/training/vacation";
import AthleteTabs from "./AthleteTabs";
import WeeksPanel, { type WeekItem } from "./WeeksPanel";
import CoachNav from "@/components/CoachNav";
import ConfirmButton from "@/components/ConfirmButton";
import StravaActivityList from "@/components/StravaActivityList";
import { type StravaActivityLite, fmtActivityDate } from "@/lib/strava/format";

// Le action di pubblicazione avviano lo strutturatore AI in background
// (after): serve il tempo di una chiamata al modello + il ri-push.
export const maxDuration = 300;

const MESI_SHORT = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
];
const DISC_LABEL: Record<string, string> = {
  swim: "Nuoto",
  bike: "Bici",
  run: "Corsa",
  athletics: "Forza",
  other: "Altro",
};
function fmtDay(d: string | null): string {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getDate()} ${MESI_SHORT[dt.getMonth()]} ${dt.getFullYear()}`;
}
function daysUntil(d: string | null): number | null {
  if (!d) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((new Date(d).getTime() - t.getTime()) / 86_400_000);
}
function ZoneCard({ title, zones }: { title: string; zones: Zone[] }) {
  if (!zones.length) return null;
  return (
    <div className="card">
      <div className="mono" style={{ color: "var(--text-2)", marginBottom: 10 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {zones.map((z) => (
          <div
            key={z.n}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              fontSize: ".88rem",
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--text-2)", whiteSpace: "nowrap" }}>{z.name}</span>
            <strong style={{ textAlign: "right" }}>{z.range}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function AthleteDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { notice, tab } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Il controllo d'accesso e la scheda dell'atleta non dipendono l'uno
  // dall'altra: partono insieme. (C'era anche una lettura del profilo del
  // coach che nessuno usava: un viaggio al database a vuoto.)
  const [allowed, { data: athData }] = await Promise.all([
    canAccessCoachArea(supabase, user.id),
    supabase
      .from("profiles")
      .select("id, full_name, email, level")
      .eq("id", id)
      .single(),
  ]);
  if (!allowed) redirect("/atleta");
  const ath = athData as unknown as Pick<
    Tables<"profiles">,
    "id" | "full_name" | "email" | "level"
  > | null;
  if (!ath) redirect("/coach");

  // Tutto quello che dipende solo dall'atleta parte in un colpo solo. Prima
  // erano dieci viaggi al database uno dietro l'altro, e con il database in
  // un altro continente ogni viaggio costava quanto una query intera.
  const [
    weeksRes,
    racesRes,
    discRes,
    metricsRes,
    fitRes,
    catRes,
    customZones,
    intervals,
    periodsRes,
    icuActRes,
  ] = await Promise.all([
    supabase
      .from("training_weeks")
      .select("id, label, week_start, status")
      .eq("athlete_id", id)
      .order("week_start", { ascending: false }),
    supabase
      .from("races")
      .select("id, name, race_date, location, priority, distance_label, target_time, sport")
      .eq("athlete_id", id)
      .order("race_date", { ascending: true }),
    supabase.from("athlete_disciplines").select("discipline").eq("athlete_id", id),
    supabase
      .from("athlete_metrics")
      .select("id, metric_key, metric_value, metric_text, unit, discipline, recorded_at")
      .eq("athlete_id", id)
      .order("recorded_at", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("athlete_fitness").select("*").eq("athlete_id", id).maybeSingle(),
    supabase.from("athlete_categories").select("category").eq("athlete_id", id),
    loadCustomZones(supabase, id),
    loadIntervalsConnection(supabase, id),
    supabase
      .from("vacation_periods")
      .select("id, label, start_date, end_date, status")
      .eq("athlete_id", id)
      .order("start_date", { ascending: false }),
    supabase
      .from("icu_activities")
      .select(
        "id, name, sport_type, discipline, start_date, distance_m, moving_time_s, average_heartrate, total_elevation_gain, average_watts",
      ).eq("is_duplicate" as never, false as never)
      .eq("athlete_id", id)
      .order("start_date", { ascending: false })
      .limit(20),
  ]);
  const categories = ((catRes.data ?? []) as unknown as { category: string }[]).map(
    (c) => c.category,
  );

  const weeks = (weeksRes.data ?? []) as unknown as Pick<
    Tables<"training_weeks">,
    "id" | "label" | "week_start" | "status"
  >[];
  const races = (racesRes.data ?? []) as unknown as Pick<
    Tables<"races">,
    "id" | "name" | "race_date" | "location" | "priority" | "distance_label" | "target_time" | "sport"
  >[];
  const disciplines = ((discRes.data ?? []) as unknown as { discipline: string }[]).map(
    (d) => d.discipline,
  );
  const metrics = (metricsRes.data ?? []) as unknown as Pick<
    Tables<"athlete_metrics">,
    "id" | "metric_key" | "metric_value" | "metric_text" | "unit" | "discipline" | "recorded_at"
  >[];
  const fit = (fitRes.data ?? null) as unknown as Tables<"athlete_fitness"> | null;

  // Mini-preview: discipline per giorno, per ogni settimana (oggetto serializzabile).
  const previewByWeek = new Map<string, Record<number, string[]>>();
  if (weeks.length > 0) {
    const { data: sessData } = await supabase
      .from("sessions")
      .select("week_id, day_of_week, discipline")
      .in("week_id", weeks.map((w) => w.id));
    const sessRows = (sessData ?? []) as unknown as {
      week_id: string;
      day_of_week: number;
      discipline: string;
    }[];
    for (const r of sessRows) {
      let byDay = previewByWeek.get(r.week_id);
      if (!byDay) {
        byDay = {};
        previewByWeek.set(r.week_id, byDay);
      }
      const arr = byDay[r.day_of_week] ?? [];
      if (!arr.includes(r.discipline)) arr.push(r.discipline);
      byDay[r.day_of_week] = arr;
    }
  }

  const weekItems: WeekItem[] = weeks.map((w) => ({
    id: w.id,
    week_start: w.week_start,
    status: w.status,
    byDay: previewByWeek.get(w.id) ?? {},
  }));

  // --- Periodi flessibili / ferie ---
  const periods = (periodsRes.data ?? []) as unknown as Pick<
    Tables<"vacation_periods">,
    "id" | "label" | "start_date" | "end_date" | "status"
  >[];

  // --- Attività svolte via Intervals.icu (qualunque piattaforma) ---
  const icuActivities = (icuActRes.data ?? []) as unknown as StravaActivityLite[];

  const f: Fitness = {
    max_hr: fit?.max_hr ?? null,
    resting_hr: fit?.resting_hr ?? null,
    lthr: fit?.lthr ?? null,
    threshold_pace_run_s_per_km: fit?.threshold_pace_run_s_per_km ?? null,
    ftp_watts: fit?.ftp_watts ?? null,
    css_swim_s_per_100m: fit?.css_swim_s_per_100m ?? null,
    swim_test_400_s: fit?.swim_test_400_s ?? null,
    zone_model: fit?.zone_model ?? "standard",
  };
  const age = ageFromBirth(fit?.birth_date ?? null);

  // Prossima gara (la prima futura, altrimenti la prima in lista).
  const nextRace =
    races.find((r) => {
      const du = daysUntil(r.race_date);
      return du != null && du >= 0;
    }) ?? null;
  const nextRaceDays = nextRace ? daysUntil(nextRace.race_date) : null;

  // -------------------- BARRA CONTESTO --------------------
  const chips: { label: string; value: string }[] = [];
  if (f.ftp_watts != null) chips.push({ label: "FTP", value: `${f.ftp_watts} W` });
  if (f.lthr != null) chips.push({ label: "LTHR", value: `${f.lthr} bpm` });
  if (f.threshold_pace_run_s_per_km != null)
    chips.push({ label: "Soglia /km", value: fmtPace(f.threshold_pace_run_s_per_km) });
  if (f.css_swim_s_per_100m != null)
    chips.push({ label: "CSS /100m", value: fmtPace(f.css_swim_s_per_100m) });

  const contextBar = (
    <>
      <div className="ctx-id">
        <span className="mono">// ATLETA</span>
        <strong>{ath.full_name ?? ath.email}</strong>
      </div>
      <div className="ctx-chips">
        {chips.length > 0 ? (
          chips.map((c) => (
            <span className="ctx-chip" key={c.label}>
              <b>{c.value}</b>
              <span>{c.label}</span>
            </span>
          ))
        ) : (
          <span className="ctx-chip muted-chip">Scheda fisiologica incompleta</span>
        )}
      </div>
      {nextRace ? (
        <div className={`ctx-race priority-${nextRace.priority ?? "C"}`}>
          <div className="n">{nextRaceDays}</div>
          <div className="d">
            <span className="t">{nextRace.name}</span>
            <span className="w">
              giorni{nextRace.priority ? ` · gara ${nextRace.priority}` : ""}
            </span>
          </div>
        </div>
      ) : null}
    </>
  );

  // -------------------- TAB: TABELLE --------------------
  const skippedList = await loadSkippedSessions(supabase, id);
  const tabelleContent = <WeeksPanel athleteId={id} weeks={weekItems} />;

  // -------------------- TAB: FERIE --------------------
  const STATUS_PILL: Record<string, { cls: string; text: string }> = {
    published: { cls: "ok", text: "Pubblicato" },
    draft: { cls: "", text: "Bozza" },
    archived: { cls: "", text: "Archiviato" },
  };
  const ferieContent = (
    <>
      <h2 className="sec"><span className="l">Periodi flessibili / ferie</span></h2>
      <p style={{ color: "var(--text-2)", marginTop: -4, marginBottom: 12, fontSize: ".9rem" }}>
        Nei periodi di ferie crei un <strong>roaster</strong> di allenamenti (Nuoto 1, Bike lunga…)
        e assegni a ogni giorno solo la disciplina: l&apos;atleta sceglie dal menu quello che preferisce.
      </p>
      {periods.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {periods.map((p) => {
            const st = STATUS_PILL[p.status] ?? STATUS_PILL.draft;
            return (
              <div className="card" key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <strong>{p.label ?? "Ferie"}</strong>
                  <div className="mono" style={{ color: "var(--text-2)", marginTop: 2, fontSize: ".82rem" }}>
                    {fmtPeriodRange(p.start_date, p.end_date)}
                  </div>
                </div>
                <span className={`pill ${st.cls}`}>{st.text}</span>
                <Link className="btn btn-subtle btn-sm" href={`/coach/ferie/${p.id}`}>Apri</Link>
                <form action={deletePeriod}>
                  <input type="hidden" name="athlete_id" value={id} />
                  <input type="hidden" name="period_id" value={p.id} />
                  <ConfirmButton
                    message={`Eliminare il periodo "${p.label ?? "Ferie"}"?`}
                    className="btn btn-subtle btn-sm"
                    style={{ color: "var(--rose)" }}
                  >
                    ✕
                  </ConfirmButton>
                </form>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessun periodo di ferie. Creane uno qui sotto.
        </div>
      )}

      <form action={createPeriod}>
        <input type="hidden" name="athlete_id" value={id} />
        <div className="card" style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label">Etichetta</label>
            <input className="input" name="label" type="text" placeholder="Ferie agosto" />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">Inizio</label>
            <input className="input" name="start_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">Fine</label>
            <input className="input" name="end_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <button className="btn btn-primary" type="submit">+ Crea periodo</button>
        </div>
      </form>
    </>
  );

  // -------------------- TAB: SCHEDA & ZONE --------------------
  const schedaContent = (
    <>
      <h2 className="sec">
        <span className="l">Scheda fisiologica</span>
      </h2>
      <form action={saveFitness}>
        <input type="hidden" name="athlete_id" value={id} />
        <div className="card" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "flex-end",
              marginBottom: 14,
              paddingBottom: 14,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div className="field" style={{ width: 230 }}>
              <label className="label">Modello zone</label>
              <select
                className="input"
                name="zone_model"
                defaultValue={fit?.zone_model ?? "standard"}
              >
                <option value="standard">Standard (Coggan/Friel)</option>
                <option value="irene">Irene (Trisutto / Calcolo_TEST)</option>
              </select>
            </div>
            <span className="mono" style={{ color: "var(--text-2)", fontSize: ".78rem", flex: 1, minWidth: 200 }}>
              Il modello <strong>Irene</strong> calcola le zone come il foglio
              Calcolo_TEST: FTP = watt medi 20&apos; −5%, corsa in % dell&apos;andatura
              media del test, nuoto dal test 400m.
            </span>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ width: 150 }}>
              <label className="label">Data di nascita</label>
              <input
                className="input"
                type="date"
                name="birth_date"
                defaultValue={fit?.birth_date ?? ""}
              />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="label">Sesso</label>
              <select className="input" name="sex" defaultValue={fit?.sex ?? ""}>
                <option value="">—</option>
                <option value="M">M</option>
                <option value="F">F</option>
                <option value="X">X</option>
              </select>
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="label">Peso (kg)</label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                name="weight_kg"
                defaultValue={fit?.weight_kg ?? ""}
              />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="label">Altezza (cm)</label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                name="height_cm"
                defaultValue={fit?.height_cm ?? ""}
              />
            </div>
            <div className="field" style={{ width: 110 }}>
              <label className="label">VO2max</label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                name="vo2max"
                defaultValue={fit?.vo2max ?? ""}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
            <div className="field" style={{ width: 130 }}>
              <label className="label">FC riposo</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                name="resting_hr"
                defaultValue={fit?.resting_hr ?? ""}
              />
            </div>
            <div className="field" style={{ width: 130 }}>
              <label className="label">FC max</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                name="max_hr"
                defaultValue={fit?.max_hr ?? ""}
              />
            </div>
            <div className="field" style={{ width: 150 }}>
              <label className="label">FC soglia (LTHR)</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                name="lthr"
                defaultValue={fit?.lthr ?? ""}
              />
            </div>
            <div className="field" style={{ width: 190 }}>
              <label className="label">Velocità media test 3/4km (km/h)</label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                name="run_speed_kmh"
                placeholder="es. 12.5"
                defaultValue={(() => {
                  const kmh = paceToKmh(fit?.threshold_pace_run_s_per_km);
                  return kmh ? kmh.toFixed(1) : "";
                })()}
              />
              <span className="mono" style={{ marginTop: 4 }}>
                Modello Irene: velocità media del test 3/4km → zone in km/h
              </span>
            </div>
            <div className="field" style={{ width: 170 }}>
              <label className="label">…oppure passo corsa (/km)</label>
              <input
                className="input"
                type="text"
                name="threshold_pace_run"
                placeholder="4:48"
              />
              <span className="mono" style={{ marginTop: 4 }}>
                Alternativa al km/h (se preferisci il passo). La velocità ha la precedenza.
              </span>
            </div>
            <div className="field" style={{ width: 150 }}>
              <label className="label">Watt medi test 20&apos;</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                name="ftp_watt_medi"
                placeholder="es. 250"
              />
              <span className="mono" style={{ marginTop: 4 }}>
                → FTP = watt medi −5%
              </span>
            </div>
            <div className="field" style={{ width: 130 }}>
              <label className="label">FTP bici (W)</label>
              <input
                className="input"
                type="text"
                inputMode="numeric"
                name="ftp_watts"
                defaultValue={fit?.ftp_watts ?? ""}
              />
              <span className="mono" style={{ marginTop: 4 }}>
                o diretto (se non usi i watt medi)
              </span>
            </div>
            <div className="field" style={{ width: 160 }}>
              <label className="label">CSS nuoto (/100m)</label>
              <input
                className="input"
                type="text"
                name="css_swim"
                placeholder="1:40"
                defaultValue={
                  fit?.css_swim_s_per_100m ? fmtPace(fit.css_swim_s_per_100m) : ""
                }
              />
            </div>
            <div className="field" style={{ width: 160 }}>
              <label className="label">Test nuoto 400m (mm:ss)</label>
              <input
                className="input"
                type="text"
                name="swim_test_400"
                placeholder="8:02"
                defaultValue={
                  fit?.swim_test_400_s ? fmtPace(fit.swim_test_400_s) : ""
                }
              />
              <span className="mono" style={{ marginTop: 4 }}>
                base zone nuoto (modello Irene)
              </span>
            </div>
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label className="label">Note</label>
            <textarea
              className="input"
              name="notes"
              rows={2}
              defaultValue={fit?.notes ?? ""}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <button className="btn btn-primary" type="submit">
              Salva scheda
            </button>
          </div>
        </div>
      </form>

      {(() => {
        const groups = zoneGroups(f, customZones);
        if (!groups.length) {
          return (
            <div className="card" style={{ color: "var(--text-2)", textAlign: "center" }}>
              Inserisci FC soglia, passo soglia, FTP o CSS per calcolare le zone,
              oppure incolla i tuoi range qui sotto.
            </div>
          );
        }
        return (
          <div className="grid-2">
            {groups.map((g) => (
              <ZoneCard key={g.title} title={g.title} zones={g.zones} />
            ))}
          </div>
        );
      })()}

      {/* ---- Range personalizzati (copia-incolla) ---- */}
      <h2 className="sec">
        <span className="l">Range personalizzati</span>
      </h2>
      <div className="card" style={{ marginBottom: 12 }}>
        <p className="mono" style={{ color: "var(--text-2)", fontSize: ".82rem", margin: 0 }}>
          Incolla qui i range che calcoli tu (una zona per riga): hanno la{" "}
          <strong>precedenza</strong> sui valori calcolati e vengono mostrati
          all&apos;atleta <strong>esattamente così</strong>. Formato:{" "}
          <code>NOME</code> + range, es. <code>FL 5:04-4:45</code> ·{" "}
          <code>SA 150-162 bpm</code> · <code>VO2Max &gt; 4:00</code>. Lascia
          vuoto e salva per tornare ai valori calcolati.
        </p>
      </div>
      <div className="grid-3">
        {([
          ["run", "Corsa"],
          ["bike", "Bici"],
          ["swim", "Nuoto"],
        ] as [string, string][]).map(([disc, label]) => (
          <form action={saveCustomZones} className="card" key={disc}>
            <input type="hidden" name="athlete_id" value={id} />
            <input type="hidden" name="discipline" value={disc} />
            <div className="mono" style={{ color: "var(--text-2)", marginBottom: 8 }}>
              // {label.toUpperCase()}
              {customZones[disc]?.length ? (
                <span className="pill ok pill-plain" style={{ marginLeft: 8 }}>
                  attivo
                </span>
              ) : null}
            </div>
            <textarea
              className="input"
              name="zones_text"
              rows={6}
              placeholder={"FR  < 5:30\nFL  5:04-4:45\nFM  4:44-4:20\nSA  4:19-4:05\nVO2Max  < 4:05"}
              defaultValue={zonesToText(customZones[disc] ?? [])}
              style={{ resize: "vertical", fontFamily: "inherit", whiteSpace: "pre" }}
            />
            <button className="btn btn-primary btn-sm" type="submit" style={{ marginTop: 8 }}>
              Salva range {label.toLowerCase()}
            </button>
          </form>
        ))}
      </div>
    </>
  );

  // -------------------- TAB: DISPOSITIVI --------------------
  const dispositiviContent = (
    <>
      {/* ---------------- GARMIN via INTERVALS.ICU ---------------- */}
      <h2 className="sec">
        <span className="l">Dispositivi — Garmin, Polar, Suunto… (via Intervals.icu)</span>
        {intervals?.last_ok_at ? (
          <span className="pill ok pill-plain" style={{ marginLeft: 10 }}>
            collegato
          </span>
        ) : intervals ? (
          <span className="pill warn pill-plain" style={{ marginLeft: 10 }}>
            da verificare
          </span>
        ) : null}
      </h2>
      <form action={saveIntervalsConnection} className="card">
        <input type="hidden" name="athlete_id" value={id} />
        <p className="mono" style={{ color: "var(--text-2)", fontSize: ".82rem", marginTop: 0 }}>
          Ponte verso i dispositivi dell&apos;atleta: gli allenamenti pubblicati
          partono su Intervals.icu, che li sincronizza sull&apos;orologio
          (Garmin/Suunto/COROS/Wahoo), e le attività svolte tornano qui da
          qualunque piattaforma (anche Polar e Strava). Prerequisito: l&apos;atleta
          ha un account <b>Intervals.icu</b> con il suo dispositivo collegato lì e
          l&apos;opzione <b>&quot;Upload planned workouts&quot;</b> attiva. La API key
          è in Intervals → <b>Settings → Developer</b>.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 8 }}>
          <div className="field" style={{ flex: 1, minWidth: 220 }}>
            <label className="label">API key Intervals.icu</label>
            <input
              className="input"
              name="api_key"
              type="text"
              autoComplete="off"
              placeholder={intervals ? "•••••• (invariata se lasci vuoto per scollegare)" : "incolla la API key"}
              defaultValue={intervals?.api_key ?? ""}
            />
          </div>
          <div className="field" style={{ width: 160 }}>
            <label className="label">Athlete ID</label>
            <input
              className="input"
              name="intervals_athlete_id"
              type="text"
              placeholder="i123456"
              defaultValue={intervals?.intervals_athlete_id ?? ""}
            />
          </div>
          <button className="btn btn-primary" type="submit">
            {intervals ? "Aggiorna" : "Collega"}
          </button>
        </div>
        <div style={{ marginTop: 12 }}>
          <label className="label">
            Dispositivi dell&apos;atleta (informativo — il collegamento si fa sul suo intervals.icu)
          </label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 6 }}>
            {ICU_CHANNELS.map(([value, label]) => (
              <label
                key={value}
                className="mono"
                style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  name="channels"
                  value={value}
                  defaultChecked={(intervals?.channels ?? "").toLowerCase().includes(value)}
                />{" "}
                {label}
              </label>
            ))}
          </div>
          <div className="mono" style={{ color: "var(--text-2)", fontSize: ".72rem", marginTop: 8 }}>
            Pianificati sull&apos;orologio: Garmin, Suunto, COROS, Wahoo (Polar riceve
            solo gli svolti). Svuota la API key e salva per scollegare.
          </div>
        </div>
      </form>
      {intervals ? (
        <>
          <form action={pushAllWeeksToDevice} style={{ marginTop: 10 }}>
            <input type="hidden" name="athlete_id" value={id} />
            <button className="btn btn-subtle btn-sm" type="submit">
              ⌚ Invia al dispositivo tutte le settimane pubblicate (da questa in poi)
            </button>
          </form>
          <form action={cleanupIntervalsEvents} style={{ marginTop: 8 }}>
            <input type="hidden" name="athlete_id" value={id} />
            <button
              className="btn btn-subtle btn-sm"
              type="submit"
              title="Cancella da Intervals tutti gli allenamenti inviati da noi e li reinvia puliti: risolve i doppioni su Garmin"
            >
              🧹 Ripulisci duplicati su Intervals/Garmin
            </button>
          </form>
        </>
      ) : null}
    </>
  );

  // -------------------- TAB: TEST & GARE --------------------
  const testGareContent = (
    <>
      {/* ---------------- TEST FISICI ---------------- */}
      <h2 className="sec">
        <span className="l">Test fisici</span>
      </h2>
      {metrics.length > 0 ? (
        <div className="grid-3">
          {metrics.map((m) => (
            <div className="card" key={m.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div className="v lime" style={{ fontSize: "1.4rem" }}>
                  {m.metric_value ?? m.metric_text ?? "—"}
                  {m.unit ? <span style={{ fontSize: ".9rem" }}> {m.unit}</span> : null}
                </div>
                <form action={deleteMetric}>
                  <input type="hidden" name="athlete_id" value={id} />
                  <input type="hidden" name="metric_id" value={m.id} />
                  <ConfirmButton
                    message="Eliminare questo test/soglia?"
                    className="btn btn-subtle btn-sm"
                    style={{ color: "var(--rose)" }}
                  >
                    ✕
                  </ConfirmButton>
                </form>
              </div>
              <div className="l" style={{ marginTop: 6 }}>
                {m.metric_key}
                {m.discipline ? ` · ${DISC_LABEL[m.discipline] ?? m.discipline}` : ""}
              </div>
              <div className="mono" style={{ color: "var(--text-2)", marginTop: 4 }}>
                {fmtDay(m.recorded_at)}
              </div>

              <details style={{ marginTop: 8 }}>
                <summary className="mono" style={{ cursor: "pointer", color: "var(--text-2)", fontSize: ".78rem" }}>
                  ✎ Modifica
                </summary>
                <form action={updateMetric} style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <input type="hidden" name="athlete_id" value={id} />
                  <input type="hidden" name="metric_id" value={m.id} />
                  <div className="field">
                    <label className="label">Test / soglia</label>
                    <input className="input" name="metric_key" type="text" defaultValue={m.metric_key} />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div className="field" style={{ flex: 1, minWidth: 90 }}>
                      <label className="label">Valore</label>
                      <input
                        className="input"
                        name="metric_value"
                        type="text"
                        defaultValue={
                          m.metric_value != null ? String(m.metric_value) : (m.metric_text ?? "")
                        }
                      />
                    </div>
                    <div className="field" style={{ width: 80 }}>
                      <label className="label">Unità</label>
                      <input className="input" name="unit" type="text" defaultValue={m.unit ?? ""} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <div className="field" style={{ flex: 1, minWidth: 110 }}>
                      <label className="label">Disciplina</label>
                      <select className="input" name="discipline" defaultValue={m.discipline ?? ""}>
                        <option value="">—</option>
                        <option value="run">Corsa</option>
                        <option value="bike">Bici</option>
                        <option value="swim">Nuoto</option>
                        <option value="athletics">Forza</option>
                        <option value="other">Altro</option>
                      </select>
                    </div>
                    <div className="field" style={{ flex: 1, minWidth: 130 }}>
                      <label className="label">Data</label>
                      <input
                        className="input"
                        name="recorded_at"
                        type="date"
                        defaultValue={m.recorded_at ? m.recorded_at.slice(0, 10) : ""}
                      />
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" type="submit">
                    Salva modifiche
                  </button>
                </form>
              </details>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessun test/soglia registrato.
        </div>
      )}

      <form action={addMetric}>
        <input type="hidden" name="athlete_id" value={id} />
        <div
          className="card"
          style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label">Test / soglia</label>
            <input className="input" name="metric_key" type="text" placeholder="Es. Test soglia 5km" />
          </div>
          <div className="field" style={{ width: 130 }}>
            <label className="label">Valore</label>
            <input className="input" name="metric_value" type="text" placeholder="150 o 5:04" />
            <span className="mono" style={{ marginTop: 4, fontSize: ".72rem", color: "var(--text-2)" }}>
              numero (150) o passo (5:04)
            </span>
          </div>
          <div className="field" style={{ width: 90 }}>
            <label className="label">Unità</label>
            <input className="input" name="unit" type="text" placeholder="bpm · /km" />
          </div>
          <div className="field" style={{ width: 130 }}>
            <label className="label">Disciplina</label>
            <select className="input" name="discipline" defaultValue="">
              <option value="">—</option>
              <option value="run">Corsa</option>
              <option value="bike">Bici</option>
              <option value="swim">Nuoto</option>
              <option value="athletics">Forza</option>
              <option value="other">Altro</option>
            </select>
          </div>
          <div className="field" style={{ width: 150 }}>
            <label className="label">Data</label>
            <input className="input" name="recorded_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <button className="btn btn-primary" type="submit">
            + Aggiungi test
          </button>
        </div>
      </form>

      {/* ---------------- GARE ---------------- */}
      <h2 className="sec">
        <span className="l">Gare obiettivo</span>
      </h2>
      {races.length > 0 ? (
        <div className="grid-3">
          {races.map((r) => (
            <div className="card" key={r.id}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{r.name}</strong>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {r.priority ? (
                    <span className="pill violet pill-plain">{r.priority}</span>
                  ) : null}
                  <form action={deleteRace}>
                    <input type="hidden" name="athlete_id" value={id} />
                    <input type="hidden" name="race_id" value={r.id} />
                    <ConfirmButton
                      message={`Eliminare la gara "${r.name}"?`}
                      className="btn btn-subtle btn-sm"
                      style={{ color: "var(--rose)" }}
                    >
                      ✕
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              <div className="mono" style={{ marginTop: 8, color: "var(--text-2)" }}>
                {r.location ? `${r.location} · ` : ""}
                {fmtDay(r.race_date)}
              </div>
              {(r.distance_label || r.target_time) ? (
                <div style={{ marginTop: 6, fontSize: ".85rem", color: "var(--text-2)" }}>
                  {r.distance_label ?? ""}
                  {r.distance_label && r.target_time ? " · obiettivo " : ""}
                  {r.target_time ?? ""}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Nessuna gara obiettivo.
        </div>
      )}

      <form action={addRace}>
        <input type="hidden" name="athlete_id" value={id} />
        <div
          className="card"
          style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}
        >
          <div className="field" style={{ flex: 1, minWidth: 160 }}>
            <label className="label">Nome gara</label>
            <input className="input" name="name" type="text" />
          </div>
          <div className="field" style={{ width: 150 }}>
            <label className="label">Data</label>
            <input className="input" name="race_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="field" style={{ width: 140 }}>
            <label className="label">Luogo</label>
            <input className="input" name="location" type="text" />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label className="label">Distanza</label>
            <input className="input" name="distance_label" type="text" placeholder="10 km" />
          </div>
          <div className="field" style={{ width: 120 }}>
            <label className="label">Obiettivo</label>
            <input className="input" name="target_time" type="text" placeholder="42:00" />
          </div>
          <div className="field" style={{ width: 90 }}>
            <label className="label">Priorità</label>
            <select className="input" name="priority" defaultValue="">
              <option value="">—</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit">
            + Aggiungi gara
          </button>
        </div>
      </form>
    </>
  );

  // -------------------- ATTIVITÀ (accodate al tab Dispositivi) --------------------
  const attivitaContent = (
    <>
      {/* ---------------- ATTIVITÀ SVOLTE (via Intervals.icu) ---------------- */}
      <h2 className="sec">
        <span className="l">Attività svolte</span>
        {intervals ? (
          <span className="mono" style={{ color: "var(--text-2)" }}>
            {intervals.last_ok_at
              ? `aggiornato ${fmtActivityDate(intervals.last_ok_at)}`
              : "mai sincronizzato"}
          </span>
        ) : null}
      </h2>
      {intervals ? (
        <>
          <form action={syncIntervalsActivities} style={{ marginBottom: 10 }}>
            <input type="hidden" name="athlete_id" value={id} />
            <button className="btn btn-subtle btn-sm" type="submit">
              ⟳ Sincronizza attività
            </button>
          </form>
          <StravaActivityList activities={icuActivities} />
        </>
      ) : (
        <div className="card" style={{ textAlign: "center", color: "var(--text-2)" }}>
          Collega Intervals.icu qui sopra per vedere le attività svolte
          dell&apos;atleta (Garmin, Polar, Suunto, Strava, ...).
        </div>
      )}
    </>
  );

  return (
    <div className="wrap-tight">
      <CoachNav
        label="ATLETA"
        crumbs={[{ href: "/coach/atleti", label: "Atleti" }, { label: ath.full_name ?? ath.email }]}
      />

      {notice ? (() => {
        const MAP: Record<string, { ok: boolean; text: string }> = {
          intervals_ok: { ok: true, text: "Intervals.icu collegato e verificato." },
          intervals_bad: {
            ok: false,
            text: "Intervals.icu salvato, ma la chiave non ha risposto: controlla API key e athlete ID.",
          },
          intervals_off: { ok: true, text: "Intervals.icu scollegato." },
          intervals_noconn: { ok: false, text: "Prima collega Intervals.icu per questo atleta." },
          intervals_syncerr: { ok: false, text: "Sincronizzazione attività fallita: riprova." },
          intervals_cleanerr: {
            ok: false,
            text: "Bonifica fallita: Intervals non ha risposto. Riprova tra poco.",
          },
        };
        const synced = notice.match(/^intervals_synced_(\d+)$/);
        const pushed = notice.match(/^intervals_pushed_(\d+)_(\d+)$/);
        const cleaned = notice.match(/^intervals_cleaned_(\d+)_(\d+)$/);
        const m = synced
          ? { ok: true, text: `Sincronizzate ${synced[1]} attività.` }
          : cleaned
            ? {
                ok: true,
                text: `Bonifica completata: ${cleaned[1]} eventi rimossi da Intervals, ${cleaned[2]} allenamenti reinviati puliti. Su Garmin i doppioni spariscono al prossimo sync.`,
              }
          : pushed
            ? {
                ok: Number(pushed[2]) === 0,
                text: `Inviati ${pushed[1]} allenamenti al dispositivo${
                  Number(pushed[2]) > 0 ? ` (${pushed[2]} falliti)` : ""
                }.`,
              }
            : MAP[notice] ?? { ok: notice.startsWith("Notifica inviata"), text: notice };
        return (
          <div className={`pill ${m.ok ? "ok" : "warn"}`} style={{ marginBottom: 16 }}>
            {m.ok ? "✓ " : "⚠ "}
            {m.text}
          </div>
        );
      })() : null}

      <div className="hero">
        <div>
          <span className="mono">// ATLETA</span>
          <h1>{ath.full_name ?? ath.email}</h1>
          <p>
            {age ? `${age} anni. ` : ""}
            {ath.level ? `Livello: ${ath.level}. ` : ""}
            {disciplines.length
              ? `Discipline: ${disciplines.map((d) => DISC_LABEL[d] ?? d).join(", ")}.`
              : ""}
          </p>
          {categories.length > 0 ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {categories.map((c) => (
                <span key={c} className="pill violet pill-plain">
                  {CATEGORY_LABEL[c] ?? c}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="hero-actions">
          <Link className="btn btn-primary" href={`/coach/atleta/${id}/griglia`}>
            ▦ Griglia settimana
          </Link>
          <Link className="btn btn-primary" href={`/coach/atleta/${id}/griglia?weeks=4`}>
            ▦ Griglia 4 settimane
          </Link>
          <Link className="btn btn-subtle" href={`/coach/atleta/${id}/mese`}>
            🗓 Mese
          </Link>
          <Link className="btn btn-subtle" href={`/coach/atleta/${id}/anteprima`}>
            👁 Entra come atleta
          </Link>
        </div>
      </div>

      {skippedList.length > 0 ? (
        <div className="card" style={{ marginBottom: 16, borderLeft: "3px solid var(--amber, #fbbf24)" }}>
          <strong>Note e sedute non svolte</strong>
          <span className="mono" style={{ marginLeft: 10, fontSize: ".75rem", color: "var(--text-2)" }}>
            ultime 3 settimane, scritte dall&apos;atleta
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            {skippedList.map((k) => (
              <div key={k.sessionId} style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
                <span className="mono" style={{ minWidth: 92, fontSize: ".8rem", color: "var(--text-2)" }}>
                  {new Date(`${k.dateISO}T12:00:00`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span>
                  {k.skipped ? <span style={{ color: "var(--amber, #fbbf24)", fontWeight: 700, marginRight: 8 }}>✗ non svolto</span> : null}
                  <strong>{DISC_LABEL[k.discipline] ?? k.discipline}</strong>
                  {k.title ? ` · ${k.title}` : ""}
                  {k.note ? (
                    <span style={{ display: "block", marginTop: 2, color: "var(--text-2)", whiteSpace: "pre-wrap" }}>«{k.note}»</span>
                  ) : (
                    <span style={{ display: "block", marginTop: 2, color: "var(--text-3)" }}>nessun motivo scritto</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <AthleteTabs
        contextBar={contextBar}
        initialTab={tab}
        tabs={[
          { key: "tabelle", label: "Tabelle", content: tabelleContent },
          { key: "ferie", label: "Ferie", content: ferieContent },
          { key: "scheda", label: "Scheda & Zone", content: schedaContent },
          { key: "test", label: "Test & Gare", content: testGareContent },
          {
            key: "dispositivi",
            label: "Dispositivi",
            content: (
              <>
                {dispositiviContent}
                {attivitaContent}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
