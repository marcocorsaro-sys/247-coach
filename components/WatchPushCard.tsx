import type { TFn } from "@/lib/app-i18n";
import { saveWatchPush } from "@/app/atleta/actions";

/** 247: cosa arriva sull'orologio. Salvataggio immediato (non dipende dal form della API key). */
export default function WatchPushCard({ conn, t }: { conn: { push_planned?: boolean; push_days?: number | null }; t: TFn }) {
  const cur = conn.push_planned === false ? "off" : conn.push_days === 0 ? "week" : conn.push_days === 7 ? "two" : "all";
  const opts: [string, string, string][] = [
    ["week", t("Solo la settimana in corso"), t("Consigliato: sull'orologio trovi solo gli allenamenti di questa settimana, sempre aggiornati.")],
    ["two", t("Questa settimana e la prossima"), t("Utile se vuoi vedere in anticipo cosa ti aspetta.")],
    ["all", t("Tutto il piano"), t("Tutte le settimane già pubblicate.")],
    ["off", t("Niente: non inviare all'orologio"), t("Gli allenamenti già inviati vengono tolti. Le attività svolte continuano ad arrivare.")],
  ];
  return (
    <form action={saveWatchPush} className="card" id="orologio" style={{ marginTop: 12, display: "grid", gap: 8 }}>
      <b>⌚ {t("Cosa mando sul tuo orologio")}</b>
      {opts.map(([v, label, help]) => (
        <label key={v} style={{ display: "flex", gap: 8, alignItems: "flex-start", cursor: "pointer", fontSize: ".9rem" }}>
          <input type="radio" name="mode" value={v} defaultChecked={cur === v} style={{ marginTop: 4 }} />
          <span>
            {label}
            <span style={{ display: "block", fontSize: ".78rem", color: "var(--text-3)" }}>{help}</span>
          </span>
        </label>
      ))}
      <div>
        <button className="btn btn-primary btn-sm" type="submit">{t("Salva")}</button>
        <span style={{ fontSize: ".76rem", color: "var(--text-3)", marginLeft: 8 }}>{t("Si applica subito: Intervals e Garmin si aggiornano in un paio di minuti.")}</span>
      </div>
    </form>
  );
}
