/**
 * Generate Horsemanship Challenge week wireframe pages (all except Week 10 trailer).
 * Mirrors horsemanship-challenge-trailer-safety.html flow: lock gate → hero → about →
 * points (TBD) → daily drip schedule → CTA.
 *
 * Run: node scripts/generate-challenge-week-wireframes.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function parseYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const out = new Date(date.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

function monthDay(date) {
  return MONTHS[date.getMonth()] + ' ' + date.getDate();
}

function rangeLabel(startYmd) {
  const start = parseYmd(startYmd);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return MONTHS[start.getMonth()] + ' ' + start.getDate() + '–' + end.getDate() + ', 2026';
  }
  return monthDay(start) + '–' + monthDay(end) + ', 2026';
}

function unlockLong(startYmd) {
  const start = parseYmd(startYmd);
  return MONTHS[start.getMonth()] + ' ' + start.getDate() + ', 2026';
}

function shortRange(startYmd) {
  const start = parseYmd(startYmd);
  const end = addDays(start, 6);
  const startMonth = MONTHS[start.getMonth()].slice(0, 3);
  const endMonth = MONTHS[end.getMonth()].slice(0, 3);
  if (start.getMonth() === end.getMonth()) {
    return startMonth + ' ' + start.getDate() + '–' + end.getDate();
  }
  return startMonth + ' ' + start.getDate() + '–' + endMonth + ' ' + end.getDate();
}

const LOGOS = {
  madBarn:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Logos%2FMBlogo.png?alt=media&token=5cf42881-655b-4a1a-98c3-a8ccc03ae120',
  eei:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2Fequine%20institute%20logo.webp?alt=media&token=cd9bd4e4-4846-434f-916f-3fb0e4d67269',
  crs:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2Fcrs.jpg?alt=media&token=bb9ad3a1-573f-4d28-8271-4edaed8beeb9',
  yef:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2FYEF%2BBanner%2BLogo.webp?alt=media&token=226ebcda-03a9-4a53-8260-eb545d61b796',
  myler:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2FMyler%20Bits.jpg?alt=media&token=29eed792-20a4-4861-9112-565fddf0107a',
  toklat:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2F0000165_Toklat-Vertical.png?alt=media&token=b759e6e5-f986-41e0-9ee8-1ec66a905d60',
  fourH:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2F4Hooves.webp?alt=media&token=26f97c59-1887-4b68-b7f7-3562b304a679',
  denver:
    'https://firebasestorage.googleapis.com/v0/b/thc-native.firebasestorage.app/o/Horsemanship%20Challenge%2Fdenver%20uni.svg?alt=media&token=a5e0bbb8-7bae-47a6-b2d8-ab9f001dabc9',
  thc: 'Images/ColorLogo.svg',
};

/**
 * Schedule from Fall 2026 spreadsheet.
 * Hand-built (not generated): Week 1 Mad Barn, Week 10 Double D trailer safety.
 */
