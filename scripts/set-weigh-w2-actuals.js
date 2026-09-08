'use strict';

/**
 * Store official Week 2 What's It Weigh Wednesday percents (answer key only).
 *
 *   node scripts/set-weigh-w2-actuals.js
 *   node scripts/set-weigh-w2-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w2';

const ACTUALS = {
  heartAdult: { pct: 1 },
  heartArabian: { pct: 0.73 },
  heartDraft: { pct: 0.6 },
  heartRacing: { pct: 0.86 },
  kidneysAdult: { pct: 0.32 },
  liverAdult: { pct: 1.5 },
};

const LABELS = {
  heartAdult: 'Heart — adult (general)',
  heartArabian: 'Heart — adult Arabian',
  heartDraft: 'Heart — adult draft',
  heartRacing: 'Heart — adult racing',
  kidneysAdult: 'Kidneys — adult',
  liverAdult: 'Liver — adult',
};

function loadContestModule() {
  return require(path.join(__dirname, '../firebase/functions/challenge-weigh-wednesday'));
}

function describe(actuals) {
  Object.keys(LABELS).forEach(function (key) {
    var row = actuals && actuals[key];
    var text = row && row.pct != null ? row.pct + '% of body weight' : '— not set —';
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
    console.log('\nStored percents for ' + CONTEST_ID + ':\n');
    describe(data.actuals);
    console.log('\nScored: ' + (data.scoredAt ? 'yes' : 'not yet'));
    return;
  }

  console.log('\nSaving official percents for ' + CONTEST_ID + ':\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w2 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
