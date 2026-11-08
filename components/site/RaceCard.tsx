import Link from "next/link";
import { fmtDate, hasRichContent, racePath, raceTitle, type Race } from "@/lib/site/races";
import { LOCALE, type Lang } from "@/lib/i18n/config";
import type { T } from "@/lib/i18n";

export function RaceCard({ r, lang, t }: { r: Race; lang: Lang; t: T }) {
  const rich = hasRichContent(r);
  const year = r.race_date ? r.race_date.slice(0, 4) : "";
  return (
    <Link className="ld-rc" href={racePath(r, lang)}>
      <span className="d num">{fmtDate(r.race_date, { day: "2-digit", month: "short" }, LOCALE[lang])} <span className="mono">{year}</span></span>
      <span className="n">{raceTitle(r)} <i>· {r.distance === "full" ? t("card.full") : t("card.half")}</i></span>
      <span className="src">{[r.city, r.country].filter(Boolean).join(" · ")}</span>
      <span className="m">
        {r.water_type ? <span className="ld-tag sw">{t(`water.${r.water_type}` as "water.mare")}</span> : null}
        <span className="ld-tag bk">{r.bike_dplus_m == null ? "— m D+" : `${r.bike_dplus_m.toLocaleString(LOCALE[lang])} m D+`}</span>
        <span className="ld-tag rn">{r.run_flat == null ? "—" : r.run_flat ? t("card.flatRun") : t("card.hillyRun")}</span>
        {r.heat_idx >= 2 ? <span className="ld-tag">{t("card.hot")}</span> : null}
        {r.wind_idx >= 3 ? <span className="ld-tag">{t("card.windy")}</span> : null}
      </span>
      <span className="bar"><i style={{ width: `${Math.min(100, (r.bike_dplus_m ?? 0) / 25)}%` }} /></span>
      <span className="src">{rich ? t("card.sheetFull") : t("card.sheetPrep")}</span>
    </Link>
  );
}
