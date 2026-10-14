/* Starter motion system, adapted to Morrow's voice-to-file scene. Plus: the two editions (Mac and Windows), liquid glass on the Mac nav, click-to-try details, and the tomorrow-to-morrow physics finale. */
(function () {
  const root = document.documentElement;
  const demo = document.querySelector('.demo');
  const nav = document.querySelector('#nav');
  const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const toggle = document.querySelector('[data-motion-toggle]');
  let preferredOff = false;
  try { preferredOff = localStorage.getItem('morrow-motion') === 'off'; } catch {}
  const reduce = systemMotion.matches || preferredOff;
  toggle.textContent = reduce ? 'Motion off' : 'Motion on';
  toggle.setAttribute('aria-pressed', String(reduce));
  toggle.addEventListener('click', function () {
    try { localStorage.setItem('morrow-motion', reduce ? 'on' : 'off'); } catch {}
    location.reload();
  });
  systemMotion.addEventListener('change', function () { location.reload(); });
  document.querySelectorAll('[data-open-beta]').forEach(function (link) {
    link.addEventListener('click', function () { document.querySelector('#beta').open = true; });
  });
  if (location.hash === '#beta') document.querySelector('#beta').open = true;

  /* ---------- Which computer is this page for? ---------- */
  let os = root.getAttribute('data-os') === 'windows' ? 'windows' : 'mac';
  let engine = false;
  let lenis = null;
  let heroSplit = null;
  function applyTexts() {
    document.querySelectorAll('[data-os-text]').forEach(function (el) {
      const text = el.getAttribute(os === 'windows' ? 'data-text-windows' : 'data-text-mac');
      if (text !== null && el.textContent !== text) el.textContent = text;
    });
    root.setAttribute('data-os', os);
    document.querySelectorAll('[data-os-pick]').forEach(function (button) {
      if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', String(button.getAttribute('data-os-pick') === os));
    });
    document.title = os === 'windows' ? 'Morrow for Windows | Your work, on your word' : 'Morrow for Mac | Your work, on your word';
    moveThumbs();
    if (typeof window.morrowCatalogApply === 'function') window.morrowCatalogApply();
    window.dispatchEvent(new CustomEvent('morrow:os-changed', { detail: os }));
  }
  function moveThumbs() {
    document.querySelectorAll('[data-os-switch]').forEach(function (group) {
      const on = group.querySelector('[data-os-pick="' + os + '"]');
      const thumb = group.querySelector('.os-thumb');
      if (!on || !thumb) return;
      thumb.style.width = on.offsetWidth + 'px';
      thumb.style.transform = 'translateX(' + on.offsetLeft + 'px)';
    });
  }
  function setOS(next, animate) {
    if (next !== 'mac' && next !== 'windows' || next === os) return;
    os = next;
    try { localStorage.setItem('morrow-os', os); } catch {}
    try { history.replaceState(null, '', location.pathname + '?os=' + os + location.hash); } catch {}
    if (!engine || !animate) { applyTexts(); describeMachine(); if (window.ScrollTrigger) ScrollTrigger.refresh(); return; }
    const parts = '.hero-summary, .hero-media, .media-note';
    gsap.timeline()
      .to(parts, { autoAlpha: 0, y: 8, duration: .22, ease: 'power2.in', stagger: .03 })
      .add(function () { applyTexts(); describeMachine(); })
      .to(parts, { autoAlpha: 1, y: 0, duration: .7, ease: 'expo.out', stagger: .05, clearProps: 'transform' })
      .add(function () { ScrollTrigger.refresh(); if (os === 'windows' && glassStarted) location.reload(); else if (os === 'mac') startGlass(); });
  }
  document.querySelectorAll('[data-os-pick]').forEach(function (button) {
    button.addEventListener('click', function () {
      setOS(button.getAttribute('data-os-pick'), true);
      if (button.closest('.hero') && scrollY > 200) { if (lenis) lenis.scrollTo(0, { duration: 1 }); else scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  });
  applyTexts();
  window.addEventListener('resize', moveThumbs);

  /* What is this computer? Only what the browser volunteers. Nothing is stored or sent. */
  function cleanGPU(renderer) {
    if (!renderer) return '';
    const apple = renderer.match(/Apple M\d[^,)]*/);
    if (apple) return apple[0].trim();
    if (/Apple/i.test(renderer)) return 'Apple silicon';
    const parts = renderer.replace(/^ANGLE \((.*)\)$/, '$1').split(',');
    let name = parts.length > 1 ? parts[1] : parts[0];
    name = name.replace(/\(R\)|\(TM\)|\(C\)/gi, '').replace(/\(0x[0-9a-f]+\)/gi, '').replace(/Direct3D\S*|D3D\d+|vs_\S+|ps_\S+|OpenGL.*|Metal.*|Unspecified Version/gi, '').replace(/\s+/g, ' ').trim();
    return name.length > 3 && name.length < 48 ? name : '';
  }
  function describeMachine() {
    const out = document.querySelector('[data-spec]');
    if (!out) return;
    let gpu = '';
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const debug = gl && gl.getExtension('WEBGL_debug_renderer_info');
      if (debug) gpu = cleanGPU(gl.getParameter(debug.UNMASKED_RENDERER_WEBGL));
    } catch {}
    const memory = navigator.deviceMemory, cores = navigator.hardwareConcurrency;
    const realPlatform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent || '';
    const realWindows = /Win/i.test(realPlatform), realMac = /Mac/i.test(realPlatform);
    const mismatch = (os === 'windows' && !realWindows) || (os === 'mac' && !realMac);
    function render(osName, arch) {
      const facts = [];
      if (mismatch) {
        // The visitor is reading the other computer's edition. Describe that computer, not this one.
        facts.push(os === 'windows' ? 'Made for <b>Windows 10 and 11 PCs</b>' : 'Made for <b>Apple silicon Macs</b>');
        facts.push(os === 'windows' ? '64-bit' : 'macOS 13 or later');
        facts.push(os === 'windows' ? 'Setup 0.3.27' : 'Notarized by Apple');
        out.innerHTML = facts.map(function (fact) { return '<span>' + fact + '</span>'; }).join('');
        const title = document.querySelector('[data-wintitle]');
        if (title) title.textContent = os === 'windows' ? 'Morrow on Windows' : 'Morrow';
        return;
      }
      if (os === 'windows') {
        facts.push('Made for <b>this ' + (osName || 'Windows') + ' PC</b>');
        if (arch) facts.push(arch);
        if (gpu) facts.push(gpu);
        if (memory) facts.push(memory + ' GB memory'); else if (cores) facts.push(cores + ' cores');
        facts.push(screen.width + '×' + screen.height);
      } else {
        facts.push('Made for <b>this ' + (gpu && /Apple M/.test(gpu) ? gpu + ' Mac' : 'Mac') + '</b>');
        if (osName) facts.push(osName);
        facts.push('Notarized by Apple');
        facts.push('Keychain sign-in');
      }
      out.innerHTML = facts.map(function (fact) { return '<span>' + fact + '</span>'; }).join('');
      const title = document.querySelector('[data-wintitle]');
      if (title) title.textContent = os === 'windows' ? 'Morrow on ' + (osName || 'Windows') : 'Morrow';
    }
    render('', '');
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      navigator.userAgentData.getHighEntropyValues(['platformVersion', 'architecture', 'bitness']).then(function (values) {
        const major = parseInt((values.platformVersion || '').split('.')[0], 10);
        let osName = '', arch = '';
        if (os === 'windows') { osName = major >= 13 ? 'Windows 11' : major > 0 ? 'Windows 10' : ''; arch = values.architecture === 'arm' ? 'ARM' : (values.bitness === '64' ? 'x64' : ''); }
        else if (major > 0) osName = 'macOS ' + major;
        render(osName, arch);
      }).catch(function () {});
    }
  }
  describeMachine();

  /* ---------- Click-to-try details that work with or without motion ---------- */
  const lines = ['Ready when you are.', 'Say it once. I\'ll do the rest.', 'Your files stay with you.', 'कल का काम, आज।', 'Press Speak. Or type. Your call.'];
  let lineAt = 0;
  const mascotButton = document.querySelector('[data-mascot]');
  const bubble = document.querySelector('[data-bubble]');
  if (mascotButton) mascotButton.addEventListener('click', function () {
    bubble.textContent = lines[lineAt++ % lines.length];
    if (!engine) { bubble.classList.add('is-on'); setTimeout(function () { bubble.classList.remove('is-on'); }, 1800); return; }
    gsap.killTweensOf([bubble, mascotButton]);
    gsap.timeline()
      .fromTo(mascotButton, { rotate: 0 }, { rotate: -12, duration: .12, ease: 'power2.out' })
      .to(mascotButton, { rotate: 10, duration: .18, ease: 'power2.inOut' })
      .to(mascotButton, { rotate: 0, duration: .4, ease: 'expo.out' })
      .fromTo(bubble, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: .35, ease: 'expo.out' }, 0)
      .to(bubble, { autoAlpha: 0, y: -4, duration: .3, ease: 'power2.in' }, 2.2);
  });
  // Windows window buttons react like the real ones.
  document.querySelectorAll('.win-controls i').forEach(function (control) {
    control.addEventListener('click', function (event) {
      event.preventDefault();
      const figure = control.closest('.window');
      if (!figure || !engine) return;
      if (control.classList.contains('x')) gsap.fromTo(figure, { scale: 1 }, { scale: .985, duration: .12, yoyo: true, repeat: 1, ease: 'power2.inOut' });
      else gsap.fromTo(figure, { y: 0 }, { y: control.previousElementSibling ? -4 : 4, duration: .14, yoyo: true, repeat: 1, ease: 'power2.inOut' });
    });
  });

  function nativeNav() {
    const payoff = document.querySelector('.bharat').getBoundingClientRect();
    nav.classList.toggle('is-scrolled', scrollY > 24);
    nav.classList.toggle('is-dark', payoff.top <= 72 && payoff.bottom >= 72);
  }
  window.addEventListener('scroll', nativeNav, { passive: true });
  nativeNav();
  if (reduce || !window.gsap || !window.ScrollTrigger || !window.SplitText) {
    root.classList.remove('js');
    root.classList.add('motion-off');
    root.classList.add('no-physics');
    demo.classList.add('is-static');
    document.querySelector('.demo-steps').hidden = true;
    return;
  }
  engine = true;
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ duration: 1, ease: 'expo.out' });
  lenis = window.Lenis ? new Lenis({ lerp: .1, smoothWheel: true }) : null;
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (link) {
      link.addEventListener('click', function (event) {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        event.preventDefault();
        lenis.scrollTo(target, { offset: -88, duration: 1.2, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
        history.replaceState(null, '', link.getAttribute('href'));
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      });
    });
  }
  function setStep(index) {
    document.querySelectorAll('[data-demo-step]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.demoStep) === index));
    });
  }

  /* ---------- Liquid glass on the Mac nav (liquidGL: WebGPU or WebGL refraction of the real page) ---------- */
  let glassStarted = false;
  function restorePointer() { document.querySelectorAll('.glass').forEach(function (el) { el.style.pointerEvents = 'auto'; }); }
  function startGlass() {
    if (glassStarted || os !== 'mac' || !window.liquidGL || innerWidth < 701) return;
    const probe = document.createElement('canvas');
    if (!(probe.getContext('webgl2') || probe.getContext('webgl'))) return;
    glassStarted = true;
    root.classList.add('glass-on');
    document.querySelectorAll('[data-glass]').forEach(function (el) { el.classList.add('glass'); });
    try {
      liquidGL({
        target: '.glass', snapshot: 'body', resolution: 1, zIndex: 50,
        refraction: 0.012, aberration: 0.015, bevelDepth: 0.09, bevelWidth: 0.14, frost: 2,
        shadow: false, specular: true, reveal: 'fade', tint: 'rgba(255,255,255,0.42)',
        interaction: 'fluid', interactionStrength: 0.35, interactionRadius: 0.3, interactionViscosity: 0.7,
        on: { init: function () { root.classList.add('glass-ready'); restorePointer(); } }
      });
      liquidGL.registerDynamic('.hero-window, .demo-stage');
      liquidGL.syncWith({ gsap: gsap });
      setTimeout(restorePointer, 1500);
    } catch (error) {
      glassStarted = false;
      root.classList.remove('glass-on');
      document.querySelectorAll('.glass').forEach(function (el) { el.classList.remove('glass'); });
    }
  }

  document.fonts.ready.then(function () {
    root.classList.add('motion-ready');
    gsap.set('[data-hide]', { visibility: 'visible' });
    moveThumbs();
    const intro = gsap.timeline({ delay: .1, onComplete: function () { setTimeout(startGlass, 150); } });
    SplitText.create('.hero h1', { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: function (self) { heroSplit = self; return intro.from(self.lines, { yPercent: 110, duration: 1.1, stagger: .08 }, .12); } });
    intro.from('.hero-summary', { y: 16, opacity: 0, duration: 1 }, .35)
      .from('.hero-media', { y: 32, opacity: 0, duration: 1 }, 1.4);
    gsap.fromTo('[data-expand]', { scale: .94 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.hero-media', start: 'top 90%', end: 'top 25%', scrub: true } });
    // Pins precede later reveals so subsequent positions include their scroll length.
    demo.classList.add('is-live');
    gsap.set('.demo-result,.demo-island', { autoAlpha: 0 });
    const words = SplitText.create('[data-spoken]', { type: 'words' });
    const match = gsap.matchMedia();
    match.add({ desktop: '(min-width: 701px)', mobile: '(max-width: 700px)' }, function (context) {
      const mobile = context.conditions.mobile;
      const scene = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: {
        id: 'morrow-voice-demo', trigger: '.demo-pin', start: mobile ? 'top 64px' : 'top 72px',
        end: function () { return '+=' + innerHeight * (mobile ? 1.5 : 2.2); }, pin: true, scrub: true,
        invalidateOnRefresh: true, onUpdate: function (self) { setStep(self.progress < .34 ? 0 : self.progress < .7 ? 1 : 2); }
      } });
      scene.fromTo(words.words, { opacity: .2 }, { opacity: 1, stagger: .045, duration: .3 }, 0)
        .to('.demo-listening', { autoAlpha: 0, scale: .92, duration: .12 }, .38)
        .fromTo('.demo-island', { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: .13 }, .42)
        .to('.demo-island', { autoAlpha: 0, y: -20, duration: .12 }, .76)
        .fromTo('.demo-result', { autoAlpha: 0, scale: .94 }, { autoAlpha: 1, scale: 1, duration: .16 }, .8)
        .to({}, { duration: .18 });
    });
    document.querySelectorAll('[data-demo-step]').forEach(function (button) {
      button.addEventListener('click', function () {
        const trigger = ScrollTrigger.getById('morrow-voice-demo');
        if (!trigger) return;
        const progress = [.13, .52, .94][Number(button.dataset.demoStep)];
        const y = trigger.start + (trigger.end - trigger.start) * progress;
        if (lenis) lenis.scrollTo(y, { duration: .8 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
    document.querySelectorAll('main [data-split]:not(.hero [data-split]),footer [data-split]').forEach(function (element) {
      SplitText.create(element, { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
        onSplit: function (self) { return gsap.from(self.lines, { yPercent: 110, duration: 1.1, stagger: .08,
          scrollTrigger: { trigger: element, start: 'top 92%', once: true } }); } });
    });
    document.querySelectorAll('[data-clip]').forEach(function (element) {
      gsap.from(element.querySelector('img'), { clipPath: 'inset(0% 0% 100% 0% round 24px)', scale: 1.08, duration: 1.3,
        scrollTrigger: { trigger: element, start: 'top 88%', once: true } });
    });
    const statement = SplitText.create('[data-scrub]', { type: 'words' });
    gsap.fromTo(statement.words, { opacity: .2 }, { opacity: 1, ease: 'none', stagger: .08,
      scrollTrigger: { trigger: '[data-scrub]', start: 'top 80%', end: 'bottom 45%', scrub: true } });
    gsap.from('.control-rows>div', { x: 24, opacity: 0, duration: .8, stagger: .08,
      scrollTrigger: { trigger: '.control-rows', start: 'top 88%', once: true } });
    document.querySelectorAll('.edition-rows').forEach(function (rows) {
      gsap.from(rows.querySelectorAll('div'), { y: 20, opacity: 0, duration: .8, stagger: .07,
        scrollTrigger: { trigger: rows, start: 'top 86%', once: true } });
    });
    gsap.from('.bharat-mascot', { rotation: -18, x: 40, duration: 1.2,
      scrollTrigger: { trigger: '.bharat-bottom', start: 'top 92%', once: true } });
    gsap.from('.plan', { clipPath: 'inset(0% 0% 100% 0% round 24px)', duration: 1.1,
      scrollTrigger: { trigger: '.plan', start: 'top 90%', once: true } });
    gsap.from('.faq-rows details', { x: 18, opacity: 0, duration: .8, stagger: .065,
      scrollTrigger: { trigger: '.faq-rows', start: 'top 92%', once: true } });
    const mark = SplitText.create('[data-chars]', { type: 'chars', mask: 'chars' });
    gsap.from(mark.chars, { yPercent: 100, duration: 1.1, stagger: .04,
      scrollTrigger: { trigger: '[data-chars]', start: 'top 95%', once: true } });
    // The closing wordmark: each letter lifts under the pointer.
    mark.chars.forEach(function (char) {
      char.addEventListener('pointerenter', function () { gsap.fromTo(char, { yPercent: 0 }, { yPercent: -8, duration: .18, ease: 'power2.out', yoyo: true, repeat: 1 }); });
    });
    // FAQ rows open with a measured height, one at a time.
    document.querySelectorAll('.faq-rows details').forEach(function (details) {
      const body = details.querySelector('p');
      details.querySelector('summary').addEventListener('click', function (event) {
        event.preventDefault();
        if (details.open) {
          gsap.to(body, { height: 0, opacity: 0, duration: .3, ease: 'power2.inOut', onComplete: function () { details.open = false; gsap.set(body, { clearProps: 'all' }); ScrollTrigger.refresh(); } });
          return;
        }
        document.querySelectorAll('.faq-rows details[open]').forEach(function (other) {
          const otherBody = other.querySelector('p');
          gsap.to(otherBody, { height: 0, opacity: 0, duration: .25, ease: 'power2.inOut', onComplete: function () { other.open = false; gsap.set(otherBody, { clearProps: 'all' }); } });
        });
        details.open = true;
        const height = body.scrollHeight;
        gsap.fromTo(body, { height: 0, opacity: 0, overflow: 'hidden' }, { height: height, opacity: 1, duration: .5, ease: 'expo.out', onComplete: function () { gsap.set(body, { clearProps: 'all' }); ScrollTrigger.refresh(); } });
      });
    });
    document.querySelectorAll('details:not(.faq-rows details)').forEach(function (details) { details.addEventListener('toggle', function () { ScrollTrigger.refresh(); }); });
    setupTomorrow();
    ScrollTrigger.refresh();
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }).catch(function () {
    root.classList.remove('js');
    gsap.set('[data-hide]', { clearProps: 'all' });
    demo.classList.remove('is-live');
    demo.classList.add('is-static');
  });

  /* ---------- tomorrow becomes morrow. Matter.js gives the dropped letters weight. ---------- */
  function setupTomorrow() {
    const stage = document.querySelector('[data-stage]');
    if (!stage || !window.Matter) { root.classList.add('no-physics'); return; }
    const word = stage.querySelector('[data-word]');
    const chars = Array.prototype.slice.call(word.querySelectorAll('.ch'));
    const ballEl = stage.querySelector('[data-ball]');
    const hint = document.querySelector('[data-physics-hint]');
    const M = window.Matter;
    let running = false, dropped = false, dragging = null, pointerHist = [], ticking = false;
    let engineM = null, world = null, statics = [], walls = [], W = 0, H = 0, letterBoxes = [];
    const bodies = {};
    function measure() {
      const rect = stage.getBoundingClientRect(); W = rect.width; H = rect.height;
      letterBoxes = chars.map(function (char) { const r = char.getBoundingClientRect(); return { x: r.left - rect.left, y: r.top - rect.top, w: r.width, h: r.height }; });
    }
    function build() {
      if (engineM) return;
      engineM = M.Engine.create({ enableSleeping: false, gravity: { x: 0, y: 1.9 } });
      world = engineM.world;
      rebuildWalls();
    }
    function rebuildWalls() {
      walls.forEach(function (wall) { M.Composite.remove(world, wall); });
      walls = [
        M.Bodies.rectangle(W / 2, H + 40, W * 3, 80, { isStatic: true, friction: .9 }),
        M.Bodies.rectangle(-40, H / 2, 80, H * 6, { isStatic: true }),
        M.Bodies.rectangle(W + 40, H / 2, 80, H * 6, { isStatic: true }),
        M.Bodies.rectangle(W / 2, -H * 3, W * 3, 80, { isStatic: true })
      ];
      M.Composite.add(world, walls);
    }
    function glyphBody(box, char) {
      // Lowercase letters sit in the lower part of the line box. A rough glyph box is enough for a bounce.
      const tall = char === 't';
      const height = box.h * (tall ? .72 : .56), width = box.w * .86;
      return { cx: box.x + box.w / 2, cy: box.y + box.h * .66 - height / 2 + (tall ? box.h * .05 : 0), w: width, h: height };
    }
    function drop() {
      if (dropped) return;
      measure();
      build();
      rebuildWalls();
      dropped = true; running = true;
      chars.forEach(function (char, index) { const box = letterBoxes[index]; char.style.position = 'absolute'; char.style.left = box.x + 'px'; char.style.top = box.y + 'px'; char.style.margin = '0'; });
      word.style.left = '0'; word.style.top = '0'; word.style.transform = 'none'; word.style.display = 'block'; word.style.width = W + 'px';
      const keep = chars.slice(2);
      const left = letterBoxes[2].x, right = letterBoxes[7].x + letterBoxes[7].w;
      const shift = W / 2 - (left + right) / 2;
      keep.forEach(function (char, index) {
        const box = letterBoxes[index + 2]; const glyph = glyphBody(box, char.textContent);
        statics.push(M.Bodies.rectangle(glyph.cx + shift, glyph.cy, glyph.w, glyph.h, { isStatic: true, friction: .4, restitution: .2 }));
        gsap.to(char, { x: shift, duration: 1.1, ease: 'expo.out', delay: .35 });
      });
      M.Composite.add(world, statics);
      const tBox = glyphBody(letterBoxes[0], 't');
      const t = M.Bodies.rectangle(tBox.cx, tBox.cy, tBox.w, tBox.h, { restitution: .32, friction: .55, frictionAir: .012, density: .004, chamfer: { radius: Math.min(8, tBox.w * .12) } });
      M.Body.setAngularVelocity(t, -0.08);
      M.Body.setVelocity(t, { x: -1.2, y: -2 });
      const oBox = glyphBody(letterBoxes[1], 'o');
      const radius = Math.max(22, oBox.w * .52);
      const ball = M.Bodies.circle(oBox.cx, oBox.cy, radius, { restitution: .72, friction: .05, frictionAir: .004, density: .0014 });
      M.Body.setVelocity(ball, { x: 1.6, y: -3.5 });
      M.Body.setAngularVelocity(ball, .12);
      bodies.t = { body: t, el: chars[0], ox: tBox.cx - (letterBoxes[0].x + letterBoxes[0].w / 2), oy: tBox.cy - (letterBoxes[0].y + letterBoxes[0].h / 2) };
      bodies.ball = { body: ball, el: ballEl, w: radius * 2, h: radius * 2 };
      M.Composite.add(world, [t, ball]);
      chars[0].classList.add('is-free');
      ballEl.style.width = radius * 2 + 'px'; ballEl.style.height = radius * 2 + 'px';
      gsap.set(ballEl, { autoAlpha: 0, scale: .6, transformOrigin: '50% 50%' });
      gsap.to(chars[1], { autoAlpha: 0, duration: .35, ease: 'power2.in', delay: .25 });
      gsap.to(ballEl, { autoAlpha: 1, scale: 1, duration: .6, ease: 'expo.out', delay: .2 });
      if (hint) gsap.fromTo(hint, { autoAlpha: 0 }, { autoAlpha: 1, duration: .8, delay: 1.2 });
      startTicking();
    }
    function startTicking() { if (ticking) return; ticking = true; gsap.ticker.add(tick); }
    function stopTicking() { if (!ticking) return; ticking = false; gsap.ticker.remove(tick); }
    function tick() {
      if (!running) return;
      M.Engine.update(engineM, 1000 / 60);
      const t = bodies.t, b = bodies.ball;
      t.el.style.transform = 'translate(' + (t.body.position.x - t.ox - (letterBoxes[0].x + letterBoxes[0].w / 2)) + 'px,' + (t.body.position.y - t.oy - (letterBoxes[0].y + letterBoxes[0].h / 2)) + 'px) rotate(' + t.body.angle + 'rad)';
      b.el.style.transform = 'translate(' + (b.body.position.x - b.w / 2) + 'px,' + (b.body.position.y - b.h / 2) + 'px) rotate(' + b.body.angle + 'rad)';
      if (dragging) {
        M.Body.setPosition(dragging.item.body, { x: dragging.target.x, y: dragging.target.y });
        M.Body.setVelocity(dragging.item.body, { x: 0, y: 0 });
      }
    }
    function stagePoint(event) { const rect = stage.getBoundingClientRect(); return { x: event.clientX - rect.left, y: event.clientY - rect.top }; }
    function grab(item, event) {
      const point = stagePoint(event);
      dragging = { item: item, target: point, pointerId: event.pointerId, start: performance.now(), moved: false };
      pointerHist = [{ x: point.x, y: point.y, t: performance.now() }];
      if (item.el.setPointerCapture) item.el.setPointerCapture(event.pointerId);
      event.preventDefault();
    }
    function onMove(event) {
      if (!dragging || event.pointerId !== dragging.pointerId) return;
      const point = stagePoint(event); dragging.target = point; dragging.moved = true;
      pointerHist.push({ x: point.x, y: point.y, t: performance.now() }); if (pointerHist.length > 6) pointerHist.shift();
    }
    function onUp(event) {
      if (!dragging || event.pointerId !== dragging.pointerId) return;
      const item = dragging.item, now = performance.now();
      const first = pointerHist[0], last = pointerHist[pointerHist.length - 1];
      const dt = Math.max(16, last.t - first.t);
      let vx = (last.x - first.x) / dt * 16, vy = (last.y - first.y) / dt * 16;
      const speed = Math.hypot(vx, vy), max = 32;
      if (speed > max) { vx *= max / speed; vy *= max / speed; }
      if (!dragging.moved || now - dragging.start < 160) {
        M.Body.setVelocity(item.body, { x: (Math.random() - .5) * 6, y: -(14 + Math.random() * 6) });
        M.Body.setAngularVelocity(item.body, (Math.random() - .5) * .4);
      } else {
        M.Body.setVelocity(item.body, { x: vx, y: vy });
      }
      dragging = null;
    }
    [ballEl, chars[0]].forEach(function (el, index) {
      el.addEventListener('pointerdown', function (event) { if (!dropped) return; grab(index === 0 ? bodies.ball : bodies.t, event); });
      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    });
    function reset() {
      if (!dropped) return;
      running = false; stopTicking(); dragging = null;
      M.Composite.remove(world, [bodies.t.body, bodies.ball.body]); M.Composite.remove(world, statics); statics = [];
      chars.forEach(function (char) { char.removeAttribute('style'); char.classList.remove('is-free'); gsap.set(char, { clearProps: 'all' }); });
      word.removeAttribute('style');
      gsap.set(ballEl, { autoAlpha: 0, clearProps: 'transform' });
      dropped = false;
      gsap.from(chars, { yPercent: 40, autoAlpha: 0, duration: .8, stagger: .05, ease: 'expo.out', onComplete: function () { setTimeout(drop, 500); } });
    }
    const replay = document.querySelector('[data-replay]');
    if (replay) replay.addEventListener('click', reset);
    ScrollTrigger.create({ trigger: stage, start: 'top 70%', once: true, onEnter: function () { setTimeout(drop, 350); } });
    ScrollTrigger.create({ trigger: stage, start: 'top bottom', end: 'bottom top', onToggle: function (self) { if (!dropped) return; running = self.isActive; if (running) startTicking(); else stopTicking(); } });
    let resizeTimer;
    window.addEventListener('resize', function () { if (!dropped) return; clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { measure(); rebuildWalls(); }, 250); });
  }
})();
