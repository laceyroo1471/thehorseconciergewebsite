'use strict';

/**
 * Store official Week 9 What's It Weigh Wednesday values (answer key only).
 * The public form never shows these until Sunday scoring.
 *
 *   node scripts/set-weigh-w9-actuals.js
 *   node scripts/set-weigh-w9-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w9';

const ACTUALS = {
  bettyPack: { lb: 5.3, display: '5.3 lbs' },
  bloodVolume: {
    choice: 4,
    display:
      '10–12 gallons. A typical adult horse’s blood volume is approximately 8% of its body weight, or about 40 liters for a 500 kg horse.',
  },
  humanTemp: {
    choice: 1,
    display:
      '98.6°F. A little comparative anatomy: normal temperatures differ between species.',
  },
  bandageMath: {
    choice: 2,
    display: '12 feet. Five yards equals 15 feet. Subtract the 3 feet used, and 12 feet remain.',
  },
  healing: {
    choice: 3,
    display:
      'Increased blood flow and localized swelling. Inflammation is part of the body’s natural healing process, not automatically a sign that something has gone wrong.',
  },
};

const LABELS = {
  bettyPack: 'The Betty Pack Challenge',
  bloodVolume: 'The Blood Volume Mystery',
  humanTemp: 'The Temperature Trick',
  bandageMath: 'The Bandage Math Challenge',
  healing: 'The Healing Surprise',
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

  console.log('\nSaving official Week 9 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w9 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
