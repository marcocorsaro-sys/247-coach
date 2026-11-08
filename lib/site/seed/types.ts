// Seed di una scheda gara: contenuto ricco + fonti + media + termini di
// ricerca per la pipeline di raccolta. Applicato da /api/site/seed.
import type { Race } from "@/lib/site/races";

export interface RaceSeed {
  slug: string;
  race: Partial<Pick<Race, "official_name" | "region" | "intro" | "kpis" | "legs" | "profile" | "splits" | "demands" | "tips" | "logistics" | "faq" | "course_version" | "date_confirmed">>;
  segments?: { leg: "swim" | "bike" | "run"; position: number; km_from: number; km_to: number; title: string; note?: string; grade_pct?: number | null; dplus_m?: number | null; kind?: string }[];
  reviews?: { edition_year?: number; source: "synthesis" | "manual"; title: string; scores?: Record<string, number>; body: string; sources_note?: string }[];
  sources?: { kind: string; platform?: string; url: string; title?: string; author?: string; published_at?: string; edition_year?: number; lang?: string; excerpt?: string; topics?: string[]; quality?: number }[];
  media?: { platform: "instagram" | "youtube" | "strava" | "tiktok" | "other"; media_type: "photo" | "video" | "reel" | "short" | "activity"; url: string; embed_id?: string; author?: string; author_handle?: string; caption?: string; thumbnail_url?: string; edition_year?: number; leg?: string; featured?: boolean }[];
  /** Termini per la raccolta automatica (Apify): hashtag IG, query YouTube/Google. */
  harvest?: { hashtags: string[]; youtube: string[]; google: string[]; years?: number[] };
}
