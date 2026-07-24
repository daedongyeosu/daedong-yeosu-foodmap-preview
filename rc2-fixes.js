'use strict';

/* RC2 fixes only. Frozen store, photo, route, brand-app, HappyOrder and banner data stay read-only. */
const RC2_NAVER_AUDIT_URL = 'data/naver-map-runtime.json';
const RC2_EXTERNAL_RETURN = 'daedongExternalReturnRc2';
const RC2_ICON_SPRITE = 'assets/ui/category-icons.svg';
const rc2NativeOpenModal = openModal;
const rc2NativeHardClose = hardClose;
const rc2ModalStack = [];
const rc2ActivePresses = new Set();
const rc2PressTimers = new WeakMap();
const rc2NaverByStore = new Map();
let rc2ModalRestoring = false;
let rc2ReplaceNextModal = false;
let rc2AmbientTimers = [];
let rc2PeriodicTimer = 0;

function rc2Icon(id, className = 'category-local-icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="${RC2_ICON_SPRITE}#${id}"></use></svg>`;
}

function rc2CategoryIconId(name) {
  const value = String(name || '');
  if (value === '전체') return 'all';
  if (/치킨|닭/.test(value)) return 'chicken';
  if (/피자|파스타/.test(value)) return 'pizza';
  if (/버거|햄버거/.test(value)) return 'burger';
  if (/중식|짜장|짬뽕|마라|양꼬치/.test(value)) return 'chinese';
  if (/분식|떡볶이|도시락/.test(value)) return 'snack';
  if (/족발|보쌈|고기|구이|삼겹|갈비/.test(value)) return 'pork';
  if (/면|국수|냉면|우동|라멘/.test(value)) return 'noodles';
  if (/회|해산물|횟집|수산/.test(value)) return 'seafood';
  if (/카페|커피/.test(value)) return 'cafe';
  if (/디저트|빙수|아이스크림/.test(value)) return 'dessert';
  if (/베이커리|빵|떡/.test(value)) return 'bakery';
  if (/야식|주점|술집/.test(value)) return 'night';
  if (/한식|국밥|찜|탕|찌개|조림|죽|반찬/.test(value)) return 'korean';
  if (/샐러드|건강/.test(value)) return 'salad';
  if (/샌드위치/.test(value)) return 'sandwich';
  if (/음료/.test(value)) return 'drink';
  if (/편의점/.test(value)) return 'convenience';
  return 'other';
}

function rc2HappyIconId(name) {
  const exact = {
    '베이커리': 'bakery', '디저트': 'dessert', '카페': 'cafe', '샐러드': 'salad',
    '샌드위치': 'sandwich', '버거': 'burger', '치킨': 'chicken',
    '파스타·피자': 'pizza', '분식': 'snack', '편의점': 'convenience'
  };
  return exact[name] || rc2CategoryIconId(name);
}

function rc2SnapshotModal() {
  const modal = $('#modal');
  const card = modal?.querySelector('.modal-card');
  return {
    html: $('#modalContent')?.innerHTML || '',
    className: modal?.className || 'modal',
    dataset: modal ? {...modal.dataset} : {},
    scrollTop: card?.scrollTop || 0,
    pageScroll: Number(document.body.dataset.lockScrollY || window.scrollY || 0),
    photoIndex: detailCarousel?.logicalIndex?.() ?? 0
  };
}

function rc2RestoreSnapshot(snapshot) {
  if (!snapshot) return;
  rc2ModalRestoring = true;
  rc2NativeOpenModal(snapshot.html);
  const modal = $('#modal');
  modal.className = snapshot.className;
  for (const key of Object.keys(modal.dataset)) delete modal.dataset[key];
  Object.assign(modal.dataset, snapshot.dataset);
  const carouselRoot = $('#detailPhotoCarousel');
  if (carouselRoot) {
    detailCarousel = new InfiniteCarousel(carouselRoot, {interval: 3500});
    detailCarousel.goTo?.(snapshot.photoIndex || 0);
  }
  requestAnimationFrame(() => {
    const card = modal.querySelector('.modal-card');
    if (card) card.scrollTop = snapshot.scrollTop || 0;
  });
  rc2ModalRestoring = false;
  rc2ScrubCustomerCounts(modal);
}

openModal = function rc2OpenModal(html) {
  const modal = $('#modal');
  const wasHidden = !modal || modal.hidden;
  const replacing = rc2ReplaceNextModal;
  rc2ReplaceNextModal = false;
  if (!wasHidden && !rc2ModalRestoring && !replacing) rc2ModalStack.push(rc2SnapshotModal());
  rc2NativeOpenModal(html);
  if (!rc2ModalRestoring) {
    if (wasHidden) {
      history.replaceState({...history.state, daedongModal: true, rc2ModalDepth: 1}, '');
    } else if (!replacing) {
      history.pushState({daedongModal: true, rc2ModalDepth: rc2ModalStack.length + 1}, '');
    }
  }
  rc2ScrubCustomerCounts($('#modal'));
};

