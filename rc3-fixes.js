'use strict';

/* RC3 fixes only. Store, photo, route, brand-app, HappyOrder and banner data stay read-only. */
const RC3_ICON_SPRITE = 'assets/ui/category-icons-color.svg';
const RC3_PHONE_INTERNAL_URL = 'data/phone-order-runtime.json';
const RC3_APP_PARTICLE = Object.freeze({
  yogiyo: '요기요로',
  baemin: '배달의민족으로',
  coupang: '쿠팡이츠로',
  mukkebi: '먹깨비로',
  ddangyo: '땡겨요로',
  ondongne: '온동네로',
  direct: '가게바로주문으로'
});
const RC3_FEEDBACK_CHANNELS = Object.freeze([
  '먹깨비', '땡겨요', '온동네', '요기요', '쿠팡이츠', '배달의민족',
  '브랜드앱 상담', '전화주문 등록', '기타 확인이 필요한 기존 주문채널'
]);
const rc3RailPointers = new Map();
let rc3InternalPhoneByStore = new Map();
let rc3EventsInstalled = false;

function rc3Icon(id, className = 'category-color-icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="${RC3_ICON_SPRITE}#${id}"></use></svg>`;
}

function rc3CategoryIconId(name) {
  const value = String(name || '');
  if (value === '전체') return 'all';
  if (/마라|양꼬치/.test(value)) return 'mala';
  if (/치킨|닭/.test(value)) return 'chicken';
  if (/피자/.test(value)) return 'pizza';
  if (/중식|짜장|짬뽕/.test(value)) return 'chinese';
  if (/분식.*도시락|도시락.*분식/.test(value)) return 'lunchbox';
  if (/분식|떡볶이/.test(value)) return 'snack';
  if (/족발|보쌈/.test(value)) return 'pork';
  if (/회|해산물|초밥|선어|수산/.test(value)) return 'seafood';
  if (/국밥|찜|탕|찌개|조림/.test(value)) return 'stew';
  if (/면|국수|냉면|우동|라멘/.test(value)) return 'noodles';
  if (/고기|구이|삼겹|갈비/.test(value)) return 'grill';
  if (/돈가스|돈까스|일식/.test(value)) return 'japanese';
  if (/카페|디저트|빙수|아이스크림|커피/.test(value)) return 'dessert';
  if (/야식|주점|술집/.test(value)) return 'night';
  if (/햄버거|버거|샌드위치|토스트|핫도그/.test(value)) return 'burger';
  if (/반찬/.test(value)) return 'banchan';
  if (/베이커리|빵|떡/.test(value)) return 'bakery';
  if (/한식/.test(value)) return 'korean';
  return 'other';
}

fxCategoryMarkup = function rc3CategoryMarkup(name) {
  return `<button type="button" class="category glass-action ${state.category === name ? 'active' : ''}" data-cat="${escapeHtml(name)}">${rc3Icon(rc3CategoryIconId(name))}<span>${escapeHtml(name)}</span></button>`;
};

renderCategories = function rc3RenderCategories() {
  const names = ['전체', ...mainCategories()];
  $('#categoryGrid').innerHTML = names.map(fxCategoryMarkup).join('');
};

allCategoriesModal = function rc3AllCategoriesModal() {
  const names = ['전체', ...categories.filter(name => name !== '전체')];
  openModal(`<section class="category-modal"><h2 id="modalTitle">전체 음식 카테고리</h2><div class="all-category-list rc3-category-list">${names.map(name => `<button type="button" data-modal-cat="${escapeHtml(name)}">${rc3Icon(rc3CategoryIconId(name), 'category-modal-color-icon')}<b>${escapeHtml(name)}</b></button>`).join('')}</div></section>`);
  requestAnimationFrame(() => {
    const card = $('#modal .modal-card');
    const list = $('#modal .rc3-category-list');
    if (card) card.scrollTop = 0;
    if (list) list.scrollTop = 0;
  });
};

function rc3ShowAllOnHome({close = false} = {}) {
  const pageScroll = window.scrollY;
  state.query = '';
  state.category = '전체';
  state.brandId = '';
  const search = $('#mainSearch');
  if (search) search.value = '';
  const clear = $('#clearMainSearch');
  if (clear) clear.hidden = true;
  if (close) hardClose();
  renderStores({resetCount: true});
  requestAnimationFrame(() => window.scrollTo(0, pageScroll));
}

