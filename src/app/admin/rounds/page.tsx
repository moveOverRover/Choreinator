import Link from "next/link";
import { createRoundAction } from "../actions";
import { readDb } from "@/lib/store";

export default async function RoundsPage() {
  const db = await readDb();
  const unfinished = db.rounds.find((r) => r.status !== "published");

  return (
    <div className="space-y-4">
      <h1 className="h1">Rounds &amp; lottery</h1>
      <p className="text-sm text-muted">
        A round is one chore rotation: open picking → close picking → run the lottery → adjust → publish.
      </p>

      {unfinished ? (
        <Link href={`/admin/rounds/${unfinished.id}`} className="card block bg-warn-bg">
          Continue <b>{unfinished.name}</b> ({unfinished.status}) →
        </Link>
      ) : (
        <form action={createRoundAction} className="card grid gap-2 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
          <label>
            <span className="label">New round name</span>
            <input name="name" className="field" placeholder="e.g. December 2026" />
          </label>
          <label>
            <span className="label">New chores start on</span>
            <input name="startsOn" type="date" className="field" />
          </label>
          <button className="btn">Open picking</button>
        </form>
      )}

      <div className="space-y-2">
        {db.rounds.map((r) => (
          <Link key={r.id} href={`/admin/rounds/${r.id}`} className="card flex justify-between hover:border-accent">
            <span className="font-medium">{r.name}</span>
            <span className="text-sm text-muted">
              {r.status} · {r.createdAt.slice(0, 10)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
