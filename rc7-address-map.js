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
      const icon = item.type === 'current' ? '⌖' : item.type === 'postcode' ? '⌂' : '📍';
      const detail = [item.address, item.detail].filter(Boolean).join(' ');
      return `<article class="rc7-saved-card ${active ? 'active' : ''}">
        <button type="button" class="rc7-saved-select" data-rc7-saved="${index}" aria-label="${escapeHtml(item.label)} 주소 선택">
          <span class="rc7-saved-icon" aria-hidden="true">${icon}</span>
          <span class="rc7-saved-copy"><b>${escapeHtml(item.label)}</b><small>${escapeHtml(detail || item.area || '여수')}</small></span>
          <span class="rc7-saved-state">${active ? '사용 중' : '선택'}</span>
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
    const short = configured ? shortAddress(label, state.location) : '주소 설정';
    const top = document.querySelector('#locationText');
    const main = document.querySelector('#activeAddressText');
    const hint = document.querySelector('#activeAddressHint');
    const button = document.querySelector('#locationBtn');
    if (top) top.textContent = short;
    if (main) main.textContent = configured ? label : '배달받을 주소를 설정해 주세요';
    if (hint) hint.textContent = configured ? (state.sortByDistance && state.coords ? '이 위치에서 가까운 가게부터 안내합니다' : `${state.location || '여수'} 기준으로 안내합니다`) : '주소를 설정하면 가까운 가게부터 볼 수 있습니다';
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
    const preview = document.querySelector('#addressSelectedPreview');
    const confirm = document.querySelector('#addressConfirmBtn');
    const addressText = document.querySelector('#rc7MapAddress');
    const launchText = document.querySelector('[data-rc5-postcode-open] span');
    if (preview) {
      preview.innerHTML = base
        ? `<span class="rc7-preview-icon" aria-hidden="true">📍</span><span><small>선택한 배달 위치</small><b>${escapeHtml(base)}</b><em>${escapeHtml(detail || (coords ? '지도 위치가 함께 저장됩니다.' : '지도를 움직여 정확한 위치를 맞출 수 있습니다.'))}</em></span>`
        : '<span class="rc7-preview-icon" aria-hidden="true">📍</span><span><small>선택한 배달 위치</small><b>주소를 검색하거나 저장된 주소를 선택하세요.</b><em>현재 위치 버튼도 사용할 수 있습니다.</em></span>';
    }
    if (confirm) confirm.disabled = !base;
    if (addressText) addressText.textContent = base || '지도를 움직여 배달 위치를 선택하세요';
    if (launchText) launchText.textContent = base || '도로명, 건물명 또는 지번으로 검색';
    if (map) setTimeout(() => map?.invalidateSize(), 0);
  }

  function moveMap(coords, {zoom = 16} = {}) {
    const point = validCoords(coords);
    if (!map || !point) return;
    mapProgrammaticMove = true;
    map.setView([point.lat, point.lng], zoom, {animate: true});
    setTimeout(() => { mapProgrammaticMove = false; }, 350);
  }

  function chooseAddress(value, extra = {}) {
    const address = String(value || '').trim();
    const coords = validCoords(extra.coords);
    const area = extra.area || addressAreaFor(address);
    const regionValue = key => Object.prototype.hasOwnProperty.call(extra, key)
      ? String(extra[key] || '')
      : String(addressDraft?.[key] || '');
    addressDraft = {
      ...(addressDraft || {}),
      address,
      area,
      coords,
      sortByDistance: Boolean(coords && extra.sortByDistance !== false),
      type: extra.type || 'recent',
      coordinateSource: extra.coordinateSource || (coords ? 'selected-location' : ''),
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
      coords: point,
      sortByDistance: true,
      type: addressDraft?.type === 'postcode' ? 'postcode' : 'map',
      coordinateSource: 'map-selection',
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
      ? {...saved, coords: validCoords(saved.coords), detail: saved.detail || ''}
      : {address: state.addressLabel === '여수시 전체' ? '' : state.addressLabel, detail: '', area: state.location, coords: validCoords(state.coords), sortByDistance: Boolean(state.coords), type: 'recent'};
    openModal(`<section class="address-single-sheet rc7-address-sheet" data-address-single>
      <div class="rc5-address-form rc7-address-main">
        <header class="rc7-address-head"><span>배달 위치</span><h2 id="modalTitle">주소 설정</h2><p>지도와 저장 주소로 원하는 위치를 빠르게 바꿀 수 있습니다.</p></header>
        ${inAppBrowserNoticeMarkup()}
        <div id="addressSelectedPreview" class="address-selected-preview rc7-selected-preview"></div>
        <button class="rc5-address-launch rc7-address-search" type="button" data-rc5-postcode-open>
          <span>${escapeHtml(addressDraft.address || '도로명, 건물명 또는 지번으로 검색')}</span><b>검색</b>
        </button>
        <button id="gpsLocationBtn" class="current-location-btn rc7-current-location" type="button"><span class="rc7-gps-symbol" aria-hidden="true">⌖</span><span>현재 위치 다시 확인</span></button>
        <section id="rc7LocationRecovery" class="rc7-location-recovery" hidden role="status">
          <span class="rc7-location-recovery-symbol" aria-hidden="true">!</span>
          <span><b>위치 확인이 어려운가요?</b><small id="rc7LocationRecoveryCopy">주소 검색이나 지도 선택으로도 배달 위치를 정할 수 있습니다.</small></span>
          <div><button type="button" data-rc5-postcode-open>주소 검색</button><button type="button" data-rc7-map-select>지도에서 선택</button></div>
        </section>
        <section class="rc7-map-section" aria-labelledby="rc7MapTitle">
          <header><div><small>지도에서 위치 조정</small><h3 id="rc7MapTitle">핀을 배달 위치에 맞춰 주세요</h3></div><button type="button" data-rc7-map-current aria-label="현재 위치로 지도 이동">⌖</button></header>
          <div class="rc7-map-wrap"><div id="deliveryAddressMap" aria-label="배달 위치 선택 지도"></div><div class="rc7-center-pin" aria-hidden="true"><span></span></div></div>
          <div class="rc7-map-copy"><b id="rc7MapAddress"></b><small id="rc7MapHint">지도를 움직이거나 원하는 곳을 눌러 위치를 선택하세요.</small></div>
        </section>
        <label class="address-detail-label rc7-detail-label"><span>상세주소 <small>선택사항</small></span><input id="addressDetailInput" value="${escapeHtml(addressDraft.detail || '')}" placeholder="동·호수, 건물명" autocomplete="address-line2"></label>
        <section class="rc7-saved-section"><div class="address-section-title"><div><small>이 기기에 저장됨</small><h3>저장된 주소</h3></div><span>누르면 바로 전환</span></div><div id="rc7SavedAddressList" class="rc7-saved-list">${savedAddressMarkup()}</div></section>
        <button id="addressConfirmBtn" class="address-confirm-btn rc7-confirm" type="button">이 위치로 설정하기</button>
      </div>
      <section class="rc5-postcode-view" hidden><header class="rc5-postcode-head"><button type="button" class="rc5-postcode-back" data-rc5-postcode-close>← 돌아가기</button><strong>주소 검색</strong></header><div class="rc5-postcode-frame" data-rc5-postcode-frame></div></section>
    </section>`);
    renderDraft();
    requestAnimationFrame(initializeMap);
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
            coords: null,
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
          renderAddressDraft();
          setTimeout(() => document.querySelector('#addressDetailInput')?.focus(), 0);
        },
        onclose() {
          form.hidden = false;
          view.hidden = true;
          setTimeout(() => map?.invalidateSize(), 0);
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
          region1: region.region1 || '',
          region2: region.region2 || '',
          region3: region.region3 || '',
          regionSource: 'browser_geolocation'
        });
        const hint = document.querySelector('#rc7MapHint');
        if (hint) hint.textContent = '현재 위치가 여수 외 지역이라 여수 전체 가게를 보여드립니다.';
        return;
      }
      const area = region.region3 || region.region2 || '여수시 전체';
      button.disabled = false;
      hideLocationRecovery();
      button.innerHTML = `<span class="rc7-gps-symbol" aria-hidden="true">✓</span><span>${accuracy <= 300 ? '현재 위치 확인 완료' : '위치 확인 완료 · 지도에서 한 번 확인해 주세요'}</span>`;
      chooseAddress(`현재 위치${area !== '여수시 전체' ? ` · ${area}` : ''}`, {
        area,
        coords,
        sortByDistance: true,
        type: 'current',
        coordinateSource: 'browser-geolocation',
        region1: region.region1 || '',
        region2: region.region2 || '',
        region3: region.region3 || '',
        regionSource: 'browser_geolocation'
      });
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
    addressDraft = {...item, coords: validCoords(item.coords), sortByDistance: Boolean(validCoords(item.coords))};
    const input = document.querySelector('#addressDetailInput');
    if (input) input.value = item.detail || '';
    renderDraft();
    const view = mapViewForDraft();
    moveMap(view.coords, {zoom: view.zoom});
    document.querySelector('.rc7-selected-preview')?.scrollIntoView({behavior: 'smooth', block: 'nearest'});
  }

  function deleteSavedAddress(index) {
    const item = renderedAddresses[Number(index)];
    if (!item) return;
    const key = addressKey(item);
    saveAddressBook(getAddressBook().filter(old => addressKey(old) !== key));
    renderSavedAddresses();
  }

  function commitAddress() {
    const base = String(addressDraft?.address || '').trim();
    if (!base) {
      document.querySelector('[data-rc5-postcode-open]')?.focus();
      return;
    }
    const detail = String(document.querySelector('#addressDetailInput')?.value || '').trim();
    const coords = validCoords(addressDraft?.coords);
    const inferred = addressAreaFor(base);
    const area = inferred !== '여수시 전체' ? inferred : (currentAreaForCoords(coords) || addressDraft?.area || '여수시 전체');
    const label = [base, detail].filter(Boolean).join(' ');
    const item = {
      type: addressDraft?.type || 'recent',
      address: base,
      detail,
      label,
      area,
      coords,
      sortByDistance: Boolean(coords),
      coordinateSource: addressDraft?.coordinateSource || '',
      ...analyticsCoarseRegion(addressDraft),
      createdAt: new Date().toISOString()
    };
    writeLocalJson(ADDRESS_KEY, item);
    saveAddressBook([item, ...getAddressBook().filter(old => addressKey(old) !== addressKey(item))]);
    state.location = area;
    state.addressLabel = label;
    state.coords = coords;
    state.sortByDistance = Boolean(coords);
    saveLocationState(label, coords, Boolean(coords), item);
    syncMainAddress();
    hardClose();
    setTimeout(showHomeAfterAddressCommit, 60);
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
      const section = document.querySelector('.rc7-map-section');
      section?.scrollIntoView({behavior: 'smooth', block: 'start'});
      const hint = document.querySelector('#rc7MapHint');
      if (hint) hint.textContent = '지도를 움직이거나 원하는 곳을 눌러 위치를 선택하세요.';
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
        setTimeout(() => map?.invalidateSize(), 0);
      };
    }
    document.addEventListener('click', handleClick, true);
    document.addEventListener('input', event => {
      if (event.target.id === 'addressDetailInput') renderDraft();
    });
    syncMainAddress();
    const build = document.querySelector('.build-mark');
    if (build) build.textContent = '대동여수음식지도 RC7 주소·지도 UX 검수 후보';
  }

  window.rc7Initialize = initialize;
})();
