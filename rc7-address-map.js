'use strict';

/* RC7: map-first delivery-address experience. Store/order datasets stay untouched. */
(() => {
  const DEFAULT_CENTER = {lat: 34.7604, lng: 127.6622};
  let map = null;
  let mapProgrammaticMove = false;
  let mapUserMoved = false;
  let renderedAddresses = [];
  let installed = false;

  function inAppBrowserInfo() {
    const userAgent = String(navigator.userAgent || '');
    const android = /Android/i.test(userAgent);
    if (/KAKAOTALK/i.test(userAgent)) return {name: '카카오톡', android};
    if (/(FBAN|FBAV|FB_IAB)/i.test(userAgent)) return {name: '페이스북', android};
    if (/Instagram/i.test(userAgent)) return {name: '인스타그램', android};
    return null;
  }

  function chromeIntentUrl() {
    const current = new URL(window.location.href);
    const scheme = current.protocol.replace(':', '') || 'https';
    const target = `${current.host}${current.pathname}${current.search}${current.hash}`;
    return `intent://${target}#Intent;scheme=${scheme};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(current.href)};end`;
  }

  function inAppBrowserNoticeMarkup() {
    const browser = inAppBrowserInfo();
    if (!browser) return '';
    const action = browser.android
      ? '<button type="button" data-rc7-open-chrome>Chrome에서 열기</button>'
      : '<span>브라우저 메뉴에서 외부 브라우저로 열어 주세요.</span>';
    return `<aside class="rc7-inapp-notice" role="note">
      <span class="rc7-inapp-symbol" aria-hidden="true">!</span>
      <span><b>${browser.name} 안에서 열렸습니다.</b><small>내부 브라우저에서는 위치 권한창이 나타나지 않을 수 있습니다.</small></span>
      ${action}
    </aside>`;
  }

  async function geolocationPermissionState() {
    try {
      if (!navigator.permissions?.query) return 'unknown';
      const permission = await navigator.permissions.query({name: 'geolocation'});
      return String(permission?.state || 'unknown');
    } catch {
      return 'unknown';
    }
  }

  function showLocationRecovery(message, permissionState = 'unknown') {
    const recovery = document.querySelector('#rc7LocationRecovery');
    const copy = document.querySelector('#rc7LocationRecoveryCopy');
    if (!recovery || !copy) return;
    const browser = inAppBrowserInfo();
    const denied = permissionState === 'denied';
    copy.textContent = browser
      ? `${browser.name} 내부 브라우저에서는 위치 권한창이 보이지 않을 수 있습니다. Chrome에서 다시 열거나 주소 검색·지도 선택을 이용해 주세요.`
      : denied
        ? '브라우저 설정에서 위치 권한을 허용한 뒤 다시 누르거나, 주소 검색·지도 선택을 이용해 주세요.'
        : `${message} 주소 검색이나 지도 선택으로도 배달 위치를 바로 정할 수 있습니다.`;
    recovery.hidden = false;
  }

  function hideLocationRecovery() {
    const recovery = document.querySelector('#rc7LocationRecovery');
    if (recovery) recovery.hidden = true;
  }

  function validCoords(value) {
    const lat = Number(value?.lat), lng = Number(value?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null;
  }

  function addressKey(item) {
    return [item?.address, item?.detail, item?.type].map(value => String(value || '').trim()).join('|');
  }

  function localAddress(value = '') {
    return String(value || '')
      .replace(/^(?:(?:전남광주|광주전남)통합특별시|전라남도|전남|광주광역시)\s*/u, '')
      .replace(/^여수시\s*/u, '')
      .trim();
  }

  function addressArea(item = {}) {
    return neighborhoodFor(item.area) || neighborhoodFor(item.region3) || neighborhoodFor(item.address) || '';
  }

  function conciseAddress(item = {}) {
    const area = addressArea(item);
    const local = localAddress(item.address || item.label || '');
    const street = area ? local.replace(new RegExp(`^${area}\\s*`, 'u'), '').trim() : local;
    const text = area && street ? `${area} · ${street}` : area || street || '주소 미설정';
    return text.length > 27 ? `${text.slice(0, 27)}…` : text;
  }

  function savedAddressTitle(item = {}) {
    const nickname = String(item.nickname || '').trim();
    const area = addressArea(item);
    return nickname ? [nickname, area].filter(Boolean).join(' · ') : conciseAddress(item);
  }

  function fullAddress(item = {}) {
    return [item.address, item.detail].map(value => String(value || '').trim()).filter(Boolean).join(' ');
  }

  function savedAddressIcon(item = {}) {
    const nickname = String(item.nickname || '').trim();
    if (nickname === '우리집') return '⌂';
    if (nickname === '회사') return '▣';
    return item.type === 'current' ? '⌖' : '●';
  }

  function savedAddresses() {
    const current = getSavedAddress();
    const result = [];
    const seen = new Set();
    for (const raw of [current, ...getAddressBook()]) {
      if (!raw || typeof raw !== 'object') continue;
      const coords = validCoords(raw.coords) || validCoords({lat: raw.latitude, lng: raw.longitude});
      const item = {...raw, coords, label: String(raw.label || raw.address || '').trim()};
      const key = addressKey(item);
      if (!item.label || seen.has(key)) continue;
      seen.add(key);
      result.push(item);
    }
    return result.slice(0, 12);
  }

  function savedAddressMarkup() {
    renderedAddresses = savedAddresses();
    if (!renderedAddresses.length) {
      return '<p class="rc7-address-empty">아직 저장된 주소가 없습니다.<br>주소를 설정하면 이 기기에 안전하게 저장됩니다.</p>';
    }
    const activeKey = addressKey(getSavedAddress());
    return renderedAddresses.map((item, index) => {
      const active = addressKey(item) === activeKey;
      const title = savedAddressTitle(item);
      const detail = fullAddress(item) || item.area || '여수';
      return `<article class="rc7-saved-card ${active ? 'active' : ''}">
        <button type="button" class="rc7-saved-select" data-rc7-saved="${index}" aria-label="${escapeHtml(title)} 주소 바로 사용">
          <span class="rc7-saved-icon" aria-hidden="true">${savedAddressIcon(item)}</span>
          <span class="rc7-saved-copy"><b>${escapeHtml(title)}</b><small>${escapeHtml(detail)}</small></span>
          <span class="rc7-saved-state">${active ? '사용 중' : '바로 선택'}</span>
        </button>
        <button type="button" class="rc7-saved-delete" data-rc7-delete="${index}" aria-label="${escapeHtml(item.label)} 저장 주소 삭제">삭제</button>
      </article>`;
    }).join('');
  }

  function mapViewForDraft() {
    const exact = validCoords(addressDraft?.coords);
    if (exact) return {coords: exact, zoom: 16, exact: true};
    const area = addressAreaFor([addressDraft?.address, addressDraft?.area].filter(Boolean).join(' '));
    const neighborhood = area !== '여수시 전체' ? neighborhoodPoint(area) : null;
    return {coords: neighborhood || DEFAULT_CENTER, zoom: neighborhood ? 14 : 12, exact: false};
  }

  function currentAreaForCoords(coords) {
    const point = validCoords(coords);
    if (!point || typeof rc6ClosestNeighborhood !== 'function') return '';
    const area = rc6ClosestNeighborhood(point);
    const anchor = typeof neighborhoodPoint === 'function' ? validCoords(neighborhoodPoint(area)) : null;
    if (!anchor) return '';
    const latDistance = (point.lat - anchor.lat) * 111;
    const lngDistance = (point.lng - anchor.lng) * 111 * Math.cos(point.lat * Math.PI / 180);
    if (Math.hypot(latDistance, lngDistance) <= 12) return area;
    return '';
  }

  function isYeosuRegion(region = {}) {
    if (region.isYeosu === true) return true;
    return /(?:여수|yeosu)/i.test([region.region1, region.region2, region.region3].filter(Boolean).join(' '));
  }

  async function reverseRegionForCoords(coords) {
    const point = validCoords(coords);
    if (!point) return {};
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(point.lat),
        lon: String(point.lng),
        zoom: '18',
        addressdetails: '1',
        'accept-language': 'ko'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
        headers: {accept: 'application/json'},
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return {};
      const data = await response.json();
      const address = data?.address || {};
      const city = address.city || address.county || address.municipality || '';
      const district = address.city_district || address.borough || '';
      const region2 = [city, district].filter((value, index, list) => value && list.indexOf(value) === index).join(' ');
      const region3 = address.suburb || address.quarter || address.neighbourhood || address.town || address.village || '';
      return {
        ...analyticsCoarseRegion({
          region1: address.province || address.state || '',
          region2,
          region3,
          regionSource: 'browser_geolocation'
        }),
        isYeosu: /(?:여수|yeosu)/i.test([city, district, address.county, address.municipality].filter(Boolean).join(' '))
      };
    } catch {
      return {};
    }
  }

  function syncMainAddress() {
    const label = String(state.addressLabel || state.location || '여수시 전체').trim();
    const configured = label && label !== '여수시 전체';
    const current = getSavedAddress() || {address: label, label, area: state.location};
    const short = configured ? shortAddress(label, state.location) : '주소 설정';
    const title = configured ? savedAddressTitle(current) : '배달받을 주소를 설정해 주세요';
    const complete = configured ? fullAddress(current) || label : '주소를 설정하면 가까운 가게부터 볼 수 있습니다';
    const top = document.querySelector('#locationText');
    const main = document.querySelector('#activeAddressText');
    const hint = document.querySelector('#activeAddressHint');
    const button = document.querySelector('#locationBtn');
    if (top) top.textContent = short;
    if (main) main.textContent = title;
    if (hint) hint.textContent = complete;
    if (button) button.setAttribute('aria-label', configured ? `현재 배달 위치 ${label}. 주소 변경` : '배달 주소 설정');
  }

  function renderSavedAddresses() {
    const target = document.querySelector('#rc7SavedAddressList');
    if (target) target.innerHTML = savedAddressMarkup();
  }

  function renderDraft() {
    const base = String(addressDraft?.address || '').trim();
    const detailInput = document.querySelector('#addressDetailInput');
    const detail = String(detailInput?.value || addressDraft?.detail || '').trim();
    const coords = validCoords(addressDraft?.coords);
    const nickname = String(document.querySelector('#addressNicknameInput')?.value || addressDraft?.nickname || '').trim();
    const confirm = document.querySelector('#addressConfirmBtn');
    const addressText = document.querySelector('#rc7MapAddress');
    const mapConfirm = document.querySelector('[data-rc7-map-confirm]');
    const mapArea = currentAreaForCoords(coords);
    const searchedArea = addressDraft?.addressArea || addressAreaFor(base);
    const mismatch = Boolean(coords && mapArea && searchedArea && searchedArea !== '여수시 전체' && mapArea !== searchedArea);
    const previewItem = {...addressDraft, address: base, detail, nickname};
    document.querySelectorAll('[data-rc7-selected-preview]').forEach(preview => {
      preview.innerHTML = base
        ? `<span class="rc7-preview-icon" aria-hidden="true">●</span><span><small>선택한 배달 위치</small><b>${escapeHtml(conciseAddress(previewItem))}</b><em>${escapeHtml(fullAddress(previewItem) || '지도에서 위치를 확인해 주세요.')}</em></span>`
        : '<span class="rc7-preview-icon" aria-hidden="true">●</span><span><small>새 배달 위치</small><b>주소를 먼저 검색해 주세요.</b><em>검색 뒤 지도와 상세주소를 차례로 확인합니다.</em></span>';
    });
    if (confirm) confirm.disabled = !base || (!addressDraft?.mapVerified && !addressDraft?.mapUnavailable);
    if (mapConfirm) mapConfirm.disabled = !base || (!coords && !addressDraft?.mapUnavailable) || mismatch;
    if (addressText) addressText.textContent = mapArea ? `지도 핀 · ${mapArea}` : (coords ? '지도 핀 위치 확인 중' : '지도를 움직여 배달 위치를 선택하세요');
    const mapStatus = document.querySelector('#rc7MapStatus');
    if (mapStatus) {
      mapStatus.classList.toggle('is-mismatch', mismatch);
      mapStatus.textContent = mismatch
        ? `검색 주소는 ${searchedArea}, 지도 핀은 ${mapArea}입니다. 같은 동네로 핀을 옮겨 주세요.`
        : coords
          ? `${mapArea || '선택한 위치'}의 지도 핀을 확인한 뒤 아래 버튼을 눌러 주세요.`
          : '지도를 움직이거나 원하는 곳을 눌러 핀을 맞춰 주세요.';
    }
    document.querySelectorAll('[data-rc7-nickname]').forEach(button => button.classList.toggle('active', button.dataset.rc7Nickname === nickname));
    if (map) setTimeout(() => map?.invalidateSize(), 0);
  }

  function moveMap(coords, {zoom = 16} = {}) {
    const point = validCoords(coords);
    if (!map || !point) return;
    mapProgrammaticMove = true;
    map.setView([point.lat, point.lng], zoom, {animate: true});
    setTimeout(() => { mapProgrammaticMove = false; }, 350);
  }

  function showAddressStep(name) {
    document.querySelectorAll('[data-rc7-step]').forEach(section => {
      section.hidden = section.dataset.rc7Step !== name;
    });
    if (name === 'map') {
      if (!map) requestAnimationFrame(initializeMap);
      else setTimeout(() => map.invalidateSize(), 0);
    }
    document.querySelector('.rc7-address-main')?.scrollTo({top: 0, behavior: 'auto'});
    renderDraft();
  }

  async function geocodeAddress(address) {
    const value = String(address || '').trim();
    if (!value) return null;
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        q: value,
        countrycodes: 'kr',
        limit: '1',
        addressdetails: '1',
        'accept-language': 'ko'
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: {accept: 'application/json'},
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return null;
      const [result] = await response.json();
      return validCoords({lat: result?.lat, lng: result?.lon});
    } catch {
      return null;
    }
  }

  async function openMapStep({locateAddress = false} = {}) {
    addressDraft = {...(addressDraft || {}), mapVerified: false, mapUnavailable: false};
    showAddressStep('map');
    if (!locateAddress || validCoords(addressDraft?.coords)) return;
    const status = document.querySelector('#rc7MapStatus');
    if (status) status.textContent = '검색한 주소의 지도 위치를 찾고 있습니다…';
    const coords = await geocodeAddress(addressDraft.address);
    if (!coords || !document.querySelector('[data-rc7-step="map"]:not([hidden])')) {
      if (status) status.textContent = '정확한 좌표를 찾지 못했습니다. 지도를 움직여 핀을 직접 맞춰 주세요.';
      return;
    }
    addressDraft = {
      ...addressDraft,
      coords,
      mapArea: currentAreaForCoords(coords),
      sortByDistance: true,
      coordinateSource: 'address-geocode'
    };
    moveMap(coords, {zoom: 17});
    renderDraft();
  }

  function confirmMapPosition() {
    const coords = validCoords(addressDraft?.coords);
    const mapArea = currentAreaForCoords(coords);
    const searchedArea = addressDraft?.addressArea || addressAreaFor(addressDraft?.address || '');
    const mismatch = Boolean(coords && mapArea && searchedArea && searchedArea !== '여수시 전체' && mapArea !== searchedArea);
    if ((!coords && !addressDraft?.mapUnavailable) || mismatch) {
      renderDraft();
      return;
    }
    addressDraft = {
      ...addressDraft,
      mapVerified: true,
      mapArea: mapArea || addressDraft?.mapArea || '',
      area: mapArea || (searchedArea !== '여수시 전체' ? searchedArea : addressDraft?.area || '여수시 전체'),
      sortByDistance: Boolean(coords)
    };
    showAddressStep('detail');
    setTimeout(() => document.querySelector('#addressDetailInput')?.focus(), 0);
  }

  function chooseAddress(value, extra = {}) {
    const address = String(value || '').trim();
    const coords = validCoords(extra.coords);
    const area = extra.area || addressAreaFor(address);
    const regionValue = key => Object.prototype.hasOwnProperty.call(extra, key)
      ? String(extra[key] || '')
      : String(addressDraft?.[key] || '');
    const draftValue = key => Object.prototype.hasOwnProperty.call(extra, key)
      ? String(extra[key] || '')
      : String(addressDraft?.[key] || '');
    addressDraft = {
      ...(addressDraft || {}),
      address,
      detail: draftValue('detail'),
      nickname: draftValue('nickname'),
      area,
      addressArea: extra.addressArea || area,
      coords,
      sortByDistance: Boolean(coords && extra.sortByDistance !== false),
      type: extra.type || 'recent',
      coordinateSource: extra.coordinateSource || (coords ? 'selected-location' : ''),
      mapVerified: Boolean(extra.mapVerified),
      mapUnavailable: false,
      region1: regionValue('region1'),
      region2: regionValue('region2'),
      region3: regionValue('region3'),
      regionSource: regionValue('regionSource')
    };
    const input = document.querySelector('#addressSearchInput');
    if (input) input.value = address;
    renderDraft();
    if (coords) moveMap(coords, {zoom: 17});
    else {
      const point = area !== '여수시 전체' ? neighborhoodPoint(area) : null;
      if (point) moveMap(point, {zoom: 14});
    }
  }

  function mapLocationSelected(coords) {
    const point = validCoords(coords);
    if (!point) return;
    const localArea = currentAreaForCoords(point);
    const area = localArea || addressDraft?.area || '여수시 전체';
    const currentAddress = String(addressDraft?.address || '').trim();
    addressDraft = {
      ...(addressDraft || {}),
      address: currentAddress || `${area === '여수시 전체' ? '여수시' : area} 지도에서 선택한 위치`,
      area,
      mapArea: localArea,
      coords: point,
      sortByDistance: true,
      type: addressDraft?.type === 'postcode' ? 'postcode' : 'map',
      coordinateSource: 'map-selection',
      mapVerified: false,
      region1: localArea ? '전라남도' : (addressDraft?.region1 || ''),
      region2: localArea ? '여수시' : (addressDraft?.region2 || ''),
      region3: localArea || addressDraft?.region3 || '',
      regionSource: 'map_selection'
    };
    const hint = document.querySelector('#rc7MapHint');
    if (hint) hint.textContent = '지도 가운데 핀의 위치가 배달 위치로 선택되었습니다.';
    renderDraft();
  }

  function initializeMap() {
    const element = document.querySelector('#deliveryAddressMap');
    if (!element) return;
    destroyMap();
    const view = mapViewForDraft();
    if (!window.L) {
      element.innerHTML = '<div class="rc7-map-unavailable"><b>지도를 불러오지 못했습니다.</b><span>주소와 현재 위치 기능은 그대로 사용할 수 있습니다.</span></div>';
      addressDraft = {...(addressDraft || {}), mapUnavailable: true};
      renderDraft();
      return;
    }
    map = window.L.map(element, {zoomControl: true, attributionControl: true, preferCanvas: true});
    window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.setView([view.coords.lat, view.coords.lng], view.zoom);
    map.on('dragstart zoomstart', () => { if (!mapProgrammaticMove) mapUserMoved = true; });
    map.on('moveend', () => {
      if (mapProgrammaticMove || !mapUserMoved) return;
      mapUserMoved = false;
      const center = map.getCenter();
      mapLocationSelected({lat: center.lat, lng: center.lng});
    });
    map.on('click', event => {
      mapUserMoved = false;
      mapLocationSelected({lat: event.latlng.lat, lng: event.latlng.lng});
      moveMap({lat: event.latlng.lat, lng: event.latlng.lng}, {zoom: Math.max(map.getZoom(), 16)});
    });
    setTimeout(() => map?.invalidateSize(), 0);
  }

  function destroyMap() {
    if (!map) return;
    map.off();
    map.remove();
    map = null;
    mapUserMoved = false;
    mapProgrammaticMove = false;
  }

  function addressModal() {
    const saved = getSavedAddress();
    addressDraft = saved
      ? {...saved, coords: validCoords(saved.coords), detail: saved.detail || '', mapVerified: Boolean(validCoords(saved.coords))}
      : {address: '', detail: '', area: '여수시 전체', coords: null, sortByDistance: false, type: 'recent', mapVerified: false};
    openModal(`<section class="address-single-sheet rc7-address-sheet" data-address-single>
      <div class="rc5-address-form rc7-address-main">
        <section class="rc7-address-step rc7-saved-step" data-rc7-step="saved">
          <header class="rc7-address-head"><span>배달 위치</span><h2 id="modalTitle">어디로 배달할까요?</h2><p>저장한 주소를 누르면 바로 적용됩니다.</p></header>
          ${inAppBrowserNoticeMarkup()}
          <section class="rc7-saved-section rc7-saved-first"><div class="address-section-title"><div><small>빠른 주소 선택</small><h3>저장된 주소</h3></div><span>한 번 눌러 바로 적용</span></div><div id="rc7SavedAddressList" class="rc7-saved-list">${savedAddressMarkup()}</div></section>
          <div class="rc7-address-actions">
            <button class="rc7-new-address" type="button" data-rc5-postcode-open><span aria-hidden="true">＋</span><span><b>새 주소 등록</b><small>주소 검색부터 시작</small></span><strong>›</strong></button>
            <button id="gpsLocationBtn" class="current-location-btn rc7-current-location" type="button"><span class="rc7-gps-symbol" aria-hidden="true">⌖</span><span>현재 위치 다시 확인</span></button>
          </div>
          <section id="rc7LocationRecovery" class="rc7-location-recovery" hidden role="status">
            <span class="rc7-location-recovery-symbol" aria-hidden="true">!</span>
            <span><b>위치 확인이 어려운가요?</b><small id="rc7LocationRecoveryCopy">주소 검색으로도 배달 위치를 정할 수 있습니다.</small></span>
            <div><button type="button" data-rc5-postcode-open>주소 검색</button><button type="button" data-rc7-map-select>지도에서 선택</button></div>
          </section>
        </section>

        <section class="rc7-address-step rc7-map-step" data-rc7-step="map" hidden>
          <header class="rc7-step-head"><button type="button" data-rc7-step-back="saved" aria-label="주소 선택으로 돌아가기">←</button><span><small>2단계</small><h2>지도에서 위치 확인</h2></span></header>
          <div class="address-selected-preview rc7-selected-preview" data-rc7-selected-preview></div>
          <section class="rc7-map-section" aria-labelledby="rc7MapTitle">
            <header><div><small>지도 위치 확인</small><h3 id="rc7MapTitle">핀을 정확한 위치에 맞춰 주세요</h3></div><button type="button" data-rc7-map-current aria-label="현재 위치로 지도 이동">⌖</button></header>
            <div class="rc7-map-wrap"><div id="deliveryAddressMap" aria-label="배달 위치 선택 지도"></div><div class="rc7-center-pin" aria-hidden="true"><span></span></div></div>
            <div class="rc7-map-copy"><b id="rc7MapAddress"></b><small id="rc7MapHint">지도를 움직이거나 원하는 곳을 눌러 위치를 선택하세요.</small></div>
          </section>
          <p id="rc7MapStatus" class="rc7-map-status" role="status">지도 핀 위치를 확인해 주세요.</p>
          <button class="address-confirm-btn rc7-confirm" type="button" data-rc7-map-confirm>이 위치가 맞아요</button>
        </section>

        <section class="rc7-address-step rc7-detail-step" data-rc7-step="detail" hidden>
          <header class="rc7-step-head"><button type="button" data-rc7-step-back="map" aria-label="지도 위치 확인으로 돌아가기">←</button><span><small>3단계</small><h2>상세주소 저장</h2></span></header>
          <div class="address-selected-preview rc7-selected-preview" data-rc7-selected-preview></div>
          <label class="address-detail-label rc7-detail-label"><span>상세주소 <small>선택사항</small></span><input id="addressDetailInput" value="${escapeHtml(addressDraft.detail || '')}" placeholder="예: 101동 101호, 2층" autocomplete="address-line2"></label>
          <fieldset class="rc7-nickname-field"><legend>주소 이름 <small>선택사항</small></legend><div><button type="button" data-rc7-nickname="우리집">⌂ 우리집</button><button type="button" data-rc7-nickname="회사">▣ 회사</button><button type="button" data-rc7-nickname="기타">● 기타</button></div><input id="addressNicknameInput" value="${escapeHtml(addressDraft.nickname || '')}" maxlength="12" placeholder="예: 부모님댁, 사무실"></fieldset>
          <button id="addressConfirmBtn" class="address-confirm-btn rc7-confirm" type="button">이 주소로 설정하기</button>
        </section>
      </div>
      <section class="rc5-postcode-view" hidden><header class="rc5-postcode-head"><button type="button" class="rc5-postcode-back" data-rc5-postcode-close>← 돌아가기</button><strong>새 주소 검색</strong></header><p class="rc7-postcode-help">도로명·건물명·지번으로 찾은 뒤 지도 위치를 한 번 더 확인합니다.</p><div class="rc5-postcode-frame" data-rc5-postcode-frame></div></section>
    </section>`);
    renderDraft();
  }

  function sizePostcodeFrame(frame) {
    if (!frame) return;
    const viewportHeight = Math.round(window.visualViewport?.height || window.innerHeight || 720);
    frame.style.minHeight = `${Math.max(480, viewportHeight - 112)}px`;
    const embedded = new Set([...frame.children, ...frame.querySelectorAll('iframe')]);
    embedded.forEach(element => {
      element.style.setProperty('display', 'block', 'important');
      element.style.setProperty('width', '100%', 'important');
      element.style.setProperty('height', '100%', 'important');
      element.style.setProperty('min-height', '100%', 'important');
    });
  }

  async function openPostcode() {
    const form = document.querySelector('#modal .rc5-address-form');
    const view = document.querySelector('#modal .rc5-postcode-view');
    const frame = document.querySelector('#modal [data-rc5-postcode-frame]');
    if (!form || !view || !frame) return;
    form.hidden = true;
    view.hidden = false;
    frame.innerHTML = '<p class="rc4-address-status">주소검색을 불러오는 중입니다.</p>';
    sizePostcodeFrame(frame);
    try {
      const Postcode = await rc4LoadPostcode();
      frame.innerHTML = '';
      const postcode = new Postcode({
        width: '100%',
        height: '100%',
        oncomplete(data) {
          const address = String(data.roadAddress || data.jibunAddress || data.address || '').trim();
          if (!address) {
            frame.innerHTML = '<p class="rc5-postcode-error">선택한 주소를 확인하지 못했습니다.</p>';
            return;
          }
          const area = addressAreaFor([
            address,
            data.jibunAddress,
            data.autoJibunAddress,
            data.bname,
            data.bname1,
            data.bname2
          ].filter(Boolean).join(' '));
          chooseAddressBase(address, {
            area,
            addressArea: area,
            coords: null,
            detail: '',
            nickname: '',
            sortByDistance: false,
            type: 'postcode',
            region1: data.sido || '',
            region2: data.sigungu || '',
            region3: data.bname || data.bname2 || data.bname1 || '',
            regionSource: 'address_search'
          });
          const label = form.querySelector('[data-rc5-postcode-open] span');
          if (label) label.textContent = address;
          form.hidden = false;
          view.hidden = true;
          void openMapStep({locateAddress: true});
        },
        onclose() {
          form.hidden = false;
          view.hidden = true;
          showAddressStep('saved');
        }
      });
      postcode.embed(frame, {autoClose: false});
      requestAnimationFrame(() => sizePostcodeFrame(frame));
      setTimeout(() => sizePostcodeFrame(frame), 250);
      setTimeout(() => {
        if (!view.hidden && !frame.querySelector('iframe')) {
          frame.innerHTML = '<p class="rc5-postcode-error">주소검색 화면을 불러오지 못했습니다. 돌아간 뒤 다시 눌러 주세요.</p>';
        }
      }, 4000);
    } catch {
      frame.innerHTML = '<p class="rc5-postcode-error">주소검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</p>';
    }
  }

  async function useGps() {
    const button = document.querySelector('#gpsLocationBtn');
    if (!button) return;
    if (!navigator.geolocation) {
      button.innerHTML = '<span class="rc7-gps-symbol" aria-hidden="true">⌖</span><span>이 기기는 위치 기능을 지원하지 않습니다</span>';
      showLocationRecovery('이 기기는 위치 기능을 지원하지 않습니다.');
      return;
    }
    const permissionState = await geolocationPermissionState();
    hideLocationRecovery();
    button.disabled = true;
    button.innerHTML = '<span class="rc7-gps-symbol rc7-gps-loading" aria-hidden="true">⌖</span><span>현재 위치를 확인하고 있습니다…</span>';
    navigator.geolocation.getCurrentPosition(async position => {
      const coords = {lat: position.coords.latitude, lng: position.coords.longitude};
      const accuracy = Number(position.coords.accuracy || Infinity);
      const localArea = currentAreaForCoords(coords);
      const region = localArea
        ? {
            region1: '전라남도',
            region2: '여수시',
            region3: localArea,
            regionSource: 'browser_geolocation'
          }
        : await reverseRegionForCoords(coords);
      const outsideYeosu = !localArea && !isYeosuRegion(region);
      if (outsideYeosu) {
        button.disabled = false;
        hideLocationRecovery();
        button.innerHTML = '<span class="rc7-gps-symbol" aria-hidden="true">✓</span><span>여수 외 지역 · 전체 가게 보기</span>';
        chooseAddress('여수 외 지역 · 전체 가게 보기', {
          area: '여수시 전체',
          coords: null,
          sortByDistance: false,
          type: 'current',
          coordinateSource: 'browser-geolocation',
          mapVerified: true,
          region1: region.region1 || '',
          region2: region.region2 || '',
          region3: region.region3 || '',
          regionSource: 'browser_geolocation'
        });
        const hint = document.querySelector('#rc7MapHint');
        if (hint) hint.textContent = '현재 위치가 여수 외 지역이라 여수 전체 가게를 보여드립니다.';
        addressDraft = {...addressDraft, mapUnavailable: true, mapVerified: true};
        showAddressStep('detail');
        return;
      }
      const area = region.region3 || region.region2 || '여수시 전체';
      button.disabled = false;
      hideLocationRecovery();
      button.innerHTML = `<span class="rc7-gps-symbol" aria-hidden="true">✓</span><span>${accuracy <= 300 ? '현재 위치 확인 완료' : '위치 확인 완료 · 지도에서 한 번 확인해 주세요'}</span>`;
      chooseAddress(`현재 위치${area !== '여수시 전체' ? ` · ${area}` : ''}`, {
        area,
        addressArea: area,
        coords,
        sortByDistance: true,
        type: 'current',
        coordinateSource: 'browser-geolocation',
        region1: region.region1 || '',
        region2: region.region2 || '',
        region3: region.region3 || '',
        regionSource: 'browser_geolocation'
      });
      void openMapStep();
      const hint = document.querySelector('#rc7MapHint');
      if (hint) hint.textContent = accuracy <= 300 ? '휴대전화의 현재 위치로 지도를 이동했습니다.' : `위치 오차가 약 ${Math.round(accuracy)}m입니다. 지도를 움직여 조정할 수 있습니다.`;
    }, error => {
      button.disabled = false;
      button.innerHTML = `<span class="rc7-gps-symbol" aria-hidden="true">!</span><span>${error.code === 1 ? '위치 권한을 허용한 뒤 다시 눌러 주세요' : '현재 위치를 확인하지 못했습니다'}</span>`;
      showLocationRecovery(error.code === 1 ? '위치 권한이 허용되지 않았습니다.' : '현재 위치를 확인하지 못했습니다.', permissionState);
    }, {enableHighAccuracy: true, timeout: 12000, maximumAge: 120000});
  }

  function selectSavedAddress(index) {
    const item = renderedAddresses[Number(index)];
    if (!item) return;
    activateAddress(item);
  }

  function deleteSavedAddress(index) {
    const item = renderedAddresses[Number(index)];
    if (!item) return;
    const key = addressKey(item);
    saveAddressBook(getAddressBook().filter(old => addressKey(old) !== key));
    renderSavedAddresses();
  }

  function activateAddress(raw) {
    if (!raw) return;
    const coords = validCoords(raw.coords);
    const item = {
      ...raw,
      label: String(raw.label || fullAddress(raw) || raw.address || '').trim(),
      area: String(raw.area || currentAreaForCoords(coords) || addressAreaFor(raw.address || '') || '여수시 전체'),
      coords,
      sortByDistance: Boolean(coords)
    };
    writeLocalJson(ADDRESS_KEY, item);
    state.location = item.area;
    state.addressLabel = item.label;
    state.coords = coords;
    state.sortByDistance = Boolean(coords);
    saveLocationState(item.label, coords, Boolean(coords), item);
    syncMainAddress();
    hardClose();
    setTimeout(showHomeAfterAddressCommit, 60);
  }

  function commitAddress() {
    const base = String(addressDraft?.address || '').trim();
    if (!base) {
      document.querySelector('[data-rc5-postcode-open]')?.focus();
      return;
    }
    const detail = String(document.querySelector('#addressDetailInput')?.value || '').trim();
    const nickname = String(document.querySelector('#addressNicknameInput')?.value || '').trim();
    const coords = validCoords(addressDraft?.coords);
    const inferred = addressAreaFor(base);
    const mapArea = currentAreaForCoords(coords);
    const searchedArea = addressDraft?.addressArea || inferred;
    if (coords && mapArea && searchedArea && searchedArea !== '여수시 전체' && mapArea !== searchedArea) {
      addressDraft = {...addressDraft, mapVerified: false};
      showAddressStep('map');
      return;
    }
    if (!addressDraft?.mapVerified && !addressDraft?.mapUnavailable) {
      showAddressStep('map');
      return;
    }
    const area = mapArea || (inferred !== '여수시 전체' ? inferred : (addressDraft?.area || '여수시 전체'));
    const label = [base, detail].filter(Boolean).join(' ');
    const item = {
      type: addressDraft?.type || 'recent',
      address: base,
      detail,
      label,
      nickname,
      area,
      coords,
      sortByDistance: Boolean(coords),
      coordinateSource: addressDraft?.coordinateSource || '',
      ...analyticsCoarseRegion(addressDraft),
      createdAt: new Date().toISOString()
    };
    saveAddressBook([item, ...getAddressBook().filter(old => addressKey(old) !== addressKey(item))]);
    activateAddress(item);
  }

  function handleClick(event) {
    const chrome = event.target.closest('[data-rc7-open-chrome]');
    if (chrome) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.href = chromeIntentUrl();
      return;
    }
    const mapSelect = event.target.closest('[data-rc7-map-select]');
    if (mapSelect) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!addressDraft?.address) chooseAddress(`${state.location || '여수시'} 지도에서 선택한 위치`, {area: state.location || '여수시 전체'});
      void openMapStep();
      return;
    }
    const mapConfirm = event.target.closest('[data-rc7-map-confirm]');
    if (mapConfirm) {
      event.preventDefault();
      event.stopImmediatePropagation();
      confirmMapPosition();
      return;
    }
    const stepBack = event.target.closest('[data-rc7-step-back]');
    if (stepBack) {
      event.preventDefault();
      event.stopImmediatePropagation();
      showAddressStep(stepBack.dataset.rc7StepBack || 'saved');
      return;
    }
    const nickname = event.target.closest('[data-rc7-nickname]');
    if (nickname) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const input = document.querySelector('#addressNicknameInput');
      if (!input) return;
      input.value = nickname.dataset.rc7Nickname === '기타' ? '' : nickname.dataset.rc7Nickname;
      addressDraft = {...(addressDraft || {}), nickname: input.value};
      renderDraft();
      if (nickname.dataset.rc7Nickname === '기타') input.focus();
      return;
    }
    const gps = event.target.closest('#gpsLocationBtn');
    if (gps) {
      event.preventDefault();
      event.stopImmediatePropagation();
      useGps();
      return;
    }
    const confirm = event.target.closest('#addressConfirmBtn');
    if (confirm) {
      event.preventDefault();
      event.stopImmediatePropagation();
      commitAddress();
      return;
    }
    const saved = event.target.closest('[data-rc7-saved]');
    if (saved) {
      event.preventDefault();
      event.stopImmediatePropagation();
      selectSavedAddress(saved.dataset.rc7Saved);
      return;
    }
    const remove = event.target.closest('[data-rc7-delete]');
    if (remove) {
      event.preventDefault();
      event.stopImmediatePropagation();
      deleteSavedAddress(remove.dataset.rc7Delete);
      return;
    }
    const recenter = event.target.closest('[data-rc7-map-current]');
    if (recenter) {
      event.preventDefault();
      event.stopImmediatePropagation();
      useGps();
    }
  }

  function initialize() {
    if (installed) return;
    if (window.DAEDONG_REGION?.code && window.DAEDONG_REGION.code !== 'yeosu') return;
    installed = true;
    const hardCloseBase = hardClose;
    const postcodeCloseBase = typeof rc5ClosePostcode === 'function' ? rc5ClosePostcode : null;
    areaModal = addressModal;
    useCurrentLocation = useGps;
    commitAddressSelection = commitAddress;
    chooseAddressBase = chooseAddress;
    renderAddressDraft = renderDraft;
    rc5OpenPostcode = openPostcode;
    hardClose = function rc7HardClose(options = {}) {
      destroyMap();
      hardCloseBase(options);
    };
    if (postcodeCloseBase) {
      rc5ClosePostcode = function rc7ClosePostcode() {
        postcodeCloseBase();
        showAddressStep('saved');
      };
    }
    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', event => {
      if (event.target.id === 'addressDetailInput' || event.target.id === 'addressNicknameInput') renderDraft();
    });
    syncMainAddress();
    const build = document.querySelector('.build-mark');
    if (build) {
      build.hidden = true;
      build.textContent = '';
    }
  }

  window.rc7Initialize = initialize;
})();
