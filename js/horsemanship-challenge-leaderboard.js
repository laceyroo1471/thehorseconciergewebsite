/**
 * Horsemanship Challenge leaderboards.
 *
 * Mounts:
 *   [data-challenge-board="overall"]  — grand prize top 20 (Prize Hub)
 *   [data-challenge-board="week"]     — that week’s prize race (week hubs)
 *   [data-week-winner="1"]            — finalized weekly winner on Prize Hub cards
 *
 * Names are first name + last initial only.
 */
(function () {
  var CHALLENGE_ID = 'horsemanship-2026';
  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  var firebaseConfig = {
    apiKey: 'AIzaSyCpSLt4otffRYi3PUDrr_HvTXZrEtOeUzY',
    authDomain: 'thc-native.firebaseapp.com',
    projectId: 'thc-native',
    storageBucket: 'thc-native.firebasestorage.app',
    messagingSenderId: '542948479136',
    appId: '1:542948479136:web:80f6bb4ae1740a3a8439c5',
  };

  if (typeof firebase === 'undefined') return;
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

  var auth = firebase.auth();
  var db = firebase.firestore();
  var latestBoard = null;
  var latestUser = null;
  var latestRegistration = null;

  function parseYmd(ymd) {
    var parts = String(ymd || '').split('-');
    if (parts.length !== 3) return null;
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  function prettyDate(ymd) {
    var d = parseYmd(ymd);
    if (!d) return '';
    return MONTHS[d.getMonth()] + ' ' + d.getDate();
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function publicName(name) {
    var parts = String(name || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!parts.length) return '';
    if (parts.length === 1) return parts[0];
    var initial = parts[parts.length - 1].charAt(0).toUpperCase();
    return /[A-Z]/.test(initial) ? parts[0] + ' ' + initial + '.' : parts[0];
  }

  function isYou(row) {
    if (!row) return false;
    if (latestUser && row.userId && row.userId === latestUser.uid) return true;
    var mine = publicName(latestRegistration && latestRegistration.name);
    return !!(mine && row.displayName && row.displayName === mine);
  }

  function renderList(listEl, rows) {
    if (!listEl) return;
    listEl.innerHTML = '';
    (rows || []).forEach(function (row) {
      var li = document.createElement('li');
      li.className = 'challenge-board__row';
      if (isYou(row)) li.classList.add('challenge-board__row--you');
      li.innerHTML =
        '<span class="challenge-board__rank">' +
        (row.rank || '') +
        '</span><span class="challenge-board__name">' +
        (escapeHtml(row.displayName || 'Participant')) +
        (isYou(row) ? ' <em>you</em>' : '') +
        '</span><span class="challenge-board__pts">' +
        (Number(row.points) || 0) +
        '</span>';
      listEl.appendChild(li);
    });
  }

  function yourRow(rows, myPoints, kind) {
    if (!latestUser) return '';
    var found = (rows || []).filter(isYou)[0];
    if (found) {
      return 'You’re #' + found.rank + ' with ' + found.points + ' pts.';
    }
    if (myPoints > 0) {
      return kind === 'week'
        ? 'You’re on the board with ' + myPoints + ' pts — keep going for a top-5 spot.'
        : 'You’re on the board with ' + myPoints + ' pts — keep going for a top-20 spot.';
    }
    return '';
  }

  function drawBoards() {
    var board = latestBoard;
    document.querySelectorAll('[data-challenge-board]').forEach(function (root) {
      var kind = root.getAttribute('data-challenge-board');
      var listEl = root.querySelector('[data-board-list]');
      var noteEl = root.querySelector('[data-board-note]');
      var youEl = root.querySelector('[data-board-you]');
      var emptyEl = root.querySelector('[data-board-empty]');
      var rows = [];
      var displayRows = [];
      var myPoints = 0;

      if (kind === 'overall') {
        rows = (board && board.overallTop) || [];
        displayRows = rows;
        myPoints = Number(latestRegistration && latestRegistration.pointsTotal) || 0;
        if (noteEl) {
          noteEl.textContent =
            'Top 20 for first, second, and third place in the grand prize pool. Names show first name and last initial.';
        }
      } else if (kind === 'week') {
        var weekNum = String(root.getAttribute('data-week') || '');
        var week = board && board.weeks && board.weeks[weekNum];
        rows = (week && week.standings) || [];
        displayRows = rows.slice(0, 5);
        var weekly = (latestRegistration && latestRegistration.weeklyPoints) || {};
        myPoints = Number(weekly[weekNum] || weekly[Number(weekNum)] || 0);
        if (noteEl) {
          if (week && week.locked && week.winner) {
            noteEl.textContent =
              'Winner locked: ' +
              week.winner.displayName +
              ' · This week’s prize standings are final.';
          } else if (week && week.lockAt) {
            noteEl.textContent =
              'Top 5 for this week’s prize. Winner announced Wednesday, ' +
              prettyDate(week.lockAt) +
              '.';
          } else {
            noteEl.textContent = 'Top 5 for this week’s prize. Winner announced next Wednesday.';
          }
        }
      }

      renderList(listEl, displayRows);
      if (emptyEl) emptyEl.hidden = rows.length > 0;
      if (youEl) {
        var line = yourRow(rows, myPoints, kind);
        youEl.hidden = !line;
        youEl.textContent = line;
      }
    });

    document.querySelectorAll('[data-week-winner]').forEach(function (el) {
      var weekNum = String(el.getAttribute('data-week-winner') || '');
      var week = latestBoard && latestBoard.weeks && latestBoard.weeks[weekNum];
      if (!week) {
        el.hidden = true;
        return;
      }
      if (week.locked && week.winner && week.winner.displayName) {
        el.hidden = false;
        el.textContent = 'Winner: ' + week.winner.displayName;
        el.classList.add('prize-week-card__winner--final');
        return;
      }
      el.classList.remove('prize-week-card__winner--final');
      if (week.lockAt) {
        el.hidden = false;
        el.textContent = 'Winner announced Wednesday, ' + prettyDate(week.lockAt);
      } else {
        el.hidden = true;
      }
    });
  }

  function applyBoardSnap(snap) {
    if (!snap || !snap.exists) return;
    latestBoard = snap.data() || null;
    drawBoards();
  }

  function listenBoard() {
    db.collection('challengeLeaderboards')
      .doc(CHALLENGE_ID)
      .onSnapshot(applyBoardSnap, function () {
        db.collection('metadata')
          .doc(CHALLENGE_ID + '-leaderboard')
          .onSnapshot(applyBoardSnap, function (err) {
            console.warn('Challenge leaderboard unavailable', err);
          });
      });
  }

  function listenRegistration(user) {
    latestUser = user || null;
    if (!user) {
      latestRegistration = null;
      drawBoards();
      return;
    }
    db.collection('challengeRegistrations')
      .doc(user.uid)
      .onSnapshot(function (snap) {
        latestRegistration = snap.exists ? snap.data() || null : null;
        if (latestRegistration && latestRegistration.status === 'inactive') {
          latestRegistration = null;
        }
        drawBoards();
      });
  }

  listenBoard();
  auth.onAuthStateChanged(listenRegistration);
})();
