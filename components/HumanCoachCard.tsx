import { cookies } from "next/headers";
import type { TFn } from "@/lib/app-i18n";
import { coachByInvite, coachesOfAthlete } from "@/lib/server/humanCoach";
import { acceptInvite, revokeCoach } from "@/app/pro/actions";

/**
 * Lato atleta: il suo allenatore umano su 247 (se c'è), con la possibilità di
 * togliergli l'accesso; e l'invito in sospeso (cookie) da accettare.
 * compact = solo il banner dell'invito, in home.
 */
export default async function HumanCoachCard({ athleteId, t, compact = false }: { athleteId: string; t: TFn; compact?: boolean }) {
  const coaches = await coachesOfAthlete(athleteId);
  const inv = (await cookies()).get("coach_invite")?.value;
  const pending = inv ? await coachByInvite(inv) : null;
  const showPending = pending && pending.user_id !== athleteId && !coaches.some((c) => c.user_id === pending.user_id);

  const invite = showPending ? (
    <div className="card" style={{ margin: "0 0 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", borderColor: "rgba(103,232,249,.4)" }}>
      <span style={{ flex: 1, minWidth: 220, fontSize: ".9rem" }}>🤝 <b>{pending!.display_name}</b> {t("ti ha invitato a farti seguire su 24/7 Coach: vedrà forma, allenamenti e tabella e potrà dare indicazioni al tuo coach AI.")}</span>
      <form action={acceptInvite}>
        <input type="hidden" name="code" value={inv} />
        <button className="btn btn-primary btn-sm" type="submit">{t("Accetta")}</button>
      </form>
    </div>
  ) : null;
  if (compact) return invite;

  return (
    <>
      {invite}
      <div className="card" id="coach-umano" style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: "1.02rem", marginBottom: 6 }}>🤝 {t("Il tuo allenatore")}</div>
        {coaches.length ? (
          coaches.map((c) => (
            <div key={c.user_id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", fontSize: ".9rem", marginBottom: 6 }}>
              <span style={{ flex: 1, minWidth: 200 }}>
                <b>{c.display_name}</b>{c.club ? ` · ${c.club}` : ""} · <span style={{ color: "var(--text-3)" }}>{t("vede forma, allenamenti e tabella e dà indicazioni al tuo coach AI")}</span>
              </span>
              <form action={revokeCoach}>
                <input type="hidden" name="coach_id" value={c.user_id} />
                <button className="btn btn-subtle btn-sm" type="submit">{t("Togli accesso")}</button>
              </form>
            </div>
          ))
        ) : (
          <div style={{ fontSize: ".86rem", color: "var(--text-2)" }}>{t("Nessun allenatore collegato. Se ti segue un allenatore, chiedigli il suo link di invito 24/7 Coach.")}</div>
        )}
      </div>
    </>
  );
}
