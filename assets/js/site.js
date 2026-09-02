/* Oceana Dental - site behaviour. No dependencies. */
(function () {
  'use strict';

  /* ---- sticky header shadow ---- */
  var hdr = document.getElementById('hdr');
  if (hdr) {
    var onScroll = function () { hdr.classList.toggle('stuck', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ---- mobile drawer ---- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      drawer.hidden = open;
      drawer.classList.toggle('open', !open);
      document.body.classList.toggle('lock', !open);
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        drawer.hidden = true;
        drawer.classList.remove('open');
        document.body.classList.remove('lock');
      }
    });
  }

  /* ---- desktop dropdowns ---- */
  var dds = [].slice.call(document.querySelectorAll('.dd'));
  function closeAll(except) {
    dds.forEach(function (d) {
      if (d === except) return;
      d.querySelector('button').setAttribute('aria-expanded', 'false');
      d.querySelector('.dd-p').classList.remove('open');
    });
  }
  dds.forEach(function (d) {
    var btn = d.querySelector('button');
    var pan = d.querySelector('.dd-p');
    var t;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.getAttribute('aria-expanded') === 'true';
      closeAll(d);
      btn.setAttribute('aria-expanded', String(!open));
      pan.classList.toggle('open', !open);
    });
    d.addEventListener('mouseenter', function () {
      clearTimeout(t); closeAll(d);
      btn.setAttribute('aria-expanded', 'true'); pan.classList.add('open');
    });
    d.addEventListener('mouseleave', function () {
      t = setTimeout(function () {
        btn.setAttribute('aria-expanded', 'false'); pan.classList.remove('open');
      }, 140);
    });
  });
  document.addEventListener('click', function () { closeAll(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAll(null);
      if (drawer && drawer.classList.contains('open')) burger.click();
    }
  });

  /* ---- opening hours, read in Ottawa time so it is right for every visitor ---- */
  var HOURS = { 0: null, 1: [10, 19], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: null, 6: null };
  var DAYNAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function ottawaNow() {
    var p = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', weekday: 'short', hour: 'numeric',
      minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    var g = {};
    p.forEach(function (x) { g[x.type] = x.value; });
    var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g.weekday);
    return { day: wd, mins: parseInt(g.hour, 10) * 60 + parseInt(g.minute, 10) };
  }

  function pretty(h) {
    var hh = Math.floor(h), m = Math.round((h % 1) * 60);
    var ap = hh < 12 ? 'am' : 'pm';
    return (hh % 12 || 12) + ':' + (m < 10 ? '0' + m : m) + ' ' + ap;
  }

  var now = ottawaNow();

  /* highlight today in every hours list */
  [].forEach.call(document.querySelectorAll('.hours li'), function (li) {
    var d = parseInt(li.getAttribute('data-d'), 10);       // Mon = 0 in the markup
    if (((d + 1) % 7) === now.day) li.classList.add('today');
  });

  /* open / closed chip */
  var chip = document.getElementById('openchip');
  if (chip) {
    var t = HOURS[now.day], dot = chip.querySelector('.dot'), txt = chip.querySelector('.txt');
    if (t && now.mins >= t[0] * 60 && now.mins < t[1] * 60) {
      txt.textContent = 'Open now until ' + pretty(t[1]);
    } else {
      dot.classList.add('off');
      var d = now.day, hops = 0, nxt = null;
      while (hops < 8) {
        d = (d + 1) % 7; hops++;
        if (HOURS[d]) { nxt = d; break; }
      }
      if (t && now.mins < t[0] * 60) {
        txt.textContent = 'Opens today at ' + pretty(t[0]);
        dot.classList.remove('off');
      } else if (nxt !== null) {
        var label = hops === 1 ? 'tomorrow' : DAYNAMES[nxt];
        txt.textContent = 'Opens ' + label + ' at ' + pretty(HOURS[nxt][0]);
      } else {
        txt.textContent = 'Closed right now';
      }
    }
  }

  /* ---- reveal on scroll ---- */
  var rv = document.querySelectorAll('.rv');
  if (rv.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    [].forEach.call(rv, function (el) { io.observe(el); });
  } else {
    [].forEach.call(rv, function (el) { el.classList.add('in'); });
  }
})();
