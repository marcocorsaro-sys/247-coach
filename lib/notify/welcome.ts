// Email di benvenuto 24/7 Coach: parte alla registrazione (email o Google).
// Usa Resend (lib/notify/email.ts): senza RESEND_API_KEY non fa nulla.
import { sendEmail } from "./email";

const APP = process.env.NEXT_PUBLIC_APP_URL ?? "https://247coachai.com";
const BOT = "https://t.me/Coachai247_bot?start=intervals";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function welcomeEmail(name: string, raceName?: string | null, lang: "it" | "en" = "it") {
  const en = lang === "en";
  const L = (it: string, e: string) => (en ? e : it);
  const first = esc((name.split(" ")[0] || name).trim());
  const race = raceName ? esc(raceName) : null;
  const step = (n: string, t: string, d: string) => `
    <tr><td style="padding:0 0 18px 0">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td width="44" valign="top"><div style="width:32px;height:32px;border-radius:8px;background:#c6f432;color:#0b0d0f;font:700 15px/32px 'JetBrains Mono',Menlo,monospace;text-align:center">${n}</div></td>
        <td valign="top" style="font:15px/1.55 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e6e8ea"><b style="color:#fff">${t}</b><br><span style="color:#a7afb6">${d}</span></td>
      </tr></table>
    </td></tr>`;
  const html = `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark light"><title>${L("Benvenuto in 24/7 Coach", "Welcome to 24/7 Coach")}</title></head>
<body style="margin:0;padding:0;background:#0b0d0f">
<div style="display:none;max-height:0;overflow:hidden">${race ? (en ? `Your plan for ${race} starts here.` : `Il tuo piano per ${race} parte da qui.`) : L("Il tuo coach AI per triathlon è pronto: 3 passi per partire.", "Your AI triathlon coach is ready: 3 steps to get going.")}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d0f"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
  <tr><td style="padding:0 0 28px 0;font:700 18px 'JetBrains Mono',Menlo,monospace;color:#fff">
    <span style="display:inline-block;background:#c6f432;color:#0b0d0f;border-radius:6px;padding:4px 7px;margin-right:8px">24</span>24/7 <span style="color:#c6f432">Coach</span>
  </td></tr>
  <tr><td style="background:#14181c;border:1px solid #22272c;border-radius:16px;padding:32px 28px">
    <div style="font:12px 'JetBrains Mono',Menlo,monospace;color:#c6f432;letter-spacing:.08em">${L("// BENVENUTO A BORDO", "// WELCOME ABOARD")}</div>
    <h1 style="margin:10px 0 14px;font:800 30px/1.15 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#fff">${L("Ciao", "Hi")} ${first},<br>${L("si parte", "let's go")}${race ? ` ${L("verso", "to")} <span style="color:#c6f432">${race}</span>` : ""}.</h1>
    <p style="margin:0 0 26px;font:16px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#a7afb6">${L("Da oggi hai un coach che non dorme mai: costruisce il tuo piano sul percorso della gara, legge i tuoi allenamenti veri e lo adatta ogni settimana. Bastano tre passi.", "From today you have a coach that never sleeps: it builds your plan on your race course, reads your real workouts and adapts it every week. Three steps are all it takes.")}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step("1", L("Racconta chi sei", "Tell us about you"), L("Obiettivo, gara, ore a disposizione e livello. Sono le domande che ti farebbe un coach al primo incontro: 5 minuti.", "Goal, race, available hours and level: the questions a coach would ask at your first meeting. 5 minutes."))}
      ${step("2", L("Collega Intervals.icu", "Connect Intervals.icu"), L("È gratuito e porta dentro anni di Garmin/Strava. Così il piano parte dai tuoi dati veri e gli allenamenti arrivano sull'orologio. Guida passo-passo nell'app, oppure ricevila su Telegram.", "It's free and brings in years of Garmin/Strava data, so your plan starts from real numbers and workouts land on your watch. Step-by-step guide in the app or on Telegram."))}
      ${step("3", L("Ricevi il piano", "Get your plan"), L("In 2-4 minuti: periodizzazione fino alla gara e prime due settimane dettagliate. Poi ogni settimana si adatta a come ti sei allenato. Se vuoi, aggiungilo con un clic a Google Calendar o al calendario dell'iPhone: si aggiorna da solo (sezione Dispositivi).", "In 2-4 minutes: periodisation up to race day and the first two weeks in detail. Then it adapts every week to how you actually trained. You can add it in one click to Google Calendar or your iPhone calendar, and it keeps itself up to date (Devices section)."))}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0"><tr>
      <td style="border-radius:10px;background:#c6f432"><a href="${APP}/onboarding" style="display:inline-block;padding:14px 22px;font:700 15px -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0b0d0f;text-decoration:none">${L("Completa il tuo profilo →", "Complete your profile →")}</a></td>
    </tr></table>
    <p style="margin:18px 0 0;font:14px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#a7afb6">📲 ${L("Vuoi la guida Intervals sul telefono?", "Want the Intervals guide on your phone?")} <a href="${BOT}" style="color:#c6f432">${L("Aprila su Telegram", "Open it on Telegram")}</a>.</p>
  </td></tr>
  <tr><td style="padding:22px 4px 0;font:13px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#6b737a">
    ${L("Gratis fino al 31 dicembre 2026 (fase alpha). Rispondi a questa email per qualsiasi dubbio: la leggiamo davvero.", "Free until 31 December 2026 (alpha). Reply to this email with any question: we really read it.")}<br><br>
    ${L("I piani sono generati con intelligenza artificiale e non sostituiscono il parere medico. 24/7 Coach non è affiliato a The IRONMAN Group né a Challenge Family.", "Plans are generated by AI and do not replace medical advice. 24/7 Coach is not affiliated with The IRONMAN Group or Challenge Family.")}<br>
    ${L("24/7 Coach è una soluzione di", "24/7 Coach is a solution by")} <a href="https://77os.it/it" style="color:#6b737a">77OS</a> · 77OS S.R.L. · Via Andrea Solari 11, 20144 Milano · <a href="${APP}/privacy${en ? "?lang=en" : ""}" style="color:#6b737a">Privacy</a> · <a href="${APP}/terms${en ? "?lang=en" : ""}" style="color:#6b737a">${L("Termini", "Terms")}</a>
  </td></tr>
</table></td></tr></table></body></html>`;
  const fn = name.split(" ")[0] || name;
  const text = en
    ? `Hi ${fn},
welcome to 24/7 Coach${raceName ? ` — let's go to ${raceName}` : ""}.

1) Tell us about you: goal, race, hours and level (5 minutes).
2) Connect Intervals.icu (free): it brings in Garmin/Strava and sends workouts to your watch.
3) Get your plan in 2-4 minutes; then it adapts every week. Add it to Google/Apple Calendar from the Devices section: it updates itself.

