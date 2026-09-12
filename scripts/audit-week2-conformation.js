'use strict';

/**
 * Read-only Week 2 conformation-photo scoring audit.
 *
 *   node scripts/audit-week2-conformation.js
 */

const bootstrap = require('./weigh-wednesday-admin');
const scoring = require('../firebase/functions/challenge-scoring');
const config = require('../firebase/functions/challenge-scoring-config');

const PHOTO_COLS = [
  'conformationPhotos',
  'horsePhotos',
  'horsePhotoSets',
  'hoofPhotos',
  'photos',
  'horseMedia',
  'media',
];

function sampleFields(data) {
  var keys = Object.keys(data || {}).sort();
  var out = {
    keys: keys.slice(0, 40),
    kind: data.kind || null,
    category: data.category || null,
    photoType: data.photoType || null,
    type: data.type || null,
    views: data.views || data.angles || data.sides || null,
    photoCount: Array.isArray(data.photos)
      ? data.photos.length
      : Array.isArray(data.images)
        ? data.images.length
        : null,
    hasPhoto: !!(
      data.photo ||
      data.photoUrl ||
      data.imageUrl ||
      data.downloadUrl ||
      data.storagePath ||
      (Array.isArray(data.photos) && data.photos.length) ||
      (Array.isArray(data.images) && data.images.length)
    ),
    qualifiesConformation: scoring.qualifies(
      {
        qualify: 'hasPhoto',
        photoKind: 'conformation',
      },
      data,
      'probe'
    ),
  };
  return out;
}

async function probeCollection(db, col) {
  try {
    var snap = await db.collection(col).limit(8).get();
    return {
      ok: true,
      countSample: snap.size,
      samples: (snap.docs || []).map(function (doc) {
        var data = doc.data() || {};
        return {
          id: doc.id,
          userId: data.userId || data.uid || data.ownerId || null,
          fields: sampleFields(data),
        };
      }),
    };
  } catch (err) {
    return { ok: false, error: err && err.message };
  }
}

async function countForUser(db, col, uid) {
  try {
    var snap = await db.collection(col).where('userId', '==', uid).get();
    return { ok: true, count: snap.size, docs: snap.docs || [] };
  } catch (err) {
    try {
      var snap2 = await db.collection(col).where('ownerId', '==', uid).get();
      return { ok: true, count: snap2.size, docs: snap2.docs || [], via: 'ownerId' };
    } catch (err2) {
      return { ok: false, count: 0, docs: [], error: (err && err.message) || (err2 && err2.message) };
    }
  }
}

async function main() {
  bootstrap.initAdmin();
  var admin = bootstrap.loadAdmin();
  var db = admin.firestore();

  var catalog = (config.WEEKS || []).find(function (w) {
    return w.weekNumber === 2;
  });
  var conformation = (catalog.actions || []).find(function (a) {
    return a.actionId === 'week2-conformation-photos';
  });

  var regsSnap = await db.collection('challengeRegistrations').where('challengeId', '==', config.CHALLENGE_ID).get();
  var actionsSnap = await db.collection('challengeActions').get();

  var awardedByAction = {};
  var conformationAwards = [];
  actionsSnap.forEach(function (doc) {
    var row = doc.data() || {};
    if (String(row.actionId || '').indexOf('week2-') !== 0) return;
    if (row.verificationStatus && row.verificationStatus !== 'approved') return;
    awardedByAction[row.actionId] = (awardedByAction[row.actionId] || 0) + 1;
    if (row.actionId === 'week2-conformation-photos') {
      conformationAwards.push({
        uid: row.userId,
        points: row.pointsAwarded,
        status: row.verificationStatus,
      });
    }
  });

  var dist = {};
  var at35 = [];
  var at50 = [];
  regsSnap.forEach(function (doc) {
    var d = doc.data() || {};
    if (d.status === 'inactive' || d.excludeFromLeaderboard || d.staffAccount) return;
    var w2 = Number((d.weeklyPoints && d.weeklyPoints['2']) || 0);
    dist[w2] = (dist[w2] || 0) + 1;
    var row = {
      uid: doc.id,
      name: d.name || d.displayName || '',
      email: d.email || '',
      week2: w2,
    };
    if (w2 === 35) at35.push(row);
    if (w2 >= 50) at50.push(row);
  });

  var probes = {};
  for (var i = 0; i < PHOTO_COLS.length; i++) {
    probes[PHOTO_COLS[i]] = await probeCollection(db, PHOTO_COLS[i]);
  }

  var sample35 = at35.slice(0, 12);
  var evidence = [];
  for (var s = 0; s < sample35.length; s++) {
    var user = sample35[s];
    var cols = {};
    for (var c = 0; c < PHOTO_COLS.length; c++) {
      var found = await countForUser(db, PHOTO_COLS[c], user.uid);
      cols[PHOTO_COLS[c]] = {
        ok: found.ok,
        count: found.count,
        error: found.error || null,
        via: found.via || 'userId',
        samples: (found.docs || []).slice(0, 3).map(function (doc) {
          return sampleFields(doc.data() || {});
        }),
      };
    }
    evidence.push({ user: user, collections: cols });
  }

  console.log(
    JSON.stringify(
      {
        catalogAction: conformation || null,
        awardedWeek2Actions: awardedByAction,
        conformationAwards: conformationAwards,
        week2PointDistribution: dist,
        peopleAt35: at35.length,
        peopleAt50Plus: at50.length,
        collectionProbes: probes,
        sampleEvidenceAt35: evidence,
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
