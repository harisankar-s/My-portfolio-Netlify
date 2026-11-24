// Shared "space" effects for the apex pages (hub: src/home.njk, CV: src/index.html).
// The hub's live pipeline panel is pure CSS (.hub-steps in portfolio.css).
// Everything is optional: each block only runs if its elements are on the page.
//   #nav / #hero / #progress   nav state + scroll progress bar
//   .hub-sky                   dimming below the hero
//   [data-sky]                 gold comets (canvas); also drifting stars when
//                              galaxy.js's 3D sky (canvas[data-galaxy]) isn't running
//   [data-sparkles] / [data-decode]   sparkles, decoding labels
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };

  // ---- Nav state, scroll progress bar, sky parallax + dimming ------------
  var nav = document.getElementById('nav');
  var hero = document.getElementById('hero');
  var bar = document.getElementById('progress');
  var sky = document.querySelector('.hub-sky');
  var skyWarp = 0; // 0→1 through the hero; speeds up the star drift
  function onScroll() {
    var y = window.scrollY;
    if (nav) {
      nav.classList.toggle('scrolled', y > 12);
      if (hero) nav.classList.toggle('on-hero', y < hero.offsetHeight - nav.offsetHeight);
    }
    if (sky && hero) {
      // dim the sky once the hero has scrolled away, so glass cards stay legible
      var past = clamp((y - (hero.offsetHeight - window.innerHeight)) / (window.innerHeight * 0.8));
      sky.style.setProperty('--sky-dim', past.toFixed(3));
    }
    if (hero) skyWarp = clamp(y / Math.max(window.innerHeight, hero.offsetHeight - window.innerHeight));
    if (bar) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // ---- Night sky: black canvas, stars drifting toward you, comets ---------
  // Stars live in 3D (x, y, depth z): z shrinks slowly so they spread out from
  // the centre like a very slow flight through space; skyWarp (scrolling the
  // hero) speeds that up. A golden comet streaks across every few seconds
  // (white-hot head, gold to amber tail, soft glow); now and then a slower,
  // bigger one that sheds golden sparks. A few stars are warm gold too.
  // Reduced motion gets one still frame.
  document.querySelectorAll('[data-sky]').forEach(function (cv) {
    var c = cv.getContext('2d'), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0, stars = [], comets = [], dust = [], nextComet = 2500, last = 0, visible = true;
    var STAR_TINT = ['255,255,255', '205,225,255', '255,232,186']; // white, icy blue, warm gold
    // when galaxy.js has the 3D sky running underneath, this canvas only draws comets
    var gal = cv.parentElement.querySelector('canvas[data-galaxy]');
    function star(far) {
      return { x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, z: far ? 1 : 0.12 + Math.random() * 0.88,
        b: Math.random(), tw: Math.random() * 6.283, ts: 0.6 + Math.random() * 1.8, tint: Math.random() < 0.1 ? 1 : Math.random() < 0.1 ? 2 : 0 };
    }
    function size() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.min(900, Math.round(W * H / 2000));
      stars = []; for (var i = 0; i < n; i++) stars.push(star(false));
      if (reduce) draw(0, 0);
    }
    function comet() {
      var big = Math.random() < 0.22;
      // mostly falling right → left like a shooting star, sometimes left → right
      var dir = Math.random() < 0.75 ? -1 : 1;
      var ang = (dir < 0 ? Math.PI - 0.35 : 0.35) + (Math.random() - 0.5) * 0.35;
      var sp = big ? 0.2 + Math.random() * 0.1 : 0.45 + Math.random() * 0.4; // px per ms
      return { x: dir < 0 ? W * (0.35 + Math.random() * 0.75) : W * (-0.1 + Math.random() * 0.5),
        y: H * (-0.05 + Math.random() * 0.4), vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        len: big ? 280 + Math.random() * 180 : 120 + Math.random() * 150, w: big ? 2.4 : 1.5, big: big, age: 0,
        // each comet gets its own shade of gold, from pale champagne to amber
        gold: '255,' + Math.round(196 + Math.random() * 40) + ',' + Math.round(90 + Math.random() * 80) };
    }
    function draw(dt, t) {
      var glOn = gal && gal.classList.contains('is-on');
      if (glOn) c.clearRect(0, 0, W, H); else { c.fillStyle = '#000'; c.fillRect(0, 0, W, H); }
      var cx = W / 2, cy = H / 2, sx = W * 0.55, sy = H * 0.55;
      var dz = dt * (0.000008 + skyWarp * 0.00004);
      for (var i = 0; !glOn && i < stars.length; i++) {
        var s = stars[i];
        s.z -= dz;
        var px = cx + s.x * sx / s.z, py = cy + s.y * sy / s.z;
        if (s.z < 0.08 || px < -10 || px > W + 10 || py < -10 || py > H + 10) { stars[i] = star(true); continue; }
        var fade = Math.min(1, (1 - s.z) * 10 + (s.z < 1 ? 0.15 : 0)); // fade in from the far plane
        var tw = reduce ? 1 : 0.72 + 0.28 * Math.sin(s.tw + t * 0.001 * s.ts);
        var a = (0.22 + s.b * 0.6) * tw * fade;
        var r = Math.min(2.2, (0.45 + s.b * 0.85) * Math.sqrt(0.5 / s.z));
        c.fillStyle = 'rgba(' + STAR_TINT[s.tint] + ',' + a.toFixed(3) + ')';
        c.beginPath(); c.arc(px, py, r, 0, 6.283); c.fill();
        if (r > 1.4 && a > 0.6) { // soft halo on the brightest
          c.fillStyle = 'rgba(' + (s.tint === 2 ? '255,214,140' : '190,215,255') + ',' + (a * 0.12).toFixed(3) + ')';
          c.beginPath(); c.arc(px, py, r * 3.2, 0, 6.283); c.fill();
        }
      }
      if (reduce) return;
      nextComet -= dt;
      if (nextComet <= 0) { comets.push(comet()); nextComet = 6000 + Math.random() * 8000; }
      // comets glow gold: additive blending so the tails light up like real light
      c.globalCompositeOperation = 'lighter';
      for (var k = comets.length - 1; k >= 0; k--) {
        var m = comets[k], G = m.gold;
        m.age += dt; m.x += m.vx * dt; m.y += m.vy * dt;
        var spd = Math.hypot(m.vx, m.vy), ux = m.vx / spd, uy = m.vy / spd;
        var tl = Math.min(m.len, m.age * spd); // tail grows in from the head's start
        var tx = m.x - ux * tl, ty = m.y - uy * tl;
        if (tx < -60 || tx > W + 60 || ty > H + 60) { comets.splice(k, 1); continue; }
        // wide, soft outer glow of the tail
        var g1 = c.createLinearGradient(m.x, m.y, tx, ty);
        g1.addColorStop(0, 'rgba(' + G + ',.32)'); g1.addColorStop(0.5, 'rgba(' + G + ',.08)'); g1.addColorStop(1, 'rgba(255,150,50,0)');
        c.strokeStyle = g1; c.lineWidth = m.w * 5; c.lineCap = 'round';
        c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(tx, ty); c.stroke();
        // bright core: white-hot at the head, gold, then amber as it fades
        var g = c.createLinearGradient(m.x, m.y, tx, ty);
        g.addColorStop(0, 'rgba(255,252,236,1)');
        g.addColorStop(0.1, 'rgba(' + G + ',.85)');
        g.addColorStop(0.55, 'rgba(255,170,70,.25)');
        g.addColorStop(1, 'rgba(255,140,40,0)');
        c.strokeStyle = g; c.lineWidth = m.w;
        c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(tx, ty); c.stroke();
        // glowing head
        var hr = m.big ? 16 : 9, h = c.createRadialGradient(m.x, m.y, 0, m.x, m.y, hr);
        h.addColorStop(0, 'rgba(255,255,245,1)'); h.addColorStop(0.18, 'rgba(255,244,200,.9)');
        h.addColorStop(0.45, 'rgba(' + G + ',.35)'); h.addColorStop(1, 'rgba(255,160,60,0)');
        c.fillStyle = h; c.beginPath(); c.arc(m.x, m.y, hr, 0, 6.283); c.fill();
        // big comets shed golden sparks that drift off and fade
        if (m.big && Math.random() < dt / 22) dust.push({ x: m.x - ux * 6, y: m.y - uy * 6,
          vx: m.vx * 0.12 + (Math.random() - 0.5) * 0.03, vy: m.vy * 0.12 + (Math.random() - 0.5) * 0.03,
          life: 0, max: 700 + Math.random() * 700, r: 0.6 + Math.random() * 1.1, G: G });
      }
      for (var d = dust.length - 1; d >= 0; d--) {
        var q = dust[d];
        q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt;
        if (q.life >= q.max) { dust.splice(d, 1); continue; }
        var qa = 1 - q.life / q.max;
        c.fillStyle = 'rgba(' + q.G + ',' + (qa * 0.9).toFixed(3) + ')';
        c.beginPath(); c.arc(q.x, q.y, q.r * (0.6 + qa * 0.4), 0, 6.283); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
    }
    size();
    window.addEventListener('resize', size);
    if (reduce) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    (function frame(t) {
      var dt = last ? Math.min(50, t - last) : 16; last = t;
      if (visible) draw(dt, t);
      requestAnimationFrame(frame);
    })(performance.now());
  });

  // ---- Sparkles: a few bright four-point stars in each sky layer ------------
  document.querySelectorAll('[data-sparkles]').forEach(function (skyEl) {
    for (var i = 0; i < +skyEl.dataset.sparkles; i++) {
      var sp = document.createElement('span');
      var size = 14 + Math.random() * 18;
      sp.className = 'pf-sparkle';
      sp.style.cssText = 'left:' + (Math.random() * 96) + '%;top:' + (Math.random() * 70) + '%;width:' + size + 'px;height:' + size + 'px;animation-delay:-' + (Math.random() * 3).toFixed(2) + 's';
      skyEl.appendChild(sp);
    }
  });

  // ---- "Decode" labels: scrambled glyphs resolve when scrolled into view ----
  var glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#*+';
  var originals = new Map(); // kept in JS, not in the DOM, so live-reload DOM diffs can't drop it
  function decode(el) {
    var text = originals.get(el), frame = 0, total = 32;
    if (!text) return;
    (function tick() {
      var done = Math.floor(text.length * frame / total), out = '';
      for (var i = 0; i < text.length; i++) {
        var c = text[i];
        out += (i < done || c === ' ' || c === '·') ? c : glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      el.textContent = out;
      if (frame++ < total) setTimeout(tick, 40); else el.textContent = text;
    })();
  }
  var labels = document.querySelectorAll('[data-decode]');
  if (reduce || !labels.length) return;
  labels.forEach(function (el) {
    originals.set(el, el.textContent);
    el.setAttribute('aria-label', el.textContent);
  });
  if (!('IntersectionObserver' in window)) { labels.forEach(decode); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { io.unobserve(e.target); decode(e.target); }
    });
  }, { threshold: 0.6 });
  labels.forEach(function (el) { io.observe(el); });
})();
