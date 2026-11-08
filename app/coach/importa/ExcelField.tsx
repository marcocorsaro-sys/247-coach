"use client";

import { useState } from "react";

// Il file viaggia dentro una server action, e sopra una certa dimensione la
// richiesta viene rifiutata prima ancora di arrivare al nostro codice: la
// pagina va in errore e chi carica non capisce perché. Qui il peso si vede
// prima di premere il pulsante, e se il file è troppo grande lo diciamo in
// italiano invece di lasciar comparire "Application error".
const MAX_BYTES = 4 * 1024 * 1024;

function human(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(1).replace(".", ",")} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export default function ExcelField() {
  const [size, setSize] = useState<number | null>(null);
  const troppoGrande = size != null && size > MAX_BYTES;

  return (
    <div className="field">
      <label className="label">File Excel (.xlsx)</label>
      <input
        className="input"
        name="file"
        type="file"
        accept=".xlsx,.xls"
        required
        onChange={(e) => setSize(e.target.files?.[0]?.size ?? null)}
      />

      {troppoGrande ? (
        <span
          className="mono"
          style={{ marginTop: 6, display: "block", color: "var(--danger, #c0392b)" }}
        >
          Questo file pesa {human(size!)} ed è troppo grande da caricare qui (il
          massimo è 4 MB). Di solito succede quando dentro il foglio ci sono
          immagini: prova a toglierle e a salvare di nuovo, oppure mandami il
          file e lo carico io.
        </span>
      ) : (
        <span className="mono" style={{ marginTop: 6, display: "block" }}>
          Importo tutti i fogli con almeno una sessione: ognuno diventa una
          settimana.
          {size != null ? ` File scelto: ${human(size)}.` : ""}
        </span>
      )}

      {/* Il pulsante sta qui dentro perché deve potersi disabilitare: fuori
          non saprebbe niente del file scelto. */}
      <button
        className="btn btn-primary btn-lg"
        type="submit"
        disabled={troppoGrande}
        style={{ justifyContent: "center", marginTop: 18 }}
      >
        Importa lo storico <span className="arrow">→</span>
      </button>
    </div>
  );
}
