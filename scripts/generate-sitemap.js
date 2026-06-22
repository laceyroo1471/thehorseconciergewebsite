'use strict';

const fs = require('fs');
const path = require('path');
const { getFirestore } = require('../lib/firebase-admin');

const SITE_ORIGIN = 'https://www.thehorseconcierge.com';

const STATIC_PATHS = [
  '/',
  '/owners',
  '/providers',
  '/story',
  '/ambassadors',
  '/contact',
  '/privacy-policy',
  '/start-horse-profile',
  '/find-providers',
];

async function main() {
  let providerUrls = [];

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    try {
      const db = getFirestore();
      const snap = await db.collection('providers').get();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.visibleInDirectory === false) return;
        if (!data.slug || typeof data.slug !== 'string') return;
        providerUrls.push('/providers/' + data.slug);
      });
      providerUrls.sort();
    } catch (err) {
      console.warn('Firebase unavailable for sitemap providers:', err.message);
    }
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_JSON not set — writing static URLs only.');
  }

  const urls = STATIC_PATHS.map((p) => SITE_ORIGIN + p).concat(
    providerUrls.map((p) => SITE_ORIGIN + p)
  );

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((loc) => '  <url><loc>' + loc + '</loc></url>').join('\n') +
    '\n</urlset>\n';

  const outPath = path.join(__dirname, '..', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');

  console.log('Wrote sitemap.xml with', urls.length, 'URLs');
  console.log('  Static:', STATIC_PATHS.length);
  console.log('  Providers:', providerUrls.length);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
