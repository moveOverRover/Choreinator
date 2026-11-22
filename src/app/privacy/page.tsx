export const metadata = { title: "Privacy – Choreinator" };

export default function PrivacyPage() {
  return (
    <div className="card mx-auto max-w-2xl space-y-3 text-sm">
      <h1 className="h1">Privacy policy</h1>
      <p>
        Choreinator is a chore-sharing tool used only by residents of our house. It is run by the house directors,
        not a company.
      </p>
      <h2 className="h2">What we collect</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Your name and email address from your Google account, when you sign in.</li>
        <li>The chores you pick (the one you can&apos;t do and your top 3), and the chore you are assigned.</li>
        <li>Whether your chore was done each week, based on the house chore submission form.</li>
      </ul>
      <h2 className="h2">How it is used and stored</h2>
      <p>
        This information is used only to run the chore lottery and track chores. It is stored in a Google Sheet owned
        by the house and is visible to house directors. Residents can see published chore assignments and the weekly
        chore board. We never sell or share it with anyone outside the house, and we don&apos;t use ads or tracking.
      </p>
      <h2 className="h2">Deleting your data</h2>
      <p>
        When you move out, or any time you ask, a director will remove your information. Contact{" "}
        <a className="underline" href="mailto:info@atangard.com">info@atangard.com</a>.
      </p>
    </div>
  );
}
