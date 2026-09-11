'use strict';

/**
 * What's It Weigh Wednesday — rank complete guesses and award weekly points.
 *
 * Week 1 (weigh-wednesday-w1): lb/oz feed fills. Closed Sep 6, 2026.
 * Week 2 (weigh-wednesday-w2): organ % of body weight. Closed Sep 13, 2026 8:00 PM ET.
 * Week 3 (weigh-wednesday-w3): peak ground force (lb) on a 1,000-lb horse. Closes Sep 20, 2026 8:00 PM ET.
 *
 * Score: lowest average % difference. Tie-break: earlier submittedAt.
 * Sunday 8:00 p.m. Eastern scores any closed, unscored contest with actuals.
 */

const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const config = require('./challenge-scoring-config');
const scoring = require('./challenge-scoring');
const leaderboard = require('./challenge-leaderboard');

var CHALLENGE_ID = config.CHALLENGE_ID;

var CONTESTS = {
  'weigh-wednesday-w1': {
    contestId: 'weigh-wednesday-w1',
    weekNumber: 1,
    closeMs: Date.parse('2026-09-06T20:00:00-04:00'),
    unit: 'ounces',
    field: 'weighWednesday',
    placePrefix: 'week1-weigh-place-',
    title: "What's It Weigh Wednesday",
    itemIds: ['scoopBeet', 'scoopTimothy', 'cupBeet', 'cupTimothy', 'quarterAmino', 'quarterVermont'],
  },
  'weigh-wednesday-w2': {
    contestId: 'weigh-wednesday-w2',
    weekNumber: 2,
    closeMs: Date.parse('2026-09-13T20:00:00-04:00'),
    unit: 'percent',
    field: 'weighWednesdayW2',
    placePrefix: 'week2-weigh-place-',
    title: "What's It Weigh Wednesday",
    itemIds: ['heartAdult', 'heartArabian', 'heartDraft', 'heartRacing', 'kidneysAdult', 'liverAdult'],
  },
  'weigh-wednesday-w3': {
    contestId: 'weigh-wednesday-w3',
    weekNumber: 3,
    closeMs: Date.parse('2026-09-20T20:00:00-04:00'),
    unit: 'pounds',
    field: 'weighWednesdayW3',
    placePrefix: 'week3-weigh-place-',
    title: "What's It Weigh Wednesday",
    itemIds: ['walkFore', 'walkHind', 'trotFore', 'trotHind', 'canterTrailFore'],
  },
};

var CONTEST_ID = 'weigh-wednesday-w1';
var ITEM_IDS = CONTESTS[CONTEST_ID].itemIds;
var CLOSE_MS = CONTESTS[CONTEST_ID].closeMs;

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

function toPounds(row) {
  if (row == null) return NaN;
  if (typeof row === 'number') return row >= 0 ? row : NaN;
  if (typeof row !== 'object') return NaN;
  var lb = Number(row.lb);
  if (isNaN(lb) || lb < 0) return NaN;
  return lb;
}

function toValue(row, unit) {
  if (unit === 'percent') {
    if (row == null) return NaN;
    if (typeof row === 'number') return row >= 0 ? row : NaN;
    if (typeof row !== 'object') return NaN;
    var pct = Number(row.pct);
    if (isNaN(pct) || pct < 0) return NaN;
    return pct;
  }
  if (unit === 'pounds') return toPounds(row);
  return toOunces(row);
}

function isCompleteGuessesFor(spec, guesses) {
  if (!guesses || typeof guesses !== 'object') return false;
  for (var i = 0; i < spec.itemIds.length; i++) {
    if (isNaN(toValue(guesses[spec.itemIds[i]], spec.unit))) return false;
  }
  return true;
}

function isCompleteGuesses(guesses) {
  return isCompleteGuessesFor(CONTESTS[CONTEST_ID], guesses);
}

function isCompleteActualsFor(spec, actuals) {
  return isCompleteGuessesFor(spec, actuals);
}

function percentDiff(guessVal, actualVal) {
  if (!actualVal || isNaN(actualVal) || isNaN(guessVal)) return Number.POSITIVE_INFINITY;
  return (Math.abs(guessVal - actualVal) / actualVal) * 100;
}

function averagePercentDiffFor(spec, guesses, actuals) {
  var sum = 0;
  for (var i = 0; i < spec.itemIds.length; i++) {
    var id = spec.itemIds[i];
    sum += percentDiff(toValue(guesses[id], spec.unit), toValue(actuals[id], spec.unit));
  }
  return sum / spec.itemIds.length;
}

function averagePercentDiff(guesses, actuals) {
  return averagePercentDiffFor(CONTESTS[CONTEST_ID], guesses, actuals);
}

function placeAction(spec, place) {
  var actionId = spec.placePrefix + place;
  return (
    config.allActions().find(function (a) {
      return a.actionId === actionId;
    }) || null
  );
}

function contestRef(contestId) {
  return db().collection('challengeContests').doc(contestId);
}

