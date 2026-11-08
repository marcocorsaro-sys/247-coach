// Dati "slot Kona" per gara, calcolati dai risultati ufficiali dell'ultima edizione con le regole 2026
// (1 slot automatico per categoria + performance pool). Stime: vedi nota nel componente.
import lanzarote from "./im-lanzarote.json";
import klagenfurt from "./klagenfurt-2027.json";
import hamburg from "./hamburg-2027.json";
import vitoria from "./vitoria-2027.json";
import kalmar from "./kalmar-2027.json";
import copenhagen from "./copenhagen-2027.json";
import leeds from "./leeds-2027.json";

export interface KonaRow { division: string; gender: "M" | "F"; finishers: number; winner: string; poolCount: number; poolCutoff: string }
export interface KonaData { edition: number; date: string; slots: number; auto: number; pool: number; rows: KonaRow[] }

export const KONA: Record<string, KonaData> = {
  "lanzarote-2027": lanzarote as unknown as KonaData,
  "klagenfurt-2027": klagenfurt as unknown as KonaData,
  "hamburg-2027": hamburg as unknown as KonaData,
  "vitoria-2027": vitoria as unknown as KonaData,
  "kalmar-2027": kalmar as unknown as KonaData,
  "copenhagen-2027": copenhagen as unknown as KonaData,
  "leeds-2027": leeds as unknown as KonaData,
};
