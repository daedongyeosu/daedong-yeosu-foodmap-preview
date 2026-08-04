import {execFileSync} from 'node:child_process';
import fs from 'node:fs';

const tracked = execFileSync('git', ['ls-files', '-z'], {encoding: 'utf8'})
  .split('\0')
  .filter(Boolean);
const errors = [];
const forbiddenPaths = [
  /^data\/stores\.json$/,
  /^data\/store-menu-search-index(?:\.json|\/)/,
  /^data\/(?:store-services|ddangyo-store-enrichment)\.json$/,
  /^store-menu-content\/.*\.(?:js|json)$/,
  /(?:^|\/)ddangyo-menu-map\.js$/,
  /(?:^|\/)ddangyo-preview-runtime\.js$/
];

for (const file of tracked) {
  if (forbiddenPaths.some(pattern => pattern.test(file))) {
    errors.push(`비공개 원본 경로가 추적됨: ${file}`);
  }
}

const textFiles = tracked.filter(file => {
  try {
    const buffer = fs.readFileSync(file);
    return buffer.length <= 5_000_000 && !buffer.subarray(0, 8_192).includes(0);
  } catch {
    return false;
  }
});
const credentialPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[opusr]_[A-Za-z0-9_]{30,}\b/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}\b/,
  /\b(?:password|admin_password|private_token)\s*[:=]\s*["'][^"']{8,}["']/i
];

for (const file of textFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of credentialPatterns) {
    if (pattern.test(source)) errors.push(`자격 증명 의심 문자열 발견: ${file}`);
  }
}

if (errors.length) {
  errors.forEach(error => console.error(`FAIL ${error}`));
  process.exit(1);
}

console.log(`PASS 공개 저장소 감사 (${tracked.length}개 추적 파일, 금지 원본·자격 증명 없음)`);
