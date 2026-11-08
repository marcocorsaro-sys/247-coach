// Notifica all'atleta alla pubblicazione di una tabella: email (Resend) + SMS
// (Twilio), in parallelo. Ogni canale è indipendente e tollerante ai guasti:
// se un provider non è configurato o fallisce, l'altro parte comunque e la
// pubblicazione non viene mai bloccata.

import { sendEmail, type ChannelResult } from "./email";
import { sendSms } from "./sms";

export type { ChannelResult, ChannelStatus } from "./email";

export interface PublishNotice {
  athleteName: string;
  athleteEmail: string | null;
  athletePhone: string | null;
  weekLabel: string;
  /** URL base dell'app, senza slash finale (es. https://...vercel.app). */
  appUrl: string;
}

export interface NotifyResult {
  email: ChannelResult;
  sms: ChannelResult;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function notifyWeekPublished(n: PublishNotice): Promise<NotifyResult> {
  const firstName = (n.athleteName.split(" ")[0] || n.athleteName).trim();
  // Punta alla home dell'app: se l'atleta non è loggato viene portato al login
  // e, dopo l'accesso, smistato da solo alla sua area allenamenti. Un link
  // diretto a /atleta, invece, con sessione scaduta non atterra bene.
  const link = `${n.appUrl.replace(/\/+$/, "")}/`;
  const subject = `Nuova tabella: ${n.weekLabel}`;

  const text =
    `Ciao ${firstName}, la tua coach ha pubblicato la tabella "${n.weekLabel}". ` +
    `La trovi qui: ${link}`;
  const html =
    `<p>Ciao ${escapeHtml(firstName)},</p>` +
    `<p>la tua coach ha pubblicato una nuova tabella di allenamento: ` +
    `<strong>${escapeHtml(n.weekLabel)}</strong>.</p>` +
    `<p><a href="${link}">Apri la tabella →</a></p>`;
  const smsBody =
    `Ciao ${firstName}! Nuova tabella "${n.weekLabel}" pubblicata dalla tua coach. ` +
    `Aprila: ${link}`;

  const skipped = (detail: string): ChannelResult => ({ status: "skipped", detail });

  const [email, sms] = await Promise.all([
    n.athleteEmail
      ? sendEmail({ to: n.athleteEmail, subject, html, text })
      : Promise.resolve(skipped("atleta senza email")),
    n.athletePhone
      ? sendSms({ to: n.athletePhone, body: smsBody })
      : Promise.resolve(skipped("atleta senza telefono")),
  ]);

  return { email, sms };
}
