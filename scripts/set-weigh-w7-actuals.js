'use strict';

/**
 * Store official Week 7 What's It Weigh Wednesday values (answer key only).
 * The public form never shows these numbers until Sunday scoring.
 *
 *   node scripts/set-weigh-w7-actuals.js
 *   node scripts/set-weigh-w7-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w7';

const ACTUALS = {
  saddlebags: { lb: 6.09, display: '6.09 lb' },
  aspenLoad: { pct: 19.72, display: '19.72%' },
  dioCost: { dollars: 0.63, display: '$0.63' },
  restingHr: { choice: 35, display: '30–40 beats per minute' },
  sweatLoss: { choice: 3, display: '2–4 gallons' },
};

const LABELS = {
  saddlebags: 'What’s in the saddlebags?',
  aspenLoad: 'What’s Aspen carrying?',
  dioCost: 'Draw It Out jug concentrate as prepared',
  restingHr: 'Normal resting heart rate range',
  sweatLoss: 'Gallons of sweat per hour in heat',
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

  console.log('\nSaving official Week 7 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w7 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
