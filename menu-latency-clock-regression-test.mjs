import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('scripts/browser-customer-performance-budget.mjs','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('function startMenuLatencyMeasurement(button) {');
const end=source.indexOf('\n}\n',start)+2;
assert.ok(start>0&&end>start);
function measure(delay, initialVisibility=true) {
  let now=0, ready=false, visible=initialVisibility, disconnected=false;
  const frames=[];
  const node={getClientRects:()=>visible?[{}]:[]};
  const overlay={querySelector:selector=>selector.includes(',')?node:ready?node:null};
  const sandbox={window:{},performance:{now:()=>now},
    requestAnimationFrame:callback=>{frames.push(callback);return frames.length;},
    MutationObserver:class{observe(){} disconnect(){disconnected=true;}},
    document:{documentElement:{},querySelector:()=>overlay}};
  vm.runInNewContext(source.slice(start,end),sandbox);
  // Driver delay before dispatch is not user interaction time.
  now=5000;
  sandbox.startMenuLatencyMeasurement({click(){now+=delay;}});
  now+=16; frames.shift()();
  const shell=sandbox.window.__qaMenuSkeletonAt;
  if(!initialVisibility)assert.equal(shell,null,'Hidden DOM must never pass the visible-frame measurement.');
  visible=true; ready=true; now+=200; frames.shift()();
  assert.ok(disconnected);
  return {shell:shell===null?null:shell-sandbox.window.__qaMenuStart,
    ready:sandbox.window.__qaMenuReadyAt-sandbox.window.__qaMenuStart};
}
assert.equal(measure(20).shell,36,'Measure through the next visible rendering frame, not just DOM insertion.');
assert.ok(measure(300).shell>250,'A real slow UI still fails the unchanged 250ms budget.');
assert.equal(measure(20,false).shell,null);
assert.match(source,/menuSkeletonMs: numberFromEnv\('PERF_MENU_SKELETON_MS', 250\)/);
assert.match(source,/menuReadyMs: numberFromEnv\('PERF_MENU_READY_MS', 3500\)/);
assert.match(source,/report.measurements.menuSkeletonDriverMs = elapsed\(menuStartedAt\)/);
assert.match(source,/report.measurements.menuReadyDriverMs = elapsed\(menuStartedAt\)/);
assert.match(source,/report.measurements.menuSkeletonMs = await page.evaluate/);
assert.match(source,/page.waitForSelector\(\x60\[data-store-menu-overlay\]:not\(\[hidden\]\) .store-menu-preview\[data-store-id=/);
console.log('menu latency renderer clock regression: PASS');
