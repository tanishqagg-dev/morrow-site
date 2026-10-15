/* Morrow, alive. A small character system on top of home.js: every Morrow on the page watches the pointer, blinks, breathes,
   reacts to clicks, and a companion Morrow travels down the page with you. Nothing here runs with reduced motion or Motion off. */
(function () {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motionOff = false;
  try { motionOff = localStorage.getItem('morrow-motion') === 'off'; } catch {}
  if (reduce || motionOff || !window.gsap || !window.ScrollTrigger) return;
  const canHover = matchMedia('(hover: hover)').matches;

  // Traced from the real Morrow mark (public/morrow/mark.png) on a 100-unit grid. Eye positions measured from the same file.
  const STAR = 'M93.7 50.0C94.8 51.4 94.9 53.2 94.6 54.7C94.2 56.2 92.9 57.7 91.5 58.8C90.0 60.0 87.6 60.8 85.9 61.7C84.1 62.5 82.0 62.9 81.0 63.8C80.0 64.8 79.9 65.8 80.0 67.3C80.2 68.9 81.5 71.2 81.9 73.2C82.3 75.1 82.7 77.5 82.3 79.0C81.8 80.6 80.8 82.0 79.4 82.7C78.1 83.4 76.1 83.7 74.1 83.2C72.1 82.7 69.1 80.5 67.2 79.8C65.4 79.1 64.1 78.7 62.9 79.0C61.8 79.3 61.2 80.5 60.3 81.7C59.4 82.9 58.7 84.8 57.7 86.2C56.7 87.6 55.5 89.3 54.2 90.2C52.9 91.1 51.4 91.6 50.0 91.5C48.6 91.4 47.1 90.8 45.8 89.8C44.6 88.8 43.5 86.8 42.5 85.3C41.5 83.9 40.8 82.2 39.9 81.1C39.0 80.0 38.5 78.8 37.2 78.7C35.9 78.7 34.3 79.8 32.3 80.6C30.4 81.4 27.6 83.2 25.6 83.6C23.6 83.9 21.8 83.5 20.5 82.8C19.2 82.0 18.2 80.6 17.8 79.0C17.5 77.3 18.0 74.9 18.4 72.9C18.9 70.9 20.5 68.5 20.6 67.0C20.7 65.5 20.2 64.7 19.0 63.8C17.8 63.0 15.4 62.7 13.5 61.8C11.7 61.0 9.2 60.2 7.8 59.0C6.5 57.8 5.5 56.2 5.2 54.7C5.0 53.2 5.2 51.5 6.3 50.0C7.4 48.5 9.8 47.1 11.7 46.0C13.5 44.8 16.1 44.1 17.4 43.1C18.6 42.1 19.3 41.3 19.2 40.0C19.1 38.7 17.6 37.0 16.8 35.2C16.0 33.4 14.6 31.2 14.2 29.3C13.8 27.5 14.0 25.7 14.5 24.2C15.0 22.7 15.9 21.3 17.2 20.5C18.5 19.6 20.2 19.0 22.2 19.1C24.1 19.1 26.6 20.0 28.7 20.7C30.8 21.4 33.0 22.9 34.5 23.2C36.0 23.4 36.8 23.0 37.6 22.3C38.5 21.5 39.0 20.0 39.8 18.5C40.5 16.9 41.1 14.5 42.1 12.8C43.1 11.1 44.3 9.1 45.6 8.0C46.9 6.9 48.5 6.3 50.0 6.2C51.5 6.1 53.1 6.4 54.5 7.3C55.8 8.2 57.1 10.0 58.1 11.7C59.2 13.4 59.8 15.8 60.6 17.4C61.3 19.0 61.9 20.5 62.7 21.4C63.5 22.4 64.1 23.3 65.4 23.3C66.8 23.3 68.7 22.2 70.7 21.5C72.8 20.8 75.6 19.5 77.6 19.3C79.7 19.1 81.6 19.6 83.0 20.3C84.4 21.0 85.6 22.3 86.2 23.7C86.7 25.2 87.0 27.0 86.3 29.0C85.6 31.0 83.0 33.9 82.0 35.7C81.1 37.6 80.6 38.8 80.7 40.0C80.8 41.2 81.5 42.1 82.7 43.0C84.0 44.0 86.4 44.8 88.2 46.0C90.0 47.1 92.6 48.6 93.7 50.0Z';
  const SVG = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g class="mw-body"><path d="' + STAR + '"/></g><g class="mw-eyes"><g class="mw-eye"><ellipse cx="42.4" cy="50" rx="4.3" ry="8.6" transform="rotate(-8 42.4 50)"/></g><g class="mw-eye"><ellipse cx="55.9" cy="46" rx="4.3" ry="8.6" transform="rotate(-8 55.9 46)"/></g></g></svg>';

  /* ---------- The character ---------- */
  const morrows = [];
  let px = innerWidth / 2, py = innerHeight / 3, lastMove = performance.now(), focusEl = null;
  function make(className, opts) {
    opts = opts || {};
    const wrap = document.createElement('span');
    wrap.className = 'mw ' + (className || '');
    wrap.innerHTML = SVG;
    const body = wrap.querySelector('.mw-body'), eyes = wrap.querySelector('.mw-eyes'), lids = wrap.querySelectorAll('.mw-eye');
    const m = { wrap: wrap, svg: wrap.firstChild, body: body, eyes: eyes, lids: lids, mood: null, range: opts.range || 4.5, moodTimer: 0 };
    gsap.set([body, lids], { transformOrigin: '50% 50%' });
    m.ex = gsap.quickTo(eyes, 'x', { duration: .35, ease: 'power3.out' });
    m.ey = gsap.quickTo(eyes, 'y', { duration: .35, ease: 'power3.out' });
    if (opts.breathe !== false) gsap.to(body, { scale: 1.04, rotation: 3, duration: 1.8 + Math.random() * .8, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: Math.random() });
    m.lidScale = function () { return m.mood === 'happy' ? .32 : m.mood === 'sleepy' ? .1 : m.mood === 'surprised' ? 1.25 : 1; };
    m.blink = function () {
      if (m.mood === 'sleepy') return;
      const rest = m.lidScale();
      gsap.timeline().to(lids, { scaleY: .08, duration: .07, ease: 'power2.in' }).to(lids, { scaleY: rest, duration: .12, ease: 'power2.out' });
    };
    m.setMood = function (mood, ms) {
      clearTimeout(m.moodTimer);
      m.mood = mood;
      const s = m.lidScale();
      gsap.to(lids, { scaleY: s, scaleX: mood === 'surprised' ? 1.2 : 1, duration: .25, ease: 'power2.out', overwrite: 'auto' });
      if (ms) m.moodTimer = setTimeout(function () { m.setMood(null); }, ms);
    };
    m.squish = function () {
      return gsap.timeline().to(m.svg, { scaleX: 1.18, scaleY: .82, duration: .09, ease: 'power2.out', transformOrigin: '50% 100%' })
        .to(m.svg, { scaleX: 1, scaleY: 1, duration: .7, ease: 'elastic.out(1, .32)' });
    };
    m.hop = function (h) {
      return gsap.timeline().to(wrap, { y: -(h || 18), duration: .2, ease: 'power2.out' }).to(wrap, { y: 0, duration: .55, ease: 'bounce.out' });
    };
    m.spin = function () { return gsap.fromTo(m.svg, { rotation: 0 }, { rotation: 360, duration: .7, ease: 'back.inOut(1.6)' }); };
    (function blinkLoop() { setTimeout(function () { if (wrap.isConnected) m.blink(); if (Math.random() < .25) setTimeout(m.blink, 180); blinkLoop(); }, 2200 + Math.random() * 4200); })();
    morrows.push(m);
    return m;
  }
  function look() {
    morrows.forEach(function (m) {
      const r = m.svg.getBoundingClientRect();
      if (!r.width || r.bottom < -50 || r.top > innerHeight + 50) return;
      let tx = px, ty = py;
      if (focusEl) { const f = focusEl.getBoundingClientRect(); tx = f.left + Math.min(f.width, 40 + (focusEl.value || '').length * 8); ty = f.top + f.height / 2; }
      const dx = tx - (r.left + r.width / 2), dy = ty - (r.top + r.height / 2);
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 260);
      // Eyes travel in SVG units, so the same range works at every size.
      m.ex(dx / d * m.range * k);
      m.ey(dy / d * m.range * k * .8);
    });
  }
  window.addEventListener('pointermove', function (e) { px = e.clientX; py = e.clientY; lastMove = performance.now(); look(); oEyes(); wake(); }, { passive: true });
  window.addEventListener('scroll', function () { lastMove = performance.now(); look(); oEyes(); wake(); }, { passive: true });

  /* ---------- Sparks: tiny Morrow stars ---------- */
  function burst(x, y, n, size, spread) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark' + (i % 4 === 3 ? ' ink' : '');
      s.setAttribute('data-liquid-ignore', '');
      s.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + STAR + '"/></svg>';
      const sz = size * (.6 + Math.random() * .7);
      s.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + sz + 'px;height:' + sz + 'px';
      document.body.appendChild(s);
      const a = Math.random() * Math.PI * 2, v = (spread || 80) * (.5 + Math.random() * .8);
      gsap.timeline({ onComplete: function () { s.remove(); } })
        .set(s, { xPercent: -50, yPercent: -50, scale: .2, rotation: Math.random() * 180 })
        .to(s, { x: Math.cos(a) * v, y: Math.sin(a) * v - v * .4, scale: 1, rotation: '+=160', duration: .5, ease: 'power3.out' })
        .to(s, { y: '+=' + (60 + Math.random() * 60), rotation: '+=90', autoAlpha: 0, duration: .65, ease: 'power2.in' });
    }
  }
  function rain(n) {
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = 'spark';
      s.innerHTML = '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + STAR + '"/></svg>';
      const sz = 14 + Math.random() * 30;
      s.style.cssText = 'left:' + Math.random() * innerWidth + 'px;top:-60px;width:' + sz + 'px;height:' + sz + 'px';
      document.body.appendChild(s);
      gsap.to(s, { y: innerHeight + 120, x: (Math.random() - .5) * 160, rotation: (Math.random() - .5) * 720, duration: 1.6 + Math.random() * 1.4, delay: Math.random() * .9, ease: 'power1.in', onComplete: function () { s.remove(); } });
    }
  }

  /* ---------- The companion: a Morrow that comes down the page with you ---------- */
  let buddyHidden = false;
  try { buddyHidden = sessionStorage.getItem('morrow-buddy') === 'off'; } catch {}
  const buddy = document.createElement('div');
  buddy.className = 'buddy';
  buddy.setAttribute('data-liquid-ignore', '');
  buddy.innerHTML = '<p class="buddy-say" aria-live="polite"></p><button type="button" class="buddy-hit" aria-label="Morrow. Click to say hi."></button><button type="button" class="buddy-hide" aria-label="Hide Morrow for now">×</button>';
  const say = buddy.querySelector('.buddy-say'), hit = buddy.querySelector('.buddy-hit');
  const bm = make('mw-buddy', { range: 5 });
  hit.appendChild(bm.wrap);
  document.body.appendChild(buddy);
  let sayTimer = 0, buddyOn = false;
  function talk(text, ms) {
    if (buddyHidden || !buddyOn) return;
    clearTimeout(sayTimer);
    say.textContent = text;
    gsap.fromTo(say, { autoAlpha: 0, y: 8, scale: .9 }, { autoAlpha: 1, y: 0, scale: 1, duration: .35, ease: 'back.out(2)', transformOrigin: '100% 100%', overwrite: true });
    sayTimer = setTimeout(function () { gsap.to(say, { autoAlpha: 0, y: -4, duration: .25, ease: 'power2.in' }); }, ms || 2600);
  }
  function showBuddy(on) {
    if (buddyHidden || on === buddyOn) return;
    buddyOn = on;
    gsap.to(buddy, on ? { autoAlpha: 1, y: 0, rotation: 0, duration: .7, ease: 'back.out(1.8)' } : { autoAlpha: 0, y: 90, rotation: 25, duration: .4, ease: 'power2.in' });
    if (on) setTimeout(function () { bm.hop(22); talk(['Hi. I\'m Morrow.', 'Mind if I tag along?', 'I\'ll keep you company.'][Math.floor(Math.random() * 3)]); }, 500);
  }
  gsap.set(buddy, { autoAlpha: 0, y: 90, rotation: 25 });
  ScrollTrigger.create({ trigger: '.hero', start: 'bottom 70%', onEnter: function () { showBuddy(true); }, onLeaveBack: function () { showBuddy(false); } });
  const pokes = ['That tickles.', 'Hi!', 'Press Speak. Or type. Your call.', 'कल का काम, आज।', 'Again?', 'I\'m listening.', 'Boop.', 'Okay, one spin.'];
  let pokeAt = 0, pokeCount = 0;
  hit.addEventListener('click', function (event) {
    const line = pokes[pokeAt++ % pokes.length];
    pokeCount++;
    if (line === 'Okay, one spin.') bm.spin(); else { bm.hop(26); bm.squish(); }
    bm.setMood('happy', 1400);
    talk(pokeCount === 8 ? 'You really like clicking me.' : line);
    const r = hit.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 3, 5, 12, 50);
    event.stopPropagation();
  });
  hit.addEventListener('pointerenter', function () { bm.setMood('surprised', 500); });
  buddy.querySelector('.buddy-hide').addEventListener('click', function () {
    talk('Okay. Bye for now.', 1200);
    bm.setMood('happy');
    setTimeout(function () { showBuddy(false); buddyHidden = true; try { sessionStorage.setItem('morrow-buddy', 'off'); } catch {} }, 900);
  });
  // A line for each part of the page, said once.
  const isWin = function () { return root.getAttribute('data-os') === 'windows'; };
  [
    ['#demo', function () { return 'Say it once. I\'ll open the file.'; }],
    ['#files', function () { return 'Everything I make lands in your Library.'; }],
    ['.control', function () { return 'You set the limits. I stay inside them.'; }],
    ['#edition', function () { return isWin() ? 'Proper Windows buttons. Promise.' : 'Notch, Keychain, the lot.'; }],
    ['#bharat', function () { return 'भारत में बना!'; }],
    ['#pricing', function () { return 'One plan. No surprises.'; }],
    ['#faq', function () { return 'Ask away. Tap a question.'; }],
    ['#tomorrow', function () { return 'Ooh. This is my favourite bit.'; }],
    ['#footer', function () { return 'Want a walkthrough? Book a demo.'; }]
  ].forEach(function (row) {
    if (!document.querySelector(row[0])) return;
    ScrollTrigger.create({ trigger: row[0], start: 'top 55%', once: true, onEnter: function () { setTimeout(function () { talk(row[1]()); bm.hop(14); }, 250); } });
  });
  ScrollTrigger.create({ trigger: '.bharat', start: 'top bottom-=70', end: 'bottom bottom-=70', onToggle: function (s) { buddy.classList.toggle('on-dark', s.isActive); } });
  window.addEventListener('morrow:os-changed', function (e) {
    talk(e.detail === 'windows' ? 'Windows? I\'m at home there too.' : 'Back on a Mac. Nice.');
    morrows.forEach(function (m) { m.hop(10); });
  });
  window.addEventListener('morrow:thud', function () { talk(['Oof.', 'Careful with him!', 'That one bounced.', 'Gravity works.'][Math.floor(Math.random() * 4)], 1600); bm.setMood('surprised', 700); });
  window.addEventListener('morrow:spawn', function (e) {
    const n = e.detail;
    if (n === 1) talk('A friend!');
    else if (n === 5) talk('It\'s getting crowded.');
    else if (n === 12) talk('Okay, that\'s a lot of us.');
  });

  // Idle: Morrow glances around, then dozes off. Any movement wakes it.
  let sleeping = false, lastGlance = 0;
  function wake() {
    if (!sleeping) return;
    sleeping = false;
    morrows.forEach(function (m) { m.setMood(null); });
    talk('Oh! Hi.', 1400);
    bm.hop(16);
  }
  setInterval(function () {
    const idle = performance.now() - lastMove;
    if (idle > 3500 && !sleeping && performance.now() - lastGlance > 2600) {
      lastGlance = performance.now();
      px = Math.random() * innerWidth; py = Math.random() * innerHeight; look();
    }
    if (idle > 14000 && !sleeping && buddyOn) {
      sleeping = true;
      morrows.forEach(function (m) { m.setMood('sleepy'); });
      talk('zzz', 60000);
    }
  }, 700);

  /* ---------- More Morrows around the page ---------- */
  // Hero: the character above the headline comes alive.
  const heroButton = document.querySelector('[data-mascot]');
  if (heroButton) {
    const img = heroButton.querySelector('img');
    const hm = make('mw-hero');
    if (img) img.style.display = 'none';
    heroButton.appendChild(hm.wrap);
    heroButton.addEventListener('pointerenter', function () { hm.setMood('surprised', 600); });
    heroButton.addEventListener('click', function () { hm.squish(); hm.setMood('happy', 1400); const r = heroButton.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 7, 14, 70); });
    gsap.from(hm.wrap, { scale: 0, rotation: -120, duration: 1, ease: 'back.out(2)', delay: .25 });
  }
  // Demo: Morrow listens next to the spoken request, and its state follows the scene's steps.
  const spoken = document.querySelector('.spoken-wrap');
  if (spoken) {
    const row = document.createElement('div');
    row.className = 'listen';
    row.innerHTML = '<span class="listen-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span><span class="listen-text">Listening</span>';
    const lm = make('mw-listen', { range: 3.5 });
    row.insertBefore(lm.wrap, row.firstChild);
    spoken.appendChild(row);
    const bars = row.querySelectorAll('.listen-bars i'), label = row.querySelector('.listen-text');
    let barTween = null;
    function setState(step) {
      if (barTween) barTween.kill();
      gsap.set(bars, { scaleY: .35 });
      if (step === 0) { label.textContent = 'Listening'; lm.setMood(null); barTween = gsap.to(bars, { scaleY: 1, duration: .28, stagger: { each: .07, repeat: -1, yoyo: true }, ease: 'sine.inOut' }); }
      else if (step === 1) { label.textContent = 'Working on it'; lm.setMood(null); barTween = gsap.to(bars, { scaleY: .8, duration: .5, stagger: { each: .1, repeat: -1, yoyo: true }, ease: 'power1.inOut' }); lm.spin(); }
      else { label.textContent = 'Done. Have a look.'; lm.setMood('happy'); lm.hop(10); }
    }
    setState(0);
    const steps = document.querySelectorAll('[data-demo-step]');
    let current = 0;
    new MutationObserver(function () {
      const on = Array.prototype.findIndex.call(steps, function (b) { return b.getAttribute('aria-pressed') === 'true'; });
      if (on !== current && on > -1) { current = on; setState(on); }
    }).observe(document.querySelector('.demo-steps') || document.body, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  }
  // Library: a Morrow sits on top of the picture.
  const filesMedia = document.querySelector('.files-media');
  if (filesMedia) {
    const fm = make('mw-perch');
    filesMedia.appendChild(fm.wrap);
    filesMedia.addEventListener('pointerenter', function () { fm.setMood('happy'); fm.hop(12); });
    filesMedia.addEventListener('pointerleave', function () { fm.setMood(null); });
    gsap.from(fm.wrap, { y: 40, autoAlpha: 0, rotation: 30, duration: .9, ease: 'back.out(2)', scrollTrigger: { trigger: filesMedia, start: 'top 70%', once: true } });
  }
  // Made in Bharat: the character on the black payoff is alive too.
  const bharatImg = document.querySelector('.bharat-mascot');
  if (bharatImg) {
    const km = make('mw-bharat');
    bharatImg.style.display = 'none';
    bharatImg.parentNode.insertBefore(km.wrap, bharatImg);
    km.wrap.setAttribute('role', 'img');
    km.wrap.setAttribute('aria-label', 'Morrow\'s yellow star character');
    km.wrap.addEventListener('pointerenter', function () { km.setMood('happy', 1200); km.hop(20); });
    km.wrap.addEventListener('click', function () { km.spin(); const r = km.wrap.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 10, 16, 90); talk('भारत में बना!'); });
    gsap.from(km.wrap, { x: 80, rotation: -200, duration: 1.3, ease: 'back.out(1.4)', scrollTrigger: { trigger: '.bharat-bottom', start: 'top 92%', once: true } });
  }
  // Pricing: a Morrow hides behind the plan and peeks over the top when you come close.
  const plan = document.querySelector('.plan');
  if (plan) {
    const wrapPlan = document.createElement('div');
    wrapPlan.className = 'plan-wrap';
    plan.parentNode.insertBefore(wrapPlan, plan);
    wrapPlan.appendChild(plan);
    const pm = make('mw-peek');
    wrapPlan.insertBefore(pm.wrap, plan);
    let peeking = false;
    function peek(on) {
      if (on === peeking) return;
      peeking = on;
      gsap.to(pm.wrap, on ? { y: -62, rotation: -10, duration: .6, ease: 'back.out(2.2)' } : { y: 0, rotation: 0, duration: .45, ease: 'power2.in' });
      pm.setMood(on ? 'happy' : null);
    }
    wrapPlan.addEventListener('pointerenter', function () { peek(true); });
    wrapPlan.addEventListener('pointerleave', function () { peek(false); });
    ScrollTrigger.create({ trigger: plan, start: 'top 65%', once: true, onEnter: function () { peek(true); setTimeout(function () { if (!wrapPlan.matches(':hover')) peek(false); }, 1800); } });
  }
  // Footer: the two o's in the big wordmark are eyes.
  const oEyeSets = [];
  function buildOEyes() {
    document.querySelectorAll('[data-chars] *').forEach(function (el) {
      if (el.children.length || el.textContent !== 'o' || el.querySelector('.o-eyes')) return;
      el.style.position = 'relative';
      const probe = document.createElement('span');
      probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      el.appendChild(probe);
      const fs = parseFloat(getComputedStyle(el).fontSize);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = '900 ' + fs + 'px Satoshi';
      const metric = ctx.measureText('o');
      const centerY = probe.offsetTop - (metric.actualBoundingBoxAscent - metric.actualBoundingBoxDescent) / 2;
      probe.remove();
      const eyes = document.createElement('span');
      eyes.className = 'o-eyes';
      eyes.setAttribute('aria-hidden', 'true');
      eyes.innerHTML = '<i></i><i></i>';
      eyes.style.top = centerY + 'px';
      el.appendChild(eyes);
      oEyeSets.push({ el: eyes, fs: fs, x: gsap.quickTo(eyes, 'x', { duration: .3, ease: 'power3.out' }), y: gsap.quickTo(eyes, 'y', { duration: .3, ease: 'power3.out' }) });
      (function blink() { setTimeout(function () { gsap.timeline().to(eyes.children, { scaleY: .1, duration: .07 }).to(eyes.children, { scaleY: 1, duration: .12 }); blink(); }, 2500 + Math.random() * 4000); })();
    });
  }
  function oEyes() {
    oEyeSets.forEach(function (o) {
      const r = o.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      const dx = px - (r.left + r.width / 2), dy = py - (r.top + r.height / 2), d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300) * o.fs * .018;
      o.x(dx / d * k); o.y(dy / d * k * .8);
    });
  }

  /* ---------- Micro-interactions ---------- */
  // Every button answers a press with a ripple from the point you touched.
  document.addEventListener('pointerdown', function (e) {
    const b = e.target.closest('.button, .os-switch button, .demo-steps button, .switch-link');
    if (!b) return;
    const r = b.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
    b.appendChild(ripple);
    gsap.fromTo(ripple, { scale: 0, opacity: .35 }, { scale: 1, opacity: 0, duration: .65, ease: 'power2.out', onComplete: function () { ripple.remove(); } });
  });
  // Tapping empty space throws off a few tiny stars.
  let lastSpark = 0;
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest('a, button, input, select, textarea, summary, label, [data-stage], .buddy, .mw, canvas')) return;
    const now = performance.now();
    if (now - lastSpark < 120) return;
    lastSpark = now;
    burst(e.clientX, e.clientY, 4, 11, 40);
  });
  // Downloads get a small celebration before the page changes.
  document.addEventListener('click', function (e) {
    const a = e.target.closest('a[href*="/download"]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank') return;
    e.preventDefault();
    const r = a.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 14, 18, 110);
    morrows.forEach(function (m) { m.setMood('happy', 1500); m.hop(14); });
    talk('Good choice. See you inside.', 1600);
    setTimeout(function () { location.href = a.href; }, 520);
  });
  // Pictures lean toward the pointer.
  function tilt(el, max) {
    if (!el || !canHover) return;
    gsap.set(el, { transformPerspective: 1200 });
    const rx = gsap.quickTo(el, 'rotationX', { duration: .7, ease: 'power3.out' }), ry = gsap.quickTo(el, 'rotationY', { duration: .7, ease: 'power3.out' });
    el.addEventListener('pointermove', function (e) { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - .5) * max * 2); rx(-((e.clientY - r.top) / r.height - .5) * max * 2); });
    el.addEventListener('pointerleave', function () { rx(0); ry(0); });
  }
  tilt(document.querySelector('.hero-window'), 3);
  tilt(document.querySelector('.files-media'), 6);
  tilt(document.querySelector('.plan'), 4);
  // Words step aside for the pointer: the headline leans away, the statement lifts.
  function proximity(container, selector, apply) {
    if (!container || !canHover) return;
    container.addEventListener('pointermove', function (e) {
      container.querySelectorAll(selector).forEach(function (w) {
        if (!w._q) w._q = { x: gsap.quickTo(w, 'x', { duration: .4, ease: 'power3.out' }), y: gsap.quickTo(w, 'y', { duration: .4, ease: 'power3.out' }), r: gsap.quickTo(w, 'rotation', { duration: .4, ease: 'power3.out' }) };
        const r = w.getBoundingClientRect(), dx = r.left + r.width / 2 - e.clientX, dy = r.top + r.height / 2 - e.clientY, d = Math.hypot(dx, dy);
        apply(w._q, dx, dy, d);
      });
    });
    container.addEventListener('pointerleave', function () { container.querySelectorAll(selector).forEach(function (w) { if (w._q) { w._q.x(0); w._q.y(0); w._q.r(0); } }); });
  }
  proximity(document.querySelector('.hero h1'), '.hero-word', function (q, dx, dy, d) { const k = Math.max(0, 1 - d / 260); q.x(Math.sign(dx) * k * 10); q.r(Math.sign(dx) * k * 3); q.y(0); });
  proximity(document.querySelector('[data-scrub]'), '.scrub-word', function (q, dx, dy, d) { const k = Math.max(0, 1 - d / 160); q.y(-k * 12); q.r(dx > 0 ? k * 2 : -k * 2); q.x(0); });
  // Big headlines wobble when you hover them.
  document.querySelectorAll('.section-title, .bharat-title').forEach(function (title) {
    if (!canHover) return;
    title.addEventListener('pointerenter', function () {
      const lines = title.querySelectorAll('.split-line');
      if (!lines.length) return;
      gsap.fromTo(lines, { skewX: 0 }, { skewX: -6, duration: .14, stagger: .05, yoyo: true, repeat: 1, ease: 'power2.out', overwrite: 'auto' });
    });
  });
  // The Hindi line on the payoff dances a letter at a time.
  const deva = document.querySelector('.bharat .deva');
  if (deva && window.SplitText) {
    const split = SplitText.create(deva, { type: 'words' });
    deva.addEventListener('pointerenter', function () { gsap.fromTo(split.words, { y: 0 }, { y: -10, duration: .2, stagger: .07, yoyo: true, repeat: 1, ease: 'power2.out' }); });
  }
  // Brand wordmark wiggles on hover.
  const brand = document.querySelector('.brand img');
  if (brand && canHover) brand.addEventListener('pointerenter', function () { gsap.fromTo(brand, { rotation: 0 }, { keyframes: [{ rotation: -6 }, { rotation: 5 }, { rotation: -3 }, { rotation: 0 }], duration: .5, ease: 'power1.inOut' }); });
  // The plan's price counts up when it shows a number.
  window.addEventListener('morrow:catalog-ready', function () {
    const el = document.querySelector('[data-plan-price]');
    const match = el && el.textContent.match(/[\d,]+/);
    if (!match) return;
    const target = parseInt(match[0].replace(/,/g, ''), 10), prefix = el.textContent.slice(0, el.textContent.indexOf(match[0])), o = { v: 0 };
    gsap.to(o, { v: target, duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: function () { el.textContent = prefix + Math.round(o.v).toLocaleString('en-IN'); } });
  });
  // The form: Morrow watches what you type.
  document.querySelectorAll('#beta input, #beta select').forEach(function (field) {
    field.addEventListener('focus', function () {
      focusEl = field; look();
      if (field.name === 'workflow') talk('Tell me what eats your week.');
      else if (field.name === 'name') talk('Nice to meet you.');
      else if (field.name === 'email') talk('We only use it to set a time.');
    });
    field.addEventListener('input', function () { look(); if (Math.random() < .15) bm.blink(); });
    field.addEventListener('blur', function () { focusEl = null; look(); });
  });
  const betaForm = document.querySelector('#beta form');
  if (betaForm) betaForm.addEventListener('submit', function () { talk('Sent. Talk soon!'); bm.spin(); });
  document.querySelectorAll('#beta, .faq-rows details').forEach(function (d) {
    d.addEventListener('toggle', function () { if (d.open) { bm.setMood('happy', 900); if (d.id === 'beta') talk('Let\'s set up a walkthrough.'); } });
  });
  // Scroll progress: a small Morrow rolls along the top edge of the page.
  const rider = document.createElement('div');
  rider.className = 'rider';
  rider.setAttribute('aria-hidden', 'true');
  rider.setAttribute('data-liquid-ignore', '');
  rider.innerHTML = '<i class="rider-line"></i>';
  const rm = make('mw-rider', { breathe: false, range: 2.5 });
  rider.appendChild(rm.wrap);
  document.body.appendChild(rider);
  const line = rider.querySelector('.rider-line');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: function (self) {
    const travel = innerWidth - 20, x = self.progress * travel;
    gsap.set(line, { scaleX: self.progress });
    gsap.set(rm.wrap, { x: x, rotation: x / 9 * 57.3 });
  } });
  // Type "morrow" anywhere for a surprise.
  let keys = '';
  document.addEventListener('keydown', function (e) {
    if (e.target.closest('input, textarea, select')) return;
    keys = (keys + (e.key || '')).slice(-6).toLowerCase();
    if (keys === 'morrow') { rain(46); talk('You found us all!', 2400); morrows.forEach(function (m) { m.spin(); m.setMood('happy', 2000); }); }
  });
  // Leave the tab and Morrow notices.
  let savedTitle = document.title;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { savedTitle = document.title; document.title = 'Morrow is waiting for you'; }
    else { document.title = savedTitle; talk('Welcome back.', 1600); bm.hop(20); }
  });

  document.fonts.ready.then(function () { setTimeout(function () { buildOEyes(); look(); oEyes(); ScrollTrigger.refresh(); }, 60); });
  let lastWidth = innerWidth;
  window.addEventListener('resize', function () { if (innerWidth === lastWidth) return; lastWidth = innerWidth; oEyeSets.splice(0).forEach(function (o) { o.el.remove(); }); setTimeout(buildOEyes, 300); });
})();
