import fs from 'node:fs';
const path=new URL('../data/stores.json',import.meta.url);
const stores=JSON.parse(fs.readFileSync(path,'utf8'));
const additions=[
  {
    "id": "068b2ae8fe32874a",
    "name": "1인피자 피자먹다 여수여서점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-1인피자피자먹다여수여서점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-1인피자피자먹다여수여서점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-1인피자피자먹다여수여서점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-1인피자피자먹다여수여서점"
      }
    ]
  },
  {
    "id": "361f855efc21c1c2",
    "name": "가마치통닭 여서점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-가마치통닭여서점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-가마치통닭여서점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-가마치통닭여서점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-가마치통닭여서점"
      }
    ]
  },
  {
    "id": "f7385d8006310630",
    "name": "국민학교",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-국민학교"
      },
      {
        "key": "yogiyo",
        "url": "https://ws.yogiyo.co.kr/yh3wbs"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-국민학교"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-국민학교"
      }
    ]
  },
  {
    "id": "450eb70e506c2de9",
    "name": "금쪽갈비 여수점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-금쪽갈비여수점"
      },
      {
        "key": "yogiyo",
        "url": "https://ws.yogiyo.co.kr/cu7ieh"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-금쪽갈비여수점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-금쪽갈비여수점"
      }
    ]
  },
  {
    "id": "884d23981fd2429a",
    "name": "네네치킨 둔덕미평점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-네네치킨둔덕미평점"
      },
      {
        "key": "yogiyo",
        "url": "https://ws.yogiyo.co.kr/qxv263"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-네네치킨둔덕미평점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-네네치킨둔덕미평점"
      }
    ]
  },
  {
    "id": "8a219b158c321627",
    "name": "닭가대표 숯불직화구이치킨 여수대표점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-닭가대표숯불직화구이치킨여수대표점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-닭가대표숯불직화구이치킨여수대표점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-닭가대표숯불직화구이치킨여수대표점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-닭가대표숯불직화구이치킨여수대표점"
      }
    ]
  },
  {
    "id": "f31d8c5f04fb7b79",
    "name": "대박난쪽갈비 여수점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-대박난쪽갈비여수점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-대박난쪽갈비여수점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-대박난쪽갈비여수점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-대박난쪽갈비여수점"
      }
    ]
  },
  {
    "id": "10db3b0db6ebf8c5",
    "name": "맘스터치 문수점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-맘스터치문수점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-맘스터치문수점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-맘스터치문수점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-맘스터치문수점"
      }
    ]
  },
  {
    "id": "57ae8848b4ccc2a1",
    "name": "본스치킨 미평점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-본스치킨미평점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-본스치킨미평점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-본스치킨미평점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-본스치킨미평점"
      }
    ]
  },
  {
    "id": "f14bc5ec109f3af0",
    "name": "빵빵김밥 여서점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-빵빵김밥여서점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-빵빵김밥여서점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-빵빵김밥여서점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-빵빵김밥여서점"
      }
    ]
  },
  {
    "id": "4d45e2363f0a18dd",
    "name": "아구회관",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-아구회관"
      },
      {
        "key": "yogiyo",
        "url": "https://ws.yogiyo.co.kr/z4wdej"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-아구회관"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-아구회관"
      }
    ]
  },
  {
    "id": "a8218795099e637e",
    "name": "오늘은 오므라이스 여수점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-오늘은오므라이스여수점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-오늘은오므라이스여수점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-오늘은오므라이스여수점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-오늘은오므라이스여수점"
      }
    ]
  },
  {
    "id": "a089d1d54720b48e",
    "name": "외계인피자 여수점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-외계인피자여수점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-외계인피자여수점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-외계인피자여수점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-외계인피자여수점"
      }
    ]
  },
  {
    "id": "3bfcc2140b2e0e0c",
    "name": "요거트월드 여서점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-요거트월드여서점"
      },
      {
        "key": "yogiyo",
        "url": "https://ws.yogiyo.co.kr/wf0lwd"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-요거트월드여서점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-요거트월드여서점"
      }
    ]
  },
  {
    "id": "a4aaeb8049d4e9f9",
    "name": "우쿠야 여수여서점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-우쿠야여수여서점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-우쿠야여수여서점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-우쿠야여수여서점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-우쿠야여수여서점"
      }
    ]
  },
  {
    "id": "11442d3b3328f951",
    "name": "인생아구찜 여수문수점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-인생아구찜여수문수점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-인생아구찜여수문수점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-인생아구찜여수문수점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-인생아구찜여수문수점"
      }
    ]
  },
  {
    "id": "75b59b6f39651fc8",
    "name": "자담치킨 여수미평점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-자담치킨여수미평점"
      },
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-자담치킨여수미평점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-자담치킨여수미평점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-자담치킨여수미평점"
      }
    ]
  },
  {
    "id": "2cddfb9ee60f0d7b",
    "name": "컴포즈커피 여수문수광장점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-컴포즈커피여수문수광장점"
      },
      {
        "key": "yogiyo",
        "url": "https://ws.yogiyo.co.kr/5ae6mxe"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-컴포즈커피여수문수광장점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-컴포즈커피여수문수광장점"
      }
    ]
  },
  {
    "id": "0d3062d5a5b94697",
    "name": "다기야치킨 여문점",
    "missing": [
      {
        "key": "ddangyo",
        "url": "https://bit.ly/tk-다기야치킨여문점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-다기야치킨여문점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-다기야치킨여문점"
      }
    ]
  },
  {
    "id": "dabbebff4fca3c56",
    "name": "대패가1900 문수점",
    "missing": [
      {
        "key": "yogiyo",
        "url": "https://bit.ly/yo-대패가1900문수점"
      },
      {
        "key": "coupang_eats",
        "url": "https://bit.ly/cu-대패가1900문수점"
      },
      {
        "key": "baemin",
        "url": "https://bit.ly/bm-대패가1900문수점"
      }
    ]
  }
];
const labels={ddangyo:'땡겨요',yogiyo:'요기요',coupang_eats:'쿠팡이츠',baemin:'배달의민족',mukkebi:'먹깨비',ondongne:'온동네',direct_order:'가게바로주문',local_gift_app:'CHAK 지역상품권',phone_order:'전화주문'};
const key=name=>{const t=String(name||'').replace(/\\s+/g,'').toLowerCase();if(t.includes('가게바로'))return'direct_order';if(t.includes('먹깨비'))return'mukkebi';if(t.includes('땡겨요'))return'ddangyo';if(t.includes('온동네'))return'ondongne';if(t.includes('전화'))return'phone_order';if(t.includes('chak')||t.includes('지역상품권'))return'local_gift_app';if(t.includes('요기요'))return'yogiyo';if(t.includes('쿠팡'))return'coupang_eats';if(t.includes('배달의민족')||t==='배민')return'baemin';return'';};
let added=0;
for(const item of additions){const store=stores.find(value=>String(value.store_id||value.id)===item.id);if(!store)throw new Error('store missing '+item.id);store.routes=Array.isArray(store.routes)?store.routes:[];const existing=new Set(store.routes.map(route=>key(route.name)));for(const route of item.missing){if(existing.has(route.key))throw new Error('existing channel '+store.name+' '+route.key);store.routes.push({name:labels[route.key],url:route.url,enabled:true});existing.add(route.key);added++;}}
fs.writeFileSync(path,JSON.stringify(stores,null,2)+'\n');
console.log(JSON.stringify({stores:additions.length,links:added}));