const RC3_CARD_PRIMARY_CHANNELS = Object.freeze([
  ['direct', 'directOrder'],
  ['brand', 'brandApp'],
  ['mukkebi', 'mukkebi'],
  ['ddangyo', 'ddangyo'],
  ['ondongne', 'ondongne'],
  ['phone', 'phoneOrder']
]);

function rc3PrimaryCardChannels(store) {
  const channels = resolveStoreChannels(store);
  const primary = {...channels.primaryOrder};
  if (!primary.brandApp) primary.brandApp = routeFor(store, 'brand') || null;
  return RC3_CARD_PRIMARY_CHANNELS
    .map(([key, field]) => ({key, channel: primary[field]}))
    .filter(item => Boolean(item.channel));
}

function rc3PrimaryChannelIcon(key, channel, className) {
  const cls = escapeHtml(className);
  if (key === 'brand') {
    if (channel?.icon) return `<img class="${cls}" src="${escapeHtml(channel.icon)}" alt="브랜드앱" title="브랜드앱">`;
    return `<svg class="${cls} rc3-order-channel-svg" role="img" aria-label="브랜드앱"><use href="assets/ui/ui-icons.svg#store"></use></svg>`;
  }
  if (key === 'phone') return `<img class="${cls}" src="assets/ui/phone.svg" alt="전화주문" title="전화주문">`;
  return appIcon(key, className);
}

function rc3PrimaryCardIcons(store, className = 'rail-channel-icon') {
  return rc3PrimaryCardChannels(store)
    .map(({key, channel}) => rc3PrimaryChannelIcon(key, channel, className))
    .join('');
}

miniRoutes = function rc3MiniRoutes(store) {
  return rc3PrimaryCardIcons(store, 'miniapp-icon');
};

function rc3RailCard(store, spec) {
  const distance=spec?.kind==='near'&&Number.isFinite(store.distance)?`약 ${store.distance<1?`${Math.round(store.distance*1000)}m`:`${store.distance.toFixed(1)}km`}`:'';
  const locationLabel=spec?.kind==='near'?(distance||store.proximityLabel||''):'';
  const channelIcons=rc3PrimaryCardIcons(store);
  return `<article class="rail-card" data-rail-card-store="${escapeHtml(store.id)}" data-rc3-rail-open="${escapeHtml(store.id)}"><button type="button" class="rail-card-open rc3-rail-card-open glass-action">${fxCardPhoto(store)}<span class="rail-card-copy"><h3>${escapeHtml(store.name)}</h3><p>${locationLabel?`${escapeHtml(locationLabel)} · `:''}${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</p></span></button><footer><span class="rail-channel-icons" aria-label="이용 가능한 기본 주문방법">${channelIcons||'<span class="rail-method">주문방법 확인</span>'}</span></footer></article>`;
}
fxRenderRails = function rc3RenderRails() {
  const root = $('#recommendRails');
  if (!root) return;
  if (state.category !== '전체' || state.query || state.brandId) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }
  root.hidden = false;
  try {
    const globallyUsed = new Set();
    root.innerHTML = fxSelectedRails().map(spec => {
      const cards = rc2RailCandidates(spec, globallyUsed, 8);
      const allCandidates = fxRankStores(spec);
      return `<section class="recommend-rail" data-rail="${spec.id}"><header class="recommend-rail-head"><div><h2>${escapeHtml(spec.title)}</h2><p>${escapeHtml(spec.desc)}</p></div>${allCandidates.length > cards.length ? `<button type="button" data-rail-more="${spec.id}">이 추천 가게 더보기</button>` : ''}</header><div class="recommend-track" data-rc3-rail-track="${spec.id}">${cards.map(store=>rc3RailCard(store,spec)).join('') || '<p class="empty">현재 표시할 추천 가게가 없습니다.</p>'}</div></section>`;
    }).join('');
  } catch (error) {
    console.error('recommendation-render-failed', error);
    const fallback = (Array.isArray(stores) ? stores : []).slice(0, 8).map(store => rc3RailCard(store, {kind: 'fallback'})).join('');
    root.innerHTML = `<section class="recommend-rail" data-rail="fallback"><header class="recommend-rail-head"><div><h2>오늘의 추천</h2><p>현재 확인 가능한 여수 가게</p></div></header><div class="recommend-track">${fallback || '<p class="empty">가게 정보를 다시 불러와 주세요.</p>'}</div></section>`;
  } finally {
    root.querySelectorAll('p').forEach(node => { if (node.textContent.trim() === '추천 가게를 확인 중입니다.') node.remove(); });
  }
};

