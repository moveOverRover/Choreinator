"use client";

import { startTransition, useActionState, useState } from "react";
import { savePreferencesAction, type PrefsState } from "../actions";

type ChoreOpt = { id: string; name: string; description: string; slots: number };
type Picks = { veto: string; choice1: string; choice2: string; choice3: string };

export function PreferencesForm({
  chores,
  initial,
  disabled,
  savedAt,
}: {
  chores: ChoreOpt[];
  initial: Picks;
  disabled: boolean;
  savedAt?: string;
}) {
  const [picks, setPicks] = useState<Picks>(initial);
  const [state, action, pending] = useActionState<PrefsState, FormData>(savePreferencesAction, {});
  const needed = Math.min(3, Math.max(0, chores.length - 1));
  const rankKeys = (["choice1", "choice2", "choice3"] as const).slice(0, needed);

  const set = (k: keyof Picks, v: string) => {
    setPicks((p) => {
      const next = { ...p, [k]: v };
      // A chore can only be used once: clear it from any other slot.
      for (const other of ["veto", "choice1", "choice2", "choice3"] as const) {
        if (other !== k && next[other] === v) next[other] = "";
      }
      return next;
    });
  };

  const usedElsewhere = (k: keyof Picks, id: string) =>
    (["veto", "choice1", "choice2", "choice3"] as const).some((o) => o !== k && picks[o] === id);

  const select = (k: keyof Picks, label: string, hint: string) => (
    <div key={k}>
      <label className="label" htmlFor={k}>
        {label}
      </label>
      <select
        id={k}
        name={k}
        className="field"
        value={picks[k]}
        onChange={(e) => set(k, e.target.value)}
        disabled={disabled}
        required
      >
        <option value="">{hint}</option>
        {chores.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
            {c.slots > 1 ? ` (${c.slots} people)` : ""}
            {usedElsewhere(k, c.id) ? " · already picked" : ""}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <form
        // Submit via onSubmit (not the `action` prop) so React doesn't reset the
        // selects back to blank after a successful save.
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
        className="card space-y-4 self-start"
      >
        <div className="rounded-md bg-bad-bg p-3">
          {select("veto", "🚫 The one chore I absolutely cannot do", "Choose one…")}
        </div>
        {rankKeys.map((k, i) =>
          select(k, `${["🥇", "🥈", "🥉"][i]} My ${["1st", "2nd", "3rd"][i]} choice`, "Choose…"),
        )}
        {!disabled && (
          <button className="btn w-full" disabled={pending}>
            {pending ? "Saving…" : "Save my picks"}
          </button>
        )}
        {state.error && <p className="text-sm text-bad">{state.error}</p>}
        {state.ok && <p className="text-sm text-good">Saved! You can change your picks until picking closes.</p>}
        {!state.ok && savedAt && (
          <p className="text-xs text-muted">Last saved {new Date(savedAt).toLocaleString()}</p>
        )}
        <p className="text-xs text-muted">
          How it works: everyone&apos;s 1st choices are handled first. If more people want a chore than it
          has spots, winners are drawn at random. Then 2nd choices, then 3rd. Anyone left gets a random open
          chore, but never the one they can&apos;t do.
        </p>
      </form>

      <div className="space-y-2">
        <h2 className="h2">What each chore involves</h2>
        {chores.map((c) => (
          <details key={c.id} className="card py-3">
            <summary className="cursor-pointer font-medium">
              {c.name}
              {c.slots > 1 && <span className="ml-2 text-xs text-muted">{c.slots} people</span>}
            </summary>
            <p className="mt-2 text-sm whitespace-pre-line text-muted">{c.description || "No description yet."}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