hardClose = function rc2HardClose(options = {}) {
  if (options.fromPop && rc2ModalStack.length) {
    rc2RestoreSnapshot(rc2ModalStack.pop());
    return;
  }
  if (!options.fromPop && rc2ModalStack.length) {
    history.back();
    return;
  }
  rc2ModalStack.length = 0;
  rc2NativeHardClose(options);
};
closeModal = hardClose;
window.hardClose = hardClose;
window.hideModal = hardClose;
window.closeModal = hardClose;

function rc2ReplaceModal() {
  rc2ReplaceNextModal = !$('#modal')?.hidden;
}

function rc2SelectedCategoryMarkup(category) {
  return `<h3 class="app-browser-selected-category" aria-live="polite">${escapeHtml(category)}</h3>`;
}

function rc2RevealSelectedCategory() {
  requestAnimationFrame(() => {
    const card = $('#modal .modal-card');
    const chips = $('#modal .app-browser-category-chips');
    const active = chips?.querySelector('button.active');
    if (card) card.scrollTop = 0;
    if (!chips || !active) return;
    chips.scrollLeft = Math.max(0, active.offsetLeft - (chips.clientWidth - active.offsetWidth) / 2);
  });
}

function rc2ScrubCustomerCounts(root = document) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = node.nodeValue.replace(/\s*\d[\d,]*\s*곳(?=\s|$|[·/()])/g, '');
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

fxCategoryMarkup = function rc2CategoryMarkup(name) {
  return `<button type="button" class="category glass-action ${state.category === name ? 'active' : ''}" data-cat="${escapeHtml(name)}">${rc2Icon(rc2CategoryIconId(name))}<span>${escapeHtml(name)}</span></button>`;
};

renderCategories = function rc2RenderCategories() {
  const names = ['전체', ...mainCategories()];
  $('#categoryGrid').innerHTML = names.map(fxCategoryMarkup).join('');
};

allCategoriesModal = function rc2AllCategoriesModal() {
  openModal(`<section class="category-modal"><h2 id="modalTitle">전체 음식 카테고리</h2><div class="all-category-list rc2-category-list">${categories.map(name => `<button type="button" data-modal-cat="${escapeHtml(name)}">${rc2Icon(rc2CategoryIconId(name), 'category-modal-icon')}<b>${escapeHtml(name)}</b></button>`).join('')}</div></section>`);
};

const RC2_RAIL_SPECS = [
  {id: 'today', title: '오늘의 추천', desc: '지금 확인하기 좋은 여수 가게'},
  {id: 'near', kind: 'near', title: '지금 가까운 가게', desc: '선택한 위치를 먼저 반영해요'},
  {id: 'local', kind: 'local', title: '여수에 힘이 되는 주문', desc: '지역 주문경로가 확인된 가게'},
  {id: 'solo', title: '나 혼자 술 한잔', desc: '혼자 즐기기 좋은 안주와 소량 메뉴', pattern: /닭발|곱창|회|족발|보쌈|치킨|닭강정|국물|분식|야식|주점/},
  {id: 'group', title: '오늘은 회식이다', desc: '여럿이 나누기 좋은 메뉴', pattern: /회|해산물|족발|보쌈|치킨|고기|삼겹|아귀|해물찜|찜닭|탕|전골/},
  {id: 'warm', title: '왕후의 밥, 걸인의 찬', desc: '소박해도 마음까지 따뜻해지는 한 끼', pattern: /백반|집밥|국밥|찌개|죽|김치찜|도시락|반찬|한식/},
  {id: 'appetite', title: '입맛 없을 때', desc: '매콤하고 새콤한 음식', pattern: /냉면|밀면|쫄면|비빔|마라|떡볶이|김치/},
  {id: 'rain', title: '비 오는 날', desc: '현재 여수에 비가 올 때 생각나는 음식', pattern: /전|국밥|찌개|탕|수제비|칼국수|짬뽕|부침/},
  {id: 'noodle', title: '면 음식이 당길 때', desc: '국수·면·짬뽕 한 그릇', pattern: /면|국수|짬뽕|짜장|파스타|우동|라멘/},
  {id: 'sweet', title: '시원하고 달달한 것이 당길 때', desc: '카페·빙수·디저트', pattern: /카페|커피|디저트|빙수|아이스크림|베이커리|떡/},
  {id: 'mood', title: '기분전환이 필요할 때', desc: '평소와 다른 메뉴', pattern: /피자|버거|치킨|마라|아시안|돈까스|일식/},
  {id: 'new', kind: 'new', title: '새로 들어온 가게', desc: '최근 지도에 등록된 가게'}
];

fxSelectedRails = function rc2SelectedRails() {
  const hour = new Date().getHours();
  let ids;
  if (fxRainState !== 'clear') ids = ['today', 'rain', 'near', 'local', hour >= 17 ? 'group' : 'warm', 'new'];
  else if (hour >= 17) ids = ['today', 'near', 'local', 'group', 'solo', 'new'];
  else ids = ['today', 'near', 'local', 'warm', 'appetite', 'new'];
  return ids.map(id => RC2_RAIL_SPECS.find(spec => spec.id === id));
};

