import fs from 'node:fs/promises';

const dataPath = 'store-service-info.json';
const jsPath = 'store-service-info.js';
const cssPath = 'store-service-info.css';

const appLabels = {
  mukkebi: '먹깨비',
  ddangyo: '땡겨요'
};

const scopeByBenefit = {
  'yeosu-seomseom-pay': ['mukkebi', 'ddangyo'],
  'high-oil-support': ['ddangyo'],
  'onnuri-gift-certificate': ['ddangyo'],
  'free-delivery': ['ddangyo']
};

const scopeLabel = keys => keys.map(key => appLabels[key] || key).join('·');

const data = JSON.parse(await fs.readFile(dataPath, 'utf8'));
data.version = Math.max(Number(data.version || 0), 3);
data.updatedAt = '2026-08-02';
data.scopePolicy = {
  unit: 'store-order-app-benefit',
  notice: '상품권·쿠폰·무료배달은 표시된 주문앱에서 확인한 정보이며 다른 주문앱에는 적용되지 않을 수 있습니다.'
};

for (const definition of [...(data.programs || []), ...(data.deliveryBenefits || [])]) {
  const appKeys = scopeByBenefit[definition.key] || [];
  definition.appKeys = appKeys;
  definition.appLabel = scopeLabel(appKeys) || '적용 주문앱 미확인';
}

for (const info of Object.values(data.stores || {})) {
  for (const payment of info.payments || []) {
    const appKeys = scopeByBenefit[payment.key] || [];
    payment.appKeys = appKeys;
    payment.appLabel = scopeLabel(appKeys) || '적용 주문앱 미확인';
  }
  for (const delivery of info.delivery || []) {
    const appKeys = scopeByBenefit[delivery.key] || [];
    delivery.appKeys = appKeys;
    delivery.appLabel = scopeLabel(appKeys) || '적용 주문앱 미확인';
    if (delivery.key === 'free-delivery') {
      delivery.note = '땡겨요 표시 기준 · 거리·주문금액·시간 등에 따라 달라질 수 있음';
    }
  }
}

