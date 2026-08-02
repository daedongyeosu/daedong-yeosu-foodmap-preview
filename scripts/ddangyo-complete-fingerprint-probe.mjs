import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';

const enrichment = JSON.parse(await fs.readFile('data/ddangyo-store-enrichment.json', 'utf8'));
const targets = enrichment.stores.slice(0, 5).map(row => ({
  storeId: row.targetStoreId,
  name: row.name,
  patstoNo: String(row.patstoNo),
  sourceUrl: row.ddangyoUrl
}));

const outDir = path.resolve('ddangyo-complete-fingerprint-probe-output');
await fs.rm(outDir, {recursive: true, force: true});
await fs.mkdir(outDir, {recursive: true});

const agent = new https.Agent({keepAlive: true, maxSockets: 4});
const userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';
const apiHeaders = {
  accept: 'application/json, text/plain, */*',
  'content-type': 'application/json;charset=UTF-8',
  origin: 'https://fdofd.ddangyo.com',
  authorization: '',
  'uuid-token': 'GTY0000000',
  'app-token': 'GTY0000000',
  'app-name': 'O2O',
  'app-os': 'WEB',
  'x-requested-with': 'XMLHttpRequest'
};

function request(requestPath, {method = 'GET', cookie = '', referer = '', body = '', headers = {}} = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'fdofd.ddangyo.com',
      port: 443,
      path: requestPath,
      method,
      agent,
      headers: {
        'user-agent': userAgent,
        'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5',
        ...(cookie ? {cookie} : {}),
        ...(referer ? {referer} : {}),
        ...headers
      },
      timeout: 30000
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${requestPath}`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const cookieHeader = values => (values || []).map(value => String(value).split(';', 1)[0]).join('; ');
const parse = text => {
  try { return JSON.parse(text); }
  catch (error) { return {parseError: String(error), raw: text}; }
};

async function postApi(api, payload, {cookie, referer}) {
  const body = JSON.stringify(payload);
  return request(api, {
    method: 'POST',
    cookie,
    referer,
    body,
    headers: {...apiHeaders, 'content-length': Buffer.byteLength(body)}
  });
}

const interestingPattern = /(biz|time|hour|open|close|rest|holiday|coupon|cpn|discount|dscnt|event|benefit|free|delivery|dlvy|fee|pay|payment|gift|onnuri|seom|support|oil|voucher|point|promo|reward|card|cash|금액|쿠폰|할인|무료|배달|결제|상품권|영업|휴무)/i;

function collectInteresting(value, currentPath = '$', output = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectInteresting(item, `${currentPath}[${index}]`, output));
    return output;
  }
  if (!value || typeof value !== 'object') return output;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if (interestingPattern.test(key)) {
      output.push({path: childPath, value: child});
    }
    collectInteresting(child, childPath, output);
  }
  return output;
}

const summary = [];
for (const [index, target] of targets.entries()) {
  try {
    const referer = target.sourceUrl;
    const landing = await request(new URL(referer).pathname + new URL(referer).search, {
      headers: {accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}
    });
    const cookie = cookieHeader(landing.headers['set-cookie']);
    const search = {
      login_mbr_id: '',
      patsto_no: target.patstoNo,
      admtn_dong_cd: '4613078000',
      map_latt: '34.7600000',
      map_lngt: '127.6600000',
      patsto_tab_div_cd: '01',
      exps_chan: '01',
      rest_patsto_yn: 'N'
    };

    const endpoints = [
      ['/shop/home', {dma_shop_search: search}],
      ['/shop/info', {dma_shop_search: search}],
      ['/shop/homemenu', {dma_shop_search: search}]
    ];

    const captured = {};
    for (const [endpoint, payload] of endpoints) {
      const response = await postApi(endpoint, payload, {cookie, referer});
      const value = parse(response.body);
      captured[endpoint] = {
        status: response.status,
        resultCode: value?.result_code || '',
        message: value?.message || '',
        interesting: collectInteresting(value),
        raw: value
      };
    }

    await fs.writeFile(
      path.join(outDir, `${target.patstoNo}.json`),
      JSON.stringify({...target, captured}, null, 2)
    );
    summary.push({
      ...target,
      endpoints: Object.fromEntries(Object.entries(captured).map(([endpoint, result]) => [endpoint, {
        status: result.status,
        resultCode: result.resultCode,
        interestingCount: result.interesting.length
      }]))
    });
    console.log(`${index + 1}/${targets.length} ${target.name} captured`);
  } catch (error) {
    summary.push({...target, error: String(error?.stack || error)});
    console.error(`${index + 1}/${targets.length} ${target.name} failed`, error);
  }
}

await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