renderStores = function rc3RenderStores(options = {}) {
  fxOriginalRenderStores(options);
  if (state.category === '전체' && !state.query && !state.brandId) $('#recommendSection h2').textContent = '가게목록';
  $('#loadMoreBtn').textContent = '더보기';
  fxRenderRails();
  rc2ScrubCustomerCounts($('#app'));
};

function rc3Digits(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function rc3VerifiedPhone(store) {
  const mapped = rc3InternalPhoneByStore.get(String(store?.id));
  const digits = rc3Digits(mapped?.phone || store?.phone);
  const valid = /^(?:0\d{8,11}|1[568]\d{6,7})$/.test(digits);
  return valid ? digits : '';
}

function rc3FormatPhone(value) {
  const digits = rc3Digits(value);
  if (/^02\d{7,8}$/.test(digits)) return digits.replace(/^(02)(\d{3,4})(\d{4})$/, '$1-$2-$3');
  if (/^01[016789]\d{7,8}$/.test(digits) || /^070\d{8}$/.test(digits)) return digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
  return digits.replace(/^(\d{3})(\d{3,4})(\d{4})$/, '$1-$2-$3');
}

fxPhoneStores = function rc3PhoneStores(category = '추천') {
  let list = fxPhoneData.storeMappings
    .map(item => ({...item, store: fxStoreById(item.store_id)}))
    .filter(item => fxVisible(item.store) && item.clickableTel === true && rc3VerifiedPhone(item.store));
  if (category !== '추천') list = list.filter(item => item.store.cat === category);
  return list.sort((a, b) => (fxDistance(a.store) ?? 999) - (fxDistance(b.store) ?? 999) || a.store.name.localeCompare(b.store.name, 'ko'));
};

fxOpenPhoneDirectory = function rc3OpenPhoneDirectory(category = '추천') {
  const all = fxPhoneStores();
  const cats = [...new Set(all.map(item => item.store.cat).filter(Boolean))];
  const list = fxPhoneStores(category);
  if (!$('#modal')?.hidden && $('#modalContent .phone-order-sheet')) rc2ReplaceModal();
  const chips = `<nav class="app-browser-category-chips"><button type="button" data-phone-category="추천" class="${category === '추천' ? 'active' : ''}">추천</button>${cats.map(cat => `<button type="button" data-phone-category="${escapeHtml(cat)}" class="${category === cat ? 'active' : ''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
  const cards = list.map(({store}) => `<button type="button" class="phone-order-card glass-action" data-phone-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
  openModal(`<section class="phone-order-sheet"><h2 id="modalTitle">전화주문 가능한 가게</h2><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다.<br>전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p>${chips}<div class="phone-order-list">${cards || '<p class="empty">내부에서 확인된 전화번호가 있는 가게가 없습니다.</p>'}</div></section>`);
};

fxOpenPhoneConfirm = function rc3OpenPhoneConfirm(id) {
  const item = fxPhoneByStore.get(String(id));
  const store = fxStoreById(id);
  const phone = rc3VerifiedPhone(store);
  if (!item?.clickableTel || !store || !phone) return;
  openModal(`<section class="phone-order-confirm" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">${escapeHtml(store.name)} 전화주문</h2><div class="phone-confirm-photo">${fxCardPhoto(store)}</div><p>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</p><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다.<br>전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p><p class="verified-phone-number">${escapeHtml(rc3FormatPhone(phone))}</p><div class="phone-confirm-actions"><a class="phone-call-link" data-rc3-final-phone href="tel:${escapeHtml(phone)}">전화 걸기</a><button class="phone-cancel" type="button" data-phone-cancel>취소</button></div></section>`);
  $('#modal').dataset.activeStoreId = store.id;
  history.replaceState({...history.state, storeId: String(store.id)}, '');
};

function rc3RouteButton(store, route) {
  if (['yogiyo', 'coupang', 'baemin'].includes(route.key)) {
    return `<button type="button" class="detail-route" data-rc3-external-route="${escapeHtml(route.key)}" data-store-id="${escapeHtml(store.id)}">${appIcon(route.key, 'detail-route-icon')}<span>${escapeHtml(route.name)}</span><b>›</b></button>`;
  }
  return `<a class="detail-route" href="${escapeHtml(route.url)}" target="_blank" rel="noopener" data-route-key="${escapeHtml(route.key)}">${appIcon(route.key, 'detail-route-icon')}<span>${escapeHtml(route.name)}</span><b>›</b></a>`;
}

function resolveStoreChannels(store) {
  const safeStore = store && typeof store === 'object' ? store : {};
  const route = key => routeFor(safeStore, key) || null;
  const phone = rc3VerifiedPhone(safeStore);
  const phoneOrder = phone && fxPhoneByStore.get(String(safeStore.id))?.clickableTel
    ? {key: 'phone', name: '전화주문', phone}
    : null;
  return {
    utilities: {
      naverMap: safeStore.naverMap && safeStore.naverMap !== '#' ? {key: 'naver', name: '네이버지도', url: safeStore.naverMap} : null,
      localGiftApp: route('chak')
    },
    primaryOrder: {
      directOrder: route('direct'),
      brandApp: fxBrandByStore.get(String(safeStore.id)) || null,
      mukkebi: route('mukkebi'),
      ddangyo: route('ddangyo'),
      ondongne: route('ondongne'),
      phoneOrder
    },
    externalOrder: {
      yogiyo: route('yogiyo'),
      coupangEats: route('coupang'),
      baemin: route('baemin')
    },
    happyOrder: fxHappyByStore.get(String(safeStore.id)) || null
  };
}
globalThis.resolveStoreChannels = resolveStoreChannels;

function rc3OpenOrderMethods(store) {
  if (!store) return;
  const channels = resolveStoreChannels(store);
  const routes = Object.values(channels.externalOrder).filter(Boolean);
  const routeMarkup = routes.map(route => rc3RouteButton(store, route)).join('');
  if (!routeMarkup) return;
  openModal(`<section class="order-methods-sheet" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">다른 주문방법 보기</h2><span>선택한 가게</span><strong class="selected-store-name">${escapeHtml(store.name)}</strong><div class="order-methods-list">${routeMarkup}</div></section>`);
  $('#modal').dataset.activeStoreId = store.id;
}

function rc3EnhanceStoreDetail(store) {
  const detail = $('#modalContent .store-detail');
  if (!detail) return;
  const channels = resolveStoreChannels(store);
  detail.querySelector('.detail-quick-links')?.remove();
  detail.querySelector('.local-detail-routes')?.remove();
  detail.querySelectorAll('.brand-store-actions').forEach(node => node.remove());
  detail.querySelector('.store-other-wrap')?.remove();
  const gallery = detail.querySelector('.detail-meta');
  const utilities = [channels.utilities.naverMap, channels.utilities.localGiftApp].filter(Boolean).map(item => `<a class="detail-quick-link" data-detail-only="${escapeHtml(item.key)}" href="${escapeHtml(item.url)}" target="_blank" rel="noopener"><span class="quick-icon">${item.key === 'naver' ? '🗺️' : '💳'}</span><span>${escapeHtml(item.name === 'CHAK 지역상품권' ? '지역상품권앱' : item.name)}</span></a>`).join('');
  const primary = [channels.primaryOrder.directOrder, channels.primaryOrder.mukkebi, channels.primaryOrder.ddangyo, channels.primaryOrder.ondongne].filter(Boolean).map(route => routeLink(route, 'local-order-route')).join('');
  const phone = channels.primaryOrder.phoneOrder ? `<button type="button" class="detail-route local-order-route" data-rc3-phone-store="${escapeHtml(store.id)}"><img class="detail-route-icon" src="assets/ui/phone.svg" alt=""><span>전화주문</span><b>›</b></button>` : '';
  const apps = channels.primaryOrder.brandApp || channels.happyOrder ? `<div class="brand-store-actions">${channels.primaryOrder.brandApp ? fxAppAction(channels.primaryOrder.brandApp, 'brand') : ''}${channels.happyOrder ? fxAppAction(channels.happyOrder, 'happy') : ''}</div>` : '';
  const hasExternal = Object.values(channels.externalOrder).some(Boolean);
  const other = hasExternal ? `<div class="store-other-wrap"><button class="detail-route store-other-toggle rc3-order-methods-trigger" type="button" data-rc3-other-methods="${escapeHtml(store.id)}"><span>다른 주문방법 보기</span><b>›</b></button></div>` : '';
  gallery?.insertAdjacentHTML('afterend', `${utilities ? `<div class="detail-quick-links">${utilities}</div>` : ''}<div class="detail-routes local-detail-routes">${primary}${apps}${phone || (!primary && !apps ? '<p class="muted">등록된 주문방법을 확인 중입니다.</p>' : '')}</div>${other}`);
}

const rc3OpenStoreBase = openStore;
openStore = function rc3OpenStore(store) {
  rc3OpenStoreBase(store);
  rc3EnhanceStoreDetail(store);
};

feeGuideMarkup = function rc3FeeGuideMarkup(store, selectedRoute, {fromBrowser = false} = {}) {
  const localRoutes = LOW_FEE_KEYS.map(key => routeFor(store, key)).filter(Boolean);
  const selectedMeta = APP_META[selectedRoute.key] || {label: selectedRoute.name};
  const continueLabel = RC3_APP_PARTICLE[selectedRoute.key] || `${selectedMeta.label} 앱으로`;
  return `<section id="feeGuidePanel" class="community-guide" data-selected-app="${selectedRoute.key}" data-store-id="${escapeHtml(store.id)}"><span class="community-order-kicker">같은 여수, 함께 이어가는 주문</span><h2 id="modalTitle">주문하기 전에 이용 가능한 방법을 함께 확인해 보세요</h2><p class="community-order-lead">가격과 배달비를 비교해 고객님께 맞는 방법을 자유롭게 선택하세요.</p><div class="community-choice-list">${localRoutes.length ? localRoutes.map(route => routeLink(route, 'community-choice-link low-fee-route')).join('') : '<p class="muted">이 가게에 등록된 지역 주문방법이 아직 없습니다.</p>'}</div><p class="community-original-label">선택한 가게</p><strong class="selected-store-name">${escapeHtml(store.name)}</strong><p class="community-original-label">처음 선택한 주문방법</p><a class="selected-app-continue community-choice-original" href="${escapeHtml(selectedRoute.url)}" target="_blank" rel="noopener" data-community-original="${selectedRoute.key}">${appIcon(selectedRoute.key, 'fee-guide-icon')}<span><b>${escapeHtml(store.name)}</b><small>${escapeHtml(continueLabel)} 계속 주문하기</small></span><b>›</b></a>${fromBrowser ? `<button type="button" class="community-back" data-back-app-browser="${selectedRoute.key}">← ${escapeHtml(selectedMeta.label)} 가게목록으로</button>` : ''}<p class="community-order-note">어떤 주문방법을 선택해도 됩니다. 고객님의 비용과 편의를 먼저 확인해 주세요.</p></section>`;
};

function rc3FeedbackApplicationFields() {
  return `<div class="feedback-app-fields" data-rc3-application-fields hidden><label>신청자 이름<input name="applicantName" autocomplete="name" disabled></label><label>연락 가능한 전화번호<input name="contactPhone" inputmode="tel" autocomplete="tel" disabled></label><label>가게와의 관계<select name="relationship" disabled><option value="">선택하세요</option><option>사장님</option><option>직원</option><option>기타</option></select></label><fieldset><legend>희망 주문앱</legend><div class="feedback-channel-list">${RC3_FEEDBACK_CHANNELS.map(channel => `<label><input type="checkbox" name="channels" value="${escapeHtml(channel)}" disabled><span>${escapeHtml(channel)}</span></label>`).join('')}</div></fieldset><label class="feedback-consent"><input type="checkbox" name="privacyConsent" value="동의" disabled><span>개인정보 수집·연락에 동의합니다.</span></label><p class="feedback-error" data-rc3-feedback-error hidden></p></div>`;
}

feedbackModal = function rc3FeedbackModal(store) {
  const appOptions = ['해당 없음', '먹깨비', '땡겨요', '온동네', '배달의민족', '쿠팡이츠', '요기요', '가게바로주문', '전화주문'];
  openModal(`<section class="feedback-sheet" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">정보 수정 요청</h2><p>입력한 내용은 다른 고객에게 공개되지 않습니다.</p><form id="storeFeedbackForm"><label>가게명<input name="storeName" value="${escapeHtml(store.name)}" readonly required></label><label>요청 종류<select name="issueType" data-rc3-issue-type required><option value="">선택하세요</option><option>사진 오류</option><option>전화번호 오류</option><option>주문앱에서 가게 없음</option><option>폐업·휴업 의심</option><option>주소·위치 오류</option><option>사장님 주문앱 입점 신청</option></select></label><label data-rc3-related-app>관련 주문앱<select name="app">${appOptions.map(item => `<option>${item}</option>`).join('')}</select></label>${rc3FeedbackApplicationFields()}<button type="submit" class="feedback-submit">접수 내용 준비하기</button></form><small>전송 전 비공개 접수폼에서 내용을 다시 확인할 수 있습니다.</small></section>`);
};

function rc3ToggleApplicationFields(select) {
  const form = select?.form;
  const fields = form?.querySelector('[data-rc3-application-fields]');
  if (!fields) return;
  const active = select.value === '사장님 주문앱 입점 신청';
  fields.hidden = !active;
  fields.querySelectorAll('input,select').forEach(control => {
    control.disabled = !active;
    if (active && ['applicantName', 'contactPhone', 'relationship'].includes(control.name)) control.required = true;
    else control.required = false;
  });
  const consent = fields.querySelector('[name="privacyConsent"]');
  if (consent) consent.required = active;
  const related = form.querySelector('[data-rc3-related-app]');
  if (related) related.hidden = active;
}

function rc3FeedbackText(report) {
  return [
    `요청 제목: ${report.storeName} ${report.issueType}`,
    `가게 ID: ${report.storeId}`,
    `가게명: ${report.storeName}`,
    `요청 유형: ${report.issueType}`,
    report.applicantName ? `신청자 이름: ${report.applicantName}` : '',
    report.contactPhone ? `연락 가능한 전화번호: ${report.contactPhone}` : '',
    report.relationship ? `가게와의 관계: ${report.relationship}` : '',
    report.channels?.length ? `희망 주문앱: ${report.channels.join(', ')}` : `관련 주문앱: ${report.app || '해당 없음'}`,
    report.privacyConsent ? '개인정보 수집·연락 동의: 동의' : '',
    `페이지 URL: ${report.pageUrl}`
  ].filter(Boolean).join('\n');
}

submitFeedback = async function rc3SubmitFeedback(form) {
  const store = fxStoreById(form.closest('.feedback-sheet')?.dataset.storeId);
  if (!store) return;
  const data = new FormData(form);
  const issueType = String(data.get('issueType') || '');
  const application = issueType === '사장님 주문앱 입점 신청';
  const channels = data.getAll('channels').map(String);
  const error = form.querySelector('[data-rc3-feedback-error]');
  if (!form.reportValidity()) return;
  if (application && channels.length === 0) {
    error.textContent = '희망 주문앱을 한 개 이상 선택해 주세요.';
    error.hidden = false;
    return;
  }
  if (error) error.hidden = true;
  const report = {
    reportId: globalThis.crypto?.randomUUID?.() || `report-${Date.now()}`,
    storeId: String(store.id),
    storeName: store.name,
    issueType,
    app: application ? '' : String(data.get('app') || '해당 없음'),
    applicantName: application ? String(data.get('applicantName') || '') : '',
    contactPhone: application ? String(data.get('contactPhone') || '') : '',
    relationship: application ? String(data.get('relationship') || '') : '',
    channels,
    privacyConsent: application && data.get('privacyConsent') === '동의',
    reporterKey: visitorKey(),
    pageUrl: location.href,
    createdAt: new Date().toISOString(),
    status: '접수 대기'
  };
  writeLocalJson(FEEDBACK_QUEUE_KEY, [report, ...readLocalJson(FEEDBACK_QUEUE_KEY, [])].slice(0, 100));
  try { await navigator.clipboard?.writeText(rc3FeedbackText(report)); } catch {}
  openModal(`<section class="feedback-complete"><h2 id="modalTitle">접수 내용을 준비했습니다</h2><p>비공개 접수폼에서 내용을 확인한 뒤 직접 제출해 주세요. 이 화면만으로 접수가 완료되지는 않습니다.</p><a href="${FEEDBACK_FORM_URL}" target="_blank" rel="noopener">비공개 접수폼 열기</a><button type="button" data-feedback-copy="${escapeHtml(report.reportId)}">접수 내용 다시 복사</button></section>`);
};

copyQueuedReport = function rc3CopyQueuedReport(reportId) {
  const report = readLocalJson(FEEDBACK_QUEUE_KEY, []).find(item => item.reportId === reportId);
  if (report) navigator.clipboard?.writeText(rc3FeedbackText(report));
};

function rc3RailPointerTarget(event) {
  return event.target.closest('[data-rc3-rail-open]');
}

function rc3OnPointerDown(event) {
  const target = rc3RailPointerTarget(event);
  if (!target) return;
  rc3RailPointers.set(event.pointerId, {target, x: event.clientX, y: event.clientY, dragged: false});
  target.dataset.rc3Gesture = 'pending';
}

function rc3OnPointerMove(event) {
  const state = rc3RailPointers.get(event.pointerId);
  if (!state) return;
  if (Math.hypot(event.clientX - state.x, event.clientY - state.y) > 8) {
    state.dragged = true;
    state.target.dataset.rc3Gesture = 'drag';
  }
}

function rc3OnPointerEnd(event) {
  const state = rc3RailPointers.get(event.pointerId);
  if (!state) return;
  state.target.dataset.rc3Gesture = state.dragged ? 'drag' : 'tap';
  rc3RailPointers.delete(event.pointerId);
  setTimeout(() => state.target.removeAttribute('data-rc3-gesture'), 500);
}

function rc3HandleClick(event) {
  const allMain = event.target.closest('[data-cat="전체"]');
  if (allMain) {
    event.preventDefault();
    event.stopImmediatePropagation();
    rc3ShowAllOnHome();
    return;
  }
  const allModal = event.target.closest('[data-modal-cat="전체"]');
  if (allModal) {
    event.preventDefault();
    event.stopImmediatePropagation();
    rc3ShowAllOnHome({close: true});
    return;
  }
  const railOpen = event.target.closest('[data-rc3-rail-open]');
  if (railOpen) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (railOpen.dataset.rc3Gesture === 'drag') return;
    const store = fxStoreById(railOpen.dataset.rc3RailOpen);
    if (store) openStore(store);
    return;
  }
  const other = event.target.closest('[data-rc3-other-methods]');
  if (other) {
    event.preventDefault();
    event.stopImmediatePropagation();
    rc3OpenOrderMethods(fxStoreById(other.dataset.rc3OtherMethods));
    return;
  }
  const phone = event.target.closest('[data-rc3-phone-store]');
  if (phone) {
    event.preventDefault();
    event.stopImmediatePropagation();
    fxOpenPhoneConfirm(phone.dataset.rc3PhoneStore);
    return;
  }
  const external = event.target.closest('[data-rc3-external-route]');
  if (external) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const store = fxStoreById(external.dataset.storeId || $('#modal').dataset.activeStoreId);
    if (store) openCommunityChoice(store, external.dataset.rc3ExternalRoute);
    return;
  }
  if (event.target.closest('[data-rc3-final-phone]')) {
    fxFormation();
    fxBridgeLight();
  }
}

const rc3InstallEventsBase = fxInstallEvents;
fxInstallEvents = function rc3InstallEvents() {
  rc3InstallEventsBase();
  if (rc3EventsInstalled) return;
  rc3EventsInstalled = true;
  document.addEventListener('pointerdown', rc3OnPointerDown, true);
  document.addEventListener('pointermove', rc3OnPointerMove, true);
  document.addEventListener('pointerup', rc3OnPointerEnd, true);
  document.addEventListener('pointercancel', rc3OnPointerEnd, true);
  document.addEventListener('click', rc3HandleClick, true);
  document.addEventListener('change', event => {
    const issueType = event.target.closest('[data-rc3-issue-type]');
    if (issueType) rc3ToggleApplicationFields(issueType);
  });
};

const rc3InitializeBase = fxInitialize;
fxInitialize = async function rc3Initialize() {
  await rc3InitializeBase();
  const internalPhones = await fetchJson(RC3_PHONE_INTERNAL_URL, {stores: []});
  rc3InternalPhoneByStore = new Map((internalPhones.stores || []).map(item => [String(item.store_id), item]));
  renderCategories();
  fxRenderRails();
};
