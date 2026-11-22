import "server-only";
import type { TableBackend } from "./backend";
import { a1, sheetsClient } from "./google";

/**
 * Production backend: one Google Spreadsheet, one tab per table.
 * All writes use valueInputOption RAW so text typed by users is never
 * interpreted as a formula.
 */
export class SheetsBackend implements TableBackend {
  constructor(private spreadsheetId: string) {}

  async ensureTabs(schema: Record<string, readonly string[]>) {
    const api = sheetsClient();
    const meta = await api.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
      fields: "sheets.properties.title",
    });
    const existing = new Set(meta.data.sheets?.map((s) => s.properties?.title) ?? []);
    const missing = Object.keys(schema).filter((t) => !existing.has(t));
    if (missing.length > 0) {
      await api.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: missing.map((title) => ({
            addSheet: { properties: { title, gridProperties: { frozenRowCount: 1 } } },
          })),
        },
      });
    }
    // Write header rows where they are missing.
    const tabs = Object.keys(schema);
    const res = await api.spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges: tabs.map((t) => a1(t, "1:1")),
    });
    const data: sheets_v4_ValueRange[] = [];
    res.data.valueRanges?.forEach((vr, i) => {
      if (!vr.values || vr.values.length === 0 || vr.values[0].length === 0) {
        data.push({ range: a1(tabs[i], "A1"), values: [[...schema[tabs[i]]]] });
      }
    });
    if (data.length > 0) {
      await api.spreadsheets.values.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: { valueInputOption: "RAW", data },
      });
    }
  }

  async readTabs(tabs: string[]) {
    const res = await sheetsClient().spreadsheets.values.batchGet({
      spreadsheetId: this.spreadsheetId,
      ranges: tabs.map((t) => a1(t, "A2:Z")),
      valueRenderOption: "FORMATTED_VALUE",
    });
    const out: Record<string, string[][]> = {};
    tabs.forEach((t, i) => {
      out[t] = (res.data.valueRanges?.[i]?.values ?? []).map((r) => r.map((v) => String(v ?? "")));
    });
    return out;
  }

  async replaceRows(tab: string, headers: readonly string[], rows: string[][]) {
    const api = sheetsClient();
    await api.spreadsheets.values.clear({ spreadsheetId: this.spreadsheetId, range: a1(tab, "A2:Z") });
    await api.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: a1(tab, "A1"),
      valueInputOption: "RAW",
      requestBody: { values: [[...headers], ...rows] },
    });
  }

  async appendRows(tab: string, rows: string[][]) {
    if (rows.length === 0) return;
    await sheetsClient().spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: a1(tab, "A1"),
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: rows },
    });
  }

  async updateRow(tab: string, index: number, row: string[]) {
    const sheetRow = index + 2; // +1 for header, +1 for 1-based rows
    await sheetsClient().spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: a1(tab, `A${sheetRow}`),
      valueInputOption: "RAW",
      requestBody: { values: [row] },
    });
  }
}

type sheets_v4_ValueRange = { range: string; values: string[][] };
