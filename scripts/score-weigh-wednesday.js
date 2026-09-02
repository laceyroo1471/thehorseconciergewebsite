'use strict';

/**
 * Backup runner for What's It Weigh Wednesday scoring.
 *
 * The scheduled Cloud Function does this automatically Sunday 8:00 p.m. Eastern.
 * Use this only if that run was skipped (for example the weights were entered late).
 *
 *   node scripts/score-weigh-wednesday.js --dry-run   preview the ranking, award nothing
 *   node scripts/score-weigh-wednesday.js --force     score now, before Sunday close
 *   node scripts/score-weigh-wednesday.js             score if the window has closed
 *
 * Awarding is idempotent — a second run will not double-credit anyone.
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const CHALLENGE_ID = 'horsemanship-2026';

function loadContestModule() {
  return require(path.join(__dirname, '../firebase/functions/challenge-weigh-wednesday'));
}

function toMillis(val) {
  if (!val) return 0;
  if (typeof val.toDate === 'function') {
    try {
      return val.toDate().getTime();
    } catch (e) {
      return 0;
    }
  }
  if (val.seconds != null) return val.seconds * 1000;
  return Number(val) || 0;
}

async function dryRun(db, contest) {
  var snap = await db.collection('challengeContests').doc(contest.CONTEST_ID).get();
  var data = snap.exists ? snap.data() || {} : {};
  if (!data.actuals) {
    console.error('\nNo weights stored yet. Run: node scripts/set-weigh-actuals.js --show');
    process.exit(1);
  }

  var regs = await db.collection('challengeRegistrations').where('challengeId', '==', CHALLENGE_ID).get();
  var rows = [];
  regs.forEach(function (doc) {
    var reg = doc.data() || {};
    if (reg.status === 'inactive') return;
    if (reg.excludeFromLeaderboard === true || reg.staffAccount === true) return;
    var block = reg.weighWednesday || {};
    if (block.contestId && block.contestId !== contest.CONTEST_ID) return;
    if (!contest.isCompleteGuesses(block.guesses)) return;
    rows.push({
      name: reg.name || doc.id,
      avgPct: contest.averagePercentDiff(block.guesses, data.actuals),
      submittedAt: toMillis(block.submittedAt),
    });
  });

  rows.sort(function (a, b) {
    if (a.avgPct !== b.avgPct) return a.avgPct - b.avgPct;
    return a.submittedAt - b.submittedAt;
  });

  console.log('\nDry run — no points written. Complete entries: ' + rows.length + '\n');
  rows.forEach(function (row, idx) {
    var points = idx < 9 ? 9 - idx : 0;
    console.log(
      '  ' +
        String(idx + 1).padStart(2, ' ') +
        '. ' +
        row.name.padEnd(28, ' ') +
        row.avgPct.toFixed(2).padStart(8, ' ') +
        '% avg diff   ' +
        (points ? points + ' pts' : '—')
    );
  });
  console.log('\nRun without --dry-run to award these points.');
}

async function main() {
  var argv = process.argv.slice(2);
  var isDryRun = argv.indexOf('--dry-run') !== -1;
  var force = argv.indexOf('--force') !== -1;
  var rescore = argv.indexOf('--rescore') !== -1;

  var contest = loadContestModule();
  adminBoot.initAdmin();
  var admin = adminBoot.loadAdmin();
  var db = admin.firestore();

  if (isDryRun) {
    await dryRun(db, contest);
    return;
  }

  var result = await contest.closeAndScore({ force: force, rescore: rescore });
  if (!result.scored) {
    if (result.reason === 'missing_actuals') {
      console.error('\nNo weights stored yet. Enter them first:');
      console.error('  node scripts/set-weigh-actuals.js --scoopBeet 2,4 ... ');
    } else if (result.reason === 'not_closed') {
      console.error('\nContest is still open (closes Sunday 8:00 p.m. Eastern).');
      console.error('Add --force to score early.');
    } else if (result.reason === 'already_scored') {
      console.error('\nAlready scored (' + result.awarded + ' awarded). Add --rescore to run again.');
    } else {
      console.error('\nNot scored: ' + result.reason);
    }
    process.exit(1);
  }

  console.log('\nScored ' + result.entries + ' complete entries. Points awarded: ' + result.awarded + '\n');
  (result.top || []).forEach(function (row) {
    console.log(
      '  ' +
        row.place +
        '. ' +
        String(row.displayName || row.userId).padEnd(28, ' ') +
        row.avgPct.toFixed(2).padStart(8, ' ') +
        '% avg diff   ' +
        row.points +
        ' pts' +
        (row.awarded ? '' : '   [skipped: ' + row.reason + ']')
    );
  });
  console.log('\nLeaderboard rebuilt.');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
