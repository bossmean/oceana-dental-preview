/* Oceana Dental - appointment request flow. No dependencies. */
(function () {
  'use strict';

  var form = document.getElementById('bkform');
  if (!form) return;

  var ENDPOINT = form.getAttribute('data-endpoint') || '';
  var TZ = 'America/Toronto';

  /* Mon..Sun keyed by JS getDay (0 = Sunday). [open, close] in 24h hours. */
  var HOURS = { 0: null, 1: [10, 19], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: null, 6: null };
  var VISIT_H = 1.5;                       /* we hold this much time, so the last start backs off */
  var HORIZON = 120;                       /* days ahead you can request */

  var MON = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var DOWFULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  var state = { step: 1, who: 'New patient', reason: '', reasonKey: '', date: null, time: '' };

  /* ---------- date helpers, all in Ottawa local terms ---------- */
  function todayOttawa() {
    var p = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date()).split('-');
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }
  var TODAY = todayOttawa();
  var MINDATE = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + 1);
  var MAXDATE = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + HORIZON);
  var view = new Date(MINDATE.getFullYear(), MINDATE.getMonth(), 1);

  function sameDay(a, b) {
    return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function isOpen(d) { return !!HOURS[d.getDay()]; }
  function inRange(d) { return d >= MINDATE && d <= MAXDATE; }
  function prettyHour(h) {
    var hh = Math.floor(h), m = Math.round((h % 1) * 60);
    return (hh % 12 || 12) + ':' + (m < 10 ? '0' + m : m) + ' ' + (hh < 12 ? 'am' : 'pm');
  }
  function prettyDate(d) {
    return DOWFULL[d.getDay()] + ' ' + d.getDate() + ' ' + MON[d.getMonth()];
  }

  /* ---------- calendar ---------- */
  var cal = document.getElementById('cal');
  var calMonth = document.getElementById('calmonth');
  var prevBtn = document.getElementById('calprev');
  var nextBtn = document.getElementById('calnext');
  var slotWrap = document.getElementById('slotwrap');
  var slotsEl = document.getElementById('slots');
  var slotHead = document.getElementById('slothead');
  var calHint = document.getElementById('calhint');

  function drawCal() {
    calMonth.textContent = MON[view.getMonth()] + ' ' + view.getFullYear();
    var html = DOW.map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
    var first = new Date(view.getFullYear(), view.getMonth(), 1);
    var lead = first.getDay();
    var last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (var i = 0; i < lead; i++) html += '<div class="day empty" aria-hidden="true"></div>';
    for (var day = 1; day <= last; day++) {
      var d = new Date(view.getFullYear(), view.getMonth(), day);
      var ok = isOpen(d) && inRange(d);
      var sel = sameDay(d, state.date) ? ' sel' : '';
      html += '<button type="button" class="day' + sel + '" data-day="' + day + '"' +
              (ok ? '' : ' disabled') +
              ' aria-label="' + prettyDate(d) + (ok ? '' : ', not available') + '">' +
              day + (ok ? '<em>open</em>' : '') + '</button>';
    }
    cal.innerHTML = html;

    var firstOfView = new Date(view.getFullYear(), view.getMonth(), 1);
    var lastOfView = new Date(view.getFullYear(), view.getMonth() + 1, 0);
    prevBtn.disabled = firstOfView <= new Date(MINDATE.getFullYear(), MINDATE.getMonth(), 1);
    nextBtn.disabled = lastOfView >= MAXDATE;

    [].forEach.call(cal.querySelectorAll('.day:not(.empty):not(:disabled)'), function (b) {
      b.addEventListener('click', function () {
        state.date = new Date(view.getFullYear(), view.getMonth(), +b.getAttribute('data-day'));
        state.time = '';
        drawCal();
        drawSlots();
        summary();
      });
    });
  }

  function drawSlots() {
    if (!state.date) { slotWrap.hidden = true; calHint.hidden = false; return; }
    var h = HOURS[state.date.getDay()];
    var open = h[0], close = h[1] - VISIT_H;
    var groups = [['Morning', []], ['Afternoon', []], ['Evening', []]];
    for (var t = open; t <= close + 0.001; t += 0.5) {
      var g = t < 12 ? 0 : (t < 16 ? 1 : 2);
      groups[g][1].push(t);
    }
    var html = '';
    groups.forEach(function (g) {
      if (!g[1].length) return;
      html += '<div class="slot-h" style="grid-column:1/-1">' + g[0] + '</div>';
      g[1].forEach(function (t) {
        var lab = prettyHour(t);
        html += '<button type="button" class="slot' + (state.time === lab ? ' sel' : '') +
                '" data-t="' + lab + '">' + lab + '</button>';
      });
    });
    slotsEl.innerHTML = html;
    slotsEl.style.display = 'grid';
    slotHead.textContent = 'Times on ' + prettyDate(state.date);
    slotWrap.hidden = false;
    calHint.hidden = true;
    [].forEach.call(slotsEl.querySelectorAll('.slot'), function (b) {
      b.addEventListener('click', function () {
        state.time = b.getAttribute('data-t');
        drawSlots();
        summary();
      });
    });
  }

  prevBtn.addEventListener('click', function () { view.setMonth(view.getMonth() - 1); drawCal(); });
  nextBtn.addEventListener('click', function () { view.setMonth(view.getMonth() + 1); drawCal(); });
  drawCal();

  /* ---------- summary rail ---------- */
  function setDD(id, val, placeholder) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = val || placeholder;
    el.classList.toggle('empty', !val);
  }
  function whenText() {
    if (!state.date) return '';
    return prettyDate(state.date) + (state.time ? ', ' + state.time : '');
  }
  function summary() {
    setDD('s-who', state.who, 'New patient');
    setDD('s-reason', state.reason, 'Not chosen yet');
    setDD('s-when', whenText(), 'Not chosen yet');
  }

  form.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'who' || t.name === 'forwho') {
      var who = form.querySelector('[name=who]:checked');
      var fw = form.querySelector('[name=forwho]:checked');
      state.who = (who ? who.getAttribute('data-label') : '') +
                  (fw && fw.value === 'family' ? ', for a family member' : '');
    }
    if (t.name === 'reason') {
      state.reason = t.getAttribute('data-label');
      state.reasonKey = t.value;
      hideErr('err2');
    }
    summary();
  });
  summary();

  /* ---------- step machine ---------- */
  function showStep(n) {
    state.step = n;
    [].forEach.call(form.querySelectorAll('.bk-step'), function (s) {
      s.classList.toggle('on', +s.getAttribute('data-step') === n);
    });
    [].forEach.call(document.querySelectorAll('.prog-s'), function (s) {
      var i = +s.getAttribute('data-s');
      s.classList.toggle('on', i === n);
      s.classList.toggle('done', i < n);
    });
    var prog = document.getElementById('prog');
    if (prog) prog.style.display = n >= 5 ? 'none' : '';
    var top = form.getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: top, behavior: 'smooth' });
    var h = form.querySelector('.bk-step.on h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }); }
  }
  function showErr(id) { var e = document.getElementById(id); if (e) e.classList.add('on'); }
  function hideErr(id) { var e = document.getElementById(id); if (e) e.classList.remove('on'); }

  function validate(n) {
    if (n === 2) {
      if (!state.reasonKey) { showErr('err2'); return false; }
      hideErr('err2'); return true;
    }
    if (n === 3) {
      if (!state.date || !state.time) { showErr('err3'); return false; }
      hideErr('err3'); return true;
    }
    return true;
  }

  [].forEach.call(form.querySelectorAll('[data-next]'), function (b) {
    b.addEventListener('click', function () {
      if (!validate(state.step)) return;
      showStep(state.step + 1);
    });
  });
  [].forEach.call(form.querySelectorAll('[data-back]'), function (b) {
    b.addEventListener('click', function () { showStep(Math.max(1, state.step - 1)); });
  });

  /* ---------- final validation and submit ---------- */
  var REQ = ['fn', 'ln', 'ph', 'em'];
  function fieldBad(el, bad) {
    el.setAttribute('aria-invalid', bad ? 'true' : 'false');
    el.closest('.f').classList.toggle('bad', bad);
  }
  REQ.forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () { if (el.value.trim()) fieldBad(el, false); });
    el.addEventListener('input', function () { if (el.value.trim()) fieldBad(el, false); });
  });

  function validDetails() {
    var ok = true, firstBad = null;
    REQ.forEach(function (id) {
      var el = document.getElementById(id);
      var v = el.value.trim();
      var bad = !v;
      if (id === 'em' && v) bad = !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      if (id === 'ph' && v) bad = (v.replace(/\D/g, '').length < 10);
      fieldBad(el, bad);
      if (bad) { ok = false; firstBad = firstBad || el; }
    });
    var c = document.getElementById('consent');
    var cw = document.getElementById('consentwrap');
    cw.classList.toggle('bad', !c.checked);
    if (!c.checked) { ok = false; firstBad = firstBad || c; }
    if (!ok) { showErr('err4'); if (firstBad) firstBad.focus(); } else { hideErr('err4'); }
    return ok;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validDetails()) return;

    var btn = document.getElementById('submitbtn');
    btn.disabled = true;
    var original = btn.innerHTML;
    btn.textContent = 'Sending...';

    var payload = {
      patient_type: state.who,
      reason: state.reason,
      preferred_date: state.date ? state.date.toISOString().slice(0, 10) : '',
      preferred_date_text: prettyDate(state.date),
      preferred_time: state.time,
      first_name: document.getElementById('fn').value.trim(),
      last_name: document.getElementById('ln').value.trim(),
      phone: document.getElementById('ph').value.trim(),
      email: document.getElementById('em').value.trim(),
      coverage: document.getElementById('ins').value,
      notes: document.getElementById('msg').value.trim(),
      source: 'oceanadental.ca booking page'
    };

    function done() {
      document.getElementById('dn-reason').textContent = payload.reason;
      document.getElementById('dn-when').textContent = payload.preferred_date_text + ', ' + payload.preferred_time;
      document.getElementById('dn-name').textContent = payload.first_name + ' ' + payload.last_name;
      document.getElementById('dn-phone').textContent = payload.phone;
      showStep(5);
      btn.disabled = false;
      btn.innerHTML = original;
    }

    if (!ENDPOINT) {
      /* Preview build. Nothing is sent anywhere until a real endpoint is wired in. */
      console.warn('[booking] no endpoint configured, request not sent:', payload);
      var warn = document.querySelector('[data-step="5"] .done-c');
      if (warn && !warn.querySelector('.preview-note')) {
        var n = document.createElement('div');
        n.className = 'note warn preview-note';
        n.style.textAlign = 'left';
        n.innerHTML = '<b>Preview build.</b> This form is not connected to a mailbox yet, so ' +
          'nothing was actually sent. Wire up the form endpoint in build.py before this page goes live.';
        warn.appendChild(n);
      }
      done();
      return;
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('bad response ' + r.status);
      done();
    }).catch(function () {
      btn.disabled = false;
      btn.innerHTML = original;
      var e4 = document.getElementById('err4');
      e4.textContent = 'Something went wrong sending that. Please call us on (613) 699-1626 and we will book you in.';
      e4.classList.add('on');
    });
  });
})();
