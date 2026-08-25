# 가게 전용 대동여수음식지도 링크

가게별 전용 지도는 `?hero=가게ID` 형식을 사용한다. 전용 링크로 들어오면 해당 가게의 전용 메인 배너가 먼저 보이고, 배너를 누르면 같은 가게 상세가 열린다. QR은 운영 주소를 담는다.

| 가게명 | 운영 링크 | Preview 링크 | QR 파일 |
|---|---|---|---|
| 손수김밥 양지점 | <https://daedongmap.com/?hero=67a9e4f14c8c7ea4> | <https://preview.daedongmap.com/?hero=67a9e4f14c8c7ea4> | `assets/qr/sonsugimbap-yangji.svg` |
| 콩산소 (음식 연구소) | <https://daedongmap.com/?hero=cfde2617224f33a0> | <https://preview.daedongmap.com/?hero=cfde2617224f33a0> | `assets/qr/kongsanso-food-lab.svg` |
| 탐나는피자 여수점 | <https://daedongmap.com/?hero=421ecef35a879687> | <https://preview.daedongmap.com/?hero=421ecef35a879687> | `assets/qr/tamnaneun-pizza-yeosu.svg` |
| 1인피자 피자먹다 여수여서점 | <https://daedongmap.com/?hero=068b2ae8fe32874a> | <https://preview.daedongmap.com/?hero=068b2ae8fe32874a> | `assets/qr/eat-pizza-yeosu-yeoseo.svg` |
| 비비큐 미평둔덕점 | <https://daedongmap.com/?hero=0abd7147b7d6b1dd> | <https://preview.daedongmap.com/?hero=0abd7147b7d6b1dd> | `assets/qr/bbq-mipyeong-dundeok.svg` |
| 프랭크버거 미평점 | <https://daedongmap.com/?hero=f8a71a5a2344ee7f> | <https://preview.daedongmap.com/?hero=f8a71a5a2344ee7f> | `assets/qr/frank-burger-mipyeong.svg` |
| 60계치킨 여수미평점 | <https://daedongmap.com/?hero=fb798d3119a28415> | <https://preview.daedongmap.com/?hero=fb798d3119a28415> | `assets/qr/60chicken-yeosu-mipyeong.svg` |
| 외계인피자 여수점 | <https://daedongmap.com/?hero=a089d1d54720b48e> | <https://preview.daedongmap.com/?hero=a089d1d54720b48e> | `assets/qr/alien-pizza-yeosu.svg` |
| 뽕뜨락피자 여수여서점 | <https://daedongmap.com/?hero=aa0a00258c22f377> | <https://preview.daedongmap.com/?hero=aa0a00258c22f377> | `assets/qr/ppongtteurak-pizza-yeosu-yeoseo.svg` |

정식 목록은 `data/store-campaign-links.json`에서 관리한다. 가게명, 가게 ID 또는 운영 주소가 바뀌면 QR도 반드시 다시 생성하고 회귀검사를 실행한다.
