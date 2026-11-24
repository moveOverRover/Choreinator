import "server-only";
import type {
  Assignment,
  Chore,
  Db,
  LogLine,
  MissedChore,
  Preference,
  Round,
  User,
} from "../types";
import type { TableBackend } from "./backend";
import { DEFAULT_CHORES } from "./default-chores";
import { LocalBackend } from "./local-backend";
import { SheetsBackend } from "./sheets-backend";

// ---- Table schema: tab name -> column headers (order matters) ----

const SCHEMA = {
  Users: ["email", "name", "status", "role", "formName", "participates", "createdAt"],
  Chores: ["id", "name", "description", "slots", "active", "formLabel", "sortOrder"],
  Rounds: ["id", "name", "status", "createdAt", "seed", "drawnAt", "publishedAt", "startsOn", "drawCount", "notifiedAt", "notifiedCount"],
  Preferences: ["roundId", "email", "veto", "choice1", "choice2", "choice3", "updatedAt"],
  Assignments: ["roundId", "email", "choreId", "method", "note"],
  LotteryLog: ["roundId", "seq", "text"],
  MissedChores: ["weekStart", "email", "name", "chore", "loggedAt", "loggedBy"],
} as const;
type Tab = keyof typeof SCHEMA;
const TABS = Object.keys(SCHEMA) as Tab[];

// ---- Row <-> object conversion ----

function toRow(tab: Tab, obj: object): string[] {
  const rec = obj as Record<string, unknown>;
  return SCHEMA[tab].map((h) => {
    const v = rec[h];
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    return v === undefined || v === null ? "" : String(v);
  });
}

function toObj(tab: Tab, row: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  SCHEMA[tab].forEach((h, i) => (out[h] = (row[i] ?? "").trim()));
  return out;
}

const bool = (s: string) => /^(true|yes|1|y)$/i.test(s);
const num = (s: string, d = 0) => (Number.isFinite(Number(s)) && s !== "" ? Number(s) : d);

function parseDb(raw: Record<string, string[][]>): Db {
  const rows = (t: Tab) =>
    (raw[t] ?? []).filter((r) => r.some((c) => c.trim() !== "")).map((r) => toObj(t, r));
  return {
    users: rows("Users").map((r) => ({
      email: r.email.toLowerCase(),
      name: r.name,
      status: (r.status || "pending") as User["status"],
      role: (r.role || "resident") as User["role"],
      formName: r.formName,
      participates: r.participates === "" ? true : bool(r.participates),
      createdAt: r.createdAt,
    })),
    chores: rows("Chores")
      .map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        slots: Math.max(0, Math.floor(num(r.slots, 1))),
        active: r.active === "" ? true : bool(r.active),
        formLabel: r.formLabel || r.name,
        sortOrder: num(r.sortOrder),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    rounds: rows("Rounds")
      .map((r) => ({ ...r, status: r.status as Round["status"], drawCount: num(r.drawCount), notifiedCount: num(r.notifiedCount) }) as unknown as Round)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    preferences: rows("Preferences").map(
      (r) => ({ ...r, email: r.email.toLowerCase() }) as unknown as Preference,
    ),
    assignments: rows("Assignments").map(
      (r) =>
        ({
          ...r,
          email: r.email.toLowerCase(),
          method: r.method as Assignment["method"],
        }) as Assignment,
    ),
    log: rows("LotteryLog").map((r) => ({ roundId: r.roundId, seq: num(r.seq), text: r.text })),
    missed: rows("MissedChores") as unknown as MissedChore[],
  };
}

// ---- Backend selection ----

let backend: TableBackend | undefined;
let ready: Promise<void> | undefined;

function getBackend(): TableBackend {
  if (backend) return backend;
  const id = process.env.DB_SPREADSHEET_ID;
  if (id) {
    backend = new SheetsBackend(id);
  } else if (process.env.NODE_ENV !== "production") {
    backend = new LocalBackend();
  } else {
    throw new Error("DB_SPREADSHEET_ID is not set.");
  }
  return backend;
}