const WEEKS = [
  // Week 1 Mad Barn — horsemanship-challenge-week-01-nutrition.html (hand-built)
  {
    num: 2,
    slug: 'week-02-anatomy',
    start: '2026-09-07',
    theme: 'Anatomy & Conformation',
    partner: 'Equine Education Institute',
    partnerShort: 'Equine Education Institute',
    logo: LOGOS.eei,
    website: 'https://equineinstitute.org/',
    about:
      'Partner copy for Equine Education Institute will go here — anatomy and conformation focus for Week 2.',
  },
  {
    num: 3,
    slug: 'week-03-hoof-care',
    start: '2026-09-14',
    theme: 'Hoof Care & Lameness',
    partner: 'CRS Horseshoes',
    partnerShort: 'CRS Horseshoes',
    logo: LOGOS.crs,
    website: 'https://www.crshorseshoes.com/',
    about:
      'Partner copy for CRS Horseshoes will go here — hoof care and lameness focus for Week 3.',
  },
  {
    num: 4,
    slug: 'week-04-ride',
    start: '2026-09-21',
    theme: 'Ride Week',
    host: true,
    partner: 'The Horse Concierge',
    partnerShort: 'The Horse Concierge',
    logo: LOGOS.thc,
    website: 'index.html',
    about:
      'Week 4 is hosted by The Horse Concierge — a Ride Week focused on app activities, practice, and participation. Daily activities and any guest content will be added here.',
  },
  {
    num: 5,
    slug: 'week-05-saddle-yef',
    start: '2026-09-28',
    theme: 'Saddle Fit',
    partner: 'Your Expert Fitter',
    partnerShort: 'Your Expert Fitter',
    logo: LOGOS.yef,
    website: 'https://www.yourexpertfitter.com/',
    about:
      'Partner copy for Your Expert Fitter will go here — saddle fit focus for Week 5.',
  },
  {
    num: 6,
    slug: 'week-06-saddle-myler',
    start: '2026-10-05',
    theme: 'Bits & Communication',
    partner: 'Myler presented by Toklat',
    partnerShort: 'Toklat',
    logo: LOGOS.myler,
    logoSecondary: LOGOS.toklat,
    logoSecondaryAlt: 'Toklat',
    presentedBy: true,
    website: 'https://www.toklat.com/',
    about:
      'Partner copy for Myler presented by Toklat will go here — bits and communication focus for Week 6.',
  },
  {
    num: 7,
    slug: 'week-07-ride',
    start: '2026-10-12',
    theme: 'Ride Week',
    host: true,
    partner: 'The Horse Concierge',
    partnerShort: 'The Horse Concierge',
    logo: LOGOS.thc,
    website: 'index.html',
    about:
      'Week 7 is hosted by The Horse Concierge — a Ride Week focused on app activities, practice, and participation. Daily activities and any guest content will be added here.',
  },
  {
    num: 8,
    slug: 'week-08-equine-behavior',
    start: '2026-10-19',
    theme: 'Equine Behavior',
    partner: 'University of Denver',
    partnerShort: 'University of Denver',
    logo: LOGOS.denver,
    website: 'https://www.du.edu/',
    about:
      'Partner copy for University of Denver will go here — equine behavior focus for Week 8.',
  },
  {
    num: 9,
    slug: 'week-09-first-aid',
    start: '2026-10-26',
    theme: 'First Aid',
    partner: 'Equine Education Institute',
    partnerShort: 'Equine Education Institute',
    logo: LOGOS.eei,
    website: 'https://equineinstitute.org/',
    about:
      'Partner copy for Equine Education Institute will go here — first aid focus for Week 9.',
  },
  {
    num: 11,
    slug: 'week-11-emergency',
    start: '2026-11-09',
    theme: 'Emergency Preparedness',
    partner: '4 Hooves Large Animal Services',
    partnerShort: '4HLAS',
    logo: LOGOS.fourH,
    website: 'https://4hoovessmart.com/',
    about:
      'Partner copy for 4 Hooves Large Animal Services will go here — emergency preparedness focus for Week 11.',
  },
  {
    num: 12,
    slug: 'week-12-ride-catchup',
    start: '2026-11-16',
    theme: 'Ride Week & Catch Up',
    host: true,
    partner: 'The Horse Concierge',
    partnerShort: 'The Horse Concierge',
    logo: LOGOS.thc,
    website: 'index.html',
    about:
      'Week 12 is hosted by The Horse Concierge — a Ride Week and catch-up window to finish activities, revisit earlier partner content, and stay on the board before the final week.',
  },
  {
    num: 13,
    slug: 'week-13-horse-history',
    start: '2026-11-23',
    theme: 'Horse History & Competition Wrap',
    host: true,
    partner: 'The Horse Concierge',
    partnerShort: 'The Horse Concierge',
    logo: LOGOS.thc,
    website: 'index.html',
    about:
      'Week 13 is led by The Horse Concierge — generate a horse’s history in the app and wrap the competition. Daily content and wrap details TBD.',
  },
];

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function logoWell(week) {
  if (!week.logo) {
    return `<div class="challenge-partner-logo-well reveal" aria-hidden="true">
        <span class="challenge-week-card__logo--empty" style="border:none;height:auto;"><span>Partner TBD</span></span>
      </div>`;
  }
  if (week.logoSecondary) {
    return `<div class="challenge-partner-logo-well challenge-partner-logo-well--dual reveal">
        <img
          src="${escapeHtml(week.logo)}"
          alt="Myler Bits"
          width="120"
          height="100"
          class="challenge-partner-logo-well__img"
        >
        <span class="challenge-partner-logo-well__divider">presented by</span>
        <img
          src="${escapeHtml(week.logoSecondary)}"
          alt="${escapeHtml(week.logoSecondaryAlt || week.partnerShort)}"
          width="120"
          height="100"
          class="challenge-partner-logo-well__img"
        >
      </div>`;
  }
  return `<div class="challenge-partner-logo-well reveal">
        <img
          src="${escapeHtml(week.logo)}"
          alt="${escapeHtml(week.partnerShort)}"
          width="200"
          height="200"
          class="challenge-partner-logo-well__img"
        >
      </div>`;
}

