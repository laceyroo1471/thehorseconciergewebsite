'use strict';

const fs = require('fs');
const path = require('path');
const { getFirestore } = require('../lib/firebase-admin');
const { toPublicProvider, SITE_ORIGIN } = require('../lib/provider-public');
const {
  US_STATE_NAMES,
  PAGE_SIZE,
  categoryValueToSlug,
  buildCategorySlugIndex,
  resolveCategoryMeta,
} = require('../lib/directory-urls');
const {
  renderDirectoryPage,
  renderCategoryGrid,
  renderStateGrid,
  renderPagination,
} = require('../lib/render-directory-page');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'directory');
const MANIFEST_PATH = path.join(ROOT, 'directory-urls.json');

const VALID_SLUG = /^[a-z0-9-]+$/;

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

function writePage(relativePath, html) {
  const filePath = path.join(OUT_DIR, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html, 'utf8');
}

function sortProviders(list) {
  return list.slice().sort(function (a, b) {
    return a.businessName.localeCompare(b.businessName, 'en', { sensitivity: 'base' });
  });
}

function paginate(list, pageSize) {
  const pages = [];
  for (let i = 0; i < list.length; i += pageSize) {
    pages.push(list.slice(i, i + pageSize));
  }
  if (!pages.length) pages.push([]);
  return pages;
}

function breadcrumbLink(href, label) {
  return '<a href="' + href + '" class="snapshot-footer__link">' + label + '</a>';
}

async function loadData() {
  const db = getFirestore();
  const [providerSnap, metaSnap] = await Promise.all([
    db.collection('providers').get(),
    db.collection('metadata').doc('serviceCatagories').get(),
  ]);

  const categories = metaSnap.exists ? metaSnap.data().categories || [] : [];
  const categoryIndex = buildCategorySlugIndex(categories);

  const providers = providerSnap.docs
    .map(toPublicProvider)
    .filter(function (p) {
      return p.visibleInDirectory && p.slug && VALID_SLUG.test(p.slug);
    })
    .map(function (p) {
      const meta = resolveCategoryMeta(p.categoryRaw, categoryIndex);
      return Object.assign({}, p, {
        browseCategorySlug: meta.slug,
        browseCategoryLabel: meta.label,
      });
    });

  return { providers, categoryIndex, categories };
}

function groupProviders(providers) {
  const byCategory = new Map();
  const byState = new Map();
  const byCategoryState = new Map();

  providers.forEach(function (p) {
    const catSlug = p.browseCategorySlug;
    if (!byCategory.has(catSlug)) byCategory.set(catSlug, []);
    byCategory.get(catSlug).push(p);

    const state = p.state || 'OTHER';
    if (!byState.has(state)) byState.set(state, []);
    byState.get(state).push(p);

    const comboKey = catSlug + '|' + state;
    if (!byCategoryState.has(comboKey)) byCategoryState.set(comboKey, []);
    byCategoryState.get(comboKey).push(p);
  });

  for (const list of byCategory.values()) sortProviders(list);
  for (const list of byState.values()) sortProviders(list);
  for (const list of byCategoryState.values()) sortProviders(list);

  return { byCategory, byState, byCategoryState };
}

function generateCategoryPages(byCategory, categoryIndex, manifest) {
  const categoryStats = [];

  byCategory.forEach(function (providers, slug) {
    const meta = categoryIndex.bySlug.get(slug) || {
      slug,
      label: slug.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }),
    };
    categoryStats.push({ slug, label: meta.label, count: providers.length });

    const pages = paginate(providers, PAGE_SIZE);
    const basePath = '/directory/' + slug;

    pages.forEach(function (pageProviders, index) {
      const pageNum = index + 1;
      const isFirst = pageNum === 1;
      const canonical = SITE_ORIGIN + (isFirst ? basePath : basePath + '/page-' + pageNum);
      const relativePath = isFirst ? slug + '/index.html' : slug + '/page-' + pageNum + '.html';

      const html = renderDirectoryPage({
        title: meta.label + ' — Provider Directory | The Horse Concierge',
        description:
          'Browse ' +
          providers.length +
          ' ' +
          meta.label.toLowerCase() +
          ' in The Horse Concierge equine provider directory.',
        canonicalUrl: canonical,
        breadcrumb:
          breadcrumbLink('/find-providers', 'Find providers') +
          ' · ' +
          breadcrumbLink('/directory', 'Directory') +
          ' · <span>' +
          meta.label +
          '</span>',
        heading: meta.label,
        intro:
          providers.length +
          ' provider' +
          (providers.length === 1 ? '' : 's') +
          (pages.length > 1 ? ' — page ' + pageNum + ' of ' + pages.length : '') +
          '.',
        providers: pageProviders,
        pagination: renderPagination(basePath, pageNum, pages.length),
      });

      writePage(relativePath, html);
      manifest.push(isFirst ? basePath : basePath + '/page-' + pageNum);
    });
  });

  return categoryStats.sort(function (a, b) {
    return b.count - a.count || a.label.localeCompare(b.label);
  });
}

