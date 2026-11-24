import "server-only";

// Email is sent through a tiny Google Apps Script web app that runs as the house
// Google account (info@atangard.com) and uses its built-in MailApp. It's free,
// needs no extra accounts, and mail comes from the house address.
// See apps-script/mailer.gs and the README for setup.
//   EMAIL_WEBHOOK_URL    = the Apps Script web app URL (ends in /exec)
//   EMAIL_WEBHOOK_SECRET = shared secret, also stored in the script's properties

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export function mailIsConfigured() {
  return Boolean(process.env.EMAIL_WEBHOOK_URL && process.env.EMAIL_WEBHOOK_SECRET);
}

export async function sendMail(messages: Mail[]): Promise<{ sent: number; failed: string[] }> {
  const url = process.env.EMAIL_WEBHOOK_URL;
  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  if (!url || !secret) throw new Error("Email isn't set up (EMAIL_WEBHOOK_URL / EMAIL_WEBHOOK_SECRET).");

  // Apps Script answers a POST with a redirect to the result; fetch follows it.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, messages }),
    redirect: "follow",
  });
  const body = await res.text();
  let parsed: { ok?: boolean; sent?: number; failed?: string[]; error?: string };
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(`Mailer returned an unexpected response (HTTP ${res.status}).`);
  }
  if (!parsed.ok) throw new Error(`Mailer error: ${parsed.error ?? "unknown"}`);
  return { sent: parsed.sent ?? 0, failed: parsed.failed ?? [] };
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