function partnerLinks(week) {
  if (!week.website) {
    return `<p class="body-text reveal" style="margin-top:16px; color:var(--text-dim);">Partner links will be added when confirmed.</p>`;
  }
  const external = /^https?:/i.test(week.website);
  const attrs = external ? ' target="_blank" rel="noopener noreferrer"' : '';
  const label = week.host ? 'The Horse Concierge' : 'Website';
  return `<div class="challenge-partner-links reveal reveal-delay-1">
      <a href="${escapeHtml(week.website)}"${attrs}>${label}</a>
    </div>`;
}

function dayArticles(week) {
  const start = parseYmd(week.start);
  const activityWeek = !!week.host;
  return DAY_NAMES.map((name, i) => {
    const d = addDays(start, i);
    const dateLabel = monthDay(d);
    const isSunday = i === 6;
    let title;
    let teaser;
    let body;

    if (isSunday) {
      title = 'Recap &amp; Winner';
      teaser =
        'Tally your points, catch up on any day you missed, and celebrate this week’s standout participants.';
      body = `<div class="challenge-day__resource">
            <h4 class="challenge-day__resource-title">Week ${week.num} recap</h4>
            <p class="body-text" style="font-size:0.9rem;">Review the points checklist above and finish any remaining actions in the app. After today, this full schedule stays open for arrears completion.</p>
          </div>
          <div class="challenge-day__placeholder">
            <p class="challenge-day__placeholder-label">Winner announcement</p>
            <p class="body-text" style="font-size:0.9rem; margin:0;">Weekly winner details will be posted here after scores are tallied.</p>
          </div>`;
    } else if (activityWeek) {
      title = 'Activity TBD';
      teaser =
        'Daily Ride Week activity, guest content (if any), and app actions will be added here.';
      body = `<div class="challenge-day__placeholder">
            <p class="challenge-day__placeholder-label">Activity placeholder</p>
            <p class="body-text" style="font-size:0.9rem; margin:0;">Activity details, any guest lesson, and resources for ${name} will be added here.</p>
          </div>
          <div class="challenge-day__action">
            <p class="challenge-day__action-label">Points TBD</p>
            <p class="body-text" style="font-size:0.9rem; margin-bottom:12px;">App action for this day TBD.</p>
            <button type="button" class="btn-ghost" data-thc-action="app">Open the App</button>
          </div>`;
    } else {
      title = 'Day theme TBD';
      teaser =
        'Daily lesson title, teaser, video, and resources will be added when partner content is ready.';
      body = `<div class="challenge-day__placeholder">
            <p class="challenge-day__placeholder-label">Content placeholder</p>
            <p class="body-text" style="font-size:0.9rem; margin:0;">Video, links, and app actions for ${name} will be added here.</p>
          </div>
          <div class="challenge-day__action">
            <p class="challenge-day__action-label">Points TBD</p>
            <p class="body-text" style="font-size:0.9rem; margin-bottom:12px;">App action for this day TBD.</p>
            <button type="button" class="btn-ghost" data-thc-action="app">Open the App</button>
          </div>`;
    }

    return `      <article class="challenge-day" data-day="${i}">
        <header class="challenge-day__header">
          <div class="challenge-day__meta">
            <span class="challenge-day__weekday">${name}</span>
            <span class="challenge-day__date">${dateLabel}</span>
          </div>
          <h3 class="challenge-day__title">${title}</h3>
          <p class="challenge-day__teaser">${teaser}</p>
          <p class="challenge-day__locked-note" hidden>Content unlocks ${name}, ${dateLabel}.</p>
        </header>
        <div class="challenge-day__body">
          ${body}
        </div>
      </article>`;
  }).join('\n\n');
}