function rc2BrandKey(store) {
  const direct = fxBrandByStore.get(String(store.id));
  if (direct?.brandName) return normalize(direct.brandName);
  for (const group of BRAND_GROUPS) {
    const brand = group.brands.find(item => brandMatchesStore(store, item));
    if (brand) return normalize(brand.label);
  }
  const base = String(store.realBusinessName || store.name)
    .replace(/\([^)]*\)/g, '')
    .replace(/여수|돌산|문수|국동|봉산|웅천|학동|교동|신기|덕충|죽림|미평|여서|무선|소호|중앙|충무|봉강|안산|엑스포/g, '')
    .replace(/(?:직영|본|\d+호)?지?점.*$/g, '');
  return normalize(base) || normalize(store.name);
}

function rc2RepresentativeMethod(store) {
  const routeOrder = ['direct', 'mukkebi', 'ddangyo', 'ondongne'];
  for (const key of routeOrder) if (routeFor(store, key)) return APP_META[key].label;
  if (fxBrandByStore.has(String(store.id))) return '브랜드앱';
  if (fxHappyByStore.has(String(store.id))) return '해피오더';
  if (fxPhoneByStore.has(String(store.id))) return '전화주문';
  for (const key of ['yogiyo', 'coupang', 'baemin']) if (routeFor(store, key)) return APP_META[key].label;
  return '주문방법 확인';
}

const RC2_RAIL_RANDOM_SEED = String(Date.now()) + '-' + String(Math.random());

