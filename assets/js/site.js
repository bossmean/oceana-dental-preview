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
    var t, byHover = false;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      // If hover already opened it, a click should keep it open rather than
      // snapping it shut under the pointer.
      var open = btn.getAttribute('aria-expanded') === 'true' && !byHover;
      closeAll(d);
      byHover = false;
      btn.setAttribute('aria-expanded', String(!open));
      pan.classList.toggle('open', !open);
    });
    d.addEventListener('mouseenter', function () {
      clearTimeout(t); closeAll(d);
      byHover = true;
      btn.setAttribute('aria-expanded', 'true'); pan.classList.add('open');
    });
    d.addEventListener('mouseleave', function () {
      t = setTimeout(function () {
        byHover = false;
        btn.setAttribute('aria-expanded', 'false'); pan.classList.remove('open');
      }, 140);
    });
    // keyboard: leaving the group closes it
    d.addEventListener('focusout', function (e) {
      if (!d.contains(e.relatedTarget)) {
        byHover = false;
        btn.setAttribute('aria-expanded', 'false'); pan.classList.remove('open');
      }
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

/* ==========================================================================
   V2: motion, parallax, symptom finder, technology tabs
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- auto apply reveal classes, so every page moves the same way ----
     Done in JS on purpose: with JS off nothing is ever hidden. */
  var AUTO_RV = '.sec-head, .prose, .pillar, .note, .band-q, .rev-feat, .rev-top, .loc, .faq, ' +
                '.tshow, .fnd, .bk-alert, .done-c, aside > .card, aside > .sum';
  var AUTO_RVS = '.grid, .docs, .pay, .steps, .svc-g, .revs, .intent-g, .stats, .fnd-opts, .tech';
  [].forEach.call(document.querySelectorAll(AUTO_RV), function (el) {
    if (!el.classList.contains('rv') && !el.classList.contains('rv-s')) el.classList.add('rv');
  });
  [].forEach.call(document.querySelectorAll(AUTO_RVS), function (el) {
    if (!el.classList.contains('rv') && !el.classList.contains('rv-s')) el.classList.add('rv-s');
  });

  /* ---- reveal on scroll, including staggered groups ---- */
  var targets = document.querySelectorAll('.rv, .rv-s');
  if (targets.length) {
    if (!('IntersectionObserver' in window) || reduce) {
      [].forEach.call(targets, function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
      [].forEach.call(targets, function (el) { io.observe(el); });
    }
  }

  /* ---- parallax: hero background and full bleed bands ---- */
  if (!reduce) {
    var layers = [];
    var heroBg = document.querySelector('.hero');
    if (heroBg) layers.push({ el: heroBg, speed: 0.16, prop: 'hero' });
    [].forEach.call(document.querySelectorAll('.band'), function (b) {
      layers.push({ el: b, speed: 0.13, prop: 'band' });
    });

    if (layers.length) {
      var ticking = false;
      var apply = function () {
        var vh = window.innerHeight;
        layers.forEach(function (l) {
          var r = l.el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var mid = r.top + r.height / 2;
          var off = (mid - vh / 2) * l.speed;
          l.el.style.setProperty('--par', (-off).toFixed(1) + 'px');
        });
        ticking = false;
      };
      var onScroll = function () {
        if (!ticking) { ticking = true; requestAnimationFrame(apply); }
      };
      apply();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      document.documentElement.classList.add('par-on');
    }
  }

  /* ---- counters ---- */
  var nums = document.querySelectorAll('[data-count]');
  if (nums.length && 'IntersectionObserver' in window && !reduce) {
    var nio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        nio.unobserve(e.target);
        var el = e.target;
        var end = parseFloat(el.getAttribute('data-count'));
        var dec = (el.getAttribute('data-dec') === '1') ? 1 : 0;
        var t0 = null, dur = 1150;
        var step = function (t) {
          if (!t0) t0 = t;
          var p = Math.min((t - t0) / dur, 1);
          var e2 = 1 - Math.pow(1 - p, 3);
          el.textContent = (end * e2).toFixed(dec);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    [].forEach.call(nums, function (n) { nio.observe(n); });
  }

  /* ---- symptom finder ---- */
  var finder = document.getElementById('finder');
  if (finder) {
    var panel = document.getElementById('fnd-panel');
    var idle = panel.innerHTML;
    var btns = [].slice.call(finder.querySelectorAll('.fnd-b'));
    var DATA = JSON.parse(document.getElementById('finder-data').textContent);

    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-k');
        var already = b.getAttribute('aria-pressed') === 'true';
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        if (already) { panel.innerHTML = idle; return; }
        b.setAttribute('aria-pressed', 'true');
        var d = DATA[k];
        panel.innerHTML =
          '<div class="fnd-body">' +
          '<span class="k">' + d.k + '</span>' +
          '<h3>' + d.h + '</h3>' +
          '<p>' + d.p + '</p>' +
          '<div class="why"><b>What we would do</b><p>' + d.w + '</p></div>' +
          '<div class="fnd-acts">' +
          '<a class="btn btn-p" href="' + d.href + '">' + d.cta + '</a>' +
          '<a class="btn btn-ol" href="book.html">Book an appointment</a>' +
          '</div></div>';
      });
    });
  }

  /* ---- technology tabs ---- */
  var tlist = document.getElementById('tlist');
  if (tlist) {
    var tp = document.getElementById('tpanel');
    var TECH = JSON.parse(document.getElementById('tech-data').textContent);
    var tbtns = [].slice.call(tlist.querySelectorAll('button'));
    var paint = function (k) {
      var d = TECH[k];
      tp.innerHTML =
        '<div class="tpanel-img" style="background-image:url(' + d.img + ')"></div>' +
        '<div class="tpanel-t"><b>' + d.b + '</b><p>' + d.p + '</p>' +
        '<div class="why">' + d.w + '</div></div>';
    };
    tbtns.forEach(function (b) {
      b.addEventListener('click', function () {
        tbtns.forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        paint(b.getAttribute('data-k'));
      });
      b.addEventListener('keydown', function (e) {
        var i = tbtns.indexOf(b);
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          e.preventDefault(); tbtns[(i + 1) % tbtns.length].focus(); tbtns[(i + 1) % tbtns.length].click();
        }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          e.preventDefault();
          var j = (i - 1 + tbtns.length) % tbtns.length;
          tbtns[j].focus(); tbtns[j].click();
        }
      });
    });
    paint(tbtns[0].getAttribute('data-k'));
    tbtns[0].setAttribute('aria-selected', 'true');
  }
})();
