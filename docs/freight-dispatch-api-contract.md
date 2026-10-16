# 맛지도 화물배차 API 계약 초안

프리뷰 화면과 실제 배차 서버 사이의 최소 계약이다. 브라우저에는 기사 인증 비밀값을 저장하지 않고, 서버가 발급한 `HttpOnly`, `Secure`, `SameSite` 세션 쿠키로 기사를 식별한다.

## 공통 원칙

- 모든 상태 변경은 서버 시간을 기준으로 기록한다.
- 주문 수락은 데이터베이스 트랜잭션 안에서 `OFFERED → ASSIGNED` 조건부 갱신으로 한 명만 성공시킨다.
- 상태 변경 요청은 `Idempotency-Key`를 저장해 재전송돼도 한 번만 처리한다.
- `If-Match`의 주문 버전이 현재 버전과 다르면 `409 VERSION_CONFLICT`를 반환한다.
- 기사 위치는 배차·안전·운행 확인 목적에 한해 보관하며 보관기간과 열람권한을 운영정책으로 제한한다.
- 서버 장애 때 브라우저 로컬 주문으로 대체 수락하지 않는다. 중복배차보다 수락 중단이 안전하다.

## 기사 오더판

`GET /v1/freight/drivers/{driverId}/board`

응답은 `{ driver, orders, serverTime }`이다. `orders`에는 해당 기사의 자격·차량조건에 맞는 공개 오더와 본인이 수행 중인 오더만 포함한다. 수락 전에는 고객 전화번호와 상세 출입정보를 내리지 않는다.

## 위치·접속신호

`PUT /v1/freight/drivers/{driverId}/presence`

본문은 `available`, `boardOpen`, `locationStatus`, `latitude`, `longitude`, `accuracy`, `appState`를 받는다. 인증 세션의 기사와 경로의 기사번호가 다르면 거절한다.

## 원자적 수락

`POST /v1/freight/orders/{orderId}/accept`

본문은 `{ driverId }`이다. 성공 시 배차된 주문과 픽업 약속시간을 반환한다. 이미 배차됐거나 버전이 바뀌면 `409 ALREADY_ASSIGNED` 또는 `409 VERSION_CONFLICT`를 반환한다.

## 수행 상태·포기

- `POST /v1/freight/orders/{orderId}/status`: `{ driverId, nextStatus, proof }`
- `POST /v1/freight/orders/{orderId}/release`: `{ driverId, reason }`

상태는 `ASSIGNED → ARRIVED → PICKED_UP → SETTLEMENT_PENDING` 순서만 허용한다. 포기 시 해당 기사를 같은 주문의 재배차 대상에서 제외하고 감사기록을 남긴다.
