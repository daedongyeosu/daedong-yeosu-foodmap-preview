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

각 8장씩 총 32장. 2026-09-05 확인한 해당 가게의 현재 공개 메뉴 응답 `items[].id`, `name`, `image`를 정확히 연결했다. 사진·문구를 생성하거나 다른 가게에서 추정하여 가져오지 않았다. 아래 번호는 `ddangyo-{앱 가게 ID}-{메뉴 번호}` 형식의 끝 8자리이다.

- 수라상궁 / 1176197: 10000001, 10000002, 10000003, 10000004, 10000005, 10000008, 10000010, 10000016
- 조선밀면 / 1176198: 10000001, 10000002, 10000003, 10000005, 10000006, 10000012, 10000017, 10000018
- 바오탕수 / 1176199: 10000010, 10000007, 10000004, 10000003, 10000006, 10000014, 10000020, 10000021
- 오워래 / 1215130: 10000003, 10000002, 10000005, 10000004, 10000001, 10000006, 10000009, 10000010

대표 홍보 슬라이드에서만 음료·옵션·중복사진을 제외했다. 실제 메뉴의 음료·옵션을 삭제하거나 숨기는 변경은 없다.

## 검사와 재현

- `node four-store-campaign-regression-test.mjs`: 4개 가게 ID·명칭·8개 사진·전용 연결·QR·캐시 보존.
- `node store-campaign-nine-regression-test.mjs`: 기존 승인 가게와 새 가게를 포함한 전체 목록/슬라이드 보존.
- `node scripts/run-regression-suite.mjs`: 기존 고객 기능 회귀검사.
- `BASE_URL=https://preview.daedongmap.com/ node scripts/browser-four-store-campaign.mjs`: 390×844 화면에서 캠페인→상세→닫기→재진입→메뉴 확인, 32개 사진 실제 로드.
- 운영도 `BASE_URL=https://daedongmap.com/`으로 동일 검사를 실행한다. 운영의 기존 상세 자동 열기 및 공통 광고 동작을 보존한다.
- 로컬 후보 검사는 `CAMPAIGN_LOCAL_OVERRIDE=1`을 사용한다. 실제 배포 확인은 반드시 이 옵션 없이 실행한다.
- QR은 로컬 QRCode 라이브러리 1.5.4, 오류복원 H, 4모듈 여백으로 생성. SVG·PNG를 각각 280/1200픽셀로 읽어 jsQR 1.4.0으로 총16회 실제 디코딩하고 목적지 일치를 검사했다. 인쇄용 PNG는1960×1960픽셀이다.