function renderWeek(week) {
  const file = `horsemanship-challenge-${week.slug}.html`;
  const pathSlug = file.replace(/\.html$/, '');
  const range = rangeLabel(week.start);
  const unlock = unlockLong(week.start);
  const presented = week.presentedBy
    ? `<em>Myler</em> presented by <em>Toklat</em> — content wireframe ready for partner materials.`
    : week.host
      ? `Hosted by <em>${escapeHtml(week.partner)}</em> — activities and daily drip ready for content.`
      : week.partner
        ? `Presented by <em>${escapeHtml(week.partner)}</em> — content wireframe ready for partner materials.`
        : `Partner and theme to be announced — wireframe ready for content.`;
  const aboutLabel = week.host ? 'Hosted by' : 'Education partner';
  const aboutH2 = week.host
    ? `Hosted by<br><em>${escapeHtml(week.partner)}</em>`
    : week.partner
      ? `About<br><em>${escapeHtml(week.partner)}</em>`
      : `Education partner<br><em>coming soon.</em>`;
  const heroPartner = week.partner || 'Partner TBD';
  const ctaLine = week.host
    ? `Complete Week ${week.num} activities in the app, and check back as daily content goes live.`
    : week.partner
      ? `Explore ${escapeHtml(week.partnerShort)} and download the app when Week ${week.num} actions go live.`
      : `Download the app and check back when Week ${week.num} partner content is published.`;
  const ctaBtn =
    week.website && /^https?:/i.test(week.website)
      ? `<a class="btn-primary" href="${escapeHtml(week.website)}" target="_blank" rel="noopener noreferrer">Visit ${escapeHtml(week.partnerShort)}</a>`
      : `<a class="btn-primary" href="horsemanship-challenge-hub.html">Back to Challenge Hub</a>`;
  const pointsNote = week.host
    ? `Scoring details will be filled in when Week ${week.num} activities are confirmed.`
    : `Scoring details will be filled in when ${escapeHtml(heroPartner)} confirms Week ${week.num} activities. Prize details can be added to this page when identified.`;
  const scheduleIntro = week.host
    ? `Titles stay visible all week. Locked days show a teaser until that morning — then activities open. After Sunday, the full week remains available. Replace each day’s placeholders as activities are confirmed.`
    : `Titles stay visible all week. Locked days show a teaser until that morning — then content opens. After Sunday, the full week remains available. Replace each day’s placeholders as partner materials arrive.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Week ${week.num} · ${escapeHtml(week.theme)} — Horsemanship Challenge</title>
<meta name="description" content="Week ${week.num} of The Horse Concierge Horsemanship Challenge — ${escapeHtml(week.theme)}${week.partner ? ' with ' + escapeHtml(week.partner) : ''}. ${range}.">
<meta name="robots" content="noindex, nofollow">
<link rel="canonical" href="https://www.thehorseconcierge.com/${pathSlug}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,500&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/styles.css?v=20260813b">
<meta property="og:title" content="Week ${week.num} · ${escapeHtml(week.theme)}">
<meta property="og:description" content="${range} — ${escapeHtml(week.theme)}${week.partner ? ' with ' + escapeHtml(week.partner) : ''}. Wireframe for challenge content.">
<meta property="og:url" content="https://www.thehorseconcierge.com/${pathSlug}">
<meta property="og:type" content="website">
</head>
<body>

<div id="cursor"></div>
<div id="cursor-ring"></div>

<div id="challenge-week-config"
  data-week-start="${week.start}"
  data-week-number="${week.num}"
  data-unlock-label="${unlock}"
  hidden></div>

<nav id="mainNav">
  <a class="nav-logo" href="index.html" aria-label="The Horse Concierge — Home">
    <img class="nav-logo-img" src="Images/ColorLogo.svg" width="220" height="44" alt="The Horse Concierge">
  </a>
  <ul class="nav-links">
    <li><a href="index.html">Home</a></li>
    <li><a href="owners.html">For Owners</a></li>
    <li><a href="providers.html">For Providers</a></li>
    <li><a href="story.html">Our Story</a></li>
    <li><a href="ambassadors.html">Ambassadors</a></li>
    <li><a href="contact.html">Contact</a></li>
  </ul>
  <a class="nav-cta" href="horsemanship-challenge.html">Challenge</a>
</nav>

<main id="main-content">
  <div id="challenge-week-locked" class="section challenge-hub-status">
    <div class="challenge-gate-locked" style="max-width:560px; margin:0 auto;">
      <div class="challenge-gate-locked__inner">
        <p class="section-label" style="justify-content:center;">Week ${week.num}</p>
        <h1 class="heading-lg" style="text-align:center;">${escapeHtml(week.theme)}<br>opens <em>${escapeHtml(unlock.replace(', 2026', ''))}.</em></h1>
        <p class="body-text" style="margin:16px auto 0; text-align:center;">This week${week.partner ? (week.host ? ' hosted by ' : ' with ') + escapeHtml(week.partner) : ''} unlocks Monday, ${escapeHtml(unlock)}. Until then, the full schedule stays closed.</p>
        <div class="hero-actions" style="justify-content:center; margin-top:28px;">
          <a class="btn-primary" href="horsemanship-challenge-hub.html">Back to Challenge Hub</a>
        </div>
      </div>
    </div>
  </div>

  <div id="challenge-week-open" hidden>
  <div class="page-hero page-hero--challenge">
    <div class="page-hero-bg"></div>
    <div class="page-hero-content">
      ${logoWell(week)}
      <div class="section-label">Week ${week.num} · ${escapeHtml(range)}</div>
      <h1 class="heading-xl">${escapeHtml(week.theme)}</h1>
      <p class="funnel-tagline challenge-hero-tagline">${presented}</p>
      <div class="hero-actions challenge-hero-actions">
        <a class="btn-primary" href="#schedule">View This Week’s Schedule</a>
        <a class="btn-ghost" href="horsemanship-challenge-hub.html">Back to Challenge Hub</a>
      </div>
    </div>
  </div>

  <section class="section section-sm" id="about-partner">
    <div class="section-label reveal">${aboutLabel}</div>
    <h2 class="heading-xl reveal">${aboutH2}</h2>
    <div class="gold-divider reveal"></div>
    <p class="body-text reveal" style="max-width:720px; margin-top:20px;">${escapeHtml(week.about)}</p>
    ${partnerLinks(week)}
  </section>

  <section class="section" style="padding-top:0;" id="points">
    <div class="section-label reveal">Week ${week.num} scoring</div>
    <h2 class="heading-xl reveal">Points<br><em>TBD.</em></h2>
    <ul class="challenge-points-list reveal reveal-delay-1">
      <li><span class="challenge-points-list__pts">—</span> ${week.host ? 'App / Ride Week activities TBD' : 'Partner / app actions for this week TBD'}</li>
      <li><span class="challenge-points-list__pts">—</span> Live or webinar points TBD (if any)</li>
      <li><span class="challenge-points-list__pts">—</span> Ride / care tracking TBD</li>
    </ul>
    <p class="funnel-panel-note reveal" style="margin-top:20px; max-width:560px;">${pointsNote}</p>
  </section>

  <section class="section" style="padding-top:0;" id="schedule">
    <div class="section-label reveal">Daily schedule</div>
    <h2 class="heading-xl reveal">${escapeHtml(range.split(',')[0])}<br><em>2026</em></h2>
    <p class="body-text reveal" style="max-width:640px; margin-top:16px;">${scheduleIntro}</p>
    <p id="challenge-unlock-banner" class="challenge-unlock-banner" hidden></p>

    <div class="challenge-day-list">
${dayArticles(week)}
    </div>
  </section>

  <div class="cta-section">
    <div class="cta-section-inner">
      <div class="section-label reveal" style="justify-content:center;">Stay ready</div>
      <h2 class="heading-xl reveal">Week ${week.num}.<br><em>${escapeHtml(week.theme)}</em></h2>
      <p class="body-text reveal" style="margin: 0 auto; text-align:center; max-width:560px;">${ctaLine}</p>
      <div class="hero-actions reveal reveal-delay-1" style="justify-content:center; margin-top:32px;">
        ${ctaBtn}
        <button type="button" class="btn-ghost" data-thc-action="app">Download the App</button>
      </div>
    </div>
  </div>

  <footer style="border-top: 1px solid rgba(var(--gold-rgb),0.12); padding: 40px 60px; max-width:1400px; margin: 0 auto; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
    <div style="font-family: var(--font-display); font-size: 1rem; color: var(--cream);">The Horse Concierge™</div>
    <div style="display:flex; gap:20px; flex-wrap:wrap;">
      <a href="horsemanship-challenge-hub.html" style="font-size:0.72rem; color:var(--text-dim); letter-spacing:0.1em;">← Challenge Hub</a>
    </div>
  </footer>
  </div>
</main>

<dialog id="thc-dialog-app" class="thc-dialog">
  <div class="thc-dialog__inner">
    <button type="button" class="thc-dialog-close" aria-label="Close">&times;</button>
    <h2 class="thc-dialog__title">Get the app</h2>
    <p class="thc-dialog__text">Complete Week ${week.num} challenge actions in The Horse Concierge app.</p>
    <div class="download-btns thc-dialog__stores">
      <a class="store-btn" href="https://apps.apple.com/us/app/the-horse-concierge/id6749463193" target="_blank" rel="noopener noreferrer">
        <div class="store-btn-icon">🍎</div>
        <div>
          <div class="store-btn-text-top">Download on the</div>
          <div class="store-btn-text-main">App Store</div>
        </div>
      </a>
      <a class="store-btn" href="https://play.google.com/store/apps/details?id=com.thehorseconcierge.app" target="_blank" rel="noopener noreferrer">
        <div class="store-btn-icon">▶</div>
        <div>
          <div class="store-btn-text-top">Get it on</div>
          <div class="store-btn-text-main">Google Play</div>
        </div>
      </a>
    </div>
  </div>
</dialog>

<script src="js/main.js?v=20260728a"></script>
<script src="js/thc-gating.js?v=20260717d"></script>
<script src="js/horsemanship-challenge-week.js?v=20260814b"></script>
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>
`;
}

