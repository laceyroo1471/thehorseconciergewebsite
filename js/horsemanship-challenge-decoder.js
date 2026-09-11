/**
 * Week 3 Monday — Hoof & Lameness Decoder library + card carousel.
 */
(function () {
  var ROOT_ID = 'hoof-decoder';
  var DIR = 'Week%203%20Challenge%20Content/';

  var TOPICS = [
    {
      id: 'direction',
      number: '1',
      title: 'Direction & Orientation',
      terms: 'Medial / lateral, axial / abaxial, proximal / distal, dorsal / palmar / plantar, planes.',
      cards: [
        { file: '01 - Medial and Lateral - FINAL.png', title: 'Medial / Lateral' },
        { file: '02 - Axial and Abaxial - FINAL.png', title: 'Axial / Abaxial' },
        { file: '03 - Proximal and Distal - FINAL.png', title: 'Proximal / Distal' },
        { file: '04-dorsal-palmar-plantar-final.png', title: 'Dorsal / Palmar / Plantar' },
        { file: '05-sagittal-frontal-plane-final.png', title: 'Sagittal / Frontal Plane' },
      ],
    },
    {
      id: 'inside',
      number: '2',
      title: 'Inside the Hoof',
      terms: 'P1 / P2 / P3, DIP, DDFT, navicular bone and apparatus, laminae, digital cushion.',
      cards: [
        { file: '06-p1-p2-p3-final.png', title: 'P1 / P2 / P3' },
        { file: '07-dip-joint-final.png', title: 'DIP Joint' },
        { file: '08-ddft-final.png', title: 'DDFT' },
        { file: '09-navicular-bone-final.png', title: 'Navicular Bone' },
        { file: '10-navicular-apparatus-final.png', title: 'Navicular Apparatus' },
        { file: '11-laminae-lamellae-final.png', title: 'Laminae / Lamellae' },
        { file: '12-digital-cushion-final.png', title: 'Digital Cushion' },
      ],
    },
    {
      id: 'angles',
      number: '3',
      title: 'Angles & Alignment',
      terms: 'HPA, broken forward / back, DPA, dorsal hoof-wall angle, palmar and plantar angles.',
      cards: [
        { file: '14-hpa-final.png', title: 'Hoof-Pastern Axis' },
        { file: '15-broken-back-hpa-final.png', title: 'Broken-Back HPA' },
        { file: '16-broken-forward-hpa-final.png', title: 'Broken-Forward HPA' },
        { file: '17-dpa-final.png', title: 'Distal Phalanx Angle' },
        { file: '18-dorsal-hoof-wall-angle-final.png', title: 'Dorsal Hoof-Wall Angle' },
        { file: '19-Palmar-Angle-FINAL.png', title: 'Palmar Angle' },
        { file: '20-Plantar-Angle-FINAL.png', title: 'Plantar Angle' },
      ],
    },
    {
      id: 'balance',
      number: '4',
      title: 'Balance & Biomechanics',
      terms: 'Mediolateral and dorsopalmar balance, breakover, GRF, COP, COR, loading.',
      cards: [
        { file: '21-Mediolateral-Balance-FINAL.png', title: 'Mediolateral Balance' },
        { file: '22-Dorsopalmar-Balance-FINAL.png', title: 'Dorsopalmar Balance' },
        { file: '23-Dorsoplantar-Balance-FINAL.png', title: 'Dorsoplantar Balance' },
        { file: '24-Breakover-FINAL.png', title: 'Breakover' },
        { file: '25-Point-of-Breakover-FINAL.png', title: 'Point of Breakover' },
        { file: '26-GRF-Ground-Reaction-Force-FINAL.png', title: 'Ground Reaction Force' },
        { file: '27-COP-Center-of-Pressure-FINAL.png', title: 'Center of Pressure' },
        { file: '28-COR-Center-of-Rotation-FINAL.png', title: 'Center of Rotation' },
        { file: '29-Load-Loading-FINAL.png', title: 'Load / Loading' },
        { file: '30-Landing-FINAL.png', title: 'Landing' },
        { file: '31-Moment-FINAL.png', title: 'Moment' },
        { file: '32-Moment-Arm-FINAL.png', title: 'Moment Arm' },
      ],
    },
    {
      id: 'distortion',
      number: '5',
      title: 'Hoof Distortion',
      terms: 'Hoof capsule, flare, underrun and crushed heels, sheared heels, long toe / low heel, negative palmar and plantar angles.',
      cards: [
        { file: '33-Hoof-Capsule-FINAL.png', title: 'Hoof Capsule' },
        { file: '34-Hoof-Capsule-Distortion-FINAL.png', title: 'Hoof Capsule Distortion' },
        { file: '35-Flare-FINAL.png', title: 'Flare' },
        { file: '36-Underrun-vs-Crushed-Heels-FINAL.png', title: 'Underrun vs. Crushed Heels' },
        { file: '37-Sheared-Heels-FINAL.png', title: 'Sheared Heels' },
        { file: '38-Contracted-Heels-FINAL.png', title: 'Contracted Heels' },
        { file: '39-Long-Toe-Low-Heel-FINAL.png', title: 'Long Toe / Low Heel' },
        { file: '40-Negative-Palmar-Angle-FINAL.png', title: 'Negative Palmar Angle' },
        { file: '41-Negative-Plantar-Angle-FINAL.png', title: 'Negative Plantar Angle' },
      ],
    },
  ];

  var root = null;
  var activeTopic = null;
  var index = 0;
  var lightbox = null;
  var swipeX = null;

  function cardSrc(file) {
    return DIR + encodeURIComponent(file);
  }
  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function topicById(id) {
    for (var i = 0; i < TOPICS.length; i++) {
      if (TOPICS[i].id === id) return TOPICS[i];
    }
    return null;
  }
  function cardCountLabel(n) {
    return n === 1 ? '1 card' : n + ' cards';
  }

  function renderShelf() {
    activeTopic = null;
    index = 0;
    root.innerHTML =
      '<div class="decoder-shelf">' +
      TOPICS.map(function (topic) {
        return (
          '<button type="button" class="decoder-shelf__tile" data-decoder-open="' +
          topic.id +
          '">' +
          '<p class="decoder-shelf__num">Library ' +
          topic.number +
          '</p>' +
          '<h4 class="decoder-shelf__title">' +
          escapeHtml(topic.title) +
          '</h4>' +
          '<p class="decoder-shelf__terms">' +
          escapeHtml(topic.terms) +
          '</p>' +
          '<span class="decoder-shelf__meta">Open carousel · ' +
          cardCountLabel(topic.cards.length) +
          '</span>' +
          '</button>'
        );
      }).join('') +
      '</div>';
  }

  function slideHtml(topic, card, i) {
    return (
      '<div class="decoder-slide" data-slide="' +
      i +
      '">' +
      '<img src="' +
      cardSrc(card.file) +
      '" alt="' +
      escapeHtml(card.title) +
      ' — Hoof &amp; Lameness Decoder" width="1080" height="1350" loading="' +
      (i === 0 ? 'eager' : 'lazy') +
      '" data-decoder-zoom>' +
      '</div>'
    );
  }

  function renderReader(topic) {
    activeTopic = topic;
    index = 0;
    var total = topic.cards.length;
    root.innerHTML =
      '<div class="decoder-reader" data-decoder-reader>' +
      '<div class="decoder-reader__bar">' +
      '<button type="button" class="decoder-back" data-decoder-back>← Back to Decoder Hub</button>' +
      '<div>' +
      '<h4 class="decoder-reader__topic">' +
      escapeHtml(topic.title) +
      '</h4>' +
      '<p class="decoder-reader__count" data-decoder-count>Card 1 of ' +
      total +
      '</p>' +
      '</div>' +
      '</div>' +
      '<div class="decoder-carousel" data-decoder-carousel>' +
      '<div class="decoder-track" data-decoder-track>' +
      topic.cards.map(function (card, i) {
        return slideHtml(topic, card, i);
      }).join('') +
      '</div>' +
      '</div>' +
      '<div class="decoder-nav">' +
      '<button type="button" class="decoder-nav__btn" data-decoder-prev aria-label="Previous card">‹</button>' +
      '<div class="decoder-dots" data-decoder-dots>' +
      topic.cards
        .map(function (card, i) {
          return (
            '<button type="button" data-decoder-dot="' +
            i +
            '" aria-label="' +
            escapeHtml(card.title) +
            '"' +
            (i === 0 ? ' class="is-active"' : '') +
            '></button>'
          );
        })
        .join('') +
      '</div>' +
      '<button type="button" class="decoder-nav__btn" data-decoder-next aria-label="Next card">›</button>' +
      '</div>' +
      '<button type="button" class="decoder-back decoder-back--footer" data-decoder-back>← Back to Decoder Hub</button>' +
      '</div>';
    goTo(0, true);
    prefetchNeighbors();
  }

  function goTo(next, instant) {
    if (!activeTopic) return;
    var total = activeTopic.cards.length;
    index = Math.max(0, Math.min(total - 1, next));
    var track = root.querySelector('[data-decoder-track]');
    if (track) {
      if (instant) track.style.transition = 'none';
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      if (instant) {
        track.offsetHeight;
        track.style.transition = '';
      }
    }
    var count = root.querySelector('[data-decoder-count]');
    if (count) {
      count.textContent =
        'Card ' + (index + 1) + ' of ' + total + ' · ' + activeTopic.cards[index].title;
    }
    root.querySelectorAll('[data-decoder-dot]').forEach(function (dot) {
      dot.classList.toggle('is-active', Number(dot.getAttribute('data-decoder-dot')) === index);
    });
    var prev = root.querySelector('[data-decoder-prev]');
    var nextBtn = root.querySelector('[data-decoder-next]');
    if (prev) prev.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === total - 1;
    prefetchNeighbors();
  }

  function prefetchNeighbors() {
    if (!activeTopic) return;
    [index + 1, index - 1].forEach(function (i) {
      if (!activeTopic.cards[i]) return;
      var img = new Image();
      img.src = cardSrc(activeTopic.cards[i].file);
    });
  }

  function ensureLightbox() {
    if (lightbox) return lightbox;
    lightbox = document.createElement('dialog');
    lightbox.className = 'decoder-lightbox';
    lightbox.innerHTML =
      '<button type="button" class="thc-dialog-close decoder-lightbox__close" data-decoder-lightbox-close aria-label="Close">&times;</button>' +
      '<img alt="">';
    document.body.appendChild(lightbox);
    lightbox.querySelector('[data-decoder-lightbox-close]').addEventListener('click', function () {
      lightbox.close();
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) lightbox.close();
    });
    return lightbox;
  }

  function openZoom(src, alt) {
    var dialog = ensureLightbox();
    var img = dialog.querySelector('img');
    img.src = src;
    img.alt = alt || '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  function onClick(e) {
    var open = e.target.closest('[data-decoder-open]');
    if (open) {
      var topic = topicById(open.getAttribute('data-decoder-open'));
      if (topic) {
        renderReader(topic);
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    if (e.target.closest('[data-decoder-back]')) {
      renderShelf();
      root.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (e.target.closest('[data-decoder-prev]')) {
      goTo(index - 1);
      return;
    }
    if (e.target.closest('[data-decoder-next]')) {
      goTo(index + 1);
      return;
    }
    var dot = e.target.closest('[data-decoder-dot]');
    if (dot) {
      goTo(Number(dot.getAttribute('data-decoder-dot')));
      return;
    }
    var zoom = e.target.closest('[data-decoder-zoom]');
    if (zoom) openZoom(zoom.getAttribute('src'), zoom.getAttribute('alt'));
  }

  function onKey(e) {
    if (!activeTopic) return;
    if (!root.contains(document.activeElement) && !root.querySelector('[data-decoder-reader]')) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(index - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === 'Escape' && !lightbox) {
      renderShelf();
    }
  }

  function bindSwipe() {
    var startX = 0;
    var tracking = false;
    root.addEventListener('pointerdown', function (e) {
      if (!e.target.closest('[data-decoder-carousel]')) return;
      tracking = true;
      startX = e.clientX;
      swipeX = 0;
    });
    root.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - startX;
      if (dx > 50) goTo(index - 1);
      else if (dx < -50) goTo(index + 1);
      swipeX = null;
    });
    root.addEventListener('pointercancel', function () {
      tracking = false;
      swipeX = null;
    });
  }

  function wire() {
    root = document.getElementById(ROOT_ID);
    if (!root) return;
    renderShelf();
    root.addEventListener('click', onClick);
    document.addEventListener('keydown', onKey);
    bindSwipe();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
