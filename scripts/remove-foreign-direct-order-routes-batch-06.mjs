import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const foreignUrl = 'https://app.notion.com/p/38eda158dd2a805cb72bc0187ae51579';
const targetStores = [
  ['d09fa15da80ff88e', '1989마라탕 봉강점'],
  ['f68c9f29515c518e', '곱도리辛 낙곱새 봉산점'],
  ['72747cfe04586176', '공차 여수해양공원점'],
  ['cc5b3b36c8737601', '김밥나라 관문점'],
  ['fb32c4e0939b5468', '김밥나라 국동점'],
  ['d60f32bbdaa13cf5', '까페빈 봉산점'],
  ['711596e9d930aab0', '냠냠치킨 국동점'],
  ['f0c36824f150a779', '더벤티 여수국동서희스타힐스점'],
  ['aa29edc20eb6da8b', '더벤티 여수돌산점'],
  ['8d6b7abaf3f7f596', '더벤티 여수수산시장점(교동)'],
  ['aae3c781ba45f8a3', '더벤티 여수이순신광장점(중앙동)'],
  ['4990a1c1dc208fce', '더벤티 여수해양공원점(중앙동)'],
  ['afe9497576e46e1e', '던킨 여수롯데마트점'],
  ['1ae0c16d309d1556', '둥이식당 봉강점'],
  ['a2939cd769593c56', '뚜레쥬르 여수돌산점'],
  ['03f6d7c59d6d1a45', '뚜레쥬르 여수엑스포타운점'],
  ['24420dd7743c89a6', '라인반점 국동점'],
  ['dedded076c21a785', '마라시대 마라탕 봉산점'],
  ['1fe48c8f1857b4d2', '맛있는 전시회 국동점'],
  ['dfa033316cfcecf7', '맵도리닭 봉산점'],
  ['0a5ea9fd4c080ed0', '멜로우 국동점'],
  ['e1089d6ba40ec342', '명품1인도시락&시원냉면밀면(국동)'],
  ['10f225b9ca817dc4', '배스킨라빈스 여수국동점'],
  ['989fc2e054bb87c9', '배스킨라빈스 여수충무점'],
  ['74914ff35d06477d', '별별김밥 봉산점'],
  ['81d552a2ffdcf486', '뵈르뵈르 여수봉산점'],
  ['adcbd0b7f13946a4', '삼해수산마차 국동점'],
  ['8608c923097a2adc', '선비칼국수 여수국동점'],
  ['c34a81ea7ed1d578', '여수 김치찜 참 잘하는집 봉산점'],
  ['fe356412007caf0c', '여수튀김 국동점'],
  ['75f31fc5eb51073b', '영화루 국동점'],
  ['f78b89beff94fd0e', '오늘은카레 봉산점'],
  ['9bb804e004dff7d8', '온앤 신월점'],
  ['7a91bd1d1f218c97', '이디야 여수대교동점'],
  ['0fcde82a0f46ee28', '이디야커피 여수돌산우두리점'],
  ['43b4908cf2161b80', '이디야커피 여수연등메트하임점']
];

for (const [storeId, storeName] of targetStores) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error(`store missing ${storeId}`);
  if (store.name !== storeName) throw new Error(`store name mismatch ${storeId}: ${store.name}`);
  const matches = (store.routes || []).filter(route => route.name === '가게바로주문' && route.url === foreignUrl);
  if (matches.length !== 1) throw new Error(`route mismatch ${storeName}: ${matches.length}`);
  store.routes = store.routes.filter(route => !(route.name === '가게바로주문' && route.url === foreignUrl));
}

const owner = stores.find(value => String(value.store_id || value.id) === '149224e8ca5281d9');
if (!owner || owner.name !== '동대문엽기떡볶이 문수점') throw new Error('verified owner missing');
if (!(owner.routes || []).some(route => route.name === '가게바로주문' && route.url === foreignUrl)) {
  throw new Error('verified owner route was not preserved');
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
console.log(JSON.stringify({ correctedStores: targetStores.length, removedLinks: targetStores.length, preservedOwner: owner.name }));
