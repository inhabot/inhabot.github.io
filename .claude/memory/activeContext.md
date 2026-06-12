# Active Context — kordoc 본체

**마지막 업데이트**: 2026-06-12 (Phase A 마무리 + **Phase B 구현 완료** — v3.1.0 릴리스 진행)
**상태**: 테스트 500/500 그린 (인라인 다중라벨 수정 +9). Phase B는 kordoc-ai 레포에 구현 완료 (RPC 4종 + FillWizard + rhwp WASM 임베드, fill-e2e 9/9).

## Phase B 완료 요약 (2026-06-12, kordoc-ai 레포)
- 사이드카 RPC 4종: form_schema/form_fill/patch_blocks(HEAVY) + render_preview(HEAVY 제외) — Rust 화이트리스트 동기화
- @rhwp/core@0.7.15 듀얼 임베드: 프론트 Vite asset(wasm 5.5MB, CSP `wasm-unsafe-eval` 추가) + 사이드카 Node WASM(esbuild external + dist/node_modules 복사, 번들 stdin RPC 실검증)
- FillWizard: 좌 자동 폼(타입 위젯/필수/빈칸 배지) + 우 rhwp SVG 미리보기, 필드 포커스↔SVG 하이라이트 + 역방향 점프(svg-annotate), 출처 배지(명부 xlsx → "← 명부.xlsx B2" / 직접 입력 / 양식 기존 값), dry_run 미리보기 반영, 재파싱 검증 배지
- 실양식 E2E 2종 통과 (서면자문=인라인형, 수당여비=표형). 3종 목표였으나 로컬에 실양식 2개뿐 — 3종째 + 한/글 육안 검증은 사용자 확인 필요
- pnpm 전역 minimum-release-age(7일) → 프로젝트 .npmrc에 @rhwp/core 예외
- **코어 버그픽스(v3.1.0 포함)**: 인라인 다중 라벨("성명: 작성일자:") — scanInlineSegments 신설, 인식 오페어링 + 채우기 시 다음 라벨 소실 수정, 문단당 1매칭 제한 해제

---

## KorDoc Studio Phase A 완료 (2026-06-12, 미커밋)

### 프로젝트 컨텍스트
- **KorDoc Studio (Suite Phase 3R)**: 양식 자동 채우기 + rhwp 미리보기/편집 작업대. 전체 플랜 `.claude/plans/kordoc-studio-plan.md`
- rhwp 스파이크 검증 완료 (d:\AI_Project\kordoc-studio-spike): @rhwp/core@0.7.15 렌더 OK, exportHwpx 내용 100% 보존(바이트 비보존 → 듀얼 저장 경로)
- 실양식 테스트 파일: `D:/AI_Project/edu-facility-ai/docs/원본자료/4. 서면자문 의견서(양식).hwpx`

### ✅ 완료된 작업 (브랜치 feat/editor-api-v3.1)
| 작업 | 파일 | 상태 |
|------|------|------|
| HwpxSession (open/capability/patchBlocks/sourceRef) + patchHwpxBlocks | `src/roundtrip/session.ts` (신규) | ✅ |
| buildRangeSplices(t-도메인)/paraTText/paraTextPureT + 스캐너 additive(excludedParagraphs/orphanTables/inTextbox) | `src/roundtrip/source-map.ts` | ✅ |
| 섹션 엔트리 해석 공용화 | `src/roundtrip/hwpx-entries.ts` (신규) | ✅ |
| fillHwpx splice 전환 (바이트 보존 + v3.0 패리티) | `src/form/filler-hwpx.ts` (전면 재작성) | ✅ |
| extractFormSchema/inferFieldType (타입 7종+required/empty) | `src/form/recognize.ts` | ✅ |
| PatchResult.changes 필드 신설 (verification과 의미 분리) | `src/types.ts` | ✅ |
| CJS import.meta 버그 수정 | `tsup.config.ts` (shims:true) | ✅ |
| 신규 테스트 33개 (동등성 CI 게이트 포함) | `tests/{session-api,form-schema,filler-splice}.test.ts` | ✅ |

### 적대적 리뷰 (26 에이전트, 22건 확정 → 근본원인 14개 전부 수정)
major 수정: 전각공백 silent drop(동등성 위반), 머리말 영역 채우기 회귀, 탭 문단 재작성 오염, 글상자 라벨 오염, 셀 이미지 토큰 리터럴 기록, 빈 문자열 비우기 핸들 소실, verification 의미 충돌. minor: 재진입 직렬화, ArrayBuffer 뷰 복사, dedup 슬롯, matchedLabels 회수, amount 오탐 등.

