/**
 * 심볼 폰트(Wingdings 등) 글리프 코드 → 유니코드 복원.
 *
 * 한컴 PDF 는 서식의 처리절차 화살표·체크박스를 Wingdings 심볼 폰트로 찍는다. pdfjs 는
 * 심볼릭 폰트의 코드를 Latin-1 문자로 그대로 돌려주므로(0xE8 → "è") 마크다운에 깨진
 * 라틴 문자가 남는다 (법제처 별지서식 PDF 실측, v4.12.1). 폰트 실명(commonObjs)이
 * Wingdings 이면 코드를 표준 유니코드로 되돌린다.
 *
 * 코드표는 src/shared/symbol-fonts.ts (HWP/HWPX 심볼 PUA 와 공용 SSOT).
 */

import type { NormItem } from "./text-line.js"
import { WINGDINGS } from "../shared/symbol-fonts.js"

/** WinAnsi(CP1252) 0x80~0x9F 구간 — pdfjs 가 이미 CP1252 문자로 돌려준 경우 코드 복원 */
const WINANSI_REVERSE: Record<number, number> = {
  0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87,
  0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91,
  0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98,
  0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F,
}

/** 폰트 실명이 심볼 폰트인지 — 서브셋 접두(ABCDEF+)·"-Regular" 접미 무관 */
export function symbolFontTable(fontName: string | undefined): readonly string[] | undefined {
  if (!fontName) return undefined
  // Wingdings 2·3, Webdings 는 별도 코드표 — 매핑 없이 두면 오히려 잘못된 글자가 되므로 제외
  if (/wingdings(?![\s-]*[23])/i.test(fontName)) return WINGDINGS
  return undefined
}

/** 한 문자열을 심볼 코드표로 되돌린다 — 표 밖 코드(제어·공백)는 그대로 */
export function remapSymbolText(text: string, table: readonly string[]): string {
  let out = ""
  for (const ch of text) {
    let code = ch.codePointAt(0)!
    if (code >= 0x80 && WINANSI_REVERSE[code] !== undefined) code = WINANSI_REVERSE[code]
    if (code >= 0x21 && code <= 0xFF) {
      const mapped = table[code - 0x21]
      out += mapped !== undefined && mapped !== "" ? mapped : ch
    } else {
      out += ch
    }
  }
  return out
}

/**
 * 페이지 텍스트 아이템의 심볼 폰트 글리프를 유니코드로 복원 (제자리).
 * @param resolveFontName pdfjs loadedName(g_d0_f6) → 폰트 실명. 미로드·실패 시 undefined
 * @returns 바뀐 아이템 수
 */
export function remapSymbolFontItems(items: NormItem[], resolveFontName: (loadedName: string) => string | undefined): number {
  const cache = new Map<string, readonly string[] | undefined>()
  const marlett = new Map<string, boolean>()
  let changed = 0
  let box: NormItem | null = null
  const drop = new Set<NormItem>()
  for (const it of items) {
    if (!it.fontName || !it.text) continue
    // Windows 양식 선택 상자(Marlett) — 상자 테두리 조각 g·f·e·d·c 를 같은 자리에 겹쳐 찍고 체크는 b (한컴 PDF 양식 개체,
    // form-002 "gfedc 원천기술형"). 테두리 첫 조각을 ☐ 로 두고 나머지는 지우며, 같은 자리의 b 는 그 상자를 ☑ 로 바꾼다
    if (!marlett.has(it.fontName)) marlett.set(it.fontName, /marlett/i.test(resolveFontName(it.fontName) ?? ""))
    if (marlett.get(it.fontName)) {
      const t = it.text.trim()
      if (t === "g") { it.text = "☐"; box = it; changed++ }
      else if (/^[c-f]$/.test(t)) { drop.add(it); changed++ }
      else if (t === "b" && box && Math.abs(box.x - it.x) <= 1 && Math.abs(box.y - it.y) <= 1) { box.text = "☑"; drop.add(it); changed++ }
      continue
    }
    let table = cache.get(it.fontName)
    if (!cache.has(it.fontName)) {
      table = symbolFontTable(resolveFontName(it.fontName))
      cache.set(it.fontName, table)
    }
    if (!table) continue
    const mapped = remapSymbolText(it.text, table)
    if (mapped !== it.text) { it.text = mapped; changed++ }
  }
  if (drop.size) for (let k = items.length - 1; k >= 0; k--) if (drop.has(items[k])) items.splice(k, 1)
  return changed
}
