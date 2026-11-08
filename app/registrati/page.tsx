import { redirect } from "next/navigation";
import Link from "next/link";
import { signUp } from "./actions";
import { isAiCoachMode } from "@/lib/ai/mode";
import { createClient } from "@/lib/supabase/server";
import { fmtDate, getRaceBundle } from "@/lib/site/races";
import GoogleButton from "@/components/auth/GoogleButton";
import { normLang, makeT, LOCALE } from "@/lib/app-i18n";
import LangToggle from "@/components/LangToggle";
import { getAppLang } from "@/lib/app-i18n/server";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; race?: string; connect?: string; lang?: string }>;
}) {
  if (!isAiCoachMode()) redirect("/login");
  const { error, race, connect, lang: qLang } = await searchParams;
  const lang = qLang ? normLang(qLang) : await getAppLang();
  const t = makeT(lang);
  // Già registrato: dalla CTA di una gara si va dritti all'onboarding con la gara scelta.
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (user) redirect(race ? `/onboarding?race=${encodeURIComponent(race)}` : "/onboarding");
  const raceInfo = race ? await getRaceBundle(race) : null;

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <LangToggle lang={lang} />
        </div>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 32 }}>
          <span className="dot">24</span>
          <span className="name">
            24/7 Coach<em>.</em>
          </span>
        </div>

        <span className="mono">{t("// CREA IL TUO ACCOUNT")}</span>

        <h1>
          {t("Il tuo coach AI di")} <em>triathlon</em> {t("e")} <em>trail</em>.
        </h1>

        <p>
          {t("Piano personalizzato costruito sui tuoi dati Garmin/Strava, aggiornato ogni settimana in base a come ti alleni davvero.")}
        </p>

        {raceInfo ? (
          <div className="pill ok pill-plain" style={{ marginTop: 16 }}>
            {t("Stai preparando {race}", { race: raceInfo.race.name })} · {fmtDate(raceInfo.race.race_date, { day: "numeric", month: "long", year: "numeric" }, LOCALE[lang])}
          </div>
        ) : null}

        {error ? (
          <div className="pill err" style={{ marginTop: 16 }}>
            {t(error)}
          </div>
        ) : null}

        <GoogleButton race={race} connect={connect} lang={lang} label={t("Registrati con Google")} />
        <p className="mono" style={{ margin: "18px 0 6px", color: "var(--text-3)" }}>{t("oppure con email")}</p>

        <form className="login-form" action={signUp}>
          <input type="hidden" name="lang" value={lang} />
          {race ? <input type="hidden" name="race" value={race} /> : null}
          {connect ? <input type="hidden" name="connect" value={connect} /> : null}
          <div className="field">
            <label className="label">{t("Nome e cognome")}</label>
            <input className="input" name="full_name" type="text" autoFocus required placeholder={t("Mario Rossi")} />
          </div>
          <div className="field">
            <label className="label">{t("Email")}</label>
            <input className="input" name="email" type="email" autoComplete="email" required placeholder={t("tu@email.it")} />
          </div>
          <div className="field">
            <label className="label">{t("Password (min 8 caratteri)")}</label>
            <input className="input" name="password" type="password" autoComplete="new-password" required minLength={8} placeholder="•••••••••" />
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: "100%", justifyContent: "center" }}>
            {t("Inizia")} <span className="arrow">→</span>
          </button>
        </form>

        <p className="mono" style={{ marginTop: 24, color: "var(--text-3)" }}>
          {t("Hai già un account?")} <Link href="/login" style={{ textDecoration: "underline" }}>{t("Accedi")}</Link>
        </p>
        <p className="mono" style={{ marginTop: 18, color: "var(--text-3)", fontSize: ".72rem" }}>{t("Una soluzione di")} <a href="https://77os.it/it" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>77OS</a> · <a href="/privacy" style={{ textDecoration: "underline" }}>{t("Privacy")}</a> · <a href="/terms" style={{ textDecoration: "underline" }}>{t("Termini")}</a></p>
      </div>
    </div>
  );
}
