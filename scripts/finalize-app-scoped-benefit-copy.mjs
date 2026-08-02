import fs from 'node:fs/promises';

const path = 'store-service-info.js';
let source = await fs.readFile(path, 'utf8');

const replacements = [
  [
    "    return [info?.sourceLabel, date ? `${date} 확인` : ''].filter(Boolean).join(' · ');",
    "    return [info?.sourceLabel, '표시된 주문앱 기준', date ? `${date} 확인` : ''].filter(Boolean).join(' · ');"
  ],
  ["<b>영업·혜택 한눈에</b>", "<b>주문앱별 혜택 한눈에</b>"],
  ["'<b class=\"is-unknown\">결제·혜택 미확인</b>'", "'<b class=\"is-unknown\">주문앱별 혜택 미확인</b>'"]
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) throw new Error(`target missing: ${before}`);
  source = source.replace(before, after);
}

await fs.writeFile(path, source);
console.log('final app-scoped benefit copy applied');