function generateCategoryStatePages(byCategoryState, categoryIndex, manifest) {
  byCategoryState.forEach(function (providers, comboKey) {
    const parts = comboKey.split('|');
    const catSlug = parts[0];
    const stateCode = parts[1];
    if (stateCode === 'OTHER' || providers.length === 0) return;

    const meta = categoryIndex.bySlug.get(catSlug) || { slug: catSlug, label: catSlug };
    const stateName = US_STATE_NAMES[stateCode] || stateCode;
    const stateLower = stateCode.toLowerCase();
    const canonical = SITE_ORIGIN + '/directory/' + catSlug + '/' + stateLower;
    const relativePath = catSlug + '/' + stateLower + '.html';

    const html = renderDirectoryPage({
      title: meta.label + ' in ' + stateCode + ' — The Horse Concierge',
      description:
        'Find ' +
        meta.label.toLowerCase() +
        ' in ' +
        stateName +
        '. ' +
        providers.length +
        ' listings in The Horse Concierge directory.',
      canonicalUrl: canonical,
      breadcrumb:
        breadcrumbLink('/find-providers', 'Find providers') +
        ' · ' +
        breadcrumbLink('/directory', 'Directory') +
        ' · ' +
        breadcrumbLink('/directory/' + catSlug, meta.label) +
        ' · <span>' +
        stateCode +
        '</span>',
      heading: meta.label + ' in ' + stateName,
      intro: providers.length + ' provider' + (providers.length === 1 ? '' : 's') + '.',
      providers: providers,
    });

    writePage(relativePath, html);
    manifest.push('/directory/' + catSlug + '/' + stateLower);
  });
}

function generateStatePages(byState, manifest) {
  const stateStats = [];

  const sortedStates = Array.from(byState.entries())
    .filter(function (entry) {
      return entry[0] !== 'OTHER';
    })
    .sort(function (a, b) {
      return a[0].localeCompare(b[0]);
    });

  sortedStates.forEach(function (entry) {
    const stateCode = entry[0];
    const providers = entry[1];
    const stateName = US_STATE_NAMES[stateCode] || stateCode;
    stateStats.push({ code: stateCode, name: stateName, count: providers.length });

    const stateLower = stateCode.toLowerCase();
    const canonical = SITE_ORIGIN + '/directory/states/' + stateLower;

    const html = renderDirectoryPage({
      title: 'Equine Providers in ' + stateName + ' — The Horse Concierge',
      description:
        'Browse ' +
        providers.length +
        ' equine professionals in ' +
        stateName +
        ' on The Horse Concierge.',
      canonicalUrl: canonical,
      breadcrumb:
        breadcrumbLink('/find-providers', 'Find providers') +
        ' · ' +
        breadcrumbLink('/directory/states', 'States') +
        ' · <span>' +
        stateName +
        '</span>',
      heading: 'Providers in ' + stateName,
      intro: providers.length + ' provider' + (providers.length === 1 ? '' : 's') + '.',
      providers: providers,
    });

    writePage('states/' + stateLower + '.html', html);
    manifest.push('/directory/states/' + stateLower);
  });

  return stateStats;
}

async function main() {
  const hasFirebaseCreds = hasUsableFirebaseCredentials();

  if (!hasFirebaseCreds) {
    if (fs.existsSync(OUT_DIR) && fs.readdirSync(OUT_DIR).length > 0) {
      console.warn(
        'Firebase credentials not set — keeping existing directory/ (no overwrite).'
      );
      return;
    }
    console.warn(
      'Firebase credentials not set — skipping directory page generation.'
    );
    return;
  }

  let providers;
  let categoryIndex;
  try {
    const data = await loadData();
    providers = data.providers;
    categoryIndex = data.categoryIndex;
  } catch (err) {
    if (fs.existsSync(OUT_DIR) && fs.readdirSync(OUT_DIR).length > 0) {
      console.warn('Firebase load failed — keeping existing directory/:', err.message);
      return;
    }
    throw err;
  }

  if (!providers.length) {
    if (fs.existsSync(OUT_DIR) && fs.readdirSync(OUT_DIR).length > 0) {
      console.warn('Firebase returned 0 providers — keeping existing directory/.');
      return;
    }
  }

  const manifest = ['/directory', '/directory/states'];

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { byCategory, byState, byCategoryState } = groupProviders(providers);

  const categoryStats = generateCategoryPages(byCategory, categoryIndex, manifest);
  generateCategoryStatePages(byCategoryState, categoryIndex, manifest);
  const stateStats = generateStatePages(byState, manifest);

  const hubHtml = renderDirectoryPage({
    title: 'Browse Provider Directory — The Horse Concierge',
    description:
      'Browse equine professionals by service category — farriers, trainers, boarding, and more.',
    canonicalUrl: SITE_ORIGIN + '/directory',
    breadcrumb:
      breadcrumbLink('/find-providers', 'Find providers') + ' · <span>Directory</span>',
    heading: 'Browse the directory',
    intro: 'Choose a service category to see all public provider profiles.',
    bodyHtml: renderCategoryGrid(categoryStats),
    providers: [],
  });
  writePage('index.html', hubHtml);

  const statesHubHtml = renderDirectoryPage({
    title: 'Browse Providers by State — The Horse Concierge',
    description: 'Browse equine professionals by U.S. state in The Horse Concierge directory.',
    canonicalUrl: SITE_ORIGIN + '/directory/states',
    breadcrumb:
      breadcrumbLink('/find-providers', 'Find providers') +
      ' · ' +
      breadcrumbLink('/directory', 'Directory') +
      ' · <span>States</span>',
    heading: 'Browse by state',
    intro: 'Select a state to view all listed providers in that area.',
    bodyHtml: renderStateGrid(stateStats),
    providers: [],
  });
  writePage('states/index.html', statesHubHtml);

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('Wrote directory pages');
  console.log('  Providers:', providers.length);
  console.log('  Categories:', categoryStats.length);
  console.log('  States:', stateStats.length);
  console.log('  URLs in manifest:', manifest.length);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
