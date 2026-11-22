import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { TableBackend } from "./backend";

/**
 * Development-only backend: stores the tabs in .data/db.json so the app can be run
 * and tried out without a Google Cloud project. Never used in production.
 */
export class LocalBackend implements TableBackend {
  private file: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(file = path.join(process.cwd(), ".data", "db.json")) {
    this.file = file;
  }

  private async load(): Promise<Record<string, string[][]>> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      return {};
    }
  }

  private async save(data: Record<string, string[][]>) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(data, null, 1));
  }

  /** Serialize writes so concurrent requests don't clobber the file. */
  private mutate(fn: (data: Record<string, string[][]>) => void) {
    const run = this.queue.then(async () => {
      const data = await this.load();
      fn(data);
      await this.save(data);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  async ensureTabs(schema: Record<string, readonly string[]>) {
    await this.mutate((data) => {
      for (const [tab, headers] of Object.entries(schema)) {
        if (!data[tab] || data[tab].length === 0) data[tab] = [[...headers]];
      }
    });
  }

  async readTabs(tabs: string[]) {
    await this.queue;
    const data = await this.load();
    return Object.fromEntries(tabs.map((t) => [t, (data[t] ?? []).slice(1)]));
  }

  async replaceRows(tab: string, headers: readonly string[], rows: string[][]) {
    await this.mutate((data) => {
      data[tab] = [[...headers], ...rows];
    });
  }

  async appendRows(tab: string, rows: string[][]) {
    await this.mutate((data) => {
      data[tab] = [...(data[tab] ?? [[]]), ...rows];
    });
  }

  async updateRow(tab: string, index: number, row: string[]) {
    await this.mutate((data) => {
      if (!data[tab]) data[tab] = [[]];
      data[tab][index + 1] = row;
    });
  }
}
