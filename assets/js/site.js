/* ==========================================================================
   Oceana Dental
   No animation library and no smooth-scroll engine. Both were considered and
   rejected: this is a clinic page where people arrive in pain looking for a
   phone number, and 70KB of GSAP plus hijacked scrolling buys nothing that a
   class toggle and two IntersectionObservers do not already do. One
   orchestrated moment on load, the plate annotating itself, and nothing else
   moves unless a person asks it to.
   ========================================================================== */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- container guides ---------- */
  (function guides() {
    var host = document.getElementById('guides');
    if (!host) return;
    var draw = function () {
      var probe = document.querySelector('.wrap');
      if (!probe) return;
      var r = probe.getBoundingClientRect();
      var pad = parseFloat(getComputedStyle(probe).paddingLeft) || 0;
      host.innerHTML = '<i style="left:' + Math.round(r.left + pad) + 'px"></i>' +
                       '<i style="left:' + Math.round(r.right - pad) + 'px"></i>';
    };
    draw();
    window.addEventListener('resize', draw, { passive: true });
  })();

  /* ---------- header ---------- */
  var burger = document.getElementById('burger');
  var drawer = document.getElementById('drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      drawer.classList.toggle('open', !open);
      document.body.classList.toggle('lock', !open);
    });
    drawer.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        burger.setAttribute('aria-expanded', 'false');
        drawer.classList.remove('open');
        document.body.classList.remove('lock');
      }
    });
  }

  var dds = [].slice.call(document.querySelectorAll('.dd'));
  function closeAll(except) {
    dds.forEach(function (d) {
      if (d === except) return;
      d.querySelector('button').setAttribute('aria-expanded', 'false');
      d.querySelector('.dd-p').classList.remove('open');
    });
  }
  dds.forEach(function (d) {
    var btn = d.querySelector('button'), pan = d.querySelector('.dd-p'), t, byHover = false;
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = btn.getAttribute('aria-expanded') === 'true' && !byHover;
      closeAll(d); byHover = false;
      btn.setAttribute('aria-expanded', String(!open));
      pan.classList.toggle('open', !open);
    });
    d.addEventListener('mouseenter', function () {
      clearTimeout(t); closeAll(d); byHover = true;
      btn.setAttribute('aria-expanded', 'true'); pan.classList.add('open');
    });
    d.addEventListener('mouseleave', function () {
      t = setTimeout(function () {
        byHover = false;
        btn.setAttribute('aria-expanded', 'false'); pan.classList.remove('open');
      }, 150);
    });
    d.addEventListener('focusout', function (e) {
      if (!d.contains(e.relatedTarget)) {
        byHover = false;
        btn.setAttribute('aria-expanded', 'false'); pan.classList.remove('open');
      }
    });
  });
  document.addEventListener('click', function () { closeAll(null); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeAll(null);
    if (drawer && drawer.classList.contains('open')) burger.click();
  });

  /* ---------- opening hours, read in Ottawa time ---------- */
  var HOURS = { 0: null, 1: [10, 19], 2: [8, 17], 3: [8, 17], 4: [8, 17], 5: null, 6: null };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function ottawaNow() {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
    }).formatToParts(new Date());
    var g = {}; parts.forEach(function (p) { g[p.type] = p.value; });
    return {
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(g.weekday),
      mins: parseInt(g.hour, 10) * 60 + parseInt(g.minute, 10)
    };
  }
  function pretty(h) {
    var hh = Math.floor(h), m = Math.round((h % 1) * 60);
    return (hh % 12 || 12) + ':' + (m < 10 ? '0' + m : m) + ' ' + (hh < 12 ? 'am' : 'pm');
  }
  var now = ottawaNow();
  [].forEach.call(document.querySelectorAll('.hours li'), function (li) {
    if (((parseInt(li.getAttribute('data-d'), 10) + 1) % 7) === now.day) li.classList.add('today');
  });
  var chip = document.getElementById('openchip');
  if (chip) {
    var t = HOURS[now.day], dot = chip.querySelector('.dot'), txt = chip.querySelector('.txt');
    if (t && now.mins >= t[0] * 60 && now.mins < t[1] * 60) {
      txt.textContent = 'Open now until ' + pretty(t[1]);
    } else if (t && now.mins < t[0] * 60) {
      txt.textContent = 'Opens today at ' + pretty(t[0]);
    } else {
      dot.classList.add('off');
      var d = now.day, hops = 0, nxt = null;
      while (hops < 8) { d = (d + 1) % 7; hops++; if (HOURS[d]) { nxt = d; break; } }
      txt.textContent = nxt === null ? 'Closed'
        : 'Opens ' + (hops === 1 ? 'tomorrow' : DAYS[nxt]) + ' at ' + pretty(HOURS[nxt][0]);
    }
  }

  /* ---------- the one orchestrated moment: the plate annotates itself ----------
     Lines are held back by CSS only while <html data-intro> is set, and that
     attribute is written by script, so with JavaScript off nothing is hidden. */
  function runIntro() {
    var root = document.documentElement;
    if (!root.hasAttribute('data-intro')) return;
    if (reduce) { root.removeAttribute('data-intro'); return; }

    var lines = [].slice.call(document.querySelectorAll('.hero .mask > span'));
    var fades = [].slice.call(document.querySelectorAll('.hero .fade'));
    var strokes = [].slice.call(document.querySelectorAll('.hero .annot .ln'));
    var marks = [].slice.call(document.querySelectorAll('.hero .annot .pt, .hero .cal'));

    strokes.forEach(function (s) {
      var len = 0;
      try { len = s.getTotalLength(); } catch (e) { len = 400; }
      s.style.strokeDasharray = len;
      s.style.strokeDashoffset = len;
    });
    marks.forEach(function (m) { m.style.opacity = 0; });

    root.removeAttribute('data-intro');

    lines.forEach(function (el, i) {
      el.style.transition = 'transform .92s cubic-bezier(.19,.85,.24,1) ' + (0.06 + i * 0.085) + 's';
      el.style.transform = 'translateY(0)';
    });
    fades.forEach(function (el, i) {
      el.style.transition = 'opacity .8s ease ' + (0.34 + i * 0.09) + 's';
      el.style.opacity = 1;
    });
    strokes.forEach(function (s, i) {
      s.style.transition = 'stroke-dashoffset 1.05s cubic-bezier(.32,.72,.26,1) ' + (0.55 + i * 0.13) + 's';
      s.style.strokeDashoffset = 0;
    });
    marks.forEach(function (m, i) {
      m.style.transition = 'opacity .55s ease ' + (0.95 + Math.floor(i / 2) * 0.13) + 's';
      m.style.opacity = 1;
    });
  }
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(runIntro);
    setTimeout(runIntro, 900);
  } else {
    window.addEventListener('load', runIntro);
  }

  /* ---------- masked heading reveal, used on two headings only ---------- */
  var reveals = document.querySelectorAll('[data-reveal] .mask > span');
  if (reveals.length && !reduce && 'IntersectionObserver' in window) {
    [].forEach.call(reveals, function (el) { el.style.transform = 'translateY(102%)'; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        [].forEach.call(e.target.querySelectorAll('.mask > span'), function (el, i) {
          el.style.transition = 'transform .9s cubic-bezier(.19,.85,.24,1) ' + (i * 0.08) + 's';
          el.style.transform = 'translateY(0)';
        });
      });
    }, { threshold: 0.25 });
    [].forEach.call(document.querySelectorAll('[data-reveal]'), function (h) { io.observe(h); });
  }

  /* ---------- symptom finder ---------- */
  var finder = document.getElementById('finder');
  if (finder) {
    var panel = document.getElementById('fnd-panel');
    var idle = panel.innerHTML;
    var btns = [].slice.call(finder.querySelectorAll('.fnd-b'));
    var DATA = JSON.parse(document.getElementById('finder-data').textContent);
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var already = b.getAttribute('aria-pressed') === 'true';
        btns.forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        if (already) { panel.innerHTML = idle; return; }
        b.setAttribute('aria-pressed', 'true');
        var d = DATA[b.getAttribute('data-k')];
        panel.innerHTML =
          '<div class="fnd-body"><span class="k">' + d.k + '</span><h3>' + d.h + '</h3>' +
          '<p>' + d.p + '</p>' +
          '<div class="why"><b>What we would do</b><p>' + d.w + '</p></div>' +
          '<div class="fnd-acts"><a class="btn btn-d" href="' + d.href + '">' + d.cta + '</a>' +
          '<a class="btn btn-c" href="book.html">Book an appointment</a></div></div>';
      });
    });
  }

  /* ---------- technology tabs ---------- */
  var tlist = document.getElementById('tlist');
  if (tlist) {
    var tp = document.getElementById('tpanel');
    var TECH = JSON.parse(document.getElementById('tech-data').textContent);
    var tb = [].slice.call(tlist.querySelectorAll('button'));
    var paint = function (k) {
      var d = TECH[k];
      tp.innerHTML = '<div class="tpanel-i"><img src="' + d.img + '" alt="" loading="lazy"></div>' +
        '<div class="tpanel-t"><b>' + d.b + '</b><p>' + d.p + '</p>' +
        '<div class="why">' + d.w + '</div></div>';
    };
    tb.forEach(function (b, i) {
      b.addEventListener('click', function () {
        tb.forEach(function (x) { x.setAttribute('aria-selected', 'false'); });
        b.setAttribute('aria-selected', 'true');
        paint(b.getAttribute('data-k'));
      });
      b.addEventListener('keydown', function (e) {
        var j = -1;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') j = (i + 1) % tb.length;
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') j = (i - 1 + tb.length) % tb.length;
        if (j < 0) return;
        e.preventDefault(); tb[j].focus(); tb[j].click();
      });
    });
    paint(tb[0].getAttribute('data-k'));
    tb[0].setAttribute('aria-selected', 'true');
  }
})();
