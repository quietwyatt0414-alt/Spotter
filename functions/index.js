/* Chalkbook Pro: a one-time purchase through Stripe Checkout.

   createCheckout  (callable, signed in)  makes a Stripe Checkout page for the signed-in person and returns its URL.
   stripeWebhook   (HTTPS, called by Stripe) checks Stripe's signature, then writes entitlements/{uid}.

   Only this server code (and the owner) can write entitlements/{uid}; firestore.rules blocks everyone else, so
   nobody can unlock Pro from their browser. The app reads that document to know if someone has Pro.

   Settings come from functions/.env, which the "Deploy backend" GitHub workflow writes from repository secrets:
     STRIPE_SECRET_KEY      sk_test_… or sk_live_… (or a restricted key with Checkout Sessions: Write)
     STRIPE_WEBHOOK_SECRET  whsec_… from the webhook endpoint in the Stripe dashboard
     PRO_PRICE_CENTS        optional, default 1999 ($19.99). Change firebase/config.js's price label too.
   Needs the Firebase Blaze plan (Cloud Functions don't run on the free Spark plan). */
const {onCall, onRequest, HttpsError} = require('firebase-functions/https');
const {setGlobalOptions, logger} = require('firebase-functions');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const Stripe = require('stripe');

setGlobalOptions({region:'us-central1', maxInstances:3});
initializeApp();

const FOUNDING_MAX_CENTS = 1999;            // anyone who paid the launch price (or less) is a founding member
const priceCents = () => { const n = parseInt(process.env.PRO_PRICE_CENTS || '1999', 10); return n >= 50 ? n : 1999; };
let stripeClient;
const stripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) throw new HttpsError('failed-precondition', 'Payments aren’t set up yet.');
  return stripeClient || (stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY));
};

// only send people back to Chalkbook's own addresses (live site, PR previews, local testing)
const ORIGIN_OK = /^https:\/\/spotter-6d902(--[a-z0-9-]+)?\.(web\.app|firebaseapp\.com)$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const LIVE = 'https://spotter-6d902.web.app';

exports.createCheckout = onCall(async req => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in to buy Chalkbook Pro.');
  const uid = req.auth.uid;
  const ent = await getFirestore().doc('entitlements/' + uid).get();
  if (ent.exists && ent.data().pro) throw new HttpsError('already-exists', 'You already have Chalkbook Pro.');
  const origin = typeof (req.data && req.data.origin) === 'string' && ORIGIN_OK.test(req.data.origin) ? req.data.origin : LIVE;
  const email = req.auth.token && req.auth.token.email;
  const session = await stripe().checkout.sessions.create({
    mode:'payment',
    client_reference_id:uid,
    metadata:{uid},
    payment_intent_data:{metadata:{uid}},
    ...(email ? {customer_email:email} : {}),
    line_items:[{quantity:1, price_data:{currency:'usd', unit_amount:priceCents(),
      product_data:{name:'Chalkbook Pro', description:'One-time unlock for your Chalkbook account. No subscription.'}}}],
    allow_promotion_codes:true,
    success_url:origin + '/?pro=thanks',
    cancel_url:origin + '/?pro=cancel',
  });
  return {url:session.url};
});

/* What a Stripe event does to entitlements. Kept separate from the HTTPS wrapper so it can be tested. */
async function handleEvent(event, db) {
  const o = event.data && event.data.object;
  if (!o) return 'ignored';
  if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
    if (o.mode !== 'payment' || o.payment_status !== 'paid') return 'not paid yet';   // bank payments finish later
    const uid = o.client_reference_id || (o.metadata && o.metadata.uid);
    if (!uid || !/^[A-Za-z0-9_-]{1,128}$/.test(uid)) { logger.error('checkout without a Chalkbook user', {session:o.id}); return 'no user'; }
    const ref = db.doc('entitlements/' + uid);
    const cur = await ref.get();
    if (cur.exists && cur.data().pro && cur.data().session === o.id) return 'already granted';
    await ref.set({
      pro:true,
      founding:(o.amount_total || 0) <= FOUNDING_MAX_CENTS,
      amount:o.amount_total || 0,
      currency:o.currency || 'usd',
      session:o.id,
      paymentIntent:typeof o.payment_intent === 'string' ? o.payment_intent : (o.payment_intent && o.payment_intent.id) || '',
      livemode:!!o.livemode,
      since:FieldValue.serverTimestamp(),
    });
    return 'granted';
  }
  if (event.type === 'charge.refunded') {
    if (!o.refunded) return 'partial refund';                 // only a full refund takes Pro away
    const pi = typeof o.payment_intent === 'string' ? o.payment_intent : (o.payment_intent && o.payment_intent.id);
    if (!pi) return 'no payment';
    const q = await db.collection('entitlements').where('paymentIntent', '==', pi).get();
    await Promise.all(q.docs.map(d => d.ref.set({pro:false, refundedAt:FieldValue.serverTimestamp()}, {merge:true})));
    return q.size ? 'revoked' : 'no match';
  }
  return 'ignored';
}
exports.handleEvent = handleEvent;

exports.stripeWebhook = onRequest(async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('POST only'); return; }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) { res.status(500).send('Webhook secret not set'); return; }
  let event;
  try {
    // constructEvent only checks the signature; it doesn't call Stripe, so any key string works here
    event = (stripeClient || new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_unset')).webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], secret);
  } catch (e) {
    logger.warn('bad webhook signature', {message:e.message});
    res.status(400).send('Bad signature'); return;
  }
  try {
    const result = await handleEvent(event, getFirestore());
    logger.info('stripe event', {type:event.type, id:event.id, result});
    res.json({received:true, result});
  } catch (e) {
    logger.error('stripe event failed', {type:event.type, id:event.id, message:e.message});
    res.status(500).send('Try again');                         // Stripe retries for up to 3 days
  }
});
