import "server-only";

/**
 * A minimal "spreadsheet of tabs" interface. Each tab is a header row followed by
 * data rows of strings. Two implementations: Google Sheets (production) and a local
 * JSON file (development without any Google setup).
 */
export interface TableBackend {
  /** Make sure each tab exists and has its header row. */
  ensureTabs(schema: Record<string, readonly string[]>): Promise<void>;
  /** Read data rows (header excluded) of several tabs in one call. */
  readTabs(tabs: string[]): Promise<Record<string, string[][]>>;
  /** Replace all data rows of a tab. */
  replaceRows(tab: string, headers: readonly string[], rows: string[][]): Promise<void>;
  /** Append data rows to a tab. */
  appendRows(tab: string, rows: string[][]): Promise<void>;
  /** Overwrite one data row (0-based index, header excluded). */
  updateRow(tab: string, index: number, row: string[]): Promise<void>;
}
