'use strict';

const { escapeHtml } = require('./provider-public');

function renderNotFoundPage(slug) {
  const title = 'Provider not found — The Horse Concierge';
  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' +
    escapeHtml(title) +
    '</title>\n' +
    '<meta name="robots" content="noindex">\n' +
    '<link rel="stylesheet" href="/css/styles.css?v=20260624">\n' +
    '</head>\n<body>\n' +
    '<nav id="mainNav">\n' +
    '  <a class="nav-logo" href="/"><img class="nav-logo-img" src="/Images/ColorLogo.svg" width="220" height="44" alt="The Horse Concierge"></a>\n' +
    '</nav>\n' +
    '<main id="main-content" class="provider-detail-page section">\n' +
    '  <h1 class="heading-lg">Provider not found</h1>\n' +
    (slug
      ? '<p class="body-text">No listing matches <strong>' +
        escapeHtml(slug) +
        '</strong>.</p>'
      : '<p class="body-text">That provider listing could not be found.</p>') +
    '  <a class="btn-primary" href="/find-providers" style="margin-top:24px;display:inline-flex;">Search the directory</a>\n' +
    '</main>\n' +
    '</body>\n</html>'
  );
}

module.exports = { renderNotFoundPage };