Complete your profile: ${APP}/onboarding
Intervals guide on Telegram: ${BOT}

Free until 31/12/2026. AI plans do not replace medical advice. 24/7 Coach is not affiliated with The IRONMAN Group or Challenge Family.
24/7 Coach is a solution by 77OS S.R.L. · ${APP}/privacy?lang=en`
    : `Ciao ${fn},
benvenuto in 24/7 Coach${raceName ? ` — si parte verso ${raceName}` : ""}.

1) Racconta chi sei: obiettivo, gara, ore e livello (5 minuti).
2) Collega Intervals.icu (gratis): porta dentro Garmin/Strava e manda gli allenamenti all'orologio.
3) Ricevi il piano in 2-4 minuti, poi si adatta ogni settimana. Aggiungilo a Google/Apple Calendar dalla sezione Dispositivi: si aggiorna da solo.

Completa il profilo: ${APP}/onboarding
Guida Intervals su Telegram: ${BOT}

Gratis fino al 31/12/2026. I piani AI non sostituiscono il parere medico. 24/7 Coach non è affiliato a The IRONMAN Group né a Challenge Family.
24/7 Coach è una soluzione di 77OS S.R.L. · ${APP}/privacy`;
  return { subject: en ? (raceName ? `Welcome to 24/7 Coach: next stop ${raceName}` : "Welcome to 24/7 Coach: 3 steps to your plan") : raceName ? `Benvenuto in 24/7 Coach: si parte verso ${raceName}` : "Benvenuto in 24/7 Coach: 3 passi per il tuo piano", html, text };
}

export async function sendWelcome(to: string | null | undefined, name: string, raceName?: string | null, lang: "it" | "en" = "it") {
  if (!to) return;
  const m = welcomeEmail(name, raceName, lang);
  try { await sendEmail({ to, ...m, brand: "247" }); } catch { /* mai bloccare la registrazione */ }
}
