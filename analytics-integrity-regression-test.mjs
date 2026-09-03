import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const app = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const identityStart = app.indexOf('function analyticsStoreIdentity');
const queueStart = app.indexOf('function analyticsQueueRead');
const senderStart = app.indexOf('function sendAnalyticsEvent');
const senderEnd = app.indexOf('function analyticsStoreForElement');
assert.ok(identityStart >= 0 && queueStart > identityStart && senderStart > queueStart && senderEnd > senderStart);

const analyticsSection = app.slice(identityStart, senderEnd);
assert.match(analyticsSection, /daedongResolveHeroCampaignStoreId/,
  '전용 QR의 이전 가게 번호는 대표 가게 번호로 바꿔 기록해야 합니다.');
assert.match(analyticsSection, /item\.mergedStoreIds/,
  '통합된 가게의 이전 번호도 대표 가게 통계에 포함해야 합니다.');
assert.match(analyticsSection, /ANALYTICS_QUEUE_KEY/,
  '전송하지 못한 통계는 브라우저에 임시 보관해야 합니다.');
assert.match(analyticsSection, /if \(!response\.ok\) throw/,
  '서버가 받았다고 확인한 기록만 대기열에서 제거해야 합니다.');
assert.match(analyticsSection, /filter\(item => item\.eventId !== payload\.eventId\)/,
  '확인된 한 건만 대기열에서 제거해야 합니다.');

const openStoreStart = app.indexOf('async function openStore');
const openStoreEnd = app.indexOf('async function fetchJson', openStoreStart);
const openStore = app.slice(openStoreStart, openStoreEnd);
const shellShown = openStore.indexOf("sendAnalyticsEvent('store_open'");
const secureLoad = openStore.indexOf('await secureDetail.enrich');
assert.ok(shellShown >= 0 && secureLoad > shellShown,
  '가게 팝업 열람은 상세자료 통신이 끝나기 전에 기록해야 합니다.');
assert.equal(openStore.match(/sendAnalyticsEvent\('store_open'/g)?.length, 1,
  '한 번의 가게 열기에 열람 기록을 중복 전송하면 안 됩니다.');

const bootStart = app.indexOf("document.addEventListener('DOMContentLoaded'");
const boot = app.slice(bootStart);
assert.match(boot, /analyticsVisitAfterCatalog/);
assert.match(boot, /finishCatalogReady\(result\);[\s\S]*sendAnalyticsEvent\('visit', \{storeId: entry\.storeId/,
  '가게 QR 방문은 대표 가게가 정해진 뒤 기록해야 합니다.');
assert.match(boot, /window\.addEventListener\('online', \(\) => void flushAnalyticsQueue\(\)\)/,
  '인터넷이 다시 연결되면 누락 기록을 재전송해야 합니다.');
assert.match(boot, /window\.addEventListener\('pagehide', beaconPendingAnalyticsEvents\)/,
  '페이지가 닫힐 때 남은 기록을 한 번 더 전송해야 합니다.');
assert.match(html, /analytics-integrity-1/,
  '휴대전화가 통계 수정본을 즉시 받도록 캐시 버전을 올려야 합니다.');

console.log('analytics integrity regression: PASS');
