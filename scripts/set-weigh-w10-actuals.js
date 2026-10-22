'use strict';

/**
 * Store official Week 10 What's It Weigh Wednesday values (answer key only).
 * The public form never shows these until Sunday scoring.
 *
 *   node scripts/set-weigh-w10-actuals.js
 *   node scripts/set-weigh-w10-actuals.js --show
 *
 * Q2: 40 US gal × 8.34 lb/gal = 333.6, rounded to 334.
 * Q4: tongue weight = 5,000 × (16/2 − 6) / 16 = 625 lb.
 * Q5: loaded weight = 4,500 + 2,200 + 250 + 200 = 7,150 lb.
 *     tongue weight = 7,150 × (18/2 − 7) / 18 = 794.444… lb.
 *     794.444 / 7,150 = 11.111…% → 11.1%.
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w10';

const ACTUALS = {
  dryWeight: { lb: 13800, display: '13,800 pounds' },
  waterAdded: { lb: 334, display: '334 pounds' },
  gearDiff: { lb: 3000, display: '3,000 pounds' },
  tongueWeight: { lb: 625, display: '625 pounds' },
  hitchShare: { pct: 11.1, display: '11.1%' },
};

const LABELS = {
  dryWeight: 'Guess the dry weight',
  waterAdded: 'Just add water',
  gearDiff: 'Same truck. Same engine. Different towing capacity.',
  tongueWeight: 'Put Double D’s calculator to work',
  hitchShare: 'What percentage rests on the hitch?',
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

  console.log('\nSaving official Week 10 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w10 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
