'use strict';

const ASSET_VERSION = 'phone-route-restoration-1';
const PHOTO_MANIFEST_URL = 'data/photo-manifest.json';
const PHOTO_POLICY_URL = 'data/photo-policy.json';
const NEIGHBORHOOD_URL = 'data/yeosu-neighborhoods.json';
const EXTERNAL_APP_KEYS = ['yogiyo', 'coupang', 'baemin'];
const LOW_FEE_KEYS = ['direct', 'mukkebi', 'ddangyo', 'ondongne', 'brand', 'phone'];
const LOCAL_DETAIL_KEYS = ['direct', 'mukkebi', 'ddangyo', 'ondongne', 'brand'];
const DETAIL_ONLY_KEYS = ['phone', 'chak'];
const FAVORITE_KEY = 'daedongFavoriteStoresV2';
const RECENT_KEY = 'daedongRecentStoresV2';
const FEEDBACK_QUEUE_KEY = 'daedongFeedbackQueueV1';
const VISITOR_KEY = 'daedongVisitorKeyV1';
const SELECTED_EXTERNAL_KEY = 'daedongSelectedExternalV1';
const SELECTED_ORDER_COMPAT_KEY = 'DaedongSelectedOrderApp';
const ADDRESS_KEY = 'daedongDeliveryAddressV2';
const ADDRESS_BOOK_KEY = 'daedongAddressBookV2';
const EXTERNAL_APP_DEPARTURE_KEY = 'daedongExternalAppDepartureV1';
const FEEDBACK_FORM_URL = 'https://www.notion.so/8ae3728176e344fdaee3475a97d03740';
const SMALL_BUSINESS_ASSOCIATION_URL = 'https://bit.ly/여수시소상공인연합회공지';
const ANALYTICS_ENDPOINT = 'https://daedong-yeosu-admin.sisakim.chatgpt.site/api/events';
const ANALYTICS_SESSION_KEY = 'daedongAnalyticsSessionV1';
const ANALYTICS_OWNER_EXCLUSION_KEY = 'daedongAnalyticsOwnerExcludedV1';
const ANALYTICS_OWNER_MODE_PARAM = 'owner_stats';
const ANALYTICS_REGION_1_ALIASES = new Map([
  ['서울', '서울특별시'], ['서울시', '서울특별시'], ['서울특별시', '서울특별시'],
  ['부산', '부산광역시'], ['부산시', '부산광역시'], ['부산광역시', '부산광역시'],
  ['대구', '대구광역시'], ['대구시', '대구광역시'], ['대구광역시', '대구광역시'],
  ['인천', '인천광역시'], ['인천시', '인천광역시'], ['인천광역시', '인천광역시'],
  ['광주', '광주광역시'], ['광주시', '광주광역시'], ['광주광역시', '광주광역시'],
  ['대전', '대전광역시'], ['대전시', '대전광역시'], ['대전광역시', '대전광역시'],
  ['울산', '울산광역시'], ['울산시', '울산광역시'], ['울산광역시', '울산광역시'],
  ['세종', '세종특별자치시'], ['세종시', '세종특별자치시'], ['세종특별자치시', '세종특별자치시'],
  ['경기', '경기도'], ['경기도', '경기도'],
  ['강원', '강원특별자치도'], ['강원도', '강원특별자치도'], ['강원특별자치도', '강원특별자치도'],
  ['충북', '충청북도'], ['충청북도', '충청북도'],
  ['충남', '충청남도'], ['충청남도', '충청남도'],
  ['전북', '전북특별자치도'], ['전라북도', '전북특별자치도'], ['전북특별자치도', '전북특별자치도'],
  ['전남', '전라남도'], ['전라남도', '전라남도'],
  ['경북', '경상북도'], ['경상북도', '경상북도'],
  ['경남', '경상남도'], ['경상남도', '경상남도'],
  ['제주', '제주특별자치도'], ['제주도', '제주특별자치도'], ['제주특별자치도', '제주특별자치도']
]);
let analyticsFallbackVisitorId = '';
let analyticsFallbackSessionId = '';

const APP_META = {
  direct: {label: '가게바로주문', icon: '🏪'},
  mukkebi: {label: '먹깨비', icon: 'assets/mukkebi-v7.png'},
  ddangyo: {label: '땡겨요', icon: 'assets/ddangyo-v7.png'},
  ondongne: {label: '온동네', icon: 'assets/ondongne.png'},
  brand: {label: '브랜드앱', icon: 'images/momstouch.jpg'},
  phone: {label: '전화주문', icon: '☎'},
  chak: {label: 'CHAK 지역상품권', icon: '💳'},
  naver: {label: '네이버지도', icon: '🗺️'},
  yogiyo: {label: '요기요'},
  coupang: {label: '쿠팡이츠'},
  baemin: {label: '배달의민족'}
};

const GLOBAL_EXTERNAL_APPS = {
  yogiyo: {label: '요기요'},
  coupang: {label: '쿠팡이츠'},
  baemin: {label: '배달의민족'}
};
const EXTERNAL_APP_NOTICE_TEXT = '앱 이름은 주문 경로 안내를 위해 표시되며, 대동여수음식지도와 해당 앱의 공식 제휴·후원을 의미하지 않습니다.';

function markExternalAppDeparture() {
  try { sessionStorage.setItem(EXTERNAL_APP_DEPARTURE_KEY, '1'); } catch {}
}
if (typeof window !== 'undefined') window.daedongMarkExternalAppDeparture = markExternalAppDeparture;

const BRAND_GROUPS = [
  {name: '치킨·버거', brands: [
    ['momstouch', '맘스터치', ['맘스터치'], 'images/momstouch.jpg'],
    ['bbq', 'BBQ', ['bbq', '비비큐'], null], ['bhc', 'BHC', ['bhc'], null],
    ['kyochon', '교촌치킨', ['교촌'], null], ['nene', '네네치킨', ['네네치킨'], null],
    ['60chicken', '60계치킨', ['60계'], null], ['ajukeo', '아주커치킨', ['아주커'], 'images/ajukeo.jpg'],
    ['gyedong', '계동치킨', ['계동치킨'], 'images/gyedong.jpg'], ['goobne', '굽네치킨', ['굽네'], null],
    ['puradak', '푸라닭', ['푸라닭'], null], ['cheogajip', '처갓집양념치킨', ['처갓집'], null],
    ['burgerking', '버거킹', ['버거킹'], 'images/burgerking.png'], ['lotteria', '롯데리아', ['롯데리아'], 'images/lotteria.jpg'],
    ['mcdonalds', '맥도날드', ['맥도날드'], 'images/mcdonalds.jpg'],
    ['nobrandburger', '노브랜드버거', ['노브랜드버거', '노브랜드 버거'], 'images/nobrandburger.png'],
    ['frankburger', '프랭크버거', ['프랭크버거'], 'images/frankburger.png']
  ]},
  {name: '피자', brands: [
    ['dominos', '도미노피자', ['도미노피자', '도미노 피자'], null], ['pizzahut', '피자헛', ['피자헛'], null],
    ['papajohns', '파파존스', ['파파존스'], null], ['mrpizza', '미스터피자', ['미스터피자'], null]
  ]},
  {name: '카페·디저트', brands: [
    ['mega', '메가MGC커피', ['메가커피', '메가mgc', '메가MGC'], null], ['compose', '컴포즈커피', ['컴포즈'], null],
    ['ediya', '이디야커피', ['이디야'], null], ['paik', '빽다방', ['빽다방'], null],
    ['twosome', '투썸플레이스', ['투썸'], null], ['starbucks', '스타벅스', ['스타벅스'], null],
    ['baskin', '배스킨라빈스', ['배스킨라빈스', '베스킨라빈스'], null], ['dunkin', '던킨', ['던킨'], null]
  ]},
  {name: '한식·분식·기타', brands: [
    ['doozzim', '두찜', ['두찜'], 'images/doozzim.jpg'], ['bonjuk', '본죽', ['본죽'], null],
    ['sinjeon', '신전떡볶이', ['신전떡볶이'], null], ['yupdduk', '동대문엽기떡볶이', ['엽기떡볶이', '엽떡'], null],
    ['jaws', '죠스떡볶이', ['죠스떡볶이'], null], ['subway', '써브웨이', ['써브웨이', '서브웨이'], null]
  ]}
].map(group => ({name: group.name, brands: group.brands.map(([id, label, aliases, icon]) => ({id, label, aliases, icon}))}));
const BRAND_BY_ID = Object.fromEntries(BRAND_GROUPS.flatMap(group => group.brands).map(brand => [brand.id, brand]));
const SEARCH_BRAND_ALIAS_GROUPS = [
  ['BBQ', '비비큐', 'BBQ치킨', '비비큐치킨']
];

