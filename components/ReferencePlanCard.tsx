import { createAdminClient } from "@/lib/supabase/admin";
import type { TFn } from "@/lib/app-i18n";
import { uploadReferencePlan } from "@/app/atleta/actions";

/** "Hai già delle tabelle?": carica un piano di riferimento (xlsx/csv/txt o testo). */
export default async function ReferencePlanCard({ athleteId, t, back, status, msg }: { athleteId: string; t: TFn; back: string; status?: string | null; msg?: string | null }) {
  const { data } = await createAdminClient().from("ai_athlete_profiles").select("reference_plan").eq("athlete_id", athleteId).maybeSingle();
  const ref = (data as { reference_plan?: string | null } | null)?.reference_plan ?? null;
  return (
    <div className="card" id="piano-riferimento" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: "1.02rem", marginBottom: 6 }}>📎 {t("Hai già delle tabelle?")}</div>
      <p style={{ margin: "0 0 10px", color: "var(--text-2)", fontSize: ".9rem", lineHeight: 1.55 }}>
        {t("Carica il piano di un tuo ex allenatore o quello che stavi seguendo (Excel, CSV o testo). Il coach si ispira a fasi e sedute, ma ricalcola le intensità dalle tue soglie reali e rispetta i tuoi vincoli.")}
      </p>
      {status === "ok" ? <div style={{ color: "var(--emerald)", fontSize: ".88rem", marginBottom: 8 }}>✓ {t("Piano caricato: la tabella si sta aggiornando (2-4 minuti).")}</div> : null}
      {status === "err" ? <div style={{ color: "#fb7185", fontSize: ".88rem", marginBottom: 8 }}>⚠️ {msg ?? t("Caricamento non riuscito.")}</div> : null}
      {ref ? (
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: "pointer", fontSize: ".88rem" }}>✓ {t("Piano di riferimento attivo")} · {t("vedi la sintesi")}</summary>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: ".78rem", color: "var(--text-2)", maxHeight: 320, overflow: "auto", marginTop: 8 }}>{ref}</pre>
          <form action={uploadReferencePlan} style={{ marginTop: 6 }}>
            <input type="hidden" name="back" value={back} />
            <input type="hidden" name="remove" value="1" />
            <button className="btn btn-subtle btn-sm" type="submit">{t("Rimuovi il piano di riferimento")}</button>
          </form>
        </details>
      ) : null}
      <form action={uploadReferencePlan} style={{ display: "grid", gap: 8 }}>
        <input type="hidden" name="back" value={back} />
        <input type="file" name="file" accept=".xlsx,.xls,.xlsm,.ods,.csv,.txt,.md" />
        <textarea className="input" name="text" rows={3} placeholder={t("…oppure incolla qui il testo delle tabelle")} style={{ fontSize: ".85rem" }} />
        <div>
          <button className="btn btn-primary btn-sm" type="submit">{ref ? t("Sostituisci e aggiorna la tabella") : t("Carica e aggiorna la tabella")}</button>
          <span style={{ fontSize: ".78rem", color: "var(--text-3)", marginLeft: 8 }}>{t("Ci vuole circa un minuto per leggerlo.")}</span>
        </div>
      </form>
    </div>
  );
}
