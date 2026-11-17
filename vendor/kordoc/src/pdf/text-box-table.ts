/**
 * 보이지 않는 글상자 표 (슬라이드 PDF).
 *
 * 슬라이드 제작기는 글상자마다 불투명도 0(ExtGState ca=0) 채움 사각형을 깔고, 표의 회색 행 괘선은 래스터 그림에 구워 둔다
 * (ODL 200 "Service Stage | Function Name | Explanation | Expected Benefit": 벡터 괘선 0, 글상자 틀 45개). 틀 변을 괘선으로 읽으면
 * 칸마다 높이가 다른 틀이 어긋난 격자와 가짜 취소선이 되고(TEDS 0.17), 무괘선 경로는 칸 안 꺾인 줄을 행으로 갈라 논리 행을 잃는다.
 * 틀 자체가 칸이다 — 왼끝·오른끝이 같은 틀이 세 개 이상 쌓인 열이 셋 이상이고, 여러 열 틀이 윗변을 맞춘 행이 셋 이상이면 표로 세운다.
 * 행은 윗변을 맞춘 틀 묶음, 칸 글은 틀 밖으로 넘친 줄까지 윗변 기준으로 그 행에 넣는다. 차트 슬라이드의 축 눈금·범례 틀(ODL 199)은
 * 같은 폭 열이 셋 이상 서지 않아 표가 아니다.
 */

import type { IRCell } from "../types.js"
import type { ClipRect } from "./line-extract.js"
import { cellTextToString } from "./cell-text.js"
import type { NormItem } from "./text-line.js"
import type { RuledTable } from "./ruled-band-tables.js"

/** 같은 열 틀의 왼끝·오른끝 허용 (pt) */
const EDGE_TOL = 2
/** 같은 행 틀의 윗변 허용 (pt) — 글상자 안 위 여백이 칸마다 2.3pt 다르다(ODL 200) */
const TOP_TOL = 3
/** 표로 세울 최소 열·행 */
const MIN_COLS = 3
const MIN_ROWS = 3

export function detectTextBoxTables(boxes: ClipRect[], items: NormItem[], pageNum: number): RuledTable[] {
  // OCR 글(seq 없음)은 글상자 틀과 좌표 출처가 달라 쓰지 않는다
  const text = items.filter(it => it.seq !== undefined && it.text.trim())
  const inBox = (b: ClipRect, it: NormItem) => {
    const cx = it.x + it.w / 2, cy = it.y + (it.h || it.fontSize) / 2
    return cx >= b.x1 && cx <= b.x2 && cy >= b.y1 && cy <= b.y2
  }
  // 글이 든 틀만 — 그림 자리·빈 틀은 칸 증거가 아니다
  const filled = boxes.filter(b => text.some(it => inBox(b, it)))
  // 같은 폭 열: 왼끝·오른끝이 같은 틀 묶음
  const cols: ClipRect[][] = []
  for (const b of filled) {
    const c = cols.find(g => Math.abs(g[0].x1 - b.x1) <= EDGE_TOL && Math.abs(g[0].x2 - b.x2) <= EDGE_TOL)
    if (c) c.push(b)
    else cols.push([b])
  }
  const tableCols = cols.filter(g => g.length >= MIN_ROWS).sort((a, b) => a[0].x1 - b[0].x1)
  if (tableCols.length < MIN_COLS) return []
  // 열끼리 겹치면 같은 표의 칸 열이 아니다
  for (let i = 1; i < tableCols.length; i++) if (tableCols[i][0].x1 < tableCols[i - 1][0].x2 - EDGE_TOL) return []
  // 행: 두 열 이상 틀이 윗변을 맞춘 묶음 (위 → 아래)
  const tops = tableCols.flatMap((g, c) => g.map(b => ({ top: b.y2, bottom: b.y1, c }))).sort((a, b) => b.top - a.top)
  const rows: Array<{ top: number; bottom: number; cols: Set<number> }> = []
  for (const t of tops) {
    const last = rows[rows.length - 1]
    if (last && last.top - t.top <= TOP_TOL && !last.cols.has(t.c)) {
      last.cols.add(t.c)
      last.bottom = Math.min(last.bottom, t.bottom)
    } else rows.push({ top: t.top, bottom: t.bottom, cols: new Set([t.c]) })
  }
  const anchored = rows.filter(r => r.cols.size >= 2)
  if (anchored.length < MIN_ROWS || anchored.length < rows.length * 0.8) return []
  const x1 = tableCols[0][0].x1, x2 = tableCols[tableCols.length - 1][0].x2
  const top = anchored[0].top, bottom = anchored[anchored.length - 1].bottom
  // 칸 글: 표 폭 안, 첫 행 윗변 ~ 끝 행 아랫변 사이 — 틀 밖으로 넘친 줄도 윗변 기준으로 그 행
  const used = text.filter(it => {
    const cx = it.x + it.w / 2, itTop = it.y + (it.h || it.fontSize)
    return cx >= x1 - EDGE_TOL && cx <= x2 + EDGE_TOL && itTop <= top + TOP_TOL && it.y >= bottom - TOP_TOL
  })
  if (used.length === 0) return []
  const colOf = (it: NormItem) => {
    let c = 0
    for (let k = 1; k < tableCols.length; k++) if (it.x >= tableCols[k][0].x1 - EDGE_TOL) c = k
    return c
  }
  const rowOf = (it: NormItem) => {
    const itTop = it.y + (it.h || it.fontSize)
    let r = 0
    for (let k = 1; k < anchored.length; k++) if (itTop <= anchored[k].top + TOP_TOL) r = k
    return r
  }
  const grid: NormItem[][][] = anchored.map(() => tableCols.map(() => []))
  for (const it of used) grid[rowOf(it)][colOf(it)].push(it)
  const cells: IRCell[][] = grid.map(row => row.map(its => ({ text: cellTextToString(its.map(it => ({ ...it }))), colSpan: 1, rowSpan: 1 })))
  return [{
    block: {
      type: "table",
      table: { rows: cells.length, cols: tableCols.length, cells, hasHeader: true },
      pageNumber: pageNum,
      bbox: { page: pageNum, x: x1, y: bottom, width: x2 - x1, height: top - bottom },
    },
    items: used,
  }]
}
