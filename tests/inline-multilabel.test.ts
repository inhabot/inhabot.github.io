/**
 * 인라인 다중 라벨 회귀 — "자문위원 성명: 작성일자:" 한 줄에 라벨이 여러 개인
 * 실양식(서면자문 의견서)에서 첫 라벨의 값이 다음 라벨을 삼키던 버그.
 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import JSZip from "jszip"
import { scanInlineSegments } from "../src/form/match.js"
import { extractFormFields, extractFormSchema } from "../src/form/recognize.js"
import { fillHwpx } from "../src/form/filler-hwpx.js"
import { fillFormFields } from "../src/form/filler.js"
import type { IRBlock } from "../src/types.js"

// ─── scanInlineSegments ──────────────────────────────

describe("scanInlineSegments", () => {
  it("한 줄 다중 라벨 — 값이 다음 라벨 직전에서 끝남", () => {
    const segs = scanInlineSegments("성명: 홍길동 전화: 010-1234-5678")
    assert.equal(segs.length, 2)
    assert.equal(segs[0].label, "성명")
    assert.equal(segs[0].value, "홍길동")
    assert.equal(segs[1].label, "전화")
    assert.equal(segs[1].value, "010-1234-5678")
  })

  it("값이 빈 라벨도 세그먼트로 반환 (valueStart === valueEnd)", () => {
    const segs = scanInlineSegments("자문위원 성명: 작성일자:")
    assert.equal(segs.length, 2)
    assert.equal(segs[0].label, "성명")
    assert.equal(segs[0].value, "")
    assert.equal(segs[0].valueStart, segs[0].valueEnd)
    assert.equal(segs[1].label, "작성일자")
    assert.equal(segs[1].value, "")
  })

  it("URL 스킴 콜론은 라벨이 아님", () => {
    const segs = scanInlineSegments("홈페이지: http://example.com/page")
    assert.equal(segs.length, 1)
    assert.equal(segs[0].label, "홈페이지")
    assert.equal(segs[0].value, "http://example.com/page")
  })

  it("구분자 [,;]에서 값이 끝남 (기존 동작 유지)", () => {
    const segs = scanInlineSegments("주소: 서울시 강남구, 기타 내용")
    assert.equal(segs[0].value, "서울시 강남구")
  })
})

// ─── extractFormFields / extractFormSchema ──────────

function para(text: string): IRBlock {
  return { type: "paragraph", text }
}

describe("인라인 다중 라벨 인식", () => {
  it("extractFormFields — 다음 라벨을 값으로 삼키지 않음", () => {
    const { fields } = extractFormFields([para("성명: 홍길동 전화: 010-1234-5678")])
    const byLabel = new Map(fields.map(f => [f.label, f.value]))
    assert.equal(byLabel.get("성명"), "홍길동")
    assert.equal(byLabel.get("전화"), "010-1234-5678")
  })

  it("extractFormSchema — 값이 빈 인라인 라벨을 채움 대상으로 노출", () => {
    const { fields } = extractFormSchema([para("자문위원 성명: 작성일자:")])
    assert.equal(fields.length, 2)
    const byLabel = new Map(fields.map(f => [f.label, f]))
    assert.equal(byLabel.get("성명")!.empty, true)
    assert.equal(byLabel.get("작성일자")!.empty, true)
    assert.equal(byLabel.get("작성일자")!.type, "date")
  })
})

// ─── fillHwpx / fillFormFields ───────────────────────

function inlineSection(text: string): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">
  <hp:p id="0" paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t>${text}</hp:t></hp:run></hp:p>
</hs:sec>`
}

async function makeInlineFixture(text: string): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file("mimetype", "application/hwp+zip")
  zip.file("Contents/section0.xml", inlineSection(text))
  return zip.generateAsync({ type: "arraybuffer" })
}

describe("fillHwpx: 인라인 다중 라벨", () => {
  it("한 문단의 라벨 두 개를 모두 채우고 라벨 텍스트를 보존", async () => {
    const buffer = await makeInlineFixture("자문위원 성명: 작성일자:")
    const result = await fillHwpx(buffer, { 성명: "홍길동", 작성일자: "2026. 6. 12." })

    assert.deepEqual(result.filled.map(f => f.label).sort(), ["성명", "작성일자"])
    assert.deepEqual(result.unmatched, [])

    const zip = await JSZip.loadAsync(result.buffer)
    const xml = await zip.file("Contents/section0.xml")!.async("text")
    assert.ok(xml.includes("성명: 홍길동"), `성명 채움: ${xml}`)
    assert.ok(xml.includes("작성일자: 2026. 6. 12."), `작성일자 라벨 보존 + 채움: ${xml}`)
  })

  it("기존 값이 있는 다중 라벨 줄 — 각자 자기 값만 교체", async () => {
    const buffer = await makeInlineFixture("성명: 기존이름 전화: 02-000-0000")
    const result = await fillHwpx(buffer, { 성명: "김민수", 전화: "010-9999-8888" })

    assert.equal(result.filled.length, 2)
    const zip = await JSZip.loadAsync(result.buffer)
    const xml = await zip.file("Contents/section0.xml")!.async("text")
    assert.ok(xml.includes("성명: 김민수 전화: 010-9999-8888"), xml)
  })
})

describe("fillFormFields: 인라인 다중 라벨", () => {
  it("IRBlock 경로도 동일하게 두 라벨 채움", () => {
    const result = fillFormFields([para("자문위원 성명: 작성일자:")], {
      성명: "홍길동",
      작성일자: "2026. 6. 12.",
    })
    assert.deepEqual(result.unmatched, [])
    const text = result.blocks[0].text!
    assert.ok(text.includes("성명: 홍길동"), text)
    assert.ok(text.includes("작성일자: 2026. 6. 12."), text)
  })
})