await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`);

let source = await fs.readFile(jsPath, 'utf8');
const replacements = [
  [
    "  function paymentLabels(info) {\n    const programMap = new Map((serviceData.programs || []).map(program => [program.key, program.label]));\n    return (info?.payments || [])\n      .filter(payment => payment.status === 'accepted')\n      .map(payment => ({\n        key: payment.key,\n        label: programMap.get(payment.key) || payment.key,\n        kind: 'payment'\n      }));\n  }\n\n  function deliveryLabels(info) {\n    const deliveryMap = new Map((serviceData.deliveryBenefits || []).map(benefit => [benefit.key, benefit.label]));\n    return (info?.delivery || [])\n      .filter(benefit => benefit.status === 'available')\n      .map(benefit => ({\n        key: benefit.key,\n        label: deliveryMap.get(benefit.key) || benefit.key,\n        kind: 'delivery'\n      }));\n  }",
    "  function benefitScope(entry, definition) {\n    const appKeys = Array.isArray(entry?.appKeys) && entry.appKeys.length\n      ? entry.appKeys\n      : Array.isArray(definition?.appKeys) ? definition.appKeys : [];\n    const appLabel = String(entry?.appLabel || definition?.appLabel || '').trim()\n      || '적용 주문앱 미확인';\n    return {appKeys, appLabel};\n  }\n\n  function scopedBenefitLabel(benefit) {\n    return `${benefit.appLabel || '적용 주문앱 미확인'} ${benefit.label}`.trim();\n  }\n\n  function paymentLabels(info) {\n    const programMap = new Map((serviceData.programs || []).map(program => [program.key, program]));\n    return (info?.payments || [])\n      .filter(payment => payment.status === 'accepted')\n      .map(payment => {\n        const definition = programMap.get(payment.key) || {key: payment.key, label: payment.key};\n        const scope = benefitScope(payment, definition);\n        return {\n          key: payment.key,\n          label: definition.label || payment.key,\n          kind: 'payment',\n          ...scope\n        };\n      });\n  }\n\n  function deliveryLabels(info) {\n    const deliveryMap = new Map((serviceData.deliveryBenefits || []).map(benefit => [benefit.key, benefit]));\n    return (info?.delivery || [])\n      .filter(benefit => benefit.status === 'available')\n      .map(benefit => {\n        const definition = deliveryMap.get(benefit.key) || {key: benefit.key, label: benefit.key};\n        const scope = benefitScope(benefit, definition);\n        return {\n          key: benefit.key,\n          label: definition.label || benefit.key,\n          kind: 'delivery',\n          ...scope\n        };\n      });\n  }"
  ],
  [
    "  function benefitBadgeMarkup(benefit, className) {\n    const deliveryClass = benefit.kind === 'delivery' ? ' is-delivery' : '';\n    return `<span class=\"${className}${deliveryClass}\">✓ ${escapeHtml(benefit.label)}</span>`;\n  }",
    "  function benefitBadgeMarkup(benefit, className) {\n    const deliveryClass = benefit.kind === 'delivery' ? ' is-delivery' : '';\n    return `<span class=\"${className}${deliveryClass}\" data-benefit-app=\"${escapeHtml((benefit.appKeys || []).join('-'))}\">✓ ${escapeHtml(scopedBenefitLabel(benefit))}</span>`;\n  }"
  ],
  [
    "  function detailBenefitItems(info) {\n    const payments = new Map((info?.payments || []).map(payment => [payment.key, payment.status]));\n    const delivery = new Map((info?.delivery || []).map(benefit => [benefit.key, benefit.status]));\n    return [\n      ...(serviceData.programs || []).map(program => {\n        const value = payments.get(program.key);\n        return {\n          key: program.key,\n          label: program.label,\n          kind: 'payment',\n          state: value === 'accepted' ? 'available' : value === 'unavailable' ? 'unavailable' : 'unknown'\n        };\n      }),\n      ...(serviceData.deliveryBenefits || []).map(benefit => {\n        const value = delivery.get(benefit.key);\n        return {\n          key: benefit.key,\n          label: benefit.label,\n          kind: 'delivery',\n          state: value === 'available' ? 'available' : value === 'unavailable' ? 'unavailable' : 'unknown'\n        };\n      })\n    ];\n  }",
    "  function detailBenefitItems(info) {\n    const payments = new Map((info?.payments || []).map(payment => [payment.key, payment]));\n    const delivery = new Map((info?.delivery || []).map(benefit => [benefit.key, benefit]));\n    return [\n      ...(serviceData.programs || []).map(program => {\n        const entry = payments.get(program.key);\n        const value = entry?.status;\n        return {\n          key: program.key,\n          label: program.label,\n          kind: 'payment',\n          state: value === 'accepted' ? 'available' : value === 'unavailable' ? 'unavailable' : 'unknown',\n          ...benefitScope(entry, program)\n        };\n      }),\n      ...(serviceData.deliveryBenefits || []).map(benefit => {\n        const entry = delivery.get(benefit.key);\n        const value = entry?.status;\n        return {\n          key: benefit.key,\n          label: benefit.label,\n          kind: 'delivery',\n          state: value === 'available' ? 'available' : value === 'unavailable' ? 'unavailable' : 'unknown',\n          ...benefitScope(entry, benefit)\n        };\n      })\n    ];\n  }"
  ],
  [
    "    const stateLabel = item.state === 'available'\n      ? (isDelivery ? item.label : `${item.label} 사용 가능`)\n      : item.state === 'unavailable'\n        ? (isDelivery ? '무료배달 불가' : `${item.label} 사용 불가`)\n        : (isDelivery ? '무료배달 여부 미확인' : `${item.label} 미확인`);",
    "    const appLabel = item.appLabel || '적용 주문앱 미확인';\n    const stateLabel = item.state === 'available'\n      ? (isDelivery ? `${appLabel} · 무료배달 확인` : `${appLabel} · ${item.label} 사용 가능 확인`)\n      : item.state === 'unavailable'\n        ? (isDelivery ? `${appLabel} · 무료배달 불가 확인` : `${appLabel} · ${item.label} 사용 불가 확인`)\n        : (isDelivery ? `${appLabel} · 무료배달 여부 미확인` : `${appLabel} · ${item.label} 미확인`);"
  ],
  ["<h3>영업시간·상품권·무료배달</h3>", "<h3>영업시간·주문앱별 혜택</h3>"],
  ["aria-label=\"상품권 및 무료배달 확인 상태\"", "aria-label=\"주문앱별 상품권 및 무료배달 확인 상태\""],
  [
    "        <span>회색 미확인은 사용 불가가 아니라 아직 확인되지 않은 정보입니다.</span>",
    "        <span>상품권·쿠폰·무료배달은 표시된 주문앱에서 확인한 정보이며 다른 주문앱에는 적용되지 않을 수 있습니다. 회색 미확인은 사용 불가가 아니라 아직 확인되지 않은 정보입니다.</span>"
  ],
  ["결제·혜택 미확인", "주문앱별 혜택 미확인"],
  [
    "            <b>지금 영업하는 가게·결제·배달혜택 찾기</b>\n            <small>섬섬페이 · 고유가 지원금 · 온누리상품권 · 무료배달</small>",
    "            <b>지금 영업하는 가게·주문앱별 혜택 찾기</b>\n            <small>먹깨비·땡겨요 섬섬페이 · 땡겨요 지원금·온누리·무료배달</small>"
  ],
  [
    "      ...(serviceData.programs || []).map(program => [program.key, program.label]),\n      ...(serviceData.deliveryBenefits || []).map(benefit => [benefit.key, benefit.label])",
    "      ...(serviceData.programs || []).map(program => [program.key, `${program.appLabel || '적용 주문앱 미확인'} ${program.label}`]),\n      ...(serviceData.deliveryBenefits || []).map(benefit => [benefit.key, `${benefit.appLabel || '적용 주문앱 미확인'} ${benefit.label}`])"
  ],
  [
    "              return `<b${deliveryClass}>✓ ${escapeHtml(benefit.label)}</b>`;",
    "              return `<b${deliveryClass}>✓ ${escapeHtml(scopedBenefitLabel(benefit))}</b>`;"
  ],
  ["영업시간·결제·배달혜택 찾기", "영업시간·주문앱별 혜택 찾기"],
  [
    "현재 위치에서 가까운 동네부터 볼 수 있습니다. 회색 ‘미확인’은 사용 불가가 아니라 아직 확인되지 않은 정보입니다.",
    "현재 위치에서 가까운 동네부터 볼 수 있습니다. 상품권·쿠폰·무료배달은 배지에 표시된 주문앱 기준이며 다른 주문앱에는 적용되지 않을 수 있습니다."
  ]
];

