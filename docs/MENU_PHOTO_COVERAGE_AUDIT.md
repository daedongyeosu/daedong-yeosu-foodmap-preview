# 메뉴사진 누락 자동점검

`scripts/audit-menu-photo-coverage.mjs`는 고객용 자료를 수정하지 않고 전체 공개 가게의 메뉴사진 상태를 조사한다.

## 안전 원칙

- 기존 사진은 변경하거나 삭제하지 않는다.
- 사진이 없는 메뉴만 동일 브랜드·동일 메뉴 사진 후보를 찾는다.
- 메뉴명은 원문 일치와 광고용 말머리 제거 일치를 구분한다.
- 다른 브랜드의 이름이 같은 메뉴는 후보로 연결하지 않는다.
- 후보 사진이 여러 장이면 자동 적용하지 않는다.
- 검수된 저장소 사진 한 장으로 확정되는 경우만 `safeToAutoFill` 후보로 표시한다.
- 보고서와 원본 응답은 공개 저장소 밖에 둔다.

## 실행

```powershell
node scripts/audit-menu-photo-coverage.mjs --output C:\private\menu-photo-audit --concurrency 6
```

결과물은 전체 요약, 가게별 누락률, 중복 메뉴, 동일 브랜드 사진 후보와 수집 실패 목록을 포함한다. GitHub Actions는 매일 한국시간 오전 3시 43분에 같은 점검을 실행하고 30일 동안 보고서를 보관한다.

기본 점검은 후보를 고객 화면에 반영하지 않는다. 같은 브랜드·메뉴명 정확히 일치·검수된 로컬사진 한 장이라는 조건을 모두 충족한 `safeToAutoFill` 후보만 아래 별도 명령으로 추가할 수 있다. 기존 매핑은 절대로 덮어쓰지 않는다.

```powershell
node scripts/apply-safe-menu-photo-candidates.mjs --report C:\private\menu-photo-audit\menu-photo-audit.json --apply yes
```
