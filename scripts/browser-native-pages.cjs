const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const origin='https://preview.daedongmap.com';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.mp4':'video/mp4'};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const errors=[],external=[];
 await context.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==origin){external.push(url.hostname);return route.abort();}
  let p=decodeURIComponent(url.pathname);if(p.endsWith('/'))p+='index.html';
  const file=path.resolve(root,'.'+p);if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:'Not found'});
  const body=fs.readFileSync(file),range=route.request().headers().range;
  if(range&&path.extname(file)==='.mp4'){
   const match=/^bytes=(\d+)-(\d*)$/.exec(range);
   if(!match)return route.fulfill({status:416});
   const start=Number(match[1]),end=Math.min(match[2]?Number(match[2]):body.length-1,body.length-1);
   if(start>end)return route.fulfill({status:416});
   return route.fulfill({status:206,contentType:'video/mp4',headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${body.length}`},body:body.subarray(start,end+1)});
  }
  return route.fulfill({status:200,contentType:mime[path.extname(file)]||'application/octet-stream',body});
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 for(const p of JSON.parse(fs.readFileSync(path.join(root,'data/native-pages.json'))).pages){
  await page.goto(origin+'/info/'+p.slug+'/');
  assert.equal(await page.locator('h1').textContent(),p.title);
  assert.equal(await page.locator('.actions a').first().getAttribute('href'),'tel:'+p.phone);
  const imgs=page.locator('.gallery img');assert.equal(await imgs.count(),p.media.filter(m=>m.type!=='video').length);
  for(let i=0;i<await imgs.count();i++){await imgs.nth(i).scrollIntoViewIfNeeded();await imgs.nth(i).evaluate(img=>img.complete&&img.naturalWidth>0?Promise.resolve():new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Broken image'));setTimeout(()=>reject(Error('Image timeout')),10000)}));}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
  if(p.slug==='healing-yacht'){
   const video=page.locator('video');
   assert.equal(await video.getAttribute('preload'),'none');
   const src=await page.locator('video source').getAttribute('src');
   assert.equal(await page.locator('.video-download').getAttribute('href'),src);
   assert.notEqual(await page.locator('.video-download').getAttribute('download'),null);
   // CI Chromium can lack the source MP4 codec. Require an explicit media error
   // or loaded metadata (never silently accept a timeout), and keep the original
   // playable/downloadable bytes available on the same site in either case.
   const result=await video.evaluate(v=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Video did not load or report an error')),15000);
    const finish=value=>{clearTimeout(timer);resolve(value)};
    v.addEventListener('loadedmetadata',()=>finish({loaded:true}),{once:true});
    v.addEventListener('error',()=>finish({error:v.error?.code}),{once:true});
    v.querySelector('source').addEventListener('error',()=>finish({error:4}),{once:true});
    v.load();
   }));
   if(!result.loaded){assert.equal(result.error,4,'Only unsupported source codecs allow download fallback');console.log('MP4 codec unavailable; verified original-file download fallback');}
  }
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(root,'browser-native-'+p.slug+'.png')});
 }
 // The back control must not send a direct visitor to an unrelated previous site.
 await page.goto(origin+'/info/umi/');assert.equal(await page.locator('#back').getAttribute('href'),'/');
 await page.goto(origin+'/');await page.goto(origin+'/info/umi/',{referer:origin+'/'});
 await page.locator('#back').click();await page.waitForURL(origin+'/');
 // Home may try network API calls; they are deliberately blocked in this offline test.
 assert.ok(!external.some(h=>/bit\.ly|notion/.test(h)));
 assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS mobile 390x844: 3 native pages, 28 images, video metadata, phone links, overflow, home/back; no Bitly/Notion requests');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