const obsolete = [
  'horsemanship-challenge-week-04.html',
  'horsemanship-challenge-week-07.html',
  'horsemanship-challenge-week-08-emergency.html',
  'horsemanship-challenge-week-11.html',
  'horsemanship-challenge-week-12-equine-behavior.html',
];

let written = 0;
for (const week of WEEKS) {
  const file = `horsemanship-challenge-${week.slug}.html`;
  const outPath = path.join(ROOT, file);
  fs.writeFileSync(outPath, renderWeek(week), 'utf8');
  console.log('Wrote', file);
  written += 1;
}

for (const file of obsolete) {
  const outPath = path.join(ROOT, file);
  if (fs.existsSync(outPath)) {
    fs.unlinkSync(outPath);
    console.log('Removed obsolete', file);
  }
}

console.log('Done —', written, 'wireframe pages.');
console.log('Hub card helper:');
for (const week of WEEKS) {
  const end = addDays(parseYmd(week.start), 6);
  const endYmd =
    end.getFullYear() +
    '-' +
    String(end.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(end.getDate()).padStart(2, '0');
  const label = shortRange(week.start) + (week.partnerShort ? ' · ' + week.partnerShort : '');
  console.log(
    `  W${week.num}: ${week.start}→${endYmd} | ${week.theme} | horsemanship-challenge-${week.slug}.html | ${label}`
  );
}
