'use strict';

/**
 * Award Week 2 conformation-photo points (15 pts, once) for horsePhotoSets
 * that never scored because the catalog action was pending and pointed at
 * empty collections.
 *
 *   node scripts/credit-week2-conformation.js
 */

const bootstrap = require('./weigh-wednesday-admin');
const config = require('../firebase/functions/challenge-scoring-config');
const scoring = require('../firebase/functions/challenge-scoring');
const leaderboard = require('../firebase/functions/challenge-leaderboard');

const ACTION_ID = 'week2-conformation-photos';

async function main() {
  bootstrap.initAdmin();
  var admin = bootstrap.loadAdmin();
  var db = admin.firestore();

  var action = config.allActions().find(function (a) {
    return a.actionId === ACTION_ID;
  });
  if (!action || action.status !== 'live' || !action.points) {
    console.error(ACTION_ID + ' is missing, not live, or has no points');
    process.exit(1);
  }

  var regs = await db.collection('challengeRegistrations').where('challengeId', '==', config.CHALLENGE_ID).get();
  var awarded = [];
  var already = [];
  var scanned = 0;

  var docs = regs.docs || [];
  for (var i = 0; i < docs.length; i++) {
    var uid = docs[i].id;
    var reg = docs[i].data() || {};
    if (reg.status === 'inactive') continue;
    scanned += 1;

    var snap;
    try {
      snap = await db.collection('horsePhotoSets').where('userId', '==', uid).get();
    } catch (err) {
      continue;
    }

    var credited = false;
    var setDocs = snap.docs || [];
    for (var s = 0; s < setDocs.length; s++) {
      var data = setDocs[s].data() || {};
      if (!scoring.qualifies(action, data, 'horsePhotoSets')) continue;

      var result = await scoring.award(uid, action, {
        relatedDocId: setDocs[s].id,
        collectionName: 'horsePhotoSets',
        source: 'app',
        earnedAtMs: scoring.eventMillis(data) || Date.now(),
      });
      if (result && result.awarded) {
        awarded.push({
          uid: uid,
          name: reg.name || reg.displayName || '',
          email: reg.email || '',
          before: Number((reg.weeklyPoints && reg.weeklyPoints['2']) || 0),
          setId: setDocs[s].id,
        });
        credited = true;
        break;
      }
      if (result && result.reason === 'duplicate') {
        already.push(uid);
        credited = true;
        break;
      }
    }

    if (credited) {
      await scoring.recountScores(uid, { skipLeaderboard: true });
    }
  }

  await scoring.recountAllScores();
  var board = await leaderboard.rebuildLeaderboard();
  var week2 = (board && board.weeks && board.weeks['2']) || {};

  console.log(
    JSON.stringify(
      {
        scanned: scanned,
        newlyAwarded: awarded,
        alreadyCredited: already.length,
        week2Standings: week2.standings || week2,
      },
      null,
      2
    )
  );
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
