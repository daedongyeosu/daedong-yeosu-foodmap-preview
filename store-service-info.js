'use strict';

(() => {
  const HISTORY_KEY = 'daedongStoreServiceOverview';
  const DEFAULT_AREA = window.DAEDONG_REGION?.defaultArea || '여수시 전체';
  const CLOSING_SOON_MINUTES = 60;
  const MENU_MATCH_PREVIEW_LIMIT = 2;
  const RECENT_SEARCH_LIMIT = 10;
  const RECENT_SEARCH_KEY = typeof window.DAEDONG_REGION?.storageKey === 'function'
    ? window.DAEDONG_REGION.storageKey('daedongRecentSearchStoresV1')
    : 'daedongRecentSearchStoresV1';
  const STATUS_SORT_PRIORITY = Object.freeze({
    open: 0,
    'closing-soon': 1,
    unknown: 2,
    closed: 3
  });
  const WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const WEEK_FROM_SHORT = {
    Sun: 'sun',
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat'
  };
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  });

  let serviceData = {programs: [], stores: {}};
  let serviceLoadState = 'loading';
  let catalogLoadState = 'loading';
  let serviceReadyPromise = null;
  let catalogReadyPromise = null;
  let lastFocused = null;
  let pendingStoreId = '';
  let activeStatus = 'all';
  let activeBenefit = 'all';
  let locationMode = 'nearby';
  let selectedArea = '';
  let overviewQuery = '';
  let overviewQueryComposing = false;
  let pendingMenuOpen = null;
  let menuSearchData = {stores: {}};
  let menuSearchState = 'idle';
  let menuSearchPromise = null;
  let menuSearchQuery = '';
  let renderedSourceCount = 0;

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);

  const normalize = value => String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .toLowerCase();

  function formatCustomerHours24(value) {
    const convert = (period, rawHour, rawMinute) => {
      const marker = String(period || '').replace(/\./g, '').toLowerCase();
      let hour = Number(rawHour);
      if (marker === '오전' || marker === 'am') hour %= 12;
      else if (marker === '오후' || marker === 'pm') hour = (hour % 12) + 12;
      else if (marker === '낮') hour = hour === 12 ? 12 : (hour % 12) + 12;
      else if (marker === '밤') hour = hour === 12 ? 24 : hour <= 5 ? hour : (hour % 12) + 12;
      return `${String(hour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')}`;
    };
    return String(value ?? '')
      .replace(/(오전|오후|낮|밤)\s*(\d{1,2})\s*:\s*(\d{2})/g, (_, period, hour, minute) => convert(period, hour, minute))
      .replace(/\b(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)\b/gi, (_, hour, minute, period) => convert(period, hour, minute));
  }

  const MENU_FAMILIES = [
    {key: '빙수', label: '빙수', matches: value => value.includes('빙수'), terms: ['빙수']},
    {key: '족발', label: '족발', matches: value => value.includes('족발') || value.includes('불족'), terms: ['족발', '불족', '냉채족']},
    {key: '치킨', label: '치킨', matches: value => ['치킨', '통닭', '닭강정'].some(term => value.includes(term)), terms: ['치킨', '통닭', '닭강정', '후라이드', '양념', '간장', '순살', '윙봉']},
    {key: '커피', label: '커피', matches: value => ['커피', '아메리카노', '에스프레소', '콜드브루'].some(term => value.includes(term)), terms: ['커피', '아메리카노', '에스프레소', '카페라떼', '카푸치노', '마키아토', '콜드브루', '핸드드립']},
    {key: '빵', label: '빵·베이커리', matches: value => value === '빵' || ['베이커리', '식빵', '소금빵', '크루아상', '크로와상', '바게트', '베이글', '도넛'].some(term => value.includes(term)), terms: ['빵', '식빵', '소금빵', '크루아상', '크로와상', '바게트', '베이글', '도넛', '단팥빵', '붕어빵']},
    {key: '회', label: '회·사시미', matches: value => value === '회' || value.endsWith('회') || ['횟집', '사시미', '광어', '우럭', '참돔', '물회'].some(term => value.includes(term)), terms: ['회', '사시미', '광어', '우럭', '참돔', '도다리', '물회', '숙회', '육회']}
  ];

  function menuSearchSpec(query) {
    const value = normalize(query);
    const family = MENU_FAMILIES.find(item => item.matches(value));
    if (family) return family;
    return value ? {key: value, label: String(query || '').trim(), matches: () => true, terms: [value]} : null;
  }

  function menuItemMatches(item, spec, store) {
    if (!spec) return false;
    let text = normalize(`${item?.[1] || ''} ${item?.[2] || ''}`);
    if (spec.key === '회') text = text.replace(/회오리|회복|회전/g, '');
    if (spec.key === '치킨') {
      const explicit = ['치킨', '통닭', '닭강정'].some(term => text.includes(term));
      const chickenStore = normalize([store?.category, store?.cat, store?.categories].flat().join(' ')).includes('치킨');
      return explicit || (chickenStore && spec.terms.some(term => text.includes(normalize(term))));
    }
    return spec.terms.some(term => text.includes(normalize(term)));
  }

  function menuMatchesForStore(storeId, query, store) {
    if (normalize(menuSearchQuery) !== normalize(query)) return [];
    const record = menuSearchData.stores?.[String(storeId)];
    const spec = menuSearchSpec(query);
    if (!record || !spec) return [];
    return (record.i || [])
      .filter(item => menuItemMatches(item, spec, store))
      .map(item => ({
        id: String(item[0] || ''),
        name: String(item[1] || ''),
        category: String(item[2] || ''),
        image: String(item[3] || '')
      }))
      .sort((a, b) => Number(Boolean(b.image)) - Number(Boolean(a.image)));
  }

  function ensureMenuSearchData(query = overviewQuery) {
    const requestedQuery = String(query || '').trim();
    if (!requestedQuery) return Promise.resolve({stores: {}});
    if (menuSearchPromise && normalize(menuSearchQuery) === normalize(requestedQuery)) return menuSearchPromise;
    menuSearchQuery = requestedQuery;
    menuSearchState = 'loading';
    menuSearchData = {stores: {}};
    menuSearchPromise = window.daedongDataApi.menuSearch(requestedQuery)
      .then(data => {
        if (normalize(menuSearchQuery) === normalize(requestedQuery)) {
          menuSearchData = data?.stores ? data : {stores: {}};
          menuSearchState = 'ready';
        }
        return menuSearchData;
      })
      .catch(error => {
        if (normalize(menuSearchQuery) === normalize(requestedQuery)) menuSearchState = 'error';
        console.warn(error);
        return menuSearchData;
      })
      .finally(() => {
        if (normalize(menuSearchQuery) === normalize(requestedQuery)) menuSearchPromise = null;
      });
    return menuSearchPromise;
  }

  function timeMinutes(value) {
    const [hour, minute] = String(value || '').split(':').map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute) ? (hour * 60) + minute : NaN;
  }

  function calendarParts(date = new Date()) {
    const parts = Object.fromEntries(formatter.formatToParts(date)
      .filter(part => part.type !== 'literal')
      .map(part => [part.type, part.value]));
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
      weekday: WEEK_FROM_SHORT[parts.weekday] || 'sun',
      hour: Number(parts.hour),
      minute: Number(parts.minute)
    };
  }

  function shiftCalendar(parts, amount) {
    const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + amount, 12));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: WEEK_KEYS[date.getUTCDay()],
      hour: parts.hour,
      minute: parts.minute
    };
  }

  function closureFor(hours, parts) {
    const dateKey = `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
    return (hours?.closures || []).find(rule => {
      if (rule.type === 'weekly') return rule.weekday === parts.weekday;
      if (rule.type === 'monthly-weekday') {
        return rule.weekday === parts.weekday && Number(rule.nth) === Math.ceil(parts.day / 7);
      }
      if (rule.type === 'date-range') return dateKey >= rule.start && dateKey <= rule.end;
      return false;
    }) || null;
  }

  function breakFor(hours, parts) {
    const minutes = (parts.hour * 60) + parts.minute;
    return (hours?.breaks || []).find(rule => {
      if (Array.isArray(rule.weekdays) && !rule.weekdays.includes(parts.weekday)) return false;
      const open = timeMinutes(rule.open);
      const close = timeMinutes(rule.close);
      if (!Number.isFinite(open) || !Number.isFinite(close)) return false;
      return close <= open
        ? minutes >= open || minutes < close
        : minutes >= open && minutes < close;
    }) || null;
  }

  function periodLabel(period) {
    const open = String(period?.open || '');
    const close = String(period?.close || '');
    const crossesMidnight = timeMinutes(close) <= timeMinutes(open);
    return `${open}–${crossesMidnight ? '다음 날 ' : ''}${close}`;
  }

  function openStatus(period, remainingMinutes, today) {
    const closingSoon = remainingMinutes > 0 && remainingMinutes <= CLOSING_SOON_MINUTES;
    return {
      state: closingSoon ? 'closing-soon' : 'open',
      label: closingSoon ? '곧 영업 종료' : '영업 중',
      detail: `${period.close}까지`,
      today,
      remainingMinutes
    };
  }

  function storeStatus(info, date = new Date()) {
    if (!info?.hours?.weekly) {
      return {
        state: 'unknown',
        label: '시간 미확인',
        detail: '영업시간 확인 필요',
        today: '확인된 영업시간이 없습니다.'
      };
    }

    const now = calendarParts(date);
    const minutes = (now.hour * 60) + now.minute;
    const previous = shiftCalendar(now, -1);
    const previousPeriods = info.hours.weekly[previous.weekday] || [];

    const activeBreak = breakFor(info.hours, now);

    if (!closureFor(info.hours, previous)) {
      const overnight = previousPeriods.find(period => {
        const open = timeMinutes(period.open);
        const close = timeMinutes(period.close);
        return close <= open && minutes < close;
      });
      if (overnight) {
        if (activeBreak) {
          return {
            state: 'closed',
            label: '브레이크 타임',
            detail: `${activeBreak.close}에 영업 재개`,
            today: `오늘 ${(info.hours.weekly[now.weekday] || []).map(periodLabel).join(', ') || '영업시간 없음'}`
          };
        }
        const todayClosure = closureFor(info.hours, now);
        return openStatus(
          overnight,
          timeMinutes(overnight.close) - minutes,
          todayClosure
            ? `${overnight.close}까지 영업 · 이후 정기휴무`
            : `오늘 ${(info.hours.weekly[now.weekday] || []).map(periodLabel).join(', ') || '영업시간 없음'}`
        );
      }
    }

    const closure = closureFor(info.hours, now);
    if (closure) {
      return {
        state: 'closed',
        label: closure.type === 'date-range' ? '임시휴무' : '정기휴무',
        detail: closure.label || '오늘 휴무',
        today: `오늘 ${closure.label || '휴무'}`
      };
    }

    if (activeBreak) {
      return {
        state: 'closed',
        label: '브레이크 타임',
        detail: `${activeBreak.close}에 영업 재개`,
        today: `오늘 ${(info.hours.weekly[now.weekday] || []).map(periodLabel).join(', ') || '영업시간 없음'}`
      };
    }

    const todayPeriods = info.hours.weekly[now.weekday] || [];
    for (const period of todayPeriods) {
      const open = timeMinutes(period.open);
      const close = timeMinutes(period.close);
      const crossesMidnight = close <= open;
      const isOpen = crossesMidnight
        ? minutes >= open
        : minutes >= open && minutes < close;
      if (isOpen) {
        const remainingMinutes = crossesMidnight
          ? (1440 - minutes) + close
          : close - minutes;
        return openStatus(period, remainingMinutes, `오늘 ${periodLabel(period)}`);
      }
    }

    const nextToday = todayPeriods
      .map(period => ({period, minutes: timeMinutes(period.open)}))
      .filter(item => item.minutes > minutes)
      .sort((a, b) => a.minutes - b.minutes)[0];
    return {
      state: 'closed',
      label: '영업 종료',
      detail: nextToday ? `오늘 ${nextToday.period.open} 오픈` : '다음 영업시간 확인',
      today: todayPeriods.length ? `오늘 ${todayPeriods.map(periodLabel).join(', ')}` : '오늘 영업시간 없음'
    };
  }

  function statusPriorityForStore(storeOrId, date = new Date()) {
    const store = storeOrId?.store || storeOrId;
    const storeId = typeof store === 'object' ? storeIdOf(store) : String(store || '');
    return STATUS_SORT_PRIORITY[storeStatus(serviceData.stores?.[storeId], date).state] ?? STATUS_SORT_PRIORITY.unknown;
  }

  function sortStoresByStatusPriority(list, date = new Date()) {
    return (Array.isArray(list) ? list : [])
      .map((item, index) => ({item, index}))
      .sort((a, b) => statusPriorityForStore(a.item, date) - statusPriorityForStore(b.item, date) || a.index - b.index)
      .map(row => row.item);
  }

  function sourceStores() {
    if (typeof stores !== 'undefined' && Array.isArray(stores)) return stores;
    if (typeof allStores !== 'undefined' && Array.isArray(allStores)) return allStores;
    return [];
  }

  function storeIdOf(store) {
    return String(store?.id ?? store?.store_id ?? '');
  }

  function storeById(id) {
    if (typeof fxStoreById === 'function') return fxStoreById(id);
    return sourceStores().find(store => storeIdOf(store) === String(id)) || null;
  }

  function readRecentSearchStores() {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) || '[]');
      return Array.isArray(saved) ? saved.filter(item => item?.storeId).slice(0, RECENT_SEARCH_LIMIT) : [];
    } catch {
      return [];
    }
  }

  function writeRecentSearchStores(items) {
    try { localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(items.slice(0, RECENT_SEARCH_LIMIT))); } catch {}
  }

  function rememberRecentSearchStore(storeId, query = overviewQuery) {
    const store = storeById(storeId);
    const id = storeIdOf(store) || String(storeId || '');
    if (!id || !store) return;
    const item = {
      storeId: id,
      storeName: String(store.name || '가게'),
      query: String(query || store.name || '').trim(),
      searchedAt: Date.now()
    };
    writeRecentSearchStores([item, ...readRecentSearchStores().filter(saved => String(saved.storeId) !== id)]);
  }

  function recentSearchMarkup() {
    const items = readRecentSearchStores()
      .map(item => ({...item, store: storeById(item.storeId)}))
      .filter(item => item.store);
    return `
      <section class="store-service-recent-search" data-store-service-recent-searches ${overviewQuery || !items.length ? 'hidden' : ''}>
        <div class="store-service-recent-head">
          <b>최근 검색한 가게</b>
          <button type="button" data-store-service-recent-clear>전체 삭제</button>
        </div>
        <div class="store-service-recent-list">
          ${items.map(item => `
            <button type="button" data-store-service-recent-store-id="${escapeHtml(item.storeId)}">
              <strong>${escapeHtml(item.store.name || item.storeName)}</strong>
              <small>${escapeHtml(item.query ? `‘${item.query}’ 검색` : '최근 검색')}</small>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function captureSearchState() {
    return {
      query: String(overviewQuery || ''),
      status: activeStatus,
      benefit: activeBenefit,
      locationMode,
      selectedArea
    };
  }

  function storeAreas(store) {
    const values = [
      ...(Array.isArray(store?.neighborhoods) ? store.neighborhoods : []),
      store?.primaryNeighborhood,
      store?.area,
      store?.neighborhood,
      store?.district,
      store?.address,
      store?.name
    ].filter(Boolean);
    const names = typeof neighborhoodsFor === 'function'
      ? values.flatMap(value => neighborhoodsFor(value))
      : values.map(value => String(value || '').trim()).filter(value => neighborhoodRecord(value));
    const unique = [...new Set(names.filter(Boolean))];
    if (unique.length) return unique;
    const point = coordinateOf(store);
    if (!point) return [];
    const closest = neighborhoodRecords()
      .map(item => ({name:item.name, point:coordinateOf(item)}))
      .filter(item => item.point)
      .map(item => ({...item, distance:distanceBetween(point,item.point)}))
      .sort((a,b)=>a.distance-b.distance)[0]?.name;
    return closest ? [closest] : [];
  }

  function storeArea(store) {
    return storeAreas(store)[0] || '동네 미확인';
  }

  function benefitScope(entry, definition) {
    const appKeys = Array.isArray(entry?.appKeys) && entry.appKeys.length
      ? entry.appKeys
      : Array.isArray(definition?.appKeys) ? definition.appKeys : [];
    const appLabel = String(entry?.appLabel || definition?.appLabel || '').trim()
      || '적용 주문앱 미확인';
    return {appKeys, appLabel};
  }

  function benefitAppDisplayLabel(benefit) {
    const appLabel = String(benefit?.appLabel || '적용 주문앱 미확인').trim();
    if (benefit?.key !== 'yeosu-seomseom-pay') return appLabel;
    const appKeys = Array.isArray(benefit?.appKeys) ? benefit.appKeys : [];
    if (appKeys.includes('ddangyo') || normalize(appLabel).includes('땡겨요')) return '먹깨비·땡겨요';
    if (appKeys.includes('mukkebi') || normalize(appLabel).includes('먹깨비')) return '먹깨비';
    return appLabel;
  }

  function scopedBenefitLabel(benefit) {
    const appLabel = benefitAppDisplayLabel(benefit);
    if (benefit?.key === 'yeosu-seomseom-pay') return `${appLabel} 여수섬섬페이 가맹점`;
    return `${appLabel} ${benefit.label}`.trim();
  }

  function paymentLabels(info) {
    const programMap = new Map((serviceData.programs || []).map(program => [program.key, program]));
    return (info?.payments || [])
      .filter(payment => payment.status === 'accepted')
      .map(payment => {
        const definition = programMap.get(payment.key) || {key: payment.key, label: payment.key};
        const scope = benefitScope(payment, definition);
        return {
          key: payment.key,
          label: definition.label || payment.key,
          kind: 'payment',
          ...scope
        };
      });
  }

  function deliveryLabels(info) {
    const deliveryMap = new Map((serviceData.deliveryBenefits || []).map(benefit => [benefit.key, benefit]));
    return (info?.delivery || [])
      .filter(benefit => benefit.status === 'available')
      .map(benefit => {
        const definition = deliveryMap.get(benefit.key) || {key: benefit.key, label: benefit.key};
        const scope = benefitScope(benefit, definition);
        return {
          key: benefit.key,
          label: definition.label || benefit.key,
          kind: 'delivery',
          ...scope
        };
      });
  }

  function benefitLabels(info) {
    return [...paymentLabels(info), ...deliveryLabels(info)];
  }

  function hasVerifiedBenefitStatus(info) {
    return [...(info?.payments || []), ...(info?.delivery || [])].some(item => (
      ['accepted', 'available', 'unavailable'].includes(item?.status)
    ));
  }

  function emptyBenefitLabel(info) {
    return hasVerifiedBenefitStatus(info)
      ? '현재 확인된 주문앱 혜택 없음'
      : '주문앱별 혜택 미확인';
  }

  function acceptsBenefit(info, key) {
    const acceptsPayment = (info?.payments || []).some(payment => (
      payment.key === key && payment.status === 'accepted'
    ));
    const offersDelivery = (info?.delivery || []).some(benefit => (
      benefit.key === key && benefit.status === 'available'
    ));
    return acceptsPayment || offersDelivery;
  }

  function benefitBadgeMarkup(benefit, className) {
    const deliveryClass = benefit.kind === 'delivery' ? ' is-delivery' : '';
    return `<span class="${className}${deliveryClass}" data-benefit-app="${escapeHtml((benefit.appKeys || []).join('-'))}">✓ ${escapeHtml(scopedBenefitLabel(benefit))}</span>`;
  }

  function cardMetaMarkup(status, benefits, info) {
    return `
      <span class="store-service-status is-${escapeHtml(status.state)}">
        <i aria-hidden="true"></i>${escapeHtml(status.label)}
      </span>
      <span class="store-service-card-hours">${escapeHtml(formatCustomerHours24(status.detail))}</span>
      ${benefits.length
        ? benefits.slice(0, 3).map(benefit => benefitBadgeMarkup(benefit, 'store-service-card-payment')).join('')
        : `<span class="store-service-card-unknown">${escapeHtml(emptyBenefitLabel(info))}</span>`}
    `;
  }

  function cardStatusMarkup(status) {
    return `<span class="store-service-status is-${escapeHtml(status.state)}"><i aria-hidden="true"></i>${escapeHtml(status.label)}</span>`;
  }

  function detailBenefitItems(info) {
    const payments = new Map((info?.payments || []).map(payment => [payment.key, payment]));
    const delivery = new Map((info?.delivery || []).map(benefit => [benefit.key, benefit]));
    return [
      ...(serviceData.programs || []).map(program => {
        const entry = payments.get(program.key);
        const value = entry?.status;
        return {
          key: program.key,
          label: program.label,
          kind: 'payment',
          state: value === 'accepted' ? 'available' : value === 'unavailable' ? 'unavailable' : 'unknown',
          ...benefitScope(entry, program)
        };
      }),
      ...(serviceData.deliveryBenefits || []).map(benefit => {
        const entry = delivery.get(benefit.key);
        const value = entry?.status;
        return {
          key: benefit.key,
          label: benefit.label,
          kind: 'delivery',
          state: value === 'available' ? 'available' : value === 'unavailable' ? 'unavailable' : 'unknown',
          ...benefitScope(entry, benefit)
        };
      })
    ];
  }

  function detailBenefitMarkup(item) {
    const isDelivery = item.kind === 'delivery';
    const appLabel = item.appLabel || '적용 주문앱 미확인';
    let stateLabel;
    if (item.key === 'yeosu-seomseom-pay') {
      stateLabel = item.state === 'available'
        ? scopedBenefitLabel(item)
        : item.state === 'unavailable'
          ? `${benefitAppDisplayLabel(item)} 여수섬섬페이 가맹점 아님`
          : `${benefitAppDisplayLabel(item)} 여수섬섬페이 가맹점 미확인`;
    } else if (item.key === 'ddangyo-coupon') {
      stateLabel = item.state === 'available'
        ? `${appLabel} · 쿠폰 있음 확인`
        : item.state === 'unavailable' ? `${appLabel} · 현재 쿠폰 없음 확인` : `${appLabel} · 쿠폰 미확인`;
    } else if (item.key === 'ddangyo-timesale') {
      stateLabel = item.state === 'available'
        ? `${appLabel} · 타임세일 진행 확인`
        : item.state === 'unavailable' ? `${appLabel} · 현재 타임세일 없음 확인` : `${appLabel} · 타임세일 미확인`;
    } else {
      stateLabel = item.state === 'available'
        ? (isDelivery ? `${appLabel} · 무료배달 확인` : `${appLabel} · ${item.label} 사용 가능 확인`)
        : item.state === 'unavailable'
          ? (isDelivery ? `${appLabel} · 무료배달 없음 확인` : `${appLabel} · ${item.label} 사용 불가 확인`)
          : (isDelivery ? `${appLabel} · 무료배달 여부 미확인` : `${appLabel} · ${item.label} 미확인`);
    }
    const symbol = item.state === 'available' ? '✓' : item.state === 'unavailable' ? '×' : '?';
    return `
      <span class="store-service-detail-benefit is-${escapeHtml(item.state)}${isDelivery ? ' is-delivery' : ''}">
        <i aria-hidden="true">${symbol}</i>${escapeHtml(stateLabel)}
      </span>
    `;
  }

  function detailPanelMarkup(info, status, giftRoute) {
    const displayLines = Array.isArray(info?.hours?.displayLines) ? info.hours.displayLines : [];
    const availableBenefits = detailBenefitItems(info).filter(item => item.state === 'available');
    const giftAvailable = availableBenefits.some(item => item.key === 'yeosu-seomseom-pay');
    return `
      <header>
        <div>
          <span>가게 이용정보</span>
          <h3>영업시간·주문앱별 혜택</h3>
        </div>
      </header>
      <p class="store-service-detail-today">
        <b>${escapeHtml(formatCustomerHours24(status.detail))}</b>
        <span>${escapeHtml(formatCustomerHours24(status.today))}</span>
      </p>
      <div class="store-service-detail-hours">
        ${displayLines.length
          ? displayLines.map(line => `<span>${escapeHtml(formatCustomerHours24(line))}</span>`).join('')
          : '<span class="is-unknown">확인된 영업시간이 없습니다.</span>'}
      </div>
      ${availableBenefits.length ? `
        <div class="store-service-detail-benefits" aria-label="현재 이용 가능한 주문앱별 혜택">
          ${availableBenefits.map(detailBenefitMarkup).join('')}
        </div>
        <footer>
          <span>표시된 상품권·쿠폰·무료배달은 혜택 옆에 적힌 주문앱에서 이용할 수 있습니다.</span>
        </footer>
      ` : ''}
      ${giftAvailable && giftRoute?.url ? `<a class="store-service-gift-app-link" href="${escapeHtml(giftRoute.url)}" target="_blank" rel="noopener"><span aria-hidden="true">💳</span><b>지역상품권앱 열기</b><strong>›</strong></a>` : ''}
    `;
  }

  function decorateStoreCards() {
    document.querySelectorAll('#storeGrid .store-card[data-id]').forEach(card => {
      const info = serviceData.stores?.[String(card.dataset.id)];
      const status = storeStatus(info);
      const benefits = benefitLabels(info);
      const signature = JSON.stringify({status, benefits, empty: emptyBenefitLabel(info)});
      let meta = card.querySelector('[data-store-service-card-meta]');
      if (!meta) {
        meta = document.createElement('div');
        meta.className = 'store-service-card-meta';
        meta.dataset.storeServiceCardMeta = '';
      }
      if (meta.dataset.storeServiceSignature !== signature) {
        meta.dataset.storeServiceSignature = signature;
        meta.innerHTML = cardMetaMarkup(status, benefits, info);
      }
      const copy = card.querySelector('.store-info');
      const routes = copy?.querySelector('.miniapps');
      if (routes && meta.nextElementSibling !== routes) routes.before(meta);
      else if (!routes && copy && !meta.isConnected) copy.append(meta);
    });

    const compactCards = new Map();
    const addCompactCard = (card, id) => {
      const storeId = String(id || '');
      if (card && storeId && !compactCards.has(card)) compactCards.set(card, storeId);
    };
    document.querySelectorAll('.rail-card[data-rail-card-store]').forEach(card => addCompactCard(card, card.dataset.railCardStore));
    document.querySelectorAll('.rail-card[data-rail-store-id]').forEach(card => addCompactCard(card, card.dataset.railStoreId));
    document.querySelectorAll('.rc5-category-card[data-rc5-store]').forEach(card => addCompactCard(card, card.dataset.rc5Store));
    document.querySelectorAll('.channel-store-card[data-channel-store-id]').forEach(card => addCompactCard(card, card.dataset.channelStoreId));
    document.querySelectorAll('.app-browser-card[data-search-store-id]').forEach(card => addCompactCard(card, card.dataset.searchStoreId));
    document.querySelectorAll('.app-browser-card[data-app-store-id]').forEach(card => addCompactCard(card, card.dataset.appStoreId));
    document.querySelectorAll('.phone-order-card[data-phone-store-id]').forEach(card => addCompactCard(card, card.dataset.phoneStoreId));
    document.querySelectorAll('.phone-order-card[data-phone-route-store-id]').forEach(card => addCompactCard(card, card.dataset.phoneRouteStoreId));
    document.querySelectorAll('[data-app-store-order]').forEach(control => addCompactCard(control.closest('.app-browser-card') || control, control.dataset.appStoreOrder));

    compactCards.forEach((storeId, card) => {
      const status = storeStatus(serviceData.stores?.[storeId]);
      const signature = `${status.state}:${status.label}`;
      let badge = card.querySelector('[data-store-service-card-status-only]');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'store-service-card-status-only';
        badge.dataset.storeServiceCardStatusOnly = '';
      }
      if (badge.dataset.storeServiceSignature !== signature) {
        badge.dataset.storeServiceSignature = signature;
        badge.innerHTML = cardStatusMarkup(status);
      }
      const target = card.querySelector('.rail-card-copy, .rc5-card-copy, .app-browser-info')
        || card.querySelector(':scope > span');
      if (target && badge.parentElement !== target) target.append(badge);
    });
  }

  function decorateStoreDetails() {
    document.querySelectorAll('#modalContent .store-detail[data-store-id]').forEach(detail => {
      const storeId = String(detail.dataset.storeId || '');
      const info = serviceData.stores?.[storeId];
      const status = storeStatus(info);
      const store = storeById(storeId);
      const giftRoute = typeof routeFor === 'function' ? routeFor(store, 'chak') : null;
      const signature = JSON.stringify({
        status,
        info: info || null,
        giftUrl: giftRoute?.url || '',
        programs: serviceData.programs || [],
        deliveryBenefits: serviceData.deliveryBenefits || []
      });
      let panel = detail.querySelector('[data-store-service-detail]');
      if (!panel) {
        panel = document.createElement('section');
        panel.className = 'store-service-detail-panel';
        panel.dataset.storeServiceDetail = '';
      }
      if (panel.dataset.storeServiceSignature !== signature) {
        panel.dataset.storeServiceSignature = signature;
        panel.innerHTML = detailPanelMarkup(info, status, giftRoute);
      }

      let topStatus = detail.querySelector('[data-store-service-top-status]');
      if (!topStatus) {
        topStatus = document.createElement('span');
        topStatus.dataset.storeServiceTopStatus = '';
      }
      const topStatusSignature = `${status.state}:${status.label}`;
      if (topStatus.dataset.storeServiceStatusSignature !== topStatusSignature) {
        topStatus.dataset.storeServiceStatusSignature = topStatusSignature;
        topStatus.className = `store-service-status store-service-top-status is-${status.state}`;
        topStatus.innerHTML = `<i aria-hidden="true"></i>${escapeHtml(status.label)}`;
      }
      const topStatusTarget = detail.querySelector('[data-store-menu-preview]')
        || detail.querySelector('.detail-routes')
        || detail.querySelector('.detail-personal-actions');
      if (topStatusTarget && topStatus.nextElementSibling !== topStatusTarget) topStatusTarget.before(topStatus);
      else if (!topStatusTarget && !topStatus.isConnected) detail.append(topStatus);

      const actionsTarget = detail.querySelector('.detail-personal-actions');
      if (actionsTarget && panel.nextElementSibling !== actionsTarget) actionsTarget.before(panel);
      else if (!actionsTarget && !panel.isConnected) detail.append(panel);
    });
  }

  function ensureOverviewButtons() {
    if (!document.querySelector('[data-store-service-overview-open]')) {
      const head = document.querySelector('#recommendSection .section-head');
      if (head) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'store-service-overview-button';
        button.dataset.storeServiceOverviewOpen = '';
        button.innerHTML = '<span aria-hidden="true">◷</span><b>주문앱별 혜택 한눈에</b>';
        head.append(button);
      }
    }

    const searchRow = document.querySelector('.main-search-row');
    let entry = document.querySelector('[data-store-finder-quick]');
    if (!entry && searchRow) {
      entry = document.createElement('section');
      entry.className = 'store-finder-quick';
      entry.dataset.storeFinderQuick = '';
      entry.innerHTML = `
        <div class="store-finder-location">
          <span aria-hidden="true">📍</span>
          <b data-store-finder-location-label>주소를 설정하면 가까운 순</b>
        </div>
        <nav aria-label="빠른 가게 찾기 조건">
          <button type="button" data-store-service-quick-status="open">🟢 지금 영업 중 <b data-store-finder-open-count></b></button>
          <button type="button" data-store-service-quick-benefit>🎁 혜택 찾기</button>
          <button type="button" data-store-service-quick-location="all">동네 선택</button>
        </nav>
      `;
      searchRow.after(entry);
    }
    if (entry) {
      const location = typeof state !== 'undefined' ? String(state.location || '') : '';
      const hasLocation = location && location !== DEFAULT_AREA;
      const label = entry.querySelector('[data-store-finder-location-label]');
      const nextLabel = hasLocation ? `${location} 기준 · 가까운 순` : '주소를 설정하면 가까운 순';
      if (label && label.textContent !== nextLabel) label.textContent = nextLabel;
      const source = sourceStores();
      const count = source.reduce((total, store) => (
        ['open', 'closing-soon'].includes(storeStatus(serviceData.stores?.[storeIdOf(store)]).state) ? total + 1 : total
      ), 0);
      const countNode = entry.querySelector('[data-store-finder-open-count]');
      const countReady = serviceLoadState === 'ready' && source.length > 0;
      const loadFailed = serviceLoadState === 'error' || catalogLoadState === 'error';
      const nextCount = countReady ? String(count) : loadFailed ? '다시 확인' : '확인 중';
      if (countNode && countNode.textContent !== nextCount) countNode.textContent = nextCount;
      const quickStatus = entry.querySelector('[data-store-service-quick-status]');
      if (quickStatus) {
        quickStatus.dataset.storeServiceLoadState = countReady ? 'ready' : loadFailed ? 'error' : 'loading';
        quickStatus.setAttribute('aria-busy', countReady || loadFailed ? 'false' : 'true');
      }
    }
  }

  function neighborhoodRecords() {
    if (typeof yeosuNeighborhoods !== 'undefined' && Array.isArray(yeosuNeighborhoods)) {
      return yeosuNeighborhoods;
    }
    return [];
  }

  function neighborhoodRecord(area) {
    const name = String(area || '').trim();
    if (!name || name === '동네 미확인') return null;
    if (typeof neighborhoodByName !== 'undefined' && neighborhoodByName instanceof Map) {
      const direct = neighborhoodByName.get(name);
      if (direct) return direct;
    }
    const needle = normalize(name);
    return neighborhoodRecords().find(item => (
      normalize(item.name) === needle
      || (item.aliases || []).some(alias => normalize(alias) === needle)
    )) || null;
  }

  function coordinateOf(record) {
    const lat = Number(record?.latitude ?? record?.lat);
    const lng = Number(record?.longitude ?? record?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? {lat, lng} : null;
  }

  function referenceCoordinate() {
    if (typeof state !== 'undefined') {
      const current = coordinateOf(state.coords);
      if (current) return current;
      if (state.location && state.location !== DEFAULT_AREA) {
        return coordinateOf(neighborhoodRecord(state.location));
      }
    }
    return null;
  }

  function activeNeighborhood() {
    if (locationMode === 'selected') return ensureSelectedArea();
    if (typeof state === 'undefined') return '';
    const explicit = [state.location, state.addressLabel]
      .filter(value => value && value !== DEFAULT_AREA)
      .flatMap(value => typeof neighborhoodsFor === 'function' ? neighborhoodsFor(value) : [String(value).trim()])
      .find(Boolean);
    if (explicit) return explicit;
    const current = coordinateOf(state.coords);
    return current && typeof closestNeighborhoodForCoordinates === 'function'
      ? closestNeighborhoodForCoordinates(current)
      : '';
  }

  function ownershipTier(store) {
    if (typeof rc6OwnershipTier === 'function') return rc6OwnershipTier(store);
    if (store?.managed) return 0;
    if (store?.sharedManaged) return 1;
    return 2;
  }

  function distanceBetween(a, b) {
    if (!a || !b) return Number.POSITIVE_INFINITY;
    if (typeof haversine === 'function') return haversine(a, b);
    const radius = 6371;
    const radians = value => value * Math.PI / 180;
    const dLat = radians(b.lat - a.lat);
    const dLng = radians(b.lng - a.lng);
    const value = Math.sin(dLat / 2) ** 2
      + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
    return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
  }

  function availableAreas() {
    const seen = new Set();
    return sourceStores()
      .flatMap(storeAreas)
      .filter(area => {
        if (area === '동네 미확인' || seen.has(area)) return false;
        seen.add(area);
        return true;
      })
      .sort((a, b) => a.localeCompare(b, 'ko'));
  }

  function ensureSelectedArea() {
    const areas = availableAreas();
    if (selectedArea && areas.includes(selectedArea)) return selectedArea;
    const current = typeof state !== 'undefined' ? String(state.location || '') : '';
    selectedArea = current && current !== DEFAULT_AREA && areas.includes(current)
      ? current
      : (areas[0] || '');
    return selectedArea;
  }

  function overviewEntries() {
    const reference = referenceCoordinate();
    const neighborhood = activeNeighborhood();
    return sourceStores().map((store, index) => {
      const storeId = storeIdOf(store);
      const info = serviceData.stores?.[storeId];
      const areas = storeAreas(store);
      const area = areas[0] || '동네 미확인';
      const storeCoordinate = coordinateOf(store);
      const areaDistance = !reference
        ? Number.POSITIVE_INFINITY
        : storeCoordinate
          ? distanceBetween(reference, storeCoordinate)
          : Math.min(...areas.map(name => distanceBetween(reference, coordinateOf(neighborhoodRecord(name)))), Number.POSITIVE_INFINITY);
      return {
        storeId,
        store,
        info,
        area,
        areas,
        index,
        locationBucket: neighborhood && areas.includes(neighborhood) ? 0 : neighborhood ? 1 : 2,
        ownershipTier: ownershipTier(store),
        areaDistance,
        status: storeStatus(info),
        benefits: benefitLabels(info),
        menuMatches: menuMatchesForStore(storeId, overviewQuery, store)
      };
    });
  }

  function searchTextValues(value) {
  if (Array.isArray(value)) return value.flatMap(searchTextValues);
  if (value && typeof value === 'object') return Object.values(value).flatMap(searchTextValues);
  return [String(value || '')];
}

function overviewSearchText(entry) {
  const store = entry.store || {};
  return searchTextValues([
    store.name,
    store.realBusinessName,
    store.brandName,
    store.branchName,
    entry.area,
    store.area,
    store.neighborhood,
    store.category,
    store.cat,
    store.categories,
    store.foodCategories,
    store.menuCategories,
    store.tags,
    store.keywords,
    store.searchAliases,
    store.shopInShopNames,
    store.storeAliases,
    store.aliases,
    store.searchIndex,
    (entry.benefits || []).map(benefit => scopedBenefitLabel(benefit))
  ]).filter(Boolean).join(' ');
}

  function benefitDefinitionForQuery(query) {
    const compact = normalize(query);
    if (!compact) return null;
    return [
      ...(serviceData.programs || []),
      ...(serviceData.deliveryBenefits || [])
    ].find(definition => {
      const label = normalize(definition.label);
      const searchable = normalize(`${definition.label || ''} ${definition.appLabel || ''} ${definition.key || ''}`);
      return searchable.includes(compact) || (label && compact.includes(label));
    }) || null;
  }

  function entryMatchesQuery(entry) {
    const raw = String(overviewQuery || '').trim();
    if (!raw) return true;
    const text = normalize(overviewSearchText(entry));
    const spec = menuSearchSpec(raw);
    const compact = normalize(raw);
    if (text.includes(compact)) return true;
    const rawTokens = raw.split(/\s+/).map(normalize).filter(Boolean);
    const familyTokens = spec && spec.key !== compact
      ? rawTokens.filter(token => !spec.matches(token))
      : [];
    const contextTokens = familyTokens.length ? familyTokens : rawTokens;
    const contextMatched = contextTokens.every(token => text.includes(token) || spec?.matches(token));
    return contextMatched && (entry.menuMatches.length > 0 || rawTokens.every(token => text.includes(token)));
  }

  function overviewIdentityPriority(entry) {
    const compact = normalize(overviewQuery);
    if (!compact) return 0;
    const store = entry.store || {};
    const name = normalize(store.name);
    if (name === compact) return 0;
    if (name.startsWith(compact)) return 1;
    if (name.includes(compact)) return 2;
    const identity = normalize(searchTextValues([
      store.realBusinessName,
      store.brandName,
      store.branchName,
      store.shopInShopNames,
      store.storeAliases,
      store.aliases,
      store.searchAliases
    ]).join(' '));
    if (identity.includes(compact)) return 3;
    return 4;
  }

  function overviewStatusPriority(entry) {
    return STATUS_SORT_PRIORITY[entry?.status?.state] ?? 4;
  }

  function overviewMenuEvidencePriority(entry) {
    const matches = Array.isArray(entry?.menuMatches) ? entry.menuMatches : [];
    if (matches.some(item => item.image)) return 0;
    if (matches.length) return 1;
    return 2;
  }

  function compareOverviewEntries(a, b) {
    const hasQuery = Boolean(String(overviewQuery || '').trim());
    const identityOrder = hasQuery ? overviewIdentityPriority(a) - overviewIdentityPriority(b) : 0;
    const statusOrder = overviewStatusPriority(a) - overviewStatusPriority(b);
    const menuEvidenceOrder = hasQuery
      ? overviewMenuEvidencePriority(a) - overviewMenuEvidencePriority(b)
      : 0;
    if (locationMode === 'nearby' && referenceCoordinate()) {
      return identityOrder
        || statusOrder
        || menuEvidenceOrder
        || a.locationBucket - b.locationBucket
        || a.ownershipTier - b.ownershipTier
        || a.areaDistance - b.areaDistance
        || a.area.localeCompare(b.area, 'ko')
        || a.index - b.index;
    }
    if (locationMode === 'selected') {
      return identityOrder
        || statusOrder
        || menuEvidenceOrder
        || a.ownershipTier - b.ownershipTier
        || a.areaDistance - b.areaDistance
        || a.index - b.index;
    }
    return identityOrder || statusOrder || menuEvidenceOrder || a.index - b.index;
  }

  function filteredOverviewEntries() {
    const scoped = overviewEntries().filter(entry => {
      if (!entryMatchesQuery(entry)) return false;
      if (locationMode === 'selected' && !entry.areas.includes(ensureSelectedArea())) return false;
      if (activeStatus === 'open' && !['open', 'closing-soon'].includes(entry.status.state)) return false;
      if (activeStatus !== 'all' && activeStatus !== 'open' && entry.status.state !== activeStatus) return false;
      if (activeBenefit !== 'all' && !acceptsBenefit(entry.info, activeBenefit)) return false;
      return true;
    });

    scoped.sort(compareOverviewEntries);
    return scoped;
  }

  function statusCounts(entries) {
    return entries.reduce((counts, entry) => {
      counts.total += 1;
      counts[entry.status.state] = (counts[entry.status.state] || 0) + 1;
      if (['open', 'closing-soon'].includes(entry.status.state)) counts.openNow += 1;
      return counts;
    }, {total: 0, openNow: 0, open: 0, 'closing-soon': 0, closed: 0, unknown: 0});
  }

  function locationDescription() {
    if (locationMode === 'all') return '여수 전체 · 기존 가게순서';
    if (locationMode === 'selected') return `${ensureSelectedArea() || '선택한 동네'} 가게만`;
    if (referenceCoordinate()) {
      const label = typeof state !== 'undefined' && state.location && state.location !== DEFAULT_AREA
        ? state.location
        : '현재 위치';
      return `${label} 기준 · 가까운 동네부터`;
    }
    return '상단에서 위치를 설정하면 가까운 동네부터 보여드립니다.';
  }

  function statusFilters(counts) {
    return [
      ['all', '전체', null],
      ['open', '지금 영업 중', counts.openNow],
      ['closing-soon', '곧 종료', counts['closing-soon']],
      ['unknown', '시간 미확인', null],
      ['closed', '영업 종료', null]
    ];
  }

  function overviewCardMarkup(entry) {
    const menuSpec = menuSearchSpec(overviewQuery);
    const menuMatches = entry.menuMatches || [];
    const menuPreview = menuMatches.slice(0, MENU_MATCH_PREVIEW_LIMIT);
    const menuMarkup = menuMatches.length ? `
      <section class="store-service-menu-matches" aria-label="${escapeHtml(entry.store?.name || '가게')} 일치 메뉴">
        <header>
          <b>‘${escapeHtml(menuSpec?.label || overviewQuery)}’ 일치 메뉴</b>
          <span>${menuMatches.length}개</span>
        </header>
        <div>
          ${menuPreview.map(item => `
            <button type="button" data-store-service-menu-open data-store-service-menu-store-id="${escapeHtml(entry.storeId)}" data-store-service-menu-id="${escapeHtml(item.id)}">
              ${item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" decoding="async">` : '<span class="store-service-menu-image-empty" aria-hidden="true">메뉴</span>'}
              <span>
                <small>${escapeHtml(item.category || '메뉴')}</small>
                <strong>${escapeHtml(item.name)}</strong>
              </span>
              <i aria-hidden="true">›</i>
            </button>
          `).join('')}
        </div>
        ${menuMatches.length > MENU_MATCH_PREVIEW_LIMIT ? `
          <button type="button" class="store-service-menu-all" data-store-service-menu-open data-store-service-menu-store-id="${escapeHtml(entry.storeId)}">
            이 가게의 ${escapeHtml(menuSpec?.label || '일치')} 메뉴 ${menuMatches.length}개 모두 보기
          </button>
        ` : ''}
      </section>
    ` : '';
    return `
      <article class="store-service-overview-group">
        <button type="button" class="store-service-overview-card" data-store-service-store-id="${escapeHtml(entry.storeId)}">
          <span class="store-service-overview-card-main">
            <strong>${escapeHtml(entry.store?.name || '가게 정보')}</strong>
            <small>${escapeHtml(entry.area)} · ${escapeHtml(formatCustomerHours24(entry.status.today))}</small>
          </span>
          <span class="store-service-status is-${escapeHtml(entry.status.state)}">
            <i aria-hidden="true"></i>${escapeHtml(entry.status.label)}
          </span>
          <span class="store-service-overview-payments">
            ${entry.benefits.length
              ? entry.benefits.map(benefit => {
                const deliveryClass = benefit.kind === 'delivery' ? ' class="is-delivery"' : '';
                return `<b${deliveryClass}>✓ ${escapeHtml(scopedBenefitLabel(benefit))}</b>`;
              }).join('')
              : `<b class="is-unknown">${escapeHtml(emptyBenefitLabel(entry.info))}</b>`}
          </span>
          <i aria-hidden="true">›</i>
        </button>
        ${menuMarkup}
      </article>
    `;
  }

  function overviewResultLabel(entries) {
    const query = String(overviewQuery || '').trim();
    if (query) {
      const benefit = benefitDefinitionForQuery(query);
      return benefit
        ? `${benefit.label} 사용 가능 ${entries.length}곳`
        : `‘${query}’ 검색 결과 ${entries.length}곳`;
    }
    if (activeStatus === 'open') return `지금 영업 중 ${entries.length}곳`;
    if (activeStatus === 'closing-soon') return `곧 종료 ${entries.length}곳`;
    if (activeStatus === 'closed') return '영업 종료 가게';
    if (activeStatus === 'unknown') return '영업시간 미확인 가게';
    const isEntireStoreList = locationMode !== 'selected'
      && activeStatus === 'all'
      && activeBenefit === 'all';
    return isEntireStoreList ? '전체 가게' : `조건에 맞는 가게 ${entries.length}곳`;
  }

  function overviewListMarkup(entries) {
    if (overviewQuery && menuSearchState === 'loading') {
      return `${entries.map(overviewCardMarkup).join('')}<p class="store-service-menu-loading">등록된 메뉴판을 함께 검색하고 있습니다…</p>`;
    }
    if (entries.length) return entries.map(overviewCardMarkup).join('');
    return '<p class="store-service-overview-empty">이 조건으로 확인되는 가게가 아직 없습니다.<small>다른 검색어·영업상태·혜택·지역범위를 선택해 보세요.</small></p>';
  }

  function overviewMarkup() {
    ensureSelectedArea();
    const allEntries = overviewEntries();
    const locationAndBenefitEntries = allEntries.filter(entry => (
      (locationMode !== 'selected' || entry.areas.includes(selectedArea))
      && (activeBenefit === 'all' || acceptsBenefit(entry.info, activeBenefit))
      && entryMatchesQuery(entry)
    ));
    const counts = statusCounts(locationAndBenefitEntries);
    const entries = filteredOverviewEntries();
    const areas = availableAreas();
    const benefitFilters = [
      ['all', '전체 혜택'],
      ...(serviceData.programs || []).map(program => [program.key, scopedBenefitLabel(program)]),
      ...(serviceData.deliveryBenefits || []).map(benefit => [benefit.key, scopedBenefitLabel(benefit)])
    ];
    renderedSourceCount = allEntries.length;

    return `
      <section class="store-service-overview" role="dialog" aria-modal="true" aria-labelledby="storeServiceOverviewTitle">
        <header>
          <div>
            <span>통합 가게 찾기</span>
            <h2 id="storeServiceOverviewTitle">메뉴·가게·혜택 한 번에 찾기</h2>
          </div>
          <button type="button" data-store-service-overview-close aria-label="영업시간·결제·배달혜택 찾기 닫기">×</button>
        </header>

        <p class="store-service-overview-lead">
          메뉴·가게·동네·혜택을 검색할 수 있습니다. 상품권·쿠폰·무료배달은 각 혜택 배지에 적힌 앱에서 이용할 수 있습니다.
        </p>

        <form class="store-service-overview-search" data-store-service-search-form role="search">
          <span aria-hidden="true">⌕</span>
          <input type="search" value="${escapeHtml(overviewQuery)}" data-store-service-query placeholder="메뉴·가게·동네·혜택 검색" aria-label="메뉴·가게·동네·혜택 통합 검색" enterkeyhint="search" autocomplete="off">
          <button type="button" data-store-service-query-clear aria-label="검색어 지우기" ${overviewQuery ? '' : 'hidden'}>×</button>
        </form>

        ${recentSearchMarkup()}

        <div class="store-service-overview-result" aria-live="polite">
          <b>${escapeHtml(overviewResultLabel(entries))}</b>
          <span>${escapeHtml(locationDescription())}</span>
        </div>

        <section class="store-service-filter-block" aria-labelledby="storeServiceLocationLabel">
          <div class="store-service-filter-title">
            <b id="storeServiceLocationLabel">지역범위</b>
            <small>${escapeHtml(locationDescription())}</small>
          </div>
          <div class="store-service-location-controls">
            <button type="button" data-store-service-location-mode="nearby" class="${locationMode === 'nearby' ? 'active' : ''}">내 위치 가까운 순</button>
            <button type="button" data-store-service-location-mode="selected" class="${locationMode === 'selected' ? 'active' : ''}">동네만 보기</button>
            <button type="button" data-store-service-location-mode="all" class="${locationMode === 'all' ? 'active' : ''}">여수 전체</button>
            <select data-store-service-area aria-label="볼 동네 선택">
              ${areas.map(area => `<option value="${escapeHtml(area)}" ${area === selectedArea ? 'selected' : ''}>${escapeHtml(area)}</option>`).join('')}
            </select>
          </div>
        </section>

        <section class="store-service-filter-block" aria-labelledby="storeServiceStatusLabel">
          <div class="store-service-filter-title">
            <b id="storeServiceStatusLabel">영업상태</b>
            <small>색상과 글자를 함께 표시합니다.</small>
          </div>
          <nav aria-label="영업상태 필터">
            ${statusFilters(counts).map(([key, label, count]) => `
              <button type="button" data-store-service-status="${escapeHtml(key)}" class="${key === activeStatus ? 'active' : ''}">
                ${escapeHtml(label)}${count === null ? '' : ` <small>${count}</small>`}
              </button>
            `).join('')}
          </nav>
        </section>

        <section class="store-service-filter-block" aria-labelledby="storeServiceBenefitLabel">
          <div class="store-service-filter-title">
            <b id="storeServiceBenefitLabel">결제·배달혜택</b>
            <small>확인된 사용 가능 가게만 골라봅니다.</small>
          </div>
          <nav aria-label="결제 및 배달혜택 필터">
            ${benefitFilters.map(([key, label]) => `
              <button type="button" data-store-service-benefit="${escapeHtml(key)}" class="${key === activeBenefit ? 'active' : ''}">
                ${escapeHtml(label)}
              </button>
            `).join('')}
          </nav>
        </section>

        <div class="store-service-overview-list">
          ${overviewListMarkup(entries)}
        </div>

        <footer>
          <small>영업시간과 혜택은 바뀔 수 있습니다. 주문 전 해당 주문앱에서 다시 확인해 주세요.</small>
        </footer>
      </section>
    `;
  }

  function refreshOverviewQueryResults({scrollToResults = false} = {}) {
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (!overlay || overlay.hidden) return;
    const requestedQuery = overviewQuery;
    if (overviewQuery && !benefitDefinitionForQuery(overviewQuery)
      && (menuSearchState === 'idle' || normalize(menuSearchQuery) !== normalize(overviewQuery))) {
      ensureMenuSearchData(requestedQuery).then(() => {
        if (overviewQuery === requestedQuery) refreshOverviewQueryResults();
      });
    }
    const entries = filteredOverviewEntries();
    const result = overlay.querySelector('.store-service-overview-result');
    const list = overlay.querySelector('.store-service-overview-list');
    const clear = overlay.querySelector('[data-store-service-query-clear]');
    const recent = overlay.querySelector('[data-store-service-recent-searches]');
    if (result) {
      result.querySelector('b').textContent = overviewResultLabel(entries);
      result.querySelector('span').textContent = locationDescription();
    }
    if (list) list.innerHTML = overviewListMarkup(entries);
    if (clear) clear.hidden = !String(overviewQuery || '').trim();
    if (recent) recent.hidden = Boolean(String(overviewQuery || '').trim());
    if (scrollToResults) {
      overlay.querySelector('[data-store-service-query]')?.blur();
      window.requestAnimationFrame(() => {
        const target = list?.querySelector('.store-service-overview-group, .store-service-overview-empty');
        target?.scrollIntoView({block: 'start'});
      });
    }
  }

  function ensureOverviewOverlay() {
    let overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'store-service-overview-overlay';
    overlay.dataset.storeServiceOverviewOverlay = '';
    overlay.hidden = true;
    document.body.append(overlay);
    return overlay;
  }

  function renderOverview({focusQuery = false, focusSection = ''} = {}) {
    if (overviewQuery && !benefitDefinitionForQuery(overviewQuery)
      && (menuSearchState === 'idle' || normalize(menuSearchQuery) !== normalize(overviewQuery))) {
      const requestedQuery = overviewQuery;
      ensureMenuSearchData(requestedQuery).then(() => {
        const currentOverlay = document.querySelector('[data-store-service-overview-overlay]');
        if (currentOverlay && !currentOverlay.hidden && overviewQuery === requestedQuery) renderOverview();
      });
    }
    const overlay = ensureOverviewOverlay();
    const scrollTop = overlay.querySelector('.store-service-overview')?.scrollTop || 0;
    overlay.innerHTML = overviewMarkup();
    const panel = overlay.querySelector('.store-service-overview');
    if (panel) panel.scrollTop = scrollTop;
    if (focusQuery) {
      const input = overlay.querySelector('[data-store-service-query]');
      input?.focus();
      input?.setSelectionRange?.(input.value.length, input.value.length);
    }
    if (focusSection) {
      const section = overlay.querySelector(`[aria-labelledby="${focusSection}"]`);
      window.requestAnimationFrame(() => section?.scrollIntoView({block: 'start'}));
    }
  }

  function showOverview(trigger, options = {}) {
    const overlay = ensureOverviewOverlay();
    lastFocused = trigger || document.activeElement;
    activeStatus = options.status || 'all';
    activeBenefit = options.benefit || 'all';
    locationMode = options.locationMode || 'nearby';
    overviewQuery = String(options.query || '').trim();
    renderOverview();
    overlay.hidden = false;
    document.body.classList.add('store-service-overview-open');
    try {
      history.pushState({...history.state, [HISTORY_KEY]: true}, '', location.href);
    } catch {
      // The finder still works when browser history is unavailable.
    }
    if (options.focusQuery === true) {
      window.requestAnimationFrame(() => overlay.querySelector('[data-store-service-query]')?.focus());
    } else if (options.focusSection) {
      window.requestAnimationFrame(() => overlay.querySelector(`[aria-labelledby="${options.focusSection}"]`)?.scrollIntoView({block: 'start'}));
    } else {
      overlay.querySelector('[data-store-service-overview-close]')?.focus();
    }
  }

  function hideOverview({restoreFocus = true} = {}) {
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (overlay) {
      overlay.hidden = true;
      overlay.innerHTML = '';
    }
    document.body.classList.remove('store-service-overview-open');
    if (restoreFocus) lastFocused?.focus?.();
    lastFocused = null;
  }

  function requestOverviewClose() {
    if (history.state?.[HISTORY_KEY]) history.back();
    else hideOverview();
  }

  function openStoreAfterOverview(storeId) {
    const store = storeById(storeId);
    if (store && typeof openStore === 'function') {
      openStore(store);
      return;
    }
    document.querySelector(`#storeGrid .store-card[data-id="${CSS.escape(storeId)}"]`)?.click();
  }

  function openMenuAfterOverview(request) {
    if (!request?.storeId) return;
    const spec = menuSearchSpec(request.query);
    const query = spec?.key || request.query || '';
    window.daedongMenuPreview?.open?.(request.storeId, {
      query,
      menuId: request.menuId || ''
    });
  }

  const wait = milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds));
  const SERVICE_BOOT_DELAY_MS = 6000;

  function settleWithin(promise, milliseconds) {
    return new Promise(resolve => {
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        resolve(result);
      };
      const timeoutId = window.setTimeout(() => finish({status: 'timeout'}), milliseconds);
      Promise.resolve(promise).then(
        value => finish({status: 'fulfilled', value}),
        error => finish({status: 'rejected', error})
      );
    });
  }

  function refreshServiceSurfaces() {
    ensureOverviewButtons();
    decorateStoreCards();
    decorateStoreDetails();
  }

  async function loadServiceData() {
    let lastError = null;
    for (const delay of [0, 1200]) {
      if (delay) await wait(delay);
      try {
        return await window.daedongDataApi.services({timeoutMs: 20000});
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError || new Error('영업시간 정보를 불러오지 못했습니다.');
  }

  function beginServiceLoad() {
    if (serviceLoadState === 'loading' && serviceReadyPromise) return serviceReadyPromise;
    serviceLoadState = 'loading';
    refreshServiceSurfaces();
    serviceReadyPromise = loadServiceData()
      .then(data => {
        serviceData = data;
        serviceLoadState = 'ready';
        refreshServiceSurfaces();
        if (typeof window.CustomEvent === 'function') {
          window.dispatchEvent(new window.CustomEvent('daedong-store-service-ready'));
        }
        window.setTimeout(() => {
          if (typeof renderStores === 'function') renderStores({resetCount: false});
          if (typeof fxRenderRails === 'function') fxRenderRails();
          if (typeof rc6RenderHero === 'function') {
            rc6HeroRenderKey = '';
            rc6RenderHero();
          }
        }, 0);
        return data;
      })
      .catch(error => {
        serviceLoadState = 'error';
        console.warn(error);
        refreshServiceSurfaces();
        return serviceData;
      })
      .finally(() => {
        serviceReadyPromise = null;
      });
    return serviceReadyPromise;
  }

  async function openQuickStatus(trigger) {
    if (serviceLoadState === 'ready' && sourceStores().length) {
      showOverview(trigger, {status: trigger.dataset.storeServiceQuickStatus || 'open'});
      return;
    }
    trigger.setAttribute('aria-busy', 'true');
    if (serviceLoadState === 'error') await beginServiceLoad();
    else await (serviceReadyPromise || ready);
    await catalogReadyPromise;
    trigger.setAttribute('aria-busy', 'false');
    if (serviceLoadState === 'ready' && sourceStores().length) {
      showOverview(trigger, {status: trigger.dataset.storeServiceQuickStatus || 'open'});
    } else if (catalogLoadState === 'error' && !sourceStores().length) {
      window.location.reload();
    } else {
      showOverview(trigger, {status: 'all'});
    }
  }

  const ready = Promise.race([
    window.daedongCatalogReady || Promise.resolve([]),
    wait(4000)
  ]).then(() => wait(SERVICE_BOOT_DELAY_MS)).then(() => beginServiceLoad());
  catalogReadyPromise = settleWithin(window.daedongCatalogReady || Promise.resolve([]), 26000)
    .then(result => {
      catalogLoadState = result.status === 'fulfilled' && sourceStores().length ? 'ready' : 'error';
      refreshServiceSurfaces();
      return result;
    });
  settleWithin(window.daedongLocationRankingReady || Promise.resolve(false), 36000)
    .then(() => refreshServiceSurfaces());

  window.daedongStoreServiceInfo = Object.freeze({
    ready,
    get: storeId => serviceData.stores?.[String(storeId)] || null,
    status: (storeId, date) => storeStatus(serviceData.stores?.[String(storeId)], date),
    statusPriority: statusPriorityForStore,
    sortByStatus: sortStoresByStatusPriority,
    showOverview,
    captureSearchState
  });

  document.addEventListener('compositionstart', event => {
  if (!event.target.matches('[data-store-service-query]')) return;
  overviewQueryComposing = true;
});

document.addEventListener('compositionend', event => {
  if (!event.target.matches('[data-store-service-query]')) return;
  overviewQueryComposing = false;
  overviewQuery = event.target.value;
  refreshOverviewQueryResults();
});

document.addEventListener('input', event => {
  if (!event.target.matches('[data-store-service-query]')) return;
  overviewQuery = event.target.value;
  refreshOverviewQueryResults();
});

  document.addEventListener('submit', event => {
    const form = event.target.closest('[data-store-service-search-form]');
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector('[data-store-service-query]');
    overviewQueryComposing = false;
    overviewQuery = input?.value || '';
    refreshOverviewQueryResults({scrollToResults: true});
  });

  document.addEventListener('change', event => {
    if (!event.target.matches('[data-store-service-area]')) return;
    selectedArea = event.target.value;
    locationMode = 'selected';
    renderOverview();
  });

  document.addEventListener('click', event => {
    const opener = event.target.closest('[data-store-service-overview-open], [data-store-service-search-open]');
    if (opener) {
      showOverview(opener);
      return;
    }
    const quickStatus = event.target.closest('[data-store-service-quick-status]');
    if (quickStatus) {
      openQuickStatus(quickStatus);
      return;
    }
    const quickBenefit = event.target.closest('[data-store-service-quick-benefit]');
    if (quickBenefit) {
      showOverview(quickBenefit, {focusSection: 'storeServiceBenefitLabel'});
      return;
    }
    const quickLocation = event.target.closest('[data-store-service-quick-location]');
    if (quickLocation) {
      showOverview(quickLocation, {locationMode: quickLocation.dataset.storeServiceQuickLocation || 'all'});
      return;
    }
    if (event.target.closest('[data-store-service-overview-close]')) {
      requestOverviewClose();
      return;
    }
    if (event.target.closest('[data-store-service-query-clear]')) {
      overviewQuery = '';
      const input = document.querySelector('[data-store-service-query]');
      if (input) input.value = '';
      refreshOverviewQueryResults();
      input?.focus();
      return;
    }
    if (event.target.closest('[data-store-service-recent-clear]')) {
      writeRecentSearchStores([]);
      renderOverview({focusQuery: true});
      return;
    }
    const recentStore = event.target.closest('[data-store-service-recent-store-id]');
    if (recentStore) {
      pendingStoreId = recentStore.dataset.storeServiceRecentStoreId || '';
      const recentRecord = readRecentSearchStores().find(item => String(item.storeId) === pendingStoreId);
      rememberRecentSearchStore(pendingStoreId, recentRecord?.query);
      if (history.state?.[HISTORY_KEY]) history.back();
      else {
        hideOverview({restoreFocus: false});
        openStoreAfterOverview(pendingStoreId);
        pendingStoreId = '';
      }
      return;
    }
    const statusFilter = event.target.closest('[data-store-service-status]');
    if (statusFilter) {
      activeStatus = statusFilter.dataset.storeServiceStatus || 'all';
      renderOverview();
      return;
    }
    const benefitFilter = event.target.closest('[data-store-service-benefit]');
    if (benefitFilter) {
      activeBenefit = benefitFilter.dataset.storeServiceBenefit || 'all';
      renderOverview();
      return;
    }
    const locationFilter = event.target.closest('[data-store-service-location-mode]');
    if (locationFilter) {
      locationMode = locationFilter.dataset.storeServiceLocationMode || 'nearby';
      if (locationMode === 'selected') ensureSelectedArea();
      renderOverview();
      return;
    }
    const menuCard = event.target.closest('[data-store-service-menu-open]');
    if (menuCard) {
      if (String(overviewQuery || '').trim()) rememberRecentSearchStore(menuCard.dataset.storeServiceMenuStoreId, overviewQuery);
      pendingMenuOpen = {
        storeId: menuCard.dataset.storeServiceMenuStoreId || '',
        menuId: menuCard.dataset.storeServiceMenuId || '',
        query: overviewQuery
      };
      if (history.state?.[HISTORY_KEY]) history.back();
      else {
        const request = pendingMenuOpen;
        pendingMenuOpen = null;
        hideOverview({restoreFocus: false});
        openMenuAfterOverview(request);
      }
      return;
    }
    const storeCard = event.target.closest('[data-store-service-store-id]');
    if (storeCard) {
      if (String(overviewQuery || '').trim()) rememberRecentSearchStore(storeCard.dataset.storeServiceStoreId, overviewQuery);
      pendingStoreId = storeCard.dataset.storeServiceStoreId || '';
      if (history.state?.[HISTORY_KEY]) history.back();
      else {
        hideOverview({restoreFocus: false});
        openStoreAfterOverview(pendingStoreId);
        pendingStoreId = '';
      }
    }
  });

  window.addEventListener('popstate', event => {
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (!overlay || overlay.hidden || event.state?.[HISTORY_KEY]) return;
    event.stopImmediatePropagation();
    hideOverview({restoreFocus: !pendingStoreId && !pendingMenuOpen});
    if (pendingMenuOpen) {
      const request = pendingMenuOpen;
      pendingMenuOpen = null;
      window.setTimeout(() => openMenuAfterOverview(request), 0);
      return;
    }
    if (pendingStoreId) {
      const storeId = pendingStoreId;
      pendingStoreId = '';
      window.setTimeout(() => openStoreAfterOverview(storeId), 0);
    }
  }, true);

  const serviceSurfaceSelector = [
    '#storeGrid',
    '#modalContent .store-detail[data-store-id]',
    '#recommendSection .section-head',
    '.main-search-row',
    '.rail-card[data-rail-card-store]',
    '.rail-card[data-rail-store-id]',
    '.rc5-category-card[data-rc5-store]',
    '.channel-store-card[data-channel-store-id]',
    '.app-browser-card[data-search-store-id]',
    '.app-browser-card[data-app-store-id]',
    '.phone-order-card[data-phone-store-id]',
    '.phone-order-card[data-phone-route-store-id]',
    '[data-app-store-order]'
  ].join(',');
  const serviceDecorationSelector = [
    '[data-store-service-card-meta]',
    '[data-store-service-card-status-only]',
    '[data-store-service-detail]',
    '[data-store-service-top-status]',
    '[data-store-service-overview-open]',
    '[data-store-finder-quick]'
  ].join(',');
  const SERVICE_REFRESH_CARDS = 1;
  const SERVICE_REFRESH_DETAILS = 2;
  let serviceSurfaceRefreshFrame = 0;
  let pendingServiceSurfaceRefresh = 0;

  function mutationServiceSurfaceKind(mutation) {
    const target = mutation.target instanceof Element ? mutation.target : mutation.target?.parentElement;
    if (target?.closest('[data-store-menu-overlay], ' + serviceDecorationSelector)) return 0;
    let kind = 0;
    if (target?.closest('#modalContent')) kind |= SERVICE_REFRESH_DETAILS;
    if (target?.closest('#storeGrid')) kind |= SERVICE_REFRESH_CARDS;
    for (const node of [...mutation.addedNodes, ...mutation.removedNodes]) {
      if (!(node instanceof Element) || node.matches(serviceDecorationSelector)) continue;
      if (node.closest('#modalContent') || node.matches('.store-detail[data-store-id]') || node.querySelector('.store-detail[data-store-id]')) {
        kind |= SERVICE_REFRESH_DETAILS;
      }
      if (node.closest('#storeGrid') || node.matches(serviceSurfaceSelector) || node.querySelector(serviceSurfaceSelector)) {
        kind |= SERVICE_REFRESH_CARDS;
      }
    }
    return kind;
  }

  function scheduleServiceSurfaceRefresh(kind) {
    pendingServiceSurfaceRefresh |= kind;
    if (serviceSurfaceRefreshFrame) return;
    serviceSurfaceRefreshFrame = window.requestAnimationFrame(() => {
      serviceSurfaceRefreshFrame = 0;
      const refreshKind = pendingServiceSurfaceRefresh;
      pendingServiceSurfaceRefresh = 0;
      if (refreshKind & SERVICE_REFRESH_CARDS) {
        decorateStoreCards();
        const overlay = document.querySelector('[data-store-service-overview-overlay]');
        if (overlay && !overlay.hidden && renderedSourceCount !== sourceStores().length) renderOverview();
      }
      if (refreshKind & SERVICE_REFRESH_DETAILS) decorateStoreDetails();
    });
  }

  new MutationObserver(mutations => {
    const kind = mutations.reduce((value, mutation) => value | mutationServiceSurfaceKind(mutation), 0);
    if (kind) scheduleServiceSurfaceRefresh(kind);
  }).observe(document.documentElement, {childList: true, subtree: true});

  window.setInterval(() => {
    if (serviceLoadState === 'ready' && typeof renderStores === 'function') {
      renderStores({resetCount: false});
    }
    document.querySelectorAll('[data-store-service-card-meta]').forEach(node => node.remove());
    decorateStoreCards();
    decorateStoreDetails();
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (overlay && !overlay.hidden) renderOverview();
  }, 60000);
})();
