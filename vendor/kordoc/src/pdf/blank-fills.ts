/**
 * 밑줄 빈칸 — 서식 채움 "翻译成 ______ （语言）"·"성명 ______ (인)" 의 빈칸은 글이 없고 기준선에 밑줄만 긋는다.
 * 읽기 순서(XY-Cut)는 글 아이템만 보므로 빈칸 두 줄이 같은 x 에 걸치면 그 빈 띠를 단 사이로 잘라 줄 뒤쪽 조각을 문단 밖으로 뺐다
 * (kpipa 계약서 중문 "…（Proprietor）____，与海外" → "，与海外" 가 다음 줄 뒤로), 클러스터 표 감지는 빈칸을 열 사이로 읽었다.
 * 빈칸 왼쪽 글 아이템을 빈칸 끝까지 넓히고 공백 한 칸을 붙이고, 빈칸 밑줄은 선 목록에서 뺀다(가로선만 있는 괘선 띠 표로
 * 읽히지 않게) — 원본(DOCX)의 빈칸도 밑줄 친 공백이다.
 * 같은 줄 글이 밑줄 양 끝에 맞닿아(6pt 안) 있고, 밑줄이 글자 두 자 넘게 길고, 끝이 세로선에 닿지 않아야(표 괘선 조각) 빈칸이다
 */

import type { LineSegment } from "./line-types.js"
import type { NormItem } from "./text-line.js"

/** 밑줄 양 끝과 이웃 글 사이 허용 틈 (pt) */
const FILL_EDGE_GAP = 6
/** 밑줄 최대 두께 (pt) */
const FILL_MAX_THICKNESS = 2

export function fillBlanks(items: NormItem[], horizontals: LineSegment[], verticals: LineSegment[] = []): { items: NormItem[]; horizontals: LineSegment[] } {
  const widened = new Map<NormItem, NormItem>()
  const used = new Set<LineSegment>()
  for (const h of horizontals) {
    if (h.lineWidth > FILL_MAX_THICKNESS || Math.abs(h.y1 - h.y2) > 1) continue
    const x1 = Math.min(h.x1, h.x2), x2 = Math.max(h.x1, h.x2)
    // 기준선 바로 아래(글자 크기 0.5배 안) 같은 줄 글
    const row = items.filter(i => i.y >= h.y1 && i.y - h.y1 <= Math.max(3, i.fontSize * 0.5))
    const left = row.find(i => i.x + i.w <= x1 + 1 && x1 - (i.x + i.w) <= FILL_EDGE_GAP)
    const right = row.find(i => i.x >= x2 - 1 && i.x - x2 <= FILL_EDGE_GAP)
    // 밑줄 위에 글이 있으면 글 밑줄이다
    if (!left || !right || widened.has(left) || row.some(i => i.x < x2 && i.x + i.w > x1) || x2 - x1 < 2 * left.fontSize) continue
    // 끝이 세로선에 닿으면 표 괘선 조각이다
    if (verticals.some(v => (Math.abs(v.x1 - x1) <= 3 || Math.abs(v.x1 - x2) <= 3) && Math.min(v.y1, v.y2) - 3 <= h.y1 && Math.max(v.y1, v.y2) + 3 >= h.y1)) continue
    widened.set(left, { ...left, text: left.text.trimEnd() + " ", w: x2 - left.x })
    used.add(h)
  }
  if (!used.size) return { items, horizontals }
  return { items: items.map(i => widened.get(i) ?? i), horizontals: horizontals.filter(h => !used.has(h)) }
}
