// Traccia GPS minimale come SVG (nessuna mappa esterna): il percorso come
// segno su carta, coerente col tema. points = [[lat,lng],...].
export default function RouteTrace({
  points,
  width = 160,
  height = 90,
  stroke = "var(--lime)",
}: {
  points: [number, number][];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (!points || points.length < 2) return null;
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const midLat = (minLat + maxLat) / 2;
  const kx = Math.cos((midLat * Math.PI) / 180); // compressione longitudine
  const w = (maxLng - minLng) * kx || 1e-6;
  const h = maxLat - minLat || 1e-6;
  const pad = 6;
  const scale = Math.min((width - pad * 2) / w, (height - pad * 2) / h);
  const ox = (width - w * scale) / 2;
  const oy = (height - h * scale) / 2;
  const d = points
    .map((p, i) => {
      const x = ox + (p[1] - minLng) * kx * scale;
      const y = oy + (maxLat - p[0]) * scale;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const s = points[0];
  const sx = ox + (s[1] - minLng) * kx * scale;
  const sy = oy + (maxLat - s[0]) * scale;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" style={{ display: "block" }}>
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" opacity=".95" />
      <rect x={sx - 2.5} y={sy - 2.5} width="5" height="5" fill="var(--text)" />
    </svg>
  );
}
