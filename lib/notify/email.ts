// Invio email tramite Resend (HTTP API, nessun SDK). Tutto opzionale: se le
// variabili d'ambiente non sono configurate la funzione non fa nulla (skipped)
// e NON solleva eccezioni, così la pubblicazione della tabella non si rompe mai.
//
// Config (Vercel → Environment Variables):
//   RESEND_API_KEY    chiave API Resend (https://resend.com)
//   NOTIFY_EMAIL_FROM mittente verificato, es. "Irene <irene@irenecolettocoaching.com>"
//   NOTIFY_REPLY_TO   (opz.) indirizzo "rispondi a", es. "irene@trisutto.com":
//                     le email partono dal dominio verificato ma le risposte
//                     degli atleti arrivano sulla casella reale della coach.
//
// 24/7 Coach ha mittente SEPARATO (mai quello di Irene):
//   NOTIFY_EMAIL_FROM_247 / NOTIFY_REPLY_TO_247 (+ opz. RESEND_API_KEY_247).
//   Senza NOTIFY_EMAIL_FROM_247 le email 247 non partono (resta Telegram).
import { isAiCoachMode } from "@/lib/ai/mode";

export type ChannelStatus = "sent" | "skipped" | "error";
export interface ChannelResult {
  status: ChannelStatus;
  detail?: string;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** "247" = 24/7 Coach, "irene" = app di Irene. Default: dalla modalità dell'istanza. */
  brand?: "247" | "irene";
}): Promise<ChannelResult> {
  const is247 = (opts.brand ?? (isAiCoachMode() ? "247" : "irene")) === "247";
  const key = is247 ? process.env.RESEND_API_KEY_247 || process.env.RESEND_API_KEY : process.env.RESEND_API_KEY;
  const from = is247 ? process.env.NOTIFY_EMAIL_FROM_247 : process.env.NOTIFY_EMAIL_FROM;
  const replyTo = (is247 ? process.env.NOTIFY_REPLY_TO_247 : process.env.NOTIFY_REPLY_TO)?.trim();
  if (!key || !from) return { status: "skipped", detail: is247 ? "mittente 24/7 Coach non configurato" : "RESEND non configurato" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });
    if (!res.ok) {
      return { status: "error", detail: `Resend ${res.status}: ${await res.text()}` };
    }
    return { status: "sent" };
  } catch (e) {
    return { status: "error", detail: (e as Error).message };
  }
}
