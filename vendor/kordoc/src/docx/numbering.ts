/**
 * DOCX 번호 매기기 라벨 — w:lvlText("%1."·"%1.%2"·"[%1]"·"보기") 와 수준별 카운터로 실제 번호를 만든다.
 * 종전엔 번호 목록을 모두 마크다운 "1." 로 냈다: 참고문헌 "[3] ISO 233" 이 "1. ISO 233" 이 되고, 번호 매긴 제목("5.1 개요")은 번호를 잃었다.
 * 카운터는 abstractNum 마다 하나다 — 같은 모양을 쓰는 numId 들은 번호를 잇는다(kats: 첫 제목만 번호 28, 나머지는 스타일 번호 20 인데
 * PDF 는 1·2·3 으로 잇는다). startOverride 가 걸린 numId 는 처음 쓰일 때 그 수준을 다시 센다. 한 수준이 나오면 그보다 깊은 수준은
 * 처음부터 다시 센다. 형식 변환은 HWP5 번호와 공유
 */

import { formatNumber, type NumFmt } from "../hwp5/numbering.js"

export interface LevelDef {
  numFmt: string; lvlText: string; start: number
  /** 카운터를 나눠 쓰는 목록(abstractNumId) — 없으면 numId */
  list?: string
  /** 이 numId 의 startOverride — 처음 쓰일 때 다시 센다 */
  restart?: boolean
}

/** w:numFmt → 번호 글꼴 (모르는 형식은 아라비아 숫자) */
const FMT: Record<string, NumFmt> = {
  upperRoman: "romanUpper", lowerRoman: "romanLower", upperLetter: "latinUpper", lowerLetter: "latinLower",
  ganada: "ganada", chosung: "jamo", decimalEnclosedCircle: "circled", koreanDigital: "hangulNum", ideographDigital: "hanjaNum",
}

function format(n: number, numFmt: string): string {
  if (numFmt === "decimalZero") return n < 10 ? `0${n}` : String(n)
  return formatNumber(n, FMT[numFmt] ?? ("digit" as NumFmt))
}

export class ListCounter {
  private readonly counts = new Map<string, Array<number | undefined>>()
  private readonly used = new Set<string>()

  /** numId·ilvl 문단 하나를 세고 라벨을 낸다 — 글머리표(bullet)는 null, 번호 없는 수준(none·빈 lvlText)은 "" */
  next(numId: string, ilvl: number, levels: Map<number, LevelDef>): string | null {
    const lv = levels.get(ilvl)
    if (lv?.numFmt === "bullet") return null
    const key = [...levels.values()].find(l => l.list !== undefined)?.list ?? numId
    const c = this.counts.get(key) ?? []
    if (!this.used.has(numId)) {
      this.used.add(numId)
      for (const [k, l] of levels) if (l.restart) c[k] = undefined
    }
    c[ilvl] = (c[ilvl] ?? (lv?.start ?? 1) - 1) + 1
    for (let k = ilvl + 1; k < c.length; k++) c[k] = undefined
    this.counts.set(key, c)
    if (!lv || lv.numFmt === "none") return ""
    return lv.lvlText.replace(/%([1-9])/g, (_m, d: string) => {
      const k = Number(d) - 1
      return format(c[k] ?? levels.get(k)?.start ?? 1, levels.get(k)?.numFmt ?? "decimal")
    }).trim()
  }
}
