// Scheda riassuntiva di un atleta (PNG 1200×630): anteprima del link e immagine scaricabile.
import { ImageResponse } from "next/og";
import { getAthlete, hms, raceLabel } from "@/lib/site/athletes";
import { careerRows } from "@/lib/site/career";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = (u.searchParams.get("slug") ?? "").toLowerCase();
  if (!/^[a-z0-9-]{3,90}$/.test(slug)) return new Response("bad slug", { status: 400 });
  const d = await getAthlete(slug);
  if (!d) return new Response("not found", { status: 404 });
  const a = d.athlete, it = u.searchParams.get("lang") === "it";
  const rows = careerRows(d.results).sort((p, q) => (p.r.race_date ?? "").localeCompare(q.r.race_date ?? ""));
  const main = rows.filter((r) => r.r.cat === (a.best_full ? "full" : "half"));
  const W = 1056, H = 190, vals = main.map((r) => r.r.finish as number);
  const lo = Math.min(...vals), hi = Math.max(...vals), sp = hi - lo || 1;
  const pts = main.map((r, i) => ({ x: main.length > 1 ? 20 + (i * (W - 40)) / (main.length - 1) : W / 2, y: 20 + (((r.r.finish as number) - lo) / sp) * (H - 40) }));
  const best = main.slice().sort((p, q) => (p.r.finish as number) - (q.r.finish as number))[0];
  const top = rows.filter((r) => r.pct.finish != null).sort((p, q) => (q.pct.finish as number) - (p.pct.finish as number))[0];
  const tile = (v: string, k: string) => (
    <div style={{ display: "flex", flexDirection: "column", marginRight: 56 }}>
      <div style={{ display: "flex", fontSize: 58, fontWeight: 900, lineHeight: 1 }}>{v}</div>
      <div style={{ display: "flex", fontSize: 22, color: "#b8ad9f", marginTop: 6 }}>{k}</div>
    </div>
  );
  const res = new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 56, background: "#0d0b09", color: "#f4efe8", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#ff6a1a", fontWeight: 800 }}>24/7 COACH</div>
          <div style={{ display: "flex", fontSize: 24, color: "#b8ad9f" }}>{a.first_year && a.last_year ? `${a.first_year}–${a.last_year}` : ""}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: a.name.length > 24 ? 62 : 82, fontWeight: 900, lineHeight: 1, textTransform: "uppercase" }}>{a.name}</div>
          <div style={{ display: "flex", fontSize: 28, color: "#ff6a1a", marginTop: 10, fontWeight: 700 }}>{best ? `${it ? "Miglior tempo" : "Best time"} ${hms(best.r.finish)} · ${raceLabel(best.r)}` : "IRONMAN"}</div>
        </div>
        {pts.length > 1 ? (
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
            <path d={pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(0)},${p.y.toFixed(0)}`).join(" ")} stroke="#ff6a1a" strokeWidth={5} fill="none" />
            {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={9} fill="#f4efe8" />)}
          </svg>
        ) : <div style={{ display: "flex" }} />}
        <div style={{ display: "flex" }}>
          {tile(String(a.races), it ? "gare in archivio" : "races on record")}
          {tile(String(a.finishes), it ? "portate a termine" : "finished")}
          {top ? tile(`${top.pct.finish}%`, it ? "degli arrivati battuti, gara migliore" : "of finishers beaten, best race") : null}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  res.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
  if (u.searchParams.get("dl")) res.headers.set("Content-Disposition", `attachment; filename="${slug}-247coachai.png"`);
  return res;
}