function rc2StringSeed(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rc2SeededShuffle(list, seedText) {
  const result = [...list];
  let seed = rc2StringSeed(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    const swapIndex = Math.floor(random * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function rc2RandomizedRailStores(stores, spec, groupKey) {
  const locationKey = [
    RC2_RAIL_RANDOM_SEED,
    spec.id,
    state.location,
    state.addressLabel,
    state.coords?.lat ?? '',
    state.coords?.lng ?? '',
    groupKey
  ].join('|');
  const result = [];
  for (let index = 0; index < stores.length; index += 16) {
    result.push(...rc2SeededShuffle(stores.slice(index, index + 16), locationKey + '|' + index));
  }
  return result;
}

function rc2RailCandidates(spec, globallyUsed = new Set(), limit = 8) {
  const brandKeys = new Set();
  const photoKeys = new Set();
  const selectedIds = new Set();
  const result = [];
  const groups = [];
  for (const store of fxRankStores(spec)) {
    const bucket = Number.isFinite(store.rc6LocationBucket) ? store.rc6LocationBucket : 9;
    const tier = typeof rc6OwnershipTier === 'function' ? rc6OwnershipTier(store) : 2;
    const key = String(bucket) + ':' + String(tier);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) groups.push({key, stores: [store]});
    else last.stores.push(store);
  }
  for (const group of groups) {
    group.stores = rc2RandomizedRailStores(group.stores, spec, group.key);
  }
  const addStore = (store, relaxDiversity = false, allowGlobalReuse = false) => {
    const storeId = String(store.id);
    if (selectedIds.has(storeId) || (!allowGlobalReuse && globallyUsed.has(storeId))) return;
    const brandKey = rc2BrandKey(store);
    const photoKey = fxPhoto(store);
    if (!relaxDiversity && (brandKeys.has(brandKey) || (photoKey && photoKeys.has(photoKey)))) return;
    result.push(store);
    selectedIds.add(storeId);
    brandKeys.add(brandKey);
    if (photoKey) photoKeys.add(photoKey);
    globallyUsed.add(storeId);
  };
  const fillGroup = (group, allowGlobalReuse, relaxDiversity) => {
    for (const store of group.stores) {
      addStore(store, relaxDiversity, allowGlobalReuse);
      if (result.length >= limit) return true;
    }
    return false;
  };
  for (const group of groups) {
    if (fillGroup(group, false, false)) return result;
    if (fillGroup(group, false, true)) return result;
    if (fillGroup(group, true, false)) return result;
    if (fillGroup(group, true, true)) return result;
  }
  return result;
}

function rc2RailCard(store) {
  return `<article class="rail-card" data-rail-card-store="${escapeHtml(store.id)}"><button type="button" class="rail-card-open glass-action" data-rail-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span class="rail-card-copy"><h3>${escapeHtml(store.name)}</h3><p>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</p></span></button><footer><span class="rail-method">${escapeHtml(rc2RepresentativeMethod(store))}</span><button type="button" class="rail-order-button glass-action" data-rail-store-id="${escapeHtml(store.id)}">주문방법 보기</button></footer></article>`;
}

fxRenderRails = function rc2RenderRails() {
  const root = $('#recommendRails');
  if (!root) return;
  if (state.category !== '전체' || state.query || state.brandId) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }
  root.hidden = false;
  const globallyUsed = new Set();
  root.innerHTML = fxSelectedRails().map(spec => {
    const cards = rc2RailCandidates(spec, globallyUsed, 8);
    const allCandidates = fxRankStores(spec);
    return `<section class="recommend-rail" data-rail="${spec.id}"><header class="recommend-rail-head"><div><h2>${escapeHtml(spec.title)}</h2><p>${escapeHtml(spec.desc)}</p></div>${allCandidates.length > cards.length ? `<button type="button" data-rail-more="${spec.id}">이 추천 가게 더보기</button>` : ''}</header><div class="recommend-track">${cards.map(rc2RailCard).join('') || '<p class="empty">추천 가게를 확인 중입니다.</p>'}</div></section>`;
  }).join('');
};

renderStores = function rc2RenderStores(options = {}) {
  fxOriginalRenderStores(options);
  if (state.category === '전체' && !state.query && !state.brandId) $('#recommendSection h2').textContent = '가게목록';
  $('#loadMoreBtn').textContent = '더보기';
  fxRenderRails();
  rc2ScrubCustomerCounts($('#app'));
};

function rc2OpenRailList(specId) {
  const spec = RC2_RAIL_SPECS.find(item => item.id === specId);
  if (!spec) return;
  const cards = rc2RailCandidates(spec, new Set(), 40).map(store => `<button type="button" class="app-browser-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${appBrowserPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</small><span>${escapeHtml(rc2RepresentativeMethod(store))}</span></span><b>›</b></button>`).join('');
  openModal(`<section class="app-browser rail-list-modal"><h2 id="modalTitle">${escapeHtml(spec.title)}</h2><p>${escapeHtml(spec.desc)}</p><div class="app-browser-list">${cards || '<p class="empty">추천 가게를 확인 중입니다.</p>'}</div></section>`);
}

fxAppBrowserMarkup = function rc2AppBrowserMarkup(key, selectedCategory = '추천') {
  const meta = APP_META[key];
  const all = appRegisteredStores(key);
  const cats = categoriesFromStores(all);
  const filtered = selectedCategory === '추천' ? all : all.filter(store => storeMatchesCategory(store, selectedCategory));
  const list = applyCategoryPriorityOverrides(filtered, selectedCategory);
  const isExternal = EXTERNAL_APP_KEYS.includes(key);
  const chips = `<nav class="app-browser-category-chips"><button type="button" data-app-category="추천" class="${selectedCategory === '추천' ? 'active' : ''}">추천</button>${cats.map(cat => `<button type="button" data-app-category="${escapeHtml(cat)}" class="${selectedCategory === cat ? 'active' : ''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
  const cards = list.map(store => `<button type="button" class="app-browser-card glass-action" data-app-store-id="${escapeHtml(store.id)}" data-app-key="${key}">${appBrowserPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</small><span>${isExternal ? `<span class="external-app-card-label">${escapeHtml(meta.label)}</span>` : appIcon(key, 'app-browser-app-icon')}</span></span><b>›</b></button>`).join('');
  return `<section class="app-browser"><header class="app-browser-head${isExternal ? ' external-app-browser-head' : ''}">${isExternal ? '' : appIcon(key, 'app-browser-head-icon')}<div><h2 id="modalTitle">${escapeHtml(meta.label)} 등록 가게</h2><p>실제 주문주소가 등록된 가게만 보여드립니다.</p></div></header>${chips}${rc2SelectedCategoryMarkup(selectedCategory)}<div class="app-browser-list">${cards || '<div class="empty">해당 조건의 가게가 없습니다.</div>'}</div>${isExternal ? externalAppNoticeMarkup() : ''}</section>`;
};

openAppBrowser = function rc2OpenAppBrowser(key, selectedCategory = '추천') {
  if (!['direct', 'mukkebi', 'ddangyo', 'ondongne', 'yogiyo', 'coupang', 'baemin'].includes(key)) return;
  const modal = $('#modal');
  if (!modal.hidden && modal.dataset.appBrowserKey === key) rc2ReplaceModal();
  openModal(fxAppBrowserMarkup(key, selectedCategory));
  modal.dataset.appBrowserKey = key;
  modal.dataset.appBrowserCategory = selectedCategory;
  rc2RevealSelectedCategory();
};
globalExternalGuide = function rc2GlobalExternalGuide(key) { openAppBrowser(key); };

function rc2OpenOtherApps() {
  openModal(`<section class="app-browser other-apps-modal"><h2 id="modalTitle">다른 주문앱</h2><p>이용할 주문앱을 선택해 등록된 가게를 확인하세요.</p><div class="other-app-choice-grid"><button type="button" class="glass-action" data-global-external="yogiyo"><span class="external-app-choice-label">요기요</span></button><button type="button" class="glass-action" data-global-external="coupang"><span class="external-app-choice-label">쿠팡이츠</span></button><button type="button" class="glass-action" data-global-external="baemin"><span class="external-app-choice-label">배달의민족</span></button></div>${externalAppNoticeMarkup()}</section>`);
}

fxOpenPhoneDirectory = function rc2OpenPhoneDirectory(category = '추천') {
  const all = fxPhoneStores();
  const cats = categoriesFromStores(all.map(item => item.store));
  const list = fxPhoneStores(category);
  if (!$('#modal')?.hidden && $('#modalContent .phone-order-sheet')) rc2ReplaceModal();
  const chips = `<nav class="app-browser-category-chips"><button type="button" data-phone-category="추천" class="${category === '추천' ? 'active' : ''}">추천</button>${cats.map(cat => `<button type="button" data-phone-category="${escapeHtml(cat)}" class="${category === cat ? 'active' : ''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
  const cards = list.map(({store}) => `<button type="button" class="phone-order-card glass-action" data-phone-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
  openModal(`<section class="phone-order-sheet"><h2 id="modalTitle">전화주문 가능한 가게</h2><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다.<br>전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p>${chips}${rc2SelectedCategoryMarkup(category)}<div class="phone-order-list">${cards || '<p class="empty">확인 가능한 전화페이지가 없습니다.</p>'}</div></section>`);
  rc2RevealSelectedCategory();
};

fxOpenPhoneConfirm = function rc2OpenPhoneConfirm(id) {
  const item = fxPhoneByStore.get(String(id));
  const store = fxStoreById(id);
  const phone = String(store?.phone || '').replace(/[^0-9]/g, '');
  const valid = /^02\d{7,8}$/.test(phone) || /^0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/.test(phone) || /^01[016789]\d{7,8}$/.test(phone) || /^070\d{8}$/.test(phone);
  if (!item?.clickableTel || !store || !valid) return;
  openModal(`<section class="phone-order-confirm" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">${escapeHtml(store.name)} 전화주문</h2><div class="phone-confirm-photo">${fxCardPhoto(store)}</div><p>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</p><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다.<br>전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p><div class="phone-confirm-actions"><a class="phone-call-link" href="tel:${escapeHtml(phone)}">전화 걸기</a><button class="phone-cancel" type="button" data-phone-cancel>취소</button></div></section>`);
  $('#modal').dataset.activeStoreId = store.id;
  history.replaceState({...history.state, storeId: String(store.id)}, '');
};

function rc2DirectBrandCategory(name) {
  if (/치킨|BHC|비비큐|굽네|교촌|통닭|두마리|꾸브라꼬|순살/.test(name)) return '치킨';
  if (/피자|도미노/.test(name)) return '피자';
  if (/버거|맘스터치|맥도날드/.test(name)) return '버거';
  if (/파리바게뜨|뚜레쥬르/.test(name)) return '베이커리';
  if (/배스킨|요아정/.test(name)) return '디저트';
  if (/커피|카페|투썸|이디야|메가MGC|더벤티|하이오/.test(name)) return '카페';
  if (/공차/.test(name)) return '음료';
  return '기타';
}

fxDirectBrands = function rc2DirectBrands() {
  const map = new Map();
  for (const [id, item] of fxBrandByStore) {
    if (!map.has(item.brandName)) map.set(item.brandName, {name: item.brandName, icon: item.icon, category: rc2DirectBrandCategory(item.brandName), stores: []});
    map.get(item.brandName).stores.push(id);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
};

function rc2BrandCategoryChips(selected = '전체') {
  const order = ['전체', '치킨', '피자', '버거', '카페', '디저트', '베이커리', '음료', '샌드위치', '기타'];
  const available = new Set(fxDirectBrands().map(item => item.category));
  return `<nav class="app-browser-category-chips brand-category-chips">${order.filter(item => item === '전체' || available.has(item)).map(item => `<button type="button" data-direct-category="${item}" class="${selected === item ? 'active' : ''}">${item}</button>`).join('')}</nav>`;
}

fxOpenBrandHub = function rc2OpenBrandHub(view = 'channels', value = '') {
  if (view === 'channels') {
    openModal(`<section class="brand-app-hub"><h2 id="modalTitle">브랜드앱 주문</h2><p>직접 브랜드앱과 공통 주문채널 해피오더를 각각 선택할 수 있습니다.</p><div class="brand-app-grid"><button type="button" class="brand-app-tile glass-action" data-brand-view="direct">${fxSvg('store', 'order-svg')}<b>직접 브랜드앱</b><small>Android 앱</small></button><button type="button" class="brand-app-tile glass-action" data-brand-view="happy"><img src="assets/order-channels/happyorder.png" alt="해피오더"><b>해피오더</b><small>공통 주문채널</small></button></div></section>`);
    return;
  }
  if (view === 'direct') {
    const category = value || '전체';
    if (!$('#modal')?.hidden && $('#modalContent .direct-brand-browser')) rc2ReplaceModal();
    const brands = fxDirectBrands().filter(brand => category === '전체' || brand.category === category);
    const cards = brands.map(brand => `<button type="button" class="brand-app-tile glass-action" data-direct-brand="${escapeHtml(brand.name)}">${brand.icon ? `<img src="${escapeHtml(brand.icon)}" alt="">` : rc2Icon('other', 'order-svg')}<b>${escapeHtml(brand.name)}</b></button>`).join('');
    openModal(`<section class="brand-app-hub direct-brand-browser"><h2 id="modalTitle">직접 브랜드앱</h2><p>현재 검증된 링크는 Android Google Play입니다. iPhone은 자동 이동하지 않습니다.</p>${rc2BrandCategoryChips(category)}${rc2SelectedCategoryMarkup(category)}<div class="brand-app-grid">${cards}</div></section>`);
    rc2RevealSelectedCategory();
    return;
  }
  if (view === 'direct-stores') {
    const brand = fxDirectBrands().find(item => item.name === value);
    const cards = (brand?.stores || []).map(fxStoreById).filter(fxVisible).map(store => `<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
    openModal(`<section class="brand-app-hub"><h2 id="modalTitle">${escapeHtml(value)}</h2><p>대동여수음식지도에 등록된 해당 브랜드 여수 지점입니다.</p><div class="channel-store-list">${cards}</div></section>`);
    return;
  }
  if (view === 'happy') {
    const categories = [...(fxHappyData.categories || [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const confirmed = new Set((fxHappyData.currentScreenBrands || []).filter(item => item.currentScreenConfirmed).map(item => item.category));
    openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더</h2><p>카테고리를 선택한 뒤 해피오더에서 확인된 브랜드와 여수 지점을 찾아보세요.</p><div class="happy-category-grid">${categories.map(item => `<button type="button" class="happy-category-tile glass-action" data-happy-category="${escapeHtml(item.categoryName)}" ${confirmed.has(item.categoryName) ? '' : 'disabled'}>${rc2Icon(rc2HappyIconId(item.categoryName), 'happy-category-icon')}<b>${escapeHtml(item.categoryName)}</b></button>`).join('')}</div></section>`);
    return;
  }
  if (view === 'happy-brands') {
    const unique = new Map();
    for (const item of fxHappyData.currentScreenBrands || []) if (item.category === value && item.currentScreenConfirmed) unique.set(item.brandName, item);
    const brands = [...unique.values()];
    openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><div class="happyorder-brand-grid">${brands.map(brand => `<button type="button" class="happyorder-brand-tile glass-action" data-happy-brand="${escapeHtml(brand.brandName)}">${brand.brandSelectionImage ? `<img src="${escapeHtml(brand.brandSelectionImage)}" alt="">` : '<img src="assets/order-channels/happyorder.png" alt="">'}<b>${escapeHtml(brand.brandName)}</b></button>`).join('')}</div></section>`);
    return;
  }
  if (view === 'happy-stores') {
    const ids = [...fxHappyByStore].filter(([, item]) => item.brandName === value).map(([id]) => id);
    const cards = ids.map(fxStoreById).filter(fxVisible).map(store => `<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || '여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
    openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><p>주소 설정 후 주변 주문 가능 매장이 표시됩니다. 지역과 영업 상태에 따라 일부 매장은 표시되지 않을 수 있습니다.</p><div class="channel-store-list">${cards}</div></section>`);
  }
};
brandsModal = function rc2BrandsModal() { fxOpenBrandHub('channels'); };

fxEnhanceStoreDetail = function rc2EnhanceStoreDetail(store) {
  const detail = $('#modalContent .store-detail');
  if (!detail) return;
  const mapAudit = rc2NaverByStore.get(String(store.id));
  const naverLink = detail.querySelector('.detail-quick-link[data-detail-only="naver"]');
  if (!mapAudit || mapAudit.status !== 'verified') naverLink?.remove();
  const brand = fxBrandByStore.get(String(store.id));
  const happy = fxHappyByStore.get(String(store.id));
  if (brand || happy) {
    const target = detail.querySelector('.store-other-wrap') || detail.querySelector('.detail-personal-actions');
    const html = `<div class="brand-store-actions">${brand ? fxAppAction(brand, 'brand') : ''}${happy ? fxAppAction(happy, 'happy') : ''}</div>`;
    target?.insertAdjacentHTML('beforebegin', html);
  }
  detail.querySelectorAll('.detail-quick-link .quick-icon').forEach(icon => {
    const text = icon.parentElement.textContent;
    icon.innerHTML = text.includes('네이버') ? fxSvg('map') : fxSvg('card');
  });
  const actions = detail.querySelector('.detail-personal-actions');
  if (actions && !actions.querySelector('[data-share-store]')) {
    actions.classList.add('final-personal-actions');
    actions.insertAdjacentHTML('beforeend', `<button type="button" class="detail-personal-btn glass-action" data-share-store="${escapeHtml(store.id)}">공유하기</button>`);
  }
};

openStore = function rc2OpenStore(store) {
  if (!fxVisible(store)) return;
  fxOriginalOpenStore(store);
  fxEnhanceStoreDetail(store);
  history.replaceState({...history.state, storeId: String(store.id)}, '');
};

guide = function rc2Guide() {
  openModal('<h2 id="modalTitle">원하는 방법으로 편하게 주문하세요</h2><p>가게마다 이용 가능한 주문방법을 한눈에 확인할 수 있습니다. 가게를 먼저 선택한 뒤 원하는 경로를 확인해 주세요.</p>');
};

function rc2ReleasePress(target) {
  if (!target || !rc2ActivePresses.has(target)) return;
  clearTimeout(rc2PressTimers.get(target));
  const timer = setTimeout(() => {
    target.classList.remove('pressing');
    target.removeAttribute('data-press-active');
    rc2ActivePresses.delete(target);
  }, 190);
  rc2PressTimers.set(target, timer);
}

fxPressStart = function rc2PressStart(event) {
  const target = event.target.closest('.glass-action,.category,.brand-app-tile,.happyorder-brand-tile,.happy-category-tile,.phone-order-card,.channel-store-card,.primary-btn');
  if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true' || target.dataset.pressActive === '1') return;
  target.dataset.pressActive = '1';
  target.classList.add('pressing');
  rc2ActivePresses.add(target);
  fxRipple(event.clientX, event.clientY);
  const timer = setTimeout(() => rc2ReleasePress(target), 260);
  rc2PressTimers.set(target, timer);
};

function rc2ReleaseAllPresses() {
  for (const target of [...rc2ActivePresses]) rc2ReleasePress(target);
}

fxFormation = function rc2Formation() {
  const lane = $('#navalLane');
  if (!lane) return;
  lane.querySelectorAll('.turtle-ship').forEach(node => node.remove());
  [['lead', 9], ['escort', 2], ['escort two', 17]].forEach(([className, bottom]) => {
    const ship = document.createElement('i');
    ship.className = `turtle-ship ${className}`;
    ship.style.left = '16px';
    ship.style.bottom = `${bottom}px`;
    lane.append(ship);
    setTimeout(() => ship.remove(), 760);
  });
};

fxFireworks = function rc2Fireworks(withToast = false) {
  const layer = $('#microFxLayer');
  if (!layer || document.hidden || layer.querySelector('.firework')) return;
  if (fxReduced()) {
    fxBridgeLight();
    layer.classList.add('reduced-firework-flash');
    setTimeout(() => layer.classList.remove('reduced-firework-flash'), 180);
    return;
  }
  for (const [left, top, delay] of [['10%', '40px', '0ms'], ['86%', '62px', '80ms'], ['72%', '28px', '145ms']]) {
    const fire = document.createElement('i');
    fire.className = 'firework';
    fire.style.left = left;
    fire.style.top = top;
    fire.style.animationDelay = delay;
    layer.append(fire);
    setTimeout(() => fire.remove(), 900);
  }
  if (withToast) {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.textContent = '여수에 힘이 되는 주문길을 선택했어요';
    layer.append(toast);
    setTimeout(() => toast.remove(), 1200);
  }
};

function rc2StopAmbient() {
  rc2AmbientTimers.forEach(clearTimeout);
  rc2AmbientTimers = [];
  clearTimeout(rc2PeriodicTimer);
  rc2PeriodicTimer = 0;
}

function rc2SchedulePeriodicFirework() {
  clearTimeout(rc2PeriodicTimer);
  const delay = 25000 + Math.round(Math.random() * 10000);
  rc2PeriodicTimer = setTimeout(() => {
    if (!document.hidden && !fxLowPower()) fxFireworks(false);
    rc2SchedulePeriodicFirework();
  }, delay);
}

function rc2StartAmbient(firstEntry = false) {
  rc2StopAmbient();
  if (firstEntry) {
    rc2AmbientTimers.push(setTimeout(() => fxFireworks(false), 1000));
    rc2AmbientTimers.push(setTimeout(() => fxFormation(), 1500));
    rc2AmbientTimers.push(setTimeout(() => fxFireworks(false), 5000));
  }
  rc2SchedulePeriodicFirework();
}

function rc2RememberExternalReturn() {
  const modal = $('#modal');
  const storeId = modal?.dataset.activeStoreId || modal?.querySelector('[data-store-id]')?.dataset.storeId || history.state?.storeId;
  if (!storeId) return;
  const card = modal.querySelector('.modal-card');
  sessionStorage.setItem(RC2_EXTERNAL_RETURN, JSON.stringify({storeId: String(storeId), pageScroll: Number(document.body.dataset.lockScrollY || 0), modalScroll: card?.scrollTop || 0, savedAt: Date.now()}));
}

function rc2RestoreAfterExternalPage() {
  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(RC2_EXTERNAL_RETURN) || 'null'); } catch {}
  if (!saved || Date.now() - Number(saved.savedAt || 0) > 30 * 60 * 1000) return;
  if (!$('#modal')?.hidden) return;
  const store = fxStoreById(saved.storeId);
  if (!store) return;
  openStore(store);
  requestAnimationFrame(() => {
    const card = $('#modal .modal-card');
    if (card) card.scrollTop = Number(saved.modalScroll || 0);
  });
  sessionStorage.removeItem(RC2_EXTERNAL_RETURN);
}

fxOrderClick = function rc2OrderClick(button) {
  const key = button.dataset.orderKey;
  $$('.order-item').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  if (['direct', 'mukkebi', 'ddangyo', 'ondongne'].includes(key)) fxFormation();
  if (key === 'brand') fxOpenBrandHub('channels');
  else if (key === 'phone') fxOpenPhoneDirectory();
  else if (key === 'other') rc2OpenOtherApps();
  else openAppBrowser(key);
};

fxInstallEvents = function rc2InstallEvents() {
  document.addEventListener('pointerdown', fxPressStart, true);
  document.addEventListener('pointerup', rc2ReleaseAllPresses, true);
  document.addEventListener('pointercancel', rc2ReleaseAllPresses, true);
  window.addEventListener('blur', rc2ReleaseAllPresses);
  document.addEventListener('click', event => {
    const order = event.target.closest('[data-order-key]');
    if (order) {
      event.preventDefault();
      event.stopImmediatePropagation();
      fxOrderClick(order);
      return;
    }
    if (event.target.closest('#searchSurface') && !event.target.closest('#clearMainSearch')) {
      event.preventDefault(); event.stopImmediatePropagation(); fxSearchModal($('#mainSearch').value); return;
    }
    if (event.target.closest('#searchBtn')) {
      event.preventDefault(); event.stopImmediatePropagation(); fxSearchModal($('#mainSearch').value); return;
    }
    const railMore = event.target.closest('[data-rail-more]');
    if (railMore) { event.preventDefault(); event.stopImmediatePropagation(); rc2OpenRailList(railMore.dataset.railMore); return; }
    const railStore = event.target.closest('[data-rail-store-id]');
    if (railStore) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(railStore.dataset.railStoreId); if (store) openStore(store); return; }
    const appCategory = event.target.closest('[data-app-category]');
    if (appCategory) { event.preventDefault(); event.stopImmediatePropagation(); openAppBrowser($('#modal').dataset.appBrowserKey, appCategory.dataset.appCategory); return; }
    const appStore = event.target.closest('[data-app-store-id]');
    if (appStore) {
      event.preventDefault(); event.stopImmediatePropagation();
      const store = fxStoreById(appStore.dataset.appStoreId);
      const key = appStore.dataset.appKey;
      if (store) {
        if (['yogiyo', 'coupang', 'baemin'].includes(key)) openCommunityChoice(store, key, {fromBrowser: true});
        else openStore(store);
      }
      return;
    }
    const phoneCategory = event.target.closest('[data-phone-category]');
    if (phoneCategory) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenPhoneDirectory(phoneCategory.dataset.phoneCategory); return; }
    const phoneStore = event.target.closest('[data-phone-store-id]');
    if (phoneStore) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenPhoneConfirm(phoneStore.dataset.phoneStoreId); return; }
    if (event.target.closest('[data-phone-cancel]')) { event.preventDefault(); event.stopImmediatePropagation(); hardClose(); return; }
    const directCategory = event.target.closest('[data-direct-category]');
    if (directCategory) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('direct', directCategory.dataset.directCategory); return; }
    const brandView = event.target.closest('[data-brand-view]');
    if (brandView) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub(brandView.dataset.brandView); return; }
    const directBrand = event.target.closest('[data-direct-brand]');
    if (directBrand) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('direct-stores', directBrand.dataset.directBrand); return; }
    const happyCategory = event.target.closest('[data-happy-category]');
    if (happyCategory) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('happy-brands', happyCategory.dataset.happyCategory); return; }
    const happyBrand = event.target.closest('[data-happy-brand]');
    if (happyBrand) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('happy-stores', happyBrand.dataset.happyBrand); return; }
    const channelStore = event.target.closest('[data-channel-store-id]');
    if (channelStore) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(channelStore.dataset.channelStoreId); if (store) openStore(store); return; }
    const searchStore = event.target.closest('[data-search-store-id]');
    if (searchStore) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(searchStore.dataset.searchStoreId); if (store) openStore(store); return; }
    if (event.target.id === 'fxSearchRun') { event.preventDefault(); event.stopImmediatePropagation(); fxSearchModal($('#fxSearchInput')?.value || ''); return; }
    const share = event.target.closest('[data-share-store]');
    if (share) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const store = fxStoreById(share.dataset.shareStore);
      if (store) fxShare(store, share);
      return;
    }
    const favorite = event.target.closest('[data-favorite-store]');
    if (favorite) fxGull(favorite, true);
    const comparedExternal = event.target.closest('a[data-community-original]');
    if (comparedExternal && rc2ModalStack.at(-1)?.html.includes('class="store-detail"')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      rc2RememberExternalReturn();
      window.open(comparedExternal.href, '_blank', 'noopener');
      history.back();
      return;
    }
    const externalLink = event.target.closest('a[target="_blank"],a[data-final-app-channel],a[data-detail-only]');
    if (externalLink) rc2RememberExternalReturn();
    const finalLocal = event.target.closest('.detail-route[data-route-key="direct"],.detail-route[data-route-key="mukkebi"],.detail-route[data-route-key="ddangyo"],.detail-route[data-route-key="ondongne"],.community-choice-link');
    if (finalLocal) fxBattle();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.id === 'fxSearchInput') {
      event.preventDefault(); fxSearchModal(event.target.value);
    }
  });
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('page-hidden', document.hidden);
    if (document.hidden) rc2StopAmbient();
    else rc2StartAmbient(false);
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted || performance.getEntriesByType('navigation')[0]?.type === 'back_forward') rc2RestoreAfterExternalPage();
  });
};

fxInitialize = async function rc2Initialize() {
  const [brand, supplement, happy, phone, naver] = await Promise.all([
    fetchJson(FX_BRAND_URL, {stores: [], brands: []}),
    fetchJson(FX_BRAND_SUPPLEMENT_URL, {storeMappings: [], directApps: []}),
    fetchJson(FX_HAPPY_URL, {candidateStoreMappings: [], currentScreenBrands: [], categories: []}),
    fetchJson(FX_PHONE_URL, {storeMappings: []}),
    fetchJson(RC2_NAVER_AUDIT_URL, {stores: []})
  ]);
  fxBrandData = brand;
  fxSupplement = supplement;
  fxHappyData = happy;
  fxPhoneData = phone;
  fxBuildIndexes();
  rc2NaverByStore.clear();
  for (const item of naver.stores || []) rc2NaverByStore.set(String(item.store_id), item);
  APP_META.phone.icon = 'assets/ui/phone.svg';
  renderCategories();
  fxRenderRails();
  await fxInitWeather();
  rc2ScrubCustomerCounts(document);
  rc2StartAmbient(true);
};
