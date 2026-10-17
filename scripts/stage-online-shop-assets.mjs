// Generated mirror of reviewed frontend assets. No source Git metadata, secrets or runtime data.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),target=path.resolve(process.argv[2]||'');
if(!process.argv[2]||target===source||JSON.parse(fs.readFileSync(path.join(target,'.openai/hosting.json'),'utf8')).project_id!=='appgprj_6a645d3ba1f88191aaf9bfee13f7dfb6')throw Error('An explicit verified admin Site checkout is required.');
const files=['online-shop.js','delivery-cost-sharing.js','data-api.js','store-context.js','customer-submission.js','live-commerce-engine.js','store-studio/product-handoff.js','store-studio/product-photos.js','data/haeinine-yeoseo-menu.json','data/wehalmae-yeoseo-menu.json','data/tamnaneun-pizza-menu.json'];
for(const dir of ['store-partner','online-store','shop-owners','data/reviewed-menu-photo-links'])for(const file of fs.readdirSync(path.join(source,dir))){if(/\.(?:html|js|css|json|csv)$/.test(file)&&fs.statSync(path.join(source,dir,file)).isFile())files.push(dir+'/'+file);}
for(const file of files){if(!fs.existsSync(path.join(source,file)))throw Error('Missing reviewed asset: '+file);}
if(process.argv.includes('--write'))for(const file of files){const dest=path.join(target,'public',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(source,file),dest);}
console.log(`${process.argv.includes('--write')?'Staged':'Dry run'} ${files.length} explicit public assets; no operating records or credentials copied.`);
