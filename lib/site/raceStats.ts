// ============================================================================
// Statistiche storiche per gara (edizioni 2024-2026): partiti, arrivati, mediane
// per frazione e per categoria, distribuzione dei tempi e indice di difficoltà
// (quanto la gara è più lenta o più veloce della media, calcolato sugli stessi
// atleti in gare diverse). Solo dati aggregati: nessun nome, nessuna riga atleta.
// Il file lib/site/data/raceStats.json è calcolato fuori dal sito; le edizioni
// con una frazione accorciata o annullata sono marcate (flags) e non entrano
// nell'indice.
// ============================================================================
import data from "./data/raceStats.json";

export type Leg = "finish" | "swim" | "bike" | "run";
export type EditionStats = {
  y: number; date: string; st: number; fin: number; dnf: number; w: number | null;
  med: Record<"swim" | "t1" | "bike" | "t2" | "run" | "finish", number | null>;
  pct: Record<"10" | "25" | "50" | "75" | "90", number | null>;
  sex: { M: number | null; F: number | null };
  win: { M: number | null; F: number | null };
  ag: Record<string, [number, number, number]>;
  hist?: { step: number; from: number; counts: number[] } | null;
  flags: string[];
  diff: Partial<Record<Leg, number>>;
};
export type RaceStats = { cat: "full" | "half"; editions: EditionStats[]; diff: Partial<Record<Leg, number>>; n_cross: number };

const RACES = (data as unknown as { races: Record<string, RaceStats> }).races;

/** Statistiche di una gara dal suo slug (con o senza anno finale). */
export function raceStatsFor(slug: string): RaceStats | null {
  return RACES[slug.replace(/-20\d\d$/, "")] ?? null;
}

export function hms(s: number | null | undefined): string {
  if (s == null) return "–";
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.round(s % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}`;
}
export const hm = (s: number | null | undefined): string => (s == null ? "–" : `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}`);
