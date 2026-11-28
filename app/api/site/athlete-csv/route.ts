// Risultati di un solo atleta in CSV (?slug=). Sola lettura, un atleta per richiesta:
// l'archivio intero non si scarica da qui.
import { getAthlete } from "@/lib/site/athletes";
import { careerRows } from "@/lib/site/career";

const cell = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export async function GET(req: Request) {
  const slug = (new URL(req.url).searchParams.get("slug") ?? "").toLowerCase();
  if (!/^[a-z0-9-]{3,90}$/.test(slug)) return new Response("bad slug", { status: 400 });
  const d = await getAthlete(slug);
  if (!d) return new Response("not found", { status: 404 });
  const car = new Map(careerRows(d.results).map((c) => [c.r.edition_id, c]));
  const head = ["athlete", "country", "date", "race", "year", "distance", "age_group", "status", "swim_s", "t1_s", "bike_s", "t2_s", "run_s", "finish_s", "rank_overall", "rank_gender", "rank_age_group", "faster_than_pct_finish", "faster_than_pct_swim", "faster_than_pct_bike", "faster_than_pct_run", "average_course_finish_s"];
  const lines = d.results.map((r) => { const c = car.get(r.edition_id); return [d.athlete.name, d.athlete.country, r.race_date, r.race_name, r.year, r.cat === "full" ? "140.6" : "70.3", r.age_group, r.status, r.swim, r.t1, r.bike, r.t2, r.run, r.status === "FIN" ? r.finish : null, r.rank_overall, r.rank_sex, r.rank_ag, c?.pct.finish, c?.pct.swim, c?.pct.bike, c?.pct.run, c?.adj].map(cell).join(","); });
  return new Response(`﻿${head.join(",")}\n${lines.join("\n")}\n`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${slug}-247coachai.csv"`, "Cache-Control": "public, s-maxage=3600", "X-Robots-Tag": "noindex" } });
}
