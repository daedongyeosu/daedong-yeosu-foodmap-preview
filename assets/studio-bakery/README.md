# 베이커리 시범매장 이미지

실제 브랜드·가게·판매상품의 사진이 아닌 AI 생성 연출 이미지다. 가상 베이커리 꾸미기와 장보기 체험에서만 예시 가격과 함께 사용한다. 실제 매장 사진으로 표시하거나 실제 주문·배달·재고를 발생시키지 않는다.

생성: Codex 내장 image_gen, 2026-10-16 작업. 투명 배경으로 요청했다. 원본은 Codex generated_images에 보존하고 프로젝트에서는 최대 640px, WebP 품질 86으로 재인코딩한 버전을 사용한다. 이미지의 시각적 내용은 후처리로 변경하지 않았다.

최종 파일: `croissant.webp`, `bread.webp`, `cake.webp`, `sandwich.webp`, `coffee.webp`.

## 사용한 정확한 프롬프트

각 이미지에 아래 문장을 사용하고 `{subject}`만 다음 목록으로 대체했다.

> Use case: product-mockup. Asset type: isolated product cutout for an editable virtual bakery shelf. Primary request: {subject}. Photorealistic appetizing premium bakery product photography, front three-quarter angle slightly above, warm soft light from upper left, full object centered and completely inside frame, generous transparent border, genuinely transparent background with clean alpha edge. No environment, no table, no text, no logo, no watermark, no graphic card, no extra objects. A single item, not a collage.

- croissant: one golden butter croissant, flaky baked layers, no plate
- bread: one small rustic oval sourdough loaf, deep golden crust, three diagonal flour-dusted cuts
- cake: one elegant whole strawberry cream cake with strawberries around its top, white cream, simple thin round cake board
- sandwich: one generous triangular baguette sandwich, lettuce tomato ham and cheese clearly visible, no wrapper
- coffee: one ivory ceramic cappuccino cup with latte art, matching small saucer, no text
