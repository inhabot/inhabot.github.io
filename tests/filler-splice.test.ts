/** fillHwpx — source-map splice 전환 (v3.1) 바이트 보존·전략 회귀 테스트 */

import { describe, it } from "node:test"
import assert from "node:assert/strict"
import JSZip from "jszip"
import { fillHwpx } from "../src/form/filler-hwpx.js"

// ─── 픽스처 ──────────────────────────────────────────

function sectionWithFormTable(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">
  <hp:p id="0" paraPrIDRef="0" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0">
    <hp:run charPrIDRef="0">
      <hp:tbl>
        <hp:tr>
          <hp:tc name="" header="0" borderFillIDRef="0">
            <hp:subList id="">
              <hp:p id="1"><hp:run charPrIDRef="0"><hp:t>성명</hp:t></hp:run></hp:p>
            </hp:subList>
            <hp:cellAddr colAddr="0" rowAddr="0"/>
            <hp:cellSpan colSpan="1" rowSpan="1"/>
          </hp:tc>
          <hp:tc name="" header="0" borderFillIDRef="0">
            <hp:subList id="">
              <hp:p id="2"><hp:run charPrIDRef="5"><hp:t>(한자：      )</hp:t></hp:run></hp:p>
            </hp:subList>
            <hp:cellAddr colAddr="1" rowAddr="0"/>
            <hp:cellSpan colSpan="1" rowSpan="1"/>
          </hp:tc>
        </hp:tr>
        <hp:tr>
          <hp:tc name="" header="0" borderFillIDRef="0">
            <hp:subList id="">
              <hp:p id="3"><hp:run charPrIDRef="0"><hp:t>연락처</hp:t></hp:run></hp:p>
            </hp:subList>
            <hp:cellAddr colAddr="0" rowAddr="1"/>
            <hp:cellSpan colSpan="1" rowSpan="1"/>
          </hp:tc>
          <hp:tc name="" header="0" borderFillIDRef="0">
            <hp:subList id="">
              <hp:p id="4"><hp:run charPrIDRef="7"><hp:t>기존값</hp:t></hp:run></hp:p>
            </hp:subList>
            <hp:cellAddr colAddr="1" rowAddr="1"/>
            <hp:cellSpan colSpan="1" rowSpan="1"/>
          </hp:tc>
        </hp:tr>
      </hp:tbl>
    </hp:run>
  </hp:p>
  <hp:p id="5" paraPrIDRef="0" styleIDRef="0"><hp:run charPrIDRef="0"><hp:t>접수번호: 미정</hp:t></hp:run></hp:p>
</hs:sec>`
}

async function makeFixture(): Promise<{ buffer: ArrayBuffer; mimetypeBytes: Uint8Array }> {
  const zip = new JSZip()
  zip.file("mimetype", "application/hwp+zip")
  zip.file("Contents/section0.xml", sectionWithFormTable())
  zip.file("settings.xml", "<settings>불변 엔트리</settings>")
  const buffer = await zip.generateAsync({ type: "arraybuffer" })
  const z = await JSZip.loadAsync(buffer)
  const mimetypeBytes = await z.file("mimetype")!.async("uint8array")
  return { buffer, mimetypeBytes }
}

async function sectionText(buffer: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  return zip.file("Contents/section0.xml")!.async("text")
}

// ─── 테스트 ──────────────────────────────────────────

describe("fillHwpx (splice): 바이트 보존", () => {
  it("매칭 없는 값 → 출력이 원본과 바이트 동일", async () => {
    const { buffer } = await makeFixture()
    const result = await fillHwpx(buffer, { 존재하지않는라벨: "값" })
    assert.equal(result.filled.length, 0)
    assert.deepEqual(result.unmatched, ["존재하지않는라벨"])
    assert.equal(
      Buffer.compare(Buffer.from(new Uint8Array(buffer)), Buffer.from(new Uint8Array(result.buffer))), 0,
      "무변경 채우기 = 바이트 동일",
    )
  })

  it("채우기 후에도 비변경 ZIP 엔트리는 바이트 그대로", async () => {
    const { buffer, mimetypeBytes } = await makeFixture()
    const result = await fillHwpx(buffer, { 연락처: "010-1234-5678" })
    assert.ok(result.filled.some(f => f.value === "010-1234-5678"))

    const zip = await JSZip.loadAsync(result.buffer)
    const outMime = await zip.file("mimetype")!.async("uint8array")
    assert.equal(Buffer.compare(Buffer.from(mimetypeBytes), Buffer.from(outMime)), 0, "mimetype 바이트 보존")
    const outSettings = await zip.file("settings.xml")!.async("text")
    assert.equal(outSettings, "<settings>불변 엔트리</settings>", "비변경 엔트리 보존")
  })

  it("변경 문단 외 XML은 문자 그대로 보존 (속성/공백 재직렬화 없음)", async () => {
    const { buffer } = await makeFixture()
    const result = await fillHwpx(buffer, { 연락처: "010-1234-5678" })
    const xml = await sectionText(result.buffer)
    // xmldom 재직렬화였다면 속성 순서/자기닫힘 표기가 흔들릴 수 있는 부분이 그대로인지
    assert.ok(xml.includes(`<hp:p id="1"><hp:run charPrIDRef="0"><hp:t>성명</hp:t></hp:run></hp:p>`), "라벨 셀 문단 원문 보존")
    assert.ok(xml.includes(`<hp:cellAddr colAddr="0" rowAddr="0"/>`), "자기닫힘 표기 보존")
    assert.ok(xml.includes(`<hp:run charPrIDRef="7"><hp:t>010-1234-5678</hp:t></hp:run>`), "값 셀 charPr 보존 + 값 교체")
  })
})

describe("fillHwpx (splice): 전략 회귀", () => {
  it("전략 0+1: 어노테이션 채움 + 값 앞삽입 공존", async () => {
    const { buffer } = await makeFixture()
    const result = await fillHwpx(buffer, { 성명: "김민수", 한자: "金民秀" })

    const xml = await sectionText(result.buffer)
    assert.ok(xml.includes("金民秀"), "어노테이션 한자 채움")
    assert.ok(xml.includes("김민수"), "성명 값 삽입")
    // 어노테이션이 보존된 채 값이 앞에 붙는다
    assert.match(xml, /김민수\s*\(한자：\s*金民秀\)/, "값 + 어노테이션 순서")

    const labels = result.filled.map(f => f.label)
    assert.ok(labels.includes("한자"), "어노테이션 filled 보고")
    assert.ok(labels.includes("성명"), "성명 filled 보고")
  })

  it("전략 3: 인라인 '라벨: 값' 교체", async () => {
    const { buffer } = await makeFixture()
    const result = await fillHwpx(buffer, { 접수번호: "2026-0612-001" })
    const xml = await sectionText(result.buffer)
    assert.ok(xml.includes("접수번호: 2026-0612-001"), `인라인 값 교체: ${xml.match(/접수번호[^<]*/)?.[0]}`)
    assert.ok(!xml.includes("미정"), "기존 값 제거")
  })

  it("기존 회귀: 값 교체 시 다른 셀 영향 없음", async () => {
    const { buffer } = await makeFixture()
    const result = await fillHwpx(buffer, { 연락처: "010-9999-8888" })
    const xml = await sectionText(result.buffer)
    assert.ok(xml.includes("성명"), "라벨 보존")
    assert.ok(xml.includes("(한자：      )"), "다른 값 셀 비변경")
    assert.ok(!xml.includes("기존값"), "대상 값만 교체")
  })
})

// ─── 적대적 리뷰 회귀 (v3.0 패리티) ─────────────────

async function makeZip(sectionXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip()
  zip.file("mimetype", "application/hwp+zip")
  zip.file("Contents/section0.xml", sectionXml)
  return zip.generateAsync({ type: "arraybuffer" })
}

const SEC_OPEN = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph">`

describe("fillHwpx (splice): v3.0 패리티 회귀", () => {
  it("머리말(ctrl) 안의 라벨-값 표와 인라인 패턴도 채운다", async () => {
    const buffer = await makeZip(`${SEC_OPEN}
  <hp:p id="0"><hp:run charPrIDRef="0">
    <hp:ctrl><hp:header applyPageType="BOTH"><hp:subList id="">
      <hp:p id="1"><hp:run charPrIDRef="0"><hp:t>문서번호: 미정</hp:t></hp:run></hp:p>
      <hp:p id="2"><hp:run charPrIDRef="0">
        <hp:tbl><hp:tr>
          <hp:tc><hp:subList id=""><hp:p id="3"><hp:run charPrIDRef="0"><hp:t>담당자</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
          <hp:tc><hp:subList id=""><hp:p id="4"><hp:run charPrIDRef="0"><hp:t>미정</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="1" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
        </hp:tr></hp:tbl>
      </hp:run></hp:p>
    </hp:subList></hp:header></hp:ctrl>
  </hp:run></hp:p>
  <hp:p id="5"><hp:run charPrIDRef="0"><hp:t>본문 문단.</hp:t></hp:run></hp:p>
</hs:sec>`)

    const result = await fillHwpx(buffer, { 문서번호: "총무-2026-123", 담당자: "홍길동" })
    const labels = result.filled.map(f => f.label)
    assert.ok(labels.includes("문서번호"), `머리말 인라인 채움: ${JSON.stringify(labels)}`)
    assert.ok(labels.includes("담당자"), `머리말 표 채움: ${JSON.stringify(labels)}`)
    assert.deepEqual(result.unmatched, [])

    const zip = await JSZip.loadAsync(result.buffer)
    const xml = await zip.file("Contents/section0.xml")!.async("text")
    assert.ok(xml.includes("총무-2026-123"))
    assert.ok(xml.includes("홍길동"))
  })

  it("tab 요소가 낀 인라인 채우기 — 탭/순서 보존 (전체 재작성 오염 금지)", async () => {
    const buffer = await makeZip(`${SEC_OPEN}
  <hp:p id="0"><hp:run charPrIDRef="0"><hp:t>접수번호:</hp:t><hp:tab/><hp:t>미정</hp:t></hp:run></hp:p>
</hs:sec>`)

    const result = await fillHwpx(buffer, { 접수번호: "2026-001" })
    assert.equal(result.filled.length, 1)

    const zip = await JSZip.loadAsync(result.buffer)
    const xml = await zip.file("Contents/section0.xml")!.async("text")
    // v3.0과 동일: 값이 탭 뒤 t에 들어가고 탭 요소·순서 보존
    assert.ok(
      xml.includes(`<hp:t>접수번호:</hp:t><hp:tab/><hp:t>2026-001</hp:t>`),
      `탭 구조 보존: ${xml.match(/<hp:t>접수번호[\s\S]*?<\/hp:run>/)?.[0]}`,
    )
  })

  it("□<tab/>키워드 체크박스 — tab이 끼어도 매칭·체크 (t-도메인 매칭)", async () => {
    const buffer = await makeZip(`${SEC_OPEN}
  <hp:p id="0"><hp:run charPrIDRef="0">
    <hp:tbl><hp:tr>
      <hp:tc><hp:subList id=""><hp:p id="1"><hp:run charPrIDRef="0"><hp:t>□</hp:t><hp:tab/><hp:t>남</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
    </hp:tr></hp:tbl>
  </hp:run></hp:p>
</hs:sec>`)

    const result = await fillHwpx(buffer, { 남: "☑" })
    assert.equal(result.filled.length, 1, `체크박스 매칭: ${JSON.stringify(result.unmatched)}`)

    const zip = await JSZip.loadAsync(result.buffer)
    const xml = await zip.file("Contents/section0.xml")!.async("text")
    assert.ok(xml.includes("☑"), "체크 반영")
    assert.ok(xml.includes("<hp:tab/>"), "탭 요소 보존")
  })

  it("셀 안 글상자(drawText) 텍스트는 라벨 판정에서 제외된다", async () => {
    const buffer = await makeZip(`${SEC_OPEN}
  <hp:p id="0"><hp:run charPrIDRef="0">
    <hp:tbl><hp:tr>
      <hp:tc><hp:subList id="">
        <hp:p id="1"><hp:run charPrIDRef="0"><hp:t>성명</hp:t></hp:run></hp:p>
        <hp:p id="2"><hp:run charPrIDRef="0"><hp:rect><hp:drawText><hp:subList id=""><hp:p id="3"><hp:run charPrIDRef="0"><hp:t>반드시 정자로 기재하여 주시기 바랍니다</hp:t></hp:run></hp:p></hp:subList></hp:drawText></hp:rect></hp:run></hp:p>
      </hp:subList><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
      <hp:tc><hp:subList id=""><hp:p id="4"><hp:run charPrIDRef="0"><hp:t>빈칸</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="1" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
    </hp:tr></hp:tbl>
  </hp:run></hp:p>
</hs:sec>`)

    const result = await fillHwpx(buffer, { 성명: "홍길동" })
    assert.equal(result.filled.length, 1, `글상자 무시하고 라벨 인식: ${JSON.stringify(result.unmatched)}`)
    assert.equal(result.filled[0].label, "성명")
  })

  it("run/t 없는 빈 문단 값 셀 — filled 회수 + unmatched 복원 (증발 금지)", async () => {
    const buffer = await makeZip(`${SEC_OPEN}
  <hp:p id="0"><hp:run charPrIDRef="0">
    <hp:tbl><hp:tr>
      <hp:tc><hp:subList id=""><hp:p id="1"><hp:run charPrIDRef="0"><hp:t>성명</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
      <hp:tc><hp:subList id=""><hp:p id="2"></hp:p></hp:subList><hp:cellAddr colAddr="1" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
    </hp:tr></hp:tbl>
  </hp:run></hp:p>
</hs:sec>`)

    const result = await fillHwpx(buffer, { 성명: "홍길동" })
    assert.equal(result.filled.length, 0, "적용 실패는 filled에서 회수")
    assert.deepEqual(result.unmatched, ["성명"], "unmatched로 복원 — 증발 금지")
  })

  it("전략 2가 전략 1 결과를 덮어쓴다 (v3.0 last-write-wins 패리티)", async () => {
    // 헤더 [구분|내용] + 데이터 행 [성명|기존값]: '기존값' 셀은 전략 1(좌측 라벨
    // 성명)과 전략 2(헤더 내용)의 대상이 동시에 됨 — v3.0은 전략 2가 최종
    const buffer = await makeZip(`${SEC_OPEN}
  <hp:p id="0"><hp:run charPrIDRef="0">
    <hp:tbl>
      <hp:tr>
        <hp:tc><hp:subList id=""><hp:p id="1"><hp:run charPrIDRef="0"><hp:t>구분</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="0" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
        <hp:tc><hp:subList id=""><hp:p id="2"><hp:run charPrIDRef="0"><hp:t>내용</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="1" rowAddr="0"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
      </hp:tr>
      <hp:tr>
        <hp:tc><hp:subList id=""><hp:p id="3"><hp:run charPrIDRef="0"><hp:t>성명</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="0" rowAddr="1"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
        <hp:tc><hp:subList id=""><hp:p id="4"><hp:run charPrIDRef="0"><hp:t>기존값</hp:t></hp:run></hp:p></hp:subList><hp:cellAddr colAddr="1" rowAddr="1"/><hp:cellSpan colSpan="1" rowSpan="1"/></hp:tc>
      </hp:tr>
    </hp:tbl>
  </hp:run></hp:p>
</hs:sec>`)

    const result = await fillHwpx(buffer, { 성명: "홍길동", 내용: "전입신고" })
    const zip = await JSZip.loadAsync(result.buffer)
    const xml = await zip.file("Contents/section0.xml")!.async("text")
    assert.ok(xml.includes("전입신고"), "전략 2 값이 최종 (last-write-wins)")
    assert.ok(!xml.includes("기존값"), "기존 값 교체됨")
    const labels = result.filled.map(f => f.label)
    assert.ok(labels.includes("성명") && labels.includes("내용"), "두 매칭 모두 filled 보고")
    assert.deepEqual(result.unmatched, [], "unmatched 누락 없음")
  })
})