function collectEntries(spec, docs, actuals) {
  var rows = [];
  for (var i = 0; i < docs.length; i++) {
    var data = docs[i].data() || {};
    if (data.challengeId && data.challengeId !== CHALLENGE_ID) continue;
    if (data.status === 'inactive') continue;
    if (data.excludeFromLeaderboard === true || data.staffAccount === true) continue;
    var block = data[spec.field] || {};
    if (block.contestId && block.contestId !== spec.contestId) continue;
    if (!isCompleteGuessesFor(spec, block.guesses)) continue;
    var avgPct = averagePercentDiffFor(spec, block.guesses, actuals);
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

async function scoreContest(contestId, opts) {
  opts = opts || {};
  var spec = CONTESTS[contestId];
  if (!spec) return { scored: false, reason: 'unknown_contest', contestId: contestId };

  var now = Date.now();
  if (!opts.force && now < spec.closeMs) {
    return { scored: false, reason: 'not_closed', contestId: contestId };
  }

  var snap = await contestRef(contestId).get();
  var contest = snap.exists ? snap.data() || {} : {};
  if (contest.scoredAt && !opts.rescore) {
    return { scored: false, reason: 'already_scored', awarded: contest.awardedCount || 0, contestId: contestId };
  }
  if (!isCompleteActualsFor(spec, contest.actuals)) {
    return { scored: false, reason: 'missing_actuals', contestId: contestId };
  }

  var regs = await db().collection('challengeRegistrations').where('challengeId', '==', CHALLENGE_ID).get();
  var ranked = collectEntries(spec, regs.docs || [], contest.actuals);
  var awarded = [];

  for (var i = 0; i < ranked.length && i < 9; i++) {
    var place = i + 1;
    var action = placeAction(spec, place);
    if (!action) {
      console.warn('weigh wednesday missing catalog action', spec.placePrefix + place);
      continue;
    }
    var result = await scoring.awardManual(ranked[i].userId, action, {
      points: action.points,
      skipLeaderboard: true,
      note: spec.title + ' place ' + place + ' (avg % diff ' + ranked[i].avgPct.toFixed(3) + ')',
      earnedAtMs: Math.min(now, spec.closeMs),
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

  await contestRef(contestId).set(
    {
      challengeId: CHALLENGE_ID,
      contestId: contestId,
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

  for (var p = 0; p < results.length; p++) {
    var row = results[p];
    var update = {};
    update[spec.field + '.place'] = row.place;
    update[spec.field + '.avgPct'] = row.avgPct;
    update[spec.field + '.points'] = row.points;
    try {
      await db().collection('challengeRegistrations').doc(row.userId).update(update);
    } catch (err) {
      console.warn('weigh wednesday place write skipped', contestId, row.userId, err && err.message);
    }
  }

  return {
    scored: true,
    contestId: contestId,
    entries: ranked.length,
    awarded: awarded.filter(function (row) {
      return row.awarded;
    }).length,
    top: awarded,
  };
}

async function closeAndScore(opts) {
  opts = opts || {};
  var ids = opts.contestId ? [opts.contestId] : Object.keys(CONTESTS);
  var out = [];
  for (var i = 0; i < ids.length; i++) {
    out.push(await scoreContest(ids[i], opts));
  }
  var anyScored = out.some(function (row) {
    return row.scored;
  });
  if (anyScored) await leaderboard.rebuildLeaderboard();
  return ids.length === 1 ? out[0] : { contests: out };
}

async function setContestActuals(contestId, actuals, opts) {
  opts = opts || {};
  var spec = CONTESTS[contestId];
  if (!spec) return { saved: false, reason: 'unknown_contest' };
  if (!isCompleteActualsFor(spec, actuals)) {
    return { saved: false, reason: 'incomplete_actuals' };
  }
  var payload = {
    challengeId: CHALLENGE_ID,
    contestId: contestId,
    actuals: actuals,
    actualsSetAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (opts.closeAtMs) payload.closeAt = Timestamp.fromMillis(opts.closeAtMs);
  else payload.closeAt = Timestamp.fromMillis(spec.closeMs);
  await contestRef(contestId).set(payload, { merge: true });
  return { saved: true, contestId: contestId, actuals: actuals };
}

async function setActuals(actuals, opts) {
  return setContestActuals(CONTEST_ID, actuals, opts);
}

module.exports = {
  CONTEST_ID: CONTEST_ID,
  ITEM_IDS: ITEM_IDS,
  CLOSE_MS: CLOSE_MS,
  CONTESTS: CONTESTS,
  closeAndScore: closeAndScore,
  scoreContest: scoreContest,
  setActuals: setActuals,
  setContestActuals: setContestActuals,
  isCompleteGuesses: isCompleteGuesses,
  isCompleteGuessesFor: isCompleteGuessesFor,
  averagePercentDiff: averagePercentDiff,
  averagePercentDiffFor: averagePercentDiffFor,
  toOunces: toOunces,
  toPounds: toPounds,
  toValue: toValue,
};