const CATEGORY_PREFERRED = ['한식', '치킨', '피자', '중식', '분식/도시락', '분식', '족발/보쌈', '회/해산물', '국밥/찜/탕/찌개/조림', '면요리', '고기/구이', '돈까스/일식', '카페/디저트', '햄버거', '야식/주점', '마라탕/양꼬치', '샐러드/건강식', '도시락/죽', '반찬', '베이커리/떡', '아시안', '패스트푸드', '퓨전', '기타'];
const CATEGORY_ICON_SPRITE = 'assets/ui/category-icons-color.svg?v=category-first-paint-1';
const CATEGORY_ICON_RULES = [
  [/^전체$/, 'all'], [/마라|양꼬치/, 'mala'], [/치킨|닭/, 'chicken'], [/피자/, 'pizza'],
  [/중식|짜장|짬뽕/, 'chinese'], [/분식.*도시락|도시락.*분식/, 'lunchbox'], [/분식|떡볶이/, 'snack'],
  [/족발|보쌈/, 'pork'], [/회|해산물|초밥|선어|수산/, 'seafood'], [/국밥|찜|탕|찌개|조림/, 'stew'],
  [/면|국수|냉면|우동|라멘/, 'noodles'], [/고기|구이|삼겹|갈비/, 'grill'], [/돈가스|돈까스|일식/, 'japanese'],
  [/카페|디저트|빙수|아이스크림|커피/, 'dessert'], [/야식|주점|술집/, 'night'],
  [/햄버거|버거|샌드위치|토스트|핫도그/, 'burger'], [/반찬/, 'banchan'], [/베이커리|빵|떡/, 'bakery'],
  [/한식/, 'korean']
];
const HERO_BANNERS = Array.from({length: 17}, (_, index) => {
  const number = String(index + 1).padStart(2, '0');
  return {desktop: `images/${number}.png`, mobile: `images/${number}.png`, fallback: `images/${number}.png`, alt: `대동여수음식지도 배너 ${index + 1}`};
});
const PROMOS = [
  {kind: 'rider', title: '배송기사 모집', desc: '여수 지역 베테랑 기사님을 기다립니다.'},
  {kind: 'store', title: '배달대행 가맹점 모집', desc: '가게 사장님을 위한 주문·홍보·배달 연결'},
  {kind: 'join', title: '먹깨비·땡겨요·온동네 가입 안내', desc: '저수수료 주문경로를 한 번에 연결하세요.'},
  {kind: 'new', title: '신규 오픈 가게 광고', desc: '새로 문을 연 여수 가게를 빠르게 알립니다.'},
  {kind: 'notice', title: '소상공인협회 알림', desc: '여수 소상공인에게 필요한 소식을 전합니다.'}
];
const PROMO_CAROUSEL_DETAILS = {
  rider: {
    title: '배송기사님 모집',
    image: 'assets/promos/rider-recruitment-portrait-v2.webp',
    imageAlt: '대동여수음식지도 배송기사 모집 안내',
    imageWidth: 853,
    imageHeight: 1844,
    imageOnly: true
  },
  store: {
    image: 'assets/promos/merchant-recruitment-portrait-v2.webp',
    imageAlt: '대동여수음식지도 꼬르륵 배달대행 가맹점 모집 안내',
    imageWidth: 853,
    imageHeight: 1844,
    imageOnly: true
  },
  join: {
    phone: '010-4797-7803'
  },
  notice: {
    externalUrl: SMALL_BUSINESS_ASSOCIATION_URL,
    ariaLabel: '소상공인협회 공지 노션에서 자세히 보기',
    showCta: false
  }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const readLocalJson = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const writeLocalJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
function favoriteIds() { return readLocalJson(FAVORITE_KEY, []).map(String); }
function isFavorite(id) { return favoriteIds().includes(String(id)); }
function toggleFavorite(id) {
  const value = String(id), current = favoriteIds();
  const next = current.includes(value) ? current.filter(item => item !== value) : [value, ...current].slice(0, 100);
  writeLocalJson(FAVORITE_KEY, next);
  document.querySelectorAll(`[data-favorite-store="${CSS.escape(value)}"]`).forEach(button => {
    const active = next.includes(value);
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    const label = button.querySelector('[data-favorite-label]'); if (label) label.textContent = active ? '찜 해제' : '찜하기';
  });
  return next.includes(value);
}
function addRecentStore(store) {
  const current = readLocalJson(RECENT_KEY, []);
  writeLocalJson(RECENT_KEY, [{storeId: String(store.id), storeName: store.name, visitedAt: new Date().toISOString()}, ...current.filter(item => String(item.storeId) !== String(store.id))].slice(0, 50));
}
function visitorKey() {
  let key = localStorage.getItem(VISITOR_KEY);
  if (!key) { key = globalThis.crypto?.randomUUID?.() || `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`; localStorage.setItem(VISITOR_KEY, key); }
  return key;
}
function analyticsRandomId(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
function analyticsVisitorId() {
  try { return visitorKey(); }
  catch {
    if (!analyticsFallbackVisitorId) analyticsFallbackVisitorId = analyticsRandomId('visitor');
    return analyticsFallbackVisitorId;
  }
}
function analyticsSessionId() {
  try {
    let value = sessionStorage.getItem(ANALYTICS_SESSION_KEY);
    if (!value) { value = analyticsRandomId('session'); sessionStorage.setItem(ANALYTICS_SESSION_KEY, value); }
    return value;
  } catch {
    if (!analyticsFallbackSessionId) analyticsFallbackSessionId = analyticsRandomId('session');
    return analyticsFallbackSessionId;
  }
}
function analyticsOwnerExcluded() {
  try { return localStorage.getItem(ANALYTICS_OWNER_EXCLUSION_KEY) === '1'; }
  catch { return false; }
}
function applyAnalyticsOwnerMode() {
  const params = new URLSearchParams(location.search);
  const mode = String(params.get(ANALYTICS_OWNER_MODE_PARAM) || '').trim().toLowerCase();
  if (mode !== 'exclude' && mode !== 'include') return;
  try {
    if (mode === 'exclude') localStorage.setItem(ANALYTICS_OWNER_EXCLUSION_KEY, '1');
    else localStorage.removeItem(ANALYTICS_OWNER_EXCLUSION_KEY);
  } catch {}
  params.delete(ANALYTICS_OWNER_MODE_PARAM);
  const query = params.toString();
  const cleanUrl = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
  try { history.replaceState(history.state, '', cleanUrl); } catch {}
}
function analyticsEntryContext() {
  const params = new URLSearchParams(location.search);
  const explicit = String(params.get('source') || params.get('utm_source') || '').trim().toLowerCase();
  const storeId = String(params.get('hero') || params.get('store') || '').trim();
  let entrySource = 'direct';
  if (explicit === 'bitly' || explicit === 'legacy-bitly') entrySource = 'legacy-bitly';
  else if (explicit === 'store_qr_legacy') entrySource = 'store_qr_legacy';
  else if (explicit === 'store_qr') entrySource = 'store_qr';
  else if (params.has('hero')) entrySource = 'store_qr';
  else if (params.has('store')) entrySource = 'shared_link';
  else {
    try {
      const referrerHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
      if (referrerHost === 'bit.ly' || referrerHost.endsWith('.bitly.com')) entrySource = 'legacy-bitly';
    } catch {}
  }
  return {entrySource, storeId};
}
function analyticsRegionPart(value, depth) {
  const region = String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  if (!region || !/^[가-힣0-9·\s-]+$/.test(region)) return '';
  if (depth === 1) return ANALYTICS_REGION_1_ALIASES.get(region) || '';
  if (depth === 2) return /(?:시|군|구)$/.test(region) ? region : '';
  return /(?:동|읍|면|리|가)$/.test(region) ? region : '';
}
function analyticsCoarseRegion(input = {}) {
  const text = [input.address, input.label, input.area].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  let region1 = analyticsRegionPart(input.region1, 1);
  let region2 = analyticsRegionPart(input.region2, 2);
  let region3 = analyticsRegionPart(input.region3, 3);
  if (!region1) {
    region1 = ANALYTICS_REGION_1_ALIASES.get(text.split(/\s+/)[0]) || '';
  }
  if (!region2) {
    const match = text.match(/([가-힣]+시(?:\s+[가-힣]+구)?|[가-힣]+군|[가-힣]+구)(?=\s|$)/);
    region2 = analyticsRegionPart(match?.[1], 2);
  }
  if (!region3) {
    const matches = [...text.matchAll(/([가-힣0-9]+(?:동|읍|면|리|가))(?=\s|$)/g)];
    region3 = analyticsRegionPart(matches.at(-1)?.[1], 3);
  }
  const area = analyticsRegionPart(input.area, 3);
  if (!region3 && area) region3 = area;
  if (region3 && !region2 && (text.includes('여수') || input.area === region3)) {
    region1 ||= '전라남도';
    region2 = '여수시';
  }
  const rawSource = String(input.regionSource || '').trim();
  const allowedSources = new Set(['address_search', 'browser_geolocation', 'map_selection', 'saved_address']);
  const regionSource = allowedSources.has(rawSource)
    ? rawSource
    : input.type === 'current'
      ? 'browser_geolocation'
      : input.type === 'map'
        ? 'map_selection'
        : input.type === 'postcode'
          ? 'address_search'
          : 'saved_address';
  return {region1, region2, region3, regionSource};
}
function analyticsRegionContext() {
  const selected = readLocalJson(ADDRESS_KEY, null) || readLocalJson('savedLocation', null) || {};
  return analyticsCoarseRegion(selected);
}
function sendAnalyticsEvent(eventType, details = {}) {
  if (analyticsOwnerExcluded()) return;
  const entry = analyticsEntryContext();
  const region = analyticsRegionContext();
  const payload = {
    eventId: analyticsRandomId('event'),
    eventType,
    visitorId: analyticsVisitorId(),
    sessionId: analyticsSessionId(),
    entrySource: entry.entrySource,
    storeId: String(details.storeId || '').slice(0, 80),
    storeName: String(details.storeName || '').slice(0, 120),
    channel: String(details.channel || '').slice(0, 40),
    surface: String(details.surface || '').slice(0, 60),
    region1: region.region1,
    region2: region.region2,
    region3: region.region3,
    regionSource: region.regionSource,
    clientTime: new Date().toISOString()
  };
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.(ANALYTICS_ENDPOINT, new Blob([body], {type: 'text/plain;charset=UTF-8'}))) return;
  } catch {}
  try {
    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      body,
      headers: {'Content-Type': 'text/plain;charset=UTF-8'},
      mode: 'cors',
      credentials: 'omit',
      keepalive: true
    }).catch(() => {});
  } catch {}
}
function analyticsStoreForElement(element) {
  const id = String(
    element?.dataset?.phoneRouteStoreId ||
    element?.dataset?.storeId ||
    element?.closest?.('[data-store-id]')?.dataset?.storeId ||
    $('#modal')?.dataset?.activeStoreId ||
    ''
  );
  const store = stores.find(item => String(item.id) === id);
  return {storeId: id, storeName: store?.name || ''};
}
function analyticsChannelForElement(element) {
  const raw = String(
    element?.dataset?.routeKey ||
    element?.dataset?.communityOriginal ||
    element?.dataset?.detailOnly ||
    element?.dataset?.finalAppChannel ||
    (element?.hasAttribute?.('data-phone-route-store-id') || element?.hasAttribute?.('data-rc3-final-phone') ? 'phone' : '')
  );
  return raw === 'happy' ? 'happyorder' : raw;
}
function trackAnalyticsRouteClick(event) {
  if (!(event.target instanceof Element)) return;
  const route = event.target.closest(
    'a[data-route-key],a[data-community-original],a[data-final-app-channel],a[data-detail-only],a[data-phone-route-store-id],a[data-rc3-final-phone]'
  );
  if (!route) return;
  const channel = analyticsChannelForElement(route);
  if (!channel) return;
  const store = analyticsStoreForElement(route);
  sendAnalyticsEvent(['naver', 'chak'].includes(channel) ? 'utility_click' : 'order_click', {
    ...store,
    channel,
    surface: route.closest('#feeGuidePanel') ? 'order_guide' : 'store_detail'
  });
}
function selectedOrderSnapshot() {
  const candidates = [window.DaedongSelectedOrderApp, readLocalJson(SELECTED_EXTERNAL_KEY, null), readLocalJson(SELECTED_ORDER_COMPAT_KEY, null)];
  const selected = candidates.find(item => item && EXTERNAL_APP_KEYS.includes(item.key || item.appKey) && item.storeId && item.url);
  if (!selected) return null;
  const normalized = {...selected, key: selected.key || selected.appKey, appKey: selected.key || selected.appKey};
  window.DaedongSelectedOrderApp = normalized;
  return normalized;
}
function selectedExternalForStore(store) {
  const selected = selectedOrderSnapshot();
  if (!selected || String(selected.storeId) !== String(store.id) || Date.now() - Number(selected.selectedAt || 0) > 30 * 60 * 1000) return null;
  const route = routeFor(store, selected.key);
  const preservedUrl = safeHref(selected.url);
  if (!route || preservedUrl === '#') return null;
  return {...route, url: preservedUrl};
}
function rememberSelectedExternal(store, key) {
  const route = routeFor(store, key); if (!route) return null;
  const payload = {key, appKey:key, appName:APP_META[key]?.label || route.name, storeId:String(store.id), storeName:store.name, url:route.url, selectedAt:Date.now()};
  writeLocalJson(SELECTED_EXTERNAL_KEY, payload);
  writeLocalJson(SELECTED_ORDER_COMPAT_KEY, payload);
  window.DaedongSelectedOrderApp = payload;
  return payload;
}
function hydrateSelectedOrderApp() { const selected = selectedOrderSnapshot(); if (selected) window.DaedongSelectedOrderApp = selected; }

function isExplicitOutsideYeosuCurrent(item = {}) {
  if (String(item.type || '').trim() !== 'current') return false;
  const region2 = String(item.region2 || '').trim();
  return Boolean(region2) && !/(?:여수|yeosu)/i.test(region2);
}
function normalizeOutsideYeosuCurrent(item) {
  if (!item || typeof item !== 'object' || !isExplicitOutsideYeosuCurrent(item)) return item;
  return {
    ...item,
    label: '여수 외 지역 · 전체 가게 보기',
    address: '여수 외 지역 · 전체 가게 보기',
    area: '여수시 전체',
    coords: null,
    sortByDistance: false
  };
}
function loadSavedLocation() {
  try {
    const saved = normalizeOutsideYeosuCurrent(JSON.parse(localStorage.getItem('savedLocation') || 'null'));
    if (!saved || typeof saved !== 'object') return null;
    const lat = Number(saved.coords?.lat), lng = Number(saved.coords?.lng);
    return {
      label: String(saved.label || saved.address || '').trim() || '여수시 전체',
      area: String(saved.area || '').trim() || '여수시 전체',
      address: String(saved.address || saved.label || '').trim(),
      detail: String(saved.detail || '').trim(),
      coords: Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null,
      sortByDistance: Boolean(saved.sortByDistance && Number.isFinite(lat) && Number.isFinite(lng))
    };
  } catch { return null; }
}
const savedLocation = loadSavedLocation();
const LOCATION_CATEGORY_PRIORITY_OVERRIDES = {
  "피자": {
    "scope": "selected-neighborhoods",
    "neighborhoods": [
      "여서동",
      "문수동",
      "오림동"
    ],
    "orderedStoreIds": [
      "dc638b23f8cf3c5b",
      "a089d1d54720b48e",
      "abb76aa470e26f7a"
    ],
    "rotation": "time-cycle",
    "rotationIntervalMs": 60000,
    "labels": {
      "dc638b23f8cf3c5b": "도미노피자 문수점",
      "a089d1d54720b48e": "외계인피자 여수점",
      "abb76aa470e26f7a": "피자스쿨 여문점"
    }
  }
};
const state = {
  query: '', category: '전체', brandId: '', visibleCount: 40,
  location: savedLocation?.area || localStorage.getItem('location') || '여수시 전체',
  addressLabel: savedLocation?.label || localStorage.getItem('location') || '여수시 전체',
  coords: savedLocation?.coords || null,
  sortByDistance: savedLocation?.sortByDistance || false
};
let allStores = [];
let stores = [];
let canonicalStores = [];
let searchableStores = [];
let coordinateStores = [];
let categories = [];
let heroCarousel = null;
let promoCarousel = null;
let detailCarousel = null;
let photoResolver = null;
let addressDraft = null;
let yeosuNeighborhoods = [];
let neighborhoodByName = new Map();
let categoryPriorityOverrides = {...LOCATION_CATEGORY_PRIORITY_OVERRIDES};
let modalHistoryActive = false;
let ignoreNextPop = false;
let resolveCatalogReady;
window.daedongCatalogReady = new Promise(resolve => { resolveCatalogReady = resolve; });
function finishCatalogReady(value) {
  resolveCatalogReady?.(value);
  resolveCatalogReady = null;
}
window.setTimeout(() => {
  if (!resolveCatalogReady) return;
  console.warn('가게목록 준비 시간이 초과되어 나머지 화면을 먼저 엽니다.');
  finishCatalogReady([]);
}, 24000);

