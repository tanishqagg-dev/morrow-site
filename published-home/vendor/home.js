/* Starter motion system, adapted to Morrow's voice-to-file scene. */
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
    demo.classList.add('is-static');
    document.querySelector('.demo-steps').hidden = true;
    return;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText);
  gsap.defaults({ duration: 1, ease: 'expo.out' });
  const lenis = window.Lenis ? new Lenis({ lerp: .1, smoothWheel: true }) : null;
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
  document.fonts.ready.then(function () {
    root.classList.add('motion-ready');
    gsap.set('[data-hide]', { visibility: 'visible' });
    const intro = gsap.timeline({ delay: .1 });
    SplitText.create('.hero h1', { type: 'lines', mask: 'lines', linesClass: 'split-line', autoSplit: true,
      onSplit: function (self) { return intro.from(self.lines, { yPercent: 110, duration: 1.1, stagger: .08 }, .12); } });
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
    gsap.from('.bharat-mascot', { rotation: -18, x: 40, duration: 1.2,
      scrollTrigger: { trigger: '.bharat-bottom', start: 'top 92%', once: true } });
    document.querySelectorAll('[data-draw] path').forEach(function (path) {
      const length = path.getTotalLength();
      gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, ease: 'none',
        scrollTrigger: { trigger: path, start: 'top 90%', end: 'top 50%', scrub: true } });
    });
    gsap.from('.plan', { clipPath: 'inset(0% 0% 100% 0% round 24px)', duration: 1.1,
      scrollTrigger: { trigger: '.plan', start: 'top 90%', once: true } });
    gsap.from('.faq-rows details', { x: 18, opacity: 0, duration: .8, stagger: .065,
      scrollTrigger: { trigger: '.faq-rows', start: 'top 92%', once: true } });
    const mark = SplitText.create('[data-chars]', { type: 'chars', mask: 'chars' });
    gsap.from(mark.chars, { yPercent: 100, duration: 1.1, stagger: .04,
      scrollTrigger: { trigger: '[data-chars]', start: 'top 95%', once: true } });
    document.querySelectorAll('details').forEach(function (details) { details.addEventListener('toggle', function () { ScrollTrigger.refresh(); }); });
    ScrollTrigger.refresh();
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }).catch(function () {
    root.classList.remove('js');
    gsap.set('[data-hide]', { clearProps: 'all' });
    demo.classList.remove('is-live');
    demo.classList.add('is-static');
  });
})();
