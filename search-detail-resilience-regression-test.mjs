import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const service = fs.readFileSync('store-service-info.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('store-service-info.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

assert.match(service, /const OVERVIEW_QUERY_DEBOUNCE_MS = 180/);
assert.match(service, /const OVERVIEW_RENDER_BATCH_SIZE = 36/);
assert.match(service, /overviewQueryComposing \|\| event\.isComposing\) return/);
assert.match(service, /scheduleOverviewQueryRefresh\(\{immediate: true\}\)/);
assert.match(service, /menuSearchAbortController\?\.abort\(\)/);
assert.match(service, /menuSearch\(requestedQuery, \{signal: requestController\.signal\}\)/);

const listContext = {
  overviewVisibleCount: 36,
  OVERVIEW_RENDER_BATCH_SIZE: 36,
  overviewQuery: '',
  menuSearchState: 'ready',
  overviewCardMarkup: entry => `<article data-entry="${entry.id}"></article>`,
  Math
};
vm.createContext(listContext);
vm.runInContext(`${extractFunction(service, 'overviewListMarkup')}; this.renderList = overviewListMarkup;`, listContext);
const thousandEntries = Array.from({length: 1000}, (_, id) => ({id}));
const firstBatch = listContext.renderList(thousandEntries);
assert.equal((firstBatch.match(/data-entry=/g) || []).length, 36, '첫 렌더는 36개 카드만 만들어야 합니다.');
assert.match(firstBatch, /data-store-service-load-more/, '나머지는 더 보기로 나눠 표시해야 합니다.');
assert.doesNotMatch(firstBatch, /data-entry="999"/, '1,000번째 카드를 첫 입력 렌더에 만들면 안 됩니다.');

assert.match(css, /\.store-service-overview-more[\s\S]*min-height: 54px/);
assert.match(app, /function storeDetailUnavailableMarkup\(store, error\)/);
assert.match(app, /가게 화면은 계속 이용할 수 있습니다/);
assert.match(app, /data-store-detail-retry/);
assert.doesNotMatch(app, /<h2 id="modalTitle">주문방법을 불러오지 못했습니다<\/h2>/);

assert.match(html, /data-api\.js\?v=[^"]*detail-rate-limit-backoff-1/);
assert.match(html, /app\.js\?v=[^"]*detail-degraded-fallback-1/);
assert.match(html, /store-service-info\.js\?v=[^"]*ime-debounce-1-progressive-results-1/);
assert.match(html, /store-service-info\.css\?v=[^"]*progressive-results-1/);

console.log('search/detail resilience regression: PASS');
