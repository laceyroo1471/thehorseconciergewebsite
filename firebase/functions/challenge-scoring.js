'use strict';

const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');
const config = require('./challenge-scoring-config');
const leaderboard = require('./challenge-leaderboard');

var CHALLENGE_ID = config.CHALLENGE_ID;
var NY_TZ = 'America/New_York';
var BACKFILL_LOCK_MS = 10 * 60 * 1000;

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

function tzOffsetMs(utcMs, timeZone) {
  var dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  var parts = dtf.formatToParts(new Date(utcMs));
  var get = function (type) {
    var row = parts.find(function (p) {
      return p.type === type;
    });
    return row ? Number(row.value) : 0;
  };
  var hour = get('hour');
  if (hour === 24) hour = 0;
  var asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asUtc - utcMs;
}

function nyWallClockToUtcMs(ymd, h, min, s, ms) {
  var parts = String(ymd || '').split('-');
  if (parts.length !== 3) return 0;
  var y = Number(parts[0]);
  var mo = Number(parts[1]);
  var d = Number(parts[2]);
  if (!y || !mo || !d) return 0;
  var utcGuess = Date.UTC(y, mo - 1, d, h, min, s, ms || 0);
  var offset = tzOffsetMs(utcGuess, NY_TZ);
  var local = utcGuess - offset;
  offset = tzOffsetMs(local, NY_TZ);
  return utcGuess - offset;
}

function nextYmd(ymd) {
  var parts = String(ymd || '').split('-');
  if (parts.length !== 3) return '';
  var t = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + 1);
  var d = new Date(t);
  var m = String(d.getUTCMonth() + 1);
  var day = String(d.getUTCDate());
  if (m.length < 2) m = '0' + m;
  if (day.length < 2) day = '0' + day;
  return d.getUTCFullYear() + '-' + m + '-' + day;
}

function weekBounds(startYmd, endYmd) {
  var startMs = nyWallClockToUtcMs(startYmd, 0, 0, 0, 0);
  var endMs = nyWallClockToUtcMs(nextYmd(endYmd), 0, 0, 0, 0) - 1;
  if (!startMs || !endMs) return null;
  return { startMs: startMs, endMs: endMs };
}

function weekMetaByNumber() {
  var map = {};
  (config.WEEKS || []).forEach(function (w) {
    map[String(w.weekNumber)] = w;
  });
  return map;
}

function actionEarnedMs(row) {
  return toMillis(row.earnedAt) || toMillis(row.clickedAt) || toMillis(row.createdAt);
}

function isGrandPrizeOnlyAction(row) {
  if (!row) return false;
  if (row.credit === 'grand_prize_only') return true;
  var week = String(row.weekNumber == null ? '' : row.weekNumber);
  if (week === 'bonus' || week === 'credit' || week === '0') return true;
  var actionId = String(row.actionId || '');
  return actionId.indexOf('referral-bonus') === 0;
}

function isAnytimeCredit(row) {
  if (!row) return false;
  if (row.credit === 'week_window' || row.credit === 'grand_prize_only') return false;
  if (row.credit === 'anytime') return true;
  var actionId = String(row.actionId || '');
  if (actionId.indexOf('referral-bonus') === 0) return false;
  return true;
}

/**
 * Weekly prize: credited Mon 12:00 a.m.–Sun 11:59:59 p.m. Eastern.
 * Anytime actions (existing feed, hub clicks) still count for that catalog
 * week if they were awarded before the week opened — e.g. a preview backfill
 * on Aug 28 still counts for Week 1. Awards after Sunday close stay grand-prize only.
 */
function countsTowardWeeklyPrize(row, weekMeta) {
  if (isGrandPrizeOnlyAction(row)) return false;
  if (!weekMeta) return false;
  var bounds = weekBounds(weekMeta.start, weekMeta.end);
  if (!bounds) return false;
  var ms = actionEarnedMs(row);
  if (!ms && isAnytimeCredit(row)) ms = bounds.startMs;
  if (!ms) return false;
  if (isAnytimeCredit(row) && ms < bounds.startMs) ms = bounds.startMs;
  return ms >= bounds.startMs && ms <= bounds.endMs;
}

function userIdFrom(data) {
  if (!data) return '';
  return String(data.userId || data.uid || data.ownerId || '').trim();
}

function isArchived(data) {
  return !!(data && (data.archivedAt || data.isArchived === true));
}

