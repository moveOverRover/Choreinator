import { notFound } from "next/navigation";
import { PrintButton } from "./print-button";
import { readDb } from "@/lib/store";

/** Printable chore cards, like the house's monthly "Chore Sign-Up" doc. */
export default async function PrintPage(props: PageProps<"/admin/rounds/[id]/print">) {
  const { id } = await props.params;
  const db = await readDb();
  const round = db.rounds.find((r) => r.id === id);
  if (!round) notFound();

  const assignments = db.assignments.filter((a) => a.roundId === id);
  const cards = db.chores
    .filter((c) => c.active || assignments.some((a) => a.choreId === c.id))
    .map((c) => ({
      chore: c,
      people: assignments
        .filter((a) => a.choreId === c.id)
        .map((a) => db.users.find((u) => u.email === a.email)?.name || a.email),
    }));

  return (
    <div>
      <div className="no-print mb-4 flex items-center gap-2">
        <h1 className="h1 mb-0">Chore cards: {round.name}</h1>
        <PrintButton />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3">
        {cards.map(({ chore, people }) => (
          <div key={chore.id} className="card break-inside-avoid">
            <div className="text-sm font-bold uppercase tracking-wide">{chore.name}</div>
            <div className="mb-2 text-lg font-semibold">{people.join(", ") || "—"}</div>
            <hr className="mb-2 border-line" />
            <ul className="list-disc space-y-0.5 pl-4 text-xs">
              {chore.description
                .split(/(?<=\.)\s+|\n+/)
                .filter((s) => s.trim())
                .map((s, i) => (
                  <li key={i}>{s.trim()}</li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
