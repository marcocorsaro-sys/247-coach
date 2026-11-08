// Pagina legale pubblica (privacy / termini), IT e EN con selettore ?lang=.
import Link from "next/link";
import "@/app/site.css";
import type { Doc } from "@/lib/legal/content";

export default function LegalPage({ doc, lang, base, other }: { doc: Doc; lang: "it" | "en"; base: string; other: string }) {
  return (
    <div className="ld">
      <header className="ld-top"><div className="ld-wrap">
        <Link className="brand" href="/"><span className="dot">24</span><span className="name">24/7 <em>Coach</em></span></Link>
        <nav className="ld-tabs">
          <Link href={`/privacy${lang === "en" ? "?lang=en" : ""}`}>Privacy</Link>
          <Link href={`/terms${lang === "en" ? "?lang=en" : ""}`}>{lang === "en" ? "Terms" : "Termini"}</Link>
          <Link href={`${base}?lang=${other}`}>{other.toUpperCase()}</Link>
        </nav>
      </div></header>
      <main><div className="ld-wrap" style={{ maxWidth: 760, padding: "32px 16px 64px" }}>
        <h1>{doc.title}</h1>
        <p style={{ color: "var(--text-2)", lineHeight: 1.6 }}>{doc.lead}</p>
        {doc.sections.map((s) => (
          <section key={s.h} style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: "1.05rem" }}>{s.h}</h2>
            {s.p.map((x, i) => <p key={i} style={{ lineHeight: 1.65, color: "var(--text-2)" }}>{x}</p>)}
          </section>
        ))}
        <p className="mono" style={{ marginTop: 40, color: "var(--text-3)" }}>24/7 Coach è una soluzione di <a href="https://77os.it/it" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>77OS</a> · 77OS S.R.L. · P.IVA 11689230966</p>
      </div></main>
    </div>
  );
}
