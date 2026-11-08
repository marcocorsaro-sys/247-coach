// Motore della nutrizione di gara e definizione della checklist. Solo calcoli e dati:
// l'interfaccia è in components/site/RaceTools.tsx, i testi nel dizionario (kit.*, nut.*, ck.*).
import type { Race } from "@/lib/site/races";

export interface KitRace {
  slug: string; distance: "full" | "half"; water: "mare" | "lago" | "fiume" | null; heat: number; wind: number;
  season: string | null; swim_km: number | null;
  splits: { goal: string; bike: string; run: string }[];
}
export function kitRace(r: Race): KitRace {
  return {
    slug: r.slug, distance: r.distance, water: r.water_type, heat: r.heat_idx ?? 1, wind: r.wind_idx ?? 1, season: r.season, swim_km: r.swim_km,
    splits: (r.splits ?? []).map((s) => ({ goal: s.goal, bike: s.bike, run: s.run })),
  };
}

export function parseHM(s: string): number | null {
  const m = /^\s*(\d{1,2})\s*[:.hH]\s*(\d{1,2})?\s*$/.exec(s);
  if (m) return Number(m[1]) * 60 + Number(m[2] ?? 0);
  return null;
}
export const fmtHM = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, "0")}`;

// ---- Nutrizione --------------------------------------------------------------
export type BikeMix = "drink" | "balanced" | "gel";
export const MIXES: Record<BikeMix, { drink: number; gel: number; bar: number }> = {
  drink: { drink: 0.7, gel: 0.2, bar: 0.1 },
  balanced: { drink: 0.5, gel: 0.3, bar: 0.2 },
  gel: { drink: 0.2, gel: 0.6, bar: 0.2 },
};
export const PRODUCT = { bottleMl: 750, bottleCarb: 60, gelCarb: 22, barCarb: 40, capSodium: 250 };

export interface NutInput { weight: number; bikeMin: number; runMin: number; bikeCarb: number; runCarb: number; heat: number; mix: BikeMix; distance: "full" | "half" }
export interface NutResult {
  pre: { loadLow: number; loadHigh: number; loadDays: number; breakfastLow: number; breakfastHigh: number };
  bike: { hours: number; carbs: number; fluidMl: number; sodiumMg: number; bottles: number; gels: number; bars: number; per20: { carbs: number; fluidMl: number } };
  run: { hours: number; carbs: number; fluidMl: number; sodiumMg: number; gels: number; drinkMl: number; per20: { carbs: number } };
  total: { carbs: number; fluidMl: number; sodiumMg: number; gels: number; bars: number; bottles: number; caps: number };
  recovery: { carbsLow: number; carbsHigh: number; protein: number };
  warn: ("gut" | "low" | "heat")[];
}
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

export function computeNutrition(i: NutInput): NutResult {
  const bh = i.bikeMin / 60, rh = i.runMin / 60, h = clamp(i.heat, 0, 3);
  const bikeCarb = clamp(i.bikeCarb, 30, 120), runCarb = clamp(i.runCarb, 20, 100);
  const mix = MIXES[i.mix];
  const bikeCarbs = bikeCarb * bh, runCarbs = runCarb * rh;
  const bikeFluidH = 500 + 100 * h, runFluidH = 400 + 100 * h;
  const sodiumH = 500 + 150 * h;
  const bottles = Math.ceil((bikeCarbs * mix.drink) / PRODUCT.bottleCarb);
  const bikeGels = Math.round((bikeCarbs * mix.gel) / PRODUCT.gelCarb);
  const bars = Math.round((bikeCarbs * mix.bar) / PRODUCT.barCarb);
  const runGels = Math.round((runCarbs * 0.6) / PRODUCT.gelCarb);
  const runDrinkMl = Math.round(((runCarbs * 0.4) / PRODUCT.bottleCarb) * PRODUCT.bottleMl);
  const total = {
    carbs: Math.round(bikeCarbs + runCarbs), fluidMl: Math.round(bikeFluidH * bh + runFluidH * rh), sodiumMg: Math.round(sodiumH * (bh + rh)),
    gels: bikeGels + runGels, bars, bottles, caps: Math.ceil((sodiumH * (bh + rh)) / PRODUCT.capSodium),
  };
  const warn: NutResult["warn"] = [];
  if (bikeCarb > 90 || runCarb > 75) warn.push("gut");
  if (bikeCarb < 50 && i.bikeMin > 150) warn.push("low");
  if (h >= 2) warn.push("heat");
  const w = clamp(i.weight, 35, 160);
  return {
    pre: { loadLow: Math.round(8 * w), loadHigh: Math.round(10 * w), loadDays: i.distance === "full" ? 2 : 1, breakfastLow: Math.round(1 * w), breakfastHigh: Math.round(2 * w) },
    bike: { hours: bh, carbs: Math.round(bikeCarbs), fluidMl: Math.round(bikeFluidH * bh), sodiumMg: Math.round(sodiumH * bh), bottles, gels: bikeGels, bars, per20: { carbs: Math.round(bikeCarb / 3), fluidMl: Math.round(bikeFluidH / 3) } },
    run: { hours: rh, carbs: Math.round(runCarbs), fluidMl: Math.round(runFluidH * rh), sodiumMg: Math.round(sodiumH * rh), gels: runGels, drinkMl: runDrinkMl, per20: { carbs: Math.round(runCarb / 3) } },
    total,
    recovery: { carbsLow: Math.round(1.0 * w), carbsHigh: Math.round(1.2 * w), protein: Math.round(0.3 * w) },
    warn,
  };
}

// ---- Checklist -----------------------------------------------------------------
export type CkGroup = "docs" | "swim" | "bike" | "run" | "nutri" | "trans" | "eve" | "after";
export interface CkItem { k: string; g: CkGroup; show?: (r: KitRace) => boolean; note?: string }
const cold = (r: KitRace) => r.season !== "est" || r.water === "lago" || r.water === "fiume";
const notScorching = (r: KitRace) => !(r.water === "mare" && r.heat >= 3);
const full = (r: KitRace) => r.distance === "full";

export const CHECKLIST: CkItem[] = [
  { k: "ck.id", g: "docs" }, { k: "ck.license", g: "docs" }, { k: "ck.confirm", g: "docs" }, { k: "ck.booking", g: "docs" },
  { k: "ck.insurance", g: "docs" }, { k: "ck.cash", g: "docs" }, { k: "ck.adapter", g: "docs" }, { k: "ck.bikecase", g: "docs" }, { k: "ck.toolkit", g: "docs" },
  { k: "ck.wetsuit", g: "swim", show: notScorching }, { k: "ck.goggles", g: "swim" }, { k: "ck.goggles2", g: "swim" }, { k: "ck.cap", g: "swim" },
  { k: "ck.tri", g: "swim" }, { k: "ck.glide", g: "swim" }, { k: "ck.earplugs", g: "swim", show: cold }, { k: "ck.neoprene", g: "swim", show: cold }, { k: "ck.swimskin", g: "swim", show: (r) => !notScorching(r) },
  { k: "ck.bike", g: "bike" }, { k: "ck.helmet", g: "bike" }, { k: "ck.shoes", g: "bike" }, { k: "ck.wheels", g: "bike" }, { k: "ck.spare", g: "bike" },
  { k: "ck.pump", g: "bike" }, { k: "ck.computer", g: "bike" }, { k: "ck.bottles", g: "bike" }, { k: "ck.lube", g: "bike" }, { k: "ck.bibstick", g: "bike" },
  { k: "ck.sunglasses", g: "bike" }, { k: "ck.warmers", g: "bike", show: cold }, { k: "ck.raincoat", g: "bike", show: cold },
  { k: "ck.runshoes", g: "run" }, { k: "ck.laces", g: "run" }, { k: "ck.beltnum", g: "run" }, { k: "ck.cap2", g: "run" }, { k: "ck.socks", g: "run" },
  { k: "ck.watch", g: "run" }, { k: "ck.sunscreen", g: "run" }, { k: "ck.vaseline", g: "run" },
  { k: "ck.gels", g: "nutri" }, { k: "ck.bars", g: "nutri" }, { k: "ck.mix", g: "nutri" }, { k: "ck.salt", g: "nutri" }, { k: "ck.caffeine", g: "nutri" },
  { k: "ck.breakfast", g: "nutri" }, { k: "ck.recovery", g: "nutri" }, { k: "ck.special", g: "nutri", show: full },
  { k: "ck.t1", g: "trans" }, { k: "ck.t2", g: "trans" }, { k: "ck.towel", g: "trans" }, { k: "ck.bags", g: "trans" }, { k: "ck.flipflops", g: "trans" }, { k: "ck.change", g: "trans" },
  { k: "ck.checkin", g: "eve" }, { k: "ck.briefing", g: "eve" }, { k: "ck.pickup", g: "eve" }, { k: "ck.pasta", g: "eve" }, { k: "ck.sleep", g: "eve" }, { k: "ck.alarm", g: "eve" },
  { k: "ck.warm", g: "after" }, { k: "ck.bikeback", g: "after" }, { k: "ck.cleanup", g: "after" },
];
export const CK_GROUPS: CkGroup[] = ["docs", "swim", "bike", "run", "nutri", "trans", "eve", "after"];
export const checklistFor = (r: KitRace) => CHECKLIST.filter((c) => !c.show || c.show(r));