for (const [before, after] of replacements) {
  if (!source.includes(before)) {
    throw new Error(`store-service-info.js replacement target missing: ${before.slice(0, 90)}`);
  }
  source = source.replace(before, after);
}

await fs.writeFile(jsPath, source);

let css = await fs.readFile(cssPath, 'utf8');
const cssAppend = `\n\n/* 주문앱별 혜택 출처를 고객이 카드와 전체 리스트에서 즉시 구분 */\n.store-service-card-payment,\n.store-service-overview-payments b {\n  max-width: 100%;\n  white-space: normal;\n  line-height: 1.25;\n}\n\n.store-service-detail-benefit {\n  align-items: flex-start;\n}\n\n@media (max-width: 520px) {\n  .store-service-card-meta {\n    gap: 4px;\n  }\n\n  .store-service-card-payment {\n    min-height: 26px;\n    padding: 4px 8px;\n    font-size: 10px;\n  }\n\n  .store-service-overview-payments b {\n    padding: 6px 8px;\n    font-size: 10px;\n  }\n}\n`;
if (!css.includes('주문앱별 혜택 출처를 고객이 카드와 전체 리스트에서 즉시 구분')) {
  css += cssAppend;
}
await fs.writeFile(cssPath, css);

console.log(JSON.stringify({
  version: data.version,
  programs: data.programs.map(item => ({key: item.key, appLabel: item.appLabel})),
  deliveryBenefits: data.deliveryBenefits.map(item => ({key: item.key, appLabel: item.appLabel})),
  stores: Object.keys(data.stores || {}).length
}, null, 2));
