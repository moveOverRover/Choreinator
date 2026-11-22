// Weekly chore-completion board, computed from the existing "Chore submission"
// Google Form responses. Pure logic (no I/O) so it can be tested.

export interface FormResponse {
  /** YYYY-MM-DD the chore was finished (or the submission date as a fallback). */
  date: string;
  name: string;
  chore: string;
}

export interface BoardPerson {
  email: string;
  name: string;
  formName: string;
  choreName: string;
  formLabel: string;
  /** How many people share this chore (name matching is needed when > 1). */
  shared: boolean;
}

export interface BoardCell {
  done: boolean;
  /** The form answer(s) that counted, for display. */
  evidence: string[];
}

export interface BoardWeek {
  weekStart: string; // YYYY-MM-DD (Sunday)
  weekEnd: string; // YYYY-MM-DD (Saturday)
  cells: Record<string, BoardCell>; // by email
}

/** Uppercase, "&" -> "AND", drop everything that isn't a letter or digit. */
export function norm(s: string) {
  return s
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]/g, "");
}

/** Does the name typed in the form refer to this person? */
export function nameMatches(typed: string, person: { name: string; formName: string }) {
  const t = norm(typed);
  if (!t) return false;
  const candidates = [person.formName, person.name, person.name.split(/\s+/)[0]]
    .map(norm)
    .filter(Boolean);
  return candidates.some((c) => c === t || (t.length >= 3 && c.startsWith(t)) || (c.length >= 3 && t.startsWith(c)));
}

/** Parse "8/31/2026", "8/31/2026 14:46:11" or "2026-08-31" into YYYY-MM-DD. */
export function parseDate(s: string): string | undefined {
  s = s.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return ymd(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const y = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return ymd(y, +m[1], +m[2]);
  }
  return undefined;
}

function ymd(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return undefined as unknown as string;
  return dt.toISOString().slice(0, 10);
}

export function addDays(date: string, n: number) {
  const dt = new Date(date + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

/** The Sunday on or before `date`. The house's chore weeks run Sunday-Saturday. */
export function weekStartOf(date: string) {
  const dow = new Date(date + "T00:00:00Z").getUTCDay();
  return addDays(date, -dow);
}

/**
 * Turn raw sheet rows (header row first) into FormResponses by finding the
 * "name", "chore" and "what day" columns by their header text.
 */
export function parseFormRows(rows: string[][]): FormResponse[] {
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.toLowerCase());
  const col = (re: RegExp) => headers.findIndex((h) => re.test(h));
  const nameCol = col(/your name/);
  const choreCol = col(/your chore\??\s*$|what is your chore/);
  const dayCol = col(/what day/);
  const tsCol = col(/timestamp/);
  if (nameCol < 0 || choreCol < 0) return [];
  const out: FormResponse[] = [];
  for (const r of rows.slice(1)) {
    const date = parseDate(r[dayCol] ?? "") ?? parseDate(r[tsCol] ?? "");
    if (!date) continue;
    out.push({ date, name: (r[nameCol] ?? "").trim(), chore: (r[choreCol] ?? "").trim() });
  }
  return out;
}

/**
 * Build the board for every full or partial week from `from` (inclusive) to `to`
 * (inclusive). A person is "done" for a week if there is a form response in that
 * week for their chore; for shared chores the typed name must also match.
 */
export function buildBoard(
  people: BoardPerson[],
  responses: FormResponse[],
  from: string,
  to: string,
): BoardWeek[] {
  const weeks: BoardWeek[] = [];
  for (let ws = weekStartOf(from); ws <= to; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    const inWeek = responses.filter((r) => r.date >= ws && r.date <= we);
    const cells: Record<string, BoardCell> = {};
    for (const p of people) {
      const label = norm(p.formLabel);
      const altLabel = norm(p.choreName);
      const matches = inWeek.filter((r) => {
        const c = norm(r.chore);
        const choreOk = c === label || c === altLabel;
        if (!choreOk) return false;
        return p.shared ? nameMatches(r.name, p) : true;
      });
      // Also count a submission by name even if the chore label doesn't match
      // exactly (e.g. the form still lists last rotation's chore names).
      const byName = matches.length
        ? []
        : inWeek.filter((r) => !p.shared && nameMatches(r.name, p) && fuzzyChore(r.chore, p));
      const all = [...matches, ...byName];
      cells[p.email] = {
        done: all.length > 0,
        evidence: all.map((r) => `${r.date}: ${r.name} - ${r.chore}`),
      };
    }
    weeks.push({ weekStart: ws, weekEnd: we, cells });
  }
  return weeks;
}

/** Loose check: the typed chore shares a significant word with the assigned chore. */
function fuzzyChore(typed: string, p: BoardPerson) {
  const words = (s: string) =>
    new Set(
      s
        .toUpperCase()
        .split(/[^A-Z]+/)
        .filter((w) => w.length >= 4 && !["ROOM", "AND"].includes(w)),
    );
  const a = words(typed);
  for (const w of [...words(p.formLabel), ...words(p.choreName)]) if (a.has(w)) return true;
  return false;
}