async function init(): Promise<TableBackend> {
  const b = getBackend();
  if (!ready) {
    ready = (async () => {
      await b.ensureTabs(SCHEMA);
      const { Chores } = await b.readTabs(["Chores"]);
      if (Chores.filter((r) => r.some((c) => c)).length === 0) {
        await b.appendRows(
          "Chores",
          DEFAULT_CHORES.map((c, i) =>
            toRow("Chores", {
              id: slug(c.name),
              name: c.name,
              description: c.description,
              slots: 1,
              active: true,
              formLabel: c.formLabel,
              sortOrder: i + 1,
            }),
          ),
        );
      }
    })().catch((e) => {
      ready = undefined; // retry next time
      throw e;
    });
  }
  await ready;
  return b;
}

// ---- Reads (with a short cache to stay well under the Sheets API quota) ----

const CACHE_MS = 5_000;
let cache: { at: number; db: Promise<Db> } | undefined;

export async function readDb(fresh = false): Promise<Db> {
  if (!fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.db;
  const db = init()
    .then((b) => b.readTabs(TABS))
    .then(parseDb);
  cache = { at: Date.now(), db };
  db.catch(() => (cache = undefined));
  return db;
}

function invalidate() {
  cache = undefined;
}

// ---- Writes ----

/** Insert or update one row matched by key columns. Reads fresh to find the row. */
async function upsert<T extends object>(tab: Tab, obj: T, keys: (keyof T & string)[]) {
  const b = await init();
  const { [tab]: rows } = await b.readTabs([tab]);
  const rec = obj as Record<string, unknown>;
  const idx = rows.findIndex((r) => {
    const o = toObj(tab, r);
    return keys.every((k) => o[k].toLowerCase() === String(rec[k]).toLowerCase());
  });
  if (idx >= 0) await b.updateRow(tab, idx, toRow(tab, obj));
  else await b.appendRows(tab, [toRow(tab, obj)]);
  invalidate();
}

/** Remove rows matching `remove`, then append `add`. Rewrites the whole tab. */
async function replaceWhere(tab: Tab, remove: (o: Record<string, string>) => boolean, add: object[]) {
  const b = await init();
  const { [tab]: rows } = await b.readTabs([tab]);
  const kept = rows.filter((r) => r.some((c) => c) && !remove(toObj(tab, r)));
  await b.replaceRows(tab, SCHEMA[tab], [...kept, ...add.map((o) => toRow(tab, o))]);
  invalidate();
}

export const store = {
  saveUser: (u: User) => upsert("Users", { ...u, email: u.email.toLowerCase() }, ["email"]),
  saveChore: (c: Chore) => upsert("Chores", c, ["id"]),
  deleteChore: (id: string) => replaceWhere("Chores", (o) => o.id === id, []),
  saveRound: (r: Round) => upsert("Rounds", r, ["id"]),
  savePreference: (p: Preference) =>
    upsert("Preferences", { ...p, email: p.email.toLowerCase() }, ["roundId", "email"]),
  replaceAssignments: (roundId: string, list: Assignment[]) =>
    replaceWhere("Assignments", (o) => o.roundId === roundId, list),
  saveAssignment: (a: Assignment) => upsert("Assignments", a, ["roundId", "email"]),
  deleteAssignment: (roundId: string, email: string) =>
    replaceWhere(
      "Assignments",
      (o) => o.roundId === roundId && o.email.toLowerCase() === email.toLowerCase(),
      [],
    ),
  /** Remove a round and everything recorded for it (picks, results, lottery log). */
  deleteRound: async (roundId: string) => {
    for (const tab of ["Preferences", "Assignments", "LotteryLog"] as const) {
      await replaceWhere(tab, (o) => o.roundId === roundId, []);
    }
    await replaceWhere("Rounds", (o) => o.id === roundId, []);
  },
  replaceLog: (roundId: string, lines: LogLine[]) =>
    replaceWhere("LotteryLog", (o) => o.roundId === roundId, lines),
  addMissed: async (list: MissedChore[]) => {
    const b = await init();
    await b.appendRows("MissedChores", list.map((m) => toRow("MissedChores", m)));
    invalidate();
  },
};

export function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "chore"
  );
}
