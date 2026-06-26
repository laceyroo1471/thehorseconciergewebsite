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
  '/directory',
  '/directory/states',
];

const VALID_SLUG = /^[a-z0-9-]+$/;
const SITEMAP_PATH = path.join(__dirname, '..', 'sitemap.xml');

function hasUsableFirebaseCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) return true;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (fs.existsSync(serviceAccountPath)) return true;
    console.warn(
      'FIREBASE_SERVICE_ACCOUNT_PATH does not exist — treating Firebase credentials as unset:',
      serviceAccountPath
    );
  }

  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function readExistingProviderUrls() {
  if (!fs.existsSync(SITEMAP_PATH)) return [];
  const xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
  const urls = [];
  const re = /<loc>https:\/\/www\.thehorseconcierge\.com(\/providers\/[^<]+)<\/loc>/g;
  let match;
  while ((match = re.exec(xml)) !== null) {
    urls.push(match[1]);
  }
  return urls.sort();
}

async function main() {
  let providerUrls = [];
  let loadedFromFirebase = false;
  const hasFirebaseCreds = hasUsableFirebaseCredentials();

  if (hasFirebaseCreds) {
    try {
      const db = getFirestore();
      const snap = await db.collection('providers').get();
      snap.docs.forEach((doc) => {
        const data = doc.data();
        if (data.visibleInDirectory === false) return;
        if (!data.slug || typeof data.slug !== 'string') return;
        if (!VALID_SLUG.test(data.slug)) return;
        providerUrls.push('/providers/' + data.slug);
      });
      providerUrls.sort();
      loadedFromFirebase = true;
    } catch (err) {
      console.warn('Firebase unavailable for sitemap providers:', err.message);
    }
  } else {
    console.warn('Firebase credentials not set — will preserve existing provider URLs.');
  }

  if (!loadedFromFirebase || providerUrls.length === 0) {
    const existing = readExistingProviderUrls();
    if (existing.length > 0) {
      if (providerUrls.length === 0) {
        console.warn(
          'Preserving',
          existing.length,
          'provider URLs from existing sitemap.xml'
        );
      }
      providerUrls = existing;
    }
  }

  let directoryUrls = [];
  const manifestPath = path.join(__dirname, '..', 'directory-urls.json');
  if (fs.existsSync(manifestPath)) {
    try {
      directoryUrls = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (err) {
      console.warn('Could not read directory-urls.json:', err.message);
    }
  }

  const staticAndDirectory = STATIC_PATHS.concat(
    directoryUrls.filter(function (p) {
      return p !== '/directory' && p !== '/directory/states';
    })
  );

  const urls = staticAndDirectory.map((p) => SITE_ORIGIN + p).concat(
    providerUrls.map((p) => SITE_ORIGIN + p)
  );

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((loc) => '  <url><loc>' + loc + '</loc></url>').join('\n') +
    '\n</urlset>\n';

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf8');

  console.log('Wrote sitemap.xml with', urls.length, 'URLs');
  console.log('  Static:', STATIC_PATHS.length);
  console.log('  Providers:', providerUrls.length);
  console.log('  From Firebase:', loadedFromFirebase);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
