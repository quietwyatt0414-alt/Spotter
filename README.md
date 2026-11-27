# Chalkbook

A free workout tracker (free forever, no ads, optional one-time Pro): routines, live logging with your previous sets, rest timer, PRs, a calendar with
day streaks, an exercise-by-exercise progress view that tells you whether you're progressively
overloading, gym-switch fixes, sick/vacation days, 20 color themes, and imports from Liftoff, Strong, Hevy and any CSV.

It runs as a website with sign-in through Google, email or Apple (Firebase), so friends can use it from a link and add it to their home screen.

- **Live site:** `https://chalkbookapp.web.app` (after setup)
- **Demo with 5 months of sample data:** `https://chalkbookapp.web.app/demo/`

First time? Follow **[SETUP.md](SETUP.md)**.

## How updates work

```
change the code  →  pull request  →  preview link posted on the PR  →  merge  →  live in about a minute
```

- **Pull requests** get their own temporary preview site, so you can try changes on your phone first.
- **Merging (or pushing) to `main`** deploys to the live site automatically.
- Nothing to run on your computer after setup.

## What's where

| Path | What it is |
|---|---|
| `app/index.html` | **The whole app** — one self-contained HTML file. Edit this. It's also the exact file published as the Chalkbook page on Claude. |
| `app/demo-data.html` | Generates the demo lifter's 5 months of data (only used for `/demo/`). |
| `firebase/host.html` | Sign-in screen (Google, Apple, email) + Firestore saving, added in front of the app for the website. |
| `firebase/config.js` | Your Firebase project's web config (public by design). |
| `firebase/sw.js`, `manifest.webmanifest`, `icons/` | Home-screen app icon and offline support. |
| `scripts/build.py` | Builds `public/` (the website) from the files above. GitHub Actions runs it on every deploy. |
| `landing/` | The landing page at `/about/`: what Chalkbook is, screenshots, pricing, FAQ. Share this link in posts. Screenshots in `landing/shots/` come from the demo; `og.png` is the link-preview image. |
| `firebase/stats.html` | Owner-only stats page at `/stats/`: sign-ups, workouts, active people, 1-week retention, and feedback. |
| `firestore.rules` | Privacy rules: each person can only read and write their own data. |
| `functions/` | Chalkbook Pro payments: Stripe Checkout and the webhook that unlocks Pro (needs the Blaze plan). See **[PAYMENTS.md](PAYMENTS.md)**. |
| `.github/workflows/` | Auto-deploy: live on `main`, previews on pull requests. `deploy-backend.yml` deploys `firestore.rules` and `functions/` (after the one-time setup in PAYMENTS.md). |

Build locally (optional): `python3 scripts/build.py`, then `firebase serve` or `firebase emulators:start --only hosting`.

## Notes for whoever edits this next (including Claude)

- Keep the app a **single file** in `app/index.html`. The website and the demo are built by inserting one block before
  the app's `<script>\n(() => {` line — don't change that line, or `scripts/build.py` can't find where to insert.
- The app saves through a tiny Firestore-like interface (`claude.use('db')`, `collection().get()`, `doc().set()`).
  On Claude that's Claude's storage; on the website `firebase/host.html` provides the same interface backed by Firestore.
  Hooks the app reads: `window.SPOTTER_HOST` (sign-in, account, wording) and `window.SPOTTER_DEMO` (demo data).
- Each person's data: `data/users/<uid>/profile`, `.../active` (workout in progress), `.../log-YYYY-MM` (one doc per month).
  If you add a new document name, update `firestore.rules` too and deploy rules: `firebase deploy --only firestore:rules`.
- Changes to `firestore.rules` are deployed by the **Deploy backend** workflow once its service account has the roles in
  PAYMENTS.md step 3. Until then, deploy them by hand: `firebase deploy --only firestore:rules`.
- **Chalkbook Pro**: free = a workout log (logging, routines, history, PRs, streaks, imports, backups). Pro = the Progress
  tab (`progressOpen()`, locked without Pro except in the demo) and CSV export. Warm-up sets are free. The owner can give Pro free from `/stats/`. Pro tools call `proGate()`;
  `isPro()` reads `HOST.pro()`, which comes from `entitlements/<uid>` (written only by `functions/` and the owner).
  The demo has Pro unlocked. Server tests: `cd functions && npm test`.

## Analytics and feedback

- The website counts **anonymous daily totals** in Firestore (`metrics/YYYY-MM-DD`, UTC days): `signups`, `active`
  (signed-in people who opened the app that day), `workouts` (finished), and `w1` (people who signed up that day and came
  back 7–13 days later). No names, emails, cookies or third-party trackers. Only signed-in accounts are counted.
  `usermeta/<uid>` holds each person's own "already counted" flags. The code is in `firebase/host.html`.
- **Send feedback** in Settings saves to `feedback/` (anyone can send; nobody can edit or read others').
- See it all at **`/stats/`**. One-time setup: Firebase console → Authentication → Users → copy your **User UID**, paste it
  into the owner list in `firestore.rules` (already set to the current owner), then `firebase deploy --only firestore:rules`.
  Until the rules are deployed, nothing is counted and feedback can't be sent.

## Deleting accounts

- **Settings → Delete account** (signed in, website only) deletes the person's Firebase sign-in right away and writes
  `deletions/<uid>` with their email and name. Their log at `data/users/<uid>/` is kept.
- On **`/stats/`**, *Deleted accounts* lists them with days left. **Restore** copies the log into their new account
  (they sign in again, you paste their new User UID from Authentication → Users). **Delete for good** erases it.
- Nothing deletes automatically (the free plan has no server code), so check `/stats/` and delete logs past 30 days,
  as the privacy policy promises. Needs the same `firestore.rules` deploy as analytics.
