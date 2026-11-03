'use strict';

/**
 * Store official Week 11 What's It Weigh Wednesday values (answer key only).
 * The public form never shows these until Sunday scoring.
 *
 *   node scripts/set-weigh-w11-actuals.js
 *   node scripts/set-weigh-w11-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w11';

const ACTUALS = {
  ogKit: {
    lb: 16,
    display:
      '16.00 pounds. The fully stocked OG stackable med kit weighs 16 pounds, including the case and standard contents, without optional add-on bundles.',
  },
  waterWeight: {
    lb: 896,
    display:
      '896 pounds. 12 gallons × 3 horses × 3 days = 108 gallons. At 8.3 pounds per U.S. gallon, 108 × 8.3 = 896.4, which rounds to 896. Water alone adds substantial weight. Containers add more. The 12-gallon daily allowance is this example’s assumption; actual needs vary.',
  },
  hayFire: {
    choice: 4,
    display:
      '175–190°F. University of Minnesota Extension identifies this internal bale-temperature range as indicating imminent fire and advises contacting the fire department. Rapid temperature increases also increase risk. Hot bales may ignite when moved.',
  },
  floodDepth: {
    inches: 6,
    display:
      '6 inches. The National Weather Service warns that as little as 6 inches of fast-moving floodwater can knock over an adult. This is a danger warning, not a safe crossing limit.',
  },
  pulleyForce: {
    lb: 300,
    display:
      '300 pounds of pulling force. An ideal 4:1 system needs one-quarter of the load’s weight: 1,200 ÷ 4 = 300. The load still weighs 1,200 pounds. Real systems lose efficiency through friction. This is a theoretical calculation, not an instruction for moving or rescuing a horse.',
  },
};

const LABELS = {
  ogKit: 'What’s the OG pack weigh?',
  waterWeight: 'Water adds up',
  hayFire: 'When hay becomes a fire emergency',
  floodDepth: 'Shallower than you think',
  pulleyForce: 'What mechanical advantage changes',
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

  console.log('\nSaving official Week 11 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w11 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
