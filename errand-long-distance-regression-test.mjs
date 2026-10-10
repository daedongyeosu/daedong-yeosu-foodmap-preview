import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');

assert.match(html,/가져올 곳은 여수시 안에서 선택하고, 가져다줄 곳은 전국 공식 주소/);
assert.match(html,/직선거리가 아니라 차량별 실제 통행 가능한 네비게이션 경로/);
assert.match(html,/빈차 복귀를 전제로 한 왕복거리·왕복시간/);
assert.match(html,/사람을 태우거나 아이·환자·취객을 이동시키는 요청/);
assert.match(html,/id="farePreview"[^>]+data-mode="local_quick"/);

assert.match(app,/kind==='pickup'&&!isYeosuAddress/,'pickup must remain inside Yeosu');
assert.match(app,/kind==='pickup'\?`여수 \$\{query\}`:query/,'dropoff place search must support nationwide queries');
assert.match(app,/mode:isLongDistanceQuick\(\)\?'long_distance_express':'local_quick'/);
assert.match(app,/routeMetric:'navigation_road_round_trip'/);
assert.match(app,/returnAssumption:isLongDistanceQuick\(\)\?'full_empty_return':'not_applicable'/);
assert.match(app,/직선거리나 편도거리로 계산하지 않습니다/);
assert.match(app,/사람 이동은 물품 심부름으로 접수할 수 없습니다/);

console.log('errand long-distance and passenger-separation regression checks passed');
