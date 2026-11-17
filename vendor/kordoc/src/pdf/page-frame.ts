/**
 * 쪽 틀 — 쪽 테두리 상자(시험지·교재 바탕쪽)는 표가 아니다. 쪽 대부분을 덮는 선 격자가 큰 칸(쪽 면적 15% 이상) 몇 개로
 * 쪽의 절반 넘게 채워지면 그 칸들은 본문 영역이다(단 구분선이 틀에 닿으면 단마다 한 칸, 틀 안 표 괘선이 틀에 이어지면 더 쪼개진다).
 * 표로 세우면 두 단 본문이 한 칸 글로 줄마다 섞인다(수능 모의고사 "문6）…문1）" — 단 구분선이 틀에 닿지 않아 칸을 가르지 못함).
 * 표로 세우지 않고 글을 쪽 본문 경로(두 단 거터·괘선 구분선)에 넘긴다. 틀 안 표는 칸 클립 격자가 따로 세운다.
 * 몸통에 가로 괘선이 없는 표(예산서 — 머리 칸만 선, 몸통은 쪽 절반 넘는 한 칸)는 몸통 글이 머리 칸 열 경계 안에 들어앉는다.
 * 틀은 본문 글줄이 격자의 안쪽 열 경계(머리 띠·틀 안 표에서 온 x)를 가로지른다 — 가로지르는 글이 없으면 표로 둔다
 */

import type { TableGrid } from "./line-detector.js"

export function isPageFrameGrid(grid: TableGrid, cells: Array<{ bbox: { x1: number; y1: number; x2: number; y2: number } }>, pageWidth: number, pageHeight: number, items: Array<{ x: number; y: number; w: number; h: number }> = []): boolean {
  const b = grid.bbox
  if (grid.cells || b.x2 - b.x1 < pageWidth * 0.85 || b.y2 - b.y1 < pageHeight * 0.75) return false
  const pageArea = pageWidth * pageHeight
  const area = (c: { bbox: { x1: number; y1: number; x2: number; y2: number } }) => (c.bbox.x2 - c.bbox.x1) * (c.bbox.y2 - c.bbox.y1)
  const big = cells.filter(c => area(c) >= pageArea * 0.15)
  if (big.reduce((s, c) => s + area(c), 0) < pageArea * 0.5) return false
  const inner = grid.colXs.slice(1, -1)
  const inBig = items.filter(it => big.some(c => { const cx = it.x + it.w / 2, cy = it.y + it.h / 2; return cx > c.bbox.x1 && cx < c.bbox.x2 && cy > c.bbox.y1 && cy < c.bbox.y2 }))
  const crossing = inBig.filter(it => inner.some(x => x > it.x + 1 && x < it.x + it.w - 1)).length
  return inner.length === 0 || (crossing >= 1 && crossing >= inBig.length * 0.01)
}
