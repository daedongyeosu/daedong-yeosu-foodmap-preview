'use strict';

(() => {
  const REGIONS = Object.freeze({
    yeosu: Object.freeze({
      code: 'yeosu',
      shortName: '여수',
      cityName: '여수시',
      fullName: '전라남도 여수시',
      mapName: '대동여수음식지도',
      defaultArea: '여수시 전체',
      neighborhoodUrl: 'data/yeosu-neighborhoods.json',
      areas: []
    }),
    goheung: Object.freeze({
      code: 'goheung',
      shortName: '고흥',
      cityName: '고흥군',
      fullName: '전라남도 고흥군',
      mapName: '대동고흥음식지도',
      defaultArea: '고흥군 전체',
      neighborhoodUrl: 'data/goheung-neighborhoods.json',
      areas: Object.freeze(['고흥군 전체', '고흥읍', '도양읍', '과역면', '동강면', '도덕면', '두원면', '풍양면', '포두면', '금산면', '봉래면', '동일면', '점암면', '영남면', '대서면'])
    })
  });

  const params = new URLSearchParams(window.location.search);
  const requested = String(params.get('region') || '').toLowerCase();
  const active = requested === 'goheung' ? REGIONS.goheung : REGIONS.yeosu;
  const scopedStorageKey = key => active.code === 'yeosu' ? key : `${key}:${active.code}`;

  window.DAEDONG_REGIONS = REGIONS;
  window.DAEDONG_REGION = Object.freeze({...active, storageKey: scopedStorageKey});
  document.documentElement.dataset.region = active.code;

  function regionUrl(code) {
    const url = new URL(window.location.href);
    if (code === 'goheung') url.searchParams.set('region', 'goheung');
    else url.searchParams.delete('region');
    url.searchParams.delete('store');
    url.searchParams.delete('hero');
    url.hash = '';
    return `${url.pathname}${url.search}`;
  }

  function replaceText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function regionWithWaGwa(name) {
    const text = String(name || '');
    const lastCode = text.charCodeAt(text.length - 1);
    const offset = lastCode - 0xac00;
    const hasFinalConsonant = offset >= 0 && offset <= 0xd7a3 - 0xac00 && offset % 28 !== 0;
    return `${text}${hasFinalConsonant ? '과' : '와'}`;
  }

  function regionWithEulReul(name) {
    const text = String(name || '');
    const lastCode = text.charCodeAt(text.length - 1);
    const offset = lastCode - 0xac00;
    const hasFinalConsonant = offset >= 0 && offset <= 0xd7a3 - 0xac00 && offset % 28 !== 0;
    return `${text}${hasFinalConsonant ? '을' : '를'}`;
  }

  function applyMetadata() {
    document.title = active.mapName;
    document.querySelector('meta[name="description"]')?.setAttribute('content', `${active.shortName} 음식점과 주문방법을 한눈에 찾는 ${active.mapName}`);
    document.querySelector('meta[property="og:site_name"]')?.setAttribute('content', active.mapName);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', active.mapName);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', `${active.shortName} 음식점과 이용 가능한 주문방법을 한눈에 확인해보세요.`);
  }

  function injectGoheungHero() {
    if (active.code !== 'goheung') return;
    const shell = document.querySelector('.yeosu-night-shell');
    if (!shell || shell.querySelector('.region-hero-media')) return;
    const media = document.createElement('div');
    media.className = 'region-hero-media';
    media.setAttribute('aria-hidden', 'true');
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const saveData = Boolean(navigator.connection?.saveData);
    const staticClass = reduceMotion || saveData ? ' is-static' : '';
    media.innerHTML = `<span class="goheung-ground-smoke${staticClass}"></span><span class="goheung-launch-flash${staticClass}"></span><img class="goheung-rocket-flight${staticClass}" src="assets/goheung/goheung-rocket-flight-v3.webp" width="620" height="620" alt="" decoding="async">`;
    shell.prepend(media);
  }

  function applyVisibleIdentity() {
    document.body.dataset.region = active.code;
    replaceText('#locationText', active.defaultArea);
    replaceText('.brand-word-left em', active.shortName);
    replaceText('.brand-return-slogan', `${active.shortName}의 맛을 찾는 날마다, ${active.mapName}.`);
    replaceText('.community-intro-kicker', `${active.shortName}의 맛을 오래 이어가는 주문`);
    replaceText('#communityIntroTitle', `${active.shortName}에서 주문한다면,`);
    replaceText('.community-intro-lead', `${regionWithEulReul(active.shortName)} 한 번 더 생각해 주세요.`);
    replaceText('.promo-section .section-head h2', `${regionWithWaGwa(active.shortName)} 함께하는 소식`);
    const brand = document.querySelector('.brand-wordmark');
    brand?.setAttribute('aria-label', `${active.mapName} 홈`);
    document.querySelector('[data-share-home]')?.setAttribute('aria-label', `${active.mapName} 공유하기`);
    document.querySelector('.external-app-notice span:last-child')?.replaceChildren(document.createTextNode(`앱 이름은 주문 경로 안내를 위해 표시되며, ${active.mapName}와 해당 앱의 공식 제휴·후원을 의미하지 않습니다.`));
    injectGoheungHero();
  }

  function regionPickerMarkup() {
    const buttons = Object.values(REGIONS).map(region => `<button type="button" class="region-choice${region.code === active.code ? ' active' : ''}" data-region-code="${region.code}" aria-current="${region.code === active.code ? 'true' : 'false'}"><b>${region.shortName}</b><span>${region.mapName}</span></button>`).join('');
    const areas = active.code === 'goheung' ? `<div class="region-area-grid">${active.areas.map(area => `<button type="button" data-region-area="${area}">${area}</button>`).join('')}</div>` : '<button type="button" class="region-address-button" data-region-address>여수 배달 주소·동네 설정</button>';
    return `<section class="region-picker-sheet"><h2 id="modalTitle">지역 선택</h2><p>같은 대동음식지도 안에서 지역만 바꾸어 볼 수 있습니다.</p><div class="region-choice-grid">${buttons}</div><h3>${active.shortName} 지역 설정</h3>${areas}</section>`;
  }

  function openRegionPicker() {
    if (typeof openModal === 'function') openModal(regionPickerMarkup());
  }

  function applyGoheungArea(area) {
    if (active.code !== 'goheung' || !active.areas.includes(area)) return;
    const item = {label: area, address: area, area, region1: '전라남도', region2: '고흥군', region3: area === active.defaultArea ? '' : area, type: 'region', coords: null, sortByDistance: false, savedAt: new Date().toISOString()};
    try {
      localStorage.setItem(scopedStorageKey('daedongDeliveryAddressV2'), JSON.stringify(item));
      localStorage.setItem(scopedStorageKey('savedLocation'), JSON.stringify(item));
      localStorage.setItem(scopedStorageKey('location'), area);
    } catch {}
    if (typeof state === 'object') {
      state.location = area;
      state.addressLabel = area;
      state.coords = null;
      state.sortByDistance = false;
    }
    replaceText('#locationText', area);
    if (typeof hardClose === 'function') hardClose();
    if (typeof renderStores === 'function') renderStores({resetCount: true});
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyMetadata();
    applyVisibleIdentity();
    const locationButton = document.querySelector('#locationBtn');
    locationButton?.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      openRegionPicker();
    }, true);
    document.addEventListener('click', event => {
      const regionButton = event.target.closest?.('[data-region-code]');
      if (regionButton) {
        event.preventDefault();
        const code = regionButton.dataset.regionCode;
        if (code !== active.code) window.location.assign(regionUrl(code));
        return;
      }
      const areaButton = event.target.closest?.('[data-region-area]');
      if (areaButton) {
        event.preventDefault();
        applyGoheungArea(areaButton.dataset.regionArea || active.defaultArea);
        return;
      }
      const addressButton = event.target.closest?.('[data-region-address]');
      if (addressButton && active.code === 'yeosu') {
        event.preventDefault();
        if (typeof hardClose === 'function') hardClose();
        window.setTimeout(() => typeof areaModal === 'function' && areaModal(), 0);
      }
    }, true);
  });

  window.daedongRegionUrl = regionUrl;
  window.daedongOpenRegionPicker = openRegionPicker;
})();
