import { createAdminClient } from "@/lib/supabase/admin";
import type { TFn } from "@/lib/app-i18n";
import { saveCoachPrefs } from "@/app/atleta/actions";

const BOT = "Coachai247_bot";

/**
 * "Il tuo coach": nome del coach, collegamento Telegram (buonanotte serale
 * con l'allenamento di domani + avvisi quando la tabella cambia + chat).
 * compact = invito in home finché Telegram non è collegato.
 */
export default async function CoachPrefsCard({ athleteId, t, compact = false, back }: { athleteId: string; t: TFn; compact?: boolean; back?: string }) {
  const admin = createAdminClient();
  const [{ data: ai }, { data: p }] = await Promise.all([
    admin.from("ai_athlete_profiles").select("coach_name, telegram_chat_id, notify_evening, notify_plan, weather_weekday, weather_weekend").eq("athlete_id", athleteId).maybeSingle(),
    admin.from("profiles").select("mcp_token" as never).eq("id", athleteId).maybeSingle(),
  ]);
  const a = (ai ?? {}) as { coach_name?: string | null; telegram_chat_id?: number | null; notify_evening?: boolean; notify_plan?: boolean; weather_weekday?: string | null; weather_weekend?: string | null };
  const token = (p as { mcp_token?: string } | null)?.mcp_token;
  const coach = a.coach_name?.trim() || "";
  const linked = !!a.telegram_chat_id;
  const tg = token ? `https://t.me/${BOT}?start=l_${token}` : `https://t.me/${BOT}`;

  if (compact) {
    if (linked) return null;
    return (
      <div className="card" style={{ margin: "12px 0", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ flex: 1, minWidth: 200, fontSize: ".9rem", color: "var(--text-2)" }}>
          🌙 <b style={{ color: "var(--text)" }}>{t("Buonanotte dal tuo coach")}</b> · {t("ogni sera l'allenamento di domani su Telegram, e un avviso quando la tabella cambia")}
        </span>
        <a className="btn btn-primary btn-sm" href={tg} target="_blank" rel="noopener noreferrer">{t("Collega Telegram")}</a>
      </div>
    );
  }

  return (
    <div className="card" id="coach-prefs" style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: "1.02rem", marginBottom: 10 }}>🧑‍🏫 {t("Il tuo coach")}</div>
      <form action={saveCoachPrefs} style={{ display: "grid", gap: 12 }}>
        <input type="hidden" name="back" value={back ?? "/atleta/dispositivi#coach-prefs"} />
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: ".85rem", color: "var(--text-2)" }}>{t("Dagli un nome: lo userà in chat, su Telegram e in Claude")}</span>
          <input className="input" name="coach_name" defaultValue={coach} placeholder={t("es. Dan")} maxLength={30} style={{ maxWidth: 260 }} />
        </label>

        <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 12, padding: "10px 12px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ flex: 1, minWidth: 220, fontSize: ".9rem" }}>
              <b>Telegram</b> ·{" "}
              {linked ? <span style={{ color: "var(--emerald)" }}>{t("collegato")} ✓</span> : <span style={{ color: "var(--text-3)" }}>{t("non collegato")}</span>}
              <div style={{ fontSize: ".8rem", color: "var(--text-3)", marginTop: 2 }}>
                {t("Ogni sera ti scrive l'allenamento di domani, ti avvisa quando cambia la tabella e puoi rispondergli come in chat. Comandi: /domani, /oggi, /stato.")}
              </div>
            </span>
            <a className={`btn btn-sm ${linked ? "btn-subtle" : "btn-primary"}`} href={tg} target="_blank" rel="noopener noreferrer">
              {linked ? t("Apri Telegram") : t("Collega Telegram")}
            </a>
          </div>
          {!linked ? (
            <div style={{ fontSize: ".78rem", color: "var(--text-3)", marginTop: 6 }}>
              {t("Si apre il bot @Coachai247_bot: premi Avvia e sei collegato.")}
            </div>
          ) : null}
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".9rem" }}>
          <input type="checkbox" name="notify_evening" defaultChecked={a.notify_evening !== false} />
          {t("Buonanotte serale con l'allenamento di domani (verso le 20:30)")}
        </label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: ".85rem" }}>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: "var(--text-2)" }}>{t("Meteo nella buonanotte · dal lunedì al venerdì")}</span>
            <input className="input" name="weather_weekday" defaultValue={a.weather_weekday ?? ""} placeholder={t("es. Treviso")} maxLength={60} />
          </label>
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ color: "var(--text-2)" }}>{t("sabato e domenica")}</span>
            <input className="input" name="weather_weekend" defaultValue={a.weather_weekend ?? ""} placeholder={t("es. Jesolo")} maxLength={60} />
          </label>
        </div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: ".9rem" }}>
          <input type="checkbox" name="notify_plan" defaultChecked={a.notify_plan !== false} />
          {t("Avvisami quando il coach cambia la tabella e perché")}
        </label>
        <div>
          <button className="btn btn-primary btn-sm" type="submit">{t("Salva")}</button>
        </div>
      </form>
    </div>
  );
}
