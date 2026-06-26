'use strict';

const CATEGORY_SLUG_OVERRIDES = {
  trainerinstructor: 'trainers',
  farrier: 'farriers',
  boardingfacility: 'boarding',
};

/** Featured on find-providers (browse slug + display label). */
const FEATURED_BROWSE_CATEGORIES = [
  { slug: 'trainers', label: 'Trainers & Instructors' },
  { slug: 'farriers', label: 'Farriers' },
  { slug: 'boarding', label: 'Boarding & Stables' },
];

const US_STATE_NAMES = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

const PAGE_SIZE = 100;

function categoryValueToSlug(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return 'other';
  const value = rawValue.trim();
  if (CATEGORY_SLUG_OVERRIDES[value]) return CATEGORY_SLUG_OVERRIDES[value];
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'other';
}

function slugToCategoryValue(slug) {
  for (const [value, browseSlug] of Object.entries(CATEGORY_SLUG_OVERRIDES)) {
    if (browseSlug === slug) return value;
  }
  return slug;
}

function categoryBrowsePath(categorySlug, page) {
  if (!page || page <= 1) return '/directory/' + categorySlug;
  return '/directory/' + categorySlug + '/page-' + page;
}

function categoryStateBrowsePath(categorySlug, stateCode) {
  return '/directory/' + categorySlug + '/' + stateCode.toLowerCase();
}

function stateBrowsePath(stateCode) {
  return '/directory/states/' + stateCode.toLowerCase();
}

function buildCategorySlugIndex(categories) {
  const bySlug = new Map();
  const byValue = new Map();

  (categories || []).forEach((cat) => {
    if (!cat || !cat.value) return;
    const slug = categoryValueToSlug(cat.value);
    const entry = {
      value: cat.value,
      slug,
      label: cat.label || cat.value,
    };
    byValue.set(cat.value, entry);
    if (!bySlug.has(slug)) {
      bySlug.set(slug, entry);
    }
  });

  return { bySlug, byValue };
}

function resolveCategoryMeta(categoryRaw, categoryIndex) {
  if (categoryIndex && categoryIndex.byValue.has(categoryRaw)) {
    return categoryIndex.byValue.get(categoryRaw);
  }
  const slug = categoryValueToSlug(categoryRaw);
  if (categoryIndex && categoryIndex.bySlug.has(slug)) {
    return categoryIndex.bySlug.get(slug);
  }
  return {
    value: categoryRaw || 'other',
    slug,
    label: categoryRaw || 'Other',
  };
}

module.exports = {
  CATEGORY_SLUG_OVERRIDES,
  FEATURED_BROWSE_CATEGORIES,
  US_STATE_NAMES,
  PAGE_SIZE,
  categoryValueToSlug,
  slugToCategoryValue,
  categoryBrowsePath,
  categoryStateBrowsePath,
  stateBrowsePath,
  buildCategorySlugIndex,
  resolveCategoryMeta,
};
