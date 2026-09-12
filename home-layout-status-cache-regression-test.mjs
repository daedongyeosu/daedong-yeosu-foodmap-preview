import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const experience = fs.readFileSync('final-experience.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const hero = fs.readFileSync('rc6-fixes.js', 'utf8');
function fn(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\n}', start);
  if (source === experience) return source.slice(start, end + 2);
  const serviceEnd = source.indexOf('\n  }', start);
  return source.slice(start, serviceEnd + 4);
}

let docTop = 300, rootTop = -100, interaction = true, modal = false, scrollCalls = 0;
const win = {scrollY: 100, scrollX: 0, innerHeight: 844, daedongHasHomeInteraction: () => interaction};
const anchor = {isConnected: true, getBoundingClientRect: () => ({top: docTop - win.scrollY, height: 400})};
const root = {isConnected: true, nextElementSibling: anchor, childNodes: [],
  getBoundingClientRect: () => ({top: rootTop}),
  replaceChildren: () => { docTop += 1900; }, removeAttribute() {}};
const ctx = vm.createContext({window: win, document: {body: {matches: () => modal}},
  scrollWindowInstant: top => {win.scrollY = top; scrollCalls++;}, observeDeferredPhotos() {}});
vm.runInContext(['fxCaptureDownstreamAnchor', 'fxRestoreDownstreamAnchor', 'fxCommitRailsWithoutMovingActiveList']
  .map(name => fn(experience, name)).join('\n'), ctx);
ctx.fxCommitRailsWithoutMovingActiveList(root, {childNodes: []});
assert.equal(anchor.getBoundingClientRect().top, 200, 'late rails must keep the same viewport position');
assert.equal(scrollCalls, 1);
const captured = ctx.fxCaptureDownstreamAnchor(root);
ctx.fxRestoreDownstreamAnchor(captured);
assert.equal(scrollCalls, 1, 'no double correction if browser anchoring already preserved the position');
// The customer is reading upstream content. An empty rail and the downstream
// list can both fit below it; growing that rail must not steal the viewport.
win.scrollY = 900; docTop = 1500; rootTop = 500;
ctx.fxCommitRailsWithoutMovingActiveList(root, {childNodes: []});
assert.equal(win.scrollY, 900, 'late content below the viewport origin must not pull the customer down');
assert.equal(scrollCalls, 1, 'no correction for an upstream reader');
rootTop = 0; docTop = 1500;
assert.equal(ctx.fxCaptureDownstreamAnchor(root), null, 'the current section itself is not a downstream anchor');
rootTop=130; docTop=win.scrollY+210;
const visibleList=ctx.fxCaptureDownstreamAnchor(root);
assert.ok(visibleList,'the visible list remains the anchor when an empty preceding rail starts below the viewport top');
docTop+=1800;ctx.fxRestoreDownstreamAnchor(visibleList);
assert.equal(anchor.getBoundingClientRect().top,210,'late initial rail expansion cannot push the actively read list away');
rootTop = -100;
for (const state of ['fresh', 'top', 'modal', 'above']) {
  win.scrollY = state === 'top' ? 0 : 100;
  interaction = state !== 'fresh'; modal = state === 'modal';
  docTop = state === 'above' ? 1200 : 300;
  assert.equal(ctx.fxCaptureDownstreamAnchor(root), null, `do not pull the customer away: ${state}`);
}
assert.match(hero, /fxCaptureDownstreamAnchor\(hero\)/);
assert.match(hero, /fxRestoreDownstreamAnchor\(viewportAnchor\)/);
assert.match(service, /function decorateStoreCards\(\)[\s\S]*fxCaptureDownstreamAnchor[\s\S]*fxRestoreDownstreamAnchor\(viewportAnchor\)/);

let formats = 0;
const formatter = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
const weekly = Object.fromEntries(['sun','mon','tue','wed','thu','fri','sat'].map(day => [day, [{open: '11:00', close: '01:00'}]]));
const info = {hours: {weekly}};
const statusCtx = vm.createContext({Date, serviceLoadState: 'ready', formatter: {formatToParts(date) {formats++; return formatter.formatToParts(date);}},
  WEEK_FROM_SHORT: {Sun:'sun',Mon:'mon',Tue:'tue',Wed:'wed',Thu:'thu',Fri:'fri',Sat:'sat'},
  WEEK_KEYS: ['sun','mon','tue','wed','thu','fri','sat'], CLOSING_SOON_MINUTES: 30,
  STATUS_SORT_PRIORITY: {open:0,'closing-soon':1,unknown:2,closed:3}, storeIdOf: store=>store.id,
  serviceInfoForStore: () => info});
vm.runInContext('let calendarMinute=NaN,calendarValue=null;const statusPriorityCache=new WeakMap();\n' +
  ['timeMinutes','calendarParts','shiftCalendar','closureFor','breakFor','periodLabel','openStatus','storeStatus','statusPriorityForStore']
    .map(name=>fn(service,name)).join('\n'), statusCtx);
const rank = iso => statusCtx.statusPriorityForStore({id:'test'}, new Date(iso));
assert.equal(rank('2026-09-11T10:59:59+09:00'), 3);
assert.equal(rank('2026-09-11T11:00:00+09:00'), 0, 'opening boundary invalidates minute cache');
for(let i=0;i<5000;i++) assert.equal(rank('2026-09-11T11:00:30+09:00'), 0);
assert.equal(formats, 2, 'sorting must not repeat timezone conversion thousands of times');
assert.equal(rank('2026-09-12T00:30:00+09:00'), 1, 'overnight closing-soon');
assert.equal(rank('2026-09-12T01:00:00+09:00'), 3, 'overnight closing boundary');
info.hours = {weekly, breaks:[{open:'12:00',close:'13:00'}]};
assert.equal(rank('2026-09-11T12:00:00+09:00'), 3);
assert.equal(rank('2026-09-11T13:00:00+09:00'), 0);
info.hours = {weekly, closures:[{type:'weekly',weekday:'fri'}]};
assert.equal(rank('2026-09-11T13:00:00+09:00'), 3, 'new hours snapshot invalidates cache within the same minute');
info.hours = {displayLines:['매일 11:00–01:00']};
assert.equal(rank('2026-09-11T13:00:00+09:00'), 2, 'free-text native hours do not reuse an old open rank');
if (fn(service, 'storeStatus').includes("serviceLoadState === 'error'")) {
  info.hours = {weekly};
  assert.equal(rank('2026-09-11T13:00:00+09:00'), 0);
  statusCtx.serviceLoadState = 'error';
  assert.equal(rank('2026-09-11T13:00:00+09:00'), 2, 'production loading failure must not reuse an open rank');
  statusCtx.serviceLoadState = 'ready';
  assert.equal(rank('2026-09-11T13:00:00+09:00'), 0);
}
console.log('PASS: active viewport anchoring and minute/snapshot-safe status ranks');
