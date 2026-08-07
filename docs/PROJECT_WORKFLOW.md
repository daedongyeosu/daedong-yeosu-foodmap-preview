# 대동여수음식지도 표준 작업·배포 절차

이 문서는 채팅방과 작업자가 바뀌어도 같은 품질로 작업하기 위한 단일 절차다. 저장소의 `AGENTS.md`와 함께 항상 적용한다.

## 1. 작업 시작 사전점검

파일을 수정하기 전에 다음을 확인한다.

- 현재 저장소가 작업 대상 preview 또는 운영 저장소와 일치하는가
- 현재 브랜치와 작업트리에 다른 사용자의 변경이 있는가
- `origin` 주소와 원격 기본 브랜치가 맞는가
- 최신 `origin/main`을 가져왔는가
- GitHub 앱, 로컬 Git 또는 승인된 다른 방식 중 브랜치 푸시와 PR 생성이 가능한 인증 경로가 있는가
- 이번 요청이 preview 변경인지 운영 변경인지 구분했는가

인증 경로가 없으면 코드 수정 전에 차단 사유를 알린다. `gh`가 없다는 이유만으로 GitHub 앱 경로까지 확인하지 않고 중단하지 않는다.

## 2. 작업 계약 작성

사용자 요청을 아래 네 항목으로 정리한 뒤 작업한다.

- 문제: 고객이 실제로 겪는 현상
- 변경 대상: 수정해도 되는 화면·기능·파일 범위
- 변경 금지: 가게·주문링크·사진·광고·배경 등 보존 대상
- 완료 조건: 고객 휴대전화에서 확인할 수 있는 결과

모호한 부분이 결과를 크게 바꾸지 않으면 기존 승인 원칙을 적용한다. 추정으로 데이터나 링크를 변경해야 하는 경우에는 먼저 확인한다.

## 3. 브랜치와 수정

1. 최신 `origin/main`에서 `agent/작업명-날짜` 브랜치를 만든다.
2. 요청 범위의 파일만 수정한다.
3. 기존 사용자 변경과 무관한 정리·포맷 변경을 섞지 않는다.
4. 새 보정 레이어를 추가하지 않고 기능 소유 파일을 우선 수정한다.
5. 관련 캐시 버전을 갱신한다.

## 4. 회귀검사

모든 버그 수정에는 재발 시 실패하는 `*-regression-test.mjs`를 추가한다. 통합 실행기는 루트의 회귀검사를 자동으로 발견하므로 별도 수동 목록을 추가하지 않는다.

필수 로컬 검사:

```bash
node --check app.js
node --check final-experience.js
node --check rc2-fixes.js
node --check rc3-fixes.js
node --check rc4-fixes.js
node --check rc5-fixes.js
node --check rc6-fixes.js
node --check rc7-address-map.js
node --check store-service-info.js
node --check store-menu-preview.js
node scripts/audit-public-repository.mjs
node scripts/validate-static.mjs
node scripts/validate-data.mjs
node scripts/run-regression-suite.mjs
```

고객 화면 변경은 390×844 모바일 브라우저로 추가 확인한다.

- 첫 화면이 비거나 무한 로딩되지 않는가
- 메인 슬라이드가 표시되는가
- 검색과 가게 상세가 열리는가
- 뒤로가기가 보던 화면으로 즉시 복귀하는가
- 요청과 무관한 문구·사진·광고·버튼이 사라지지 않았는가

## 5. PR

PR은 `.github/pull_request_template.md`를 사용한다.

- 원인과 고객 영향
- 변경 파일과 각 파일의 수정 이유
- 변경 금지 항목 보존 결과
- 새로 추가한 회귀검사
- 로컬 검사 결과
- preview 실기기 확인 항목

필수 검증이 실패하면 우회하거나 병합하지 않는다.

## 6. 병합과 preview 배포

1. 사용자의 명시적 병합·preview 배포 승인을 확인한다.
2. PR 필수 검증이 모두 성공했는지 확인한다.
3. preview 저장소 `main`에 병합한다.
4. GitHub Pages 배포 성공을 확인한다.
5. `preview.daedongmap.com`에서 새 자산 버전과 고객 동작을 확인한다.
6. 실제 휴대전화 검수 항목을 사용자에게 짧게 안내한다.

PR 병합만 끝났거나 배포가 진행 중이면 “배포 완료”라고 보고하지 않는다.

## 7. 운영 반영

preview 승인은 운영 승인과 다르다. `daedongmap.com`과 운영 저장소는 사용자가 별도로 명시적으로 승인한 경우에만 변경한다.

운영 반영 전에는 preview에서 승인된 커밋, 전체 필수 검사, 실제 휴대전화 검수 결과를 다시 확인한다.

## 8. 다른 채팅방 인계

새 작업자는 사용자에게 다시 설명을 요구하기 전에 다음을 확인한다.

- `AGENTS.md`
- 이 문서
- `docs/CRITICAL_UX_CONTRACT.md`
- 현재 브랜치와 `origin/main` 차이
- 열린 PR과 필수 검증 상태
- 최근 커밋과 미배포 변경

인계 보고에는 저장소, 브랜치, 커밋, PR, 배포 대상, 완료한 검사, 남은 승인 한 가지만 명확하게 적는다.

인계문은 `docs/HANDOFF_TEMPLATE.md` 형식을 사용한다.
