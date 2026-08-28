'use strict';

/**
 * Builds public leaderboards from challengeScores.
 * Weekly winners freeze Wednesday (America/New_York) after that week ends.
 * To hold a week for extra validation, set weeks.{n}.holdLock = true on
 * challengeLeaderboards/horsemanship-2026 in the Firebase console.
 */
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const config = require('./challenge-scoring-config');

var CHALLENGE_ID = config.CHALLENGE_ID;
var TOP_N = 20;
var NY_TZ = 'America/New_York';
var LOCK_DAYS_AFTER_WEEK_END = 3; // Sunday end → Wednesday lock

function db() {
  return getFirestore();
}

function publicDisplayName(name) {
  var parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return 'Participant';
  var first = parts[0];
  if (parts.length === 1) return first;
  var last = parts[parts.length - 1];
  var initial = last.charAt(0).toUpperCase();
  if (!/[A-Za-z]/.test(initial)) return first;
  return first + ' ' + initial + '.';
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
  return 0;
}

function addDaysYmd(ymd, days) {
  var parts = String(ymd || '').split('-');
  if (parts.length !== 3) return '';
  var t = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]) + days);
  var d = new Date(t);
  var m = String(d.getUTCMonth() + 1);
  var day = String(d.getUTCDate());
  if (m.length < 2) m = '0' + m;
  if (day.length < 2) day = '0' + day;
  return d.getUTCFullYear() + '-' + m + '-' + day;
}

function nyYmd(ms) {
  var dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: NY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dtf.format(new Date(ms || Date.now()));
}

function sortPlayers(list, pointsKey) {
  return list.slice().sort(function (a, b) {
    var pa = Number(a[pointsKey]) || 0;
    var pb = Number(b[pointsKey]) || 0;
    if (pb !== pa) return pb - pa;
    var ta = a.updatedAt || 0;
    var tb = b.updatedAt || 0;
    if (ta !== tb) return ta - tb;
    return String(a.displayName || '').localeCompare(String(b.displayName || ''));
  });
}

function toRows(list, pointsKey) {
  var out = [];
  var rank = 0;
  var lastPoints = null;
  list.forEach(function (row, i) {
    var pts = Number(row[pointsKey]) || 0;
    if (pts <= 0) return;
    if (lastPoints === null || pts < lastPoints) {
      rank = out.length + 1;
      lastPoints = pts;
    }
    if (out.length >= TOP_N && rank > TOP_N) return;
    out.push({
      rank: rank,
      displayName: row.displayName,
      userId: row.userId,
      points: pts,
    });
  });
  return out.slice(0, TOP_N);
}

function stripIds(rows) {
  return (rows || []).map(function (row) {
    return {
      rank: row.rank,
      displayName: row.displayName,
      points: row.points,
    };
  });
}

function winnerFromStandings(standings) {
  if (!standings || !standings.length) return null;
  var top = standings[0];
  return {
    displayName: top.displayName,
    userId: top.userId,
    points: top.points,
    rank: 1,
  };
}

async function rebuildLeaderboard() {
  var scoresSnap = await db().collection('challengeScores').where('challengeId', '==', CHALLENGE_ID).get();
  var regsSnap = await db().collection('challengeRegistrations').where('challengeId', '==', CHALLENGE_ID).get();

  var names = {};
  var active = {};
  regsSnap.forEach(function (doc) {
    var data = doc.data() || {};
    if (data.status === 'inactive') return;
    if (data.excludeFromLeaderboard === true || data.staffAccount === true) return;
    names[doc.id] = publicDisplayName(data.name);
    active[doc.id] = true;
  });

    var players = [];
  scoresSnap.forEach(function (doc) {
    var data = doc.data() || {};
    var uid = String(data.userId || '').trim();
    if (!uid && doc.id.indexOf('_' + CHALLENGE_ID) !== -1) {
      uid = doc.id.slice(0, doc.id.length - (CHALLENGE_ID.length + 1));
    }
    if (!uid || !active[uid]) return;
    if (data.excludeFromLeaderboard === true) return;
    players.push({
      userId: uid,
      displayName: names[uid] || 'Participant',
      totalPoints: Number(data.totalPoints) || 0,
      weeklyPoints: data.weeklyPoints || {},
      updatedAt: toMillis(data.updatedAt) || toMillis(data.scoresUpdatedAt),
    });
  });

  var existingSnap = await db().collection('challengeLeaderboards').doc(CHALLENGE_ID).get();
  var existing = existingSnap.exists ? existingSnap.data() || {} : {};
  var existingWeeks = existing.weeks || {};

  var today = nyYmd(Date.now());
  var overallSorted = sortPlayers(players, 'totalPoints');
  var overallTop = toRows(overallSorted, 'totalPoints');

  var weeks = {};
  (config.WEEKS || []).forEach(function (week) {
    var key = String(week.weekNumber);
    var prev = existingWeeks[key] || {};
    var lockAt = addDaysYmd(week.end, LOCK_DAYS_AFTER_WEEK_END);
    var weeklyList = players.map(function (row) {
      return {
        userId: row.userId,
        displayName: row.displayName,
        weekPoints: Number((row.weeklyPoints || {})[key] || (row.weeklyPoints || {})[week.weekNumber] || 0),
        updatedAt: row.updatedAt,
      };
    });
    var standings = toRows(sortPlayers(weeklyList, 'weekPoints'), 'weekPoints');
    var shouldLock = !prev.holdLock && !!lockAt && today >= lockAt;
    var locked = !!prev.locked || shouldLock;
    var winner = prev.locked && prev.winner ? prev.winner : shouldLock ? winnerFromStandings(standings) : null;

    weeks[key] = {
      weekNumber: week.weekNumber,
      start: week.start,
      end: week.end,
      lockAt: lockAt,
      locked: locked && !!winner,
      holdLock: !!prev.holdLock,
      standings: standings,
      winner: winner,
    };
  });

  var payload = {
    challengeId: CHALLENGE_ID,
    overallTop: overallTop,
    weeks: weeks,
    participantCount: players.filter(function (row) {
      return row.totalPoints > 0;
    }).length,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db().collection('challengeLeaderboards').doc(CHALLENGE_ID).set(payload, { merge: true });

  var publicWeeks = {};
  Object.keys(weeks).forEach(function (key) {
    var w = weeks[key];
    publicWeeks[key] = {
      weekNumber: w.weekNumber,
      start: w.start,
      end: w.end,
      lockAt: w.lockAt,
      locked: w.locked,
      standings: stripIds(w.standings),
      winner: w.winner
        ? { displayName: w.winner.displayName, points: w.winner.points, rank: 1 }
        : null,
    };
  });

  await db()
    .collection('metadata')
    .doc(CHALLENGE_ID + '-leaderboard')
    .set(
      {
        challengeId: CHALLENGE_ID,
        overallTop: stripIds(overallTop),
        weeks: publicWeeks,
        participantCount: payload.participantCount,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

  return { overall: overallTop.length, participants: payload.participantCount };
}

module.exports = {
  rebuildLeaderboard: rebuildLeaderboard,
  publicDisplayName: publicDisplayName,
  TOP_N: TOP_N,
};
