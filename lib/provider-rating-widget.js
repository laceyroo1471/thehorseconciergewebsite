'use strict';

function renderSummaryHtml(avg, count) {
  if (count > 0 && avg > 0) {
    const full = Math.round(avg);
    const stars = '★★★★★'.slice(0, full) + '☆☆☆☆☆'.slice(0, 5 - full);
    const reviewLabel = count === 1 ? 'review' : 'reviews';
    return (
      '<span class="provider-rating-stars" aria-hidden="true">' +
      stars +
      '</span>' +
      '<span class="provider-detail-rating__text">' +
      avg.toFixed(1) +
      ' · ' +
      count +
      ' ' +
      reviewLabel +
      '</span>'
    );
  }
  return '<span class="provider-detail-rating__text">No ratings yet</span>';
}

function renderRatingSection(avg, count) {
  const hasRatings = count > 0 && avg > 0;
  const emptyClass = hasRatings ? '' : ' provider-detail-rating--empty';
  return (
    '<div class="provider-detail-rating' +
    emptyClass +
    '" id="provider-rating-summary">' +
    renderSummaryHtml(avg, count) +
    '</div>' +
    '<section class="provider-rating-widget" id="provider-rating-widget" aria-label="Rate this provider">' +
    '<h2 class="provider-rating-widget__heading">Rate this provider</h2>' +
    '<div class="provider-star-input" id="provider-star-input"></div>' +
    '<p class="provider-rating-widget__status" id="provider-rating-status" hidden></p>' +
    '<p class="provider-rating-widget__review-note">' +
    'Written reviews are only available in The Horse Concierge app. Add this provider to your horse\u2019s care team first, then leave your review from the app — we only accept written reviews from owners who use the provider.' +
    '</p></section>'
  );
}

module.exports = { renderRatingSection, renderSummaryHtml };
