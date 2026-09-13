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
  // Four responsive, always-visible sheets. Live text stays sharp at any zoom;
  // the supplied raster is used only for the cover artwork, never for body text.
  // Copy provenance / limitations: assets/local-services/hyundai-readable-source.json.
  function insuranceBrochure(ad) {
    return `<div class="insurance-reading-tools"><span>상품안내</span><button type="button" data-insurance-font aria-pressed="false">글자 더 크게 ＋</button></div>
      <div class="insurance-brochure">
        <section class="insurance-sheet insurance-cover" data-insurance-sheet="1" aria-label="1장 상품 소개">
          <span class="insurance-sheet-number">01 / 04 · 현대해상</span>
          <h2 id="modalTitle">하이바이크<br>운전자보험</h2><p class="insurance-edition">무배당 · Hi2601</p>
          <p class="insurance-cover-message">이륜자동차의<br><strong>운행 목적에 맞게.</strong></p>
          <div class="insurance-cover-art" aria-hidden="true"><img src="${ad.image}" alt="" width="511" height="716" decoding="async"></div>
          <p>출퇴근부터 배달까지,<br>사용 목적을 알리고 가입 조건을 확인하세요.</p>
          <a class="insurance-quick-contact" href="tel:${ad.phone.replace(/-/g, '')}"><span>${escape(ad.person)}</span><strong>${ad.phone}</strong><span>전화로 문의하기 ↗</span></a>
        </section>
        <section class="insurance-sheet" data-insurance-sheet="2" aria-label="2장 상품특징">
          <span class="insurance-sheet-number">02 / 04 · 상품특징</span><h3>어떻게 운행하시나요?</h3><p>가입할 때 실제 운행 목적에 맞는 구분을 선택합니다.</p>
          <div class="insurance-use"><h4>출퇴근·일상생활</h4><strong>가정용 및 기타용도</strong><p>배달 목적 없이 출퇴근이나 일상생활에 이용하는 경우입니다.</p></div>
          <div class="insurance-use"><h4>매장의 직접 배달</h4><strong>비유상운송배달</strong><p>음식점 등의 직원이나 운영자가 요금·대가를 직접 받지 않고 배달하는 경우입니다. 정확한 구분은 실제 업무 형태에 따라 확인하세요.</p></div>
          <div class="insurance-use"><h4>배달대행·퀵서비스</h4><strong>유상운송배달</strong><p>배달 건별 요금 등 배달 대가를 직접 받는 경우입니다.</p></div>
          <h4>이륜자동차 운전 중 상해</h4><p>사망·후유장해, 골절 진단·수술, 깁스치료, 입원일당, 사고부상 등을 기본계약 및 선택한 특약의 조건에 따라 보장합니다.</p>
          <h4>운전 중 발생하는 비용손해</h4><p>사고처리지원금, 벌금, 변호사선임비용 등의 특약이 있습니다. 모든 사고에 일괄 지급되는 것은 아니며, 특약별 지급사유·한도·공제금액이 적용됩니다.</p>
          <div class="insurance-notice"><h4>가입 전 알려야 할 운행정보</h4><ul><li>운행 목적: 가정용 및 기타 / 비유상운송 / 유상운송</li><li>이륜자동차 운전면허 보유 여부</li><li>주로 운행하는 차량의 배기량(cc)</li><li>이륜자동차 운전 경력</li></ul></div>
          <h4>보장 대상 차량도 확인하세요</h4><p>전단은 약관에서 정한 이륜자동차를 대상으로 안내합니다. 킥보드·ATV·전동휠체어 등은 전단의 보장 제외 예시에 포함되어 있습니다. 차량의 외형만으로 판단하지 말고 약관상 차량 구분을 확인하세요.</p>
          <p class="insurance-caution">위 내용은 해당 특약 가입 시에 적용됩니다. 실제 가입 가능 여부는 면허·운행 목적·차량 및 심사 결과에 따라 달라질 수 있습니다.</p>
        </section>
        <section class="insurance-sheet" data-insurance-sheet="3" aria-label="3장 가입안내 및 보장소개">
          <span class="insurance-sheet-number">03 / 04 · 가입안내</span><h3>가입 조건과<br>보장 내용을 확인하세요</h3>
          <dl class="insurance-facts"><div><dt>가입 나이</dt><dd>만 18세 ~ 70세</dd></div><div><dt>보험기간</dt><dd>3·5·7·10·15·20년 만기</dd></div><div><dt>보험료 납입</dt><dd>월납</dd></div><div><dt>납입기간</dt><dd>3·5·7·10년 만기: 전기납<br>15년 만기: 10년납 또는 전기납<br>20년 만기: 10년납·15년납 또는 전기납</dd></div></dl>
          <p class="insurance-caution">전기납은 보험기간 전체에 걸쳐 보험료를 납입하는 방식입니다. 가입 나이·건강상태·과거병력·직무 등에 따라 가입금액이 제한되거나 가입이 불가능할 수 있습니다.</p>
          <h4>기본계약</h4><p><strong>이륜자동차운전중상해사망</strong><br>이륜자동차 운전 중 교통사고로 발생한 상해로 사망한 경우 가입금액을 지급합니다.</p>
          <h4>선택계약 · 상해 관련</h4><ul><li>후유장해: 일반 / 50% 이상 / 80% 이상</li><li>골절진단(치아파절 제외), 5대골절진단</li><li>골절수술, 5대골절수술, 상해수술</li><li>깁스치료, 입원일당(1~180일)</li><li>사고부상, 사고부상(1~11급)</li><li>사고부상(차량단독사고 제외), 사고부상(차량단독사고 제외·1~11급)</li><li>상해진단(최초진단·4주 이상)</li></ul>
          <p class="insurance-caution">위 상해 특약은 이륜자동차 운전 중 교통사고로 발생한 상해에 대한 담보입니다. 특약마다 지급요건이 다릅니다.</p>
          <h4>선택계약 · 비용손해 관련</h4><ul><li>이륜자동차사고처리지원금</li><li>이륜자동차사고처리지원금(중대법규위반·6주 미만 치료)</li><li>자동차사고벌금Ⅱ(대인), 자동차사고벌금(대물)</li><li>자동차사고변호사선임비용Ⅴ: 심급별Ⅱ·특정사고경찰조사포함Ⅱ / 특정사고경찰조사포함Ⅱ</li><li>자동차사고면허정지일당, 자동차사고면허취소</li><li>법률비용손해(행정소송·민사소송)</li><li>과실치사상벌금(가족), 업무상과실·중과실치사상벌금</li></ul>
          <div class="insurance-notice"><h4>함께 확인할 가입 제한</h4><ul><li>5대골절진단·수술은 각각 골절진단·수술 특약을 먼저 가입해야 합니다.</li><li>사고부상(1~11급)은 해당 사고부상 특약의 선행 가입이 필요합니다. 차량단독사고 제외형도 같은 기준입니다.</li><li>면허정지일당·면허취소 특약은 영업용 운전자에 한해 가입할 수 있습니다.</li><li>6주 미만 치료 사고처리지원금 특약은 약관에서 정한 사고처리지원금 보장 가입이 선행되어야 합니다.</li><li>두 변호사선임비용Ⅴ 특약은 동시에 가입할 수 없습니다.</li><li>유상·비유상운송배달용의 벌금·변호사선임비용 특약은 영업용으로만 가입 가능합니다.</li><li>이륜자동차 운전이 가능한 면허 등을 보유한 운전자에 한해 가입 가능합니다.</li></ul></div>
          <h4>용어도 알아두세요</h4><p><strong>5대골절</strong><br>머리의 으깸손상, 목·흉추·요추·골반·대퇴골의 골절을 말합니다.</p><p><strong>차량단독사고</strong><br>상대방 없이 단독으로 발생시킨 사고나, 주차 차량·물건·도로시설물 등과의 충돌·접촉 등 약관에서 정한 사고입니다. 차량단독사고 제외형은 이러한 사고를 보장하지 않습니다.</p>
        </section>
        <section class="insurance-sheet" data-insurance-sheet="4" aria-label="4장 가입 시 유의사항">
          <span class="insurance-sheet-number">04 / 04 · 꼭 확인하세요</span><h3>가입 시 유의사항</h3>
          <h4>청약 내용은 사실대로 알려주세요</h4><p>청약서의 질문에 사실대로 답하고 직접 서명해야 합니다. 직업·직무·운행 목적 등 계약 후 알려야 할 사항이 바뀌면 보험회사에 알려야 합니다. 알릴 의무를 지키지 않으면 계약 해지나 보장 제한이 생길 수 있습니다.</p>
          <h4>보장 조건·제외사항을 함께 확인하세요</h4><p>이 화면에 나열된 특약이 모두 자동으로 포함되는 것은 아닙니다. 실제 가입한 특약과 보험증권·약관의 지급사유, 보장금액, 자기부담금 및 보험금을 지급하지 않는 사유가 적용됩니다.</p>
          <div class="insurance-notice"><h4>변호사선임비용 공제금액</h4><p>자동차사고변호사선임비용Ⅴ(심급별Ⅱ)(특정사고경찰조사포함Ⅱ)는 해당 심급 변호사선임비용의 <strong>50%를 공제</strong>한 뒤 심급별 한도 내에서 보상하는 구조입니다. 다른 유형의 특약과 혼동하지 않도록 확인하세요.</p></div>
          <h4>중복 가입해도 비용손해는 비례보상</h4><p>운전자비용 등 실제 손해를 보상하는 담보는 같은 손해를 보장하는 보험이 여러 개일 때 약관에 따라 비례보상합니다. 가입금액을 단순히 합쳐 모두 받는 방식이 아닙니다.</p>
          <h4>중도 해지와 환급금</h4><p>중도 해지하면 해약환급금이 납입한 보험료보다 적거나 없을 수 있습니다. 공시이율 변동이나 중도인출 등으로 만기·해약환급금이 달라질 수 있습니다. 이 상품은 배당하지 않는 무배당 상품입니다.</p>
          <h4>기존 보험을 바꾸기 전 확인하세요</h4><p>기존 계약을 해지하고 새로 가입하면 가입 거절, 보험료 인상 또는 보장 내용 변경 등이 생길 수 있습니다. 기존 계약과 새 계약의 조건을 먼저 비교하세요.</p>
          <h4>청약철회·계약취소 등 권리</h4><p>청약철회, 약관·청약서 부본 교부, 설명의무, 계약취소 및 위법계약 해지 등에 관한 내용은 계약서류에서 확인하세요. 적용 기간과 예외가 있으므로 담당자에게 설명을 요청할 수 있습니다.</p>
          <h4>보험료 납입·예금자보호</h4><p>보험료 연체로 계약이 해지될 수 있으니 납입 기일을 확인하세요. 예금자보호의 대상·한도·제외조건 및 보험계약 관련 상세 안내는 가입 시 제공되는 상품설명서에서 확인하세요.</p>
          <p class="insurance-caution">담당자 제공 전단 4장의 구성을 바탕으로 공식 Hi2601 상품요약서를 대조해 읽기 쉽게 정리한 화면용 안내입니다. 전단·약관 전문을 그대로 전재한 문서는 아닙니다. 구체적인 보장 및 가입 조건은 약관과 담당자 설명을 확인하세요. 대동여수음식지도에서 보험 가입을 받지는 않습니다.</p>
          <a class="insurance-customer-center" href="tel:15885656">현대해상 고객콜센터 <strong>1588-5656</strong></a>
        </section>
      </div>`;
  }
  function updateInsuranceFont(button) {
    const detail = button.closest('[data-service-detail="hyundai-sinwansu"]');
    if (!detail) return;
    const large = detail.classList.toggle('insurance-large-text');
    button.setAttribute('aria-pressed', String(large));
    button.textContent = large ? '기본 글자 크기 −' : '글자 더 크게 ＋';
  }
  function detail(id) {
    if (id === 'advertise') return inquiry();
    const ad = find(id);
    if (!ad) return `<section class="local-service-detail"><h2 id="modalTitle">광고를 찾을 수 없습니다</h2><p>아래에서 현재 안내 중인 서비스를 확인해 주세요.</p><a href="/services/">생활서비스 전체 보기</a></section>`;
    if (ad.theme === 'insurance') return `<section class="local-service-detail local-service-insurance insurance-direct" data-service-detail="${ad.id}"><span class="local-service-kicker">보험 상담 <span class="local-service-disclosure">광고</span></span>${insuranceBrochure(ad)}<div class="local-service-contact"><span>${escape(ad.person)}</span><strong>${ad.phone}</strong></div><nav class="local-service-actions" aria-label="${escape(ad.person)} 상담"><a class="local-service-primary" href="tel:${ad.phone.replace(/-/g, '')}">담당자에게 전화하기</a><a href="sms:${ad.phone.replace(/-/g, '')}">문자로 문의하기</a><a class="local-service-official" href="${escape(ad.official)}" target="_blank" rel="noopener noreferrer">현대해상 모바일 명함 보기 ↗</a></nav><footer class="insurance-source-links" aria-label="안내 출처"><span>자료 출처</span><a href="${insuranceDocument.source}" target="_blank" rel="noopener noreferrer">현대해상 Hi2601 상품요약서 ↗</a><span>담당자 제공 전단 ${ad.pages.map((src, i) => `<a href="${src}" target="_blank" rel="noopener" aria-label="제공 전단 ${i + 1}장 보기">${i + 1}장</a>`).join(' · ')}</span></footer><div class="local-service-inquiry-link"><span>여수 고객에게 우리 서비스를 알리고 싶다면</span><a href="${href('advertise')}" data-local-service-open="advertise">우리 업체도 광고하기 ›</a></div></section>`;
    const material = ad.pages
      ? ''
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
      const fontButton = event.target.closest?.('[data-insurance-font]');
      if (fontButton && enabled()) { updateInsuranceFont(fontButton); return; }
      const link = event.target.closest?.('[data-local-service-open]');
      if (!link || event.defaultPrevented || event.button > 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (open(link.dataset.localServiceOpen)) event.preventDefault();
    });
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
