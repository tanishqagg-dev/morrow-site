(function (root) {
  let off = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { off = off || localStorage.getItem('morrow-motion') === 'off'; } catch {}
  if (off) { root.classList.add('motion-off'); return; }
  root.classList.add('js');
  setTimeout(function () {
    if (!root.classList.contains('motion-ready')) root.classList.remove('js');
  }, 2500);
})(document.documentElement);
