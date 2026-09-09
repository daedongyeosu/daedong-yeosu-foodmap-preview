// GitHub Pages serves /s/ as a small entry page. Restore its short pathname
// before the main application's scripts run, without saving a referral profile.
(() => {
  const url = new URL(location.href);
  if (url.pathname !== '/' && url.pathname !== '/index.html') return;
  const marker = '#__dd_shared_s=';
  let changed = false;
  if (url.hash.startsWith(marker)) {
    let fragment;
    try { fragment = decodeURIComponent(url.hash.slice(marker.length)); } catch { return; }
    url.pathname = '/s';
    url.hash = fragment;
    changed = true;
  }
  // The old public query link is retired, not an alias for /s.
  if (url.searchParams.get('partner') === 'shared-yeosu') {
    url.searchParams.delete('partner');
    changed = true;
  }
  if (changed) history.replaceState(history.state, '', url.pathname + url.search + url.hash);
})();
