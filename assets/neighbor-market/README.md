# 이웃 중고장터 견본 이미지

`camera.webp`, `books.webp`, `bag.webp`는 실제 판매 물건이 아닌 AI 연출 이미지다. 내장 image_gen 도구로 2026-10-19에 각각 새로 생성했다. 외부 판매자 사진·브랜드·가게 자료를 수집하지 않았다. 도구 원본 PNG는 기본 생성 이미지 폴더에 보존했고, 게시용은 최대 640px WebP로 인코딩했다. 실제 알파 투명도를 유지한다. 예시 가격과 상태는 실제 감정·작동 확인 결과가 아니다.

사이트는 이 사진을 AI 견본으로 표시한다. 사용자가 직접 등록한 사진에는 AI 견본 표시를 붙이지 않는다. 기존 `studio-alley`의 블라우스·망치·크로스백도 변경 없이 재사용하며 해당 자산의 기존 생성 이력을 따른다.

## 최종 프롬프트 세트 — built-in image_gen 사용, CLI 미사용

공통 프롬프트:

> Use case: product-mockup. Asset type: individual cutout photo for a Korean neighborhood secondhand virtual market prototype. Subject: [아래 개별 Subject]. Photorealistic, warmly lit everyday object, charming secondhand condition rather than luxury advertising. Whole object entirely visible centered in a square composition, 10% clear margin, front three-quarter view and soft light from upper left. Genuine transparent alpha background; no room, floor or hard background; subtle contact shadow only. No people, price tags, lettering, brand logos, borders or watermark. This is one product image, not a collage or UI screenshot.

- `camera.webp` Subject: A single gently used 1970s unbranded compact film camera, muted silver metal and worn brown leather, small honest scuffs, a short leather strap coiled beside it
- `books.webp` Subject: A short stack of three well-loved used books with faded sage, terracotta and cream cloth covers, slightly yellowed pages, no readable title or author, no accessories
- `bag.webp` Subject: A single pre-owned olive canvas shoulder tote bag, soft creases and slightly worn seams, clean and cared for, brown leather handles, no logos

생성 설정은 세 파일 모두 `transparent_background: true`다. 게시용 변환은 색·구도·물건을 바꾸지 않는 크기/포맷 최적화이며, 원본 파일은 덮어쓰지 않았다.
