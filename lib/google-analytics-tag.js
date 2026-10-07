'use strict';

/** Google Analytics (gtag.js) snippet for server-rendered pages. */
const GOOGLE_ANALYTICS_TAG =
  '<!-- Google tag (gtag.js) -->\n' +
  '<script async src="https://www.googletagmanager.com/gtag/js?id=G-L0ZQDF8JW6"></script>\n' +
  '<script>\n' +
  '  window.dataLayer = window.dataLayer || [];\n' +
  '  function gtag(){dataLayer.push(arguments);}\n' +
  "  gtag('js', new Date());\n" +
  '\n' +
  "  gtag('config', 'G-L0ZQDF8JW6');\n" +
  '</script>\n';

module.exports = { GOOGLE_ANALYTICS_TAG };
