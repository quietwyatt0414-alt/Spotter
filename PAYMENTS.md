# Spotter Pro payments (one-time setup, about 30 minutes, works from a phone)

Spotter Pro is a one-time unlock sold through **Stripe Checkout**. Nothing renews.

```
Buy Pro in the app ─▶ createCheckout function ─▶ Stripe checkout page ─▶ payment
                                                                           │
App unlocks Pro ◀── entitlements/<uid> in Firestore ◀── stripeWebhook function (checks Stripe's signature)
```

- `functions/index.js`: the two server functions. Only they (and you, the owner) can write `entitlements/<uid>`,
  so nobody can unlock Pro from their browser. A full refund in Stripe takes Pro away automatically.
- `firebase/host.html` listens to `entitlements/<uid>` and starts checkout. `app/index.html` has the Pro tools
  and the Pro screen (Settings → Spotter Pro).
- `.github/workflows/deploy-backend.yml` deploys the functions **and** `firestore.rules` from GitHub, so you never
  need to run `firebase deploy` on a computer again.
- `/stats/` shows Pro sales and lets you give Pro to someone for free.

Until step 7, the app shows "Pro goes on sale soon" and nothing can be bought. The Progress tab is locked for everyone without Pro either way (you can switch Pro on for people from `/stats/`).

## 1. Create a Stripe account

stripe.com → Sign up. You can do everything below in **test mode** first (the "Test mode" switch in the
dashboard). To take real money later, finish **Activate payments** (business type: individual / sole
proprietor, your bank account for payouts). Use **Witwire** as the public business name, so it's what buyers
see on their card statement.

In Stripe → Settings → Customer emails, turn on **Successful payments** so buyers get a receipt.

## 2. Switch Firebase to the Blaze plan

Firebase console → spotter-6d902 → bottom-left **Upgrade** → Blaze (pay as you go), add a card.
Cloud Functions only run on Blaze. At Spotter's size this should cost $0 to a few cents a month (the free
allowance covers 2 million function calls). Set a **budget alert** of $5 when it offers one.

## 3. Give the GitHub deploy account permission to deploy rules and functions

console.cloud.google.com → pick project **spotter-6d902** → IAM & Admin → IAM. Find the principal that starts
with `github-action-` and tap the pencil (Edit). Add these roles, then Save:

- Firebase Admin
- Cloud Functions Admin
- Service Account User
- Artifact Registry Administrator
- Service Usage Admin

(Just this once. From then on, every change to `firestore.rules` deploys by itself.)

## 4. Create the webhook in Stripe

Stripe → Developers → Webhooks → **Add endpoint**:

- Endpoint URL: `https://us-central1-spotter-6d902.cloudfunctions.net/stripeWebhook`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`

Open the new endpoint and copy its **Signing secret** (`whsec_…`).

## 5. Add two secrets to GitHub

GitHub → the Spotter repo → Settings → Secrets and variables → Actions → **New repository secret**:

| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **Secret key** (`sk_test_…` while testing) |
| `STRIPE_WEBHOOK_SECRET` | the `whsec_…` from step 4 |

## 6. Deploy the backend

GitHub → Actions → **Deploy backend** → Run workflow. It deploys the Firestore rules (this also switches on
analytics, feedback and Delete account if they weren't yet), runs the payment tests, and deploys the two
functions. If it fails, the red step says which permission or setting is missing.

## 7. Turn the Buy button on

In `firebase/config.js`, change `onSale: false` to `onSale: true`. Merge (GitHub's web editor is fine, or
ask Claude). Then on the live site: Settings → Spotter Pro → Buy, and pay with Stripe's test card
`4242 4242 4242 4242`, any future date, any CVC. Pro should unlock within a few seconds.

## 8. Go live

When the test purchase works: in Stripe, switch off test mode, repeat step 4 (live mode has its own webhook
and signing secret), update both GitHub secrets with the **live** values (`sk_live_…`, new `whsec_…`), and run
**Deploy backend** again. Buy it once yourself and refund it from Stripe to check both directions.

## Changing the price

The amount charged is `PRO_PRICE_CENTS` (default `1999`). To raise it to $29.99: GitHub → Settings → Secrets and
variables → Actions → **Variables** → `PRO_PRICE_CENTS` = `2999`, run **Deploy backend**, and change `price` in
`firebase/config.js` to `"$29.99"`. People who paid $19.99 or less stay marked as founding members.

## Giving Pro to friends for free

Open `https://chalkbook.web.app/stats/` (signed in with your Google account), find your friend under
**People** (search by name or email), and switch **Pro** on. It unlocks for them within seconds. Switch it off to take
it back.

People show up in that list after they open Spotter signed in once the Firestore rules are deployed (step 6). This
works even before Stripe is set up.

## Refunds and support

Refund from the Stripe dashboard (Payments → the payment → Refund). A full refund removes Pro from that account
within seconds. To give Pro without a payment (a friend, a tester, someone whose purchase got lost), use
**Give Pro** on `/stats/` with their User UID from Firebase console → Authentication → Users.
