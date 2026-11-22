import { deleteChoreAction, saveChoreAction } from "../actions";
import { readDb } from "@/lib/store";
import type { Chore } from "@/lib/types";

export default async function ChoresPage() {
  const db = await readDb();
  const active = db.chores.filter((c) => c.active);
  const slots = active.reduce((n, c) => n + c.slots, 0);

  return (
    <div className="space-y-4">
      <h1 className="h1">Chores</h1>
      <p className="text-sm text-muted">
        {active.length} active chores, {slots} total slots. <b>Slots</b> = how many people a chore takes.{" "}
        <b>Form label</b> must match the answer in the Google Form&apos;s &quot;What is your chore?&quot; question so the
        chore board can match submissions.
      </p>
      {db.chores.map((c) => (
        <ChoreForm key={JSON.stringify(c)} chore={c} />
      ))}
      <div>
        <h2 className="h2">Add a chore</h2>
        {/* Keyed by chore count so the "add" form clears after adding one. */}
        <ChoreForm key={db.chores.length} />
      </div>
    </div>
  );
}

function ChoreForm({ chore }: { chore?: Chore }) {
  return (
    <div className={`card space-y-2 ${chore && !chore.active ? "opacity-60" : ""}`}>
      <form action={saveChoreAction} className="space-y-2">
        <input type="hidden" name="id" value={chore?.id ?? ""} />
        <input type="hidden" name="activeField" value="1" />
        <div className="grid gap-2 sm:grid-cols-[2fr_2fr_6rem]">
          <label>
            <span className="text-xs text-muted">Name</span>
            <input name="name" defaultValue={chore?.name} className="field font-medium" required />
          </label>
          <label>
            <span className="text-xs text-muted">Form label</span>
            <input name="formLabel" defaultValue={chore?.formLabel} className="field" placeholder="e.g. FRONT ENTRANCE" />
          </label>
          <label>
            <span className="text-xs text-muted">Slots</span>
            <input name="slots" type="number" min={0} max={50} defaultValue={chore?.slots ?? 1} className="field" />
          </label>
        </div>
        <textarea
          name="description"
          defaultValue={chore?.description}
          rows={2}
          className="field"
          placeholder="What does this chore involve?"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={chore?.active ?? true} /> Active
          </label>
          <button className="btn ml-auto">{chore ? "Save" : "Add chore"}</button>
        </div>
      </form>
      {chore && (
        <form action={deleteChoreAction} className="text-right">
          <input type="hidden" name="id" value={chore.id} />
          <button className="text-xs text-bad underline">Delete (only if never used)</button>
        </form>
      )}
    </div>
  );
}
