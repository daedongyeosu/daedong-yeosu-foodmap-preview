import {createHash} from 'node:crypto';
import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORE_PATH = path.join(ROOT, 'data', 'stores.json');
const AUDIT_PATH = path.join(ROOT, 'data', 'store-category-classification-audit.json');

export const CATEGORY = Object.freeze({
  KOREAN: '한식',
  CHICKEN: '치킨',
  PIZZA: '피자',
  CHINESE: '중식',
  SNACK: '분식/도시락',
  PORK: '족발/보쌈',
  SEAFOOD: '회/초밥/선어/해산물',
  STEW: '국밥/찜/탕/찌개/조림',
  NOODLE: '면요리',
  GRILL: '고기/구이',
  JAPANESE: '돈까스/일식',
  DESSERT: '카페/디저트/베이커리/아이스크림/빙수',
  BURGER: '햄버거/샌드위치/토스트/핫도그',
  NIGHT: '야식/주점',
  MALA: '마라탕/양꼬치',
  SIDE: '반찬',
  OTHER: '기타'
});

export const CATEGORY_ORDER = Object.freeze([
  CATEGORY.KOREAN,
  CATEGORY.CHICKEN,
  CATEGORY.PIZZA,
  CATEGORY.CHINESE,
  CATEGORY.SNACK,
  CATEGORY.PORK,
  CATEGORY.SEAFOOD,
  CATEGORY.STEW,
  CATEGORY.NOODLE,
  CATEGORY.GRILL,
  CATEGORY.JAPANESE,
  CATEGORY.DESSERT,
  CATEGORY.BURGER,
  CATEGORY.NIGHT,
  CATEGORY.MALA,
  CATEGORY.SIDE,
  CATEGORY.OTHER
]);

const PRIMARY_ALIASES = new Map([
  ['돈까스', CATEGORY.JAPANESE],
  ['분식', CATEGORY.SNACK],
  ['회/해산물', CATEGORY.SEAFOOD],
  ['카페/디저트', CATEGORY.DESSERT]
]);

const RULES = Object.freeze([
  {
    id: 'burger-sandwich-toast',
    category: CATEGORY.BURGER,
    pattern: /햄버거|(?<!밥)버거|샌드위치|토스트|핫도그|써브웨이|서브웨이|퀴즈노스|테그42|롯데리아|맥도날드|맘스터치|버거킹/
  },
  {
    id: 'pizza',
    category: CATEGORY.PIZZA,
    pattern: /피자|도미노|피자헛|파파존스|미스터피자/
  },
  {
    id: 'chicken',
    category: CATEGORY.CHICKEN,
    pattern: /치킨|통닭|닭강정|닭꼬치|닭갈비|찜닭|60계|비비큐|bbq|bhc|굽네|교촌|푸라닭|네네|처갓집|호식이|또래오래|멕시카나|페리카나|지코바|자담|꾸브라꼬|아주커/
  },
  {
    id: 'chinese',
    category: CATEGORY.CHINESE,
    pattern: /중식|중화|차이나|짜장|짬뽕|탕수육|깐풍|양장피|마파두부/
  },
  {
    id: 'mala-lamb-skewer',
    category: CATEGORY.MALA,
    pattern: /마라|양꼬치|훠궈|샹궈/
  },
  {
    id: 'snack-lunchbox',
    category: CATEGORY.SNACK,
    pattern: /김밥|떡볶이|분식|라볶이|컵밥|도시락|김밥천국|김밥나라|바르다김선생|순대(?!국)|튀김/
  },
  {
    id: 'stew-soup-braise',
    category: CATEGORY.STEW,
    pattern: /국밥|순대국|감자탕|해장국|설렁탕|곰탕|갈비탕|내장탕|장어탕|동태탕|매운탕|알탕|추어탕|삼계탕|소한마리탕|육개장|부대찌개|찌개|짜글이|찜|닭도리탕|닭볶음탕|청국장|조림|전골|백숙|(?<!탕)수육|두루치기|두찜|서울깍두기|낙곱새|곱도리|뚝배기|진통뼈사랑/
  },
  {
    id: 'noodle',
    category: CATEGORY.NOODLE,
    pattern: /국수|냉면|밀면|칼국수|쫄면|우동|라면|라멘|소바|메밀|막국수|파스타|스파게티|쌀국수|면옥|모밀|짬뽕|짜장/
  },
  {
    id: 'pork-feet-bossam',
    category: CATEGORY.PORK,
    pattern: /족발|보쌈/
  },
  {
    id: 'seafood-sashimi-sushi',
    category: CATEGORY.SEAFOOD,
    pattern: /횟집|선어|해산물|초밥|스시|수산(?!시장)|아구|아귀|낙지|쭈꾸미|주꾸미|쭈신쭈왕|문어|장어|게장|꽃게|갈치|코다리|조개|굴|새우|대게|랍스터|해물|낙곱새/
  },
  {
    id: 'meat-grill',
    category: CATEGORY.GRILL,
    pattern: /고기|삼겹|갈비|곱창|막창|대창|구이|숯불|참숯|제육|불고기|닭갈비|스테이크|육회|육식|육감|껍데기|대패|두루치기|돼지(?!국밥)|콩불|낙곱새|곱도리/
  },
  {
    id: 'japanese-cutlet',
    category: CATEGORY.JAPANESE,
    pattern: /돈까스|돈가스|카츠|일식|초밥|스시|라멘|소바|오마카세|규동|텐동/
  },
  {
    id: 'cafe-dessert-bakery',
    category: CATEGORY.DESSERT,
    pattern: /카페|커피|디저트|베이커리|제과|아이스크림|빙수|도넛|도너츠|마카롱|와플|케이크|쿠키|스타벅스|이디야|메가커피|컴포즈|투썸|빽다방|더벤티|배스킨|던킨|파리바게뜨|뚜레쥬르/
  },
  {
    id: 'night-pub',
    category: CATEGORY.NIGHT,
    pattern: /야식|주점|포차|호프|맥주|술집|이자카야|닭발|곱창|막창|대창|79대포|낙곱새|곱도리/
  },
  {
    id: 'side-dish',
    category: CATEGORY.SIDE,
    pattern: /반찬|찬가게|찬거리/
  }
]);

