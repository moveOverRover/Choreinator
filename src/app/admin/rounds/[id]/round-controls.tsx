"use client";

import { useActionState, useState } from "react";
import { deleteRoundAction, notifyRoundAction, type NotifyState } from "../../actions";
import { ConfirmButton } from "./confirm-button";

/** "Email everyone their chore" button with its result message. */
export function NotifyButton({
  roundId,
  count,
  notifiedAt,
  enabled,
}: {
  roundId: string;
  count: number;
  notifiedAt: string;
  enabled: boolean;
}) {
  const [state, action] = useActionState<NotifyState, FormData>(notifyRoundAction, {});
  const again = Boolean(notifiedAt);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="roundId" value={roundId} />
      <ConfirmButton
        className={again ? "btn-ghost" : "btn"}
        confirm={
          again
            ? `Emails were already sent on ${new Date(notifiedAt).toLocaleString()}. Send them again to all ${count}?`
            : `Email all ${count} people the chore they got?`
        }
      >
        {again ? "Email everyone again" : `📧 Email everyone their chore (${count})`}
      </ConfirmButton>
      {!enabled && <span className="text-xs text-muted">Email isn&apos;t set up yet.</span>}
      {again && !state.ok && !state.error && (
        <span className="text-xs text-muted">Last sent {new Date(notifiedAt).toLocaleString()}</span>
      )}
      {state.ok && <span className="text-sm text-good">{state.ok}</span>}
      {state.error && <span className="text-sm text-bad">{state.error}</span>}
    </form>
  );
}

/** Delete-round form: the button only enables once the round name is typed exactly. */
export function DeleteRound({ roundId, name }: { roundId: string; name: string }) {
  const [typed, setTyped] = useState("");
  return (
    <form action={deleteRoundAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="roundId" value={roundId} />
      <input
        name="confirmName"
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={`Type "${name}" to confirm`}
        className="field w-auto flex-1"
        autoComplete="off"
      />
      <ConfirmButton
        className="inline-flex items-center rounded-md bg-bad px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        confirm={`Permanently delete "${name}" with all its picks and results? This can't be undone.`}
        disabled={typed !== name}
      >
        Delete round
      </ConfirmButton>
    </form>
  );
}
