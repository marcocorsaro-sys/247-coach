"use client";
// Un solo posto dove parlare col coach. L'atleta scrive; l'app decide se
// cambiare subito il piano, tenerne conto domenica o solo rispondere, e lo
// dice chiaramente nella risposta. Le chip precompilano il testo.
import { useEffect, useRef, useState } from "react";
import { useAppLang, useT } from "@/components/AppLang";
import { LOCALE } from "@/lib/app-i18n";

export interface ChatItem {
  who: "coach" | "me";
  text: string;
  when: string; // ISO
  kind?: string; // etichetta sotto il messaggio
  tone?: "now" | "sunday" | "answer" | "weekly" | "auto" | "ask";
}

const CHIPS: { label: string; text: string }[] = [
  { label: "Ho fatto di più", text: "Oggi ho fatto più del previsto: " },
  { label: "Ho un fastidio", text: "Ho un fastidio a " },
  { label: "Sono stanco", text: "Mi sento molto stanco, vorrei alleggerire i prossimi giorni." },
  { label: "Weekend libero", text: "Nel weekend ho tempo per un lungo: sabato fino a " },
  { label: "Poco tempo", text: "La prossima settimana ho poco tempo: " },
  { label: "Scarico", text: "Vorrei una settimana di scarico." },
  { label: "Dove sarò", text: "La prossima settimana sarò a " },
  { label: "Domanda", text: "Una domanda: " },
];

const TONE_LABEL: Record<NonNullable<ChatItem["tone"]>, string> = {
  now: "piano rivisto da domani",
  sunday: "lo tengo per domenica",
  answer: "risposta",
  weekly: "revisione settimanale",
  auto: "piano adattato",
  ask: "domanda del coach",
};

export default function CoachChat({
  items,
  action,
  reviewAction,
  lastWorkout,
  error,
  pending,
  coachName,
}: {
  items: ChatItem[];
  action: (fd: FormData) => void;
  /** Revisione forzata della tabella (senza aspettare domenica). */
  reviewAction?: (fd: FormData) => void;
  /** Ultimo allenamento registrato e non ancora commentato. */
  lastWorkout?: { label: string; when: string } | null;
  error?: boolean;
  pending?: boolean;
  /** Nome che l'atleta ha dato al coach (es. "Dan"). */
  coachName?: string | null;
}) {
  const t = useT();
  const lang = useAppLang();
  const [text, setText] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [items.length]);
  // Dall'ultimo scambio al più vecchio: quello che conta è in cima.
  const ordered = [...items].reverse();
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(LOCALE[lang], { day: "numeric", month: "short" });
  return (
    <section className="card coach-chat" id="coach">
      <div className="chat-head">
        <strong>{coachName ? `${t("Parla con")} ${coachName}` : t("Parla col coach")}</strong>
        <span className="chat-sub">{t("Scrivi come stai e cosa hai fatto. Il coach decide se cambiare il piano subito o tenerne conto domenica, e te lo dice.")}</span>
      </div>
      {lastWorkout ? (
        <div className="card" style={{ margin: "10px 0", borderLeft: "3px solid var(--lime)", padding: "10px 12px" }}>
          <strong>🏁 {t("Allenamento registrato")}: {lastWorkout.label}</strong>
          <div className="dim" style={{ fontSize: ".85rem", margin: "2px 0 8px" }}>{fmt(lastWorkout.when)} · {t("Com'è andata? Il coach legge e decide se adattare il piano.")}</div>
          <div className="chips" style={{ margin: 0 }}>
            <button type="button" className="chip" onClick={() => setText(t("Allenamento di oggi ({w}): tutto bene, buone sensazioni.", { w: lastWorkout.label }))}>{t("Tutto bene")}</button>
            <button type="button" className="chip" onClick={() => setText(t("Allenamento di oggi ({w}): più faticoso del previsto, ", { w: lastWorkout.label }))}>{t("Più duro del previsto")}</button>
            <button type="button" className="chip" onClick={() => setText(t("Allenamento di oggi ({w}): ho sentito un fastidio a ", { w: lastWorkout.label }))}>{t("Ho un fastidio")}</button>
            <button type="button" className="chip" onClick={() => setText(t("Allenamento di oggi ({w}): ", { w: lastWorkout.label }))}>{t("Altro")}</button>
          </div>
        </div>
      ) : null}
      <div className="chips">
        {CHIPS.map((c) => (
          <button key={c.label} type="button" className="chip" onClick={() => setText(t(c.text))}>{t(c.label)}</button>
        ))}
      </div>
      <form action={action} className="chat-form">
        <textarea
          className="input"
          name="message"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("Es. oggi 200 km in bici · anca che tira · sabato ho 4 ore, domenica niente · è normale avere la FC alta in salita?")}
          required
        />
        {error ? <div className="pill err">{t("Messaggio non salvato: riprova")}</div> : null}
        <button className="btn btn-primary" type="submit">{coachName ? `${t("Invia a")} ${coachName}` : t("Invia al coach")}</button>
      </form>
      {reviewAction ? (
        <form action={reviewAction} className="card" style={{ margin: "12px 0", padding: "10px 12px", display: "grid", gap: 8 }}>
          <div style={{ fontSize: ".9rem" }}>
            🗓 <b>{t("Revisione automatica ogni domenica sera")}</b>: {t("il coach rivede la settimana successiva sulla base degli allenamenti fatti, delle sensazioni e dei tuoi messaggi.")}
          </div>
          <div className="dim" style={{ fontSize: ".85rem" }}>{t("Ti serve prima? Puoi chiedere una revisione in qualsiasi momento (facoltativo: scrivi cosa vuoi cambiare).")}</div>
          <input className="input" name="note" placeholder={t("Es. questa settimana ho meno tempo · vorrei più bici · sabato gara")} />
          <button className="btn btn-ghost" type="submit">🔄 {t("Rivedi la tabella adesso")}</button>
        </form>
      ) : null}
      <div className="chat-log" ref={logRef}>
        {pending ? (
          <div className="msg coach tone-now"><div className="bubble">{t("Sto rivedendo il piano… ci vogliono un paio di minuti.")}</div></div>
        ) : null}
        {items.length === 0 ? (
          <p className="dim" style={{ fontSize: ".92rem" }}>{t("Nessun messaggio ancora. Prova con una chip qui sopra o scrivi liberamente.")}</p>
        ) : null}
        {ordered.map((m, i) => (
          <div key={i} className={`msg ${m.who}${m.tone ? ` tone-${m.tone}` : ""}`}>
            <div className="bubble">{m.text}</div>
            <div className="meta">
              {m.who === "coach" ? (coachName || t("coach")) : t("tu")} · {fmt(m.when)}
              {m.tone ? <span className="tag">{t(TONE_LABEL[m.tone])}</span> : m.kind ? <span className="tag">{m.kind}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
