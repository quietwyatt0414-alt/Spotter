# Spotter

A free workout tracker: routines, live logging with your previous sets, rest timer, PRs, a calendar with
day streaks, an exercise-by-exercise progress view that tells you whether you're progressively
overloading, gym-switch fixes, sick/vacation days, 20 color themes, and imports from Liftoff, Strong, Hevy and any CSV.

It runs as a website with **Sign in with Google** (Firebase), so friends can use it from a link and add it to their home screen.

- **Live site:** `https://spotter-6d902.web.app` (after setup)
- **Demo with 5 months of sample data:** `https://spotter-6d902.web.app/demo/`

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
| `app/index.html` | **The whole app** — one self-contained HTML file. Edit this. It's also the exact file published as the Spotter page on Claude. |
| `app/demo-data.html` | Generates the demo lifter's 5 months of data (only used for `/demo/`). |
| `firebase/host.html` | Google sign-in screen + Firestore saving, added in front of the app for the website. |
| `firebase/config.js` | Your Firebase project's web config (public by design). |
| `firebase/sw.js`, `manifest.webmanifest`, `icons/` | Home-screen app icon and offline support. |
| `scripts/build.py` | Builds `public/` (the website) from the files above. GitHub Actions runs it on every deploy. |
| `firestore.rules` | Privacy rules: each person can only read and write their own data. |
| `.github/workflows/` | Auto-deploy: live on `main`, previews on pull requests. |

Build locally (optional): `python3 scripts/build.py`, then `firebase serve` or `firebase emulators:start --only hosting`.

## Notes for whoever edits this next (including Claude)

- Keep the app a **single file** in `app/index.html`. The website and the demo are built by inserting one block before
  the app's `<script>\n(() => {` line — don't change that line, or `scripts/build.py` can't find where to insert.
- The app saves through a tiny Firestore-like interface (`claude.use('db')`, `collection().get()`, `doc().set()`).
  On Claude that's Claude's storage; on the website `firebase/host.html` provides the same interface backed by Firestore.
  Hooks the app reads: `window.SPOTTER_HOST` (sign-in, account, wording) and `window.SPOTTER_DEMO` (demo data).
- Each person's data: `data/users/<uid>/profile`, `.../active` (workout in progress), `.../log-YYYY-MM` (one doc per month).
  If you add a new document name, update `firestore.rules` too and deploy rules: `firebase deploy --only firestore:rules`.
- Changes to `firestore.rules` are **not** deployed by the GitHub workflow (it only deploys hosting). Deploy them by hand.
