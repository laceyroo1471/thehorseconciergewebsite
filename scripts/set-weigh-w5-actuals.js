'use strict';

/**
 * Store official Week 5 What's It Weigh Wednesday values (answer key only).
 *
 * The lower-pressure saddle answer is a range. Guesses from 55 through 68
 * score as exact. Guesses outside that range are measured from the nearest edge.
 * pct is the midpoint so the completeness check still sees a number.
 *
 * Questions 1–2: MacKechnie-Guire et al., Animals (2019)
 *   https://pmc.ncbi.nlm.nih.gov/articles/PMC6827167/
 * Questions 3–5: Murray et al., Journal of Equine Veterinary Science (2017)
 *   https://www.sciencedirect.com/science/article/abs/pii/S0737080616306426
 *
 *   node scripts/set-weigh-w5-actuals.js
 *   node scripts/set-weigh-w5-actuals.js --show
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CONTEST_ID = 'weigh-wednesday-w5';

const ACTUALS = {
  treeTooWide: { pct: 8.5 },
  treeTooNarrow: { pct: 14 },
  lowerPressureSaddle: { pct: 61.5, min: 55, max: 68, display: '55–68%' },
  forelimbProtraction: { pct: 13 },
  hindlimbProtraction: { pct: 22.7 },
};

const SOURCES = [
  {
    label: 'Questions 1–2',
    citation: 'MacKechnie-Guire et al., Animals (2019)',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6827167/',
  },
  {
    label: 'Questions 3–5',
    citation: 'Murray et al., Journal of Equine Veterinary Science (2017)',
    url: 'https://www.sciencedirect.com/science/article/abs/pii/S0737080616306426',
  },
];

const LABELS = {
  treeTooWide: 'Tree too wide — cranial peak pressure increase at trot',
  treeTooNarrow: 'Tree too narrow — caudal peak pressure increase at trot',
  lowerPressureSaddle: 'Lower-pressure saddle — peak pressure around T10–T13',
  forelimbProtraction: 'Forelimb protraction increase',
  hindlimbProtraction: 'Hindlimb protraction increase',
};

function loadContestModule() {
  return require(path.join(__dirname, '../firebase/functions/challenge-weigh-wednesday'));
}

function describe(actuals) {
  Object.keys(LABELS).forEach(function (key) {
    var row = actuals && actuals[key];
    var text = '— not set —';
    if (row && row.display) text = row.display;
    else if (row && row.min != null && row.max != null) text = row.min + '–' + row.max + '%';
    else if (row && row.pct != null) text = row.pct + '%';
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
    console.log('Sources publish with the answers: ' + ((data.sources && data.sources.length) || 0));
    return;
  }

  console.log('\nSaving official Week 5 Weigh Wednesday values:\n');
  describe(ACTUALS);

  var result = await contest.setContestActuals(CONTEST_ID, ACTUALS);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  await db.collection('challengeContests').doc(CONTEST_ID).set({ sources: SOURCES }, { merge: true });

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early: node scripts/score-weigh-wednesday.js --contest weigh-wednesday-w5 --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
