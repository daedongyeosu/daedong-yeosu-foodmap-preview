# 여서동 네 가게 전용 지도·QR

## 작업 계약

- 기존 가게 등록과 메뉴는 재사용하고, 네 가게의 전용 홍보 슬라이드·영구 QR만 추가한다.
- 가게 ID, 가게 목록/순서, 사업자 정보, 원본 메뉴, 가격 정책, 주문앱 연결, 사진 및 기존 전용 지도는 변경하지 않는다.
- `virtualStores`에 기존 가게나 주문 경로를 복제하지 않는다.
- 사용자 승인: 2026-09-05 “Preview·메인사이트 병합·배포 승인”. 실제 배포 여부는 해당 PR·배포 작업 결과로 확인한다.

| 가게 | 전단지용 운영 주소 | QR 파일 |
| --- | --- | --- |
| 수라상궁조선국밥 여서점 | https://daedongmap.com/?hero=7bc7239e6b509c44 | assets/qr/surasanggung-joseon-gukbap-yeoseo.svg |
| 조선밀면&냉면 여수여서점 | https://daedongmap.com/?hero=d86586aaef8454c9 | assets/qr/joseon-milmyeon-naengmyeon-yeoseo.svg |
| 바오탕수 여서점 | https://daedongmap.com/?hero=84c118675c0caa4c | assets/qr/bao-tangsu-yeoseo.svg |
| 오워래 수제돈까스 여서점 | https://daedongmap.com/?hero=04910f606ba038a6 | assets/qr/oworae-donkatsu-yeoseo.svg |

주소는 기존 `hero` 캠페인 규칙을 그대로 사용한다. QR은 운영 도메인을 인코딩하며, Preview 확인 주소는 `data/store-campaign-links.json`의 `previewUrl`이다. 기존에 인쇄된 다른 가게 QR은 변경하지 않는다. QR의 흰 여백을 자르거나, 가운데에 로고를 덧씌우지 않는다.

## 대표 사진 근거

각 14장씩 총 56장. 가게마다 일반광고 3장을 더해 총 17장으로 표시한다. 2026-09-05 해당 가게의 현재 메뉴와 사진·메뉴명을 정확히 대조했다. 사진·문구를 생성하거나 다른 가게에서 추정하여 가져오지 않았다. 원본 식별자와 감사 근거는 공개 저장소 밖에서 보관한다.

수라상궁·조선밀면·바오는 서로 다른 음식사진 14장을 사용한다. 오워래는 사용자의 2026-09-05 “현재 메뉴사진 14장 모두 사용” 확인에 따라 돈까스·만두 등 11장과 공기밥·깍두기·콜라 3장을 모두 포함한다. 실제 메뉴를 삭제하거나 숨기는 변경은 없다.

Preview는 네 캠페인의 `layout: food14-plus3` 설정에만 공통 광고 3장을 적용한다. 기존 캠페인의 구성을 변경하지 않는다. 운영의 기존 공통 광고 동작도 유지한다. 사진 14장과 광고 3장을 각각 검사하며, 광고는 5·10·15번째에 표시한다. 네 가게의 기존 QR 이미지와 영구 주소는 그대로이므로 재인쇄할 필요가 없다.

## 검사와 재현

- `node four-store-campaign-regression-test.mjs`: 4개 가게 ID·명칭·14개 사진·전용 연결·QR·캐시 보존.
- `node store-campaign-nine-regression-test.mjs`: 기존 승인 가게와 새 가게를 포함한 전체 목록/슬라이드 보존.
- `node campaign-layout-14-plus-3-regression-test.mjs`: 실제 슬라이드 생성 함수의 14+3 구성과 기존 캠페인 동작 보존.
- `node scripts/run-regression-suite.mjs`: 기존 고객 기능 회귀검사.
- `BASE_URL=https://preview.daedongmap.com/ node scripts/browser-four-store-campaign.mjs`: 390×844 화면에서 캠페인→상세→닫기→재진입→메뉴 확인, 56개 사진 실제 로드, 가게마다 사진 14장·광고 3장·전체 17장 확인.
- 운영도 `BASE_URL=https://daedongmap.com/`으로 동일 검사를 실행한다. 운영의 기존 상세 자동 열기 및 공통 광고 동작을 보존한다.
- 로컬 후보 검사는 `CAMPAIGN_LOCAL_OVERRIDE=1`을 사용한다. 실제 배포 확인은 반드시 이 옵션 없이 실행한다.
- QR은 로컬 QRCode 라이브러리 1.5.4, 오류복원 H, 4모듈 여백으로 생성. SVG·PNG를 각각 280/1200픽셀로 읽어 jsQR 1.4.0으로 총16회 실제 디코딩하고 목적지 일치를 검사했다. 인쇄용 PNG는1960×1960픽셀이다.
