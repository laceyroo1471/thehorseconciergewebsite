'use strict';

const { escapeHtml, buildJsonLd } = require('./provider-public');
const {
  categoryStateBrowsePath,
  stateBrowsePath,
  categoryBrowsePath,
  isValidStateCode,
} = require('./directory-urls');
const { renderContactAccessGate } = require('./contact-access-gate');
const { renderRatingSection } = require('./provider-rating-widget');
const { renderClaimPanelShell } = require('./provider-claim-panel');

const CSS_VERSION = '20260628';
const JS_VERSION = '20260520';

function renderStars(rating) {
  if (rating == null || rating <= 0) return '';
  const full = Math.round(rating);
  const stars = '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
  return (
    '<span class="provider-rating-stars" aria-label="' +
    escapeHtml(String(rating)) +
    ' out of 5">' +
    stars +
    '</span>'
  );
}

function renderReview(review) {
  const dateStr = review.createdAt
    ? review.createdAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';
  return (
    '<article class="provider-review">' +
    '<div class="provider-review__head">' +
    renderStars(review.rating) +
    '<span class="provider-review__author">' +
    escapeHtml(review.reviewerName) +
    '</span>' +
    (dateStr
      ? '<time class="provider-review__date">' + escapeHtml(dateStr) + '</time>'
      : '') +
    '</div>' +
    '<p class="provider-review__body">' +
    escapeHtml(review.comment) +
    '</p>' +
    '</article>'
  );
}

