// Deterministic static publishing. No Notion/Bitly API or recurring AI work.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pages=JSON.parse(fs.readFileSync(path.join(root,'data/native-pages.json'),'utf8')).pages;
const base=process.argv[2];
const folders={umi:'오마카세 우미 홍보사진','healing-yacht':'김동식사장님 힐링요트 광고','small-business':'소상공인연합회 여수가게홍보'};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const manifestPath=path.join(root,'data/native-page-assets.json');
const manifest=fs.existsSync(manifestPath)?JSON.parse(fs.readFileSync(manifestPath,'utf8')):{};
const seen=new Set();
for(const page of pages){
 if(!/^[a-z0-9-]+$/.test(page.slug)||seen.has(page.slug))throw Error('Invalid/duplicate page slug');seen.add(page.slug);
 if(!/^\d[\d-]+$/.test(page.phone))throw Error('Invalid phone');
 if(page.mapUrl&&new URL(page.mapUrl).origin!=='https://naver.me')throw Error('Unapproved map URL');
 for(const media of page.media){
  if(path.basename(media.file)!==media.file)throw Error('Invalid asset name');
  const key=page.slug+'/'+media.file;
  if(base){
   const bytes=fs.readFileSync(path.join(base,folders[page.slug],media.file));
   const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
   const target='assets/native-pages/'+sha256+path.extname(media.file).toLowerCase();
   fs.mkdirSync(path.join(root,'assets/native-pages'),{recursive:true});
   if(!fs.existsSync(path.join(root,target)))fs.writeFileSync(path.join(root,target),bytes);
   manifest[key]={path:target,sha256,bytes:bytes.length};
  }
  const asset=manifest[key];if(!asset||!/^assets\/native-pages\/[a-f0-9]{64}\.(jpg|jpeg|png|mp4)$/.test(asset.path))throw Error('Missing asset: '+key);
  const bytes=fs.readFileSync(path.join(root,asset.path));
  if(crypto.createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Asset checksum mismatch: '+key);
 }
 const gallery=page.media.map((m,i)=>{const src='/'+manifest[page.slug+'/'+m.file].path;return m.type==='video'?`<video controls playsinline preload="none" aria-label="${esc(page.title)} 영상"><source src="${src}" type="video/mp4">영상을 재생할 수 없습니다.</video><a class="video-download" href="${src}" download>영상 파일 내려받기</a>`:`<a href="${src}" aria-label="${esc(page.title)} 사진 ${i+1} 크게 보기"><img src="${src}" alt="${esc(page.title)} 사진 ${i+1}" loading="lazy" decoding="async"></a>`;}).join('\n');
 const sections=page.sections.map(s=>`<section><h2>${esc(s.heading)}</h2>${s.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('\n');
 const html=`<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(page.title)} | 대동여수음식지도</title><meta name="description" content="${esc(page.sections[0].paragraphs[0])}"><link rel="stylesheet" href="../page.css?v=1"><script src="../page.js?v=1" defer></script></head>
<body><header><a href="/" id="back">← 음식지도로</a><span>대동여수음식지도</span></header><main><h1>${esc(page.title)}</h1>${sections}<section><h2>사진과 영상</h2><div class="gallery">${gallery}</div></section></main><nav class="actions" aria-label="문의 및 위치"><a href="tel:${esc(page.phone)}">전화 문의 ${esc(page.phone)}</a>${page.mapUrl?`<a href="${esc(page.mapUrl)}" rel="noopener">네이버지도</a>`:''}</nav></body></html>\n`;
 fs.mkdirSync(path.join(root,'info',page.slug),{recursive:true});
 fs.writeFileSync(path.join(root,'info',page.slug,'index.html'),html);
}
fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
console.log(`Built ${pages.length} native pages; ${Object.keys(manifest).length} assets verified (no network).`);
