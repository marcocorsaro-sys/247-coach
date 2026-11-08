// Profilo altimetrico della frazione bici dal json `profile` della gara:
// points [[km, m]] + labels. Scala reale su entrambi gli assi.
import type { Race } from "@/lib/site/races";

export function BikeProfile({ profile, bikeKm }: { profile: NonNullable<Race["profile"]>; bikeKm: number }) {
  const W = 600, H = 170, L = 40, R = 10, T = 18, B = 30;
  const maxm = profile.maxm || Math.max(...profile.points.map((p) => p[1])) * 1.1;
  const x = (km: number) => L + (km / bikeKm) * (W - L - R);
  const y = (m: number) => T + (1 - m / maxm) * (H - T - B);
  const line = profile.points.map((p, i) => `${i ? "L" : "M"}${x(p[0]).toFixed(1)} ${y(p[1]).toFixed(1)}`).join(" ");
  const area = `${line} L${x(bikeKm).toFixed(1)} ${(H - B).toFixed(1)} L${L} ${(H - B).toFixed(1)} Z`;
  const ticks = [0, maxm / 3, (maxm * 2) / 3, maxm].map((m) => Math.round(m / 100) * 100);
  const kms = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(bikeKm * f));
  return (
    <svg className="ld-prof" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Profilo altimetrico indicativo della frazione bici">
      <defs>
        <linearGradient id="ldgb" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--bike)" stopOpacity=".5" />
          <stop offset="1" stopColor="var(--bike)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="rgba(239,234,224,.12)" strokeWidth="1">
        {ticks.map((m) => <line key={m} x1={L} x2={W - R} y1={y(m)} y2={y(m)} />)}
      </g>
      <g fill="var(--text-3)" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontSize="11">
        {ticks.map((m) => <text key={m} x={4} y={y(m) + 4}>{m}</text>)}
        {kms.map((k) => <text key={k} x={x(k) - (k === bikeKm ? 18 : 0)} y={H - 8}>{k === 0 ? "km 0" : k}</text>)}
      </g>
      <path d={area} fill="url(#ldgb)" />
      <path d={line} fill="none" stroke="var(--bike)" strokeWidth="2.2" strokeLinejoin="round" />
      <g fill="var(--text)" fontFamily="Barlow Condensed, Arial Narrow, sans-serif" fontSize="11" fontWeight="700">
        {profile.labels.map((l, i) => {
          const px = x(l.km), py = y(l.m) - 8;
          const anchor = px > W - 120 ? "end" : px < 100 ? "start" : "middle";
          return <text key={i} x={px} y={Math.max(10, py)} textAnchor={anchor}>{l.t.toUpperCase()}</text>;
        })}
      </g>
    </svg>
  );
}
