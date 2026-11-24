# Choreinator

The house chore lottery. Residents sign in with Google, pick the one chore they can't do, and rank their top 3. An admin runs a fair, reproducible lottery, adjusts the results if needed, and publishes them. A weekly board then shows who did their chore, based on the house's existing **Chore submission** Google Form.

All data lives in Google Sheets.

## How the lottery works

1. Everyone picks one chore they **can't do** and ranks their **top 3**.
2. **Round 1:** everyone's 1st choices, starting with the most popular chore. If more people want a chore than it has slots, the winners are drawn at random. Everyone else stays in the pool.
3. **Rounds 2 and 3:** the same process using 2nd and then 3rd choices, for people still unassigned, on chores that still have open slots.
4. **Leftovers:** anyone left (lost every draw, or didn't submit) gets a random open chore. It is **never** their can't-do chore. The matching rearranges leftovers if that's needed to respect everyone's can't-do. If it truly can't be done, the person is shown as unassigned for an admin to fix.

Each draw uses a random **seed** that is saved with the round, and the full step-by-step log is shown on the round page. The page also shows how many times the lottery was re-run. The seed, the log, and the re-run count are **visible to admins only**; residents only see their own chore and the chore board.

Chores have **slots** (how many people a chore takes), so the app works for any house size up to around 100 people.

## Using it (admins)

1. **Admin → Chores:** check the chore list, slots, and descriptions. The list starts from the October 2026 sign-up doc. The *Form label* has to match the answer in the Google Form's "What is your chore?" question exactly.
2. **Admin → Residents:** approve people after they first sign in, or pre-approve them by email. Untick *In the lottery* for anyone sitting out.
3. **Admin → Rounds:** start a round. This opens picking. Share the link with the house.
4. When picking should end, click **Close picking**, then **Run lottery**.
5. Adjust anyone's chore with the dropdown. Changes are labeled "Set by admin" with what it was before.
6. Click **Publish results**. Everyone sees their chore on the home page. **Printable chore cards** gives you cards to post.
7. **Chore board:** each week shows done / missed, based on Google Form submissions. Uncheck anyone who was excused, then click **Log checked as missed**. That adds rows to the `MissedChores` tab for the treasurer.

## Setup

You need a Google account that will own the data. The house account is a good choice so it outlives any one resident.

### 1. Google Cloud project (free)

1. Go to <https://console.cloud.google.com/> and create a project, e.g. "choreinator".
2. **APIs & Services → Library:** enable the **Google Sheets API**.
3. **APIs & Services → OAuth consent screen:**
   - User type: **External**.
   - Add the app name and a support email.
   - Scopes: the defaults only (email, profile, openid).
   - **Publish app** so you're not limited to test users. These basic scopes don't need Google's verification.
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
   - Authorized JavaScript origins: `http://localhost:3123` and, later, your live URL (e.g. `https://choreinator.vercel.app`).
   - Copy the **Client ID** into `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
5. **IAM & Admin → Service accounts → Create service account** (no roles needed).
   - Open it, go to **Keys → Add key → JSON**, and download the file.
   - Put `client_email` in `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `private_key` in `GOOGLE_PRIVATE_KEY`.
   - Keep this file secret and never commit it.

### 2. Spreadsheets

1. Create a new, empty Google Sheet called "Choreinator DB". Share it with the service account email as **Editor**. Put its ID (the long part of the URL between `/d/` and `/edit`) in `DB_SPREADSHEET_ID`. The app creates its tabs (`Users`, `Chores`, `Rounds`, `Preferences`, `Assignments`, `LotteryLog`, `MissedChores`) the first time it runs.
2. Share the existing **Chore submission (Responses)** sheet with the service account as **Viewer**. Put its ID in `FORM_SPREADSHEET_ID`.

### 3. Run locally

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev -- -p 3123
```

To try it out without any Google setup, leave everything empty except `DEV_LOGIN=1` and `ADMIN_EMAILS=admin@example.com`. Data is then stored in `.data/db.json`, and you can sign in by typing an email. Dev login is always disabled in production builds.

```bash
npm test        # lottery + tracking unit tests
```

## Hosting (free)

The recommended option is **Vercel's free Hobby plan**: it doesn't sleep, includes HTTPS, and gives you a `something.vercel.app` address.

1. Push this folder to a **private** GitHub repo.
2. At <https://vercel.com>, sign in with GitHub, choose **Add New → Project**, and import the repo.
3. Add every variable from `.env.example` under **Settings → Environment Variables**. Leave out `DEV_LOGIN`. Use a new random `SESSION_SECRET`.
4. Deploy, then add the live URL to the OAuth client's **Authorized JavaScript origins** (step 1.4).

## Undoing and deleting rounds

On a round's admin page:

- **Undo lottery** removes the results, manual changes, and log, and puts the round back to *picking closed*. Picks are kept, so you can re-run the lottery or re-open picking. The re-run count still shows.
- **Delete round** removes the round completely, including everyone's picks for it. To confirm, you type the round's name.

## Email notifications

After publishing, **📧 Email everyone their chore** sends each person their chore, its tasks, and a link to the app. The emails come from the house Google account through a free Google Apps Script (`apps-script/mailer.gs`), which allows about 1,500 emails a day on Google Workspace.

One-time setup, signed in as the house account:

1. Go to <https://script.google.com>, choose **New project**, and replace the code with `apps-script/mailer.gs`. Name the project "Choreinator mailer".
2. Go to **Project Settings → Script properties → Add property**. Set the name to `SECRET` and the value to a long random string.
3. Go to **Deploy → New deployment**. Choose the type **Web app**, set *Execute as* to **Me** and *Who has access* to **Anyone**, then click **Deploy**. Authorize it when asked.
4. In Vercel, under **Settings → Environment Variables**, add `EMAIL_WEBHOOK_URL` (the web app URL) and `EMAIL_WEBHOOK_SECRET` (the same random string). Then redeploy.

## Data and privacy notes

- The app stores each resident's Google email, name, and chore picks in the house's own Google Sheet. Nothing else is kept.
- Login cookies only prove who someone is. Approval and admin status are checked against the `Users` tab on every request, so disabling someone takes effect immediately.
- Everything is written to Sheets as plain text (`RAW`), so nothing a user types is ever run as a spreadsheet formula.
