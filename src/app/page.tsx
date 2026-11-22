import Link from "next/link";
import { devSignInAction } from "./actions";
import { GoogleSignIn } from "./google-sign-in";
import { currentUser, devLoginEnabled } from "@/lib/auth";
import { activeRound, assignmentFor, choreById, currentRound, METHOD_LABEL } from "@/lib/domain";
import { readDb } from "@/lib/store";

export default async function Home(props: PageProps<"/">) {
  const user = await currentUser();
  if (!user) return <SignIn failed={(await props.searchParams).signin === "failed"} />;

  if (user.status !== "approved") {
    return (
      <div className="card mx-auto max-w-md text-center">
        <h1 className="h2">Almost there, {user.name || user.email}!</h1>
        <p className="text-muted">
          {user.status === "disabled"
            ? "Your account has been turned off. Talk to a house director if this is a mistake."
            : "A house director needs to approve your account before you can pick chores. Check back soon."}
        </p>
      </div>
    );
  }

  const db = await readDb();
  const round = currentRound(db);
  const active = activeRound(db);
  const mine = active && assignmentFor(db, active.id, user.email);
  const myChore = mine && choreById(db, mine.choreId);
  const myPref = round && db.preferences.find((p) => p.roundId === round.id && p.email === user.email);
  const pendingCount = db.users.filter((u) => u.status === "pending").length;

  return (
    <div className="space-y-4">
      <h1 className="h1">Hi {user.name.split(" ")[0] || "there"} 👋</h1>

      {user.role === "admin" && pendingCount > 0 && (
        <Link href="/admin/users" className="card block bg-warn-bg">
          {pendingCount} {pendingCount === 1 ? "person is" : "people are"} waiting for approval →
        </Link>
      )}

      {round?.status === "open" && (
        <div className="card">
          <h2 className="h2">Chore picking is open: {round.name}</h2>
          <p className="mb-3 text-sm text-muted">
            {myPref
              ? "You've submitted your picks. You can change them until picking closes."
              : "Pick the chore you can't do and rank your top 3."}
          </p>
          <Link href="/preferences" className="btn">
            {myPref ? "Change my picks" : "Make my picks"}
          </Link>
        </div>
      )}

      {round && (round.status === "closed" || round.status === "drawn") && (
        <div className="card">
          <h2 className="h2">{round.name}</h2>
          <p className="text-sm text-muted">Picking is closed. Results will show here once they&apos;re published.</p>
        </div>
      )}

      <div className="card">
        <h2 className="h2">Your chore</h2>
        {myChore ? (
          <>
            <p className="text-xl font-semibold">{myChore.name}</p>
            <p className="mb-2 text-xs text-muted">
              {active?.name} · {METHOD_LABEL[mine!.method] ?? mine!.method}
            </p>
            <p className="text-sm whitespace-pre-line">{myChore.description}</p>
          </>
        ) : (
          <p className="text-sm text-muted">You don&apos;t have a chore assigned yet.</p>
        )}
      </div>
    </div>
  );
}

function SignIn({ failed }: { failed: boolean }) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  return (
    <div className="card mx-auto mt-8 max-w-md space-y-6 text-center">
      <div>
        <h1 className="h1 mb-1">Choreinator</h1>
        <p className="text-muted">The house chore lottery. Sign in with your Google account to pick your chores.</p>
      </div>
      {clientId ? (
        <GoogleSignIn clientId={clientId} failed={failed} />
      ) : (
        <p className="text-sm text-bad">Google sign-in isn&apos;t set up yet (NEXT_PUBLIC_GOOGLE_CLIENT_ID).</p>
      )}
      {devLoginEnabled() && (
        <form action={devSignInAction} className="space-y-2 border-t border-line pt-4 text-left">
          <p className="text-xs font-semibold uppercase text-muted">Developer sign-in (local only)</p>
          <input name="email" type="email" placeholder="email" className="field" required />
          <input name="name" placeholder="name" className="field" />
          <button className="btn w-full">Sign in (dev)</button>
        </form>
      )}
    </div>
  );
}
