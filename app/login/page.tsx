import { signIn } from "./actions";
import { IS_AI_APP, BRAND_DOT, BRAND_NAME } from "@/lib/branding";
import GoogleButton from "@/components/auth/GoogleButton";
import LangToggle from "@/components/LangToggle";
import { getT } from "@/lib/app-i18n/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; info?: string }>;
}) {
  const { error, info } = await searchParams;
  const { t, lang } = await getT();

  return (
    <div className="login-wrap">
      <div className="login-box">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
          <LangToggle lang={lang} />
        </div>
        <div className="brand" style={{ justifyContent: "center", marginBottom: 32 }}>
          <span className="dot">{BRAND_DOT}</span>
          <span className="name">
            {BRAND_NAME}<em>.</em>
          </span>
        </div>

        <span className="mono">{t("// ACCESSO")}</span>

        {IS_AI_APP ? (
          <>
            <h1>
              {t("Il tuo")} <em>{t("coach")}</em>,<br />
              {t("sempre con te.")}
            </h1>
            <p>
              {t("Piani su misura per triathlon e trail running, che si adattano a come ti alleni davvero.")}
            </p>
          </>
        ) : (
          <>
            <h1>
              {t("Le tabelle di")} <em>Irene</em>,<br />
              {t("tutte in un posto.")}
            </h1>
            <p>{t("Accedi con l'email e la password che ti ha dato Irene.")}</p>
          </>
        )}

        {error ? (
          <div className="pill err" style={{ marginTop: 16 }}>
            {t(error)}
          </div>
        ) : null}
        {info ? (
          <div className="pill ok" style={{ marginTop: 16 }}>
            {t(info)}
          </div>
        ) : null}

        {IS_AI_APP ? <GoogleButton label={t("Accedi con Google")} /> : null}
        {IS_AI_APP ? <p className="mono" style={{ margin: "18px 0 6px", color: "var(--text-3)" }}>{t("oppure con email")}</p> : null}

        <form className="login-form" action={signIn}>
          <div className="field">
            <label className="label">{t("Email")}</label>
            <input
              className="input"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              placeholder={t("tu@email.it")}
            />
          </div>

          <div className="field">
            <label className="label">{t("Password")}</label>
            <input
              className="input"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="•••••••••"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center" }}
          >
            {t("Accedi")} <span className="arrow">→</span>
          </button>
        </form>

        <p className="mono" style={{ marginTop: 24, color: "var(--text-3)" }}>
          {process.env.NEXT_PUBLIC_APP_MODE === "ai_coach" ? (
            <>
              {t("Non hai un account?")}{" "}
              <a href="/registrati" style={{ textDecoration: "underline" }}>
                {t("Crealo in 30 secondi")}
              </a>
            </>
          ) : (
            <>{t("Non hai un accesso? Chiedilo a Irene.")}</>
          )}
        </p>
        <p className="mono" style={{ marginTop: 18, color: "var(--text-3)", fontSize: ".72rem" }}>{t("Una soluzione di")} <a href="https://77os.it/it" target="_blank" rel="noopener" style={{ textDecoration: "underline" }}>77OS</a> · <a href="/privacy" style={{ textDecoration: "underline" }}>{t("Privacy")}</a> · <a href="/terms" style={{ textDecoration: "underline" }}>{t("Termini")}</a></p>
      </div>
    </div>
  );
}
