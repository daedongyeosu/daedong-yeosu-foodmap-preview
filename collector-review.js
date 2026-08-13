'use strict';

(() => {
  const API_BASE = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev';
  const API_HEADERS = Object.freeze({Accept: 'application/json', 'X-Daedong-Client': 'daedong-preview-web-v1-20260804'});
  const state = {candidates: [], filter: 'all', query: '', summary: {}};
  const elements = {
    list: document.getElementById('candidateList'), status: document.getElementById('statusMessage'),
    collected: document.getElementById('collectedCount'), total: document.getElementById('totalCount'), duplicates: document.getElementById('duplicateCount'),
    menus: document.getElementById('menuCount'), photos: document.getElementById('photoCount'), links: document.getElementById('linkCount'),
    search: document.getElementById('searchInput'), filters: document.getElementById('filterTabs'), refresh: document.getElementById('refreshBtn'),
    dialog: document.getElementById('detailDialog'), detailTitle: document.getElementById('detailTitle'), detailBody: document.getElementById('detailBody'),
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const decisionKind = candidate => candidate.matchDecision === 'existing_store_fill_missing_only' ? 'existing' : candidate.matchDecision === 'new_store_candidate' ? 'newStore' : 'review';
  const decisionLabel = candidate => ({existing:'기존가게 보충 후보',newStore:'신규가게 후보',review:'확인 필요'})[decisionKind(candidate)];
  const prettyDate = value => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(date); };
  const safeYogiyoUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };

  async function api(path) {
    const response = await fetch(`${API_BASE}${path}`, {method:'GET',mode:'cors',credentials:'omit',cache:'no-store',headers:API_HEADERS});
    if (!response.ok) throw new Error(`수집함을 불러오지 못했습니다. (${response.status})`);
    const payload = await response.json();
    if (payload.regionCode !== 'yeosu' || payload.customerVisible !== false) throw new Error('여수 Preview 검수 자료가 아니므로 표시를 중단했습니다.');
    return payload;
  }

  function visibleCandidates() {
    const query = state.query.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
    return state.candidates.filter(candidate => {
      if (state.filter !== 'all' && decisionKind(candidate) !== state.filter) return false;
      const haystack = `${candidate.store?.displayName || ''}${candidate.store?.address || ''}`.normalize('NFKC').toLowerCase().replace(/\s+/g,'');
      return !query || haystack.includes(query);
    });
  }

  function render() {
    const rows = visibleCandidates();
    elements.status.textContent = state.candidates.length
      ? `중복을 제외한 여수 가게 ${rows.length}개를 표시합니다. 반복 수집본은 최신 자료 1건만 사용합니다.`
      : '아직 화면에 표시할 여수 수집 후보가 없습니다.';
    if (!rows.length) {
      elements.list.innerHTML = '<div class="empty-card">조건에 맞는 가게 후보가 없습니다.<br>자동전송된 자료가 들어오면 이 화면에 나타납니다.</div>';
      return;
    }
    elements.list.innerHTML = rows.map(candidate => {
      const kind = decisionKind(candidate);
      const link = safeYogiyoUrl(candidate.store?.sourceUrl);
      return `<article class="candidate-card" data-batch-id="${escapeHtml(candidate.batchId)}">
        <header><div><h2>${escapeHtml(candidate.store?.displayName || '가게명 확인 필요')}</h2><address>${escapeHtml(candidate.store?.address || '주소 확인 필요')}</address></div><span class="decision ${kind}">${decisionLabel(candidate)}</span></header>
        <div class="card-metrics"><span>메뉴 ${Number(candidate.menuCount || 0)}개</span><span>사진 ${Number(candidate.photoMenuCount || 0)}개</span><span>${escapeHtml(prettyDate(candidate.receivedAt || candidate.updatedAt))}</span></div>
        <div class="card-actions"><button type="button" data-open-detail="${escapeHtml(candidate.batchId)}">메뉴 검수</button>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">요기요 링크</a>` : '<a aria-disabled="true">링크 없음</a>'}</div>
      </article>`;
    }).join('');
  }

  async function openDetail(batchId) {
    elements.detailTitle.textContent = '가게 후보 불러오는 중';
    elements.detailBody.innerHTML = '<p class="status-message">메뉴를 불러오는 중입니다.</p>';
    elements.dialog.showModal();
    try {
      const {candidate} = await api(`/api/collector-review/candidates/${encodeURIComponent(batchId)}`);
      elements.detailTitle.textContent = candidate.store?.displayName || '가게 후보';
      const link = safeYogiyoUrl(candidate.store?.sourceUrl);
      const menuHtml = candidate.menus?.length ? candidate.menus.map(menu => `<article class="menu-item"><strong>${escapeHtml(menu.name)}</strong>${menu.category ? `<p>${escapeHtml(menu.category)}</p>` : ''}${menu.description ? `<p>${escapeHtml(menu.description)}</p>` : ''}<span class="menu-evidence">${menu.hasPhoto ? `사진 확인 · ${escapeHtml(menu.photoEvidenceName || '저장됨')}` : '사진 없음 메뉴 보존'}${menu.detailEvidenceCount ? ` · 상세 ${menu.detailEvidenceCount}장` : ''}</span></article>`).join('') : '<div class="empty-card">보존된 메뉴가 없습니다.</div>';
      elements.detailBody.innerHTML = `<div class="detail-content"><div class="detail-meta"><b>${escapeHtml(decisionLabel(candidate))}</b><span>${escapeHtml(candidate.store?.address || '주소 확인 필요')}</span><span>수집 메뉴 ${Number(candidate.menuCount || 0)}개 · 사진 확인 ${Number(candidate.photoMenuCount || 0)}개</span>${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">요기요 원본 링크 열기</a>` : '<span>요기요 링크 없음</span>'}<span>승인 전 고객 가게목록에는 반영되지 않습니다.</span></div><div class="menu-list">${menuHtml}</div></div>`;
    } catch (error) {
      elements.detailBody.innerHTML = `<div class="detail-content"><div class="empty-card">${escapeHtml(error.message)}</div></div>`;
    }
  }

  async function load() {
    elements.refresh.disabled = true;
    elements.status.textContent = '수집 자료를 불러오는 중입니다.';
    try {
      let offset = 0;
      let payload = await api('/api/collector-review/candidates?limit=100&offset=0');
      const candidates = Array.isArray(payload.candidates) ? [...payload.candidates] : [];
      while (payload.pagination?.hasMore && candidates.length < 5000) {
        offset += Number(payload.pagination.returned || 0);
        if (!payload.pagination.returned) break;
        payload = await api(`/api/collector-review/candidates?limit=100&offset=${offset}`);
        candidates.push(...(Array.isArray(payload.candidates) ? payload.candidates : []));
      }
      state.candidates = candidates;
      state.summary = payload.summary || {};
      elements.collected.textContent = String(state.summary.collectedRecords ?? state.candidates.length);
      elements.total.textContent = String(state.summary.uniqueStores ?? state.summary.total ?? state.candidates.length);
      elements.duplicates.textContent = String(state.summary.duplicateCollections ?? 0);
      elements.menus.textContent = String(state.summary.menus ?? 0);
      elements.photos.textContent = state.summary.photoMetricsPending
        ? `${state.summary.photoMenus ?? 0}+` : String(state.summary.photoMenus ?? 0);
      elements.links.textContent = String(state.summary.linkedStores ?? 0);
      render();
    } catch (error) {
      elements.status.textContent = error.message;
      elements.list.innerHTML = '<div class="empty-card">서버 연결 준비 중입니다.<br>API Preview 배포가 끝난 뒤 새로고침해 주세요.</div>';
    } finally { elements.refresh.disabled = false; }
  }

  elements.search.addEventListener('input', event => { state.query = event.target.value; render(); });
  elements.filters.addEventListener('click', event => { const button = event.target.closest('[data-filter]'); if (!button) return; state.filter = button.dataset.filter; elements.filters.querySelectorAll('button').forEach(item => item.classList.toggle('active', item === button)); render(); });
  elements.list.addEventListener('click', event => { const button = event.target.closest('[data-open-detail]'); if (button) openDetail(button.dataset.openDetail); });
  elements.refresh.addEventListener('click', load);
  document.getElementById('detailClose').addEventListener('click', () => elements.dialog.close());
  elements.dialog.addEventListener('click', event => { if (event.target === elements.dialog) elements.dialog.close(); });
  load();
})();