function normalize(value) { return String(value ?? '').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g, ''); }
function canonicalSearchAliases(raw) {
  const explicit = Array.isArray(raw.searchAliases) ? raw.searchAliases : [];
  const identity = normalize([raw.name, raw.realBusinessName, raw.brandName].filter(Boolean).join(' '));
  const brandAliases = SEARCH_BRAND_ALIAS_GROUPS.flatMap(group => group.some(alias => identity.includes(normalize(alias))) ? group : []);
  return [...new Set([...explicit, ...brandAliases].map(value => String(value).trim()).filter(Boolean))];
}
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'}[char])); }
function categoryIconId(name) {
  const value = String(name || '');
  return CATEGORY_ICON_RULES.find(([pattern]) => pattern.test(value))?.[1] || 'other';
}
function categoryIcon(name, className = 'category-inline-icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="${CATEGORY_ICON_SPRITE}#${categoryIconId(name)}"></use></svg>`;
}
function categoryButtonMarkup(name) {
  return `<button type="button" class="category glass-action ${state.category === name ? 'active' : ''}" data-cat="${escapeHtml(name)}">${categoryIcon(name, 'category-main-icon')}<span>${escapeHtml(name)}</span></button>`;
}
function safeHref(value) { let raw=String(value??'').trim();if(/^http:\/\/(?:www\.)?mukkebi\.com\//i.test(raw))raw=raw.replace(/^http:/i,'https:');if(!/^(?:https?:|tel:)/i.test(raw))return '#';try { const url = new URL(raw); return ['http:', 'https:', 'tel:'].includes(url.protocol) ? url.href : '#'; } catch { return '#'; } }
const DDANGYO_SHORT_HOST = 'fdofd.ddangyo.com';
const DDANGYO_RESOLVE_URL = 'https://fdofd.ddangyo.com/shorturl/view';
const DDANGYO_ANDROID_PACKAGE = 'com.shinhan.o2o';
const DDANGYO_RETRY_INTENT_KEY = 'daedongDdangyoRetryIntentV1';
function isAndroidBrowser() { return /Android/i.test(String(navigator.userAgent || '')); }
function ddangyoShortCode(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.hostname !== DDANGYO_SHORT_HOST || !/\/gateway1\.html$/i.test(url.pathname)) return '';
    return String(url.search || '').replace(/^\?/, '').split('&')[0].trim();
  } catch { return ''; }
}
function ddangyoHelpUrl(originUrl = '', routeUrl = '') {
  const url = new URL('ddangyo-open-help.html', location.href);
  url.searchParams.set('v', 'ddangyo-retry-touch-1');
  if (originUrl) url.searchParams.set('origin', originUrl);
  if (routeUrl) url.searchParams.set('route', routeUrl);
  return url.href;
}
async function resolveDdangyoOriginUrl(routeUrl) {
  const shortCode = ddangyoShortCode(routeUrl);
  if (!shortCode) throw new Error('invalid ddangyo short link');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const response = await fetch(DDANGYO_RESOLVE_URL, {
      method: 'POST', mode: 'cors', cache: 'no-store',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({dma_request:{short_url:shortCode}}), signal: controller.signal
    });
    if (!response.ok) throw new Error(`ddangyo resolve HTTP ${response.status}`);
    const data = await response.json();
    const originUrl = String(data?.result?.dma_short_url_info?.origin_url || '').trim();
    if (!originUrl.includes('menuUrl=') || !originUrl.includes('patsto_no=')) throw new Error('ddangyo store route unavailable');
    if (/[#;]/.test(originUrl) || !/^[-A-Za-z0-9%._~=&/?+]+$/.test(originUrl)) throw new Error('unsafe ddangyo route');
    return originUrl;
  } finally { clearTimeout(timer); }
}
function ddangyoAndroidIntent(originUrl, routeUrl = '') {
  const fallback = encodeURIComponent(ddangyoHelpUrl(originUrl, routeUrl));
  return `intent://o2o/deeplink/${originUrl}#Intent;scheme=ddangyo;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;package=${DDANGYO_ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end;`;
}
async function openDdangyoRoute(routeUrl) {
  const href = safeHref(routeUrl);
  if (href === '#') throw new Error('invalid ddangyo route');
  if (!isAndroidBrowser()) { location.assign(href); return; }
  try {
    const originUrl = await resolveDdangyoOriginUrl(href);
    const intent = ddangyoAndroidIntent(originUrl, href);
    sessionStorage.setItem(DDANGYO_RETRY_INTENT_KEY, intent);
    try { localStorage.setItem(DDANGYO_RETRY_INTENT_KEY, intent); } catch {}
    location.assign(intent);
  } catch (error) {
    console.warn('땡겨요 앱 연결주소를 준비하지 못했습니다.', error);
    location.assign(ddangyoHelpUrl('', href));
  }
}
function handleDdangyoOrderLinkClick(event) {
  if (!isAndroidBrowser() || !(event.target instanceof Element)) return;
  const link = event.target.closest('a[href]');
  if (!link) return;
  const key = String(link.dataset.routeKey || link.dataset.communityOriginal || link.dataset.finalAppChannel || '');
  if (key !== 'ddangyo') return;
  const href = safeHref(link.getAttribute('href'));
  if (href === '#') return;
  event.preventDefault(); event.stopImmediatePropagation();
  trackAnalyticsRouteClick(event);
  markExternalAppDeparture();
  if (typeof rc2RememberExternalReturn === 'function') rc2RememberExternalReturn();
  void openDdangyoRoute(href);
}
document.addEventListener('click', handleDdangyoOrderLinkClick, true);
const KAKAO_SAME_TAB_ORDER_KEYS = new Set(['mukkebi','ddangyo','ondongne','brand','happy','yogiyo','coupang','baemin']);
function isKakaoInAppBrowser() { return /KAKAOTALK/i.test(String(navigator.userAgent || '')); }
function handleKakaoOrderLinkClick(event) {
  if (!isKakaoInAppBrowser() || !(event.target instanceof Element)) return;
  const link = event.target.closest('a[href]');
  if (!link) return;
  const key = String(link.dataset.routeKey || link.dataset.communityOriginal || link.dataset.finalAppChannel || '');
  if (!KAKAO_SAME_TAB_ORDER_KEYS.has(key)) return;
  const href = safeHref(link.getAttribute('href'));
  if (href === '#') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  trackAnalyticsRouteClick(event);
  markExternalAppDeparture();
  if (typeof rc2RememberExternalReturn === 'function') rc2RememberExternalReturn();
  window.location.assign(href);
}
document.addEventListener('click', handleKakaoOrderLinkClick, true);
const MOBILE_SAME_TAB_ORDER_KEYS = new Set(['mukkebi','ddangyo','ondongne','brand','happy','yogiyo','coupang','baemin']);
function mobileOrderRouteKey(link) {
  const raw = String(
    link?.dataset?.routeKey ||
    link?.dataset?.communityOriginal ||
    link?.dataset?.finalAppChannel ||
    link?.dataset?.menuOrder ||
    link?.dataset?.menuStickyOrder ||
    link?.dataset?.menuStickyExternal ||
    link?.dataset?.menuExternalKey ||
    ''
  );
  return raw === 'coupang-eats' ? 'coupang' : raw;
}
function handleMobileOrderLinkClick(event) {
  if (!/(?:android|iphone|ipad|ipod)/i.test(String(navigator.userAgent || '')) || !(event.target instanceof Element)) return;
  const link = event.target.closest('a[href]');
  if (!link || !MOBILE_SAME_TAB_ORDER_KEYS.has(mobileOrderRouteKey(link))) return;
  const href = safeHref(link.getAttribute('href'));
  if (href === '#') return;
  event.preventDefault();
  event.stopImmediatePropagation();
  trackAnalyticsRouteClick(event);
  markExternalAppDeparture();
  if (typeof rc2RememberExternalReturn === 'function') rc2RememberExternalReturn();
  window.location.assign(href);
}
document.addEventListener('click', handleMobileOrderLinkClick, true);
function routeKey(name) {
  const text = normalize(name);
  if (text.includes('가게바로')) return 'direct';
  if (text.includes('먹깨비')) return 'mukkebi';
  if (text.includes('땡겨요')) return 'ddangyo';
  if (text.includes('온동네')) return 'ondongne';
  if (text.includes('브랜드앱')) return 'brand';
  if (text.includes('전화')) return 'phone';
  if (text.includes('chak') || text.includes('지역상품권')) return 'chak';
  if (text.includes('요기요')) return 'yogiyo';
  if (text.includes('쿠팡')) return 'coupang';
  if (text.includes('배달의민족') || text === '배민') return 'baemin';
  return 'brand';
}
function parseCoordinate(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
function neighborhoodsFor(value='') {
  const text=normalize(value);if(!text)return[];
  return yeosuNeighborhoods.filter(item=>{
    if([item.name,...(item.aliases||[])].some(alias=>text.includes(normalize(alias))))return true;
    const stem=normalize(item.name).replace(/동$/,'');
    return stem.length>=2&&text.includes(stem);
  }).map(item=>item.name);
}
function neighborhoodFor(value='') { return neighborhoodsFor(value)[0] || ''; }
function neighborhoodPoint(name) { const item=neighborhoodByName.get(name);return item&&Number.isFinite(Number(item.latitude))&&Number.isFinite(Number(item.longitude))?{lat:Number(item.latitude),lng:Number(item.longitude)}:null; }
function districtCoordinate(value) {
  const points=neighborhoodsFor(value).map(neighborhoodPoint).filter(Boolean);if(!points.length)return null;
  return {lat:points.reduce((sum,point)=>sum+point.lat,0)/points.length,lng:points.reduce((sum,point)=>sum+point.lng,0)/points.length};
}
function closestNeighborhoodForCoordinates(coords) {
  if (!coords || !Number.isFinite(Number(coords.lat)) || !Number.isFinite(Number(coords.lng))) return '';
  const point = {lat:Number(coords.lat), lng:Number(coords.lng)};
  return yeosuNeighborhoods
    .map(item => ({name:item.name, point:neighborhoodPoint(item.name)}))
    .filter(item => item.point)
    .map(item => ({...item, distance:haversine(point,item.point)}))
    .sort((a,b)=>a.distance-b.distance)[0]?.name || '';
}
function normalizedNeighborhoodNames(...values) {
  return [...new Set(values.flatMap(value => {
    if (Array.isArray(value)) return value.flatMap(item => neighborhoodsFor(item));
    return neighborhoodsFor(value);
  }).filter(Boolean))];
}
function imagePathFromValue(value) {
  if (typeof value === 'string') return value.trim();
  if (!value || typeof value !== 'object') return '';
  return String(value.detail || value.card || value.src || value.url || '').trim();
}
function uniquePaths(values) { return [...new Set(values.map(imagePathFromValue).filter(Boolean))]; }
function storeCategories(store) {
  const explicit = Array.isArray(store?.categories) ? store.categories.map(value => String(value || '').trim()).filter(Boolean) : [];
  return [...new Set(explicit.length ? explicit : [String(store?.cat || store?.category || '').trim()].filter(Boolean))];
}
function storeMatchesCategory(store, category) {
  return category === '전체' || category === '추천' || storeCategories(store).includes(category);
}
function categoriesFromStores(list) {
  const available = new Set((Array.isArray(list) ? list : []).flatMap(storeCategories));
  const ordered = categories.filter(category => available.has(category));
  return [...ordered, ...[...available].filter(category => !ordered.includes(category)).sort((a, b) => a.localeCompare(b, 'ko'))];
}
function customerNeighborhoodForPriority() {
  const selected = neighborhoodFor(state.location) || neighborhoodFor(state.addressLabel);
  if (selected || !state.coords) return selected;
  return yeosuNeighborhoods
    .map(item => ({name: item.name, point: neighborhoodPoint(item.name)}))
    .filter(item => item.point)
    .map(item => ({...item, distance: haversine(state.coords, item.point)}))
    .sort((a, b) => a.distance - b.distance)[0]?.name || '';
}
function categoryPriorityRule(category) {
  const rule = categoryPriorityOverrides?.[String(category || '')];
  if (!rule) return null;
  const scopedNeighborhoods = (rule.neighborhoods || []).map(String);
  if (scopedNeighborhoods.length && !scopedNeighborhoods.includes(customerNeighborhoodForPriority())) return null;
  return rule;
}
function categoryPriorityOrderedIdsForRule(rule, now = Date.now()) {
  const ids = (rule?.orderedStoreIds || []).map(String);
  if (rule?.rotation !== 'time-cycle' || ids.length < 2) return ids;
  const interval = Math.max(1000, Number(rule.rotationIntervalMs) || 60000);
  const offset = Math.floor(Number(now) / interval) % ids.length;
  return [...ids.slice(offset), ...ids.slice(0, offset)];
}
function categoryPriorityOrderedStoreIds(category) {
  return categoryPriorityOrderedIdsForRule(categoryPriorityRule(category));
}
function applyCategoryPriorityOverrides(list, category) {
  const input = Array.isArray(list) ? list : [];
  const rule = categoryPriorityRule(category);
  if (!rule) return input;
  const ordered = new Map(categoryPriorityOrderedIdsForRule(rule).map((id, index) => [id, index]));
  const top = new Set((rule.topStoreIds || []).map(String));
  const bottom = new Set((rule.bottomStoreIds || []).map(String));
  return input.map((item, index) => {
    const store = item?.store || item;
    const id = String(store?.id || store?.store_id || '');
    const orderedRank = ordered.get(id);
    const tier = orderedRank !== undefined ? orderedRank : ordered.size + (top.has(id) ? 0 : bottom.has(id) ? 2 : 1);
    return {item, index, tier};
  }).sort((a, b) => a.tier - b.tier || a.index - b.index).map(row => row.item);
}
function isCustomerUsableExternalRoute(key, value) {
  if (!EXTERNAL_APP_KEYS.includes(key)) return true;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const genericHosts = {
      baemin: new Set(['baemin.com', 'www.baemin.com']),
      yogiyo: new Set(['yogiyo.co.kr', 'www.yogiyo.co.kr']),
      coupang: new Set(['coupangeats.com', 'www.coupangeats.com', 'coupang.com', 'www.coupang.com'])
    };
    if (!genericHosts[key]?.has(host)) return true;
    const path = url.pathname.replace(/\/+$/, '') || '/';
    const genericPaths = key === 'yogiyo' ? new Set(['/', '/mobile']) : new Set(['/']);
    if (!genericPaths.has(path)) return true;
    const meaningfulQuery = [...url.searchParams.values()].some(item => String(item || '').trim());
    const meaningfulHash = decodeURIComponent(url.hash || '').replace(/^#\/?/, '').trim();
    return Boolean(meaningfulQuery || meaningfulHash);
  } catch { return false; }
}
function normalizedStore(raw, index) {
  const sourceRoutes = Array.isArray(raw?.routes) ? raw.routes : [];
  const routes = sourceRoutes
    .filter(route => route && route.enabled !== false && route.url && safeHref(route.url) !== '#')
    .map(route => {
      const key = routeKey(route.name);
      const url = safeHref(route.url);
      return {...route, key, url, customerUsable: isCustomerUsableExternalRoute(key, url)};
    });
  const area = raw.district || raw.area || '';
  const rawLat = parseCoordinate(raw.latitude ?? raw.lat);
  const rawLng = parseCoordinate(raw.longitude ?? raw.lng);
  const lat = rawLat !== null && rawLng !== null ? rawLat : null;
  const lng = rawLat !== null && rawLng !== null ? rawLng : null;
  const coordinateSource = rawLat !== null && rawLng !== null ? 'store' : '';
  const legacyImages = uniquePaths([raw.image, raw.img, ...(Array.isArray(raw.images) ? raw.images : [])]);
  const id = String(raw.store_id || raw.id || index);
  const name = raw.name || '이름 없는 가게';
  const brandName = raw.brandName || '';
  const branchName = raw.branchName || '';
  const primaryCategory = raw.category || raw.cat || '기타';
  const categoryValues = [...new Set(
    (Array.isArray(raw.categories) && raw.categories.length ? raw.categories : [primaryCategory])
      .map(value => String(value || '').trim())
      .filter(Boolean)
  )];
  const searchAliases = canonicalSearchAliases(raw);
  const searchIndex = normalize([name, raw.realBusinessName, brandName, branchName, area, primaryCategory, ...categoryValues, ...searchAliases, ...(raw.shopInShopNames || [])].filter(Boolean).join(' '));
  const addressNeighborhoods=/여수시/.test(String(raw.address||''))?neighborhoodsFor(raw.address):[];
  const branchText=[branchName,name].filter(Boolean).join(' '), branchNeighborhoods=/점|지점|항|지구/.test(branchText)?neighborhoodsFor(branchText):[];
  const notionNeighborhoods=neighborhoodsFor(area);
  const suppliedNeighborhoods=normalizedNeighborhoodNames(raw.neighborhoods||[]);
  const coordinateNeighborhood=lat!==null&&lng!==null?closestNeighborhoodForCoordinates({lat,lng}):'';
  const inferredNeighborhoods=addressNeighborhoods.length
    ? addressNeighborhoods
    : [...new Set([...suppliedNeighborhoods,...branchNeighborhoods,...notionNeighborhoods,...(coordinateNeighborhood?[coordinateNeighborhood]:[])])];
  const locationSource=addressNeighborhoods.length?'verified-address':suppliedNeighborhoods.length?'catalog-neighborhood':branchNeighborhoods.length?'store-name-branch':notionNeighborhoods.length?'notion-or-canonical-neighborhood':coordinateNeighborhood?'catalog-coordinate-neighborhood':'unresolved';
  return {
    id, store_id: id, name, realBusinessName: raw.realBusinessName || '',
    notionPageId: raw.notionPageId || '', notionUrl: raw.notionUrl || '', brandName, branchName, searchAliases, searchIndex,
    shopInShopNames: raw.shopInShopNames || [], area, cat: primaryCategory, categories: categoryValues,
    address: raw.address || '', phone: raw.phone || '', naverMap: safeHref(raw.naverMap || ''),
    legacyImage: legacyImages[0] || '', legacyImages,
    tags: [raw.category, raw.district, raw.address, ...(raw.shopInShopNames || [])].filter(Boolean), routes,
    managed: Boolean(raw.managed), sharedManaged: Boolean(raw.sharedManaged), pinPosition: raw.pinPosition,
    forceBottom: Boolean(raw.forceBottom), lat, lng, coordinateSource,
    channelKeys: Array.isArray(raw.channelKeys) ? [...new Set(raw.channelKeys.map(String))] : routes.map(route => route.key),
    hasMenu: Boolean(raw.hasMenu),
    neighborhoods: inferredNeighborhoods, primaryNeighborhood:inferredNeighborhoods[0]||'', locationSource, neighborhoodConfidence: locationSource==='store-name-branch'?'high':inferredNeighborhoods.length?'verified':'none', sourceType:raw.source?.type||'',
    addedAt:raw.addedAt||raw.createdAt||raw.importedAt||''
  };
}
function storeText(store) { return store.searchIndex || normalize([store.name, store.realBusinessName, ...store.shopInShopNames, store.area, store.cat, ...store.tags].join(' ')); }
function routeFor(store, key) { return (Array.isArray(store?.routes) ? store.routes : []).find(route => route?.key === key && route?.customerUsable !== false); }
function storeHasChannel(store, key) {
  if (routeFor(store, key)) return true;
  if (store?.__secureDetailReady === true && EXTERNAL_APP_KEYS.includes(key)) return false;
  return Boolean(store?.channelKeys?.includes?.(key));
}
function brandMatchesStore(store, brand) { const text = storeText(store); return brand.aliases.some(alias => text.includes(normalize(alias))); }
function brandCount(brand) { return stores.filter(store => brandMatchesStore(store, brand)).length; }
function haversine(a, b) {
  const R = 6371;
  const toRad = value => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

class PhotoResolver {
  constructor(manifest, policy) {
    this.manifest = manifest || {entries: []};
    this.policy = policy || {};
    this.byId = new Map();
    this.byName = new Map();
    for (const entry of this.manifest.entries || []) {
      if (entry.storeId) this.byId.set(String(entry.storeId), entry);
      for (const key of [entry.storeName, ...(entry.aliases || [])].filter(Boolean)) this.byName.set(normalize(key), entry);
    }
  }
  entryFor(store) { return this.byId.get(store.id) || this.byName.get(normalize(store.name)) || this.byName.get(normalize(store.realBusinessName)); }
  classificationAllowed(entry) {
    if (!entry || entry.blocked === true) return false;
    const classification = String(entry.classification || '').toLowerCase();
    if ((this.policy.blockedClassifications || []).includes(classification)) return false;
    return !(this.policy.requireExplicitAllowForPackageEntries !== false && entry.source !== 'notion' && !(this.policy.allowedClassifications || []).includes(classification));
  }
  suspiciousPath(path, store) {
    const hay = normalize([path, store?.name, store?.realBusinessName].join(' '));
    return (this.policy.blockedPathKeywords || []).some(keyword => hay.includes(normalize(keyword)));
  }
  validPath(path, store) {
    const value = String(path || '').trim();
    return Boolean(value && !this.suspiciousPath(value, store) && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(value) && !/\.(pdf|docx?|xlsx?|txt)(\?|$)/i.test(value));
  }
  resolveGallery(store) {
    const entry = this.entryFor(store);
    if (entry && this.classificationAllowed(entry)) {
      const paths = uniquePaths([entry.src, ...(entry.additionalSrcs || []), ...(entry.gallery || [])]).filter(path => this.validPath(path, store));
      if (paths.length) return paths.map(src => ({src, source: entry.source || 'manifest', classification: entry.classification}));
    }
    return uniquePaths(store.legacyImages || [store.legacyImage])
      .filter(path => this.validPath(path, store))
      .map(src => ({src, source: 'verified-legacy-direct-file', classification: 'legacy_unclassified'}));
  }
  resolve(store) { return this.resolveGallery(store)[0] || null; }
  markup(store, kind = 'card') {
    const photo = this.resolve(store);
    if (!photo) return placeholderMarkup(kind);
    const cls = kind === 'detail' ? 'detail-photo' : 'store-photo';
    return `<img class="${cls}" src="${escapeHtml(photo.src)}" alt="${escapeHtml(store.name)}" loading="lazy" data-photo-kind="${kind}" data-photo-source="${escapeHtml(photo.source)}">`;
  }
  galleryMarkup(store) {
    const photos = this.resolveGallery(store);
    if (!photos.length) return placeholderMarkup('detail');
    if (photos.length === 1) {
      const photo = photos[0];
      return `<div class="detail-single-photo"><img class="detail-photo" src="${escapeHtml(photo.src)}" alt="${escapeHtml(store.name)} 사진 1" loading="lazy" data-photo-kind="detail" data-photo-source="${escapeHtml(photo.source)}"></div>`;
    }
    return `<div id="detailPhotoCarousel" class="carousel-controller detail-photo-carousel" data-original-count="${photos.length}">
      <div class="carousel-shell detail-photo-frame">
        <button class="carousel-arrow prev" type="button" data-carousel-prev aria-label="이전 가게사진">‹</button>
        <div class="carousel-track">${photos.map((photo, index) => `<article class="carousel-slide detail-photo-slide"><img class="detail-photo" src="${escapeHtml(photo.src)}" alt="${escapeHtml(store.name)} 사진 ${index + 1}" loading="lazy" data-photo-kind="detail" data-photo-source="${escapeHtml(photo.source)}"></article>`).join('')}</div>
        <button class="carousel-arrow next" type="button" data-carousel-next aria-label="다음 가게사진">›</button>
      </div><div class="carousel-dots" aria-label="가게사진 위치"></div></div>`;
  }
}
function placeholderMarkup(kind = 'card') {
  const cls = kind === 'detail' ? 'detail-photo-placeholder' : 'photo-placeholder-card';
  return `<div class="${cls}" role="img" aria-label="사진 준비 중"><span>🍽️</span><b>검수된 음식 사진 준비 중</b></div>`;
}
function handleImageError(image) {
  if (!image.matches('[data-photo-kind]')) return;
  image.replaceWith(document.createRange().createContextualFragment(placeholderMarkup(image.dataset.photoKind || 'card')));
}

class InfiniteCarousel {
  constructor(root, {interval = 3500, onChange = null} = {}) {
    this.root = root;
    if (!root) return;
    this.shell = root.querySelector('.carousel-shell');
    this.track = root.querySelector('.carousel-track');
    this.dots = root.querySelector('.carousel-dots');
    this.prev = root.querySelector('[data-carousel-prev]');
    this.next = root.querySelector('[data-carousel-next]');
    this.interval = interval;
    this.onChange = typeof onChange === 'function' ? onChange : null;
    this.timer = null;
    this.dragStart = null;
    this.listeners = [];
    this.destroyed = false;
    this.current = 0;
    this.original = [...this.track.children];
    this.count = this.original.length;
    if (!this.count) return;
    this.build(); this.bind(); this.start();
  }
  build() {
    if (this.count > 1) {
      this.track.prepend(this.original[this.count - 1].cloneNode(true));
      this.track.append(this.original[0].cloneNode(true));
      this.current = 1;
    }
    this.jump(false); this.renderDots();
  }
  listen(target, type, handler, options) {
    if (!target?.addEventListener) return;
    target.addEventListener(type, handler, options);
    this.listeners.push({target, type, handler, options});
  }
  beginDrag(clientX, clientY) {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY) || this.dragStart !== null) return;
    this.dragStart = {x: clientX, y: clientY};
    this.stop();
  }
  finishDrag(clientX, clientY) {
    if (this.dragStart === null || !Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    const deltaX = clientX - this.dragStart.x;
    const deltaY = clientY - this.dragStart.y;
    this.dragStart = null;
    if (Math.abs(deltaX) > 38 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
      this.move(deltaX < 0 ? 1 : -1);
    }
    this.start();
  }
  cancelDrag() { this.dragStart = null; this.start(); }
  bind() {
    const bindArrow = (button, direction) => {
      if (!button) return;
      const stop = event => event.stopPropagation();
      this.listen(button, 'pointerdown', stop);
      this.listen(button, 'mousedown', stop);
      this.listen(button, 'touchstart', stop, {passive: true});
      this.listen(button, 'click', event => { event.stopPropagation(); this.stop(); this.move(direction); this.start(); });
    };
    bindArrow(this.prev, -1);
    bindArrow(this.next, 1);
    this.listen(this.track, 'transitionend', () => this.normalizePosition());
    this.listen(this.shell, 'dragstart', event => event.preventDefault());
    if ('PointerEvent' in window) {
      this.listen(this.shell, 'pointerdown', event => {
        this.beginDrag(event.clientX, event.clientY);
        try { this.shell.setPointerCapture?.(event.pointerId); } catch {}
      });
      this.listen(this.shell, 'pointerup', event => this.finishDrag(event.clientX, event.clientY));
      this.listen(this.shell, 'pointercancel', () => this.cancelDrag());
    } else {
      this.listen(this.shell, 'mousedown', event => this.beginDrag(event.clientX, event.clientY));
      this.listen(window, 'mouseup', event => this.finishDrag(event.clientX, event.clientY));
      this.listen(this.shell, 'touchstart', event => {
        const touch = event.touches[0];
        this.beginDrag(touch?.clientX, touch?.clientY);
      }, {passive: true});
      this.listen(this.shell, 'touchend', event => {
        const touch = event.changedTouches[0];
        this.finishDrag(touch?.clientX, touch?.clientY);
      }, {passive: true});
      this.listen(this.shell, 'touchcancel', () => this.cancelDrag(), {passive: true});
    }
    this.listen(this.root, 'focusin', () => this.stop());
    this.listen(this.root, 'focusout', () => this.start());
    this.listen(this.dots, 'click', event => {
      const button = event.target.closest('[data-slide]');
      if (button) this.goTo(Number(button.dataset.slide));
    });
  }
  logicalIndex() { return this.count <= 1 ? 0 : (this.current - 1 + this.count) % this.count; }
  renderDots() { if (!this.dots) return; this.dots.innerHTML = this.original.map((_, index) => `<button type="button" data-slide="${index}" aria-label="${index + 1}번째 슬라이드"></button>`).join(''); this.updateDots(); }
  updateDots() { if (this.dots) [...this.dots.children].forEach((dot, index) => dot.classList.toggle('active', index === this.logicalIndex())); this.onChange?.(this.logicalIndex(), this.count); }
  jump(animated = true) { if (!this.count) return; this.track.classList.toggle('is-animated', animated); this.track.style.transform = `translate3d(-${this.current * 100}%,0,0)`; this.updateDots(); }
  normalizeCurrent() {
    if (this.count <= 1) return;
    if (this.current <= 0 || this.current >= this.count + 1) {
      const logical = ((this.current - 1) % this.count + this.count) % this.count;
      this.current = logical + 1;
      this.jump(false);
    }
  }
  move(direction) {
    if (this.count <= 1) return;
    this.normalizeCurrent();
    this.current += direction;
    this.jump(true);
    clearTimeout(this.normalizeTimer);
    this.normalizeTimer = setTimeout(() => this.normalizePosition(), 520);
  }
  goTo(index) { if (this.count <= 1) return; this.current = Math.max(0, Math.min(this.count - 1, index)) + 1; this.jump(true); this.restart(); }
  normalizePosition() { this.normalizeCurrent(); }
  start() { if (this.destroyed || this.count <= 1 || this.timer || !(this.interval > 0)) return; this.timer = setInterval(() => this.move(1), this.interval); }
  stop() { if (this.timer) { clearInterval(this.timer); this.timer = null; } }
  restart() { this.stop(); this.start(); }
  destroy() {
    this.destroyed = true;
    this.stop();
    clearTimeout(this.normalizeTimer);
    this.dragStart = null;
    this.listeners.forEach(({target, type, handler, options}) => target.removeEventListener(type, handler, options));
    this.listeners = [];
  }
}

function renderHero() {
  $('#heroTrack').innerHTML = HERO_BANNERS.map((banner, index) => `<article class="carousel-slide hero-slide" data-hero-index="${index}"><picture><source media="(max-width:520px)" srcset="${banner.mobile}"><img src="${banner.desktop}" alt="${banner.alt}" width="1200" height="700" decoding="async" fetchpriority="${index === 0 ? 'high' : 'auto'}" loading="${index === 0 ? 'eager' : 'lazy'}" onerror="this.onerror=null;this.src='${banner.fallback}'"></picture></article>`).join('');
  heroCarousel = new InfiniteCarousel($('#heroCarousel'), {interval: 3500});
}
function renderPromos() {
  $('#promoTrack').innerHTML = PROMOS.map(promo => {
    const details = PROMO_CAROUSEL_DETAILS[promo.kind];
    const title = details?.title || promo.title;
    const description = promo.kind === 'rider' ? '' : promo.desc;
    const interactive = Boolean(details);
    const showCta = interactive && details.showCta !== false;
    const content = `<b>${escapeHtml(title)}</b>${description ? `<span>${escapeHtml(description)}</span>` : ''}${details?.phone ? `<span class="promo-phone">가입 문의 ${escapeHtml(details.phone)}</span>` : ''}${showCta ? '<span class="promo-cta">자세히보기 <small>(화면터치)</small></span>' : ''}`;
    if (interactive) {
      return `<button type="button" class="carousel-slide promo-card ${promo.kind} is-interactive" data-promo-kind="${escapeHtml(promo.kind)}" aria-label="${escapeHtml(details.ariaLabel || `${title} 자세히보기`)}">${content}</button>`;
    }
    return `<article class="carousel-slide promo-card ${promo.kind}">${content}</article>`;
  }).join('');
  promoCarousel = new InfiniteCarousel($('#promoCarousel'), {interval: 3500});
}
function openPromoCarouselDetail(kind) {
  const promo = PROMOS.find(item => item.kind === kind);
  const details = PROMO_CAROUSEL_DETAILS[kind];
  if (!promo || !details) return;
  const title = details.title || promo.title;
  if (details.externalUrl) {
    try {
      const url = new URL(details.externalUrl, location.href);
      if (url.protocol === 'https:') location.assign(url.href);
    } catch (error) {
      console.warn('Invalid lower promo URL', error);
    }
    return;
  }
  if (details.image) {
    const heading = details.imageOnly ? `<h2 id="modalTitle" class="promo-visually-hidden">${escapeHtml(title)}</h2>` : `<h2 id="modalTitle">${escapeHtml(title)}</h2>`;
    const detailClass = details.imageOnly ? 'promo-detail promo-detail-image-only' : 'promo-detail';
    openModal(`<div class="${detailClass}">${heading}<img src="${escapeHtml(details.image)}" alt="${escapeHtml(details.imageAlt)}" width="${details.imageWidth || 1760}" height="${details.imageHeight || 894}" decoding="async"></div>`);
    return;
  }
  openModal(`<div class="promo-signup-detail"><h2 id="modalTitle">${escapeHtml(title)}</h2><p>${escapeHtml(promo.desc)}</p><strong>가입 문의 ${escapeHtml(details.phone)}</strong></div>`);
}
function appIcon(key, cls = '') {
  const meta = APP_META[key]; if (!meta) return '';
  if (EXTERNAL_APP_KEYS.includes(key)) return `<span class="${escapeHtml(`${cls} external-app-text-mark`.trim())}" aria-label="${escapeHtml(meta.label)}">${escapeHtml(meta.label)}</span>`;
  if (String(meta.icon).includes('/') || String(meta.icon).startsWith('http')) return `<img class="${cls}" src="${meta.icon}" alt="${meta.label}">`;
  return `<span class="${cls} miniemoji">${meta.icon}</span>`;
}
function externalAppNoticeMarkup() {
  return `<p class="external-app-notice" role="note"><span aria-hidden="true">ⓘ</span><span>${escapeHtml(EXTERNAL_APP_NOTICE_TEXT)}</span></p>`;
}
function mainCategories() {
  const preferred = CATEGORY_PREFERRED.filter(name => categories.includes(name));
  const remaining = categories.filter(name => !preferred.includes(name));
  return [...preferred, ...remaining].slice(0, 12);
}
function renderCategoryGrid() {
  const grid = $('#categoryGrid');
  if (!grid) return;
  const names = ['전체', ...mainCategories().filter(name => name !== '전체')];
  const signature = `${state.category}\u0000${names.join('\u0000')}`;
  if (grid.dataset.categorySignature === signature) return;
  grid.innerHTML = names.map(categoryButtonMarkup).join('');
  grid.dataset.categorySignature = signature;
}
function renderCategories() { renderCategoryGrid(); }
function relevance(store, query) {
  const q = normalize(query); if (!q) return 1;
  const name = normalize(store.name), text = storeText(store);
  if (name === q) return 100; if (name.startsWith(q)) return 90; if (name.includes(q)) return 80;
  if (normalize(store.cat).includes(q)) return 70; if (normalize(store.area).includes(q)) return 60;
  return text.includes(q) ? 50 : 0;
}
function storeNeighborhoods(store) {
  return normalizedNeighborhoodNames(
    Array.isArray(store?.neighborhoods)?store.neighborhoods:[],
    [store?.primaryNeighborhood,store?.area,store?.district,store?.address,store?.name].filter(Boolean).join(' ')
  );
}
function storeMatchesLocation(store, location) {
  const selected=neighborhoodFor(location); if(!selected)return normalize(store.area).includes(normalize(location));
  return storeNeighborhoods(store).includes(selected);
}
function filteredStores() {
  const brand = state.brandId ? BRAND_BY_ID[state.brandId] : null;
  const list = stores.map(store => ({store, score: relevance(store, state.query), distance: state.coords && store.lat !== null && store.lng !== null ? haversine(state.coords, {lat: store.lat, lng: store.lng}) : null}))
    .filter(item => item.score > 0)
    .filter(({store}) => state.sortByDistance || state.location === '여수시 전체' || storeMatchesLocation(store,state.location))
    .filter(({store}) => storeMatchesCategory(store, state.category))
    .filter(({store}) => !brand || brandMatchesStore(store, brand))
    .sort((a, b) => {
      if (state.sortByDistance) {
        if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
        if (a.distance !== null) return -1;
        if (b.distance !== null) return 1;
      }
      const aPin = Number.isFinite(Number(a.store.pinPosition)) ? Number(a.store.pinPosition) : 9999;
      const bPin = Number.isFinite(Number(b.store.pinPosition)) ? Number(b.store.pinPosition) : 9999;
      if (aPin !== bPin) return aPin - bPin;
      if (a.store.forceBottom !== b.store.forceBottom) return a.store.forceBottom ? 1 : -1;
      if (a.store.managed !== b.store.managed) return a.store.managed ? -1 : 1;
      if (a.store.sharedManaged !== b.store.sharedManaged) return a.store.sharedManaged ? -1 : 1;
      return b.score - a.score || a.store.name.localeCompare(b.store.name, 'ko');
    }).map(item => ({...item.store, distance: item.distance}));
  return applyCategoryPriorityOverrides(list, state.category);
}
function miniRoutes(store) {
  const keys = ['direct', 'mukkebi', 'ddangyo', 'ondongne', 'brand', 'yogiyo', 'coupang', 'baemin'];
  return keys.filter(key => storeHasChannel(store, key)).slice(0, 6).map(key => appIcon(key, 'miniapp-icon')).join('');
}
function storeCard(store) {
  const distanceLabel = store.coordinateSource === 'district-centroid' ? '동네 중심 기준 약' : '현재 위치에서 약';
  const distance = Number.isFinite(store.distance)
    ? `<span class="distance-note">${distanceLabel} ${store.distance < 1 ? `${Math.round(store.distance * 1000)}m` : `${store.distance.toFixed(1)}km`}</span>`
    : state.sortByDistance ? '<span class="distance-note distance-pending">거리 정보 준비 중</span>' : '';
  const favorite = isFavorite(store.id);
  return `<article class="store-card" data-id="${escapeHtml(store.id)}">${photoResolver.markup(store, 'card')}<div class="store-info"><h3 title="${escapeHtml(store.name)}">${escapeHtml(store.name)}</h3><p>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</p>${distance}<div class="miniapps">${miniRoutes(store)}</div></div><button class="card-favorite ${favorite ? 'active' : ''}" type="button" data-favorite-store="${escapeHtml(store.id)}" aria-pressed="${favorite}">♥ <span data-favorite-label>${favorite ? '찜 해제' : '찜하기'}</span></button></article>`;
}
function renderStores({scroll = false, resetCount = false} = {}) {
  if (resetCount) state.visibleCount = 40;
  const list = filteredStores(), visible = list.slice(0, state.visibleCount);
  let title = '오늘의 추천';
  if (state.brandId) title = `${BRAND_BY_ID[state.brandId].label} 가게`;
  else if (state.category !== '전체' && state.sortByDistance) title = `${state.category} 가까운 가게`;
  else if (state.category !== '전체') title = `${state.category} 가게`;
  else if (state.query) title = `'${state.query}' 검색 결과`;
  else if (state.sortByDistance) title = '내 위치에서 가까운 가게';
  else if (state.location !== '여수시 전체') title = `${state.location} 추천`;
  $('#recommendSection h2').textContent = title;
  $('#resetCategoryBtn').hidden = state.category === '전체' && !state.brandId && !state.query;
  $('#storeGrid').innerHTML = visible.length ? visible.map(storeCard).join('') : '<div class="empty">조건에 맞는 가게가 아직 없습니다.</div>';
  $('#loadMoreBtn').hidden = visible.length >= list.length || !list.length;
  $('#loadMoreBtn').textContent = '더보기';
  const filters = [];
  if (state.query) filters.push(`검색어 ${state.query}`);
  if (state.category !== '전체') filters.push(state.category);
  if (state.brandId) filters.push(BRAND_BY_ID[state.brandId].label);
  if (state.sortByDistance) filters.push('현재 위치순'); else if (state.location !== '여수시 전체') filters.push(state.location);
  $('#searchSummary').hidden = !filters.length;
  $('#searchSummary').innerHTML = filters.length ? `<span>${filters.map(escapeHtml).join(' · ')}</span><button id="clearSearch" class="text-btn" type="button">검색·카테고리 초기화</button>` : '';
  renderCategories();
  if (scroll) $('#recommendSection').scrollIntoView({behavior: 'smooth', block: 'start'});
}

let instantScrollRestoreFrame = 0;
let instantScrollRestoreStyle = null;
function scrollWindowInstant(top) {
  const root = document.documentElement;
  if (!instantScrollRestoreStyle) {
    instantScrollRestoreStyle = {
      value: root.style.getPropertyValue('scroll-behavior'),
      priority: root.style.getPropertyPriority('scroll-behavior')
    };
  }
  root.style.setProperty('scroll-behavior', 'auto', 'important');
  window.scrollTo({top: Math.max(0, Number(top) || 0), left: 0, behavior: 'auto'});
  if (instantScrollRestoreFrame) cancelAnimationFrame(instantScrollRestoreFrame);
  instantScrollRestoreFrame = requestAnimationFrame(() => {
    const saved = instantScrollRestoreStyle;
    instantScrollRestoreFrame = 0;
    instantScrollRestoreStyle = null;
    if (saved?.value) root.style.setProperty('scroll-behavior', saved.value, saved.priority);
    else root.style.removeProperty('scroll-behavior');
  });
}
function showHomeAfterAddressCommit() {
  state.query = '';
  state.category = '전체';
  state.brandId = '';
  const search = $('#mainSearch');
  if (search) search.value = '';
  const clear = $('#clearMainSearch');
  if (clear) clear.hidden = true;
  renderStores({resetCount: true});
  requestAnimationFrame(() => {
    const hero = $('.hero');
    if (!hero) { scrollWindowInstant(0); return; }
    const navHeight = $('.bottom-nav')?.getBoundingClientRect().height || 0;
    const usableHeight = Math.max(240, window.innerHeight - navHeight - 12);
    const heroTop = window.scrollY + hero.getBoundingClientRect().top;
    scrollWindowInstant(heroTop + hero.offsetHeight - usableHeight);
  });
}

function lockPage() {
  if (document.body.classList.contains('modal-open')) return;
  const top = window.scrollY || document.documentElement.scrollTop || 0;
  document.body.dataset.lockScrollY = String(top);
  document.documentElement.classList.add('modal-open'); document.body.classList.add('modal-open');
  Object.assign(document.body.style, {position:'fixed', top:`-${top}px`, left:'0', right:'0', width:'100%', overflow:'hidden'});
}
function unlockPage() {
  const top = Number(document.body.dataset.lockScrollY || 0);
  delete document.body.dataset.lockScrollY;
  document.documentElement.classList.remove('modal-open'); document.body.classList.remove('modal-open');
  for (const property of ['position','top','left','right','width','overflow']) document.body.style.removeProperty(property);
  scrollWindowInstant(top);
}
function layerStillOpen() {
  return !$('#modal')?.hidden || !$('#startupAd')?.hidden;
}
function classifyModal() {
  const modal = $('#modal'); if (!modal) return;
  modal.className = 'modal';
  if ($('#modalContent .store-detail')) modal.classList.add('store-modal');
  else if ($('#modalContent .app-browser')) modal.classList.add('app-browser-modal');
  else if ($('#modalContent .community-guide')) modal.classList.add('community-guide-modal');
  else if ($('#modalContent .feedback-sheet')) modal.classList.add('feedback-modal');
  else if ($('#modalContent .address-single-sheet')) modal.classList.add('address-modal');
  else if ($('#modalContent .promo-detail-image-only')) modal.classList.add('promo-detail-modal', 'promo-image-only-modal');
  else if ($('#modalContent .promo-detail')) modal.classList.add('promo-detail-modal');
  else if ($('#modalContent .promo-signup-detail')) modal.classList.add('promo-signup-modal');
}
function openModal(html) {
  const modal = $('#modal'), wasHidden = modal.hidden;
  detailCarousel?.destroy(); detailCarousel = null;
  $('#modalContent').innerHTML = html;
  classifyModal();
  $('#overlay').hidden = false; modal.hidden = false; lockPage();
  if (wasHidden && !history.state?.daedongModal) { history.pushState({daedongModal:true}, ''); modalHistoryActive = true; }
  setTimeout(() => $('.modal-close')?.focus(), 0);
}
function hardClose({fromPop = false} = {}) {
  detailCarousel?.destroy(); detailCarousel = null;
  const modal = $('#modal'); if (modal) { modal.hidden = true; modal.className = 'modal'; modal.removeAttribute('data-app-browser-key'); modal.removeAttribute('data-app-browser-category'); modal.removeAttribute('data-active-store-id'); }
  if ($('#modalContent')) $('#modalContent').innerHTML = '';
  if ($('#overlay')) $('#overlay').hidden = true;
  if ($('#moreAppsPopover')) $('#moreAppsPopover').hidden = true;
  if ($('#startupAd')) $('#startupAd').hidden = true;
  unlockPage(); modalHistoryActive = false;
  if (!fromPop && history.state?.daedongModal) { ignoreNextPop = true; history.back(); }
}
function closeModal(options = {}) { hardClose(options); }
window.hardClose = hardClose; window.hideModal = hardClose; window.closeModal = hardClose;
function guide() {
  openModal(`<h2 id="modalTitle">원하는 방법으로 편하게 주문하세요</h2><p>가게마다 이용 가능한 주문방법을 한눈에 확인할 수 있습니다. 가게를 먼저 선택한 뒤 원하는 경로를 확인해 주세요.</p>`);
}
function appBrowserPhoto(store) {
  const photo = photoResolver.resolve(store);
  return photo ? `<img class="app-browser-photo" src="${escapeHtml(photo.src)}" alt="${escapeHtml(store.name)}" loading="lazy" data-photo-kind="card">` : `<span class="app-browser-photo-placeholder">${categoryIcon(store.cat, 'category-placeholder-icon')}</span>`;
}
function appRegisteredStores(key) {
  return stores.filter(store => storeHasChannel(store, key)).map(store => ({store, distance: state.coords && store.lat !== null && store.lng !== null ? haversine(state.coords, {lat: store.lat, lng: store.lng}) : null})).sort((a, b) => {
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    if (a.distance !== null) return -1; if (b.distance !== null) return 1;
    const aPin = Number.isFinite(Number(a.store.pinPosition)) ? Number(a.store.pinPosition) : 9999;
    const bPin = Number.isFinite(Number(b.store.pinPosition)) ? Number(b.store.pinPosition) : 9999;
    return aPin - bPin || a.store.name.localeCompare(b.store.name, 'ko');
  }).map(item => ({...item.store, appDistance: item.distance}));
}
function appBrowserMarkup(key, selectedCategory = '추천') {
  const meta = APP_META[key], all = appRegisteredStores(key);
  const isExternal = EXTERNAL_APP_KEYS.includes(key);
  const categoriesForApp = categoriesFromStores(all).sort((a,b) => {
    const ai=CATEGORY_PREFERRED.indexOf(a), bi=CATEGORY_PREFERRED.indexOf(b); return (ai<0?999:ai)-(bi<0?999:bi)||a.localeCompare(b,'ko');
  });
  const filtered = selectedCategory === '추천' ? all : all.filter(store => storeMatchesCategory(store, selectedCategory));
  const list = applyCategoryPriorityOverrides(filtered, selectedCategory);
  const chips = `<nav class="app-browser-category-chips" aria-label="음식 카테고리"><button type="button" data-app-category="추천" class="${selectedCategory === '추천' ? 'active' : ''}">추천</button>${categoriesForApp.map(category => `<button type="button" data-app-category="${escapeHtml(category)}" class="${selectedCategory === category ? 'active' : ''}">${categoryIcon(category, 'category-chip-icon')} ${escapeHtml(category)}</button>`).join('')}</nav>`;
  const cards = list.map(store => `<button type="button" class="app-browser-card" data-app-store-id="${escapeHtml(store.id)}" data-app-key="${key}">${appBrowserPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}${Number.isFinite(store.appDistance) ? ` · ${store.appDistance < 1 ? `${Math.round(store.appDistance*1000)}m` : `${store.appDistance.toFixed(1)}km`}` : ''}</small><span class="app-browser-only-icon">${isExternal ? `<span class="external-app-card-label">${escapeHtml(meta.label)}</span>` : appIcon(key,'app-browser-app-icon')}</span></span><b>›</b></button>`).join('');
  return `<section class="app-browser" data-app-key="${key}" data-app-category-current="${escapeHtml(selectedCategory)}"><header class="app-browser-head${isExternal ? ' external-app-browser-head' : ''}">${isExternal ? '' : appIcon(key,'app-browser-head-icon')}<div><h2 id="modalTitle">${escapeHtml(meta.label)} 등록 가게</h2><p>${escapeHtml(meta.label)}에 실제 주문주소가 등록된 가게만 보여드립니다.</p></div></header>${chips}<div class="app-browser-list">${cards || '<div class="empty">해당 조건의 가게가 없습니다.</div>'}</div>${isExternal ? externalAppNoticeMarkup() : ''}</section>`;
}
function openAppBrowser(key, selectedCategory = '추천') {
  if (!GLOBAL_EXTERNAL_APPS[key]) return;
  openModal(appBrowserMarkup(key, selectedCategory));
  $('#modal').dataset.appBrowserKey = key; $('#modal').dataset.appBrowserCategory = selectedCategory;
}
function globalExternalGuide(key) { openAppBrowser(key); }
function savedStoreList(title, ids, emptyText) {
  const list = ids.map(id => stores.find(store => String(store.id) === String(id))).filter(Boolean);
  openModal(`<section class="personal-list-sheet"><h2 id="modalTitle">${escapeHtml(title)}</h2><div class="personal-store-list">${list.length ? list.map(store => `<button type="button" class="personal-store-row" data-personal-store="${escapeHtml(store.id)}">${appBrowserPhoto(store)}<span><b>${escapeHtml(store.name)}</b><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</small></span><i>›</i></button>`).join('') : `<p class="personal-empty">${escapeHtml(emptyText)}</p>`}</div></section>`);
}
function favoritesModal() { savedStoreList('찜한 가게', favoriteIds(), '아직 찜한 가게가 없습니다.'); }
function recentModal() { savedStoreList('최근 방문 가게', readLocalJson(RECENT_KEY, []).map(item => String(item.storeId ?? item.id ?? item)), '아직 방문한 가게가 없습니다.'); }
function feedbackModal(store) {
  const appOptions = ['해당 없음','먹깨비','땡겨요','온동네','배달의민족','쿠팡이츠','요기요','가게바로주문','전화주문'];
  const channels=['먹깨비','땡겨요','온동네','요기요','쿠팡이츠','배달의민족','브랜드앱 상담','전화주문 등록','기타 확인이 필요한 기존 주문채널'];
  openModal(`<section class="feedback-sheet" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">정보 수정 요청</h2><p>입력한 내용은 다른 고객에게 공개되지 않습니다.</p><form id="storeFeedbackForm"><label>가게명<input name="storeName" value="${escapeHtml(store.name)}" readonly required></label><label>요청 종류<select name="issueType" data-rc3-issue-type required><option value="">선택하세요</option><option>사진 오류</option><option>전화번호 오류</option><option>주문앱에서 가게 없음</option><option>폐업·휴업 의심</option><option>주소·위치 오류</option><option>사장님 주문앱 입점 신청</option></select></label><label data-rc3-related-app>관련 주문앱<select name="app">${appOptions.map(item => `<option>${item}</option>`).join('')}</select></label><div class="feedback-app-fields" data-rc3-application-fields hidden><label>신청자 이름<input name="applicantName" disabled></label><label>연락 가능한 전화번호<input name="contactPhone" inputmode="tel" disabled></label><label>가게와의 관계<select name="relationship" disabled><option value="">선택하세요</option><option>사장님</option><option>직원</option><option>기타</option></select></label><fieldset><legend>희망 주문앱</legend><div class="feedback-channel-list">${channels.map(channel=>`<label><input type="checkbox" name="channels" value="${escapeHtml(channel)}" disabled><span>${escapeHtml(channel)}</span></label>`).join('')}</div></fieldset><label class="feedback-consent"><input type="checkbox" name="privacyConsent" value="동의" disabled><span>개인정보 수집·연락에 동의합니다.</span></label></div><button type="submit" class="feedback-submit">접수 내용 준비하기</button></form><small>전송 전 비공개 접수폼에서 내용을 다시 확인할 수 있습니다.</small></section>`);
}
async function submitFeedback(form) {
  const store = stores.find(item => String(item.id) === String(form.closest('.feedback-sheet')?.dataset.storeId)); if (!store) return;
  const data = new FormData(form); const report = {reportId: globalThis.crypto?.randomUUID?.() || `report-${Date.now()}`, storeId:String(store.id), storeName:store.name, issueType:String(data.get('issueType')||''), app:String(data.get('app')||'해당 없음'), details:String(data.get('details')||''), reporterKey:visitorKey(), pageUrl:location.href, createdAt:new Date().toISOString(), status:'접수 대기'};
  writeLocalJson(FEEDBACK_QUEUE_KEY,[report,...readLocalJson(FEEDBACK_QUEUE_KEY,[])].slice(0,100));
  const text=[`요청 제목: ${report.storeName} 정보 수정 요청`,`가게 ID: ${report.storeId}`,`가게명: ${report.storeName}`,`요청 유형: ${report.issueType}`,`주문앱: ${report.app}`,`상세 내용: ${report.details||'없음'}`,`신고자 식별키: ${report.reporterKey}`,`페이지 URL: ${report.pageUrl}`].join('\n');
  try { await navigator.clipboard?.writeText(text); } catch {}
  openModal(`<section class="feedback-complete"><h2 id="modalTitle">접수 내용을 준비했습니다</h2><p>아래 비공개 접수폼을 열면 가게를 다시 찾을 필요 없이 지금 작성한 내용을 붙여넣을 수 있습니다.</p><a href="${FEEDBACK_FORM_URL}" target="_blank" rel="noopener">비공개 접수폼 열기</a><button type="button" data-feedback-copy="${escapeHtml(report.reportId)}">접수 내용 다시 복사</button></section>`);
}
function copyQueuedReport(reportId) {
  const report=readLocalJson(FEEDBACK_QUEUE_KEY,[]).find(item=>item.reportId===reportId); if(!report)return;
  const text=[`요청 제목: ${report.storeName} 정보 수정 요청`,`가게 ID: ${report.storeId}`,`가게명: ${report.storeName}`,`요청 유형: ${report.issueType}`,`주문앱: ${report.app}`,`상세 내용: ${report.details||'없음'}`,`신고자 식별키: ${report.reporterKey}`,`페이지 URL: ${report.pageUrl}`].join('\n'); navigator.clipboard?.writeText(text);
}
function brandLogo(brand) { return brand.icon ? `<img src="${brand.icon}" alt="${escapeHtml(brand.label)}" loading="lazy"><span hidden>${escapeHtml(brand.label)}</span>` : '<span class="order-icon">🏷️</span>'; }
function brandsModal() {
  const groups = BRAND_GROUPS.map(group => `<section class="brand-category"><h3>${group.name}</h3><div class="brand-grid">${group.brands.map(brand => `<button type="button" class="brand-tile" data-brand-id="${brand.id}">${brandLogo(brand)}<b>${escapeHtml(brand.label)}</b></button>`).join('')}</div></section>`).join('');
  openModal(`<h2 id="modalTitle">브랜드앱 주문 가능 가게</h2><p>브랜드를 누르면 여수에 등록된 해당 브랜드 가게만 모아 보여드립니다.</p>${groups}`);
}
function allCategoriesModal() {
  openModal(`<h2 id="modalTitle">전체 음식 카테고리</h2><div class="all-category-list">${categories.map(name => `<button type="button" data-modal-cat="${escapeHtml(name)}">${categoryIcon(name, 'category-modal-icon')}<b>${escapeHtml(name)}</b></button>`).join('')}</div>`);
}
function getSavedAddress() { return normalizeOutsideYeosuCurrent(readLocalJson(ADDRESS_KEY, null)); }
function getAddressBook() { return readLocalJson(ADDRESS_BOOK_KEY, []).map(normalizeOutsideYeosuCurrent); }
function saveAddressBook(list) { writeLocalJson(ADDRESS_BOOK_KEY, list.slice(0, 12)); }
function shortAddress(text = '', area = '') {
  const value = String(text).trim() || '여수시 전체';
  const neighborhood = neighborhoodFor(area) || neighborhoodFor(value);
  if (neighborhood) return `여수시 ${neighborhood}`;
  const shortened = value.replace(/^(?:(?:전남광주|광주전남)통합특별시|전라남도|전남|광주광역시)\s*/u, '').trim() || value;
  return shortened.length > 18 ? `${shortened.slice(0, 18)}…` : shortened;
}
function saveLocationState(label, coords = null, sortByDistance = false, meta = {}) {
  const region = analyticsCoarseRegion(meta);
  const saved = {label, area:meta.area || label, address:meta.address || label, detail:meta.detail || '', type:meta.type || 'recent', coords, sortByDistance, ...region, savedAt:new Date().toISOString()};
  localStorage.setItem('savedLocation', JSON.stringify(saved)); localStorage.setItem('location', saved.area);
}
function addressAreas() { return ['여수시 전체', ...new Set(stores.map(store => store.area).filter(Boolean))].sort((a,b)=>a==='여수시 전체'?-1:a.localeCompare(b,'ko')); }
function addressAreaFor(text='') { const neighborhood=neighborhoodFor(text); if(neighborhood)return neighborhood; const normalized=normalize(text); return addressAreas().find(area=>area!=='여수시 전체'&&normalized.includes(normalize(area))) || (text==='여수시 전체'?'여수시 전체':'여수시 전체'); }
function renderAddressDraft() {
  const preview = $('#addressSelectedPreview'); if (!preview) return;
  const base = String(addressDraft?.address || '').trim(), detail = String($('#addressDetailInput')?.value || addressDraft?.detail || '').trim();
  preview.innerHTML = base ? `<small>선택한 주소</small><b>${escapeHtml(base)}</b><span>${detail ? escapeHtml(detail) : '상세주소를 입력하거나 그대로 선택하세요.'}</span>` : '<small>선택한 주소</small><b>주소를 검색하거나 최근 주소를 선택하세요.</b>';
  $('#addressConfirmBtn').disabled = !base;
}
function renderAddressResults(query='') {
  const target=$('#addressSearchResults'); if (!target) return;
  const value=String(query).trim(), areas=addressAreas();
  const matches=areas.filter(area=>!value || normalize(area).includes(normalize(value))).slice(0,12);
  const typed=value && !matches.some(area=>normalize(area)===normalize(value)) ? `<button type="button" data-address-base="${escapeHtml(value)}"><span>📍</span><b>${escapeHtml(value)}</b><small>입력한 주소 사용</small></button>` : '';
  target.innerHTML = typed + matches.map(area=>`<button type="button" data-address-base="${escapeHtml(area)}"><span>📍</span><b>${escapeHtml(area)}</b><small>여수 지역 주소</small></button>`).join('') || '<p class="address-empty">검색된 주소가 없습니다.</p>';
}
function areaModal() {
  const saved=getSavedAddress(); const recent=getAddressBook();
  addressDraft = saved ? {...saved, coords:saved.coords || (saved.latitude&&saved.longitude?{lat:Number(saved.latitude),lng:Number(saved.longitude)}:null)} : {address:state.addressLabel==='여수시 전체'?'':state.addressLabel, detail:'', area:state.location, coords:state.coords, sortByDistance:state.sortByDistance, type:'recent'};
  openModal(`<section class="address-single-sheet" data-address-single><header><h2 id="modalTitle">배달 주소 설정</h2><p>주소 검색·상세주소·최근주소·현재 위치·선택 완료를 이 화면에서 한 번에 처리합니다.</p></header><div class="address-search-row"><div class="searchbox"><input id="addressSearchInput" placeholder="예: 여서동, 웅천동, 쌍봉로 368" autocomplete="street-address"><button id="clearAddressSearch" class="input-clear" type="button" hidden>×</button></div><button id="addressSearchBtn" type="button">주소검색</button></div><div id="addressSearchResults" class="address-search-results"></div><button id="gpsLocationBtn" class="current-location-btn" type="button">⌖ <span>현재 위치 사용</span></button><div id="addressSelectedPreview" class="address-selected-preview"></div><label class="address-detail-label">상세주소<input id="addressDetailInput" value="${escapeHtml(addressDraft?.detail || '')}" placeholder="동·호수, 건물명, 상세 위치" autocomplete="address-line2"></label><section class="address-recent"><div class="address-section-title"><h3>최근 주소</h3><span>최대 12개 저장</span></div><div class="address-recent-list">${recent.length?recent.map((item,index)=>`<button type="button" data-address-recent="${index}"><span>${item.type==='current'?'⌖':'📍'}</span><b>${escapeHtml(item.label||item.address)}</b><small>${escapeHtml([item.address,item.detail].filter(Boolean).join(' '))}</small></button>`).join(''):'<p class="address-empty">아직 저장된 주소가 없습니다.</p>'}</div></section><button id="addressConfirmBtn" class="address-confirm-btn" type="button">이 주소로 선택 완료</button></section>`);
  $('#addressSearchInput').value = addressDraft?.address || ''; renderAddressResults(addressDraft?.address || ''); renderAddressDraft();
}
function chooseAddressBase(value, extra={}) { addressDraft={...(addressDraft||{}),address:String(value).trim(),area:extra.area||addressAreaFor(value),coords:extra.coords||null,sortByDistance:Boolean(extra.sortByDistance),type:extra.type||'recent',region1:extra.region1||'',region2:extra.region2||'',region3:extra.region3||'',regionSource:extra.regionSource||''}; renderAddressDraft(); }
function commitAddressSelection() {
  const base=String(addressDraft?.address || $('#addressSearchInput')?.value || '').trim(); if(!base){$('#addressSearchInput')?.focus();return;}
  const detail=String($('#addressDetailInput')?.value||'').trim(), full=[base,detail].filter(Boolean).join(' '), coords=addressDraft?.coords||null, sortByDistance=Boolean(addressDraft?.sortByDistance&&coords);
  const inferredArea=addressAreaFor(base), area=inferredArea!=='여수시 전체'?inferredArea:(addressDraft?.area||'여수시 전체');
  const item={type:addressDraft?.type||'recent',address:base,detail,label:full,area,coords,sortByDistance,...analyticsCoarseRegion(addressDraft),createdAt:new Date().toISOString()};
  writeLocalJson(ADDRESS_KEY,item); saveAddressBook([item,...getAddressBook().filter(old=>old.label!==item.label||old.type!==item.type)]);
  state.location=item.area||'여수시 전체'; state.addressLabel=item.label; state.coords=coords; state.sortByDistance=sortByDistance;
  saveLocationState(item.label,coords,sortByDistance,item); $('#locationText').textContent=shortAddress(item.label,item.area); hardClose(); setTimeout(showHomeAfterAddressCommit,60);
}
function useCurrentLocation() {
  const button=$('#gpsLocationBtn'); if(!button)return;
  if(!navigator.geolocation){button.innerHTML='⌖ <span>이 기기는 위치 기능을 지원하지 않습니다</span>';return;}
  button.disabled=true;button.innerHTML='⌖ <span>현재 위치 확인 중…</span>';
  navigator.geolocation.getCurrentPosition(position=>{button.disabled=false;button.innerHTML='⌖ <span>현재 위치 확인 완료</span>';chooseAddressBase('현재 위치',{area:'여수시 전체',coords:{lat:position.coords.latitude,lng:position.coords.longitude},sortByDistance:true,type:'current'});},error=>{button.disabled=false;button.innerHTML=`⌖ <span>${error.code===1?'위치 권한을 허용해 주세요':'현재 위치를 확인하지 못했습니다'}</span>`;},{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
}
function myPage() {
  openModal(`<h2 id="modalTitle">마이페이지</h2><p>로그인 없이 이 기기에 저장된 정보입니다.</p><div class="my-list"><button type="button" data-open-favorites>♡ 찜한 가게</button><button type="button" data-open-recent>◷ 최근 방문 가게</button><button type="button">📍 저장 지역 — ${escapeHtml(state.location)}</button><button type="button" data-open-guide>❓ 주문방법 안내</button><button type="button">✉ 광고 문의</button></div>`);
}
function routeLink(route, extraClass = '') {
  if (route.key === 'direct') {
    return `<button class="detail-route ${extraClass} detail-route-coming-soon" type="button" disabled data-route-key="direct" aria-label="가게바로주문 준비중">${appIcon(route.key, 'detail-route-icon')}<span>${escapeHtml(route.name)}<small>(준비중)</small></span><b aria-hidden="true">준비중</b></button>`;
  }
  return `<a class="detail-route ${extraClass}" href="${escapeHtml(route.url)}" ${String(route.url).startsWith('http') ? 'target="_blank" rel="noopener"' : ''} data-route-key="${escapeHtml(route.key)}">${appIcon(route.key, 'detail-route-icon')}<span>${escapeHtml(route.name)}</span><b>›</b></a>`;
}
function orderAppContinueLabel(key, fallback = '') {
  return ({yogiyo:'요기요로',baemin:'배달의민족으로',coupang:'쿠팡이츠로',mukkebi:'먹깨비로',ddangyo:'땡겨요로',ondongne:'온동네로',direct:'가게바로주문으로'})[key] || `${fallback} 앱으로`;
}
function storeMenuPreviewEntryMarkup(store) {
  if (store?.hasMenu !== true) return '';
  const entryImage = photoResolver?.resolve?.(store)?.src || store.legacyImage || '';
  return `<button class="store-menu-preview-entry" type="button" data-store-menu-preview="${escapeHtml(store.id)}">${entryImage ? `<img src="${escapeHtml(entryImage)}" alt="">` : ''}<span><b>음식보기</b><small>사진과 설명으로 전체 메뉴 미리보기 · 가격 미표시</small></span><strong>메뉴 보기 ›</strong></button>`;
}
function feeGuideMarkup(store, selectedRoute, {fromBrowser = false} = {}) {
  const localRoutes = LOW_FEE_KEYS.map(key => routeFor(store, key)).filter(Boolean);
  const selectedMeta = APP_META[selectedRoute.key] || {label:selectedRoute.name};
  const continueLabel = orderAppContinueLabel(selectedRoute.key, selectedMeta.label);
  return `<section id="feeGuidePanel" class="community-guide" data-selected-app="${selectedRoute.key}" data-store-id="${escapeHtml(store.id)}"><span class="community-order-kicker">같은 여수, 함께 이어가는 주문</span><h2 id="modalTitle">주문하기 전에 이용 가능한 방법을 함께 확인해 보세요</h2><p class="community-order-lead">가격과 배달비를 비교해 고객님께 맞는 방법을 자유롭게 선택하세요.</p><div class="community-choice-list">${localRoutes.length ? localRoutes.map(route => routeLink(route,'community-choice-link low-fee-route')).join('') : '<p class="muted">이 가게에 등록된 지역 주문방법이 아직 없습니다.</p>'}</div><p class="community-original-label">선택한 가게</p><strong class="selected-store-name">${escapeHtml(store.name)}</strong><p class="community-original-label">처음 선택한 주문방법</p><a class="selected-app-continue community-choice-original external-text-route" href="${escapeHtml(selectedRoute.url)}" target="_blank" rel="noopener" data-community-original="${selectedRoute.key}"><span><b>${escapeHtml(store.name)}</b><small>${escapeHtml(continueLabel)} 계속 주문하기</small></span><b>›</b></a>${externalAppNoticeMarkup()}${fromBrowser ? `<button type="button" class="community-back" data-back-app-browser="${selectedRoute.key}">← ${escapeHtml(selectedMeta.label)} 가게목록으로</button>` : ''}<p class="community-order-note">어떤 주문방법을 선택해도 됩니다. 고객님의 비용과 편의를 먼저 확인해 주세요.</p></section>`;
}
function openCommunityChoice(store, key, options = {}) {
  const selectedRoute = routeFor(store,key); if (!selectedRoute) return;
  const selected = rememberSelectedExternal(store,key);
  openModal(feeGuideMarkup(store,{...selectedRoute,url:selected?.url||selectedRoute.url},options));
}
async function openStore(store) {
  if (!store) return false;
  const secureDetail = window.daedongSecureStoreDetail;
  if (store.__secureDetailReady !== true) {
    if (!secureDetail || typeof secureDetail.enrich !== 'function') {
      openModal('<section class="store-detail-load-error"><h2 id="modalTitle">주문방법을 불러오지 못했습니다</h2><p>페이지를 새로고침한 뒤 가게를 다시 열어 주세요.</p></section>');
      return false;
    }
    try {
      await secureDetail.enrich(store, normalizedStore);
    } catch (error) {
      console.warn('가게 상세정보를 불러오지 못했습니다.', error);
      openModal('<section class="store-detail-load-error"><h2 id="modalTitle">주문방법을 불러오지 못했습니다</h2><p>잠시 후 가게를 다시 열어 주세요.</p></section>');
      return false;
    }
  }
  addRecentStore(store);
  sendAnalyticsEvent('store_open', {storeId: store.id, storeName: store.name, surface: 'store_detail'});
  const selectedRoute = selectedExternalForStore(store);
  const quick = [];
  if (store.naverMap && store.naverMap !== '#') quick.push(`<a class="detail-quick-link" data-detail-only="naver" href="${escapeHtml(store.naverMap)}" target="_blank" rel="noopener"><span class="quick-icon">🗺️</span><span>네이버지도</span></a>`);
  const local = LOCAL_DETAIL_KEYS.map(key=>routeFor(store,key)).filter(Boolean);
  const phoneDigits = String(store.phone || '').replace(/[^0-9]/g, '');
  const phoneVerified = /^02\d{7,8}$/.test(phoneDigits) || /^0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/.test(phoneDigits) || /^01[016789]\d{7,8}$/.test(phoneDigits) || /^070\d{8}$/.test(phoneDigits);
  const registeredPhoneRoute = routeFor(store,'phone');
  const phoneRoute = phoneVerified ? {key:'phone',name:`전화주문 ${phoneDigits}`,url:`tel:${phoneDigits}`} : registeredPhoneRoute;
  const external = EXTERNAL_APP_KEYS.map(key=>routeFor(store,key)).filter(Boolean);
  const otherRoutes = [phoneRoute,...external].filter(Boolean);
  const otherMenu = otherRoutes.length ? `<div class="store-other-wrap"><button class="detail-route store-other-toggle external-text-route" type="button"><span>다른 주문방법 보기</span><b>›</b></button><div class="store-other-popover" hidden><button type="button" class="store-other-close" aria-label="다른 주문방법 닫기">×</button>${otherRoutes.map(route => route.key === 'phone' ? routeLink(route,'store-other-link') : `<button type="button" class="store-other-link external-text-route" data-external-route-key="${route.key}"><span>${escapeHtml(route.name)}</span><b>›</b></button>`).join('')}${externalAppNoticeMarkup()}</div></div>` : '';
  const selectedCta = selectedRoute ? `<button type="button" class="selected-order-cta external-text-route" data-external-route-key="${selectedRoute.key}"><span>처음 선택한 ${escapeHtml(APP_META[selectedRoute.key].label)}로 주문하기</span><b>›</b></button>` : '';
  const favorite=isFavorite(store.id);
  const menuEntry = storeMenuPreviewEntryMarkup(store);
  openModal(`<article class="store-detail" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">${escapeHtml(store.name)}</h2>${photoResolver.galleryMarkup(store)}<div class="detail-meta-row"><p class="detail-meta">${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</p>${quick.length ? `<div class="detail-quick-links">${quick.join('')}</div>` : ''}</div>${menuEntry}<div class="detail-routes local-detail-routes">${local.map(route=>routeLink(route,'local-order-route')).join('') || '<p class="muted">등록된 지역 주문방법을 확인 중입니다.</p>'}</div>${otherMenu}${selectedCta}<div class="detail-personal-actions"><button type="button" class="detail-personal-btn ${favorite?'active':''}" data-favorite-store="${escapeHtml(store.id)}" aria-pressed="${favorite}">♥ <span data-favorite-label>${favorite?'찜 해제':'찜하기'}</span></button><button type="button" class="detail-personal-btn" data-feedback-store="${escapeHtml(store.id)}">정보 수정 요청</button></div></article>`);
  const carouselRoot = $('#detailPhotoCarousel'); if (carouselRoot) detailCarousel = new InfiniteCarousel(carouselRoot,{interval:3500});
  $('#modal').dataset.activeStoreId=store.id;
  return true;
}

async function fetchJson(url, fallback) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 12000);
  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}request=${Date.now()}`, {cache: 'no-store', signal: controller.signal});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error(`${url} 로딩 실패`, error); return fallback;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
async function initialize() {
  renderHero(); renderPromos();
  const [rawStores, manifest, policy, neighborhoodData] = await Promise.all([
    window.daedongDataApi?.catalog?.({timeoutMs: 20000}).catch(error => {
      console.error('보안 데이터 API에서 가게목록을 불러오지 못했습니다.', error);
      return [];
    }) || Promise.resolve([]),
    fetchJson(PHOTO_MANIFEST_URL, {entries: []}),
    fetchJson(PHOTO_POLICY_URL, {}),
    fetchJson(NEIGHBORHOOD_URL,{neighborhoods:[]})
  ]);
  yeosuNeighborhoods=neighborhoodData.neighborhoods||[];neighborhoodByName=new Map(yeosuNeighborhoods.map(item=>[item.name,item]));
  photoResolver = new PhotoResolver(manifest, policy);
  const safeRawStores = Array.isArray(rawStores) ? rawStores : [];
  allStores = safeRawStores.map((raw, index) => {
    try { return normalizedStore(raw && typeof raw === 'object' ? raw : {}, index); }
    catch (error) { console.error('store-normalization-failed', raw?.store_id || raw?.id || index, error); return null; }
  }).filter(Boolean);
  canonicalStores = allStores.filter(store => store.customerVisible !== false && store.store_id && store.name && store.name.trim() !== '' && store.name !== '제목 없음');
  searchableStores = canonicalStores;
  coordinateStores = canonicalStores.filter(store => store.coordinateVerified === true);
  stores = canonicalStores;
  categories = [...new Set(stores.flatMap(storeCategories))].sort((a, b) => {
    const ai = CATEGORY_PREFERRED.indexOf(a), bi = CATEGORY_PREFERRED.indexOf(b);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.localeCompare(b, 'ko');
  });
  hydrateSelectedOrderApp();
  $('#locationText').textContent = shortAddress(state.addressLabel || state.location, state.location);
  renderCategories(); renderStores();
}
function resetFilters() {
  state.query = ''; state.category = '전체'; state.brandId = '';
  $('#mainSearch').value = ''; $('#clearMainSearch').hidden = true;
  renderStores({resetCount: true});
}

document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) handleImageError(event.target); }, true);
document.addEventListener('DOMContentLoaded', () => {
  applyAnalyticsOwnerMode();
  const entry = analyticsEntryContext();
  sendAnalyticsEvent('visit', {storeId: entry.storeId, surface: entry.storeId ? 'store_entry' : 'home'});
  document.addEventListener('click', trackAnalyticsRouteClick, true);
  initialize().then(result => finishCatalogReady(result)).catch(error => {
    console.error('가게목록 초기화를 완료하지 못했습니다.', error);
    finishCatalogReady([]);
  });
  $('#mainSearch').addEventListener('input', () => $('#clearMainSearch').hidden = !$('#mainSearch').value);
  $('#mainSearch').addEventListener('keydown', event => { if (event.key === 'Enter') $('#searchBtn').click(); });
  $('#clearMainSearch').addEventListener('click', () => { $('#mainSearch').value = ''; state.query = ''; $('#clearMainSearch').hidden = true; renderStores({resetCount: true}); $('#mainSearch').focus(); });
  $('#searchBtn').addEventListener('click', () => { state.query = $('#mainSearch').value.trim(); state.category = '전체'; state.brandId = ''; renderStores({scroll: true, resetCount: true}); });
  $('#categoryGrid').addEventListener('click', event => { const button = event.target.closest('[data-cat]'); if (!button) return; if (button.dataset.cat === '전체') { allCategoriesModal(); return; } state.category = button.dataset.cat; state.brandId = ''; state.query = ''; $('#mainSearch').value = ''; $('#clearMainSearch').hidden = true; renderStores({scroll: true, resetCount: true}); });
  $('#loadMoreBtn').addEventListener('click', () => { state.visibleCount += 40; renderStores(); });
  $('#resetCategoryBtn').addEventListener('click', resetFilters);
  $('#locationBtn').addEventListener('click', areaModal);
  $('#topFavoriteBtn').addEventListener('click', favoritesModal);
  $('#topRecentBtn').addEventListener('click', recentModal);
  const promoTrack = $('#promoTrack');
  const promoShell = $('#promoCarousel .carousel-shell');
  let promoTapStart = null;
  let promoTapOpenedAt = -Infinity;
  promoTrack.addEventListener('pointerdown', event => {
    const promo = event.target.closest('[data-promo-kind]');
    promoTapStart = promo ? {kind: promo.dataset.promoKind, x: event.clientX, y: event.clientY} : null;
  });
  promoShell.addEventListener('pointerup', event => {
    if (!promoTapStart) return;
    const tap = promoTapStart;
    promoTapStart = null;
    if (Math.hypot(event.clientX - tap.x, event.clientY - tap.y) > 18) return;
    promoTapOpenedAt = performance.now();
    openPromoCarouselDetail(tap.kind);
  });
  promoShell.addEventListener('pointercancel', () => { promoTapStart = null; });
  promoShell.addEventListener('click', event => {
    const promo = event.target.closest('[data-promo-kind]');
    if (!promo || !promoTrack.contains(promo) || performance.now() - promoTapOpenedAt <= 500) return;
    event.preventDefault();
    openPromoCarouselDetail(promo.dataset.promoKind);
  }, true);
  $('#promoTrack').addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const promo = event.target.closest('[data-promo-kind]');
    if (!promo) return;
    event.preventDefault();
    openPromoCarouselDetail(promo.dataset.promoKind);
  });

  const pop = $('#moreAppsPopover');
  $('#moreAppsBtn').addEventListener('click', event => { event.stopPropagation(); pop.hidden = !pop.hidden; });
  $('.popover-close').addEventListener('click', () => pop.hidden = true);
  document.addEventListener('click', event => { if (!pop.hidden && !event.target.closest('#moreAppsPopover') && !event.target.closest('#moreAppsBtn')) pop.hidden = true; });

  $$('[data-open]').forEach(button => button.addEventListener('click', () => ({mypage: myPage, guide, brands: brandsModal}[button.dataset.open] || guide)()));
  $('.modal-close').addEventListener('click', () => hardClose());
  $('#overlay').addEventListener('click', () => hardClose());
  $('#modal').addEventListener('click', event => { if (event.target === $('#modal')) hardClose(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#modal').hidden) hardClose(); });

  document.addEventListener('click', event => {
    if (event.target.id === 'clearSearch') { resetFilters(); return; }
    if (event.target.id === 'addressSearchBtn') { renderAddressResults($('#addressSearchInput')?.value || ''); return; }
    if (event.target.id === 'clearAddressSearch') { $('#addressSearchInput').value=''; event.target.hidden=true; renderAddressResults(''); return; }
    const addressBase=event.target.closest('[data-address-base]'); if(addressBase){chooseAddressBase(addressBase.dataset.addressBase);return;}
    const recentAddress=event.target.closest('[data-address-recent]'); if(recentAddress){const item=getAddressBook()[Number(recentAddress.dataset.addressRecent)];if(item){addressDraft={...item};$('#addressSearchInput').value=item.address||item.label||'';$('#addressDetailInput').value=item.detail||'';renderAddressResults(item.address||'');renderAddressDraft();}return;}
    if(event.target.id==='gpsLocationBtn'){useCurrentLocation();return;}
    if(event.target.id==='addressConfirmBtn'){commitAddressSelection();return;}
    const globalExternal = event.target.closest('[data-global-external]');
    if (globalExternal) { pop.hidden = true; globalExternalGuide(globalExternal.dataset.globalExternal); return; }
    const appCategory = event.target.closest('[data-app-category]');
    if (appCategory) { const key=$('#modal').dataset.appBrowserKey; openAppBrowser(key,appCategory.dataset.appCategory); return; }
    const appStore = event.target.closest('[data-app-store-id]');
    if (appStore) { const store=stores.find(item=>item.id===appStore.dataset.appStoreId); if(store) openCommunityChoice(store,appStore.dataset.appKey,{fromBrowser:true}); return; }
    const backApp = event.target.closest('[data-back-app-browser]'); if (backApp) { openAppBrowser(backApp.dataset.backAppBrowser); return; }
    const brandButton = event.target.closest('[data-brand-id]');
    if (brandButton) { state.brandId = brandButton.dataset.brandId; state.category = '전체'; state.query = ''; $('#mainSearch').value = ''; closeModal(); setTimeout(() => renderStores({scroll: true, resetCount: true}), 60); return; }
    const categoryButton = event.target.closest('[data-modal-cat]');
    if (categoryButton) { state.category = categoryButton.dataset.modalCat; state.brandId = ''; state.query = ''; $('#mainSearch').value = ''; closeModal(); setTimeout(() => renderStores({scroll: true, resetCount: true}), 60); return; }
    const toggle = event.target.closest('.store-other-toggle');
    if (toggle) { event.preventDefault(); event.stopPropagation(); const menu = toggle.closest('.store-other-wrap').querySelector('.store-other-popover'); $$('.store-other-popover').forEach(item => { if (item !== menu) item.hidden = true; }); menu.hidden = !menu.hidden; return; }
    const otherClose = event.target.closest('.store-other-close');
    if (otherClose) { event.preventDefault(); event.stopPropagation(); const menu = otherClose.closest('.store-other-popover'); if (menu) menu.hidden = true; return; }
    const externalButton = event.target.closest('[data-external-route-key]');
    if (externalButton) { event.preventDefault(); event.stopPropagation(); const store=stores.find(item=>item.id===$('#modal').dataset.activeStoreId || item.id===externalButton.closest('[data-store-id]')?.dataset.storeId); if(store) openCommunityChoice(store,externalButton.dataset.externalRouteKey); return; }
    const favoriteButton=event.target.closest('[data-favorite-store]'); if(favoriteButton){event.preventDefault();event.stopPropagation();toggleFavorite(favoriteButton.dataset.favoriteStore);return;}
    const feedbackButton=event.target.closest('[data-feedback-store]'); if(feedbackButton){event.preventDefault();event.stopPropagation();const store=stores.find(item=>item.id===feedbackButton.dataset.feedbackStore);if(store)feedbackModal(store);return;}
    const personalStore=event.target.closest('[data-personal-store]'); if(personalStore){const store=stores.find(item=>item.id===personalStore.dataset.personalStore);if(store)openStore(store);return;}
    if(event.target.closest('[data-open-favorites]')){favoritesModal();return;}
    if(event.target.closest('[data-open-recent]')){recentModal();return;}
    if(event.target.closest('[data-open-guide]')){guide();return;}
    if(event.target.closest('[data-open-address]')){areaModal();return;}
    const copyButton=event.target.closest('[data-feedback-copy]');if(copyButton){copyQueuedReport(copyButton.dataset.feedbackCopy);return;}
    if (!event.target.closest('.store-other-wrap')) $$('.store-other-popover').forEach(item => item.hidden = true);
  });

  $('#storeGrid').addEventListener('click', event => { if(event.target.closest('button,a'))return; const card = event.target.closest('.store-card'); if (!card) return; const store = stores.find(item => item.id === card.dataset.id); if (store) openStore(store); });
  $('#noticeBtn').addEventListener('click', () => openModal(`<h2 id="modalTitle">알림</h2><div class="my-list">${PROMOS.map(promo => `<button type="button">${promo.title}</button>`).join('')}</div>`));
  $('.bottom-nav').addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    $$('.bottom-nav button').forEach(item => item.classList.remove('active')); button.classList.add('active');
    const tab = button.dataset.tab;
    if (tab === 'home') scrollTo({top: 0, behavior: 'smooth'});
    if (tab === 'search') { $('#mainSearch').focus(); scrollTo({top: $('.main-search-row').offsetTop - 10, behavior: 'smooth'}); }
    if (tab === 'mypage') myPage();
    if (tab === 'recent') recentModal();
    if (tab === 'favorite') favoritesModal();
    if (tab === 'nearby') areaModal();
  });

  document.addEventListener('input', event => { if(event.target.id==='addressSearchInput'){ $('#clearAddressSearch').hidden=!event.target.value; } if(event.target.id==='addressDetailInput') renderAddressDraft(); });
  document.addEventListener('keydown', event => { if(event.key==='Enter'&&event.target.id==='addressSearchInput'){event.preventDefault();renderAddressResults(event.target.value);} if(event.key==='Enter'&&event.target.id==='addressDetailInput'){event.preventDefault();commitAddressSelection();} });
  document.addEventListener('submit', event => { if(event.target.id!=='storeFeedbackForm')return; event.preventDefault(); submitFeedback(event.target); });

  const today = new Date().toLocaleDateString('sv-SE', {timeZone: 'Asia/Seoul'}), startupAd = $('#startupAd');
  let startupHistoryOpen = false;
  const openStartupAd = () => { startupAd.hidden = false; lockPage(); if (!startupHistoryOpen) { history.pushState({daedongStartup:true}, ''); startupHistoryOpen = true; } };
  const closeStartupAd = ({fromPop = false} = {}) => { if (startupAd.hidden) return; startupAd.hidden = true; const goBack = !fromPop && startupHistoryOpen && history.state?.daedongStartup; startupHistoryOpen = false; if (!layerStillOpen()) unlockPage(); if (goBack) { ignoreNextPop=true; history.back(); } };
  const entryParams = new URLSearchParams(location.search);
  const requestedSharedStoreId = entryParams.get('store');
  const requestedHeroStoreId = entryParams.get('hero');
  const startupBypassHeroStoreIds = new Set(['67a9e4f14c8c7ea4','cfde2617224f33a0']);
  const startupAdEnabled = false; // Opening-day decision: keep the recruitment startup popup disabled.
  if (startupAdEnabled && !requestedSharedStoreId && !startupBypassHeroStoreIds.has(String(requestedHeroStoreId||'')) && localStorage.getItem('hideStartup') !== today) setTimeout(openStartupAd, 600);
  $('.startup-close').addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); closeStartupAd(); });
  startupAd.addEventListener('click', event => { if (event.target === startupAd) closeStartupAd(); });
  $('.startup-card').addEventListener('click', event => event.stopPropagation());
  $('#hideToday').addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); localStorage.setItem('hideStartup', today); closeStartupAd(); });
  $('#startupDetails').addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); closeStartupAd(); setTimeout(() => openModal(`<h2 id="modalTitle">대동여수음식지도 모집·광고 안내</h2><div class="guide-list">${PROMOS.map(promo => `<button type="button">${promo.title}<br><small>${promo.desc}</small></button>`).join('')}</div>`), 60); });
  window.addEventListener('popstate', () => { if(ignoreNextPop){ignoreNextPop=false;return;} if (!startupAd.hidden) { closeStartupAd({fromPop:true}); return; } if (!$('#modal').hidden) hardClose({fromPop:true}); });
});