function renderProviderPage(provider, reviews) {
  const jsonLd = buildJsonLd(provider, reviews);
  const subhead =
    provider.categoryLabel +
    (provider.locationLine ? ' in ' + provider.locationLine : '');

  let ratingBlock = renderRatingSection(
    provider.ratingsAverage || 0,
    provider.numberOfRatings || 0
  );

  let details = '';
  if (provider.description) {
    details +=
      '<p class="provider-detail-field provider-detail-field--desc"><strong>About</strong><br>' +
      escapeHtml(provider.description) +
      '</p>';
  }
  if (provider.website) {
    details +=
      '<p class="provider-detail-field"><strong>Website</strong><br>' +
      '<a href="' +
      escapeHtml(provider.website) +
      '" target="_blank" rel="noopener noreferrer">Visit website</a></p>';
  }

  const badges =
    provider.badges && provider.badges.length
      ? '<div class="provider-detail-badges">' +
        provider.badges
          .map((b) => '<span class="provider-detail-badge">' + escapeHtml(b) + '</span>')
          .join('') +
        '</div>'
      : '';

  const tierBadge = provider.listingType
    ? '<span class="provider-detail-tier">' + escapeHtml(provider.listingType) + '</span>'
    : '';

  const reviewsHtml =
    reviews && reviews.length
      ? '<section class="provider-reviews" aria-label="Reviews">' +
        '<h2 class="heading-md provider-reviews__title">Reviews</h2>' +
        reviews.map(renderReview).join('') +
        '</section>'
      : '';

  const claimPanel = renderClaimPanelShell();

  let browseLinks = '';
  if (provider.browseCategorySlug) {
    const links = [
      '<a class="btn-ghost" href="' +
        escapeHtml(categoryBrowsePath(provider.browseCategorySlug)) +
        '">Browse all ' +
        escapeHtml(provider.categoryLabel) +
        '</a>',
    ];
    if (provider.state && isValidStateCode(provider.state)) {
      links.unshift(
        '<a class="btn-primary" href="' +
          escapeHtml(
            categoryStateBrowsePath(provider.browseCategorySlug, provider.state)
          ) +
          '">More ' +
          escapeHtml(provider.categoryLabel) +
          ' in ' +
          escapeHtml(provider.state) +
          '</a>'
      );
      links.push(
        '<a class="btn-ghost" href="' +
          escapeHtml(stateBrowsePath(provider.state)) +
          '">All providers in ' +
          escapeHtml(provider.state) +
          '</a>'
      );
    }
    browseLinks =
      '<div class="provider-detail-browse">' +
      '<p class="provider-detail-browse__label">Explore the directory</p>' +
      '<div class="provider-detail-browse__actions">' +
      links.join('') +
      '</div></div>';
  }

  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' +
    escapeHtml(provider.pageTitle) +
    '</title>\n' +
    '<meta name="description" content="' +
    escapeHtml(provider.metaDescription) +
    '">\n' +
    '<link rel="canonical" href="' +
    escapeHtml(provider.canonicalUrl) +
    '">\n' +
    '<meta property="og:title" content="' +
    escapeHtml(provider.pageTitle) +
    '">\n' +
    '<meta property="og:description" content="' +
    escapeHtml(provider.metaDescription) +
    '">\n' +
    '<meta property="og:url" content="' +
    escapeHtml(provider.canonicalUrl) +
    '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="/css/styles.css?v=' +
    CSS_VERSION +
    '">\n' +
    '<script type="application/ld+json">' +
    JSON.stringify(jsonLd) +
    '</script>\n' +
    '</head>\n<body>\n' +
    '<div id="cursor"></div>\n<div id="cursor-ring"></div>\n' +
    '<nav id="mainNav">\n' +
    '  <a class="nav-logo" href="/" aria-label="The Horse Concierge — Home">\n' +
    '    <img class="nav-logo-img" src="/Images/ColorLogo.svg" width="220" height="44" alt="The Horse Concierge">\n' +
    '  </a>\n' +
    '  <ul class="nav-links">\n' +
    '    <li><a href="/">Home</a></li>\n' +
    '    <li><a href="/owners">For Owners</a></li>\n' +
    '    <li><a href="/providers">For Providers</a></li>\n' +
    '    <li><a href="/story">Our Story</a></li>\n' +
    '    <li><a href="/ambassadors">Ambassadors</a></li>\n' +
    '    <li><a href="/contact">Contact</a></li>\n' +
    '  </ul>\n' +
    '  <a class="nav-cta" href="/owners">Download the App</a>\n' +
    '</nav>\n' +
    '<main id="main-content" class="provider-detail-page">\n' +
    '  <div class="section provider-detail-back">\n' +
    '    <nav class="provider-breadcrumb" aria-label="Breadcrumb">\n' +
    '      <a href="/find-providers" class="snapshot-footer__link">Find providers</a>\n' +
    (provider.categoryLabel
      ? ' · <span>' + escapeHtml(provider.categoryLabel) + '</span>'
      : '') +
    (provider.state ? ' · <span>' + escapeHtml(provider.state) + '</span>' : '') +
    '    </nav>\n' +
    '  </div>\n' +
    '  <article class="section provider-detail-card">\n' +
    tierBadge +
    '    <h1 class="heading-lg provider-detail-card__title">' +
    escapeHtml(provider.businessName) +
    '</h1>\n' +
    '    <p class="provider-detail-card__subhead">' +
    escapeHtml(subhead) +
    '</p>\n' +
    ratingBlock +
    badges +
    details +
    renderContactAccessGate('/providers/' + provider.slug) +
    '\n' +
    claimPanel +
    '\n' +
    reviewsHtml +
    browseLinks +
    '  </article>\n' +
    '</main>\n' +
    '<footer class="snapshot-footer">\n' +
    '  <div class="snapshot-footer__brand">The Horse Concierge™</div>\n' +
    '  <a href="/find-providers" class="snapshot-footer__link">Find providers</a>\n' +
    '</footer>\n' +
    '<script src="/js/main.js?v=' +
    JS_VERSION +
    '"></script>\n' +
    '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>\n' +
    '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>\n' +
    '<script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>\n' +
    '<script src="/js/contact-access-gate.js?v=20260625b"></script>\n' +
    '<script src="/js/provider-contact-unlock.js?v=20260625b"></script>\n' +
    '<script src="/js/provider-star-rating.js?v=20260625c"></script>\n' +
    '<script src="/js/provider-claim.js?v=20260625c"></script>\n' +
    '<script>ThcProviderContactUnlock.bootFromSlug(' +
    JSON.stringify(provider.slug) +
    ');</script>\n' +
    '<script>ThcProviderStarRating.init({' +
    'providerId:' +
    JSON.stringify(provider.id) +
    ',providerName:' +
    JSON.stringify(provider.businessName) +
    '});</script>\n' +
    '<script>ThcProviderClaim.bootFromSlug(' +
    JSON.stringify(provider.slug) +
    ');</script>\n' +
    '<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>\n' +
    '<script defer src="/_vercel/insights/script.js"></script>\n' +
    '</body>\n</html>'
  );
}

module.exports = { renderProviderPage };
