'use strict';

/**
 * Deploy to the thc-native Firebase project (same project as provider listings).
 *
 * Setup:
 * 1. Vercel → Project Settings → Git → Deploy Hooks → create hook for main branch.
 * 2. firebase functions:secrets:set VERCEL_DEPLOY_HOOK_URL
 * 3. cd firebase && firebase deploy --only functions:onProviderListingApproved
 *
 * Fires when a provider becomes visible in the directory (approved listing with slug).
 * Each approval triggers one Vercel redeploy so directory pages and sitemap stay current.
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');

initializeApp();

const vercelDeployHookUrl = defineSecret('VERCEL_DEPLOY_HOOK_URL');

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
    secrets: [vercelDeployHookUrl],
  },
  async function (event) {
    const before = event.data.before;
    const after = event.data.after;

    if (!becameVisibleInDirectory(before, after)) {
      return;
    }

    const hookUrl = vercelDeployHookUrl.value();
    if (!hookUrl) {
      console.error('VERCEL_DEPLOY_HOOK_URL secret is not set');
      return;
    }

    await requestRedeploy(hookUrl);
    console.log('Vercel redeploy triggered for provider', event.params.providerId);
  }
);
