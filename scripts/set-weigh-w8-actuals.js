'use strict';

/**
 * Store official Week 8 What's It Weigh Wednesday values (answer key only).
 * The public form never shows these until Sunday scoring.
 *
 *   node scripts/set-weigh-w8-actuals.js
 *   node scripts/set-weigh-w8-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w8';

const ACTUALS = {
  grazersHandful: { grams: 45, display: '45 grams' },
  halterApproach: {
    choice: 2,
    display: 'Counterconditioning by changing the horse’s emotional response',
  },
  mutualGrooming: { choice: 2, display: 'Allogrooming' },
  pressureRelease: { choice: 2, display: 'Negative reinforcement' },
  pawing: { choice: 2, display: 'Positive reinforcement' },
};

const LABELS = {
  grazersHandful: 'Grazers handful',
  halterApproach: 'Approaching with a halter',
  mutualGrooming: 'Mutual grooming',
  pressureRelease: 'Pressure and release',
  pawing: 'Pawing at the stall door',
};

function loadContestModule() {
  return require(path.join(__dirname, '../firebase/functions/challenge-weigh-wednesday'));
}

function describe(actuals) {
  Object.keys(LABELS).forEach(function (key) {
    var row = actuals && actuals[key];
    var text = '— not set —';
    if (row && row.display) text = row.display;
    console.log('  ' + LABELS[key]);
    console.log('    ' + text);
  });
}

async function main() {
  var show = process.argv.indexOf('--show') !== -1;
  var contest = loadContestModule();

  adminBoot.initAdmin();
  var admin = adminBoot.loadAdmin();
  var db = admin.firestore();

  if (show) {
    var snap = await db.collection('challengeContests').doc(CONTEST_ID).get();
    var data = snap.exists ? snap.data() || {} : {};
    console.log('\nStored answers for ' + CONTEST_ID + ':\n');
    describe(data.actuals);
    console.log('\nScored: ' + (data.scoredAt ? 'yes' : 'not yet'));
    return;
  }

  console.log('\nSaving official Week 8 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w8 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
