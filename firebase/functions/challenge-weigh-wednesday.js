'use strict';

/**
 * What's It Weigh Wednesday — rank complete guesses and award Week 1 points.
 *
 * Close: Sunday Sep 6, 2026 8:00 PM America/New_York.
 * Score: lowest average % difference across all 6 items.
 * Tie-break: earlier submittedAt.
 */

const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const config = require('./challenge-scoring-config');
const scoring = require('./challenge-scoring');
const leaderboard = require('./challenge-leaderboard');

var CONTEST_ID = 'weigh-wednesday-w1';
var CHALLENGE_ID = config.CHALLENGE_ID;
var CLOSE_MS = Date.parse('2026-09-06T20:00:00-04:00');
/** Same order the form shows: grouped by measuring vessel. */
var ITEM_IDS = [
  'scoopBeet',
  'scoopTimothy',
  'cupBeet',
  'cupTimothy',
  'quarterAmino',
  'quarterVermont',
];

function db() {
  return getFirestore();
}

function toMillis(val) {
  if (val == null) return 0;
  if (typeof val === 'number' && !isNaN(val)) return val < 1e12 ? val * 1000 : val;
  if (val && typeof val.toDate === 'function') {
    try {
      return val.toDate().getTime();
    } catch (e) {
      return 0;
    }
  }
  if (val && val.seconds != null) return val.seconds * 1000;
  if (typeof val === 'string') {
    var t = Date.parse(val);
    return isNaN(t) ? 0 : t;
  }
  return 0;
}

function toOunces(row) {
  if (!row || typeof row !== 'object') return NaN;
  var lb = Number(row.lb);
  var oz = Number(row.oz);
  if (isNaN(lb) || isNaN(oz) || lb < 0 || oz < 0) return NaN;
  return lb * 16 + oz;
}

function isCompleteGuesses(guesses) {
  if (!guesses || typeof guesses !== 'object') return false;
  for (var i = 0; i < ITEM_IDS.length; i++) {
    if (isNaN(toOunces(guesses[ITEM_IDS[i]]))) return false;
  }
  return true;
}

function isCompleteActuals(actuals) {
  return isCompleteGuesses(actuals);
}

function percentDiff(guessOz, actualOz) {
  if (!actualOz || isNaN(actualOz) || isNaN(guessOz)) return Number.POSITIVE_INFINITY;
  return (Math.abs(guessOz - actualOz) / actualOz) * 100;
}

function averagePercentDiff(guesses, actuals) {
  var sum = 0;
  for (var i = 0; i < ITEM_IDS.length; i++) {
    var id = ITEM_IDS[i];
    sum += percentDiff(toOunces(guesses[id]), toOunces(actuals[id]));
  }
  return sum / ITEM_IDS.length;
}

function placeAction(place) {
  var actionId = 'week1-weigh-place-' + place;
  return (
    config.allActions().find(function (a) {
      return a.actionId === actionId;
    }) || null
  );
}

function contestRef() {
  return db().collection('challengeContests').doc(CONTEST_ID);
}

async function loadContest() {
  var snap = await contestRef().get();
  return snap.exists ? snap.data() || {} : {};
}

function collectEntries(docs, actuals) {
  var rows = [];
  for (var i = 0; i < docs.length; i++) {
    var data = docs[i].data() || {};
    if (data.challengeId && data.challengeId !== CHALLENGE_ID) continue;
    if (data.status === 'inactive') continue;
    if (data.excludeFromLeaderboard === true || data.staffAccount === true) continue;
    var block = data.weighWednesday || {};
    if (block.contestId && block.contestId !== CONTEST_ID) continue;
    if (!isCompleteGuesses(block.guesses)) continue;
    var avgPct = averagePercentDiff(block.guesses, actuals);
    if (!isFinite(avgPct)) continue;
    rows.push({
      userId: docs[i].id,
      displayName: data.name || '',
      avgPct: avgPct,
      submittedAt: toMillis(block.submittedAt),
      guesses: block.guesses,
    });
  }
  rows.sort(function (a, b) {
    if (a.avgPct !== b.avgPct) return a.avgPct - b.avgPct;
    if (a.submittedAt !== b.submittedAt) return a.submittedAt - b.submittedAt;
    return String(a.displayName || '').localeCompare(String(b.displayName || ''));
  });
  return rows;
}

async function closeAndScore(opts) {
  opts = opts || {};
  var now = Date.now();
  if (!opts.force && now < CLOSE_MS) {
    return { scored: false, reason: 'not_closed' };
  }

  var contest = await loadContest();
  if (contest.scoredAt && !opts.rescore) {
    return { scored: false, reason: 'already_scored', awarded: contest.awardedCount || 0 };
  }
  if (!isCompleteActuals(contest.actuals)) {
    return { scored: false, reason: 'missing_actuals' };
  }

  var snap = await db().collection('challengeRegistrations').where('challengeId', '==', CHALLENGE_ID).get();
  var ranked = collectEntries(snap.docs || [], contest.actuals);
  var awarded = [];

  for (var i = 0; i < ranked.length && i < 9; i++) {
    var place = i + 1;
    var action = placeAction(place);
    if (!action) {
      console.warn('weigh wednesday missing catalog action for place', place);
      continue;
    }
    var result = await scoring.awardManual(ranked[i].userId, action, {
      points: action.points,
      skipLeaderboard: true,
      note: "What's It Weigh Wednesday place " + place + ' (avg % diff ' + ranked[i].avgPct.toFixed(3) + ')',
      earnedAtMs: Math.min(now, CLOSE_MS),
    });
    awarded.push({
      place: place,
      userId: ranked[i].userId,
      displayName: ranked[i].displayName,
      avgPct: ranked[i].avgPct,
      points: action.points,
      awarded: !!result.awarded,
      reason: result.reason || null,
    });
  }

  var results = ranked.map(function (row, idx) {
    return {
      place: idx + 1,
      userId: row.userId,
      displayName: row.displayName,
      avgPct: row.avgPct,
      submittedAt: row.submittedAt,
      points: idx < 9 ? 9 - idx : 0,
    };
  });

  await contestRef().set(
    {
      challengeId: CHALLENGE_ID,
      contestId: CONTEST_ID,
      scoredAt: FieldValue.serverTimestamp(),
      scoredAtMs: now,
      awardedCount: awarded.filter(function (row) {
        return row.awarded;
      }).length,
      results: results,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await leaderboard.rebuildLeaderboard();
  return {
    scored: true,
    entries: ranked.length,
    awarded: awarded.filter(function (row) {
      return row.awarded;
    }).length,
    top: awarded,
  };
}

async function setActuals(actuals, opts) {
  opts = opts || {};
  if (!isCompleteActuals(actuals)) {
    return { saved: false, reason: 'incomplete_actuals' };
  }
  var payload = {
    challengeId: CHALLENGE_ID,
    contestId: CONTEST_ID,
    actuals: actuals,
    actualsSetAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (opts.closeAtMs) payload.closeAt = Timestamp.fromMillis(opts.closeAtMs);
  await contestRef().set(payload, { merge: true });
  return { saved: true, actuals: actuals };
}

module.exports = {
  CONTEST_ID: CONTEST_ID,
  ITEM_IDS: ITEM_IDS,
  CLOSE_MS: CLOSE_MS,
  closeAndScore: closeAndScore,
  setActuals: setActuals,
  isCompleteGuesses: isCompleteGuesses,
  averagePercentDiff: averagePercentDiff,
  toOunces: toOunces,
};
