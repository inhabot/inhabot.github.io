/** 양식 필드 인식 테스트 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { extractFormFields } from "../src/form/recognize.js"
import type { IRBlock, IRTable } from "../src/types.js"

function makeTable(rows: string[][]): IRTable {
  return {
    rows: rows.length,
    cols: rows[0]?.length || 0,
    cells: rows.map(row => row.map(text => ({ text, colSpan: 1, rowSpan: 1 }))),
    hasHeader: rows.length > 1,
  }
}

describe("extractFormFields", () => {
  it("label-value 인접셀 패턴 인식", () => {
    const blocks: IRBlock[] = [{
      type: "table",
      table: makeTable([
        ["성명", "홍길동"],
        ["소속", "교육부"],
        ["전화번호", "010-1234-5678"],
      ]),
    }]

    const result = extractFormFields(blocks)
    assert.ok(result.fields.length >= 3, `필드 수: ${result.fields.length}`)
    assert.ok(result.fields.some(f => f.label === "성명" && f.value === "홍길동"))
    assert.ok(result.fields.some(f => f.label === "소속" && f.value === "교육부"))
    assert.ok(result.fields.some(f => f.label === "전화번호"))
    assert.ok(result.confidence > 0)
  })

  it("헤더+데이터 행 패턴", () => {
    const blocks: IRBlock[] = [{
      type: "table",
      table: makeTable([
        ["이름", "직급", "부서"],
        ["홍길동", "과장", "교육부"],
        ["김철수", "대리", "총무부"],
      ]),
    }]

    const result = extractFormFields(blocks)
    assert.ok(result.fields.length >= 4, `필드 수: ${result.fields.length}`)
  })

  it("인라인 '라벨: 값' 패턴", () => {
    const blocks: IRBlock[] = [
      { type: "paragraph", text: "성명: 홍길동, 소속: 교육부" },
    ]

    const result = extractFormFields(blocks)
    assert.ok(result.fields.some(f => f.label === "성명" && f.value === "홍길동"))
    assert.ok(result.fields.some(f => f.label === "소속" && f.value === "교육부"))
  })

  it("테이블 없는 문서 → 빈 결과", () => {
    const blocks: IRBlock[] = [
      { type: "paragraph", text: "이것은 일반 텍스트입니다." },
    ]
    const result = extractFormFields(blocks)
    assert.equal(result.fields.length, 0)
    assert.equal(result.confidence, 0)
  })

  it("빈 블록 배열", () => {
    const result = extractFormFields([])
    assert.equal(result.fields.length, 0)
  })

  it("4열 양식 테이블 (label-value-label-value)", () => {
    const blocks: IRBlock[] = [{
      type: "table",
      table: makeTable([
        ["성명", "홍길동", "생년월일", "1990-01-01"],
        ["주소", "서울시 강남구", "전화번호", "010-1234-5678"],
      ]),
    }]

    const result = extractFormFields(blocks)
    assert.ok(result.fields.length >= 4, `필드 수: ${result.fields.length}`)
    assert.ok(result.fields.some(f => f.label === "생년월일" && f.value === "1990-01-01"))
  })

  it("병합셀로 행 길이가 cols보다 짧은 표(ragged)에서 크래시하지 않음", () => {
    // DOCX 병합셀(colSpan/vMerge)은 cells[r] 길이 < table.cols 인 ragged 행을 만든다.
    // extractFromTable이 cells[r][c]를 무가드로 인덱싱하면 undefined.text 크래시.
    const table: IRTable = {
      rows: 3,
      cols: 4,
      hasHeader: true,
      cells: [
        [{ text: "제목 한 줄", colSpan: 4, rowSpan: 1 }],        // 1칸이 4열 차지
        [{ text: "성명", colSpan: 1, rowSpan: 1 }, { text: "홍길동", colSpan: 3, rowSpan: 1 }],
        [{ text: "비고", colSpan: 1, rowSpan: 1 }],               // 행 길이 < cols
      ],
    }
    const blocks: IRBlock[] = [{ type: "table", table }]
    const result = extractFormFields(blocks)  // 크래시하지 않아야 함
    assert.ok(result.fields.some(f => f.label === "성명" && f.value === "홍길동"))
  })
})
