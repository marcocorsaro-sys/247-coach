// Fuso orario dell'atleta: date e ore "di oggi" si calcolano sul suo fuso,
// non su quello italiano. Il fuso arriva dal browser (components/TzSync) ed è
// in ai_athlete_profiles.timezone; se manca vale Europe/Rome.
export const DEFAULT_TZ = "Europe/Rome";

export function validTz(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz || tz.length > 64) return false;
  try { new Intl.DateTimeFormat("en-CA", { timeZone: tz }); return true; } catch { return false; }
}
/** Data locale YYYY-MM-DD nel fuso dato (offsetDays: +1 domani). */
export function localDate(tz: string = DEFAULT_TZ, offsetDays = 0, at: Date | string = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: validTz(tz) ? tz : DEFAULT_TZ }).format(new Date(new Date(at).getTime() + offsetDays * 864e5));
}
/** Ora locale 0-23 nel fuso dato. */
export function localHour(tz: string = DEFAULT_TZ): number {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: validTz(tz) ? tz : DEFAULT_TZ, hour: "2-digit", hour12: false }).format(new Date())) % 24;
}
type Db = { from: (t: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
export async function athleteTz(db: Db, athleteId: string): Promise<string> {
  const { data } = await db.from("ai_athlete_profiles").select("timezone").eq("athlete_id", athleteId).maybeSingle();
  const tz = (data as { timezone?: string | null } | null)?.timezone;
  return validTz(tz) ? tz : DEFAULT_TZ;
}
