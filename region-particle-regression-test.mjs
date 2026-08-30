import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('region-config.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const functionSource = source.match(/function regionWithWaGwa\(name\) \{[\s\S]*?\n  \}/)?.[0];
const objectFunctionSource = source.match(/function regionWithEulReul\(name\) \{[\s\S]*?\n  \}/)?.[0];

assert.ok(functionSource, '지역명 받침에 맞춰 와/과를 선택하는 함수를 유지해야 합니다.');
const regionWithWaGwa = Function(`${functionSource}; return regionWithWaGwa;`)();
assert.equal(regionWithWaGwa('여수'), '여수와');
assert.equal(regionWithWaGwa('고흥'), '고흥과');
assert.ok(objectFunctionSource, '지역명 받침에 맞춰 을/를을 선택하는 함수를 유지해야 합니다.');
const regionWithEulReul = Function(`${objectFunctionSource}; return regionWithEulReul;`)();
assert.equal(regionWithEulReul('여수'), '여수를');
assert.equal(regionWithEulReul('고흥'), '고흥을');
assert.match(source, /`\$\{regionWithWaGwa\(active\.shortName\)\} 함께하는 소식`/);
assert.doesNotMatch(source, /`\$\{active\.shortName\}과 함께하는 소식`/);
assert.match(source, /`\$\{regionWithEulReul\(active\.shortName\)\} 한 번 더 생각해 주세요\.`/);
assert.doesNotMatch(source, /`\$\{active\.shortName\}을 한 번 더 생각해 주세요\.`/);
assert.match(html, /region-config\.js\?v=korean-particle-fix-2/);

console.log('region Korean particle regression: PASS');

