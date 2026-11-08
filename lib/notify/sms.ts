// Invio SMS tramite Twilio (HTTP API, nessun SDK). Come per l'email: se le
// variabili d'ambiente non sono configurate non fa nulla (skipped) e non
// solleva mai eccezioni.
//
// Config (Vercel → Environment Variables):
//   TWILIO_ACCOUNT_SID  SID dell'account Twilio
//   TWILIO_AUTH_TOKEN   auth token Twilio
//   TWILIO_FROM_NUMBER  numero mittente in formato E.164, es. "+391234567890"
//
// Il numero del destinatario va salvato sul profilo atleta in formato E.164
// (es. +39333...): è il campo "Telefono" nella scheda atleta.

import type { ChannelResult } from "./email";

export async function sendSms(opts: { to: string; body: string }): Promise<ChannelResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { status: "skipped", detail: "Twilio non configurato" };

  try {
    const form = new URLSearchParams({ From: from, To: opts.to, Body: opts.body });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
      },
    );
    if (!res.ok) {
      return { status: "error", detail: `Twilio ${res.status}: ${await res.text()}` };
    }
    return { status: "sent" };
  } catch (e) {
    return { status: "error", detail: (e as Error).message };
  }
}
