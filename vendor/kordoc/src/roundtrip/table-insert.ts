/**
 * 라운드트립 표 삽입 — 문단(텍스트)을 표로 인플레이스 변환할 때 쓰는 표 XML 빌더.
 *
 * patchHwpx에서 편집된 마크다운의 한 문단이 표(GFM/HTML)로 바뀐 경우, 원본
 * <hp:p> 범위를 여기서 만든 표 문단 XML로 splice 치환한다. 표 셀 테두리는
 * 원본 header.xml의 <hh:borderFills>에 실선 borderFill을 1개 append해 참조한다
 * (기존 리소스는 1바이트도 건드리지 않고 새 id만 추가).
 *
 * 표 XML 골격은 generator.ts generateTable과 동일(한컴이 거부하지 않는 필수
 * 속성 세트 — 이슈 #4)하되, borderFill/charPr/paraPr/instId를 원본 문서 좌표에
 * 맞춰 파라미터화한다.
 */

import { escapeXmlText, type SpliceEdit } from "./source-map.js"
import { unescapeGfmCell } from "./markdown-units.js"

// 표 기본 치수 (HWPUnit) — generator.ts generateTable과 동일
const TABLE_USABLE_WIDTH = 44000 // A4 portrait 본문 폭 근사
const TABLE_ROW_HEIGHT = 1500

/** 문서 내 `id="<숫자>"` 속성의 최댓값 — 새 instId/borderFill id 충돌 회피용 */
export function collectMaxNumericId(xmls: string[]): number {
  let max = -1
  for (const xml of xmls) {
    for (const m of xml.matchAll(/\bid(?:Ref)?="(\d{1,10})"/g)) {
      const v = parseInt(m[1], 10)
      if (!isNaN(v) && v > max) max = v
    }
  }
  return max
}

/** 표 셀 실선 테두리 borderFill 정의 (generator.ts header id=1과 동일 구조) */
function cellBorderFillXml(id: number): string {
  return `<hh:borderFill id="${id}" threeD="0" shadow="0" centerLine="0" breakCellSeparateLine="0">`
    + `<hh:slash type="NONE" Crooked="0" isCounter="0"/>`
    + `<hh:backSlash type="NONE" Crooked="0" isCounter="0"/>`
    + `<hh:leftBorder type="SOLID" width="0.12 mm" color="#000000"/>`
    + `<hh:rightBorder type="SOLID" width="0.12 mm" color="#000000"/>`
    + `<hh:topBorder type="SOLID" width="0.12 mm" color="#000000"/>`
    + `<hh:bottomBorder type="SOLID" width="0.12 mm" color="#000000"/>`
    + `<hh:diagonal type="NONE" width="0.1 mm" color="#000000"/>`
    + `<hh:fillInfo/>`
    + `</hh:borderFill>`
}

export interface BorderFillInjection {
  /** 새로 추가된 borderFill의 id (표 셀이 참조) */
  borderFillId: number
  /** header.xml에 적용할 splice들 (itemCnt 증가 + borderFill append) */
  headerSplices: SpliceEdit[]
}

/**
 * header.xml의 <hh:borderFills>에 실선 borderFill을 1개 추가하는 splice를 만든다.
 * 기존 borderFill은 그대로 두고 새 id만 append. 구조를 못 찾으면 null.
 *
 * @param headerXml 원본 header.xml
 * @param newId     부여할 borderFill id (문서 전역 max+1 등 충돌 없는 값)
 */
export function injectCellBorderFill(headerXml: string, newId: number): BorderFillInjection | null {
  const openM = headerXml.match(/<hh:borderFills\b([^>]*)>/)
  if (!openM || openM.index === undefined) return null
  const closeIdx = headerXml.indexOf("</hh:borderFills>")
  if (closeIdx < 0) return null

  const splices: SpliceEdit[] = []

  // itemCnt 1 증가 (있으면) — 없으면 한컴이 자식 수로 추정하므로 생략 가능
  const itemCntM = openM[1].match(/\bitemCnt="(\d+)"/)
  if (itemCntM && itemCntM.index !== undefined) {
    const cnt = parseInt(itemCntM[1], 10)
    const attrStart = openM.index + "<hh:borderFills".length + itemCntM.index
    const valStart = attrStart + itemCntM[0].indexOf('"') + 1
    const valEnd = valStart + String(cnt).length
    splices.push({ start: valStart, end: valEnd, replacement: String(cnt + 1) })
  }

  // 닫는 태그 앞에 새 borderFill append
  splices.push({ start: closeIdx, end: closeIdx, replacement: cellBorderFillXml(newId) })

  return { borderFillId: newId, headerSplices: splices }
}

