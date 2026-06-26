'use strict';

const { escapeHtml } = require('./provider-public');

const CSS_VERSION = '20260628';
const JS_VERSION = '20260520';

function renderNav() {
  return (
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
    '</nav>\n'
  );
}

function renderFooter() {
  return (
    '<footer class="snapshot-footer">\n' +
    '  <div class="snapshot-footer__brand">The Horse Concierge™</div>\n' +
    '  <a href="/find-providers" class="snapshot-footer__link">Find providers</a>\n' +
    '</footer>\n'
  );
}

function renderProviderLinks(providers) {
  if (!providers.length) {
    return '<p class="body-text directory-empty">No providers listed yet.</p>';
  }
  return (
    '<ul class="directory-list">\n' +
    providers
      .map(function (p) {
        return (
          '<li><a class="directory-list__link" href="/providers/' +
          escapeHtml(p.slug) +
          '">' +
          escapeHtml(p.businessName) +
          (p.locationLine
            ? '<span class="directory-list__meta">' + escapeHtml(p.locationLine) + '</span>'
            : '') +
          '</a></li>'
        );
      })
      .join('\n') +
    '\n</ul>\n'
  );
}

function renderPagination(basePath, currentPage, totalPages) {
  if (totalPages <= 1) return '';
  var html = '<nav class="directory-pagination" aria-label="Pagination"><ul class="directory-pagination__list">';
  for (var i = 1; i <= totalPages; i++) {
    var href = i === 1 ? basePath : basePath + '/page-' + i;
    var isCurrent = i === currentPage;
    html +=
      '<li><a class="directory-pagination__link' +
      (isCurrent ? ' directory-pagination__link--current' : '') +
      '" href="' +
      escapeHtml(href) +
      '"' +
      (isCurrent ? ' aria-current="page"' : '') +
      '>' +
      i +
      '</a></li>';
  }
  html += '</ul></nav>';
  return html;
}

function renderDirectoryPage(options) {
  var title = options.title;
  var description = options.description;
  var canonicalUrl = options.canonicalUrl;
  var breadcrumb = options.breadcrumb || '';
  var heading = options.heading;
  var intro = options.intro || '';
  var bodyHtml = options.bodyHtml || '';
  var providers = options.providers || [];
  var pagination = options.pagination || '';

  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' +
    escapeHtml(title) +
    '</title>\n' +
    '<meta name="description" content="' +
    escapeHtml(description) +
    '">\n' +
    '<link rel="canonical" href="' +
    escapeHtml(canonicalUrl) +
    '">\n' +
    '<meta property="og:title" content="' +
    escapeHtml(title) +
    '">\n' +
    '<meta property="og:description" content="' +
    escapeHtml(description) +
    '">\n' +
    '<meta property="og:url" content="' +
    escapeHtml(canonicalUrl) +
    '">\n' +
    '<meta property="og:type" content="website">\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">\n' +
    '<link rel="stylesheet" href="/css/styles.css?v=' +
    CSS_VERSION +
    '">\n' +
    '</head>\n<body>\n' +
    '<div id="cursor"></div>\n<div id="cursor-ring"></div>\n' +
    renderNav() +
    '<main id="main-content" class="directory-page">\n' +
    '  <div class="section directory-page__header">\n' +
    (breadcrumb
      ? '    <nav class="provider-breadcrumb directory-breadcrumb" aria-label="Breadcrumb">' +
        breadcrumb +
        '</nav>\n'
      : '') +
    '    <h1 class="heading-lg directory-page__title">' +
    escapeHtml(heading) +
    '</h1>\n' +
    (intro ? '    <p class="body-text directory-page__intro">' + escapeHtml(intro) + '</p>\n' : '') +
    '  </div>\n' +
    '  <div class="section directory-page__body">\n' +
    bodyHtml +
    renderProviderLinks(providers) +
    pagination +
    '  </div>\n' +
    '</main>\n' +
    renderFooter() +
    '<script src="/js/main.js?v=' +
    JS_VERSION +
    '"></script>\n' +
    '<script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments);};</script>\n' +
    '<script defer src="/_vercel/insights/script.js"></script>\n' +
    '</body>\n</html>'
  );
}

function renderCategoryGrid(categories) {
  return (
    '<div class="directory-grid">\n' +
    categories
      .map(function (cat) {
        return (
          '<a class="directory-grid__card" href="/directory/' +
          escapeHtml(cat.slug) +
          '"><span class="directory-grid__label">' +
          escapeHtml(cat.label) +
          '</span><span class="directory-grid__count">' +
          cat.count +
          ' provider' +
          (cat.count === 1 ? '' : 's') +
          '</span></a>'
        );
      })
      .join('\n') +
    '\n</div>\n'
  );
}

function renderStateGrid(states) {
  return (
    '<div class="directory-grid directory-grid--states">\n' +
    states
      .map(function (st) {
        return (
          '<a class="directory-grid__card" href="/directory/states/' +
          escapeHtml(st.code.toLowerCase()) +
          '"><span class="directory-grid__label">' +
          escapeHtml(st.name) +
          '</span><span class="directory-grid__count">' +
          st.count +
          ' provider' +
          (st.count === 1 ? '' : 's') +
          '</span></a>'
        );
      })
      .join('\n') +
    '\n</div>\n'
  );
}

module.exports = {
  renderDirectoryPage,
  renderCategoryGrid,
  renderStateGrid,
  renderPagination,
};