const KOREAN_PRIMARY_CATEGORIES = new Set([
  CATEGORY.KOREAN,
  CATEGORY.SNACK,
  CATEGORY.PORK,
  CATEGORY.STEW,
  CATEGORY.GRILL,
  CATEGORY.SIDE
]);

const KOREAN_IDENTITY_PATTERN = /한식|백반|집밥|쌈밥|도시락|김밥|국밥|감자탕|해장국|설렁탕|곰탕|갈비탕|장어탕|동태탕|매운탕|알탕|추어탕|삼계탕|육개장|부대찌개|찌개|찜|전골|조림|(?<!탕)수육|족발|보쌈|백숙|제육|불고기|삼겹|갈비|게장|아구|아귀|낙지|쭈꾸미|주꾸미|코다리|두루치기/;

const NIGHT_BRIDGE_CATEGORIES = new Set([CATEGORY.PORK]);

function normalizePrimary(category) {
  const value = String(category || '').trim() || CATEGORY.OTHER;
  return PRIMARY_ALIASES.get(value) || value;
}

function identityText(store) {
  return [
    store.name,
    store.realBusinessName,
    store.brandName,
    store.branchName,
    ...(Array.isArray(store.aliases) ? store.aliases : []),
    ...(Array.isArray(store.searchAliases) ? store.searchAliases : []),
    ...(Array.isArray(store.shopInShopNames) ? store.shopInShopNames : [])
  ].filter(Boolean).join(' ').toLowerCase();
}

function ordered(values) {
  const set = new Set(values);
  return CATEGORY_ORDER.filter(category => set.has(category));
}

export function classifyStore(store) {
  const primary = normalizePrimary(store.category);
  const text = identityText(store);
  const categories = new Set([primary]);
  const evidence = [`primary:${primary}`];

  for (const rule of RULES) {
    if (!rule.pattern.test(text)) continue;
    categories.add(rule.category);
    evidence.push(`rule:${rule.id}`);
  }

  if (KOREAN_PRIMARY_CATEGORIES.has(primary) || KOREAN_IDENTITY_PATTERN.test(text)) {
    categories.add(CATEGORY.KOREAN);
    evidence.push('bridge:korean-food');
  }
  if (NIGHT_BRIDGE_CATEGORIES.has(primary)) {
    categories.add(CATEGORY.NIGHT);
    evidence.push('bridge:late-night-pork');
  }

  const result = ordered(categories);
  const secondary = result.filter(category => category !== primary);
  const reviewRequired =
    primary === CATEGORY.OTHER ||
    (primary === CATEGORY.KOREAN && secondary.length === 0) ||
    result.length >= 6;

  return {
    store_id: String(store.store_id || store.id || ''),
    storeName: String(store.name || ''),
    primaryCategory: String(store.category || ''),
    categories: result,
    evidence: [...new Set(evidence)],
    confidence: reviewRequired ? 'review' : secondary.length ? 'rule-backed' : 'primary-only',
    reviewRequired
  };
}

function protectedHash(stores) {
  const view = stores.map(store => {
    const copy = structuredClone(store);
    delete copy.categories;
    return copy;
  });
  return createHash('sha256').update(JSON.stringify(view)).digest('hex');
}

export function classifyAll(stores) {
  const rows = stores.map(classifyStore);
  const byId = new Map(rows.map(row => [row.store_id, row]));
  const updated = stores.map(store => ({
    ...store,
    categories: byId.get(String(store.store_id || store.id || ''))?.categories || [normalizePrimary(store.category)]
  }));
  const membershipCounts = Object.fromEntries(CATEGORY_ORDER.map(category => [
    category,
    rows.filter(row => row.categories.includes(category)).length
  ]));
  return {
    updated,
    audit: {
      schemaVersion: 1,
      generatedFrom: 'data/stores.json identity fields and existing primary category',
      policy: 'customer-search-intent multi-category classification; existing primary category is preserved',
      canonicalCategories: CATEGORY_ORDER,
      stats: {
        stores: stores.length,
        multiCategoryStores: rows.filter(row => row.categories.length > 1).length,
        primaryOnlyStores: rows.filter(row => row.categories.length === 1).length,
        reviewRequired: rows.filter(row => row.reviewRequired).length,
        membershipCounts,
        protectedStoreDataSha256: protectedHash(stores)
      },
      review: rows.filter(row => row.reviewRequired),
      rows
    }
  };
}

async function main() {
  const stores = JSON.parse(await readFile(STORE_PATH, 'utf8'));
  const {updated, audit} = classifyAll(stores);
  if (process.argv.includes('--write')) {
    await writeFile(STORE_PATH, `${JSON.stringify(updated, null, 2)}\n`);
    await writeFile(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
  }
  console.log(JSON.stringify(audit.stats, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
