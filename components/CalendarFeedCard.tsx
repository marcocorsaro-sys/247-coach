import { createAdminClient } from "@/lib/supabase/admin";
import type { TFn } from "@/lib/app-i18n";

/**
 * Card "Allenamenti nel tuo calendario": link privato iCal (Google, Apple,
 * Outlook). Il calendario si aggiorna da solo quando il piano cambia.
 */
export default async function CalendarFeedCard({ athleteId, t, compact = false }: { athleteId: string; t: TFn; compact?: boolean }) {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("ical_token" as never).eq("id", athleteId).maybeSingle();
  const token = (data as { ical_token?: string } | null)?.ical_token;
  if (!token) return null;
  const https = `https://247coachai.com/api/cal/${token}.ics`;
  const webcal = https.replace(/^https:/, "webcal:");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  if (compact)
    return (
      <div className="card" style={{ margin: "12px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 200, fontSize: ".9rem", color: "var(--text-2)" }}>
          📅 <b style={{ color: "var(--text)" }}>{t("Allenamenti nel tuo calendario")}</b> · {t("si aggiorna da solo a ogni revisione")}
        </span>
        <a className="btn btn-subtle btn-sm" href={google} target="_blank" rel="noopener noreferrer">Google</a>
        <a className="btn btn-subtle btn-sm" href={webcal}>Apple / Outlook</a>
        <a className="btn btn-subtle btn-sm" href="/atleta/dispositivi#calendario-feed">{t("Link")}</a>
      </div>
    );
  return (
    <div className="card" id="calendario-feed" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>📅 {t("Allenamenti nel tuo calendario")}</div>
      <p style={{ margin: "0 0 10px", color: "var(--text-2)", fontSize: ".92rem", lineHeight: 1.55 }}>
        {t("Aggiungi la tabella al calendario che usi già (Google, iPhone, Outlook), anche con un account diverso da quello di registrazione. Si aggiorna da solo a ogni revisione del piano.")}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <a className="btn btn-primary" href={google} target="_blank" rel="noopener noreferrer">
          {t("Aggiungi a Google Calendar")}
        </a>
        <a className="btn" href={webcal}>
          {t("Apple Calendar / Outlook")}
        </a>
      </div>
      <div style={{ fontSize: ".8rem", color: "var(--text-3)", marginBottom: 4 }}>
        {t("Oppure copia questo link e usalo in \"Aggiungi calendario da URL\":")}
      </div>
      <input readOnly value={https} style={{ width: "100%", fontSize: ".8rem" }} />
      <div style={{ fontSize: ".78rem", color: "var(--text-3)", marginTop: 6 }}>
        {t("Il link è personale: non condividerlo. Google Calendar aggiorna i calendari esterni ogni qualche ora.")}
      </div>
    </div>
  );
}
