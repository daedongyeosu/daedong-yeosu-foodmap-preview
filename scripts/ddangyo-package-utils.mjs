import fs from 'node:fs/promises';

export const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_NAMES = {일: 'sun', 월: 'mon', 화: 'tue', 수: 'wed', 목: 'thu', 금: 'fri', 토: 'sat'};
const ORDINALS = {첫째: 1, 둘째: 2, 셋째: 3, 넷째: 4, 다섯째: 5};
export const APP_LABELS = {mukkebi: '먹깨비', ddangyo: '땡겨요', naver: '네이버지도'};

export const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
export const unique = values => [...new Set((values || []).map(clean).filter(Boolean))];
export const normalizeName = value => clean(value).normalize('NFKC').toLocaleLowerCase('ko-KR').replace(/[\s·&()\-_/.,'"\[\]]/g, '');
export const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date());
export const todayDigits = today.replaceAll('-', '');

export async function readJsonIfExists(file, fallback = null) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return fallback; }
}

function parseClock(value) {
  const text = clean(value);
  const match = text.match(/(오전|오후|낮|밤)\s*(\d{1,2}):(\d{2})/);
  if (!match) return '';
  let hour = Number(match[2]);
  const minute = Number(match[3]);
  if (match[1] === '오전') hour = hour === 12 ? 0 : hour;
  else if (match[1] === '오후') hour = hour === 12 ? 12 : hour + 12;
  else if (match[1] === '낮') hour = hour === 12 ? 12 : hour;
  else if (match[1] === '밤') hour = hour === 12 ? 0 : hour + 12;
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseRange(value) {
  const raw = clean(value);
  if (/24시간/.test(raw)) return {open: '00:00', close: '00:00'};
  const parts = raw.split(/\s*~\s*/);
  if (parts.length !== 2) return null;
  const open = parseClock(parts[0]);
  const close = parseClock(parts[1]);
  return open && close ? {open, close} : null;
}

function dayKeys(label) {
  const raw = clean(label).replace(/^브레이크\s*타임\s*/, '');
  if (raw === '매일') return DAYS;
  if (raw === '평일') return ['mon', 'tue', 'wed', 'thu', 'fri'];
  if (raw === '주말') return ['sat', 'sun'];
  const result = [];
  for (const [ko, key] of Object.entries(DAY_NAMES)) {
    if (new RegExp(`${ko}(?:요일)?`).test(raw)) result.push(key);
  }
  return [...new Set(result)];
}

export function parseDdangyoHours(row) {
  const weekly = Object.fromEntries(DAYS.map(day => [day, []]));
  const displayLines = [];
  const breakLines = [];
  for (const item of row?.hours?.weeklyRaw || []) {
    const dayLabel = clean(item?.dow_div_nm || item?.biz_day_nm);
    const timeLabel = clean(item?.biz_tm_nm || item?.biz_time);
    if (!dayLabel || !timeLabel) continue;
    const line = `${dayLabel} ${timeLabel}`;
    if (/브레이크\s*타임/.test(dayLabel)) {
      breakLines.push(line);
      continue;
    }
    const range = parseRange(timeLabel);
    if (!range) continue;
    for (const day of dayKeys(dayLabel)) weekly[day].push(range);
    displayLines.push(line);
  }
  for (const day of DAYS) {
    const seen = new Set();
    weekly[day] = weekly[day].filter(period => {
      const key = `${period.open}-${period.close}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const closureTexts = unique([
    ...(row?.hours?.closedRulesRaw || []).map(item => item?.clsd_cont || item?.biz_clsd_day_gude_cont || item?.biz_clsd_day),
    row?.hours?.closedGuide
  ]).filter(value => value && !/연중무휴/.test(value));
  const closures = [];
  for (const closureText of closureTexts) {
    displayLines.push(`휴무 ${closureText}`);
    for (const match of closureText.matchAll(/매주\s*(월|화|수|목|금|토|일)요일/g)) weekly[DAY_NAMES[match[1]]] = [];
    for (const match of closureText.matchAll(/매월\s*(첫째|둘째|셋째|넷째|다섯째)\s*(월|화|수|목|금|토|일)요일/g)) {
      closures.push({type: 'monthly-weekday', weekday: DAY_NAMES[match[2]], nth: ORDINALS[match[1]], label: match[0]});
    }
  }
  return {weekly, closures, displayLines: unique([...displayLines, ...breakLines]), sourceApp: 'ddangyo'};
}

function closureKey(rule) {
  return `${rule?.type || ''}|${rule?.weekday || ''}|${rule?.nth || ''}|${rule?.label || ''}`;
}

export function mergeHours(existingHours, ddangyoHours) {
  if (!existingHours?.weekly) return ddangyoHours;
  const merged = structuredClone(existingHours);
  merged.weekly ||= {};
  for (const day of DAYS) {
    if (!Object.prototype.hasOwnProperty.call(merged.weekly, day)) merged.weekly[day] = ddangyoHours.weekly[day] || [];
  }
  const closures = new Map((merged.closures || []).map(rule => [closureKey(rule), rule]));
  for (const rule of ddangyoHours.closures || []) if (!closures.has(closureKey(rule))) closures.set(closureKey(rule), rule);
  merged.closures = [...closures.values()];
  merged.displayLines = unique([...(merged.displayLines || []), ...(ddangyoHours.displayLines || [])]);
  merged.sourceApp ||= 'ddangyo';
  return merged;
}

export function appLabel(keys) {
  return unique(keys).map(key => APP_LABELS[key] || key).join('·');
}

export function upsertScoped(list, key, status, apps, extra = {}) {
  const target = Array.isArray(list) ? list : [];
  let entry = target.find(item => item?.key === key);
  if (!entry) {
    target.push({key, status, appKeys: unique(apps), appLabel: appLabel(apps), ...extra});
    return target;
  }
  entry.appKeys = unique([...(entry.appKeys || []), ...apps]);
  entry.appLabel = appLabel(entry.appKeys);
  if (!entry.status || entry.status === 'unknown') entry.status = status;
  for (const [field, value] of Object.entries(extra)) if (entry[field] == null || entry[field] === '') entry[field] = value;
  return target;
}

export function couponActive(coupon) {
  const start = String(coupon?.vld_term_sta_dt || coupon?.exps_sta_dt || '');
  const end = String(coupon?.vld_term_end_dt || coupon?.exps_end_dt || '');
  if (start && todayDigits < start) return false;
  if (end && todayDigits > end) return false;
  return String(coupon?.coup_qty_posb_yn || '1') !== '0';
}

export function couponRecord(coupon) {
  return {
    id: clean(coupon?.coup_id),
    label: clean(coupon?.coup_nm) || '할인쿠폰',
    benefitAmount: Number(coupon?.coup_bnft_amt || 0),
    benefitRate: Number(coupon?.coup_bnft_rt || 0),
    minimumOrderAmount: Number(coupon?.min_ord_amt || 0),
    startsAt: String(coupon?.vld_term_sta_dt || coupon?.exps_sta_dt || ''),
    endsAt: String(coupon?.vld_term_end_dt || coupon?.exps_end_dt || ''),
    appKeys: ['ddangyo'], appLabel: '땡겨요', status: 'available'
  };
}
