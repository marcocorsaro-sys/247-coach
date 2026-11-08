"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";

/**
 * Il form della griglia. Salva con una richiesta normale, con un tempo massimo,
 * e dice cosa è successo. Il form resta com'è sullo schermo: se qualcosa va
 * storto non si perde niente e si può riprovare. (Con l'azione del form, una
 * richiesta rimasta appesa bloccava anche i link: sul telefono la griglia
 * restava morta.)
 */
export default function GridForm({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "saving") return;
    const form = ref.current!;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const fd = new FormData(form);
    if (submitter?.name) fd.set(submitter.name, submitter.value);

    setState("saving");
    setMsg("");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 45000);
    try {
      const res = await fetch("/api/coach/griglia", {
        method: "POST",
        body: fd,
        credentials: "same-origin",
        signal: ctrl.signal,
      });
      const type = res.headers.get("content-type") ?? "";
      if (res.redirected || res.status === 401 || !type.includes("json")) {
        setState("error");
        setMsg("La sessione è scaduta. Non hai perso niente: accedi di nuovo, riapri questa griglia e ritrovi quello che hai scritto.");
        return;
      }
      const data = (await res.json()) as { ok?: boolean; dest?: string };
      if (res.ok && data.ok && data.dest) {
        window.location.assign(data.dest);
        return;
      }
      setState("error");
      setMsg("Il salvataggio non è andato a buon fine. Quello che hai scritto è ancora qui: riprova tra qualche secondo.");
    } catch (err) {
      setState("error");
      setMsg(
        (err as Error).name === "AbortError"
          ? "Il salvataggio non ha risposto in 45 secondi. Quello che hai scritto è ancora qui: controlla la connessione e riprova."
          : "Non riesco a raggiungere il server. Quello che hai scritto è ancora qui: controlla la connessione e riprova.",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return (
    <form id="grid-form" ref={ref} onSubmit={onSubmit}>
      {state === "saving" ? (
        <div className="pill" style={{ position: "sticky", top: 8, zIndex: 20, marginBottom: 12 }}>
          Salvo…
        </div>
      ) : null}
      {state === "error" ? (
        <div className="pill warn" style={{ position: "sticky", top: 8, zIndex: 20, marginBottom: 12, whiteSpace: "normal" }}>
          {msg}
        </div>
      ) : null}
      {children}
    </form>
  );
}
