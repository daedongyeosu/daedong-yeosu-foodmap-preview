import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('region-config.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const functionSource = source.match(/function regionWithWaGwa\(name\) \{[\s\S]*?\n  \}/)?.[0];

assert.ok(functionSource, '지역명 받침에 맞춰 와/과를 선택하는 함수를 유지해야 합니다.');
const regionWithWaGwa = Function(`${functionSource}; return regionWithWaGwa;`)();
assert.equal(regionWithWaGwa('여수'), '여수와');
assert.equal(regionWithWaGwa('고흥'), '고흥과');
assert.match(source, /`\$\{regionWithWaGwa\(active\.shortName\)\} 함께하는 소식`/);
assert.doesNotMatch(source, /`\$\{active\.shortName\}과 함께하는 소식`/);
assert.match(html, /region-config\.js\?v=korean-particle-fix-1/);

console.log('region Korean particle regression: PASS');

