/** extractFormSchema / inferFieldType — 양식 필드 타입 추론 테스트 (v3.1) */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { extractFormSchema, inferFieldType } from "../src/form/recognize.js"
import type { IRBlock, IRCell } from "../src/types.js"

function cell(text: string): IRCell {
  return { text, colSpan: 1, rowSpan: 1 }
}

function formTable(rows: string[][]): IRBlock {
  return {
    type: "table",
    table: {
      rows: rows.length,
      cols: rows[0].length,
      cells: rows.map(r => r.map(cell)),
      hasHeader: false,
    },
  }
}

describe("inferFieldType: 값 패턴 우선", () => {
  it("주민등록번호 / 날짜 / 전화 / 이메일 / 금액 값 패턴", () => {
    assert.equal(inferFieldType("비고", "900101-1234567"), "idnum")
    assert.equal(inferFieldType("비고", "2026. 6. 12."), "date")
    assert.equal(inferFieldType("비고", "2026-06-12"), "date")
    assert.equal(inferFieldType("비고", "010-1234-5678"), "phone")
    assert.equal(inferFieldType("비고", "062)960-1234"), "phone")
    assert.equal(inferFieldType("비고", "chris@example.go.kr"), "email")
    assert.equal(inferFieldType("비고", "1,000,000원"), "amount")
    assert.equal(inferFieldType("비고", "35명"), "amount")
  })

  it("체크박스 기호는 값/라벨 어느 쪽이든 checkbox", () => {
    assert.equal(inferFieldType("참석여부", "□참석 □불참"), "checkbox")
    assert.equal(inferFieldType("☑동의", ""), "checkbox")
  })

  it("값이 없으면 라벨 키워드로 추론", () => {
    assert.equal(inferFieldType("생년월일", ""), "date")
    assert.equal(inferFieldType("연 락 처", ""), "phone")
    assert.equal(inferFieldType("이메일", ""), "email")
    assert.equal(inferFieldType("신청 금액", ""), "amount")
    assert.equal(inferFieldType("주민등록번호", ""), "idnum")
    assert.equal(inferFieldType("성명", ""), "text")
  })

  it("일반 텍스트 값은 라벨이 평범하면 text", () => {
    assert.equal(inferFieldType("성명", "홍길동"), "text")
    assert.equal(inferFieldType("주소", "광주광역시 광산구"), "text")
  })

  it("맨 숫자는 amount로 오분류하지 않고 라벨 폴백을 따른다", () => {
    assert.equal(inferFieldType("우편번호", "06236"), "text")
    assert.equal(inferFieldType("접수번호", "20260612"), "text")
    assert.equal(inferFieldType("연도", "2026"), "text")
    assert.equal(inferFieldType("수험번호", "12345"), "text")
    // 라벨이 date 계열이면 라벨 폴백으로 date
    assert.equal(inferFieldType("발령일자", "2026. 6."), "date")
    // 단위/천단위 콤마가 있으면 amount 유지
    assert.equal(inferFieldType("비고", "1,000,000"), "amount")
    assert.equal(inferFieldType("비고", "35명"), "amount")
  })
})

describe("extractFormSchema", () => {
  it("타입/필수/빈값 추론이 필드별로 부여된다", () => {
    const blocks: IRBlock[] = [formTable([
      ["성명", "홍길동"],
      ["생년월일", ""],
      ["연락처", "010-1234-5678"],
      ["신청금액", "1,000,000원"],
      ["이메일※", ""],
    ])]

    const schema = extractFormSchema(blocks)
    const byLabel = new Map(schema.fields.map(f => [f.label.replace(/[※*★\s]/g, ""), f]))

    const name = byLabel.get("성명")!
    assert.equal(name.type, "text")
    assert.equal(name.empty, false)
    assert.equal(name.required, undefined)

    const birth = byLabel.get("생년월일")!
    assert.equal(birth.type, "date")
    assert.equal(birth.empty, true)

    const phone = byLabel.get("연락처")!
    assert.equal(phone.type, "phone")
    assert.equal(phone.empty, false)

    const amount = byLabel.get("신청금액")!
    assert.equal(amount.type, "amount")

    const email = byLabel.get("이메일")!
    assert.equal(email.type, "email")
    assert.equal(email.required, true)
    assert.equal(email.empty, true)

    assert.ok(schema.confidence > 0)
  })

  it("플레이스홀더 값(괄호/밑줄/대시)은 empty=true", () => {
    const blocks: IRBlock[] = [formTable([
      ["주소", "(        )"],
      ["사유", "____________"],
      ["비고", "-"],
      ["소속", "광산구청"],
    ])]
    const schema = extractFormSchema(blocks)
    const byLabel = new Map(schema.fields.map(f => [f.label, f]))
    assert.equal(byLabel.get("주소")!.empty, true)
    assert.equal(byLabel.get("사유")!.empty, true)
    assert.equal(byLabel.get("비고")!.empty, true)
    assert.equal(byLabel.get("소속")!.empty, false)
  })
})
