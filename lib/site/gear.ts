// Attrezzatura: media dei dati Kona (age group) + indicazioni sulle ruote ricavate dal percorso della singola gara.
import type { Race } from "@/lib/site/races";

// Fonte: Slowtwitch, Kona bike count 2026, solo age group (professionisti esclusi), circa 2.260 bici contate.
export const KONA_GEAR = {
  year: 2026, n: 2260,
  url: "https://slowtwitch.com/industry/canyon-dt-swiss-and-shimano-take-emphatic-wins-in-the-2026-kona-bike-count/",
  bikes: [["Canyon", 22.5], ["Cervélo", 17.1], ["Trek", 13.7], ["Quintana Roo", 6.0], ["Specialized", 5.5]] as [string, number][],
  wheels: [["DT Swiss", 23.9], ["Zipp", 18.2], ["HED", 8.0]] as [string, number][],
  drivetrain: [["Shimano", 62.3], ["SRAM", 37.6]] as [string, number][],
};

export type Terrain = "flat" | "rolling" | "hilly";
export interface WheelAdvice { terrain: Terrain; wind: 1 | 2 | 3; dpk: number; front: string; rear: "disc" | "deep" | "deepOrDisc" | "midDeep" }

/** Indicazione di massima sulle ruote da dislivello per km e indice di vento della gara. Non è un conteggio. */
export function wheelAdvice(r: Pick<Race, "bike_km" | "bike_dplus_m" | "wind_idx">): WheelAdvice | null {
  if (!r.bike_km || r.bike_dplus_m == null) return null;
  const dpk = r.bike_dplus_m / r.bike_km;
  const wind = (Math.min(3, Math.max(1, Math.round(r.wind_idx ?? 1))) as 1 | 2 | 3);
  const terrain: Terrain = dpk < 5 ? "flat" : dpk < 9 ? "rolling" : "hilly";
  const FRONT: Record<Terrain, Record<1 | 2 | 3, string>> = {
    flat: { 1: "60-80", 2: "50-65", 3: "40-55" },
    rolling: { 1: "50-65", 2: "45-60", 3: "40-50" },
    hilly: { 1: "40-60", 2: "35-55", 3: "35-45" },
  };
  const rear: WheelAdvice["rear"] = terrain === "hilly" ? "midDeep" : wind === 3 ? "deep" : wind === 2 && terrain === "rolling" ? "deepOrDisc" : "disc";
  return { terrain, wind, dpk: Math.round(dpk * 10) / 10, front: FRONT[terrain][wind], rear };
}
