import Link from "next/link";
import { activeChores, currentRound, lotteryPeople } from "@/lib/domain";
import { formIsConfigured } from "@/lib/form";
import { readDb } from "@/lib/store";

export default async function AdminHome() {
  const db = await readDb();
  const round = currentRound(db);
  const people = lotteryPeople(db);
  const chores = activeChores(db);
  const slots = chores.reduce((n, c) => n + c.slots, 0);
  const pending = db.users.filter((u) => u.status === "pending");
  const submitted = round ? db.preferences.filter((p) => p.roundId === round.id).length : 0;

  return (
    <div className="space-y-4">
      <h1 className="h1">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="People in the lottery" value={people.length} href="/admin/users" />
        <Stat label="Active chores / slots" value={`${chores.length} / ${slots}`} href="/admin/chores" />
        <Stat label="Waiting for approval" value={pending.length} href="/admin/users" />
      </div>

      {slots < people.length && (
        <p className="card bg-warn-bg text-sm">
          ⚠️ There are {people.length} people but only {slots} chore slots. Add slots or chores before running
          the lottery, or {people.length - slots} people will be left unassigned.
        </p>
      )}
      {!formIsConfigured() && (
        <p className="card bg-warn-bg text-sm">
          The chore-submission form sheet isn&apos;t connected (FORM_SPREADSHEET_ID), so the chore board has no data.
        </p>
      )}

      <div className="card">
        <h2 className="h2">Current round</h2>
        {round ? (
          <p>
            <Link className="font-medium underline" href={`/admin/rounds/${round.id}`}>
              {round.name}
            </Link>{" "}
            · <span className="text-muted">{round.status}</span> · {submitted} of {people.length} submitted picks
          </p>
        ) : (
          <p className="text-muted">
            No rounds yet. <Link className="underline" href="/admin/rounds">Start one</Link>.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string | number; href: string }) {
  return (
    <Link href={href} className="card block hover:border-accent">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </Link>
  );
}
