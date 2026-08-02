import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoDirs = process.argv.slice(2);
if (!repoDirs.length) throw new Error('repository directories required');

const urlPattern = /https:\/\/fdofd\.ddangyo\.com\/gateway1\.html\?([A-Za-z0-9]+)/g;
const tokenPattern = /fdofd\.ddangyo\.com\/gateway1\.html\?([A-Za-z0-9]+)/g;
const tokens = new Set();
const evidence = [];

function collect(text, source) {
  for (const pattern of [urlPattern, tokenPattern]) {
    pattern.lastIndex = 0;
    for (const match of String(text || '').matchAll(pattern)) {
      const token = match[1];
      if (!token) continue;
      tokens.add(token);
      evidence.push({token, source});
    }
  }
}

for (const repoDir of repoDirs) {
  const absolute = path.resolve(repoDir);
  const commits = execFileSync('git', ['-C', absolute, 'rev-list', '--all'], {encoding: 'utf8', maxBuffer: 1024 * 1024 * 100})
    .trim().split(/\s+/).filter(Boolean);
  for (const commit of commits) {
    let output = '';
    try {
      output = execFileSync('git', ['-C', absolute, 'grep', '-I', '-h', '-o', '-E', 'https://fdofd\\.ddangyo\\.com/gateway1\\.html\\?[A-Za-z0-9]+', commit, '--'], {
        encoding: 'utf8',
        maxBuffer: 1024 * 1024 * 100,
        stdio: ['ignore', 'pipe', 'ignore']
      });
    } catch (error) {
      output = error?.stdout || '';
    }
    collect(output, `${path.basename(absolute)}@${commit}`);
  }
}

const currentConversationTokens = `8rrtFnv oZrHJMN LZJOYiQ h3rPiwO 7qEHjBv agaDVy9 n8fubo6 W3C2xOs KXMaAWm s64ZuPD 5v5g0Sx 40ACKvK AkdMHga J1z92gs LGe0H32 Why0WW1 s3saAXs XTVAJ3q gOaJqWQ 1grBeHv 5z5oUHy C5v1Sz5 CRqRegz Dg0bqrG n8F0Vm2 d4AymKz TQXhH05 bMUAAyS 2uVT3uw m6K22Qq VQ4zuwg eRKUQXj C7u3wNg 1iMTpT9 MFgCs9y DLnSWu2 chdPUvz ktXdR4d LShgUuJ KVGcLcX kUUZmfn Z9BzWOD OH8fFct neqPkqv Sb9qXy6 h3e2OiA RjTqfSx 3ymeMR3 oOKK91R czycr95 BC2YUSz 6Dy6MpV zyC7mcw nf2nuG5 bD5tpYT CJ7Lfgw JmfKHwo 00RUe3y i0fxfXs szNA6iZ fNFjCFg fG2C2oa x9nuAxX O103ro4 vYrFYv3 wOxD8Lf DoRPe5P 6G9uvGV CbMsswm CvS9WdS uQ3cazC P8J3tN8 bGje9zQ QktNckc 9RD9885 BQEZsix be2Z2Z8 7Mram6G cheVei2 n5AXW9n 24Ffc62`.trim().split(/\s+/);
for (const token of currentConversationTokens) {
  tokens.add(token);
  evidence.push({token, source: 'current-conversation-2026-08-02'});
}

const byToken = new Map();
for (const row of evidence) {
  if (!byToken.has(row.token)) byToken.set(row.token, new Set());
  byToken.get(row.token).add(row.source);
}

const output = {
  generatedAt: new Date().toISOString(),
  tokenCount: tokens.size,
  links: [...tokens].sort().map(token => ({
    token,
    url: `https://fdofd.ddangyo.com/gateway1.html?${token}`,
    sources: [...(byToken.get(token) || [])].slice(0, 20)
  }))
};

await fs.mkdir('ddangyo-historical-links-output', {recursive: true});
await fs.writeFile('ddangyo-historical-links-output/all-historical-ddangyo-links.json', JSON.stringify(output, null, 2));
await fs.writeFile('ddangyo-historical-links-output/all-historical-ddangyo-links.txt', output.links.map(row => row.url).join('\n') + '\n');
console.log(JSON.stringify({tokenCount: output.tokenCount, repositories: repoDirs}, null, 2));
