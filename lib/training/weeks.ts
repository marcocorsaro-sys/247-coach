// ============================================================================
// Helper per le settimane di allenamento, allineate al lunedì (ISO 8601).
// Il nome della tabella NON è modificabile: deriva sempre dalla settimana ISO
// che contiene `week_start` → es. "week20". Le date mostrate nelle viste si
// calcolano da `week_start`. Due tabelle non possono coprire lo stesso giorno:
// poiché ogni settimana è un blocco lun→dom allineato al lunedì, equivale a
// non avere due `week_start` (lunedì) uguali per lo stesso atleta.
// ============================================================================

export const MESI_SHORT = [
  "gen", "feb", "mar", "apr", "mag", "giu",
  "lug", "ago", "set", "ott", "nov", "dic",
];
export const GIORNI = [
  "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica",
];

/** Parsa una data-only "yyyy-mm-dd" come mezzanotte locale (no drift di fuso). */
export function parseDate(v: string | Date): Date {
  if (v instanceof Date) return new Date(v.getFullYear(), v.getMonth(), v.getDate());
  const [y, m, d] = v.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** yyyy-mm-dd (locale-safe) per il salvataggio in colonna `date`. */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Lunedì della settimana che contiene `v`. */
export function mondayOf(v: string | Date): Date {
  const d = parseDate(v);
  const dow = (d.getDay() + 6) % 7; // 0 = lunedì
  return addDays(d, -dow);
}

/** Numero di settimana ISO 8601 (1..53). */
export function isoWeek(v: string | Date): number {
  const src = parseDate(v);
  const d = new Date(Date.UTC(src.getFullYear(), src.getMonth(), src.getDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // 0 = lunedì
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // giovedì della settimana
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const ftDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ftDayNum + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

/** Etichetta non modificabile della tabella: "week20" (settimana ISO, 2 cifre). */
export function weekLabel(weekStart: string | Date): string {
  return `week${String(isoWeek(weekStart)).padStart(2, "0")}`;
}

/** Le 7 date lun→dom della settimana che inizia con `weekStart`. */
export function weekDates(weekStart: string | Date): Date[] {
  const mon = mondayOf(weekStart);
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(mon, i));
}

/** "18 mag" */
export function fmtShort(d: Date): string {
  return `${d.getDate()} ${MESI_SHORT[d.getMonth()]}`;
}

/** "Lunedì 18 mag" per il giorno `i` (0=lun) della settimana `weekStart`. */
export function dayWithDate(weekStart: string | Date, i: number): string {
  const d = addDays(mondayOf(weekStart), i);
  return `${GIORNI[i]} ${fmtShort(d)}`;
}

/** Intervallo della settimana: "18 mag – 24 mag 2026". */
export function fmtRange(weekStart: string | Date): string {
  const mon = mondayOf(weekStart);
  const sun = addDays(mon, 6);
  return `${fmtShort(mon)} – ${fmtShort(sun)} ${sun.getFullYear()}`;
}
