import Link from "next/link";
import { notFound } from "next/navigation";
import { runLotteryAction, setAssignmentAction, setRoundStatusAction, updateRoundAction } from "../../actions";
import { ConfirmButton } from "./confirm-button";
import { activeChores, choreById, lotteryPeople, METHOD_LABEL } from "@/lib/domain";
import { readDb } from "@/lib/store";

export default async function RoundPage(props: PageProps<"/admin/rounds/[id]">) {
  const { id } = await props.params;
  const db = await readDb();
  const round = db.rounds.find((r) => r.id === id);
  if (!round) notFound();

  const people = lotteryPeople(db);
  const chores = activeChores(db);
  const prefs = new Map(db.preferences.filter((p) => p.roundId === id).map((p) => [p.email, p]));
  const assignments = db.assignments.filter((a) => a.roundId === id);
  const byEmail = new Map(assignments.map((a) => [a.email, a]));
  const log = db.log.filter((l) => l.roundId === id).sort((a, b) => a.seq - b.seq);
  const name = (cid: string) => (cid ? (choreById(db, cid)?.name ?? cid) : "—");
  const drawn = round.status === "drawn" || round.status === "published";

  // Everyone who is in the lottery or has an assignment in this round.
  const rows = [
    ...people,
    ...db.users.filter((u) => byEmail.has(u.email) && !people.includes(u)),
  ];
  const filled = new Map<string, number>();
  for (const a of assignments) filled.set(a.choreId, (filled.get(a.choreId) ?? 0) + 1);
  const firstChoiceCount = new Map<string, number>();
  for (const p of prefs.values()) firstChoiceCount.set(p.choice1, (firstChoiceCount.get(p.choice1) ?? 0) + 1);

  const status = (to: string, label: string, ghost = false, confirm?: string) => (
    <form action={setRoundStatusAction}>
      <input type="hidden" name="roundId" value={round.id} />
      <input type="hidden" name="status" value={to} />
      <ConfirmButton className={ghost ? "btn-ghost" : "btn"} confirm={confirm}>
        {label}
      </ConfirmButton>
    </form>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="h1 mb-0">{round.name}</h1>
        <span className="pill bg-warn-bg">{round.status}</span>
      </div>

      <form action={updateRoundAction} className="card no-print grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <input type="hidden" name="roundId" value={round.id} />
        <label>
          <span className="text-xs text-muted">Name</span>
          <input name="name" defaultValue={round.name} className="field" />
        </label>
        <label>
          <span className="text-xs text-muted">New chores start on (for the chore board)</span>
          <input name="startsOn" type="date" defaultValue={round.startsOn} className="field" />
        </label>
        <button className="btn-ghost">Save</button>
      </form>

      {/* Step controls */}
      <div className="card no-print space-y-3">
        <h2 className="h2 mb-0">Steps</h2>
        <ol className="space-y-3 text-sm">
          <li className="flex flex-wrap items-center gap-2">
            <b>1. Picking</b> — {prefs.size} of {people.length} people have submitted.
            {round.status === "open" && status("closed", "Close picking")}
            {round.status === "closed" && status("open", "Re-open picking", true)}
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <b>2. Lottery</b>
            {(round.status === "closed" || round.status === "drawn") && (
              <form action={runLotteryAction}>
                <input type="hidden" name="roundId" value={round.id} />
                <ConfirmButton
                  className="btn"
                  confirm={
                    round.status === "drawn"
                      ? "Re-run the lottery? This throws away the current results and any manual edits. The re-run count is shown to everyone on this page."
                      : undefined
                  }
                >
                  {round.status === "drawn" ? "Re-run lottery" : "Run lottery 🎲"}
                </ConfirmButton>
              </form>
            )}
            {round.drawCount > 0 && (
              <span className="text-muted">
                Run {round.drawCount} time{round.drawCount === 1 ? "" : "s"} · seed <code>{round.seed}</code>
              </span>
            )}
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <b>3. Adjust &amp; publish</b>
            {round.status === "drawn" && (
              <>
                {status("published", "Publish results", false, "Publish? Everyone will see their chore.")}
                {status("open", "Back to picking", true, "Go back to picking? Results stay until you re-run the lottery.")}
              </>
            )}
            {round.status === "published" && (
              <>
                <span className="text-good">Published {round.publishedAt.slice(0, 10)}</span>
                {status("drawn", "Unpublish to edit", true)}
              </>
            )}
            {drawn && (
              <Link className="btn-ghost" href={`/admin/rounds/${round.id}/print`}>
                Printable chore cards
              </Link>
            )}
          </li>
        </ol>
      </div>

      {/* Chore fill summary */}
      <div className="card overflow-x-auto">
        <h2 className="h2">Chores</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 pr-2">Chore</th>
              <th className="pr-2">Slots</th>
              <th className="pr-2">1st-choice demand</th>
              {drawn && <th>Filled</th>}
            </tr>
          </thead>
          <tbody>
            {chores.map((c) => (
              <tr key={c.id} className="border-t border-line">
                <td className="py-1 pr-2">{c.name}</td>
                <td className="pr-2">{c.slots}</td>
                <td className="pr-2">{firstChoiceCount.get(c.id) ?? 0}</td>
                {drawn && (
                  <td className={(filled.get(c.id) ?? 0) !== c.slots ? "font-semibold text-bad" : ""}>
                    {filled.get(c.id) ?? 0}/{c.slots}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* People */}
      <div className="card overflow-x-auto">
        <h2 className="h2">People</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 pr-2">Person</th>
              <th className="pr-2">Can&apos;t do</th>
              <th className="pr-2">Top 3</th>
              {drawn && <th>Assigned chore</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const p = prefs.get(u.email);
              const a = byEmail.get(u.email);
              return (
                <tr key={u.email} className="border-t border-line align-top">
                  <td className="py-2 pr-2">
                    <div className="font-medium">{u.name || u.email}</div>
                    {!p && <span className="pill bg-warn-bg">didn&apos;t submit</span>}
                    {p && !p.veto && !p.choice1 && !p.choice2 && !p.choice3 && (
                      <span className="pill bg-good-bg text-good">doesn&apos;t mind</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">{p ? name(p.veto) : ""}</td>
                  <td className="py-2 pr-2">
                    {p && (p.choice1 || p.choice2 || p.choice3) && (
                      <ol className="list-decimal pl-4">
                        {[p.choice1, p.choice2, p.choice3].map((c, i) => (
                          <li key={i} className={c ? "" : "text-muted"}>
                            {c ? name(c) : "no preference"}
                          </li>
                        ))}
                      </ol>
                    )}
                  </td>
                  {drawn && (
                    <td className="py-2">
                      <form
                        // Re-mount when the saved value changes so the select shows it after React's form reset.
                        key={a?.choreId ?? "none"}
                        action={setAssignmentAction}
                        className="flex flex-wrap items-center gap-1"
                      >
                        <input type="hidden" name="roundId" value={round.id} />
                        <input type="hidden" name="email" value={u.email} />
                        <select
                          name="choreId"
                          defaultValue={a?.choreId ?? ""}
                          className={`field w-auto ${!a ? "border-bad" : ""}`}
                        >
                          <option value="">— unassigned —</option>
                          {db.chores.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                              {p?.veto === c.id ? " (their can't-do!)" : ""}
                            </option>
                          ))}
                        </select>
                        <button className="btn-ghost px-2 py-1 text-xs">Set</button>
                      </form>
                      {a && (
                        <div className="mt-1 text-xs text-muted">
                          {METHOD_LABEL[a.method] ?? a.method}
                          {a.note ? ` · ${a.note}` : ""}
                        </div>
                      )}
                      {a && p?.veto === a.choreId && <div className="text-xs text-bad">⚠️ This is their can&apos;t-do chore</div>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {log.length > 0 && (
        <details className="card" open={round.status === "drawn"}>
          <summary className="cursor-pointer font-semibold">Lottery log (how every draw went)</summary>
          <ol className="mt-2 space-y-1 font-mono text-xs">
            {log.map((l) => (
              <li key={l.seq} className={l.text.startsWith("---") ? "pt-2 font-bold" : ""}>
                {l.text}
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  );
}
