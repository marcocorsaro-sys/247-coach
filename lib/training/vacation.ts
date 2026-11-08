// ============================================================================
// Helper condivisi per i periodi flessibili / "Ferie".
// Durante un periodo di ferie il coach non assegna l'allenamento del giorno,
// ma propone un "roaster" (menu) di workout e, per ogni giorno, solo la
// disciplina. L'atleta sceglie dal menu e marca lo svolgimento.
// ============================================================================
import { parseDate, toISODate, addDays, MESI_SHORT, GIORNI } from "./weeks";

export type Discipline = "swim" | "bike" | "run" | "athletics" | "other";

export const DISCIPLINES: Discipline[] = ["swim", "bike", "run", "athletics", "other"];

export const DISC_META: Record<Discipline, { label: string; sym: string; cls: string }> = {
  swim: { label: "Nuoto", sym: "●", cls: "disc-swim" },
  bike: { label: "Bici", sym: "◆", cls: "disc-bike" },
  run: { label: "Corsa", sym: "▲", cls: "disc-run" },
  athletics: { label: "Forza", sym: "✦", cls: "disc-ath" },
  other: { label: "Altro", sym: "○", cls: "disc-rest" },
};

export function discMeta(d: string) {
  return DISC_META[(d as Discipline)] ?? DISC_META.other;
}

/** Tutte le date (yyyy-mm-dd) comprese tra start ed end inclusi. */
export function datesBetween(startISO: string, endISO: string): string[] {
  const start = parseDate(startISO);
  const end = parseDate(endISO);
  const out: string[] = [];
  let cur = start;
  for (let i = 0; i < 366 && cur.getTime() <= end.getTime(); i++) {
    out.push(toISODate(cur));
    cur = addDays(cur, 1);
  }
  return out;
}

/** "Lun 4 ago" per una data yyyy-mm-dd. */
export function fmtDayLabel(iso: string): string {
  const d = parseDate(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = lunedì
  return `${GIORNI[dow].slice(0, 3)} ${d.getDate()} ${MESI_SHORT[d.getMonth()]}`;
}

/** "4 – 17 ago 2026" per l'intervallo del periodo. */
export function fmtPeriodRange(startISO: string, endISO: string): string {
  const s = parseDate(startISO);
  const e = parseDate(endISO);
  const sStr = `${s.getDate()} ${MESI_SHORT[s.getMonth()]}`;
  const eStr = `${e.getDate()} ${MESI_SHORT[e.getMonth()]} ${e.getFullYear()}`;
  return `${sStr} – ${eStr}`;
}

/** Vero se `iso` cade dentro [start, end] inclusi. */
export function dateInPeriod(iso: string, startISO: string, endISO: string): boolean {
  const t = parseDate(iso).getTime();
  return t >= parseDate(startISO).getTime() && t <= parseDate(endISO).getTime();
}
