'use strict';

(() => {
  const DATA_URL = 'store-service-info.json?v=store-service-9';
  const MENU_SEARCH_URL = 'data/store-menu-search-index.json?v=menu-search-2';
  const HISTORY_KEY = 'daedongStoreServiceOverview';
  const CLOSING_SOON_MINUTES = 60;
  const MENU_MATCH_PREVIEW_LIMIT = 4;
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
    const record = menuSearchData.stores?.[String(storeId)];
    const spec = menuSearchSpec(query);
    if (!record || !spec) return [];
    return (record.i || []).filter(item => menuItemMatches(item, spec, store)).map(item => ({
      id: String(item[0] || ''),
      name: String(item[1] || ''),
      category: String(item[2] || ''),
      image: String(item[3] || '')
    }));
  }

  function ensureMenuSearchData() {
    if (menuSearchPromise) return menuSearchPromise;
    menuSearchState = 'loading';
    menuSearchPromise = fetch(MENU_SEARCH_URL, {cache: 'force-cache'})
      .then(response => {
        if (!response.ok) throw new Error(`메뉴 검색자료를 불러오지 못했습니다. (${response.status})`);
        return response.json();
      })
      .then(async data => {
        if (data?.stores) return data;
        if (!Array.isArray(data?.chunks)) return {stores: {}};
        const chunks = await Promise.all(data.chunks.map(async path => {
          const response = await fetch(`${path}?v=menu-search-2`, {cache: 'force-cache'});
          if (!response.ok) throw new Error(`메뉴 검색자료 조각을 불러오지 못했습니다. (${response.status})`);
          return response.json();
        }));
        return {...data, stores: Object.assign({}, ...chunks.map(chunk => chunk?.stores || {}))};
      })
      .then(data => {
        menuSearchData = data?.stores ? data : {stores: {}};
        menuSearchState = 'ready';
        return menuSearchData;
      })
      .catch(error => {
        menuSearchState = 'error';
        console.warn(error);
        return menuSearchData;
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
    return (hours?.closures || []).find(rule => (
      rule.type === 'monthly-weekday'
      && rule.weekday === parts.weekday
      && Number(rule.nth) === Math.ceil(parts.day / 7)
    )) || null;
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

    if (!closureFor(info.hours, previous)) {
      const overnight = previousPeriods.find(period => {
        const open = timeMinutes(period.open);
        const close = timeMinutes(period.close);
        return close <= open && minutes < close;
      });
      if (overnight) {
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
        label: '정기휴무',
        detail: closure.label || '오늘 휴무',
        today: `오늘 ${closure.label || '휴무'}`
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

  function storeArea(store) {
    return String(store?.area || store?.neighborhood || '동네 미확인').trim() || '동네 미확인';
  }

  function benefitScope(entry, definition) {
    const appKeys = Array.isArray(entry?.appKeys) && entry.appKeys.length
      ? entry.appKeys
      : Array.isArray(definition?.appKeys) ? definition.appKeys : [];
    const appLabel = String(entry?.appLabel || definition?.appLabel || '').trim()
      || '적용 주문앱 미확인';
    return {appKeys, appLabel};
  }

  function scopedBenefitLabel(benefit) {
    return `${benefit.appLabel || '적용 주문앱 미확인'} ${benefit.label}`.trim();
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

  function acceptsBenefit(info, key) {
    const acceptsPayment = (info?.payments || []).some(payment => (
      payment.key === key && payment.status === 'accepted'
    ));
    const offersDelivery = (info?.delivery || []).some(benefit => (
      benefit.key === key && benefit.status === 'available'
    ));
    return acceptsPayment || offersDelivery;
  }

  function verifiedLabel(info) {
    const date = String(info?.verifiedAt || '').replaceAll('-', '.');
    return [info?.sourceLabel, '표시된 주문앱 기준', date ? `${date} 확인` : ''].filter(Boolean).join(' · ');
  }

  function benefitBadgeMarkup(benefit, className) {
    const deliveryClass = benefit.kind === 'delivery' ? ' is-delivery' : '';
    return `<span class="${className}${deliveryClass}" data-benefit-app="${escapeHtml((benefit.appKeys || []).join('-'))}">✓ ${escapeHtml(scopedBenefitLabel(benefit))}</span>`;
  }

  function cardMetaMarkup(status, benefits) {
    return `
      <span class="store-service-status is-${escapeHtml(status.state)}">
        <i aria-hidden="true"></i>${escapeHtml(status.label)}
      </span>
      <span class="store-service-card-hours">${escapeHtml(status.detail)}</span>
      ${benefits.length
        ? benefits.slice(0, 3).map(benefit => benefitBadgeMarkup(benefit, 'store-service-card-payment')).join('')
        : '<span class="store-service-card-unknown">주문앱별 혜택 미확인</span>'}
    `;
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
    const stateLabel = item.state === 'available'
      ? (isDelivery ? `${appLabel} · 무료배달 확인` : `${appLabel} · ${item.label} 사용 가능 확인`)
      : item.state === 'unavailable'
        ? (isDelivery ? `${appLabel} · 무료배달 불가 확인` : `${appLabel} · ${item.label} 사용 불가 확인`)
        : (isDelivery ? `${appLabel} · 무료배달 여부 미확인` : `${appLabel} · ${item.label} 미확인`);
    const symbol = item.state === 'available' ? '✓' : item.state === 'unavailable' ? '×' : '?';
    return `
      <span class="store-service-detail-benefit is-${escapeHtml(item.state)}${isDelivery ? ' is-delivery' : ''}">
        <i aria-hidden="true">${symbol}</i>${escapeHtml(stateLabel)}
      </span>
    `;
  }

  function detailPanelMarkup(info, status) {
    const displayLines = Array.isArray(info?.hours?.displayLines) ? info.hours.displayLines : [];
    const verified = verifiedLabel(info);
    return `
      <header>
        <div>
          <span>가게 이용정보</span>
          <h3>영업시간·주문앱별 혜택</h3>
        </div>
        <span class="store-service-status is-${escapeHtml(status.state)}">
          <i aria-hidden="true"></i>${escapeHtml(status.label)}
        </span>
      </header>
      <p class="store-service-detail-today">
        <b>${escapeHtml(status.detail)}</b>
        <span>${escapeHtml(status.today)}</span>
      </p>
      <div class="store-service-detail-hours">
        ${displayLines.length
          ? displayLines.map(line => `<span>${escapeHtml(line)}</span>`).join('')
          : '<span class="is-unknown">확인된 영업시간이 없습니다.</span>'}
      </div>
      <div class="store-service-detail-benefits" aria-label="주문앱별 상품권 및 무료배달 확인 상태">
        ${detailBenefitItems(info).map(detailBenefitMarkup).join('')}
      </div>
      <footer>
        <span>상품권·쿠폰·무료배달은 표시된 주문앱에서 확인한 정보이며 다른 주문앱에는 적용되지 않을 수 있습니다. 회색 미확인은 사용 불가가 아니라 아직 확인되지 않은 정보입니다.</span>
        ${verified ? `<small>${escapeHtml(verified)}</small>` : ''}
      </footer>
    `;
  }

  function decorateStoreCards() {
    document.querySelectorAll('#storeGrid .store-card[data-id]').forEach(card => {
      if (card.querySelector('[data-store-service-card-meta]')) return;
      const info = serviceData.stores?.[String(card.dataset.id)];
      const status = storeStatus(info);
      const benefits = benefitLabels(info);
      const meta = document.createElement('div');
      meta.className = 'store-service-card-meta';
      meta.dataset.storeServiceCardMeta = '';
      meta.innerHTML = cardMetaMarkup(status, benefits);
      const copy = card.querySelector('.store-info');
      const routes = copy?.querySelector('.miniapps');
      if (routes) routes.before(meta);
      else copy?.append(meta);
    });
  }

  function decorateStoreDetails() {
    document.querySelectorAll('#modalContent .store-detail[data-store-id]').forEach(detail => {
      const storeId = String(detail.dataset.storeId || '');
      const info = serviceData.stores?.[storeId];
      const status = storeStatus(info);
      const signature = JSON.stringify({
        status,
        info: info || null,
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
        panel.innerHTML = detailPanelMarkup(info, status);
      }
      const target = detail.querySelector('[data-store-menu-preview]')
        || detail.querySelector('.detail-routes')
        || detail.querySelector('.detail-personal-actions');
      if (target && panel.nextElementSibling !== target) target.before(panel);
      else if (!target && !panel.isConnected) detail.append(panel);
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
          <button type="button" data-store-service-address-change>주소 변경</button>
        </div>
        <nav aria-label="빠른 가게 찾기 조건">
          <button type="button" data-store-service-quick-status="open">🟢 지금 영업 중 <b data-store-finder-open-count></b></button>
          <button type="button" data-store-service-quick-benefit>🎁 혜택 찾기</button>
          <button type="button" data-store-service-quick-location="all">전체 동네</button>
        </nav>
      `;
      searchRow.after(entry);
    }
    if (entry) {
      const location = typeof state !== 'undefined' ? String(state.location || '') : '';
      const hasLocation = location && location !== '여수시 전체';
      const label = entry.querySelector('[data-store-finder-location-label]');
      if (label) label.textContent = hasLocation ? `${location} 기준 · 가까운 순` : '주소를 설정하면 가까운 순';
      const count = sourceStores().reduce((total, store) => (
        ['open', 'closing-soon'].includes(storeStatus(serviceData.stores?.[storeIdOf(store)]).state) ? total + 1 : total
      ), 0);
      const countNode = entry.querySelector('[data-store-finder-open-count]');
      if (countNode) countNode.textContent = String(count);
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
      if (state.location && state.location !== '여수시 전체') {
        return coordinateOf(neighborhoodRecord(state.location));
      }
    }
    return null;
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
      .map(storeArea)
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
    selectedArea = current && current !== '여수시 전체' && areas.includes(current)
      ? current
      : (areas[0] || '');
    return selectedArea;
  }

  function overviewEntries() {
    const reference = referenceCoordinate();
    return sourceStores().map((store, index) => {
      const storeId = storeIdOf(store);
      const info = serviceData.stores?.[storeId];
      const area = storeArea(store);
      const areaCoordinate = coordinateOf(neighborhoodRecord(area));
      return {
        storeId,
        store,
        info,
        area,
        index,
        areaDistance: reference ? distanceBetween(reference, areaCoordinate) : Number.POSITIVE_INFINITY,
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
    store.searchIndex
  ]).filter(Boolean).join(' ');
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

  function filteredOverviewEntries() {
    const scoped = overviewEntries().filter(entry => {
      if (!entryMatchesQuery(entry)) return false;
      if (locationMode === 'selected' && entry.area !== ensureSelectedArea()) return false;
      if (activeStatus === 'open' && !['open', 'closing-soon'].includes(entry.status.state)) return false;
      if (activeStatus !== 'all' && activeStatus !== 'open' && entry.status.state !== activeStatus) return false;
      if (activeBenefit !== 'all' && !acceptsBenefit(entry.info, activeBenefit)) return false;
      return true;
    });

    if (locationMode === 'nearby' && referenceCoordinate()) {
      scoped.sort((a, b) => (
        a.areaDistance - b.areaDistance
        || a.area.localeCompare(b.area, 'ko')
        || a.index - b.index
      ));
    } else {
      scoped.sort((a, b) => a.index - b.index);
    }
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
      const label = typeof state !== 'undefined' && state.location && state.location !== '여수시 전체'
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
      ['closed', '영업 종료', counts.closed],
      ['unknown', '시간 미확인', counts.unknown]
    ];
  }

  function overviewCardMarkup(entry) {
    const verified = verifiedLabel(entry.info);
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
            <small>${escapeHtml(entry.area)} · ${escapeHtml(entry.status.today)}</small>
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
              : '<b class="is-unknown">주문앱별 혜택 미확인</b>'}
            ${verified ? `<small>${escapeHtml(verified)}</small>` : ''}
          </span>
          <i aria-hidden="true">›</i>
        </button>
        ${menuMarkup}
      </article>
    `;
  }

  function overviewMarkup() {
    ensureSelectedArea();
    const allEntries = overviewEntries();
    const locationAndBenefitEntries = allEntries.filter(entry => (
      (locationMode !== 'selected' || entry.area === selectedArea)
      && (activeBenefit === 'all' || acceptsBenefit(entry.info, activeBenefit))
      && entryMatchesQuery(entry)
    ));
    const counts = statusCounts(locationAndBenefitEntries);
    const entries = filteredOverviewEntries();
    const areas = availableAreas();
    const benefitFilters = [
      ['all', '전체 혜택'],
      ...(serviceData.programs || []).map(program => [program.key, `${program.appLabel || '적용 주문앱 미확인'} ${program.label}`]),
      ...(serviceData.deliveryBenefits || []).map(benefit => [benefit.key, `${benefit.appLabel || '적용 주문앱 미확인'} ${benefit.label}`])
    ];
    const isEntireStoreList = (
      locationMode !== 'selected'
      && activeStatus === 'all'
      && activeBenefit === 'all'
      && !overviewQuery
    );

    return `
      <section class="store-service-overview" role="dialog" aria-modal="true" aria-labelledby="storeServiceOverviewTitle" data-store-service-source-count="${allEntries.length}">
        <header>
          <div>
            <span>통합 가게 찾기</span>
            <h2 id="storeServiceOverviewTitle">메뉴·가게·혜택 한 번에 찾기</h2>
          </div>
          <button type="button" data-store-service-overview-close aria-label="영업시간·결제·배달혜택 찾기 닫기">×</button>
        </header>

        <p class="store-service-overview-lead">
          음식 이름을 검색하면 해당 메뉴가 있는 가게와 일치 메뉴를 함께 보여드립니다. 상품권·쿠폰·무료배달은 배지에 표시된 주문앱 기준입니다.
        </p>

        <label class="store-service-overview-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" value="${escapeHtml(overviewQuery)}" data-store-service-query placeholder="메뉴·가게명·동네 검색 (예: 팥빙수)" aria-label="메뉴·가게명·동네 통합 검색">
          ${overviewQuery ? '<button type="button" data-store-service-query-clear aria-label="검색어 지우기">×</button>' : ''}
        </label>

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

        <div class="store-service-overview-result" aria-live="polite">
          <b>${overviewQuery ? '검색 결과' : activeStatus === 'open' ? `지금 영업 중 ${entries.length}곳` : isEntireStoreList ? '전체 가게' : '조건에 맞는 가게'}</b>
          <span>${escapeHtml(locationDescription())}</span>
        </div>

        <div class="store-service-overview-list">
          ${overviewQuery && menuSearchState === 'loading'
            ? '<p class="store-service-menu-loading">등록된 메뉴판을 함께 검색하고 있습니다…</p>'
            : ''}
          ${entries.length
            ? entries.map(overviewCardMarkup).join('')
            : overviewQuery && menuSearchState === 'loading'
              ? ''
              : '<p class="store-service-overview-empty">이 조건으로 확인되는 가게가 아직 없습니다.<small>다른 검색어·영업상태·혜택·지역범위를 선택해 보세요.</small></p>'}
        </div>

        <footer>
          <p>사진으로 받은 정보는 가게를 확인한 뒤 검토·승인하여 반영합니다.</p>
          <small>영업시간과 사용 가능 여부는 바뀔 수 있습니다. 무료배달은 거리·주문금액·시간에 따라 달라질 수 있으므로 주문 전 다시 확인해 주세요.</small>
        </footer>
      </section>
    `;
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
    if (overviewQuery && menuSearchState === 'idle') {
      const requestedQuery = overviewQuery;
      ensureMenuSearchData().then(() => {
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

  const ready = fetch(DATA_URL, {cache: 'no-store'})
    .then(response => {
      if (!response.ok) throw new Error(`영업·혜택 정보를 불러오지 못했습니다. (${response.status})`);
      return response.json();
    })
    .then(data => {
      serviceData = data;
      ensureOverviewButtons();
      decorateStoreCards();
      decorateStoreDetails();
      return data;
    })
    .catch(error => {
      console.warn(error);
      return serviceData;
    });

  window.daedongStoreServiceInfo = Object.freeze({
    ready,
    get: storeId => serviceData.stores?.[String(storeId)] || null,
    status: (storeId, date) => storeStatus(serviceData.stores?.[String(storeId)], date),
    showOverview
  });

  document.addEventListener('compositionstart', event => {
  if (!event.target.matches('[data-store-service-query]')) return;
  overviewQueryComposing = true;
});

document.addEventListener('compositionend', event => {
  if (!event.target.matches('[data-store-service-query]')) return;
  overviewQueryComposing = false;
  overviewQuery = event.target.value;
  renderOverview({focusQuery: true});
});

document.addEventListener('input', event => {
  if (!event.target.matches('[data-store-service-query]')) return;
  overviewQuery = event.target.value;
  if (overviewQueryComposing || event.isComposing || event.inputType === 'insertCompositionText') return;
  renderOverview({focusQuery: true});
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
    if (event.target.closest('[data-store-service-address-change]')) {
      document.querySelector('#locationBtn')?.click();
      return;
    }
    const quickStatus = event.target.closest('[data-store-service-quick-status]');
    if (quickStatus) {
      showOverview(quickStatus, {status: quickStatus.dataset.storeServiceQuickStatus || 'open'});
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
      renderOverview({focusQuery: true});
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

  new MutationObserver(() => {
    ensureOverviewButtons();
    decorateStoreCards();
    decorateStoreDetails();
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    const renderedCount = Number(overlay?.querySelector('[data-store-service-source-count]')?.dataset.storeServiceSourceCount);
    if (overlay && !overlay.hidden && renderedCount !== sourceStores().length) renderOverview();
  }).observe(document.documentElement, {childList: true, subtree: true});

  window.setInterval(() => {
    document.querySelectorAll('[data-store-service-card-meta]').forEach(node => node.remove());
    decorateStoreCards();
    decorateStoreDetails();
    const overlay = document.querySelector('[data-store-service-overview-overlay]');
    if (overlay && !overlay.hidden) renderOverview();
  }, 60000);
})();
