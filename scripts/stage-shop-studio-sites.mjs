// Mechanical build staging only. Does not publish, migrate data, or change
// existing backend files. Integration in worker/index.ts remains reviewable.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),target=process.argv[2];
if(!target||!path.isAbsolute(target))throw Error('Pass the absolute Sites backend checkout path.');
const manifest=JSON.parse(fs.readFileSync(path.join(target,'.openai/hosting.json'),'utf8'));
if(manifest.project_id!=='appgprj_6a645d3ba1f88191aaf9bfee13f7dfb6')throw Error('Wrong Sites project. No files copied.');
const pairs=[['server/store-studio.mjs','worker/shop-studio.mjs']];
for(const directory of ['store-studio','store-alley','store-partner','online-store','store-manager','assets/studio-bakery','assets/studio-alley'])for(const name of fs.readdirSync(path.join(repo,directory))){const relative=directory+'/'+name;if(fs.statSync(path.join(repo,relative)).isFile())pairs.push([relative,'public/'+relative]);}
for(const file of ['assets/app-icons/daedong-app-icon-192.png'])pairs.push([file,'public/'+file]);
for(const file of ['store-context.js','live-commerce-engine.js'])pairs.push([file,'public/'+file]);
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const inventoryPath=path.join(target,'.sites-runtime/studio-stage-manifest.json');
const previous=fs.existsSync(inventoryPath)?JSON.parse(fs.readFileSync(inventoryPath,'utf8')):{};
for(const [from,to] of pairs){const destination=path.join(target,to);if(fs.existsSync(destination)){const existing=hash(fs.readFileSync(destination));if(existing!==hash(fs.readFileSync(path.join(repo,from)))&&previous[to]!==existing)throw Error('Existing different file preserved: '+to);}}
const inventory={};
for(const [from,to] of pairs){const destination=path.join(target,to),source=path.join(repo,from);fs.mkdirSync(path.dirname(destination),{recursive:true});if(!fs.existsSync(destination))fs.copyFileSync(source,destination,fs.constants.COPYFILE_EXCL);else if(hash(fs.readFileSync(destination))!==hash(fs.readFileSync(source)))fs.copyFileSync(source,destination);inventory[to]=hash(fs.readFileSync(destination));}
fs.mkdirSync(path.dirname(inventoryPath),{recursive:true});fs.writeFileSync(inventoryPath,JSON.stringify(inventory));
console.log('Staged '+pairs.length+' reviewed files. No deployment or runtime data writes.');
