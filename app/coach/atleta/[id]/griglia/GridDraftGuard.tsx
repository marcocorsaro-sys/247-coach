"use client";

import { useEffect, useState } from "react";

/**
 * Rete di sicurezza per la griglia. Se la sessione scade mentre la coach
 * scrive (succede sul telefono: scheda in background, rete che cade), il
 * salvataggio rimanda al login e tutto quello che aveva scritto va perso.
 *
 * Qui ogni modifica finisce anche in una bozza locale del dispositivo. Quando
 * la pagina si riapre senza che un salvataggio sia andato a buon fine, le celle
 * vengono rimesse com'erano, con un avviso per scartare la bozza. Se invece il
 * server conferma (parametro `saved`), la bozza si cancella.
 */
export default function GridDraftGuard({
  draftKey,
  confirmed,
}: {
  draftKey: string;
  confirmed: boolean;
}) {
  const [restored, setRestored] = useState(0);

  useEffect(() => {
    const form = document.getElementById("grid-form") as HTMLFormElement | null;
    if (!form) return;

    const read = (): Record<string, string> | null => {
      try {
        const raw = localStorage.getItem(draftKey);
        return raw ? (JSON.parse(raw) as Record<string, string>) : null;
      } catch {
        return null;
      }
    };
    const clear = () => {
      try {
        localStorage.removeItem(draftKey);
      } catch {}
    };

    if (confirmed) {
      clear();
    } else {
      const draft = read();
      if (draft) {
        let n = 0;
        for (const [name, value] of Object.entries(draft)) {
          const el = form.elements.namedItem(name);
          if (
            el &&
            (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) &&
            el.value !== value
          ) {
            el.value = value;
            n++;
          }
        }
        if (n > 0) setRestored(n);
      }
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const snapshot = () => {
      const data: Record<string, string> = {};
      for (const el of Array.from(form.elements)) {
        const f = el as HTMLInputElement;
        if (f.name && f.name.startsWith("c_")) data[f.name] = f.value;
      }
      try {
        localStorage.setItem(draftKey, JSON.stringify(data));
      } catch {}
    };
    const onInput = () => {
      clearTimeout(timer);
      timer = setTimeout(snapshot, 400);
    };
    form.addEventListener("input", onInput);
    return () => {
      clearTimeout(timer);
      form.removeEventListener("input", onInput);
    };
  }, [draftKey, confirmed]);

  if (!restored) return null;
  return (
    <div className="pill warn" style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
      <span>
        Ho rimesso {restored} {restored === 1 ? "cella" : "celle"} che avevi scritto e non erano state salvate. Controlla e premi Salva.
      </span>
      <button
        type="button"
        className="btn btn-sm btn-ghost"
        onClick={() => {
          try {
            localStorage.removeItem(draftKey);
          } catch {}
          window.location.reload();
        }}
      >
        Scarta
      </button>
    </div>
  );
}
