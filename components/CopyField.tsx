"use client";
import { useState } from "react";
import { useT } from "@/components/AppLang";

/** Campo in sola lettura con bottone "Copia". */
export default function CopyField({ value, small = false }: { value: string; small?: boolean }) {
  const t = useT();
  const [ok, setOk] = useState(false);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
      <input readOnly value={value} onFocus={(e) => e.currentTarget.select()} className="input mono" style={{ flex: 1, minWidth: 0, fontSize: small ? ".78rem" : ".84rem" }} />
      <button
        type="button"
        className="btn btn-primary btn-sm"
        onClick={async () => {
          try { await navigator.clipboard.writeText(value); setOk(true); setTimeout(() => setOk(false), 1800); } catch {}
        }}
      >
        {ok ? t("✓ Copiato") : t("Copia")}
      </button>
    </div>
  );
}
