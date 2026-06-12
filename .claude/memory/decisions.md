# Architecture Decisions

## 2026-06-12: KorDoc Studio 에디터 서피스 = rhwp WASM + 듀얼 저장 경로

**결정**: 미리보기/편집 화면은 @rhwp/core(MIT, npm, Rust→WASM SVG 렌더)를 임베드하고, 저장은 두 경로로 분리 — 채움·텍스트 수정은 kordoc patchHwpx/fillHwpx(바이트 보존), 구조 편집만 rhwp exportHwpx(전체 재직렬화) + kordoc compare 검증 게이트.

**근거**:
- 스파이크 실측: rhwp 재직렬화는 내용 100% 보존(kordoc compare 0/0/0, 33/33)이지만 바이트 비보존(42KB→10KB) — 서식 보존 약속은 kordoc 경로만 가능
- 알한글은 rhwp-studio의 macOS 래퍼라 코드 재사용 가치 없음. HOP(golbin/hop)이 Tauri 임베드 선례
- 설계안 3개 경쟁 → "Fill & Touch"(실무자 UX-first) 만장일치 채택. 플랜: `.claude/plans/kordoc-studio-plan.md`

## 2026-06-12: v3.1 에디터 API — 세션은 재구축, 좌표는 t-도메인

**결정 1**: HwpxSession.patchBlocks는 오프셋 리베이스 대신 패치 후 새 바이트에서 상태 전체 재구축. 매핑은 patcher 알고리즘(정규화 텍스트 버킷+표 서수) 재사용 — "n회 증분 ≡ 일괄 patchHwpx 바이트 동일" 동등성의 근거이자 CI 게이트.

**결정 2**: buildRangeSplices 좌표계는 para.text가 아닌 **t-도메인**(hp:t 연결 텍스트) — tab/br 요소가 끼어도 해당 요소를 건드리지 않고 정밀 치환. 전체 재작성 폴백은 비-t 기여가 없을 때만 허용(탭 중복/순서 역전 오염 방지).

**결정 3**: IRBlock 타입 불변 유지 — blockId/sourceRef는 파서가 아닌 세션이 소유 (전 파서 영향 회피). PatchResult.verification(잔차 검증)과 changes(전→후 diff)는 의미가 달라 필드 분리.

**결정 4**: 빈 문자열 블록 비우기 미지원 — 재파싱 시 블록 핸들 소실 + patchHwpx(블록 삭제 미지원)와 비대칭이므로 거부가 옳다.

## 2026-04-08: PDF 파서 자체 개선 (pdfplumber 교체 아님)

**결정**: kordoc PDF 파서를 ODL 알고리즘 기반으로 업그레이드. pdfplumber 교체 안 함.

**근거**:
- pdfplumber(pdfminer.six)도 균등배분/CJK 공백 문제가 동일
- kordoc만 한국 공문서 특화 기능 보유 (균등배분 감지, 마커 헤딩, 특수 테이블)
- Node.js 단일 스택 유지
- Python 의존성 추가 불필요

**접근**:
- ODL의 Vertex 기반 동적 tolerance를 clean-room 재구현 (GPLv3 veraPDF 코드 직접 복사 안 함)
- pdfjs의 한계(TextItem 합치기)는 `normalizeItems`에서 균등배분 TextItem 분해로 우회
- 좌표 기반 처리를 주 경로로, 문자열 정규식은 안전망으로만

## 2026-04-08: 균등배분 처리 전략

**결정**: 3단계 파이프라인

1. `normalizeItems` → `splitEvenSpacedItem`: pdfjs가 합친 "홍 보 담 당 관" TextItem을 개별 글자로 분해
2. `mergeLineSimple`/`cellTextToString` → `detectEvenSpacedItems`: 좌표 기반으로 1자 한글 연속 구간 감지 후 합침
3. `cleanPdfText` → `collapseEvenSpacing`: 위 두 단계로 못 잡은 잔여분 문자열 후처리 (1자 기준 정규식)
