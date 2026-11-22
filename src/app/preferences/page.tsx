import { PreferencesForm } from "./preferences-form";
import { requireApproved } from "@/lib/auth";
import { activeChores, currentRound } from "@/lib/domain";
import { readDb } from "@/lib/store";

export default async function PreferencesPage() {
  const user = await requireApproved();
  const db = await readDb();
  const round = currentRound(db);
  const chores = activeChores(db);
  const pref = round && db.preferences.find((p) => p.roundId === round.id && p.email === user.email);
  const open = round?.status === "open";

  return (
    <div className="space-y-4">
      <h1 className="h1">My picks{round ? `: ${round.name}` : ""}</h1>
      {!round && <p className="card text-muted">There&apos;s no chore round yet.</p>}
      {round && !open && (
        <p className="card bg-warn-bg text-sm">Picking is closed for this round. Your picks are shown below.</p>
      )}
      {round && !user.participates && (
        <p className="card bg-warn-bg text-sm">
          You&apos;re marked as sitting out this lottery. Talk to an admin if that&apos;s wrong.
        </p>
      )}
      {round && (
        <PreferencesForm
          disabled={!open}
          chores={chores.map((c) => ({ id: c.id, name: c.name, description: c.description, slots: c.slots }))}
          initial={{
            veto: pref?.veto ?? "",
            choice1: pref?.choice1 ?? "",
            choice2: pref?.choice2 ?? "",
            choice3: pref?.choice3 ?? "",
          }}
          savedAt={pref?.updatedAt}
        />
      )}
    </div>
  );
}
