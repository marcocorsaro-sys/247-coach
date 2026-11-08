// Markdown minimo → HTML per gli articoli gara (titoli, paragrafi, liste,
// grassetto, corsivo, link). Niente HTML in ingresso: tutto viene escapato.
function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inline(s: string): string {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
export function mdToHtml(md: string): string {
  const out: string[] = [];
  let list: string[] | null = null;
  let para: string[] = [];
  const flushP = () => { if (para.length) { out.push(`<p>${inline(para.join(" "))}</p>`); para = []; } };
  const flushL = () => { if (list) { out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join("")}</ul>`); list = null; } };
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { flushP(); flushL(); continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { flushP(); flushL(); const lv = Math.min(3, h[1].length + 1); out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); continue; }
    const li = /^[-*]\s+(.*)$/.exec(line);
    if (li) { flushP(); (list ??= []).push(li[1]); continue; }
    flushL(); para.push(line);
  }
  flushP(); flushL();
  return out.join("\n");
}
