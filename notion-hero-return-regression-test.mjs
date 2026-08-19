import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('app.js', 'utf8');
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const targets = JSON.parse(fs.readFileSync('data/banner-targets.json', 'utf8'));

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const body = source.indexOf('{', start);
  let depth = 0;
  for (let cursor = body; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1;
    if (source[cursor] === '}' && --depth === 0) return source.slice(start, cursor + 1);
  }
  throw new Error(`${name} 함수 범위를 찾지 못했습니다.`);
}

const baseHero = functionSource(app, 'renderHero');
assert.ok(
  baseHero.indexOf('daedongRestoreNotionHeroSnapshot') < baseHero.indexOf("const track = $('#heroTrack')"),
  '초기 렌더링이 로딩 뼈대를 다루기 전에 저장된 노션 광고를 즉시 복원해야 합니다.'
);
assert.match(baseHero, /hero\?\.removeAttribute\('aria-busy'\)/);
assert.match(rc6, /const RC6_NOTION_HERO_RETURN='daedongNotionHeroReturnV1'/);
assert.match(rc6, /rc6RememberNotionHeroReturn\(p\.slide\);location\.assign\(url\.href\)/);
assert.match(rc6, /const notionReturn=rc6ReadNotionHeroReturn\(\)/);
assert.match(rc6, /heroCarousel\.current=displayIndex\+1;heroCarousel\.jump\(false\)/);
assert.match(rc6, /sessionStorage\.removeItem\(RC6_NOTION_HERO_RETURN\)/);

const saveContext = {
  URL,
  Date,
  location: {href: 'https://preview.daedongmap.com/'},
  sessionStorage: {
    values: new Map(),
    setItem(key, value) { this.values.set(key, value); },
    getItem(key) { return this.values.get(key) || null; }
  },
  RC6_NOTION_HERO_RETURN: 'daedongNotionHeroReturnV1'
};
vm.createContext(saveContext);
vm.runInContext(`${functionSource(rc6, 'rc6RememberNotionHeroReturn')};this.remember=rc6RememberNotionHeroReturn`, saveContext);

for (const key of ['18', '19', '20']) {
  const target = targets[key];
  const image = {
    getAttribute(name) {
      if (name === 'src') return target.image;
      if (name === 'alt') return `${target.label} 노션에서 자세히 보기`;
      return '';
    },
    currentSrc: ''
  };
  saveContext.remember({
    dataset: {rc6BannerNotion: target.notionUrl, heroIndex: key},
    querySelector: () => image
  });
  const saved = JSON.parse(saveContext.sessionStorage.getItem('daedongNotionHeroReturnV1'));
  assert.equal(saved.image, target.image, `${target.label} 광고 이미지를 복귀용으로 저장해야 합니다.`);
  assert.ok(saved.notionUrl.startsWith('https:'), `${target.label} 노션 주소는 HTTPS여야 합니다.`);
  assert.ok(saved.image.length <= 500000, `${target.label} 복귀 이미지는 세션 저장 한도 안이어야 합니다.`);
}

class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.className = '';
    this.hidden = false;
    this.style = {};
    this.listeners = {};
    this.classList = {
      remove: (...names) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        names.forEach(name => classes.delete(name));
        this.className = [...classes].join(' ');
      }
    };
  }
  set type(value) { this.attributes.type = value; }
  set src(value) { this.attributes.src = value; }
  get src() { return this.attributes.src; }
  set alt(value) { this.attributes.alt = value; }
  set width(value) { this.attributes.width = value; }
  set height(value) { this.attributes.height = value; }
  set decoding(value) { this.attributes.decoding = value; }
  set loading(value) { this.attributes.loading = value; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  append(node) { this.children.push(node); }
  replaceChildren(...nodes) { this.children = [...nodes]; }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  querySelector(selector) {
    if (selector === '[data-rc6-notion-return-snapshot]') {
      return this.children.find(child => child.dataset?.rc6NotionReturnSnapshot) || null;
    }
    return null;
  }
}

const bootScript = html.match(/<script id="notionHeroReturnSnapshotBoot">([\s\S]*?)<\/script>/)?.[1];
assert.ok(bootScript, '초기 HTML에 노션 광고 즉시 복원 부트 코드가 있어야 합니다.');
new vm.Script(bootScript, {filename: 'notionHeroReturnSnapshotBoot'});

const hero = new MockElement('section');
const track = new MockElement('div');
const dots = new MockElement('div');
const bootStorage = new Map();
const target = targets['18'];
bootStorage.set('daedongNotionHeroReturnV1', JSON.stringify({
  notionUrl: target.notionUrl,
  image: target.image,
  alt: `${target.label} 노션에서 자세히 보기`,
  displayIndex: 6,
  savedAt: Date.now()
}));
const bootContext = {
  URL,
  Date,
  location: {href: 'https://preview.daedongmap.com/', origin: 'https://preview.daedongmap.com', assign() {}},
  sessionStorage: {
    getItem: key => bootStorage.get(key) || null,
    setItem: (key, value) => bootStorage.set(key, value),
    removeItem: key => bootStorage.delete(key)
  },
  document: {
    querySelector: selector => selector === '.hero' ? hero : selector === '#heroCarousel .carousel-dots' ? dots : null,
    getElementById: id => id === 'heroTrack' ? track : null,
    createElement: tag => new MockElement(tag)
  },
  window: {addEventListener() {}}
};
vm.createContext(bootContext);
vm.runInContext(bootScript, bootContext);
assert.equal(hero.hidden, false, '네트워크 대기 전에 메인 슬라이드 영역을 보여야 합니다.');
assert.equal(track.children.length, 1, '보던 노션 광고 한 장을 즉시 표시해야 합니다.');
assert.equal(track.children[0].dataset.rc6NotionReturnSnapshot, '1');
assert.equal(track.children[0].dataset.heroIndex, '6', '보던 슬라이드 순서를 보존해야 합니다.');
assert.equal(track.children[0].children[0].src, target.image, '보던 광고 이미지를 그대로 복원해야 합니다.');
assert.equal(dots.children[0].className, 'active');

assert.match(html, /app\.js\?v=[^"\n]*notion-hero-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*notion-hero-return-1/);
assert.match(finalExperience, /rc6-fixes\.js\?v=[^'\n]*notion-hero-return-1/);

console.log('notion-hero-return-regression-test: pass');
