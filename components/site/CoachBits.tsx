// Pezzi riusabili delle pagine del servizio: conversazione stile chat, settimana,
// chiusura con invito. Solo markup: gli stili sono in app/site.css (.ld-th*, .ld-cw*).
import Link from "next/link";
import type { Day, Msg, Ses } from "@/lib/site/coach";

export function Thread({ msgs, me, coach, channel, title }: { msgs: Msg[]; me: string; coach: string; channel?: string; title?: string }) {
  return (
    <div className="ld-th">
      <div className="ld-th-head">
        <span className="ld-th-av">{coach.slice(0, 1)}</span>
        <span className="ld-th-name">{coach}{title ? <i>{title}</i> : null}</span>
        {channel ? <span className="ld-th-ch">{channel}</span> : null}
      </div>
      <div className="ld-th-body">
        {msgs.map((m, i) => (
          <div key={i} className={`ld-th-msg ${m.who}`}>
            {m.meta ? <span className="ld-th-meta">{m.meta}</span> : null}
            <span className="ld-th-who">{m.who === "me" ? me : coach}</span>
            {m.text.split("\n").map((line, j) => <p key={j}>{line}</p>)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SesBox({ s }: { s: Ses }) {
  return (
    <div className={`ld-ses ${s.k}${s.chg ? " chg" : ""}`}>
      <b>{s.t}</b>
      {s.d ? <span>{s.d}</span> : null}
    </div>
  );
}

export function WeekGrid({ days }: { days: Day[] }) {
  return (
    <div className="ld-week ld-cw">
      {days.map((d) => (
        <div key={d.dn} className="ld-day">
          <span className="dn">{d.dn}</span>
          {d.ses.map((s) => <SesBox key={s.t} s={s} />)}
        </div>
      ))}
    </div>
  );
}

export function CoachCta({ title, note, primary, href, secondary }: { title?: string; note?: string; primary: string; href: string; secondary?: { label: string; href: string } }) {
  return (
    <section className="ld-sec ld-cclose">
      <div className="ld-wrap">
        {title ? <h2>{title}</h2> : null}
        <div className="ld-cta">
          <Link className="btn btn-primary btn-lg" href={href}>{primary}</Link>
          {secondary ? <Link className="btn btn-ghost btn-lg" href={secondary.href}>{secondary.label}</Link> : null}
        </div>
        {note ? <p className="note">{note}</p> : null}
      </div>
    </section>
  );
}