function looksLikeGps(data) {
  if (!data || isArchived(data)) return false;
  if (data.hasGps === true || data.gps === true || data.trackedWithGps === true) return true;
  if (data.s3TrailUrl || data.s3TrailKey || data.trailSummary) return true;
  if (data.stats && (data.stats.distance || data.stats.distanceMeters || data.stats.duration)) return true;
  if (data.distanceMeters || data.distance || data.distanceKm) return true;
  if (data.path || data.polyline || data.coordinates || data.track) return true;
  if (data.startTime && (data.horseId || data.horseName)) return true;
  var type = String(data.type || data.activityType || '').toLowerCase();
  return type === 'ride' || type === 'gps' || type === 'handwalk' || type === 'hand-walk' || type === 'walk';
}

function hasComment(data) {
  var text = String(data.notes || data.comment || data.comments || data.caption || '').trim();
  return text.length > 0;
}

function hasObservation(data) {
  var text = String(
    data.observations || data.observation || data.fitNotes || data.notes || data.comment || ''
  ).trim();
  return text.length > 0;
}

function hasPhoto(data) {
  if (!data || isArchived(data)) return false;
  return !!(
    data.photo ||
    data.photoUrl ||
    data.imageUrl ||
    data.downloadUrl ||
    data.storagePath ||
    (Array.isArray(data.photos) && data.photos.length) ||
    (Array.isArray(data.images) && data.images.length)
  );
}

