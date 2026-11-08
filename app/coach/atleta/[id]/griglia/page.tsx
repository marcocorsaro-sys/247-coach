import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessCoachArea } from "@/lib/server/viewAs";
import CoachNav from "@/components/CoachNav";
import GridForm from "./GridForm";
import GridDraftGuard from "./GridDraftGuard";
import {
  mondayOf,
  addDays,
  toISODate,
  weekDates,
  weekLabel,
  fmtRange,
  MESI_SHORT,
} from "@/lib/training/weeks";

const GRID_DISCIPLINES = ["swim", "bike", "run", "athletics"] as const;
const GIORNI_SHORT = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const DISC: Record<string, { cls: string; label: string; sym: string }> = {
  swim: { cls: "disc-swim", label: "Nuoto", sym: "●" },
  bike: { cls: "disc-bike", label: "Bici", sym: "◆" },
  run: { cls: "disc-run", label: "Corsa", sym: "▲" },
  athletics: { cls: "disc-ath", label: "Forza", sym: "✦" },
};

type SessRow = {
  id: string;
  week_id: string;
  day_of_week: number;
  discipline: string;
  title: string | null;
  volume_value: string | null;
  notes: string | null;
};

const cellInput: React.CSSProperties = {
  width: "100%",
  padding: "4px 6px",
  fontSize: ".8rem",
  background: "var(--s1, rgba(255,255,255,.03))",
  border: "1px solid var(--line)",
  borderRadius: 6,
  color: "inherit",
};