### 📋 다음 할 일
- [x] 커밋 + PR + v3.1.0 릴리스 (CHANGELOG v3.0.1 보강 포함)
- [x] Phase B (W3-4): kordoc-ai @rhwp/core 임베드 + FillWizard + RPC 4종 + 출처 배지
- [ ] bench 게이트 회귀 확인 — 코퍼스 로컬 미존재로 미실행 (CI/코퍼스 보유 환경에서 `node bench/score.mjs`)
- [ ] Phase B 잔여: 실양식 3종째 + 한/글 육안 검증 (사용자), tauri:dev 웹뷰에서 WASM 초기화 실확인
- [ ] Phase C (클릭-편집): capability 잠금 시각화, 인라인 편집, undo/redo
- [ ] MCP에 fill_form/form_schema 도구 노출 (Phase D 계획이나 반나절 작업)

### 의도된 제약 (재론 금지)
- 빈 문자열 블록 비우기 = skip (블록 핸들 소실 + patchHwpx 비대칭 방지)
- 전략 0 인셀 패턴은 문단 단위 매칭 (문단 경계 걸친 패턴 미지원 — v3.0과 의도적 차이, 파일 헤더 문서화)
- session의 changes vs patchHwpx의 verification — 의미 다름, 혼용 금지

---

## v3.0.0 완료 상태 (2026-06-11)

### 최종 수치 (검증: npm run build && npm test && node bench/score.mjs — 전체 PASS ✅)
- HWPX recallMicro **0.999978** / recallDoc 미달 0 / 표 exact **100%**(1,421표·중첩 343) / phantom 0.000057
- PDF coverage **0.99164** / HWP5쌍 유사도 **0.9994** (policy.mjs 정식 게이트 승격)
- 테스트 **458/458** / 라운드트립 풀스윕: 무변경=바이트동일 전수, 문단수정 128건 무손상(깨끗한 적용 108, 나머지 정직한 skip)
- 베이스라인 박제: bench/out/score-baseline-v3.0.0.json

### 이번 세션 작업 (커밋 1f3ef33에 포함)
1. **Wave 3 라운드트립 완성**: tests/roundtrip-e2e.test.ts(실파일 9케이스) + tests/roundtrip-guards.test.ts 신규
2. **적대적 리뷰 31-에이전트 워크플로 → 확정 26건 전부 수정** (critical 4: 각주 body 오분류/대형문서 시프트 오적용/리터럴 </td> 셀 경계/Buffer view 오염): src/roundtrip/* 전반 + src/hwpx/parser.ts(lineBreak→\n) + src/table/builder.ts(라벨 행 소실)
3. **신규 코퍼스 120건**: bench/corpus/seoul2(60, 정보소통광장 11p~)/seoul-old(60, rangeDate=custom 2014-2016). 수집기 파라미터화
4. **채점기 함정 3종 수정**(bench/): 링크 정규식 스킴 한정, 마스킹-only 유닛 모수 제외, 짧은유닛 구간-우선 탐색(개선 3/악화 0) + .hwpx 확장자 OLE2 매직 라우팅
5. **릴리스 준비 완료**: package.json 3.0.0 / CHANGELOG 3.0.0 항목 / README v3.0.0 섹션+patchHwpx API / baseline 박제

### 다음 작업
- 남은 백로그: PDF ODL Phase 3 잔여(ClusterTable 완전판/TOC), HWP3 표 복원, 옛한글 PUA 5,659항, 라운드트립 Tier2(HWP5), MCP patchHwpx 도구 노출(킬러 데모), korea-kr2 빈 디렉토리 정리됨
- 함정 동일: 균등배분 1자 기준 불가침 / PDF 98.5% 합격선 / stale dist / score-baseline-*.json 덮어쓰기 금지

---

## 핵심 파일 (신규/대수정)
| 파일 | 역할 |
|------|------|
| bench/score.mjs + ref/ + lib/ | 정확도 채점기 (게이트: policy.mjs) |
| bench/collect-{korea-kr,opengov}.mjs | 코퍼스 수집기 |
| src/shared/pua.ts | 한컴 PUA→유니코드 (rhwp 검증 테이블) |
| src/hwp5/{numbering,images}.ts | 글머리 카운터 / BinData 이미지 |
| src/roundtrip/*.ts | 라운드트립 patchHwpx (v3.0 완성 — 5파일 + e2e/가드 테스트) |
| .claude/plans/v3.0.0-master-plan.md | 마스터플랜 + 진단 전문 위치 |
| .claude/plans/next-session-prompt.md | **다음 세션 프롬프트 (인계 문서)** |

## 주의 (lessons 추가분)
- 균등배분 1자 기준 불가침 / 휴리스틱 변경 시 코퍼스 정량 전후 비교 필수
- PDF 첨자(①·*) 별도 행 분리 → 표 오탐 전력 (mergeOverlappingRows 회귀 주의)
- 채점기 stale dist 함정: src 수정 후 빌드 없이 score.mjs 돌리면 구버전 채점
- bench/out/score-baseline-v2.9.1.json 덮어쓰기 금지

## 이전 컨텍스트 (참조용 유지)
- v2.7.0 XLS+Print (Phase 1, 커밋 f41da76) → v2.9.1까지 릴리스됨
- PDF ODL 업그레이드 Phase 1+2는 v2.x에서 완료, Phase 3는 v3.0 백로그로 승계
