// Indice dei contenuti della pagina gara: link alle sezioni presenti, con conteggi dove utili.
export interface TocItem { id: string; label: string; n?: number }
export default function RaceToc({ title, items }: { title: string; items: TocItem[] }) {
  return (
    <nav className="ld-toc" aria-label={title}>
      <div className="ld-wrap">
        <span className="mono">{title}</span>
        <ul>{items.map((i) => <li key={i.id}><a href={`#${i.id}`}>{i.label}{i.n ? <small className="num">{i.n}</small> : null}</a></li>)}</ul>
      </div>
    </nav>
  );
}
