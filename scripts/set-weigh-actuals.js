'use strict';

/**
 * Store the six real What's It Weigh Wednesday weights so scoring can run itself.
 *
 * Run it Thursday once the scale numbers are in. The contest stays open until
 * Sunday 8:00 p.m. Eastern either way — this only fills in the answer key.
 *
 *   node scripts/set-weigh-actuals.js --scoopBeet 2,4 --scoopTimothy 3,1 \
 *     --cupBeet 1,2 --cupTimothy 1,6 --quarterAmino 0,3.5 --quarterVermont 0,2.4
 *
 * Each value is "pounds,ounces". Use 0 for a missing part (0,3.5 = three and a
 * half ounces). Re-running overwrites the stored weights.
 *
 *   node scripts/set-weigh-actuals.js --show      (print what is stored now)
 */

const path = require('path');
const adminBoot = require('./weigh-wednesday-admin');

const ITEM_LABELS = {
  scoopBeet: '3 QT scoop — UNBEETABLE Beet Pulp',
  scoopTimothy: '3 QT scoop — Standlee Timothy Pellets',
  cupBeet: '1.25 LB cup — UNBEETABLE Beet Pulp',
  cupTimothy: '1.25 LB cup — Standlee Timothy Pellets',
  quarterAmino: '1/4 cup — Mad Barn AminoTrace+ Pellets',
  quarterVermont: '1/4 cup — Custom Equine Nutrition Vermont Blend Powder',
};

function loadContestModule() {
  return require(path.join(__dirname, '../firebase/functions/challenge-weigh-wednesday'));
}

function parseArgs(argv) {
  var out = { values: {}, show: false };
  for (var i = 0; i < argv.length; i++) {
    var arg = argv[i];
    if (arg === '--show') {
      out.show = true;
      continue;
    }
    if (arg.indexOf('--') !== 0) continue;
    var key = arg.slice(2);
    if (!Object.prototype.hasOwnProperty.call(ITEM_LABELS, key)) {
      console.error('Unknown item: ' + key);
      console.error('Valid items: ' + Object.keys(ITEM_LABELS).join(', '));
      process.exit(1);
    }
    var raw = argv[i + 1];
    i += 1;
    if (!raw) {
      console.error('Missing value for --' + key + ' (expected "lb,oz")');
      process.exit(1);
    }
    var parts = String(raw).split(',');
    var lb = Number(parts[0]);
    var oz = parts.length > 1 ? Number(parts[1]) : 0;
    if (isNaN(lb) || isNaN(oz) || lb < 0 || oz < 0) {
      console.error('Bad value for --' + key + ': "' + raw + '". Use "lb,oz" like 2,4.5');
      process.exit(1);
    }
    out.values[key] = { lb: lb, oz: oz };
  }
  return out;
}

function describe(actuals) {
  Object.keys(ITEM_LABELS).forEach(function (key) {
    var row = actuals && actuals[key];
    var text = row ? row.lb + ' lb ' + row.oz + ' oz (' + (row.lb * 16 + row.oz) + ' oz total)' : '— not set —';
    console.log('  ' + ITEM_LABELS[key]);
    console.log('    ' + text);
  });
}

async function main() {
  var args = parseArgs(process.argv.slice(2));
  var contest = loadContestModule();

  adminBoot.initAdmin();
  var admin = adminBoot.loadAdmin();
  var db = admin.firestore();

  if (args.show) {
    var snap = await db.collection('challengeContests').doc(contest.CONTEST_ID).get();
    var data = snap.exists ? snap.data() || {} : {};
    console.log('\nStored weights for ' + contest.CONTEST_ID + ':\n');
    describe(data.actuals);
    console.log('\nScored: ' + (data.scoredAt ? 'yes' : 'not yet'));
    return;
  }

  var missing = Object.keys(ITEM_LABELS).filter(function (key) {
    return !args.values[key];
  });
  if (missing.length) {
    console.error('\nAll six weights are required. Missing: ' + missing.join(', '));
    console.error('\nExample:');
    console.error(
      '  node scripts/set-weigh-actuals.js --scoopBeet 2,4 --scoopTimothy 3,1 --cupBeet 1,2 \\\n' +
        '    --cupTimothy 1,6 --quarterAmino 0,3.5 --quarterVermont 0,2.4'
    );
    process.exit(1);
  }

  console.log('\nSaving these weights for ' + contest.CONTEST_ID + ':\n');
  describe(args.values);

  var result = await contest.setActuals(args.values);
  if (!result.saved) {
    console.error('\nNot saved: ' + result.reason);
    process.exit(1);
  }

  console.log('\nSaved. Scoring runs automatically Sunday 8:00 p.m. Eastern.');
  console.log('To score early or re-run by hand: node scripts/score-weigh-wednesday.js --force');
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
