/**
 * 각주를 참조 문단으로 — HWPX·HWP5 파서는 각주를 참조가 있는 문단 끝에 " (주: 6) …)" 로 끼운다(notes.ts, footnoteText).
 * PDF 는 각주를 쪽 아래에 따로 찍어 본문 순서·어절이 어긋났다(선박 코드 부속서 91개). 쪽 아래 문단이 본문 위첨자 참조 표시와
 * 같은 "N)" 로 시작하면 그 문단(과 표시 없이 이어지는 문단)을 참조 문단의 footnoteText 로 옮긴다. 한 문단의 각주 여럿은 "; " 로 잇는다.
 * 위첨자 표시 = 앞 글자에 붙어(간격 1.5pt 이하) 작고(0.85배 이하) 기준선이 올라간 "N)" 아이템 — 목록 번호 "1)" 과 가른다.
 * 각주 띠는 바로 위(20pt 안)에 각주 구분선(왼쪽 여백부터 긋는 짧은 가로선, 한컴·워드 기본)이 있어야 한다 — 쪽 아래에 글로 친
 * 가짜 각주(KS 표준안 "8) Xerox®는 …" 문단)는 원본에서도 본문 문단이다. 이어짐 문단은 앞 문단에 줄 높이 1.5배 안으로 붙고
 * 쪽 번호 꼴("- 3 -")이 아닌 것만
 */

import type { IRBlock } from "../types.js"
import type { NormItem } from "./text-line.js"

const MARK = /^\d{1,3}\)$/

export interface NoteMark { mark: string; y: number }
/** 쪽마다 위첨자 참조 표시와 각주 구분선 y */
export interface PageNotes { marks: NoteMark[]; seps: number[] }

/** 각주 구분선 후보 — 쪽 아래 60% 안 짧은 가로선(폭 30pt 이상·쪽 폭 45% 이하) */
export function footnoteSeparators(horizontals: Array<{ x1: number; x2: number; y1: number }>, pageWidth: number, pageHeight: number): number[] {
  return horizontals.filter(l => l.x2 - l.x1 >= 30 && l.x2 - l.x1 <= pageWidth * 0.45 && l.y1 < pageHeight * 0.6).map(l => l.y1)
}

export function superscriptNoteMarks(items: NormItem[]): NoteMark[] {
  const out: NoteMark[] = []
  for (const m of items) {
    if (!MARK.test(m.text)) continue
    const glued = items.some(p => p !== m && Math.abs(p.x + p.w - m.x) <= 1.5 && m.fontSize <= p.fontSize * 0.85 &&
      m.y - p.y >= p.fontSize * 0.1 && m.y - p.y <= p.fontSize * 0.6 && /[\p{L}\p{N}.,)'"’”」』]$/u.test(p.text))
    if (glued && !out.some(o => o.mark === m.text)) out.push({ mark: m.text, y: m.y })
  }
  return out
}

/** 글 속 참조 표시 자리 — 앞 글자가 공백이 아닌 곳 */
function refAt(text: string, mark: string): boolean {
  for (let at = text.indexOf(mark); at >= 0; at = text.indexOf(mark, at + 1)) if (at > 0 && !/\s/.test(text[at - 1])) return true
  return false
}

export function inlineFootnotes(blocks: IRBlock[], pages: Map<number, PageNotes>): IRBlock[] {
  if (!pages.size) return blocks
  const byPage = new Map<number, IRBlock[]>()
  for (const b of blocks) if (b.pageNumber !== undefined) byPage.set(b.pageNumber, [...(byPage.get(b.pageNumber) ?? []), b])
  const drop = new Set<IRBlock>()
  const isText = (b: IRBlock) => (b.type === "paragraph" || b.type === "list") && !!b.text
  const top = (b: IRBlock) => b.bbox!.y + b.bbox!.height
  for (const [page, { marks, seps }] of pages) {
    const pb = byPage.get(page)
    if (!pb || !seps.length) continue
    // 표시로 시작하고 참조 표시보다 아래, 구분선 아래에 놓인 문단
    const markOf = (b: IRBlock) => b.bbox ? marks.find(m => {
      const t = b.text!.trimStart()
      return t.startsWith(m.mark) && /^\s/.test(t.slice(m.mark.length)) && top(b) < m.y && seps.some(y => y >= top(b))
    }) : undefined
    let start = -1
    for (let j = pb.length - 1; j >= 0 && isText(pb[j]); j--) if (markOf(pb[j])) start = j
    if (start < 0) continue
    // 첫 각주 바로 위(20pt 안)에 구분선
    if (!seps.some(y => y >= top(pb[start]) && y - top(pb[start]) <= 20)) continue
    const notes: Array<{ text: string; blocks: IRBlock[]; mark: string }> = []
    let open = true
    for (let j = start; j < pb.length; j++) {
      const b = pb[j], m = markOf(b)
      if (m) { notes.push({ text: b.text!.trim(), blocks: [b], mark: m.mark }); open = true; continue }
      const prev = pb[j - 1], line = (b.style?.fontSize ?? b.bbox?.height ?? 10) * 1.5
      if (open && b.bbox && prev.bbox && prev.bbox.y - top(b) <= line && !/^[-–—\s\d]+$/.test(b.text!)) {
        notes[notes.length - 1].text += " " + b.text!.trim()
        notes[notes.length - 1].blocks.push(b)
      } else open = false
    }
    const body = pb.slice(0, start)
    for (const n of notes) {
      const host = body.find(b => (b.type === "paragraph" || b.type === "list" || b.type === "heading") && !!b.text && refAt(b.text, n.mark))
      if (!host) continue
      host.footnoteText = host.footnoteText ? `${host.footnoteText}; ${n.text}` : n.text
      for (const b of n.blocks) drop.add(b)
    }
  }
  return drop.size ? blocks.filter(b => !drop.has(b)) : blocks
}
