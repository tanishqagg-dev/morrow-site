/* Which computer is this? Query string wins, then the remembered choice, then the browser. Runs before paint. */
(function (root) {
  var query = null;
  try { query = new URLSearchParams(location.search).get('os'); } catch (e) {}
  var saved = null;
  try { saved = localStorage.getItem('morrow-os'); } catch (e) {}
  function detect() {
    var platform = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    var ua = navigator.userAgent || '';
    if (/Win/i.test(platform) || /Windows/i.test(ua) || /Android/i.test(ua)) return 'windows';
    return 'mac';
  }
  var os = (query === 'mac' || query === 'windows') ? query : (saved === 'mac' || saved === 'windows') ? saved : detect();
  root.setAttribute('data-os', os);
  if (query === 'mac' || query === 'windows') { try { localStorage.setItem('morrow-os', query); } catch (e) {} }
})(document.documentElement);
(function (root) {
  let off = matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { off = off || localStorage.getItem('morrow-motion') === 'off'; } catch {}
  if (off) { root.classList.add('motion-off'); return; }
  root.classList.add('js');
  setTimeout(function () {
    if (!root.classList.contains('motion-ready')) root.classList.remove('js');
  }, 2500);
})(document.documentElement);
