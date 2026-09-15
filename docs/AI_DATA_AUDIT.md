# 대동음식지도 AI 데이터 검수

이 도구는 수집된 가게 데이터에서 중복 가능성, 사진·주소·전화·주문경로 누락을 찾아 사람이 확인할 검수 목록을 만든다.

## 고정 안전 원칙

- 원본 가게 데이터와 고객 화면을 자동 수정하지 않는다.
- 중복 후보를 자동 병합·삭제하지 않는다.
- 원본 입력과 결과 보고서는 공개 저장소 밖에 둔다.
- 전화번호 원문은 모델에 보내지 않고 실행마다 바뀌는 비밀 소금 기반 지문만 사용한다.
- 기본 실행은 API를 호출하지 않는 무료 사전점검이다.
- 첫 버전은 실행당 최대 25개 후보, API 호출 1회로 제한한다.
- API 키는 파일·GitHub·문서·로그에 기록하지 않고 `OPENAI_API_KEY` 환경변수로만 전달한다.

## 무료 사전점검

```bash
node scripts/ai-data-audit.mjs \
  --input ../private/catalog.json \
  --output ../private/ai-audit-dry-run.json
```

## AI 검수 1회 실행

API 키를 안전한 실행 환경에 설정한 뒤에만 명시적으로 허용한다.

```bash
node scripts/ai-data-audit.mjs \
  --input ../private/catalog.json \
  --output ../private/ai-audit-result.json \
  --allow-api-call yes \
  --model gpt-5.6-luna \
  --max-records 25 \
  --max-api-calls 1
```

결과의 `candidates`와 `ai.reviews`는 검수 제안일 뿐이다. 실제 가게 통합·사진 연결·주문경로 변경은 근거 확인과 사용자 승인을 거쳐 별도 작업으로 진행한다.
