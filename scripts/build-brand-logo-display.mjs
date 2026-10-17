// Deterministic display derivative only; retain the approved original PNG and transparency.
import {createRequire} from 'node:module';
import path from 'node:path';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()+'/node_modules','brand-build.cjs'));
const sharp=require('sharp'),source='assets/brand/yeosu-taste-map-logo.png',target='assets/brand/yeosu-taste-map-logo.display.webp';
const info=await sharp(source).resize({width:960,withoutEnlargement:true}).webp({lossless:true,effort:6}).toFile(target);
const expected=await sharp(source).resize({width:960,withoutEnlargement:true}).ensureAlpha().raw().toBuffer(),actual=await sharp(target).ensureAlpha().raw().toBuffer();
// WebP discards invisible RGB values at alpha zero; compare all visible RGB and all alpha exactly.
for(let i=0;i<expected.length;i+=4)if(expected[i+3]===0&&actual[i+3]===0)for(let j=0;j<3;j++)expected[i+j]=actual[i+j]=0;
if(!actual.equals(expected)||info.size>200*1024)throw Error('Display derivative differs from the resized original or exceeds its transfer budget');
console.log(JSON.stringify({source,target,width:info.width,height:info.height,bytes:info.size,losslessResizedPixels:true}));
