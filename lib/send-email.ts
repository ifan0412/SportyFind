import "server-only";
import nodemailer from "nodemailer";
import { SITE } from "@/lib/site";

export type SendEmailResult = { sent: true } | { sent: false; reason: string };

export type SendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  /** Reply-To header only; never used as the From/sender address. */
  replyTo?: string;
};

function getSystemFromAddress() {
  return process.env.SYSTEM_FROM_EMAIL ?? SITE.systemFromEmail;
}

function normalizeRecipients(to: string | string[]) {
  return Array.isArray(to) ? to.join(", ") : to;
}

async function sendViaGmail(params: SendEmailParams): Promise<SendEmailResult | null> {
  const user = process.env.GMAIL_USER ?? SITE.supportEmail;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!pass) return null;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    await transporter.sendMail({
      from: getSystemFromAddress(),
      to: normalizeRecipients(params.to),
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { replyTo: params.replyTo } : {}),
    });

    return { sent: true };
  } catch (err) {
    return {
      sent: false,
      reason: err instanceof Error ? err.message : "Gmail SMTP error",
    };
  }
}

async function sendViaResend(params: SendEmailParams): Promise<SendEmailResult | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;

  const from = process.env.RESEND_FROM_EMAIL ?? `SportyFind <onboarding@resend.dev>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(params.to) ? params.to : [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: [params.replyTo] } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { sent: false, reason: body || `Resend error ${res.status}` };
  }

  return { sent: true };
}

/** Prefer Gmail SMTP (sportyfind.support@gmail.com); fall back to Resend. */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const gmailConfigured = Boolean(process.env.GMAIL_APP_PASSWORD);
  if (gmailConfigured) {
    const gmailResult = await sendViaGmail(params);
    if (gmailResult?.sent) return gmailResult;
    if (gmailResult && !gmailResult.sent) {
      console.error("Gmail send failed, trying Resend:", gmailResult.reason);
    }
  }

  const resendResult = await sendViaResend(params);
  if (resendResult !== null) return resendResult;

  if (gmailConfigured) {
    return {
      sent: false,
      reason: "Gmail and Resend both failed or are misconfigured",
    };
  }

  return {
    sent: false,
    reason: "GMAIL_APP_PASSWORD or RESEND_API_KEY not configured",
  };
}
