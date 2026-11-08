"use client";

import { useState } from "react";
import { useT } from "@/components/AppLang";

/**
 * Download di un allenamento strutturato:
 *  - .fit  → formato workout nativo Garmin; si copia nell'orologio via USB
 *            (GARMIN/NEWFILES). È la via che funziona per Garmin.
 *  - .tcx  → per piattaforme che importano i piani (es. TrainingPeaks).
 * Nota: Garmin Connect NON importa allenamenti pianificati da file.
 */
export default function GarminActions({
  fitUrl,
  tcxUrl,
  baseName,
}: {
  fitUrl: string;
  tcxUrl?: string;
  baseName: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <a className="btn btn-primary btn-sm" href={fitUrl} download={`${baseName}.fit`}>
          ↓ {t("Allenamento Garmin (.fit)")}
        </a>
        {tcxUrl ? (
          <a className="btn btn-ghost btn-sm" href={tcxUrl} download={`${baseName}.tcx`}>
            ↓ .tcx
          </a>
        ) : null}
        <button
          type="button"
          className="btn btn-subtle btn-sm"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t("Nascondi") : t("Come si carica?")}
        </button>
      </div>
      {open ? (
        <div
          className="mono"
          style={{
            marginTop: 8,
            color: "var(--text-3)",
            textTransform: "none",
            letterSpacing: 0,
            lineHeight: 1.55,
          }}
        >
          <b>{t("Orologio Garmin (.fit):")}</b> {t("collega l'orologio al computer con il cavo USB (si monta come disco) → copia il file")}{" "}
          <b>.fit</b> {t("nella cartella")} <b>GARMIN/NEWFILES</b>{" "}
          {t("→ scollega. L'allenamento compare tra gli allenamenti dell'orologio.")}
          <br />
          <b>.tcx</b>: {t("per piattaforme che importano i piani (es. TrainingPeaks). Garmin Connect")}{" "}
          <b>{t("non")}</b> {t("importa allenamenti pianificati da file.")}
        </div>
      ) : null}
    </div>
  );
}
