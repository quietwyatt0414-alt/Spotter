# Setup (one time, about 30 minutes)

You'll set up three things: the **Firebase project** (sign-in + database + hosting), the **Firebase tool** on your Mac,
and the **link between GitHub and Firebase** so every change deploys by itself.

It's all free. Firebase's free plan needs no credit card, so it can never charge you.

---

## 1. Create the Firebase project

1. Go to **console.firebase.google.com**, sign in with Google, and click **Create a project**. Name it `spotter`.
   Note the **project ID** it shows (e.g. `spotter-4f2a1`). You'll need it.
2. Google Analytics: you can turn it **off**.

## 2. Register the website and get its config

1. On the project's home page click the **web icon `</>`**, nickname it `Spotter`, click **Register app**.
2. It shows `const firebaseConfig = { ... }`. Either:
   - paste that block to Claude and ask it to put it in, **or**
   - on GitHub open `firebase/config.js`, click the ✏️ pencil, replace the placeholder values with yours, and **Commit changes**.

> These values are meant to be public. What keeps people's data private is `firestore.rules`.

## 3. Turn on Google sign-in

**Build → Authentication → Get started → Sign-in method → Google →** switch on, pick your support email, **Save**.

## 4. Create the database

**Build → Firestore Database → Create database →** Standard edition (if asked) → a location near you
(for California: `us-west2` or `nam5`) → **Start in production mode**.

## 5. Install the Firebase tool on your Mac

In **Terminal**:

```
node -v
```

If that says "command not found", install the **LTS** version from **nodejs.org** and reopen Terminal. Then:

```
npm install -g firebase-tools
firebase login
```

(Permission error? Use `sudo npm install -g firebase-tools` and enter your Mac password.)

## 6. Connect GitHub to Firebase and deploy the privacy rules

Get the repo onto your Mac (the first time you use `git`, macOS may offer to install developer tools — say yes):

```
git clone https://github.com/quietwyatt0414-alt/Spotter.git
cd Spotter
```

Deploy the privacy rules:

```
firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

Then let Firebase set up the GitHub connection:

```
firebase init hosting:github --project YOUR_PROJECT_ID
```

Answer its questions like this:

| It asks | Answer |
|---|---|
| Which GitHub repository? | `quietwyatt0414-alt/Spotter` (it opens GitHub in your browser to approve) |
| Set up the workflow to run a build script before every deploy? | **N** |
| Set up automatic deployment… when a PR is merged? | **Y**, branch **main** |
| File `.github/workflows/…` already exists. Overwrite? | **N** (the repo already has the right ones) |

It creates a secret in your GitHub repo named something like `FIREBASE_SERVICE_ACCOUNT_SPOTTER_4F2A1`.
**Tell Claude your project ID** (or that secret's name) so it can point the workflows at it.

## 7. Done

Claude pushes the final touches, GitHub deploys, and your site is live at `https://YOUR_PROJECT_ID.web.app`.

- Open it, **Sign in with Google**.
- Moving over from the Claude version: there, **Settings → Copy backup**; here, **Settings → Paste backup**.
- Send friends the link. They should open it in **Safari or Chrome** (Google blocks sign-in inside Instagram, TikTok, Snapchat),
  then **Share → Add to Home Screen** (iPhone) or **⋮ → Install app** (Android).

---

## If something goes wrong

| What you see | Fix |
|---|---|
| "Almost set up. Paste your Firebase config…" | `firebase/config.js` still has placeholders (step 2). |
| "This address isn't on the Firebase project's allowed list" | Firebase → Authentication → **Settings → Authorized domains** → add the address. |
| Toast: "Cloud sync is off for you here" | Privacy rules aren't deployed. Re-run the rules command in step 6. |
| GitHub Actions says "Skipping deploy — secret isn't set up yet" | Finish step 6 and send Claude the project ID. |
| A deploy failed on GitHub (red ✗) | Open the failed run under the **Actions** tab and paste the error to Claude. |

## Good to know

- **You're the admin.** As the owner you can see everyone's logs in the Firebase console. The privacy rules apply
  to the app, not to you. Let friends know.
- **Free-plan limits:** 50,000 database reads and 20,000 writes a day, 1 GiB stored, ~360 MB/day of site downloads.
  A group of friends won't get close. If you ever did, syncing pauses until the next day. No bill.
