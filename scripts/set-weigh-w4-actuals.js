'use strict';

/**
 * Store official Week 4 What's It Weigh Wednesday values (answer key only).
 *
 *   node scripts/set-weigh-w4-actuals.js
 *   node scripts/set-weigh-w4-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w4';

const ACTUALS = {
  outdoorHayLoss: { lb: 150 },
  annualHorseManure: { lb: 20075 },
  monthlyShoppingMiles: { lb: 176 },
  oneRatFeedLoss: { lb: 330 },
};

const LABELS = {
  outdoorHayLoss: 'Outdoor hay loss — 500-lb bale (lb)',
  annualHorseManure: 'Annual manure and urine (lb)',
  monthlyShoppingMiles: 'Monthly shopping and errand miles',
  oneRatFeedLoss: 'One rat — grain eaten or contaminated (lb)',
};

function loadContestModule() {
  return require(path.join(__dirname, '../firebase/functions/challenge-weigh-wednesday'));
}

function describe(actuals) {
  Object.keys(LABELS).forEach(function (key) {
    var row = actuals && actuals[key];
    var text = row && row.lb != null ? row.lb : '— not set —';
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

  console.log('\nSaving official Week 4 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w4 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
