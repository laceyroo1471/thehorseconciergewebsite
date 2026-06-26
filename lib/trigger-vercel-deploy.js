'use strict';

/**
 * POST to a Vercel Deploy Hook URL to rebuild static directory pages and sitemap.
 * Set VERCEL_DEPLOY_HOOK_URL in Vercel project env (and Firebase Functions secrets).
 */
async function triggerVercelDeploy() {
  const hookUrl = process.env.VERCEL_DEPLOY_HOOK_URL;
  if (!hookUrl) {
    throw new Error('VERCEL_DEPLOY_HOOK_URL is not configured');
  }

  const res = await fetch(hookUrl, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text().catch(function () {
      return '';
    });
    throw new Error(
      'Vercel deploy hook failed (' + res.status + '): ' + body.slice(0, 200)
    );
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch (_) {
    payload = { ok: true };
  }

  return payload;
}

module.exports = { triggerVercelDeploy };
