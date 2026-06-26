'use strict';

const { categoryValueToSlug } = require('./directory-urls');

const SITE_ORIGIN = 'https://www.thehorseconcierge.com';

const US_STATE_TO_CODE = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC',
  'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA',
  'rhode island': 'RI', 'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN',
  texas: 'TX', utah: 'UT', vermont: 'VT', virginia: 'VA', washington: 'WA',
  'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY', 'district of columbia': 'DC',
};

function pickField(data, keys) {
  for (const key of keys) {
    const val = data[key];
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      return String(val).trim();
    }
  }
  return '';
}

function normalizeStateCode(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return US_STATE_TO_CODE[trimmed.toLowerCase()] || trimmed.toUpperCase();
}

function categoryLabelFromRaw(rawCategory) {
  if (!rawCategory) return 'Equine Professional';
  return rawCategory
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(str, max) {
  if (!str) return '';
  if (str.length <= max) return str;
  return str.slice(0, max - 1).trim() + '…';
}

/**
 * Map Firestore provider doc to a public view model (no phone/email/UID).
 */
function toPublicProvider(doc) {
  const data = doc.data();
  const id = doc.id;

  const businessName = pickField(data, ['businessName', 'Business Name']) || 'Provider';
  const rawCategory = pickField(data, [
    'serviceCategory',
    'servicesCategory',
    'Services Category',
    'Service Category',
  ]);
  const categoryLabel =
    data.seoCategoryLabel || categoryLabelFromRaw(rawCategory);
  const city = pickField(data, ['city', 'City']);
  const state = normalizeStateCode(
    data.seoStateCode || pickField(data, ['state', 'State'])
  );
  const zipCode = pickField(data, ['zipCode', 'Zip Code', 'zip']);
  const description = pickField(data, [
    'description',
    'brieflyDescribeYourServices',
    'Briefly Describe Your Services',
  ]);
  const serviceArea = pickField(data, [
    'travelRadiusOrBusinessLocation',
    'travelRadius',
    'Travel Radius or Business Location',
  ]);
  const specialties = pickField(data, ['specialties', 'Specialties']);
  const website = pickField(data, [
    'websiteOrSocialMediaPage',
    'websiteOrSocials',
    'website',
    'url',
    'Website or Social Media Page',
  ]);
  const slug = data.slug || '';
  const ratingsAverage =
    typeof data.ratingsAverage === 'number' ? data.ratingsAverage : null;
  const numberOfRatings =
    typeof data.numberOfRatings === 'number' ? data.numberOfRatings : 0;
  const listingType = pickField(data, ['listingType', 'Listing Type']);
  const badges = Array.isArray(data.badges) ? data.badges : [];
  const isClaimed = Boolean(data.claimedBy);
  const visibleInDirectory = data.visibleInDirectory !== false;

  const locationLine = [city, state].filter(Boolean).join(', ');
  const canonicalUrl = slug ? SITE_ORIGIN + '/providers/' + slug : '';

  const pageTitle =
    businessName +
    ' | ' +
    categoryLabel +
    (state ? ' in ' + state : '') +
    ' | The Horse Concierge';

  const descLead =
    businessName +
    ' — ' +
    categoryLabel +
    (locationLine ? ' in ' + locationLine : '') +
    '.';
  const metaDescription = truncate(
    descLead +
      ' ' +
      (description || 'View ratings and services on The Horse Concierge.') +
      ' Find trusted equine professionals near you.',
    160
  );

  return {
    id,
    slug,
    businessName,
    categoryLabel,
    categoryRaw: rawCategory,
    browseCategorySlug: categoryValueToSlug(rawCategory),
    city,
    state,
    zipCode,
    locationLine,
    description,
    serviceArea,
    specialties,
    website: normalizeWebsite(website),
    ratingsAverage,
    numberOfRatings,
    listingType,
    badges,
    isClaimed,
    visibleInDirectory,
    canonicalUrl,
    pageTitle,
    metaDescription,
  };
}

function normalizeWebsite(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return 'https://' + trimmed;
}

function toPublicReview(doc) {
  const data = doc.data();
  if (!data.comment || !String(data.comment).trim()) return null;
  return {
    id: doc.id,
    rating: data.rating || 0,
    comment: String(data.comment).trim(),
    reviewerName: data.reviewerName || 'Anonymous',
    createdAt: data.createdAt && data.createdAt.toDate
      ? data.createdAt.toDate()
      : null,
  };
}

function buildJsonLd(provider, reviews) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: provider.businessName,
    description: provider.description || provider.metaDescription,
    serviceType: provider.categoryLabel,
    url: provider.canonicalUrl,
  };

  if (provider.city || provider.state || provider.zipCode) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(provider.city ? { addressLocality: provider.city } : {}),
      ...(provider.state ? { addressRegion: provider.state } : {}),
      ...(provider.zipCode ? { postalCode: provider.zipCode } : {}),
      addressCountry: 'US',
    };
  }

  const areaServed = [provider.city, provider.state].filter(Boolean);
  if (provider.serviceArea) areaServed.push(provider.serviceArea);
  if (areaServed.length) schema.areaServed = areaServed;

  if (provider.website) schema.sameAs = [provider.website];

  if (provider.numberOfRatings > 0 && provider.ratingsAverage != null) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: provider.ratingsAverage,
      reviewCount: provider.numberOfRatings,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (reviews && reviews.length) {
    schema.review = reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.reviewerName },
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: r.comment,
    }));
  }

  return schema;
}

module.exports = {
  SITE_ORIGIN,
  escapeHtml,
  truncate,
  toPublicProvider,
  toPublicReview,
  buildJsonLd,
  normalizeStateCode,
};
