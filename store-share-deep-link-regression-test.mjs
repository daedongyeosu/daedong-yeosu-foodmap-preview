import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const html=readFileSync('index.html','utf8');
const app=readFileSync('app.js','utf8');
const finalExperience=readFileSync('final-experience.js','utf8');
const rc2=readFileSync('rc2-fixes.js','utf8');
const stores=JSON.parse(readFileSync('data/stores.json','utf8'));

assert.match(html,/https:\/\/daedongmap\.com\//,'공식 공유·메타 주소는 운영 .com 호스트여야 합니다.');
assert.doesNotMatch(html,/daedongmap\.kr/,'HTML에 이전 .kr 주소가 남아 있으면 안 됩니다.');
assert.doesNotMatch(finalExperience,/daedongmap\.kr/,'공유 코드에 이전 .kr 주소가 남아 있으면 안 됩니다.');
assert.match(finalExperience,/const FX_HOME_SHARE_URL='https:\/\/daedongmap\.com\/';/);
assert.match(finalExperience,/url\.searchParams\.set\(FX_STORE_SHARE_PARAM,String\(store\.id\)\)/,'가게 공유 URL에는 가게 ID가 포함되어야 합니다.');
assert.match(finalExperience,/function fxShare\(store,target\)\{fxOpenStoreShare\(store,target\);\}/,'가게 공유 버튼은 먼저 주소가 보이는 전용 화면을 열어야 합니다.');
assert.match(finalExperience,/data-store-share-url/,'가게 공유주소를 화면에서 직접 확인할 수 있어야 합니다.');
assert.match(finalExperience,/data-store-share-copy/,'PC에서 가게 공유주소를 복사할 수 있어야 합니다.');
assert.match(finalExperience,/fxPlatform\(\)!=='other'&&Boolean\(navigator\.share\)/,'휴대폰에서만 운영체제 공유창 버튼을 표시해야 합니다.');
assert.doesNotMatch(finalExperience,/Bitly|전단지 QR/,'고객 공유화면에 운영자용 Bitly·QR 문구가 노출되면 안 됩니다.');
assert.match(finalExperience,/가게 주소를 복사해 카카오톡·문자 등으로 공유해보세요/,'고객에게 공유 방법을 자연스럽게 안내해야 합니다.');
assert.match(finalExperience,/원하는 곳에 붙여넣어 공유해 주세요/,'복사 완료 뒤 고객용 안내를 표시해야 합니다.');
assert.match(finalExperience,/new URLSearchParams\(location\.search\)\.get\(FX_STORE_SHARE_PARAM\)/,'진입 URL에서 공유 가게 ID를 읽어야 합니다.');
assert.match(finalExperience,/await fxOpenSharedStoreFromUrl\(\)/,'초기화가 끝난 뒤 공유된 가게를 열어야 합니다.');
assert.match(app,/!requestedSharedStoreId && !startupBypassHeroStoreIds\.has\(String\(requestedHeroStoreId\|\|''\)\) && localStorage\.getItem\('hideStartup'\)/,'공유 가게 진입 때 시작 광고가 팝업을 덮으면 안 됩니다.');
assert.match(rc2,/if \(share\) \{\s*event\.preventDefault\(\);\s*event\.stopImmediatePropagation\(\);/,'가게 공유 터치는 한 번만 처리되어야 합니다.');

const sample=stores.find(store=>store.store_id||store.id);
assert.ok(sample,'공유 딥링크를 검증할 가게가 필요합니다.');
const sampleId=String(sample.store_id||sample.id);
const shareUrl=new URL('https://daedongmap.com/');
shareUrl.searchParams.set('store',sampleId);
assert.equal(shareUrl.origin,'https://daedongmap.com');
assert.equal(shareUrl.searchParams.get('store'),sampleId);

const bbq=stores.find(store=>store.name==='비비큐 미평둔덕점');
assert.equal(bbq?.id,'0abd7147b7d6b1dd','비비큐 미평둔덕점의 기존 고유 ID가 유지되어야 합니다.');
assert.equal(new URL(`?store=${bbq.id}`,'https://daedongmap.com/').href,'https://daedongmap.com/?store=0abd7147b7d6b1dd');

console.log(JSON.stringify({homeShare:'https://daedongmap.com/',sampleStore:sample.name,storeShare:shareUrl.href,bbqStoreShare:`https://daedongmap.com/?store=${bbq.id}`}));
