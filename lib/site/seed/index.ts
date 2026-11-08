import type { RaceSeed } from "./types";
import mediaExtra from "./media-extra.json";
import nizza2027 from "./nizza-2027";
import lanzarote2027 from "./lanzarote-2027";
import klagenfurt2027 from "./klagenfurt-2027";
import cervia2027 from "./cervia-2027";
import frankfurt2027 from "./frankfurt-2027";
import hamburg2027 from "./hamburg-2027";
import jesolo_703_2027 from "./jesolo-703-2027";
import stpolten_703_2027 from "./stpolten-703-2027";
import aix_703_2027 from "./aix-703-2027";
import alghero_703_2027 from "./alghero-703-2027";
import switzerland_703_2027 from "./switzerland-703-2027";
import sables_2027 from "./sables-2027";
import elsinore_703_2027 from "./elsinore-703-2027";
import vitoria_2027 from "./vitoria-2027";
import vitoria_703_2027 from "./vitoria-703-2027";
import leeds_2027 from "./leeds-2027";
import kalmar_2027 from "./kalmar-2027";
import copenhagen_2027 from "./copenhagen-2027";
import zell_703_2027 from "./zell-703-2027";
import duisburg_703_2027 from "./duisburg-703-2027";
import erkner_703_2027 from "./erkner-703-2027";
import wales_2027 from "./wales-2027";
import cervia_703_2027 from "./cervia-703-2027";

export const SEEDS: Record<string, RaceSeed> = {
  [nizza2027.slug]: nizza2027,
  [lanzarote2027.slug]: lanzarote2027,
  [klagenfurt2027.slug]: klagenfurt2027,
  [cervia2027.slug]: cervia2027,
  [frankfurt2027.slug]: frankfurt2027,
  [hamburg2027.slug]: hamburg2027,
  [jesolo_703_2027.slug]: jesolo_703_2027,
  [stpolten_703_2027.slug]: stpolten_703_2027,
  [aix_703_2027.slug]: aix_703_2027,
  [alghero_703_2027.slug]: alghero_703_2027,
  [switzerland_703_2027.slug]: switzerland_703_2027,
  [sables_2027.slug]: sables_2027,
  [elsinore_703_2027.slug]: elsinore_703_2027,
  [vitoria_2027.slug]: vitoria_2027,
  [vitoria_703_2027.slug]: vitoria_703_2027,
  [leeds_2027.slug]: leeds_2027,
  [kalmar_2027.slug]: kalmar_2027,
  [copenhagen_2027.slug]: copenhagen_2027,
  [zell_703_2027.slug]: zell_703_2027,
  [duisburg_703_2027.slug]: duisburg_703_2027,
  [erkner_703_2027.slug]: erkner_703_2027,
  [wales_2027.slug]: wales_2027,
  [cervia_703_2027.slug]: cervia_703_2027,
};
const extra = mediaExtra as unknown as Record<string, NonNullable<RaceSeed["media"]>>;
for (const [slug, m] of Object.entries(extra)) {
  const s = SEEDS[slug];
  if (s && !s.media?.length) s.media = m;
}
export type { RaceSeed };
