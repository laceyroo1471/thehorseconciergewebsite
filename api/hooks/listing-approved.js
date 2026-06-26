'use strict';

const { triggerVercelDeploy } = require('../../lib/trigger-vercel-deploy');

/**
 * POST /api/hooks/listing-approved
 * Authorization: Bearer <LISTING_APPROVED_WEBHOOK_SECRET>
 *
 * Triggers a Vercel redeploy so directory pages and sitemap regenerate from Firebase.
 * Used for manual testing and as an optional target from Firebase Functions.
 */
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    res.end('Method not allowed');
    return;
  }

  const secret = process.env.LISTING_APPROVED_WEBHOOK_SECRET;
  if (!secret) {
    res.statusCode = 503;
    res.end('Webhook not configured');
    return;
  }

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token !== secret) {
    res.statusCode = 401;
    res.end('Unauthorized');
    return;
  }

  try {
    const result = await triggerVercelDeploy();
    res.statusCode = 202;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: true, vercel: result }));
  } catch (err) {
    console.error('listing-approved webhook:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: err.message }));
  }
};
