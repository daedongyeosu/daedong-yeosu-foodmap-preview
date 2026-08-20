(() => {
  'use strict';

  const startedAt = performance.now();
  const storageKey = 'daedong-mobile-performance-v1';
  const rawPhotoPattern = /\/(?:notion-recovery-180|notion-store-photos|store-photos|brand-apps)\/.*\.(?:png|jpe?g|gif)(?:[?#]|$)/i;
  const report = {
    version: 1,
    startedAt: new Date().toISOString(),
    device: {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      pixelRatio: window.devicePixelRatio || 1,
      memoryGb: navigator.deviceMemory || null,
      cores: navigator.hardwareConcurrency || null,
      connection: navigator.connection?.effectiveType || null,
      saveData: Boolean(navigator.connection?.saveData)
    },
    timings: {},
    vitals: {lcpMs: 0, cls: 0, maxLongTaskMs: 0, totalLongTaskMs: 0},
    resources: {count: 0, transferBytes: 0, rawPhotoRequests: []},
    interactions: []
  };
  const actionStarts = new Map();
  let cls = 0;

  const now = () => Math.round(performance.now());
  const visible = element => Boolean(element && !element.hidden && element.getClientRects().length);
  const markOnce = (name, value = now()) => {
    if (report.timings[name] == null) report.timings[name] = Math.max(0, Math.round(value));
  };
  const rememberInteraction = (name, durationMs) => {
    report.interactions.push({name, durationMs: Math.max(0, Math.round(durationMs)), atMs: now()});
    if (report.interactions.length > 30) report.interactions.splice(0, report.interactions.length - 30);
  };
  const finishAction = (name, selector) => {
    const actionStartedAt = actionStarts.get(name);
    if (actionStartedAt == null || !document.querySelector(selector)) return;
    rememberInteraction(name, performance.now() - actionStartedAt);
    actionStarts.delete(name);
  };

  const observe = (type, handler) => {
    try {
      const observer = new PerformanceObserver(list => handler(list.getEntries()));
      observer.observe({type, buffered: true});
    } catch {}
  };
  observe('largest-contentful-paint', entries => {
    const last = entries.at(-1);
    if (last) report.vitals.lcpMs = Math.round(last.startTime);
  });
  observe('layout-shift', entries => {
    for (const entry of entries) if (!entry.hadRecentInput) cls += entry.value;
    report.vitals.cls = Math.round(cls * 1000) / 1000;
  });
  observe('longtask', entries => {
    for (const entry of entries) {
      report.vitals.maxLongTaskMs = Math.max(report.vitals.maxLongTaskMs, Math.round(entry.duration));
      report.vitals.totalLongTaskMs += Math.round(entry.duration);
    }
  });

  const refreshResources = () => {
    const resources = performance.getEntriesByType('resource');
    report.resources.count = resources.length;
    report.resources.transferBytes = Math.round(resources.reduce((sum, entry) => sum + (entry.transferSize || 0), 0));
    report.resources.rawPhotoRequests = resources
      .filter(entry => rawPhotoPattern.test(entry.name))
      .map(entry => entry.name)
      .slice(0, 20);
  };
  const inspectUi = () => {
    if (document.querySelector('#storeGrid .store-card')) markOnce('homeReadyMs', performance.now() - startedAt);
    if (visible(document.querySelector('#modal .store-detail-loading'))) finishAction('detailSkeletonMs', '#modal:not([hidden]) .store-detail-loading');
    if (visible(document.querySelector('#modal .store-detail:not(.store-detail-loading)'))) finishAction('detailReadyMs', '#modal:not([hidden]) .store-detail:not(.store-detail-loading)');
    if (visible(document.querySelector('[data-store-menu-overlay] .store-menu-loading'))) finishAction('menuSkeletonMs', '[data-store-menu-overlay]:not([hidden]) .store-menu-loading');
    if (visible(document.querySelector('[data-store-menu-overlay] .store-menu-preview'))) finishAction('menuReadyMs', '[data-store-menu-overlay]:not([hidden]) .store-menu-preview');
  };

  document.addEventListener('pointerdown', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    if (target.closest('.store-card,[data-featured-store-id],[data-recommend-store-id]')) {
      actionStarts.set('detailSkeletonMs', performance.now());
      actionStarts.set('detailReadyMs', performance.now());
    }
    if (target.closest('[data-store-menu-preview]')) {
      actionStarts.set('menuSkeletonMs', performance.now());
      actionStarts.set('menuReadyMs', performance.now());
    }
  }, {capture: true, passive: true});

  const mutationObserver = new MutationObserver(inspectUi);
  const boot = () => {
    mutationObserver.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class']});
    inspectUi();
    if (new URLSearchParams(location.search).get('performance') === '1') installReportButton();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();

  function currentReport() {
    refreshResources();
    return JSON.parse(JSON.stringify(report));
  }
  function persist() {
    const snapshot = currentReport();
    try {
      const history = JSON.parse(localStorage.getItem(storageKey) || '[]');
      history.push(snapshot);
      localStorage.setItem(storageKey, JSON.stringify(history.slice(-20)));
    } catch {}
  }
  function installReportButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = '성능 기록';
    button.setAttribute('aria-label', '실제 휴대전화 성능 기록 보기');
    Object.assign(button.style, {position: 'fixed', right: '12px', bottom: '86px', zIndex: '2147483647', padding: '10px 14px', border: '0', borderRadius: '999px', color: '#fff', background: '#123b67', fontWeight: '800'});
    button.addEventListener('click', async () => {
      const text = JSON.stringify(currentReport(), null, 2);
      try { await navigator.clipboard.writeText(text); button.textContent = '복사 완료'; }
      catch { window.prompt('아래 성능 기록을 복사하세요.', text); }
      setTimeout(() => { button.textContent = '성능 기록'; }, 1600);
    });
    document.body.append(button);
  }

  addEventListener('pagehide', persist);
  window.daedongPerformance = {
    getReport: currentReport,
    getHistory: () => {
      try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
    },
    clearHistory: () => localStorage.removeItem(storageKey)
  };
})();
