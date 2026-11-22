import "server-only";
import { auth, sheets, type sheets_v4 } from "@googleapis/sheets";

let client: sheets_v4.Sheets | undefined;

/**
 * Google Sheets client authenticated as the app's service account.
 * Credentials come from env vars (see .env.example):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY
 */
export function sheetsClient(): sheets_v4.Sheets {
  if (client) return client;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY must be set.");
  }
  const googleAuth = new auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  client = sheets({ version: "v4", auth: googleAuth });
  return client;
}

/** Quote a tab name for A1 notation: My Tab -> 'My Tab'. */
export function a1(tab: string, range = "") {
  return `'${tab.replace(/'/g, "''")}'${range ? "!" + range : ""}`;
}
