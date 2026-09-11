'use strict';

/**
 * Store official Week 3 What's It Weigh Wednesday ground-force values (answer key only).
 * Pounds of peak vertical GRF on a 1,000-lb horse. Not shown on the public site.
 *
 *   node scripts/set-weigh-w3-actuals.js
 *   node scripts/set-weigh-w3-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w3';

const ACTUALS = {
  walkFore: { lb: 660 },
  walkHind: { lb: 510 },
  trotFore: { lb: 1180 },
  trotHind: { lb: 1040 },
  canterTrailFore: { lb: 1470 },
};

const LABELS = {
  walkFore: 'Walk — forelimb',
  walkHind: 'Walk — hindlimb',
  trotFore: 'Trot — forelimb',
  trotHind: 'Trot — hindlimb',
  canterTrailFore: 'Canter — trailing forelimb',
};

function loadContestModule() {
  return require(path.join(__dirname, '../firebase/functions/challenge-weigh-wednesday'));
}

function describe(actuals) {
  Object.keys(LABELS).forEach(function (key) {
    var row = actuals && actuals[key];
    var text = row && row.lb != null ? row.lb + ' lb' : '— not set —';
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
    console.log('\nStored ground force for ' + CONTEST_ID + ':\n');
    describe(data.actuals);
    console.log('\nScored: ' + (data.scoredAt ? 'yes' : 'not yet'));
    return;
  }

  console.log('\nSaving official ground-force values for ' + CONTEST_ID + ':\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w3 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
