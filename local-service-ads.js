'use strict';

// Independent advertisers: deliberately no restaurant IDs, names, or ordering data.
(() => {
  const origin = location.hostname;
  const previewEnabled = ['preview.daedongmap.com', 'localhost', '127.0.0.1'].includes(origin);
  const root = '/assets/local-services/';
  const insuranceDocument = Object.freeze({
    title: '무배당 현대해상하이바이크운전자보험(Hi2601) 상품요약서',
    pdf: root + 'hyundai-hibike-hi2601-summary.pdf',
    source: 'https://www.hi.co.kr/FileActionServlet/preview/0/data/202601/20260109095156269.pdf',
    pages: 9
  });
  const advertisers = Object.freeze([
    Object.freeze({
      id: 'hyundai-sinwansu', theme: 'insurance', category: '보험 상담', brand: '현대해상',
      title: '하이바이크운전자보험', person: '신완수 하이플래너',
      description: '상품안내를 살펴보고 담당자에게 직접 문의하세요.',
      phone: '010-9271-3781', image: root + 'hyundai-guide-1.png',
      imageAlt: '현대해상 하이바이크운전자보험 상품안내 표지',
      official: 'https://mobi.hi.co.kr/bin/NS/MONS008011G.jsp?searchLoginId=1D2544&userType=62&dvcId=3f53d3bbe63f6517=SM-S928N=P',
      pages: [1, 2, 3, 4].map(n => root + `hyundai-guide-${n}.png`)
    }),
    Object.freeze({
      id: 'coway-leehyangmi', theme: 'rental', category: '생활가전·렌탈', brand: '코웨이',
      title: '우리 집에 필요한 생활가전', person: '이향미 코디',
      description: '정수기 · 비데 · 공기청정기 판매·렌탈 안내',
      phone: '010-4456-7165', image: root + 'coway-leehyangmi.png',
      imageAlt: '코웨이 이향미 코디 생활가전 판매·렌탈 안내',
      products: ['정수기', '비데', '공기청정기', '매트리스', '제습기', '의류청정기', '연수기', '안마의자', '안마베드', '전기레인지']
    })
  ]);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const find = id => advertisers.find(ad => ad.id === id);
  const href = id => '/services/?ad=' + encodeURIComponent(id);
  function enabled() {
    return previewEnabled && (!window.DAEDONG_REGION || window.DAEDONG_REGION.code === 'yeosu')
      && (typeof ACTIVE_REGION === 'undefined' || ACTIVE_REGION.code === 'yeosu');
  }
  function card(index = 0, placement = 'feed') {
    if (!enabled()) return '';
    const ad = advertisers[((index % advertisers.length) + advertisers.length) % advertisers.length];
    const headline = ad.theme === 'insurance' ? '하이바이크<wbr>운전자보험' : escape(ad.title);
    return `<aside class="local-service-ad local-service-${ad.theme}" data-service-ad="${ad.id}" data-ad-placement="${escape(placement)}" aria-label="${escape(ad.brand)} 광고">
      <div class="local-service-ad-label"><span>여수 생활서비스</span><span class="local-service-disclosure">광고</span></div>
      <a class="local-service-ad-main" href="${href(ad.id)}" data-local-service-open="${ad.id}">
        <span class="local-service-ad-copy"><span class="local-service-brand">${escape(ad.brand)} <span>· ${escape(ad.category)}</span></span><strong>${headline}</strong><span class="local-service-person">${escape(ad.person)}</span><span class="local-service-ad-description">${escape(ad.description)}</span><span class="local-service-ad-cta">상세 안내 보기 <span aria-hidden="true">↗</span></span></span>
        <img src="${ad.image}" alt="${escape(ad.imageAlt)}" width="${ad.theme === 'insurance' ? 511 : 1082}" height="${ad.theme === 'insurance' ? 716 : 660}" loading="lazy" decoding="async">
      </a>
      <a class="local-service-recruit" href="${href('advertise')}" data-local-service-open="advertise">우리 업체도 광고하기 <span aria-hidden="true">›</span></a>
    </aside>`;
  }
  function interleave(stores, renderCard, eligible = true) {
    return stores.map((store, index) => renderCard(store, index)
      + (eligible && (index + 1) % 8 === 0 && index < stores.length - 1 ? card(Math.floor(index / 8) + 1, 'store-list') : '')).join('');
  }
  function inquiry() {
    return `<section class="local-service-detail local-service-inquiry"><span class="local-service-kicker">대동여수음식지도</span><h2 id="modalTitle">우리 업체도<br>광고할 수 있나요?</h2><p class="local-service-lead">여수 고객에게 알리고 싶은 서비스가 있다면<br>광고 게재를 문의해 주세요.</p><div class="local-service-info-box"><h3>이렇게 보내주시면 됩니다</h3><ol><li>업체명과 담당자 연락처</li><li>소개할 상품 또는 서비스</li><li>게시할 사진·안내자료·연결 주소</li></ol><p>게시 위치·기간·비용은 상담 후 안내합니다.</p></div><nav class="local-service-actions" aria-label="광고 게재 문의"><a class="local-service-primary" href="tel:01047977803">광고 게재 전화 문의</a><a href="mailto:sisakim@naver.com?subject=${encodeURIComponent('대동여수음식지도 광고 게재 문의')}">이메일로 문의하기</a></nav><p class="local-service-contact-note">010-4797-7803 · sisakim@naver.com</p><p class="local-service-fineprint">보험·렌탈 상품 상담은 각 광고의 담당자에게 문의해 주세요. 이 연락처는 음식지도 광고 게재 문의용입니다.</p></section>`;
  }
  function officialDocument() {
    const doc = insuranceDocument;
    return `<section class="local-service-document"><span class="local-service-document-label">공식 문서 · 선명한 원본</span><h3>작은 글씨까지<br>크게 확인하세요</h3><p>${escape(doc.title)}<br>현대해상 공시실에서 확인한 같은 상품의 공식 자료입니다.</p><div class="local-service-document-links"><a href="${doc.pdf}" target="_blank" rel="noopener" class="local-service-pdf">선명한 PDF 원본 열기 ↗ <span>전체 9쪽 · 약 140KB</span></a><a href="${doc.pdf}" download>PDF 저장하기 ↓</a><a href="${doc.source}" target="_blank" rel="noopener noreferrer">현대해상 원본 출처 ↗</a></div><details class="local-service-reader" data-document-page="1" data-document-zoom="100"><summary>화면에서 확대해 읽기 · 9쪽</summary><div class="local-service-reader-controls"><div class="local-service-reader-pages" aria-label="문서 페이지 이동"><button type="button" data-document-action="previous" disabled aria-label="이전 페이지">← 이전</button><span data-document-status aria-live="polite" aria-atomic="true">1 / 9쪽</span><button type="button" data-document-action="next" aria-label="다음 페이지">다음 →</button></div><div class="local-service-reader-zoom" aria-label="문서 확대"><button type="button" data-document-action="read">글자 크게 · 6배</button><button type="button" data-document-action="out" disabled aria-label="문서 축소">축소 −</button><button type="button" data-document-action="fit">전체 보기</button><span data-document-scale aria-live="polite">100%</span></div></div><p class="local-service-reader-hint">‘글자 크게’를 누른 뒤 문서를 좌우·위아래로 밀어서 읽으세요. PDF 원본에서는 더 확대할 수 있습니다.</p><div class="local-service-document-viewport" tabindex="0" role="region" aria-label="공식 상품요약서 확대 영역. 방향키 또는 터치로 이동"><img src="${root}hyundai-summary-1.png" alt="현대해상 하이바이크운전자보험 Hi2601 공식 상품요약서 1 / 9쪽. 자세한 원문은 위 PDF에서 확인" width="3600" height="2547" loading="lazy" decoding="async" draggable="false"></div><p class="local-service-document-error" role="status" hidden>문서 이미지를 불러오지 못했습니다. 위의 ‘선명한 PDF 원본 열기’를 이용해 주세요.</p></details><p class="local-service-document-note">9쪽 모두 원문 그대로 제공합니다. 아래의 담당자 제공 전단 4장과는 별도의 공식 상품요약서입니다. 이 요약서와 함께 약관 및 가입 시 유의사항을 확인하고, 가입 가능 여부와 현재 판매 조건은 담당자에게 확인해 주세요.</p></section>`;
  }
  function updateDocument(button) {
    const reader = button.closest('.local-service-reader');
    if (!reader) return;
    let page = Math.max(1, Math.min(insuranceDocument.pages, Number(reader.dataset.documentPage) || 1));
    let zoom = [100, 300, 600].includes(Number(reader.dataset.documentZoom)) ? Number(reader.dataset.documentZoom) : 100;
    const oldPage = page;
    const action = button.dataset.documentAction;
    if (action === 'previous') page = Math.max(1, page - 1);
    else if (action === 'next') page = Math.min(insuranceDocument.pages, page + 1);
    else if (action === 'read') zoom = 600;
    else if (action === 'out') zoom = zoom === 600 ? 300 : 100;
    else if (action === 'fit') zoom = 100;
    else return;
    reader.dataset.documentPage = String(page);
    reader.dataset.documentZoom = String(zoom);
    reader.querySelector('[data-document-status]').textContent = `${page} / ${insuranceDocument.pages}쪽`;
    reader.querySelector('[data-document-scale]').textContent = `${zoom}%`;
    reader.querySelector('[data-document-action="previous"]').disabled = page === 1;
    reader.querySelector('[data-document-action="next"]').disabled = page === insuranceDocument.pages;
    reader.querySelector('[data-document-action="out"]').disabled = zoom === 100;
    const img = reader.querySelector('.local-service-document-viewport img');
    if (page !== oldPage) {
      reader.querySelector('.local-service-document-error').hidden = true;
      img.src = `${root}hyundai-summary-${page}.png`;
      img.alt = `현대해상 하이바이크운전자보험 Hi2601 공식 상품요약서 ${page} / ${insuranceDocument.pages}쪽. 자세한 원문은 위 PDF에서 확인`;
    }
    img.style.width = `${zoom}%`;
    const viewport = reader.querySelector('.local-service-document-viewport');
    // Keep the official page intact, but start past its wide blank print margins.
    viewport.scrollTop = zoom > 100 ? Math.round(img.clientHeight * .08) : 0;
    viewport.scrollLeft = zoom > 100 ? Math.round(img.clientWidth * .10) : 0;
  }
  function detail(id) {
    if (id === 'advertise') return inquiry();
    const ad = find(id);
    if (!ad) return `<section class="local-service-detail"><h2 id="modalTitle">광고를 찾을 수 없습니다</h2><p>아래에서 현재 안내 중인 서비스를 확인해 주세요.</p><a href="/services/">생활서비스 전체 보기</a></section>`;
    const material = ad.pages
      ? `${officialDocument()}<section class="local-service-material"><h3>담당자 제공 상품안내</h3><p>처음 전달받은 전단 4장입니다. 작은 글씨는 위의 공식 PDF로 확인해 주세요.</p><details><summary>담당자 제공 전단 4장 펼쳐 보기</summary><div class="local-service-gallery">${ad.pages.map((src, i) => `<a href="${src}" target="_blank" rel="noopener" aria-label="상품안내 ${i + 1}쪽 원본 크게 보기"><img src="${src}" alt="하이바이크운전자보험 담당자 제공 전단 ${i + 1}쪽" width="511" height="716" loading="lazy"><span>${i + 1} / 4 · 원본 크게 보기 ↗</span></a>`).join('')}</div></details><p class="local-service-fineprint">전단은 광고주가 제공했으며 원본 화질을 유지했습니다. 전단의 작은 글씨를 추측해 고쳐 쓰지 않았습니다. 가입 가능 여부와 보장 범위·제외사항 등 자세한 내용은 약관과 담당자 안내를 확인해 주세요. 대동여수음식지도에서 보험 가입을 받지는 않습니다.</p></section>`
      : `<section class="local-service-material"><h3>판매·렌탈 안내 제품</h3><div class="local-service-products">${ad.products.map(p => `<span>${escape(p)}</span>`).join('')}</div><a class="local-service-original" href="${ad.image}" target="_blank" rel="noopener"><img src="${ad.image}" alt="${escape(ad.imageAlt)}" width="1082" height="660" loading="lazy"><span>제공된 안내 이미지 크게 보기 ↗</span></a><p class="local-service-fineprint">제품별 가격·계약기간·서비스 조건은 담당자에게 확인해 주세요.</p></section>`;
    return `<section class="local-service-detail local-service-${ad.theme}" data-service-detail="${ad.id}"><span class="local-service-kicker">${escape(ad.category)} <span class="local-service-disclosure">광고</span></span><h2 id="modalTitle">${escape(ad.brand)}<br>${escape(ad.title)}</h2><p class="local-service-lead">${escape(ad.description)}</p><div class="local-service-contact"><span>${escape(ad.person)}</span><strong>${ad.phone}</strong></div><nav class="local-service-actions" aria-label="${escape(ad.person)} 상담"><a class="local-service-primary" href="tel:${ad.phone.replace(/-/g, '')}">담당자에게 전화하기</a><a href="sms:${ad.phone.replace(/-/g, '')}">문자로 문의하기</a>${ad.official ? `<a class="local-service-official" href="${escape(ad.official)}" target="_blank" rel="noopener noreferrer">현대해상 모바일 명함 보기 ↗</a>` : ''}</nav>${material}<div class="local-service-inquiry-link"><span>여수 고객에게 우리 서비스를 알리고 싶다면</span><a href="${href('advertise')}" data-local-service-open="advertise">우리 업체도 광고하기 ›</a></div></section>`;
  }
  function open(id) {
    if (!enabled() || (id !== 'advertise' && !find(id))) return false;
    if (typeof openModal === 'function') {
      openModal(detail(id));
      const scroller = document.querySelector('#modal .modal-card');
      if (scroller) scroller.scrollTop = 0;
      return true;
    }
    return false;
  }
  function init() {
    document.addEventListener('click', event => {
      const documentButton = event.target.closest?.('[data-document-action]');
      if (documentButton && enabled()) { updateDocument(documentButton); return; }
      const link = event.target.closest?.('[data-local-service-open]');
      if (!link || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (open(link.dataset.localServiceOpen)) event.preventDefault();
    });
    document.addEventListener('error', event => {
      if (event.target.matches?.('.local-service-document-viewport img')) {
        const reader = event.target.closest('.local-service-reader');
        if (reader) reader.querySelector('.local-service-document-error').hidden = false;
      }
    }, true);
    const standalone = document.getElementById('localServicePage');
    if (standalone) {
      if (!enabled()) { standalone.innerHTML = '<h1>생활서비스 준비 중</h1><a href="/">음식지도로 돌아가기</a>'; return; }
      const id = new URLSearchParams(location.search).get('ad');
      const ad = find(id);
      document.title = `${id === 'advertise' ? '광고 게재 문의' : ad ? ad.brand + ' ' + ad.person : '여수 생활서비스'} | 대동여수음식지도`;
      standalone.innerHTML = id ? detail(id) : `<header class="local-service-directory-head"><span class="local-service-kicker">대동여수음식지도</span><h1>여수 생활서비스</h1><p>필요한 서비스를 살펴보고<br>담당자에게 직접 문의하세요.</p></header><div class="local-service-directory">${advertisers.map((_, i) => card(i, 'directory')).join('')}</div>`;
    }
  }
  window.daedongLocalServices = Object.freeze({enabled, advertisers, card, interleave, detail, open});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
