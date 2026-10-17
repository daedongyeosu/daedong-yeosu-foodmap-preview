// Local-only merchant/cart walkthrough. Uses the real catalog handler with an in-memory DB.
// No real addresses, delivery routing, payment or hosted writes are allowed.
// --test-intake opts into in-memory store orders and a synthetic errand receipt only.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const source=process.env.STORE_PREVIEW_SOURCE;
if(!source)throw Error('STORE_PREVIEW_SOURCE must point to the backend checkout.');
const realWorker=process.env.STORE_PREVIEW_WORKER_BUNDLE?(await import(pathToFileURL(process.env.STORE_PREVIEW_WORKER_BUNDLE).href)).default:null;
const handleStorePreviewOrders=realWorker?null:(await import(pathToFileURL(path.join(source,'worker/store-preview-orders.ts')).href)).handleStorePreviewOrders;
class LocalD1{
  database=new DatabaseSync(':memory:');
  constructor(){this.database.exec('PRAGMA foreign_keys=ON');for(const file of (realWorker?fs.readdirSync(path.join(source,'drizzle')).filter(file=>file.endsWith('.sql')).sort():['0009_numerous_donald_blake.sql','0011_chubby_spitfire.sql']))this.database.exec(fs.readFileSync(path.join(source,'drizzle',file),'utf8'));}
  prepare(sql){let values=[];const s={bind:(...args)=>{values=args;return s;},run:()=>({success:true,meta:{changes:Number(this.database.prepare(sql).run(...values).changes)}}),first:async()=>this.database.prepare(sql).get(...values)||null,all:async()=>({results:this.database.prepare(sql).all(...values)})};return s;}
  tail=Promise.resolve();
  batch(statements){const next=this.tail.then(()=>{this.database.exec('BEGIN');try{const results=[];for(const s of statements)results.push(s.run());this.database.exec('COMMIT');return results;}catch(e){this.database.exec('ROLLBACK');throw e;}});this.tail=next.catch(()=>{});return next;}
}
const env={DB:new LocalD1(),RATE_LIMIT_SALT:'isolated-local-qa-only-no-live-secret'},root=process.cwd(),port=Number(process.argv[2]||4196),origin=`http://127.0.0.1:${port}`;
const testIntake=process.argv.includes('--test-intake'),testShops=process.argv.includes('--test-shops'),errandReceipts=new Map();
if(testShops&&!realWorker)throw Error('--test-shops requires the compiled real worker.');
if(testShops)env.ADMIN_EMAILS='qa-admin@local.invalid';
env.PUBLIC_ALLOWED_ORIGINS=origin;env.ASSETS={fetch:async()=>new Response('not found',{status:404})};
const address={address:'전라남도 여수시 테스트로 10',roadAddress:'전라남도 여수시 테스트로 10',jibunAddress:'전라남도 여수시 테스트동 10',zonecode:'59700',sido:'전라남도',sigungu:'여수시'};
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8'};
const csp="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'";
function send(res,status,body,type='application/json'){res.writeHead(status,{'content-type':type,'cache-control':'no-store','Content-Security-Policy':csp});res.end(body);}
const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,origin);
  if(req.headers.host!==`127.0.0.1:${port}`)return send(res,403,'{}');
  if(req.headers.origin&&req.headers.origin!==origin)return send(res,403,'{}');
  if(url.pathname==='/qa-postcode.js'&&req.method==='GET')return send(res,200,`window.daum={Postcode:class{constructor(options){this.options=options;}embed(frame){const button=document.createElement('button');button.textContent='테스트 주소 선택 (실제 주소검색 아님)';button.onclick=()=>this.options.oncomplete(${JSON.stringify(address)});frame.append(button);}}};`,'application/javascript');
  if(url.pathname.startsWith('/api/')){
    if(testShops&&url.pathname.startsWith('/api/online-shops/')){
      if(!/^\/api\/online-shops\/(public|manage)\/qa-existing-store(?:\/(grant|save|publish|unpublish))?$/.test(url.pathname))return send(res,403,'{}');
      const chunks=[];for await(const chunk of req)chunks.push(chunk);const body=Buffer.concat(chunks);
      if(body.length>2*1024*1024)return send(res,413,'{}');
      const role=String(req.headers.cookie||'').match(/qa-shop-role=(owner|admin|intruder)(?:;|$)/)?.[1];
      // Loopback-only explicit QA mode supplies identity; incoming auth headers are never trusted.
      const headers={origin,'content-type':'application/json'};
      if(role)headers['oai-authenticated-user-id']=role;
      if(role==='admin')headers['oai-authenticated-user-email']='qa-admin@local.invalid';
      const response=await realWorker.fetch(new Request(url,{method:req.method,headers,body:req.method==='GET'?undefined:body}),env,{waitUntil(){},passThroughOnException(){}});
      return send(res,response.status,await response.text());
    }
    if(req.method==='GET'&&url.pathname==='/api/qa-state')return send(res,200,JSON.stringify({testIntake,realWorker:Boolean(realWorker),errandReceipts:realWorker?env.DB.database.prepare('SELECT count(*) AS n FROM errand_orders').get().n:errandReceipts.size,products:env.DB.database.prepare('SELECT store_id,item_id,item_name,base_price_won,stock_remaining FROM store_preview_catalog WHERE enabled=1').all(),orders:env.DB.database.prepare('SELECT count(*) AS count FROM store_preview_orders').get().count,receipts:realWorker?env.DB.database.prepare('SELECT count(*) AS n FROM customer_submit_requests').get().n:0}));
    const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>1024*1024)return send(res,413,'{}');chunks.push(chunk);}const body=Buffer.concat(chunks).toString();
    if(url.pathname==='/api/store-delivery-quote'&&req.method==='POST')return send(res,200,JSON.stringify({available:true,quoteId:'local-qa-not-road-routing',deliveryFee:3500,platformFee:800,roadDistanceMeters:2100,policyVersion:'local-qa-only',expiresAt:new Date(Date.now()+60000).toISOString()}));
    if(testIntake&&!realWorker&&url.pathname==='/api/errand/orders'&&req.method==='POST'){
      const data=JSON.parse(body);
      if(data.previewOnly!==true||data.customer?.phone?.replace(/\D/g,'')!=='01012345678'||![data.pickup?.address,data.dropoff?.address].every(value=>String(value).includes('테스트')))return send(res,403,JSON.stringify({error:'합성 시험용 연락처·주소만 허용합니다.'}));
      const order={id:`YS-PREVIEW-QA-${errandReceipts.size+1}`,status:'INTAKE_RECEIVED',createdAt:new Date().toISOString(),expiresAt:Math.floor(Date.now()/1000)+86400,pickupAddress:[data.pickup.address,data.pickup.detail].filter(Boolean).join(' · '),dropoffAddress:[data.dropoff.address,data.dropoff.detail].filter(Boolean).join(' · '),itemName:data.item.name,customerPhone:'010-****-5678',description:data.description};
      errandReceipts.set(order.id,order);
      await new Promise(resolve=>setTimeout(resolve,1500)); // Deterministic slow-save UI scenario, not a live service.
      return send(res,201,JSON.stringify({order,trackingToken:'local-synthetic-receipt-only'}));
    }
    if(testIntake&&!realWorker&&url.pathname.startsWith('/api/errand/orders/')&&req.method==='GET'){
      const order=errandReceipts.get(decodeURIComponent(url.pathname.split('/').at(-1)));
      return send(res,order&&req.headers['x-matjido-order-token']==='local-synthetic-receipt-only'?200:404,JSON.stringify(order?{order}:{error:'시험 접수 없음'}));
    }
    const testStoreOrder=testIntake&&((url.pathname==='/api/store-orders/preview'&&['GET','POST'].includes(req.method))||(url.pathname.startsWith('/api/store-orders/preview/')&&req.method==='GET'&&!url.pathname.endsWith('/catalog')));
    const testErrand=testIntake&&realWorker&&(url.pathname==='/api/errand/orders'&&req.method==='POST'||url.pathname.startsWith('/api/errand/orders/')&&req.method==='GET');
    if(testErrand&&req.method==='POST'){const data=JSON.parse(body);if(data.previewOnly!==true||data.customer?.phone?.replace(/\D/g,'')!=='01012345678'||![data.pickup?.address,data.dropoff?.address].every(value=>String(value).includes('테스트')))return send(res,403,'{}');}
    if(!((url.pathname==='/api/store-orders/preview/catalog'&&['GET','PUT'].includes(req.method))||(url.pathname==='/api/store-orders/preview/quote'&&req.method==='POST')||testStoreOrder||testErrand))return send(res,403,JSON.stringify({message:'로컬 장바구니 시험에서는 주문·결제를 생성하지 않습니다.'}));
    const request=new Request(url,{method:req.method,headers:{...req.headers,origin},body:req.method==='GET'?undefined:body});
    const response=realWorker?await realWorker.fetch(request,env,{waitUntil(){},passThroughOnException(){}}):await handleStorePreviewOrders(request,env,{allowedOrigins:new Set([origin])});
    return send(res,response?.status||404,response?await response.text():'{}');
  }
  if(req.method!=='GET')return send(res,405,'{}');
  const relative=decodeURIComponent(url.pathname).replace(/^\/+/,''),file=path.resolve(root,relative||'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return send(res,404,'{}');
  const extension=path.extname(file);let body=fs.readFileSync(file);
  if(['.html','.js'].includes(extension))body=body.toString().replaceAll('https://daedong-yeosu-admin.sisakim.chatgpt.site',origin).replaceAll('https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js',origin+'/qa-postcode.js');
  if(extension==='.html')body=body.replace('<body>','<body><p style="margin:0;padding:10px;background:#fff1c6;color:#553c10;font-weight:bold">격리된 로컬 시험 · 주소/배송비는 모의값 · 실제 주문/결제 불가</p>');
  send(res,200,body,types[extension]||'application/octet-stream');
}catch(error){console.error(error.message);send(res,500,JSON.stringify({message:'로컬 시험 오류'}));}});
server.listen(port,'127.0.0.1',()=>console.log('Isolated merchant/cart QA: '+origin+'/store-partner/index.html'));
process.on('SIGINT',()=>server.close(()=>{env.DB.database.close();process.exit();}));