export default async function AthleteWeekGrid({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ w?: string; weeks?: string; saved?: string; sg?: string }>;
}) {
  const { id } = await params;
  const { w, weeks, saved, sg } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!(await canAccessCoachArea(supabase, user.id))) redirect("/atleta");

  const { data: athData } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", id)
    .single();
  const ath = athData as unknown as { full_name: string | null; email: string } | null;
  if (!ath) redirect("/coach");
  const athName = ath.full_name ?? ath.email;

  const n = weeks === "4" ? 4 : 1;
  const first = mondayOf(w || new Date());
  const firstISO = toISODate(first);
  const prevISO = toISODate(addDays(first, -7 * n));
  const nextISO = toISODate(addDays(first, 7 * n));

  // Le settimane della finestra (1 o 4).
  const weekList = Array.from({ length: n }, (_, i) => {
    const mon = addDays(first, i * 7);
    return { iso: toISODate(mon), dates: weekDates(mon) };
  });
  const weekISOs = weekList.map((x) => x.iso);

  // Settimane esistenti + sessioni + step + RPE atleta.
  const { data: wkData } = await supabase
    .from("training_weeks")
    .select("id, week_start, status")
    .eq("athlete_id", id)
    .in("week_start", weekISOs);
  const weeksRows = (wkData ?? []) as unknown as { id: string; week_start: string; status: string }[];
  const weekIdByISO = new Map(weeksRows.map((r) => [r.week_start.slice(0, 10), r]));

  const sessByCellByWeek = new Map<string, Map<string, SessRow>>(); // weekISO -> "day|disc" -> sess
  const stepCount = new Map<string, number>();
  const rpeBySession = new Map<string, { rpe: number | null; done: boolean; skipped: boolean; note: string | null }>();

  if (weeksRows.length > 0) {
    const { data: sessData } = await supabase
      .from("sessions")
      .select("id, week_id, day_of_week, discipline, title, volume_value, notes")
      .in("week_id", weeksRows.map((r) => r.id))
      .order("sort_order", { ascending: true });
    const sessions = (sessData ?? []) as unknown as SessRow[];
    const weekISOById = new Map(weeksRows.map((r) => [r.id, r.week_start.slice(0, 10)]));

    for (const s of sessions) {
      const wiso = weekISOById.get(s.week_id);
      if (!wiso) continue;
      const byCell = sessByCellByWeek.get(wiso) ?? new Map<string, SessRow>();
      const k = `${s.day_of_week}|${s.discipline}`;
      if (!byCell.has(k)) byCell.set(k, s);
      sessByCellByWeek.set(wiso, byCell);
    }

    const sessIds = sessions.map((s) => s.id);
    if (sessIds.length > 0) {
      const [stepsRes, logsRes] = await Promise.all([
        supabase.from("session_steps").select("session_id").in("session_id", sessIds),
        supabase
          .from("session_logs")
          .select("session_id, rpe_actual, status, athlete_note")
          .eq("athlete_id", id)
          .in("session_id", sessIds),
      ]);
      for (const r of (stepsRes.data ?? []) as unknown as { session_id: string }[]) {
        stepCount.set(r.session_id, (stepCount.get(r.session_id) ?? 0) + 1);
      }
      for (const l of (logsRes.data ?? []) as unknown as {
        session_id: string;
        rpe_actual: number | null;
        status: string;
        athlete_note: string | null;
      }[]) {
        rpeBySession.set(l.session_id, {
          rpe: l.rpe_actual,
          done: l.status === "completed",
          skipped: l.status === "skipped",
          note: l.athlete_note,
        });
      }
    }
  }

  const lastDates = weekList[weekList.length - 1]!.dates;
  const rangeLabel = `${fmtRange(firstISO).split(" – ")[0]} – ${fmtRange(toISODate(lastDates[0]!)).split(" – ")[1]}`;

  const renderCell = (weekISO: string, d: number, disc: string) => {
    const s = sessByCellByWeek.get(weekISO)?.get(`${d}|${disc}`);
    const p = `c_${weekISO}_${d}_${disc}`;
    const steps = s ? stepCount.get(s.id) ?? 0 : 0;
    const log = s ? rpeBySession.get(s.id) : undefined;
    return (
      <td
        key={`${weekISO}-${d}-${disc}`}
        style={{
          verticalAlign: "top",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: 6,
          background: s ? "rgba(163,230,53,.04)" : undefined,
        }}
      >
        {s ? <input type="hidden" name={`${p}_id`} value={s.id} /> : null}
        <input
          name={`${p}_title`}
          defaultValue={s?.title ?? ""}
          placeholder="tipo"
          style={{ ...cellInput, fontWeight: 700, marginBottom: 4 }}
        />
        <input
          name={`${p}_vol`}
          defaultValue={s?.volume_value ?? ""}
          placeholder="volume"
          style={{ ...cellInput, marginBottom: 4 }}
          className="mono"
        />
        <textarea
          name={`${p}_notes`}
          defaultValue={s?.notes ?? ""}
          placeholder="testo seduta…"
          rows={4}
          style={{ ...cellInput, resize: "vertical", lineHeight: 1.35 }}
        />
        {s ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, marginTop: 4 }}>
            <Link href={`/coach/sessione/${s.id}`} className="mono" style={{ fontSize: ".66rem", color: "var(--text-2)" }}>
              ⚙ step
            </Link>
            <span className="mono" style={{ fontSize: ".62rem", display: "flex", gap: 6, alignItems: "center" }}>
              {log?.done ? <span style={{ color: "var(--lime)" }}>✓</span> : null}
              {log?.skipped ? (
                <span style={{ color: "var(--amber, #fbbf24)", fontWeight: 700 }} title="Segnata come non svolta dall'atleta">
                  ✗ non svolto
                </span>
              ) : null}
              {log?.rpe != null ? (
                <span style={{ color: "var(--amber, #fbbf24)" }} title="RPE inserito dall'atleta">
                  RPE {log.rpe}
                </span>
              ) : (
                <span style={{ color: "var(--text-2)" }}>{steps > 0 ? `${steps} step` : "testo"}</span>
              )}
            </span>
          </div>
        ) : null}
        {log?.note ? (
          <div
            style={{
              marginTop: 4,
              padding: "4px 6px",
              borderRadius: 6,
              background: log.skipped ? "rgba(251,191,36,.12)" : "var(--s2, rgba(13,30,61,.05))",
              fontSize: ".72rem",
              lineHeight: 1.35,
              whiteSpace: "pre-wrap",
            }}
          >
            {log.skipped ? null : <span className="mono" style={{ fontSize: ".6rem", marginRight: 4, color: "var(--text-2)" }}>NOTA</span>}
            «{log.note}»
          </div>
        ) : null}
      </td>
    );
  };

  const NavBar = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <button className="btn btn-subtle btn-sm" type="submit" name="goto" value={prevISO}>
        ‹ {n === 4 ? "4 sett. prec." : "sett. prec."}
      </button>
      <button className="btn btn-primary btn-sm" type="submit" name="goto" value="" style={{ flex: 1 }}>
        💾 Salva {n === 4 ? "le 4 settimane" : "la griglia"}
      </button>
      <button className="btn btn-subtle btn-sm" type="submit" name="goto" value={nextISO}>
        {n === 4 ? "4 sett. succ." : "sett. succ."} ›
      </button>
    </div>
  );

  return (
    <div className="wrap-tight">
      <CoachNav
        label="GRIGLIA"
        crumbs={[
          { href: "/coach/atleti", label: "Atleti" },
          { href: `/coach/atleta/${id}`, label: athName },
          { label: n === 4 ? "Griglia 4 settimane" : `Griglia ${weekLabel(first)}` },
        ]}
      />

      {saved ? <div className="pill ok" style={{ marginBottom: 16 }}>✓ Griglia salvata</div> : null}

      <div className="hero">
        <div>
          <span className="mono">// GRIGLIA EDITABILE · {n === 4 ? "4 SETTIMANE" : weekLabel(first)}</span>
          <h1>{athName}</h1>
          <p>{rangeLabel} · compila come nel tuo Excel: tipo, volume, testo.</p>
        </div>
        <div className="hero-actions">
          {/* toggle 1 / 4 settimane */}
          <div style={{ display: "flex", gap: 6 }}>
            <Link
              className={`btn btn-sm ${n === 1 ? "btn-primary" : "btn-ghost"}`}
              href={`/coach/atleta/${id}/griglia?w=${firstISO}&weeks=1`}
            >
              1 settimana
            </Link>
            <Link
              className={`btn btn-sm ${n === 4 ? "btn-primary" : "btn-ghost"}`}
              href={`/coach/atleta/${id}/griglia?w=${firstISO}&weeks=4`}
            >
              4 settimane
            </Link>
          </div>
        </div>
      </div>

      <GridDraftGuard draftKey={`grid-draft:${id}:${firstISO}:${n}`} confirmed={Boolean(saved) || sg === "1"} />

      <GridForm>
        <input type="hidden" name="athlete_id" value={id} />
        <input type="hidden" name="w" value={firstISO} />
        <input type="hidden" name="n" value={n} />
        {/* submit di default: Invio in una cella salva sul posto, non naviga */}
        <button
          type="submit"
          name="goto"
          value=""
          aria-hidden
          tabIndex={-1}
          style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", border: 0 }}
        />

        <div style={{ marginBottom: 12 }}>
          <NavBar />
        </div>

        {weekList.map(({ iso, dates }) => {
          const wk = weekIdByISO.get(iso);
          return (
            <section key={iso} style={{ marginBottom: 22 }}>
              {n === 4 ? (
                <div
                  className="mono"
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, color: "var(--text-2)" }}
                >
                  <strong style={{ color: "var(--text)" }}>{weekLabel(mondayOf(iso))}</strong>
                  <span style={{ fontSize: ".78rem" }}>
                    {fmtRange(iso)} · {wk ? (wk.status === "published" ? "pubblicata" : "bozza") : "nuova"}
                  </span>
                </div>
              ) : null}
              <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
                <table style={{ borderCollapse: "separate", borderSpacing: 4, minWidth: 900 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 74 }} />
                      {dates.map((date, d) => (
                        <th key={d} style={{ minWidth: 150, textAlign: "left" }}>
                          <div className="mono" style={{ fontSize: ".7rem", color: "var(--text-2)" }}>{GIORNI_SHORT[d]}</div>
                          <div style={{ fontWeight: 700, fontSize: ".82rem" }}>
                            {date.getDate()} {MESI_SHORT[date.getMonth()]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GRID_DISCIPLINES.map((disc) => {
                      const meta = DISC[disc];
                      return (
                        <tr key={disc}>
                          <td style={{ verticalAlign: "top", paddingTop: 6 }}>
                            <span className={`disc ${meta.cls}`} style={{ fontSize: ".72rem", whiteSpace: "nowrap" }}>
                              {meta.sym} {meta.label}
                            </span>
                          </td>
                          {dates.map((_, d) => renderCell(iso, d, disc))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}

        <NavBar />
      </GridForm>
    </div>
  );
}
