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
  origin: 'https://fdofd.ddangyo.com', authorization: '',
  'uuid-token': 'GTY0000000', 'app-token': 'GTY0000000', 'app-name': 'O2O', 'app-os': 'WEB',
  'x-requested-with': 'XMLHttpRequest'
};

function request(requestPath, {method = 'GET', cookie = '', referer = '', body = '', headers = {}} = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({hostname: 'fdofd.ddangyo.com', port: 443, path: requestPath, method, agent,
      headers: {'user-agent': userAgent, 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5', ...(cookie ? {cookie} : {}), ...(referer ? {referer} : {}), ...headers}, timeout: 30000}, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${requestPath}`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
const cookieHeader = values => (values || []).map(value => String(value).split(';', 1)[0]).join('; ');
const parse = text => { try { return JSON.parse(text); } catch (error) { return {parseError: String(error), raw: text}; } };
async function postApi(api, payload, {cookie, referer}) {
  const body = JSON.stringify(payload);
  return request(api, {method: 'POST', cookie, referer, body, headers: {...apiHeaders, 'content-length': Buffer.byteLength(body)}});
}

const summary = [];
for (const [index, target] of targets.entries()) {
  try {
    const referer = target.sourceUrl;
    const url = new URL(referer);
    const landing = await request(url.pathname + url.search, {headers: {accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
    const cookie = cookieHeader(landing.headers['set-cookie']);
    const common = {patsto_no: target.patstoNo, admtn_dong_cd: '4613078000', map_latt: '34.7600000', map_lngt: '127.6600000'};
    const homeSearch = {login_mbr_id: '', ...common, patsto_tab_div_cd: '01', exps_chan: '01', rest_patsto_yn: 'N'};
    const infoSearch = {...common, shop_detail_tp_cd: '01'};
    const couponSearch = {login_mbr_id: '', ...common, patsto_tab_div_cd: '01', exps_chan: '01', rest_patsto_yn: 'N'};
    const requests = [
      ['/shop/home', {dma_shop_search: homeSearch}],
      ['/shop/info', {dma_shop_info: infoSearch}],
      ['/coupon/possibleCouponList', {dma_coupon: couponSearch}],
      ['/shop/homemenu', {dma_shop_search: homeSearch}]
    ];
    const captured = {};
    for (const [endpoint, payload] of requests) {
      const response = await postApi(endpoint, payload, {cookie, referer});
      const value = parse(response.body);
      captured[endpoint] = {status: response.status, resultCode: value?.result_code || '', message: value?.message || '', raw: value};
    }
    const homeResult = captured['/shop/home'].raw?.result || {};
    const infoResult = captured['/shop/info'].raw?.result || {};
    const couponResult = captured['/coupon/possibleCouponList'].raw?.result || {};
    const compact = {
      ...target,
      home: {
        resultCode: captured['/shop/home'].resultCode,
        info: homeResult.dma_shop_home_info || {},
        delivery: homeResult.dma_shop_home_vd_od_info || {},
        businessToday: homeResult.dlt_biz_time_info || null,
        timeSale: homeResult.time_sale_info || null
      },
      info: {
        resultCode: captured['/shop/info'].resultCode,
        store: infoResult.shop_coo_info || {},
        weeklyHours: infoResult.biz_time_info || [],
        closedRules: infoResult.shop_clsd_list || [],
        temporaryClosures: infoResult.shop_tmp_clsd_list || [],
        zeroDelivery: infoResult.zero_patsto_info || {},
        deliveryPrices: infoResult.delv_prc_info || [],
        ddangDeliveryPrices: infoResult.ddang_delv_list || []
      },
      coupons: {
        resultCode: captured['/coupon/possibleCouponList'].resultCode,
        storeCoupons: couponResult.dlt_couponList || couponResult.couponList || [],
        brandCoupons: couponResult.dlt_brandCouponList || couponResult.brandCouponList || []
      },
      raw: captured
    };
    await fs.writeFile(path.join(outDir, `${target.patstoNo}.json`), JSON.stringify(compact, null, 2));
    summary.push({
      storeId: target.storeId, name: target.name, patstoNo: target.patstoNo,
      codes: Object.fromEntries(Object.entries(captured).map(([key, value]) => [key, value.resultCode])),
      weeklyHours: compact.info.weeklyHours.length,
      closedRules: compact.info.closedRules.length,
      temporaryClosures: compact.info.temporaryClosures.length,
      storeCoupons: compact.coupons.storeCoupons.length,
      brandCoupons: compact.coupons.brandCoupons.length,
      phone: compact.info.store.conadr || compact.info.store.rpsnt_tel_no || '',
      seomseom: Boolean(compact.home.info.lgv_lbl || compact.home.info.lgv_lbl2),
      oilSupport: Boolean(compact.home.info.lgv_lbl_sup),
      onnuri: compact.home.info.onnuri_yn === '1',
      zeroDelivery: compact.home.delivery.zero_patsto_yn === '1' || compact.info.zeroDelivery.zero_patsto_yn === '1'
    });
    console.log(`${index + 1}/${targets.length} ${target.name} info=${summary.at(-1).codes['/shop/info']} hours=${summary.at(-1).weeklyHours} coupons=${summary.at(-1).storeCoupons + summary.at(-1).brandCoupons}`);
  } catch (error) {
    summary.push({...target, error: String(error?.stack || error)});
    console.error(`${index + 1}/${targets.length} ${target.name} failed`, error);
  }
}
await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
