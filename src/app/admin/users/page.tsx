import { addUsersAction, updateUserAction } from "../actions";
import { currentUser } from "@/lib/auth";
import { readDb } from "@/lib/store";

export default async function UsersPage() {
  const me = await currentUser();
  const db = await readDb();
  const order = { pending: 0, approved: 1, disabled: 2 } as const;
  const users = [...db.users].sort(
    (a, b) => order[a.status] - order[b.status] || (a.name || a.email).localeCompare(b.name || b.email),
  );

  return (
    <div className="space-y-4">
      <h1 className="h1">Residents ({users.length})</h1>

      <div className="space-y-2">
        {users.map((u) => (
          <form
            key={[u.email, u.name, u.formName, u.status, u.role, u.participates].join("|")}
            action={updateUserAction} className="card grid gap-2 sm:grid-cols-[1.4fr_1fr_auto]">
            <input type="hidden" name="email" value={u.email} />
            <input type="hidden" name="participatesField" value="1" />
            <div className="space-y-1">
              <input name="name" defaultValue={u.name} placeholder="Name" className="field font-medium" />
              <div className="truncate text-xs text-muted">{u.email}</div>
              {u.status === "pending" && <span className="pill bg-warn-bg">waiting for approval</span>}
              {u.status === "disabled" && <span className="pill bg-bad-bg text-bad">disabled</span>}
            </div>
            <div className="space-y-1 text-sm">
              <label className="block">
                <span className="text-xs text-muted">Name they type in the form</span>
                <input name="formName" defaultValue={u.formName} className="field" />
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="participates" defaultChecked={u.participates} /> In the lottery
              </label>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <select name="status" defaultValue={u.status} className="field" disabled={u.email === me?.email}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="disabled">Disabled</option>
              </select>
              <select name="role" defaultValue={u.role} className="field" disabled={u.email === me?.email}>
                <option value="resident">Resident</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn">{u.status === "pending" ? "Save / approve" : "Save"}</button>
            </div>
          </form>
        ))}
      </div>

      <form action={addUsersAction} className="card space-y-2">
        <h2 className="h2">Pre-approve residents</h2>
        <p className="text-sm text-muted">
          One per line: <code>email</code> or <code>email, Name</code>. They&apos;ll be approved the moment they
          sign in with that Google account.
        </p>
        <textarea name="emails" rows={4} className="field font-mono" placeholder="sam@gmail.com, Sam" />
        <button className="btn">Add</button>
      </form>
    </div>
  );
}
