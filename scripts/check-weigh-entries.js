'use strict';

/**
 * Read-only check of What's It Weigh Wednesday entries.
 * Prints who has submitted guesses and who only dismissed the popup.
 *
 *   node scripts/check-weigh-entries.js
 */

const bootstrap = require('./weigh-wednesday-admin');

const ITEM_IDS = [
  'scoopBeet',
  'scoopTimothy',
  'cupBeet',
  'cupTimothy',
  'quarterAmino',
  'quarterVermont',
];

async function main() {
  bootstrap.initAdmin();
  const admin = bootstrap.loadAdmin();
  const db = admin.firestore();

  const snap = await db.collection('challengeRegistrations').get();

  const submitted = [];
  const dismissedOnly = [];

  snap.forEach((doc) => {
    const data = doc.data() || {};
    const block = data.weighWednesday;
    if (!block) return;
    const guesses = block.guesses || null;
    const complete =
      guesses && ITEM_IDS.every((id) => guesses[id] && guesses[id].lb != null && guesses[id].oz != null);
    const row = {
      uid: doc.id,
      name: data.name || '(no name)',
      email: data.email || '(no email)',
      submittedAt: block.submittedAt ? block.submittedAt.toDate().toISOString() : null,
      dismissedAt: block.dismissedAt ? block.dismissedAt.toDate().toISOString() : null,
    };
    if (complete) {
      row.guesses = ITEM_IDS.map((id) => `${id}=${guesses[id].lb}lb ${guesses[id].oz}oz`).join(', ');
      submitted.push(row);
    } else {
      dismissedOnly.push(row);
    }
  });

  console.log(`\nSubmitted guesses: ${submitted.length}`);
  submitted.forEach((r) => {
    console.log(`  ${r.name} <${r.email}>  at ${r.submittedAt}`);
    console.log(`    ${r.guesses}`);
  });

  console.log(`\nDismissed only (no complete guesses): ${dismissedOnly.length}`);
  dismissedOnly.forEach((r) => {
    console.log(`  ${r.name} <${r.email}>  dismissedAt ${r.dismissedAt}`);
  });
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