function fieldBlob(data) {
  return [
    data.kind,
    data.category,
    data.photoType,
    data.type,
    data.style,
    data.saddleType,
    data.tackType,
    data.discipline,
    data.itemType,
    data.name,
    data.title,
    data.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function kindMatches(data, photoKind, collectionName) {
  if (!photoKind) return true;
  var dedicated = {
    conformation: ['conformationPhotos'],
    hoof: ['hoofPhotos'],
    bit: ['bits'],
  };
  if (dedicated[photoKind] && dedicated[photoKind].indexOf(collectionName) !== -1) return true;

  var blob = fieldBlob(data);
  if (!blob) return false;

  if (photoKind === 'conformation') return /conformation/.test(blob);
  if (photoKind === 'hoof') return /hoof|farrier/.test(blob);
  if (photoKind === 'anatomy') return /anatomy|drawing|saddle\s*fit/.test(blob);
  if (photoKind === 'english') return /english|dressage|hunter|jumper|jumping/.test(blob);
  if (photoKind === 'western') return /western|ranch|barrel|reining/.test(blob);
  if (photoKind === 'saddle') return /saddle/.test(blob);
  if (photoKind === 'bit') return /bit|snaffle|curb|myler/.test(blob);
  return blob.indexOf(photoKind) !== -1;
}

function isTrailerMaintenance(data) {
  if (!data || isArchived(data)) return false;
  var type = String(data.type || data.category || data.title || '').toLowerCase();
  return /trailer/.test(type) && /mainten/.test(type);
}

function qualifies(action, data, collectionName) {
  if (!data || isArchived(data)) return false;
  if (action.photoKind && !kindMatches(data, action.photoKind, collectionName)) return false;

  switch (action.qualify) {
    case 'gps':
      return looksLikeGps(data);
    case 'gpsCommented':
      return looksLikeGps(data) && hasComment(data);
    case 'hasPhoto':
      return hasPhoto(data);
    case 'hasObservation':
      return hasObservation(data);
    case 'trailerMaintenance':
      if (collectionName === 'careRecords') return isTrailerMaintenance(data);
      return true;
    case 'exists':
    default:
      return true;
  }
}

function eventMillis(data) {
  return (
    toMillis(data.startedAt) ||
    toMillis(data.startTime) ||
    toMillis(data.activityAt) ||
    toMillis(data.date) ||
    toMillis(data.createdAt) ||
    toMillis(data.updatedAt)
  );
}

function inWeekWindow(action, data) {
  var bounds = weekBounds(action.weekStart, action.weekEnd);
  if (!bounds) return false;
  var ms = eventMillis(data);
  if (!ms) return false;
  return ms >= bounds.startMs && ms <= bounds.endMs;
}

function actionDocId(uid, actionId, relatedDocId) {
  var base = uid + '__' + actionId;
  if (relatedDocId) return base + '__' + relatedDocId;
  return base;
}

function pointActionsFromRegistration(registration) {
  var out = {};
  var nested = (registration && registration.pointActions) || {};
  Object.keys(nested).forEach(function (key) {
    if (nested[key] && typeof nested[key] === 'object') out[key] = nested[key];
  });
  Object.keys(registration || {}).forEach(function (key) {
    if (key.indexOf('pointActions.') !== 0) return;
    var actionId = key.slice('pointActions.'.length);
    if (!actionId || out[actionId]) return;
    if (registration[key] && typeof registration[key] === 'object') {
      out[actionId] = registration[key];
    }
  });
  return out;
}

async function loadRegistration(uid) {
  var snap = await db().collection('challengeRegistrations').doc(uid).get();
  if (!snap.exists) return null;
  var data = snap.data() || {};
  if (data.challengeId && data.challengeId !== CHALLENGE_ID) return null;
  if (data.status === 'inactive') return null;
  if (data.excludeFromLeaderboard === true || data.staffAccount === true) return null;
  return data;
}

async function loadApprovedActions(uid) {
  var snap = await db().collection('challengeActions').where('userId', '==', uid).get();
  var rows = [];
  snap.forEach(function (doc) {
    var row = doc.data() || {};
    if (row.challengeId !== CHALLENGE_ID) return;
    if (row.verificationStatus !== 'approved') return;
    rows.push(row);
  });
  return rows;
}

async function recountScores(uid, opts) {
  opts = opts || {};
  var rows = await loadApprovedActions(uid);
  var weeks = weekMetaByNumber();
  var total = 0;
  var weeklyPoints = {};
  var weeklyActionCounts = {};

  rows.forEach(function (row) {
    var pts = Number(row.pointsAwarded) || 0;
    var week = String(row.weekNumber || '');
    total += pts;
    if (!countsTowardWeeklyPrize(row, weeks[week])) return;
    weeklyPoints[week] = (weeklyPoints[week] || 0) + pts;
    if (!weeklyActionCounts[week]) weeklyActionCounts[week] = {};
    var id = row.actionId || 'unknown';
    weeklyActionCounts[week][id] = (weeklyActionCounts[week][id] || 0) + 1;
  });

  var scoreId = uid + '_' + CHALLENGE_ID;
  await db()
    .collection('challengeScores')
    .doc(scoreId)
    .set(
      {
        userId: uid,
        challengeId: CHALLENGE_ID,
        totalPoints: total,
        weeklyPoints: weeklyPoints,
        weeklyActionCounts: weeklyActionCounts,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  await db()
    .collection('challengeRegistrations')
    .doc(uid)
    .set(
      {
        pointsTotal: total,
        weeklyPoints: weeklyPoints,
        scoresUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  if (!opts.skipLeaderboard) {
    leaderboard.rebuildLeaderboard().catch(function (err) {
      console.warn('leaderboard rebuild skipped', err && err.message);
    });
  }

  return total;
}

async function award(uid, action, opts) {
  opts = opts || {};
  if (action.status !== 'live') return { awarded: false, reason: 'not_live' };
  if (action.points == null || action.points <= 0) return { awarded: false, reason: 'no_points' };

  var relatedDocId = opts.relatedDocId || '';
  var maxCount = action.maxCount || 1;
  var id = actionDocId(uid, action.actionId, maxCount > 1 ? relatedDocId : '');
  var ref = db().collection('challengeActions').doc(id);
  var existing = await ref.get();
  if (existing.exists) return { awarded: false, reason: 'duplicate' };

  if (maxCount > 1) {
    var rows = await loadApprovedActions(uid);
    var already = rows.filter(function (row) {
      return row.actionId === action.actionId;
    }).length;
    if (already >= maxCount) return { awarded: false, reason: 'max_count' };
  }

  var earnedAt =
    opts.earnedAtMs && !isNaN(opts.earnedAtMs)
      ? Timestamp.fromMillis(opts.earnedAtMs)
      : FieldValue.serverTimestamp();

  await ref.set({
    userId: uid,
    challengeId: CHALLENGE_ID,
    weekNumber: action.weekNumber,
    actionId: action.actionId,
    label: action.label,
    pointsAwarded: action.points,
    source: opts.source || action.source || 'app',
    verification: 'auto',
    verificationStatus: 'approved',
    relatedCollection: opts.collectionName || null,
    relatedDocId: relatedDocId || null,
    credit: action.credit,
    earnedAt: earnedAt,
    testPreview: !!opts.testPreview,
    createdAt: FieldValue.serverTimestamp(),
    idempotencyKey: id,
  });

  if (!opts.skipRecount) await recountScores(uid, { skipLeaderboard: opts.skipLeaderboard });
  return { awarded: true, points: action.points, actionId: action.actionId };
}

/** Write an approved catalog action with status: 'manual'. Idempotent by uid + actionId. */
async function awardManual(uid, action, opts) {
  opts = opts || {};
  if (!action || action.status !== 'manual') return { awarded: false, reason: 'not_manual' };
  var points = Number(opts.points != null ? opts.points : action.points) || 0;
  if (points <= 0) return { awarded: false, reason: 'no_points' };

  var relatedDocId = opts.relatedDocId || '';
  var maxCount = action.maxCount || 1;
  var id = actionDocId(uid, action.actionId, maxCount > 1 ? relatedDocId : '');
  var ref = db().collection('challengeActions').doc(id);
  var existing = await ref.get();
  if (existing.exists) {
    return { awarded: false, reason: 'duplicate', actionId: action.actionId, docId: id };
  }

  if (maxCount > 1) {
    var rows = await loadApprovedActions(uid);
    var already = rows.filter(function (row) {
      return row.actionId === action.actionId;
    }).length;
    if (already >= maxCount) return { awarded: false, reason: 'max_count' };
  }

  var earnedAt =
    opts.earnedAtMs && !isNaN(opts.earnedAtMs)
      ? Timestamp.fromMillis(opts.earnedAtMs)
      : FieldValue.serverTimestamp();

  await ref.set({
    userId: uid,
    challengeId: CHALLENGE_ID,
    weekNumber: action.weekNumber || 'bonus',
    actionId: action.actionId,
    label: action.label,
    pointsAwarded: points,
    source: 'manual',
    verification: 'manual',
    verificationStatus: 'approved',
    relatedCollection: opts.collectionName || null,
    relatedDocId: relatedDocId || null,
    credit: action.credit || 'grand_prize_only',
    earnedAt: earnedAt,
    testPreview: !!opts.testPreview,
    createdAt: FieldValue.serverTimestamp(),
    idempotencyKey: id,
    note: opts.note || null,
  });

  if (!opts.skipRecount) await recountScores(uid, { skipLeaderboard: opts.skipLeaderboard });
  return { awarded: true, points: points, actionId: action.actionId, docId: id };
}

async function scoreAppDocument(collectionName, docId, data) {
  var uid = userIdFrom(data);
  if (!uid) return;
  var registration = await loadRegistration(uid);
  if (!registration) return;

  var matches = config.actionsForCollection(collectionName);
  for (var i = 0; i < matches.length; i++) {
    var action = matches[i];
    if (!qualifies(action, data, collectionName)) continue;
    if (action.credit === 'week_window' && !inWeekWindow(action, data)) continue;
    var earnedAtMs =
      action.credit === 'week_window' ? eventMillis(data) || Date.now() : Date.now();
    await award(uid, action, {
      relatedDocId: docId,
      collectionName: collectionName,
      source: 'app',
      earnedAtMs: earnedAtMs,
    });
  }
}

async function scoreHubPointAction(uid, actionId, payload) {
  var registration = await loadRegistration(uid);
  if (!registration) return;
  var action = config.hubActionById(actionId);
  if (!action) return;
  var earnedAtMs = toMillis(payload && payload.clickedAt) || toMillis(payload && payload.updatedAt) || Date.now();
  await award(uid, action, { source: 'hub', earnedAtMs: earnedAtMs });
}

function backfillInProgress(registration) {
  if (!registration) return false;
  if (registration.scoringBackfillAt) return false;
  var started = Number(registration.scoringBackfillStartedAt) || toMillis(registration.scoringBackfillStartedAt);
  return !!(started && Date.now() - started < BACKFILL_LOCK_MS);
}

async function backfillUser(uid, opts) {
  opts = opts || {};
  var registration = await loadRegistration(uid);
  if (!registration) return { backfilled: 0 };
  if (!opts.force && registration.scoringBackfillAt) return { backfilled: 0, skipped: true };
  if (!opts.force && backfillInProgress(registration)) return { backfilled: 0, skipped: true };

  await db()
    .collection('challengeRegistrations')
    .doc(uid)
    .set({ scoringBackfillStartedAt: Date.now() }, { merge: true });

  var liveApp = config.allActions().filter(function (a) {
    return a.source === 'app' && a.status === 'live' && a.points > 0;
  });

  var awarded = 0;
  for (var i = 0; i < liveApp.length; i++) {
    var action = liveApp[i];
    var collections = action.collections || [];
    for (var c = 0; c < collections.length; c++) {
      var col = collections[c];
      var snap;
      try {
        snap = await db().collection(col).where('userId', '==', uid).get();
      } catch (err) {
        console.warn('backfill skip', col, err && err.message);
        continue;
      }
      var docs = snap.docs || [];
      for (var d = 0; d < docs.length; d++) {
        var data = docs[d].data() || {};
        if (!qualifies(action, data, col)) continue;
        if (action.credit === 'week_window' && !inWeekWindow(action, data)) continue;
        var earnedAtMs =
          action.credit === 'week_window' ? eventMillis(data) || Date.now() : Date.now();
        var result = await award(uid, action, {
          relatedDocId: docs[d].id,
          collectionName: col,
          source: 'app',
          earnedAtMs: earnedAtMs,
        });
        if (result.awarded) awarded += 1;
      }
    }
  }

  var pointActions = pointActionsFromRegistration(registration);
  var keys = Object.keys(pointActions);
  for (var k = 0; k < keys.length; k++) {
    await scoreHubPointAction(uid, keys[k], pointActions[keys[k]]);
  }

  await db()
    .collection('challengeRegistrations')
    .doc(uid)
    .set({ scoringBackfillAt: FieldValue.serverTimestamp() }, { merge: true });

  return { backfilled: awarded };
}

async function handlePointEventWrite(data) {
  if (!data) return;
  var uid = String(data.userId || '').trim();
  var actionId = String(data.actionId || '').trim();
  if (!uid || !actionId) return;
  await scoreHubPointAction(uid, actionId, data);
}

async function handleRegistrationWrite(uid, beforeData, afterData) {
  if (!afterData) return;

  var beforeActions = pointActionsFromRegistration(beforeData);
  var afterActions = pointActionsFromRegistration(afterData);
  var newKeys = Object.keys(afterActions).filter(function (key) {
    return !beforeActions[key];
  });
  for (var i = 0; i < newKeys.length; i++) {
    await scoreHubPointAction(uid, newKeys[i], afterActions[newKeys[i]]);
  }

  if (!afterData.scoringBackfillAt && !backfillInProgress(afterData)) {
    await backfillUser(uid);
  }
}

async function sweepUnscoredRegistrations() {
  var snap = await db().collection('challengeRegistrations').where('challengeId', '==', CHALLENGE_ID).get();
  var ran = 0;
  var docs = snap.docs || [];
  for (var i = 0; i < docs.length; i++) {
    var data = docs[i].data() || {};
    if (data.scoringBackfillAt) continue;
    if (backfillInProgress(data)) continue;
    await backfillUser(docs[i].id);
    ran += 1;
  }
  return { scanned: docs.length, backfilled: ran };
}

async function recountAllScores() {
  var snap = await db().collection('challengeRegistrations').where('challengeId', '==', CHALLENGE_ID).get();
  var n = 0;
  var docs = snap.docs || [];
  for (var i = 0; i < docs.length; i++) {
    var data = docs[i].data() || {};
    if (data.status === 'inactive') continue;
    await recountScores(docs[i].id, { skipLeaderboard: true });
    n += 1;
  }
  return { recounted: n };
}

module.exports = {
  scoreAppDocument: scoreAppDocument,
  scoreHubPointAction: scoreHubPointAction,
  backfillUser: backfillUser,
  handleRegistrationWrite: handleRegistrationWrite,
  handlePointEventWrite: handlePointEventWrite,
  sweepUnscoredRegistrations: sweepUnscoredRegistrations,
  recountScores: recountScores,
  recountAllScores: recountAllScores,
  userIdFrom: userIdFrom,
  backfillInProgress: backfillInProgress,
  award: award,
  awardManual: awardManual,
  qualifies: qualifies,
  eventMillis: eventMillis,
  countsTowardWeeklyPrize: countsTowardWeeklyPrize,
  isGrandPrizeOnlyAction: isGrandPrizeOnlyAction,
};
