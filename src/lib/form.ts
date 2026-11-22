import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { a1, sheetsClient } from "./store/google";
import { parseFormRows, type FormResponse } from "./tracking";

let cache: { at: number; data: Promise<FormResponse[]> } | undefined;

/**
 * Read the existing "Chore submission (Responses)" sheet that the Google Form writes to.
 * Set FORM_SPREADSHEET_ID (and optionally FORM_RESPONSES_TAB). The app's service
 * account only needs Viewer access to that sheet.
 * In local development without it, reads .data/form-responses.json (rows incl. header).
 */
export async function readFormResponses(): Promise<FormResponse[]> {
  if (cache && Date.now() - cache.at < 30_000) return cache.data;
  const data = load().then(parseFormRows);
  cache = { at: Date.now(), data };
  data.catch(() => (cache = undefined));
  return data;
}

async function load(): Promise<string[][]> {
  const id = process.env.FORM_SPREADSHEET_ID;
  if (id) {
    const tab = process.env.FORM_RESPONSES_TAB || "Form Responses 1";
    const res = await sheetsClient().spreadsheets.values.get({
      spreadsheetId: id,
      range: a1(tab, "A1:Z"),
    });
    return (res.data.values ?? []).map((r) => r.map((v) => String(v ?? "")));
  }
  try {
    return JSON.parse(
      await fs.readFile(path.join(process.cwd(), ".data", "form-responses.json"), "utf8"),
    );
  } catch {
    return [];
  }
}

export function formIsConfigured() {
  return Boolean(process.env.FORM_SPREADSHEET_ID);
}
