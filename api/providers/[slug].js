'use strict';

const { getFirestore } = require('../../lib/firebase-admin');
const { toPublicProvider, toPublicReview } = require('../../lib/provider-public');
const { renderProviderPage } = require('../../lib/render-provider-page');
const { renderNotFoundPage } = require('../../lib/render-not-found');

module.exports = async function handler(req, res) {
  const slug = (req.query.slug || '').toLowerCase().trim();

  if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.end(renderNotFoundPage(slug));
    return;
  }

  try {
    const db = getFirestore();
    const snap = await db
      .collection('providers')
      .where('slug', '==', slug)
      .limit(1)
      .get();

    if (snap.empty) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.end(renderNotFoundPage(slug));
      return;
    }

    const doc = snap.docs[0];
    const provider = toPublicProvider(doc);

    if (!provider.visibleInDirectory || !provider.slug) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(renderNotFoundPage(slug));
      return;
    }

    let reviews = [];
    try {
      const ratingsSnap = await db
        .collection('ratings')
        .where('providerId', '==', provider.id)
        .limit(25)
        .get();
      reviews = ratingsSnap.docs
        .map(toPublicReview)
        .filter(Boolean)
        .slice(0, 10);
    } catch (ratingErr) {
      console.warn('Ratings fetch failed:', ratingErr.message);
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.end(renderProviderPage(provider, reviews));
  } catch (err) {
    console.error('Provider page error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Unable to load provider profile.');
  }
};
