import crypto from 'node:crypto';

export const NEW_STORE_BRANCH = 'agent/sync-nine-new-stores';

export function stableStoreId(pageId) {
  return crypto
    .createHash('sha256')
    .update(String(pageId).replaceAll('-', ''))
    .digest('hex')
    .slice(0, 16);
}

const route = (name, url) => ({name, url, enabled: true});

export const NEW_NOTION_STORES = [
  {
    pageId: '3aada158-dd2a-8001-bfd4-ce4ae1899a42',
    name: '배달회 민족 돌산점',
    brandName: '배달회 민족',
    branchName: '돌산점',
    district: '돌산',
    category: '회/초밥/선어/해산물',
    categories: ['회/초밥/선어/해산물'],
    phone: '061-644-2145',
    naverMap: 'https://naver.me/FkayTtb4',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a9da158dd2a808cb4a8dd6ea20a23e6'),
      route('먹깨비', 'http://mukkebi.com/shop.php?data=213817'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?WUWs3uN'),
      route('CHAK 지역상품권', 'https://bit.ly/chak-yeosu'),
      route('전화주문', 'https://app.notion.com/p/3a9da158dd2a80ec9348ed030d637983'),
      route('요기요', 'https://ws.yogiyo.co.kr/vb366l'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=1032770&dishId&key=60164160-f579-430d-b541-a223d335bcb8'),
      route('배달의민족', 'https://s.baemin.com/8Y000H4qnrYWe')
    ]
  },
  {
    pageId: '3aada158-dd2a-805d-a6ec-fdb0f8049534',
    name: '팔도미역 돌산점',
    brandName: '팔도미역',
    branchName: '돌산점',
    district: '돌산',
    category: '국밥/찜/탕/찌개/조림',
    categories: ['한식', '국밥/찜/탕/찌개/조림'],
    phone: '061-641-7942',
    naverMap: 'https://naver.me/FHl0gvwZ',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a9da158dd2a80e49ba7c055c3164bcd'),
      route('먹깨비', 'http://mukkebi.com/shop.php?data=163728'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?UdXqeEG'),
      route('CHAK 지역상품권', 'https://bit.ly/chak-yeosu'),
      route('전화주문', 'https://app.notion.com/p/3a9da158dd2a800e8583f60f607fbde9'),
      route('요기요', 'https://ws.yogiyo.co.kr/7fwxz8k'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=783259&dishId&key=2a2915c8-c072-4c04-a863-0f4a64c71192'),
      route('배달의민족', 'https://s.baemin.com/ho000n3eD1S5A')
    ]
  },
  {
    pageId: '3aada158-dd2a-801f-9f4b-df4676480d21',
    name: '과일의숲 돌산점',
    brandName: '과일의숲',
    branchName: '돌산점',
    district: '돌산',
    category: '카페/디저트/베이커리/아이스크림/빙수',
    categories: ['카페/디저트/베이커리/아이스크림/빙수'],
    phone: '010-7178-9028',
    naverMap: 'https://naver.me/G5POPToZ',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a9da158dd2a80728711d39387ef91f1'),
      route('먹깨비', 'http://mukkebi.com/shop.php?data=190833'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?YiMSrCS'),
      route('CHAK 지역상품권', 'https://bit.ly/chak-yeosu'),
      route('전화주문', 'https://app.notion.com/p/3a9da158dd2a80b1a22ffffd234e57c7'),
      route('요기요', 'https://ws.yogiyo.co.kr/xgr6ojt'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=899996&dishId&key=a1df4287-2ff9-4860-a96d-e71d56b0fb51'),
      route('배달의민족', 'https://s.baemin.com/E6000rMtm23sh')
    ]
  },
  {
    pageId: '3aada158-dd2a-8056-a5a6-c0232ec0cfbd',
    name: '바삭하게 돌산점',
    brandName: '바삭하게',
    branchName: '돌산점',
    district: '돌산',
    category: '치킨',
    categories: ['치킨'],
    phone: '061-810-3322',
    naverMap: 'https://naver.me/5Jp2scAz',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a9da158dd2a807a99a6dbf3b01c61cb'),
      route('먹깨비', 'http://mukkebi.com/shop.php?data=178827'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?j9sX4Aa'),
      route('CHAK 지역상품권', 'https://bit.ly/chak-yeosu'),
      route('전화주문', 'https://app.notion.com/p/3a9da158dd2a80df9c76dcc359cee7de'),
      route('요기요', 'https://ws.yogiyo.co.kr/pgvtex'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=876490&dishId&key=da1b9833-62bd-481c-a8a3-e23d177c7352'),
      route('배달의민족', 'https://s.baemin.com/om000pvQY0huB')
    ]
  },
  {
    pageId: '3a9da158-dd2a-80cb-a179-e7dfc2ee17f6',
    name: '데이지샌드 덕충점',
    brandName: '데이지샌드',
    branchName: '덕충점',
    district: '덕충동',
    category: '햄버거/샌드위치/토스트/핫도그',
    categories: ['햄버거/샌드위치/토스트/핫도그'],
    phone: '0507-1324-2832',
    naverMap: 'https://naver.me/5UEUYp5X',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a8da158dd2a80818e6fd8eaa542fbea'),
      route('먹깨비', 'http://mukkebi.com/shop.php?data=164548'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?CtOYHOA'),
      route('CHAK 지역상품권', 'https://bit.ly/chak-yeosu'),
      route('전화주문', 'https://app.notion.com/p/3a9da158dd2a80069d24d92466730b61'),
      route('요기요', 'https://ws.yogiyo.co.kr/rbyo2r'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=830858&dishId&key=046439ca-50c4-41f7-97d3-06b39d89def7'),
      route('배달의민족', 'https://s.baemin.com/Ta000jBWjHvU0')
    ]
  },
  {
    pageId: '3a9da158-dd2a-8081-bb57-f04bc441d49e',
    name: '달다란과일 덕충점',
    brandName: '달다란과일',
    branchName: '덕충점',
    district: '덕충동',
    category: '카페/디저트/베이커리/아이스크림/빙수',
    categories: ['카페/디저트/베이커리/아이스크림/빙수'],
    phone: '061-663-5500',
    naverMap: 'https://naver.me/5ss7bvbr',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a9da158dd2a806e924aea320e3bdabd'),
      route('먹깨비', 'http://mukkebi.com/shop.php?data=89711'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?SB26SJe'),
      route('CHAK 지역상품권', 'https://bit.ly/chak-yeosu'),
      route('전화주문', 'https://app.notion.com/p/3a8da158dd2a80b7b3bdf112431d03cf'),
      route('요기요', 'https://ws.yogiyo.co.kr/ei3p32'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=935338&dishId&key=34bd4189-4094-4d79-a29d-3be09ae075f3'),
      route('배달의민족', 'https://s.baemin.com/Ae000hO8lYwJz')
    ]
  },
  {
    pageId: '3a9da158-dd2a-805e-bec5-f236ded06a02',
    name: '강다짐 삼각김밥 엑스포점',
    brandName: '강다짐 삼각김밥',
    branchName: '엑스포점',
    district: '덕충동',
    category: '분식/도시락',
    categories: ['한식', '분식/도시락'],
    phone: '061-662-1668',
    naverMap: 'https://naver.me/51uQCZP8',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a9da158dd2a802dbaf6f60aa51016cf'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?eWvWC4A'),
      route('전화주문', 'https://app.notion.com/p/3a9da158dd2a8048a3a6db90045c9220'),
      route('요기요', 'https://ws.yogiyo.co.kr/xp8ndxo'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=1009712&dishId&key=3a29efd9-fe17-4e52-b67a-6d63bef340f4'),
      route('배달의민족', 'https://s.baemin.com/Pa000E3gaGXcy')
    ]
  },
  {
    pageId: '3a9da158-dd2a-80f7-8438-cd7b181b2068',
    name: '학동집밥 엑스포점',
    brandName: '학동집밥',
    branchName: '엑스포점',
    district: '덕충동',
    category: '한식',
    categories: ['한식'],
    phone: '061-664-0555',
    naverMap: '',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a8da158dd2a807886cfe9ab3882922f'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?5B3qUgG'),
      route('전화주문', 'https://app.notion.com/p/3a8da158dd2a80ab9280f54ce0664237'),
      route('배달의민족', 'https://s.baemin.com/um000CahCyQg6')
    ]
  },
  {
    pageId: '3a9da158-dd2a-80ff-8daf-ef6e03853035',
    name: '수유리우동집 엑스포점',
    brandName: '수유리우동집',
    branchName: '엑스포점',
    district: '덕충동',
    category: '면요리',
    categories: ['분식/도시락', '면요리'],
    phone: '061-664-0555',
    naverMap: 'https://naver.me/xWT3Xqk8',
    routes: [
      route('가게바로주문', 'https://app.notion.com/p/3a8da158dd2a8068b6afdbe939022283'),
      route('땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?cVZFtEQ'),
      route('전화주문', 'https://app.notion.com/p/3a8da158dd2a80f6aec3ee380b750287'),
      route('요기요', 'https://ws.yogiyo.co.kr/vlbmk3'),
      route('쿠팡이츠', 'https://web.coupangeats.com/share?storeId=1006062&dishId&key=b23df728-6566-4542-87ec-b86847bbf0c2'),
      route('배달의민족', 'https://s.baemin.com/Yl000fgtfQqhF')
    ]
  }
].map(store => ({
  ...store,
  id: stableStoreId(store.pageId),
  notionPageId: store.pageId.replaceAll('-', ''),
  notionUrl: `https://app.notion.com/p/${store.pageId.replaceAll('-', '')}`
}));
