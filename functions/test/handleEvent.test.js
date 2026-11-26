// node --test test/   — checks what each Stripe event does to entitlements, with an in-memory Firestore stand-in.
const test = require('node:test');
const assert = require('node:assert');
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'demo-test';
const {handleEvent} = require('../index.js');

function fakeDb() {
  const docs = new Map();
  const ref = path => ({
    path,
    get:async () => ({exists:docs.has(path), data:() => docs.get(path)}),
    set:async (v, opt) => { const clean = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x && x.constructor && x.constructor.name.includes('Transform') ? 'TS' : x]));
      docs.set(path, opt && opt.merge ? {...(docs.get(path) || {}), ...clean} : clean); },
  });
  return {docs, doc:ref, collection:c => ({where:(f, op, val) => ({get:async () => {
    const hit = [...docs.entries()].filter(([p, d]) => p.startsWith(c + '/') && d[f] === val).map(([p]) => ({ref:ref(p)}));
    return {docs:hit, size:hit.length};
  }})})};
}
const paid = (over = {}) => ({type:'checkout.session.completed', data:{object:{id:'cs_1', mode:'payment', payment_status:'paid', client_reference_id:'uidA', amount_total:1999, currency:'usd', payment_intent:'pi_1', livemode:false, ...over}}});

test('a paid checkout unlocks Pro as a founding member', async () => {
  const db = fakeDb();
  assert.equal(await handleEvent(paid(), db), 'granted');
  const e = db.docs.get('entitlements/uidA');
  assert.equal(e.pro, true); assert.equal(e.founding, true); assert.equal(e.paymentIntent, 'pi_1'); assert.equal(e.amount, 1999);
});
test('the same event twice is harmless', async () => {
  const db = fakeDb(); await handleEvent(paid(), db);
  assert.equal(await handleEvent(paid(), db), 'already granted');
});
test('after the price goes up, buyers are not founding members', async () => {
  const db = fakeDb(); await handleEvent(paid({amount_total:2999}), db);
  assert.equal(db.docs.get('entitlements/uidA').founding, false);
});
test('an unpaid (bank transfer pending) checkout waits, then unlocks on async success', async () => {
  const db = fakeDb();
  assert.equal(await handleEvent(paid({payment_status:'unpaid'}), db), 'not paid yet');
  assert.equal(db.docs.has('entitlements/uidA'), false);
  assert.equal(await handleEvent({...paid(), type:'checkout.session.async_payment_succeeded'}, db), 'granted');
});
test('falls back to metadata.uid and rejects junk user ids', async () => {
  const db = fakeDb();
  assert.equal(await handleEvent(paid({client_reference_id:null, metadata:{uid:'uidB'}}), db), 'granted');
  assert.equal(db.docs.get('entitlements/uidB').pro, true);
  assert.equal(await handleEvent(paid({client_reference_id:'../x/y'}), db), 'no user');
});
test('a full refund takes Pro away; a partial refund does not', async () => {
  const db = fakeDb(); await handleEvent(paid(), db);
  assert.equal(await handleEvent({type:'charge.refunded', data:{object:{refunded:false, payment_intent:'pi_1'}}}, db), 'partial refund');
  assert.equal(db.docs.get('entitlements/uidA').pro, true);
  assert.equal(await handleEvent({type:'charge.refunded', data:{object:{refunded:true, payment_intent:'pi_1'}}}, db), 'revoked');
  assert.equal(db.docs.get('entitlements/uidA').pro, false);
});
test('other events are ignored', async () => {
  assert.equal(await handleEvent({type:'customer.created', data:{object:{}}}, fakeDb()), 'ignored');
});
