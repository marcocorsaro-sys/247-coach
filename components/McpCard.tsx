import { createAdminClient } from "@/lib/supabase/admin";
import type { TFn } from "@/lib/app-i18n";
import { regenerateMcpToken } from "@/app/atleta/actions";
import CopyField from "@/components/CopyField";

/**
 * "Il tuo coach in Claude o ChatGPT": guida passo passo al connettore
 * personalizzato (server MCP personale /api/mcp/<token>).
 * compact = barra in home che rimanda alla guida in Dispositivi.
 */
export default async function McpCard({ athleteId, t, compact = false }: { athleteId: string; t: TFn; compact?: boolean }) {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("mcp_token" as never).eq("id", athleteId).maybeSingle();
  const token = (data as { mcp_token?: string } | null)?.mcp_token;
  if (!token) return null;
  const url = `https://247coachai.com/api/mcp/${token}`;

  if (compact)
    return (
      <div className="card" style={{ margin: "12px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 200, fontSize: ".9rem", color: "var(--text-2)" }}>
          🤖 <b style={{ color: "var(--text)" }}>{t("Il tuo coach in Claude o ChatGPT")}</b> · {t("chiedi della tabella e scrivi al coach dalla tua chat AI")}
        </span>
        <a className="btn btn-subtle btn-sm" href="/atleta/dispositivi#mcp">{t("Collega in 2 minuti →")}</a>
      </div>
    );

  const box = { border: "1px solid var(--line, rgba(255,255,255,.1))", borderRadius: 12, padding: "12px 14px" } as const;
  const li = { margin: "0 0 8px" } as const;
  const ex = [
    t("Com'è andato l'allenamento di oggi rispetto alla tabella?"),
    t("Spiegami la seduta di sabato: zone, watt e cosa mangiare."),
    t("A che tempo sono proiettato per la mia gara obiettivo? Cosa devo migliorare?"),
    t("Di' al coach che giovedì sono in viaggio e non posso allenarmi."),
    t("Rivedi la tabella adesso: questo weekend ho 5 ore."),
  ];
  return (
    <div className="card" id="mcp" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: "1.02rem", marginBottom: 6 }}>🤖 {t("Il tuo coach in Claude o ChatGPT")}</div>
      <p style={{ margin: "0 0 12px", color: "var(--text-2)", fontSize: ".92rem", lineHeight: 1.55 }}>
        {t("Collega 24/7 Coach al tuo assistente AI: potrai chiedergli com'è andato l'allenamento rispetto alla tabella, farti spiegare una seduta, vedere la proiezione gara, scrivere al coach o chiedere una revisione, direttamente dalla chat.")}
      </p>

      <div style={{ fontSize: ".82rem", color: "var(--text-3)", marginBottom: 6 }}>{t("Il tuo indirizzo personale (URL del connettore):")}</div>
      <CopyField value={url} />

      <div style={{ ...box, marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Claude <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: ".85rem" }}>· {t("funziona anche con il piano gratuito")}</span>
        </div>
        <ol style={{ margin: "0 0 0 18px", padding: 0, fontSize: ".9rem", color: "var(--text-2)", lineHeight: 1.55 }}>
          <li style={li}>
            {t("Dal computer apri")} <a href="https://claude.ai/customize/connectors" target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>claude.ai</a>{" "}
            {t("(o l'app Claude desktop) e vai in")} <b>{t("Personalizza → Connettori")}</b> <i>(Customize → Connectors)</i>.
          </li>
          <li style={li}>
            {t("Premi")} <b>{t("Aggiungi connettore personalizzato")}</b> <i>(Add custom connector)</i>.
          </li>
          <li style={li}>
            {t("Nome:")} <b>24/7 Coach</b> · {t("URL: incolla il tuo indirizzo qui sopra.")}{" "}
            {t("Se ti chiede l'autenticazione scegli")} <b>{t("Nessun accesso")}</b> <i>(No sign-in)</i>. {t("Poi")} <b>{t("Aggiungi")}</b>.
          </li>
          <li style={li}>
            {t("Apri una nuova chat, premi")} <b>+</b> → <b>{t("Connettori")}</b> {t("e verifica che 24/7 Coach sia attivo.")}
          </li>
          <li style={li}>
            {t("Scrivi la prima domanda. La prima volta Claude ti chiede il permesso di usare gli strumenti di 24/7 Coach: scegli")}{" "}
            <b>{t("Consenti sempre")}</b> <i>(Always allow)</i>.
          </li>
        </ol>
        <div style={{ fontSize: ".8rem", color: "var(--text-3)", marginTop: 4, lineHeight: 1.5 }}>
          📱 {t("Il connettore si aggiunge da computer; dopo lo trovi anche nell'app Claude su iPhone e Android, con lo stesso account.")}
        </div>
      </div>

      <div style={{ ...box, marginTop: 10 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          ChatGPT <span style={{ color: "var(--text-3)", fontWeight: 400, fontSize: ".85rem" }}>· {t("piani a pagamento, modalità sviluppatore")}</span>
        </div>
        <ol style={{ margin: "0 0 0 18px", padding: 0, fontSize: ".9rem", color: "var(--text-2)", lineHeight: 1.55 }}>
          <li style={li}>{t("Impostazioni → App e connettori → Avanzate: attiva la Modalità sviluppatore.")}</li>
          <li style={li}>{t("Crea un connettore: nome 24/7 Coach, URL qui sopra, autenticazione: nessuna.")}</li>
          <li style={li}>{t("In chat scegli Modalità sviluppatore e attiva 24/7 Coach.")}</li>
        </ol>
      </div>

      <div style={{ marginTop: 12, fontSize: ".88rem", color: "var(--text-2)" }}>
        <b style={{ color: "var(--text)" }}>{t("Cosa puoi chiedere:")}</b>
        <ul style={{ margin: "6px 0 0 18px", padding: 0, lineHeight: 1.6 }}>
          {ex.map((e) => <li key={e}>“{e}”</li>)}
        </ul>
        <div style={{ fontSize: ".8rem", color: "var(--text-3)", marginTop: 6, lineHeight: 1.5 }}>
          {t("La tabella si rivede da sola ogni domenica sera. I messaggi che mandi al coach da Claude o ChatGPT finiscono nella stessa chat dell'app.")}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: ".8rem", color: "var(--text-3)", lineHeight: 1.5 }}>
        <b>{t("Non funziona?")}</b> {t("Controlla di aver incollato l'indirizzo intero (finisce con il tuo codice), che il connettore sia attivo nella chat (+ → Connettori) e riprova in una chat nuova. Se hai rigenerato l'indirizzo, aggiornalo nel connettore.")}
      </div>

      <div style={{ fontSize: ".78rem", color: "var(--text-3)", marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 220 }}>
          {t("🔒 L'indirizzo è la tua chiave: non condividerlo. Se pensi che l'abbia visto qualcun altro, rigeneralo (dovrai aggiornarlo nel connettore).")}
        </span>
        <form action={regenerateMcpToken}>
          <button className="btn btn-subtle btn-sm" type="submit">{t("Rigenera indirizzo")}</button>
        </form>
      </div>
    </div>
  );
}
