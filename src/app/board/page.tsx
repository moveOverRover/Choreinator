import { logMissesAction } from "../admin/actions";
import { ConfirmButton } from "../admin/rounds/[id]/confirm-button";
import { requireApproved } from "@/lib/auth";
import { activeRound, choreById, today } from "@/lib/domain";
import { formIsConfigured, readFormResponses } from "@/lib/form";
import { readDb } from "@/lib/store";
import { buildBoard, weekStartOf, type BoardPerson } from "@/lib/tracking";

export default async function BoardPage() {
  const user = await requireApproved();
  const isAdmin = user.role === "admin";
  const db = await readDb();
  const round = activeRound(db);

  if (!round) {
    return (
      <div>
        <h1 className="h1">Chore board</h1>
        <p className="card text-muted">No chores have been published yet.</p>
      </div>
    );
  }

  const assignments = db.assignments.filter((a) => a.roundId === round.id);
  const perChore = new Map<string, number>();
  for (const a of assignments) perChore.set(a.choreId, (perChore.get(a.choreId) ?? 0) + 1);

  const people: BoardPerson[] = assignments
    .map((a) => {
      const u = db.users.find((x) => x.email === a.email);
      const c = choreById(db, a.choreId);
      return {
        email: a.email,
        name: u?.name || a.email,
        formName: u?.formName || "",
        choreName: c?.name ?? a.choreId,
        formLabel: c?.formLabel ?? "",
        shared: (perChore.get(a.choreId) ?? 0) > 1,
      };
    })
    .sort((a, b) => a.choreName.localeCompare(b.choreName) || a.name.localeCompare(b.name));

  const now = today();
  const from = round.startsOn || (round.publishedAt || round.createdAt).slice(0, 10);
  let responses: Awaited<ReturnType<typeof readFormResponses>> = [];
  let formError = "";
  try {
    responses = await readFormResponses();
  } catch (e) {
    console.error(e);
    formError = "Couldn't read the chore submission sheet. Check that it's shared with the app's service account.";
  }
  // Newest week first; show at most 8 weeks.
  const allWeeks = buildBoard(people, responses, from, now).reverse();
  const weeks = allWeeks.slice(0, 8);
  const loggedByWeek = new Map<string, Set<string>>();
  for (const m of db.missed) {
    if (!loggedByWeek.has(m.weekStart)) loggedByWeek.set(m.weekStart, new Set());
    loggedByWeek.get(m.weekStart)!.add(m.email);
  }
  const thisWeek = weekStartOf(now);

  return (
    <div className="space-y-4">
      <h1 className="h1">Chore board: {round.name}</h1>
      <p className="text-sm text-muted">
        Weeks run Sunday–Saturday. A chore counts as done when it&apos;s submitted on the house chore form for that
        week. {isAdmin && "Admins: uncheck anyone who was excused, then log the rest as missed."}
      </p>
      {!formIsConfigured() && <p className="card bg-warn-bg text-sm">The chore submission form isn&apos;t connected yet.</p>}
      {formError && <p className="card bg-bad-bg text-sm text-bad">{formError}</p>}

      {weeks.length === 0 && <p className="card text-muted">The new chores haven&apos;t started yet ({from}).</p>}

      {weeks.map((w) => {
        const logged = loggedByWeek.get(w.weekStart) ?? new Set<string>();
        const missed = people.filter((p) => !w.cells[p.email]?.done);
        const inProgress = w.weekStart === thisWeek;
        return (
          <form key={w.weekStart} action={logMissesAction} className="card">
            <input type="hidden" name="weekStart" value={w.weekStart} />
            <div className="mb-2 flex flex-wrap items-baseline gap-2">
              <h2 className="h2 mb-0">
                {fmt(w.weekStart)} – {fmt(w.weekEnd)}
              </h2>
              <span className="text-sm text-muted">
                {people.length - missed.length}/{people.length} done{inProgress ? " · this week (in progress)" : ""}
              </span>
            </div>
            <ul className="divide-y divide-line">
              {people.map((p) => {
                const cell = w.cells[p.email];
                const isLogged = logged.has(p.email);
                return (
                  <li key={p.email} className="flex items-center gap-2 py-1.5 text-sm">
                    <span className={`pill ${cell?.done ? "bg-good-bg text-good" : "bg-bad-bg text-bad"}`}>
                      {cell?.done ? "✓ done" : inProgress ? "… not yet" : "✗ missed"}
                    </span>
                    <span className="font-medium">{p.name}</span>
                    <span className="text-muted">{p.choreName}</span>
                    {cell?.done && cell.evidence[0] && (
                      <span className="hidden truncate text-xs text-muted md:inline" title={cell.evidence.join("\n")}>
                        ({cell.evidence[0]})
                      </span>
                    )}
                    {isAdmin && !cell?.done && !inProgress && (
                      <span className="ml-auto">
                        {isLogged ? (
                          <span className="text-xs text-muted">logged</span>
                        ) : (
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" name="missed" value={p.email} defaultChecked />
                            <input type="hidden" name={`chore:${p.email}`} value={p.choreName} />
                            missed
                          </label>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
            {isAdmin && !inProgress && missed.some((p) => !logged.has(p.email)) && (
              <div className="mt-3 text-right">
                <ConfirmButton className="btn" confirm="Log the checked people as missed for this week?">
                  Log checked as missed
                </ConfirmButton>
              </div>
            )}
          </form>
        );
      })}
      {allWeeks.length > weeks.length && (
        <p className="text-xs text-muted">Showing the 8 most recent weeks.</p>
      )}
    </div>
  );
}

function fmt(d: string) {
  return new Date(d + "T12:00:00Z").toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "UTC" });
}
