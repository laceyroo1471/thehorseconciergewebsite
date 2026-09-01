'use strict';

/**
 * Deploy to the thc-native Firebase project (same project as provider listings).
 *
 * Provider directory:
 * 1. Vercel → Project Settings → Git → Deploy Hooks → create hook for main branch.
 * 2. firebase functions:secrets:set VERCEL_DEPLOY_HOOK_URL
 * 3. cd firebase && firebase deploy --only functions:onProviderListingApproved
 *
 * Challenge scoring (auto-awards Hub + app actions):
 *   cd firebase && firebase deploy --only functions
 *
 * Fires when a provider becomes visible in the directory (approved listing with slug).
 * Each approval triggers one Vercel redeploy so directory pages and sitemap stay current.
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const config = require('./challenge-scoring-config');
const scoring = require('./challenge-scoring');
const leaderboard = require('./challenge-leaderboard');

function becameVisibleInDirectory(before, after) {
  if (!after) return false;
  if (after.visibleInDirectory === false) return false;
  if (!after.slug || typeof after.slug !== 'string') return false;

  if (!before || !before.exists) return true;

  const beforeData = before.data() || {};
  const wasVisible = beforeData.visibleInDirectory !== false && !!beforeData.slug;
  return !wasVisible;
}

async function requestRedeploy(hookUrl) {
  const res = await fetch(hookUrl, { method: 'POST' });
  if (!res.ok) {
    const text = await res.text().catch(function () {
      return '';
    });
    throw new Error('Deploy hook failed (' + res.status + '): ' + text.slice(0, 200));
  }
}

exports.onProviderListingApproved = onDocumentWritten(
  {
    document: 'providers/{providerId}',
  },
  async function (event) {
    const before = event.data.before;
    const after = event.data.after;

    if (!becameVisibleInDirectory(before, after)) {
      return;
    }

    const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
    if (!hookUrl) {
      console.error('VERCEL_DEPLOY_HOOK_URL secret is not set');
      return;
    }

    await requestRedeploy(hookUrl);
    console.log('Vercel redeploy triggered for provider', event.params.providerId);
  }
);

function exportNameForCollection(collectionName) {
  return 'onChallengeScore_' + collectionName;
}

config.watchedCollections().forEach(function (collectionName) {
  exports[exportNameForCollection(collectionName)] = onDocumentWritten(
    {
      document: collectionName + '/{docId}',
      memory: '256MiB',
    },
    async function (event) {
      const after = event.data && event.data.after;
      if (!after || !after.exists) return;
      await scoring.scoreAppDocument(collectionName, event.params.docId, after.data() || {});
    }
  );
});

exports.onChallengePointEventWrite = onDocumentWritten(
  {
    document: 'challengePointEvents/{eventId}',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async function (event) {
    const after = event.data && event.data.after;
    if (!after || !after.exists) return;
    await scoring.handlePointEventWrite(after.data() || {});
  }
);

exports.onChallengeRegistrationWrite = onDocumentWritten(
  {
    document: 'challengeRegistrations/{uid}',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async function (event) {
    const after = event.data && event.data.after;
    if (!after || !after.exists) return;
    const before = event.data.before;
    const beforeData = before && before.exists ? before.data() || {} : null;
    await scoring.handleRegistrationWrite(event.params.uid, beforeData, after.data() || {});
  }
);

exports.challengeScoringSweep = onSchedule(
  {
    schedule: 'every 12 hours',
    memory: '512MiB',
    timeoutSeconds: 540,
  },
  async function () {
    const result = await scoring.sweepUnscoredRegistrations();
    console.log('challenge scoring sweep', result);
    const recounted = await scoring.recountAllScores();
    console.log('challenge score recount', recounted);
    const board = await leaderboard.rebuildLeaderboard();
    console.log('challenge leaderboard sweep', board);
  }
);

exports.challengeLeaderboardRefresh = onSchedule(
  {
    schedule: 'every 15 minutes',
    memory: '512MiB',
    timeoutSeconds: 120,
  },
  async function () {
    const recounted = await scoring.recountAllScores();
    console.log('challenge score recount', recounted);
    const board = await leaderboard.rebuildLeaderboard();
    console.log('challenge leaderboard refresh', board);
  }
);
