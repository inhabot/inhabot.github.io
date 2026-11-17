/**
 * PDF 표 후행 빈 열 정리 — HWPX·HWP5 표 빌더(`table/builder.ts` trimAndReturn)와 같은 규칙.
 *
 * 한컴 PDF 의 클립 셀 그리드는 원본 표의 칸을 그대로 담아, 원본에서 글이 한 자도 없는 마지막 열도 열로 낸다.
 * HWP 계열 파서는 그 열을 잘라 같은 문서가 포맷마다 열 수가 달라졌다(보도자료 머리표 2×3 ↔ 2×4, 행정업무운영
 * 편람 서식 15×6 ↔ 15×7 실측). 칸 단위로 전부 빈 마지막 열을 자르고, 잘린 열에 걸친 병합 셀은 표 폭 안으로 줄인다.
 * `keepTrailingEmptyCols`(#47, 서식 입력란 보존) 옵션이면 건드리지 않는다.
 */

import type { IRBlock, IRCell, IRTable } from "../types.js"
import { IMAGE_CELLS } from "./table-meta.js"

export function markImageCell(cell: IRCell): void { IMAGE_CELLS.add(cell) }

const emptyCell = (cell: IRCell | undefined): boolean => !cell || (!cell.text?.trim() && !cell.blocks?.length && !IMAGE_CELLS.has(cell))

function trimTable(table: IRTable): void {
  let cols = table.cols
  while (cols > 0 && table.cells.every(row => emptyCell(row[cols - 1]))) cols--
  if (cols === table.cols || cols === 0) return // 전부 빈 표는 그대로 (builder 와 동일)
  table.cells = table.cells.map(row => row.slice(0, cols))
  for (const row of table.cells) {
    for (let c = 0; c < row.length; c++) {
      if (c + row[c].colSpan > cols) row[c].colSpan = cols - c
    }
  }
  table.cols = cols
}

/** 블록 트리 전체(틀 셀 안 중첩표 포함)의 표에서 후행 빈 열을 제자리 정리 */
export function trimTrailingEmptyTableCols(blocks: IRBlock[]): void {
  for (const b of blocks) {
    if (b.type !== "table" || !b.table) continue
    for (const row of b.table.cells) for (const cell of row) if (cell.blocks?.length) trimTrailingEmptyTableCols(cell.blocks)
    trimTable(b.table)
  }
}

/**
 * 획·음영 사각형이 칸마다 조금씩 어긋나 생긴 실오라기 열(폭이 글자 크기 절반 미만)을 옆 열에 합친다 — 워드·구글 문서 음영 칸 표
 * ("# chromosomes" 칸만 왼끝이 2pt 밖에서 시작해 온 표에 빈 열이 하나 더 생김, ODL 119). 그 열의 칸이 모두 비었거나 옆 열로
 * 걸친 병합 칸일 때만 — 글이 든 좁은 열은 실제 열이다. 한컴 클립 표는 부르지 않는다(HWPX 정답에도 좁은 틈 열이 실재).
 * 합친 열 수를 돌려준다
 */
export function mergeSliverColumns(grid: IRCell[][], colXs: number[], maxWidth: number): number {
  let merged = 0
  for (let c = colXs.length - 2; c >= 0; c--) {
    const cols = colXs.length - 1
    if (cols <= 1 || colXs[c + 1] - colXs[c] >= maxWidth) continue
    // 칸 주인 — 병합 칸이 덮은 자리는 주인 칸
    const owner: (IRCell | null)[][] = grid.map(row => row.map(() => null))
    const anchorCol = new Map<IRCell, number>()
    for (let r = 0; r < grid.length; r++) for (let k = 0; k < cols; k++) {
      const cell = grid[r][k]
      if (!cell || owner[r][k]) continue
      anchorCol.set(cell, k)
      for (let dr = 0; dr < cell.rowSpan && r + dr < grid.length; dr++)
        for (let dc = 0; dc < cell.colSpan && k + dc < cols; dc++) owner[r + dr][k + dc] = cell
    }
    const ok = owner.every(row => {
      const o = row[c]
      return !!o && (o.colSpan > 1 || (!o.text.trim() && !o.blocks?.length))
    })
    if (!ok) continue
    // 이 열을 덮는 병합 칸은 한 칸 줄이고, 이 열에서 시작하는 병합 칸은 오른쪽 자리로 옮긴다
    const spanning = new Set<IRCell>()
    for (const row of owner) if (row[c]!.colSpan > 1) spanning.add(row[c]!)
    for (const cell of spanning) cell.colSpan--
    for (let r = 0; r < grid.length; r++) {
      if (grid[r][c] === owner[r][c] && spanning.has(grid[r][c])) grid[r][c + 1] = grid[r][c]
      grid[r].splice(c, 1)
    }
    colXs.splice(c + 1, 1)
    merged++
  }
  return merged
}