/** GFM/HTML 셀 마크다운 → 셀 평문 (인라인 서식 제거, 줄바꿈은 공백 병합) */
function cellPlainText(raw: string): string {
  let t = unescapeGfmCell(raw) // <br>→\n, \|→|, \~→~
  // 인라인 마크다운 평문화 — 원본 header에 대응 charPr가 없으므로 서식 없이 텍스트만
  t = t.replace(/\*\*\*([^*]+)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
  // 셀 내 줄바꿈은 한 문단으로 (셀당 단일 hp:p)
  return t.replace(/\s*\n\s*/g, " ").trim()
}

export interface BuildTableOptions {
  borderFillId: number
  /** 표를 담는 바깥 문단의 paraPrIDRef (원본 문단 속성 승계) */
  outerParaPrId: number
  /** 셀 내부 문단/런이 참조할 paraPr·charPr id (원본에 존재하는 기본값, 보통 0) */
  cellParaPrId: number
  cellCharPrId: number
  /** 표 instId (문서 전역 유니크) */
  tableId: number
}

/**
 * 표 행렬 → 인플레이스 삽입용 표 문단 XML.
 * generator.ts generateTable과 동일한 필수 속성 골격(한컴 호환), 리소스 id만 원본 좌표.
 */
export function buildTableParagraphXml(rows: string[][], opts: BuildTableOptions): string {
  const { borderFillId, outerParaPrId, cellParaPrId, cellCharPrId, tableId } = opts
  const rowCnt = rows.length
  const colCnt = Math.max(...rows.map(r => r.length), 1)
  const cellW = Math.floor(TABLE_USABLE_WIDTH / colCnt)
  const cellH = TABLE_ROW_HEIGHT
  const tblW = cellW * colCnt
  const tblH = cellH * rowCnt

  const trElements = rows.map((row, rowIdx) => {
    const cells = row.length < colCnt ? [...row, ...Array(colCnt - row.length).fill("")] : row
    const isHeaderRow = rowIdx === 0
    const tdElements = cells.map((cell, colIdx) => {
      const text = escapeXmlText(cellPlainText(cell))
      const cellP = `<hp:p paraPrIDRef="${cellParaPrId}" styleIDRef="0"><hp:run charPrIDRef="${cellCharPrId}"><hp:t>${text}</hp:t></hp:run></hp:p>`
      return `<hp:tc name="" header="${isHeaderRow ? 1 : 0}" hasMargin="0" protect="0" editable="1" dirty="0" borderFillIDRef="${borderFillId}">`
        + `<hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="TOP" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${cellP}</hp:subList>`
        + `<hp:cellAddr colAddr="${colIdx}" rowAddr="${rowIdx}"/>`
        + `<hp:cellSpan colSpan="1" rowSpan="1"/>`
        + `<hp:cellSz width="${cellW}" height="${cellH}"/>`
        + `<hp:cellMargin left="141" right="141" top="141" bottom="141"/>`
        + `</hp:tc>`
    }).join("")
    return `<hp:tr>${tdElements}</hp:tr>`
  }).join("")

  const tblInner = `<hp:sz width="${tblW}" widthRelTo="ABSOLUTE" height="${tblH}" heightRelTo="ABSOLUTE" protect="0"/>`
    + `<hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="0" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="PARA" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/>`
    + `<hp:outMargin left="0" right="0" top="0" bottom="0"/>`
    + `<hp:inMargin left="510" right="510" top="141" bottom="141"/>`
    + trElements

  const tbl = `<hp:tbl id="${tableId}" zOrder="0" numberingType="TABLE" pageBreak="CELL" repeatHeader="0" rowCnt="${rowCnt}" colCnt="${colCnt}" cellSpacing="0" borderFillIDRef="${borderFillId}" noShading="0">${tblInner}</hp:tbl>`

  // 표는 문단 안의 run에 inline-anchored (generator.ts와 동일)
  return `<hp:p paraPrIDRef="${outerParaPrId}" styleIDRef="0"><hp:run charPrIDRef="${cellCharPrId}">${tbl}</hp:run></hp:p>`
}
