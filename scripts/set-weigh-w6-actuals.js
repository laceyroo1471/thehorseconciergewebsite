'use strict';

/**
 * Store official Week 6 What's It Weigh Wednesday values (answer key only).
 * The public form never shows these numbers until Sunday scoring.
 *
 *   node scripts/set-weigh-w6-actuals.js
 *   node scripts/set-weigh-w6-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w6';

const ACTUALS = {
  leverage: { lb: 10, display: '10 lbs' },
  mouthpieceThickness: { inches: 0.4375, display: '7/16"' },
  mylerThreeRing: { oz: 15.4, display: '15.4 oz' },
  weaverSnaffle: { oz: 9.44, display: '9.44 oz' },
  curbMouthpiece: { oz: 3.97, display: '3.97 oz' },
};

const LABELS = {
  leverage: 'Leverage — pressure on the mouth and poll',
  mouthpieceThickness: 'Standard Myler mouthpiece thickness',
  mylerThreeRing: 'Myler Three-ring combination bit, 04 mouthpiece, 5"',
  weaverSnaffle: 'Weaver O-Ring Snaffle, polished stainless, draft sized',
  curbMouthpiece: 'Baseline legal curb mouthpiece cylinder',
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

  console.log('\nSaving official Week 6 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w6 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
