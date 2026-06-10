# Active Context — kordoc 본체

**마지막 업데이트**: 2026-06-11 (v3.0.0 작업 완료 — 커밋 대기)
**상태**: Wave 0~3 + 엣지 사냥 + 릴리스 준비 전부 완료, **전체 미커밋** (사용자 커밋 지시 대기)

---

## v3.0.0 완료 상태 (2026-06-11)

### 최종 수치 (검증: npm run build && npm test && node bench/score.mjs — 전체 PASS ✅)
- HWPX recallMicro **0.999978** / recallDoc 미달 0 / 표 exact **100%**(1,421표·중첩 343) / phantom 0.000057
- PDF coverage **0.99164** / HWP5쌍 유사도 **0.9994** (policy.mjs 정식 게이트 승격)
- 테스트 **458/458** / 라운드트립 풀스윕: 무변경=바이트동일 전수, 문단수정 128건 무손상(깨끗한 적용 108, 나머지 정직한 skip)
- 베이스라인 박제: bench/out/score-baseline-v3.0.0.json

### 이번 세션 작업 (전부 미커밋)
1. **Wave 3 라운드트립 완성**: tests/roundtrip-e2e.test.ts(실파일 9케이스) + tests/roundtrip-guards.test.ts 신규
2. **적대적 리뷰 31-에이전트 워크플로 → 확정 26건 전부 수정** (critical 4: 각주 body 오분류/대형문서 시프트 오적용/리터럴 </td> 셀 경계/Buffer view 오염): src/roundtrip/* 전반 + src/hwpx/parser.ts(lineBreak→\n) + src/table/builder.ts(라벨 행 소실)
3. **신규 코퍼스 120건**: bench/corpus/seoul2(60, 정보소통광장 11p~)/seoul-old(60, rangeDate=custom 2014-2016). 수집기 파라미터화
4. **채점기 함정 3종 수정**(bench/): 링크 정규식 스킴 한정, 마스킹-only 유닛 모수 제외, 짧은유닛 구간-우선 탐색(개선 3/악화 0) + .hwpx 확장자 OLE2 매직 라우팅
5. **릴리스 준비 완료**: package.json 3.0.0 / CHANGELOG 3.0.0 항목 / README v3.0.0 섹션+patchHwpx API / baseline 박제

### 다음 작업 (사용자 지시 대기)
- **커밋 + npm publish 여부** ← 첫 질문
- 남은 백로그: PDF ODL Phase 3 잔여(ClusterTable 완전판/TOC), HWP3 표 복원, 옛한글 PUA 5,659항, 라운드트립 Tier2(HWP5), MCP patchHwpx 도구 노출(킬러 데모), korea-kr2 빈 디렉토리 정리됨
- 함정 동일: 균등배분 1자 기준 불가침 / PDF 98.5% 합격선 / stale dist / score-baseline-*.json 덮어쓰기 금지

---

## 현재 상태 — v3.0.0 "99.9% 정확도" 프로젝트

### ✅ 완료 (전부 미커밋 working tree — 사용자 커밋 지시 대기)
- **Wave 0**: IR 3.0 코어 — IRCell.blocks(중첩표 구조 표현), IRTable.caption, src/shared/pua.ts(rhwp 한컴 PUA 매핑), builder 중첩표 HTML 재귀
- **Wave 1**: 파서 3종 업그레이드 (HWPX 9항목 / HWP5 11항목 — 이미지 0→90건 / PDF 9항목)
- **Wave 2**: 채점 게이트 전부 PASS — HWPX 재현율 99.699→**99.995%**, 표 exact **100%**(898/898), PDF coverage 97.013→**99.11%**, HWP5쌍 99.87%
- **측정 인프라**: bench/score.mjs 채점기(자기참조 XML GT + PDF consensus + HWP5 쌍 트랙) + 코퍼스 204건(misc 40/korea-kr 100/seoul 60/pdf-local 4) + 수집기 2종
- **테스트**: 329 → 419 전부 통과

### 🔶 Wave 3 중단 — 킬러기능 "무손실 라운드트립"
- src/roundtrip/{markdown-units,source-map,patcher,zip-patch}.ts 4개 생성됨 (~73KB), **테스트/검증/export 미완**
- 컨셉: patchHwpx(원본, 편집md) → 변경 문단 hp:t만 치환, 나머지 ZIP 엔트리 바이트 보존
- 다음 세션 ①번 작업 — 정독부터 (품질 미확인)

### 📊 핵심 수치 (재검증: npm run build && npm test && node bench/score.mjs)
| 지표 | v2.9.1 | v3.0 |
|------|--------|------|
| HWPX 재현율 | 99.699% | 99.995% |
| HWPX 표 exact | 99.875% | 100% |
| PDF coverage | 97.013% | 99.11% |
| HWP5 이미지 | 0건 | 90건 |

### 잔여 백로그
릴리스 준비(CHANGELOG/3.0.0/README), 신규 코퍼스 엣지 사냥(옛 HWP/배포용/시험지/스캔), ODL Phase 3(ClusterTable 완전판/TOC), HWP3 표 복원, 옛한글 PUA, 라운드트립 Tier2(HWP5), MCP patchHwpx 노출

## 핵심 파일 (신규/대수정)
| 파일 | 역할 |
|------|------|
| bench/score.mjs + ref/ + lib/ | 정확도 채점기 (게이트: policy.mjs) |
| bench/collect-{korea-kr,opengov}.mjs | 코퍼스 수집기 |
| src/shared/pua.ts | 한컴 PUA→유니코드 (rhwp 검증 테이블) |
| src/hwp5/{numbering,images}.ts | 글머리 카운터 / BinData 이미지 |
| src/roundtrip/*.ts | 라운드트립 (미완) |
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
