/**
 * 미주를 참조 자리로 — 한컴 미주는 본문에 참조 표시("문1）")를 찍고 문서 끝에 같은 표시로 시작하는 미주 본문을 모아 찍는다.
 * HWPX·HWP5 파서는 미주를 참조 자리에 끼워 내므로(notes.ts) PDF 만 해설이 문서 끝에 몰려 순서가 어긋났다(수능 모의고사 해설).
 * 문서 뒤쪽의 미주 머리 블록마다 같은 표시가 앞쪽 본문(표 칸 글 포함)에 딱 한 번 나오고, 그 짝이 셋 이상 본문 순서대로 이어질 때만
 * 미주 묶음(머리 블록부터 다음 머리 전까지)을 참조 블록 바로 뒤로 옮긴다. 목차의 번호·표 번호는 참조에서 빼고,
 * 블록은 합치지 않고 옮기기만 한다(미주 안 표·수식 구조 유지).
 */

import type { IRBlock } from "../types.js"

// 한컴 미주 번호 문1）와 숫자 주석 번호 1)·(1)만 후보로 본다.
// 표1) 같은 표 번호나 수식 f(1)은 주석 머리가 아니다.
const NOTE_MARK = /^\s*(문\d{1,5}[）)]|\d{1,5}\)|\(\d{1,5}\))/

function isContentsReference(text: string, at: number): boolean {
  // 목차가 한 표 블록에 통째로 담기기도 한다. 그 표 안의 번호는 본문 참조가 아니다.
  if (/(?:^|\n)\s*\|?\s*(?:목\s*차|(?:table of )?contents\b)/i.test(text.slice(0, 120))) return true
  const lineStart = text.lastIndexOf("\n", at - 1) + 1
  const lineEnd = text.indexOf("\n", at)
  const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd)
  return /[·⋯.…]{5,}/.test(line)
}

function blockText(b: IRBlock): string {
  if (b.table) return b.table.cells.flat().map(c => c.text).join("\n")
  return b.text ?? ""
}

export function relocateEndnotes(blocks: IRBlock[]): IRBlock[] {
  const texts = blocks.map(blockText)
  /** end 앞 블록에서 mark 가 나오는 블록 번호(한 블록에 두 번이면 두 번) — cap 개까지만 */
  const occurrences = (mark: string, end: number, cap: number): number[] => {
    const out: number[] = []
    for (let j = 0; j < end && out.length < cap; j++) {
      for (let at = texts[j].indexOf(mark); at >= 0 && out.length < cap; at = texts[j].indexOf(mark, at + mark.length)) {
        // 목차 줄·문단 첫머리 번호(숫자 표시)도 등장으로 센다 — 유일성 보호는 그대로 두고, 유일한 등장이 이런 자리면 참조가 아니다(-1)
        const notRef = isContentsReference(texts[j], at) || (!mark.startsWith("문") && !texts[j].slice(0, at).trim())
        out.push(notRef ? -1 : j)
      }
    }
    return out
  }
  const cands: Array<{ idx: number; mark: string; shape: string }> = []
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (b.type !== "paragraph" && b.type !== "list" && b.type !== "heading") continue
    const m = NOTE_MARK.exec(texts[i])
    if (m) cands.push({ idx: i, mark: m[1], shape: m[1].replace(/\d+/g, "#") })
  }
  const heads: Array<{ idx: number; ref: number; shape: string }> = []
  for (const c of cands) {
    const refs = occurrences(c.mark, c.idx, 2)
    if (refs.length === 1 && refs[0] >= 0) heads.push({ idx: c.idx, ref: refs[0], shape: c.shape })
  }
  // 미주 머리는 한 가지 번호 꼴("문#）")이다 — 미주 안 소항목("ⅰ)"·"(나)")이 앞 미주 글과 짝지어져 구간을 끊지 않게 가장 흔한 꼴만
  const shapes = new Map<string, number>()
  for (const h of heads) shapes.set(h.shape, (shapes.get(h.shape) ?? 0) + 1)
  const main = [...shapes].sort((a, b) => b[1] - a[1])[0]?.[0]
  if (!main || !/#/.test(main)) return blocks
  // 문서 끝 쪽으로 이어진 짝 — 참조가 본문 순서대로 늘어나는 마지막 연속 구간
  const lastRun = (hs: typeof heads): typeof heads => {
    let run: typeof heads = []
    for (const h of hs) {
      if (run.length && (h.ref < run[run.length - 1].ref || h.ref >= run[0].idx)) run = []
      run.push(h)
    }
    return run
  }
  const firstRun = lastRun(heads.filter(h => h.shape === main))
  if (firstRun.length < 3) return blocks
  // 선택과목마다 번호가 다시 시작하는 미주("문23）" 이 앞쪽 과목마다 한 번씩) — 미주 구간 앞쪽에 k번 나오는 표시는
  // 구간 안 같은 표시 머리 k개와 차례로 짝짓는다. 개수가 다르면 그 표시는 머리로 보지 않는다
  const tailByMark = new Map<string, number[]>()
  for (const c of cands) if (c.idx >= firstRun[0].idx && c.shape === main) tailByMark.set(c.mark, [...(tailByMark.get(c.mark) ?? []), c.idx])
  const paired: typeof heads = []
  for (const [mark, idxs] of tailByMark) {
    const refs = occurrences(mark, firstRun[0].idx, idxs.length + 1)
    if (refs.length === idxs.length && refs.every(r => r >= 0)) idxs.forEach((idx, k) => paired.push({ idx, ref: refs[k], shape: main }))
  }
  const run = lastRun(paired.sort((a, b) => a.idx - b.idx))
  if (run.length < 3) return blocks
  // 미주 묶음은 번호가 1부터 거의 빈틈없이 이어진다(선택과목마다 앞 번호로 되돌아가는 것 허용, 머리가 본문 줄에 섞여 빠진 몇 개 허용)
  // — 절마다 다시 시작하는 목록의 뒤 토막("(7)(8)(9)", RFP)·마지막 쪽 아래 각주("5)~9)")는 1에서 시작하지 않는다
  const nums = run.map(h => Number(/\d+/.exec(texts[h.idx])![0]))
  if (nums[0] !== 1 || new Set(nums).size < Math.max(...nums) * 0.8) return blocks
  const start = run[0].idx
  // 구간 안에 짝 없는 머리가 있으면(다른 번호 체계) 손대지 않는다 — 앞 미주에 이어 붙은 본문 문단은 괜찮다
  const groups = run.map((h, k) => ({ ref: h.ref, blocks: blocks.slice(h.idx, k + 1 < run.length ? run[k + 1].idx : blocks.length) }))
  const byRef = new Map<number, IRBlock[]>()
  for (const g of groups) byRef.set(g.ref, [...(byRef.get(g.ref) ?? []), ...g.blocks])
  const out: IRBlock[] = []
  for (let i = 0; i < start; i++) {
    out.push(blocks[i])
    const notes = byRef.get(i)
    if (notes) out.push(...notes)
  }
  return out
}
