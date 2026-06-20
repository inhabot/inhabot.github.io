/**
 * 공문서(公文書) 모드 — 한국 행정 공문서 표준 서식 렌더링 로직
 *
 * 근거: 「행정업무의 운영 및 혁신에 관한 규정」 및 동 시행규칙(제2조 항목 표시),
 *       행정안전부 「2020 행정업무운영 편람」.
 * 자세한 표준은 docs/gongmunseo-reference.md, 구현 매핑은 docs/gongmunseo-engine-spec.md 참조.
 *
 * 이 모듈은 **순수 로직**만 담는다(항목부호 시퀀스 생성, 단계별 들여쓰기 계산,
 * 프리셋 해석). 실제 XML 조립은 generator.ts가 한다.
 */

// ─── 옵션 타입 ──────────────────────────────────────

export type GongmunPreset = "official" | "report" | "plan" | "notice" | "minutes"
export type GongmunNumbering = "standard" | "report"
export type GongmunFont = "myeongjo" | "gothic"

/** 공문서 모드 옵션 (전부 선택 — 프리셋 기본값을 개별 override) */
export interface GongmunOptions {
  /** 문서 종류 프리셋. 기본 'official'(일반 기안문) */
  preset?: GongmunPreset
  /** 본문 글꼴. 'myeongjo'=함초롬바탕(명조, 보고서·대외공문 관행) / 'gothic'=맑은 고딕(전자결재 기본) */
  bodyFont?: GongmunFont
  /** 본문 글자 크기(pt). 기본 15 */
  bodyPt?: number
  /** 본문 줄간격(%). 기본 160 (회의록 130) */
  lineSpacing?: number
  /** 항목부호 체계. 'standard'=법정 8단계(1. 가. 1) …) / 'report'=보고서 불릿(□ ○ - ㆍ) */
  numbering?: GongmunNumbering
  /** 용지 여백(mm). 기본 공식값 위20/아래10/좌20/우20 */
  margins?: { top: number; bottom: number; left: number; right: number }
  /** 문서 제목(첫 h1)을 가운데 정렬. 기본 true (행정기관명·보고서 제목) */
  centerTitle?: boolean
}

export interface ResolvedGongmun {
  preset: GongmunPreset
  bodyFont: GongmunFont
  bodyHeight: number // charPr height = pt × 100
  lineSpacing: number
  numbering: GongmunNumbering
  margins: { top: number; bottom: number; left: number; right: number }
  centerTitle: boolean
}

/** 공식 표준 여백(mm) — 편람 서식 작성방법 해설 / 시행규칙 별표4 */
const OFFICIAL_MARGINS = { top: 20, bottom: 10, left: 20, right: 20 }

const PRESET_DEFAULTS: Record<
  GongmunPreset,
  { bodyPt: number; lineSpacing: number; numbering: GongmunNumbering }
> = {
  official: { bodyPt: 15, lineSpacing: 160, numbering: "standard" },
  report: { bodyPt: 15, lineSpacing: 160, numbering: "report" },
  plan: { bodyPt: 15, lineSpacing: 160, numbering: "standard" },
  notice: { bodyPt: 15, lineSpacing: 160, numbering: "standard" },
  minutes: { bodyPt: 14, lineSpacing: 130, numbering: "standard" },
}

export function resolveGongmun(opts: GongmunOptions): ResolvedGongmun {
  const preset = opts.preset ?? "official"
  const d = PRESET_DEFAULTS[preset]
  const bodyPt = opts.bodyPt ?? d.bodyPt
  return {
    preset,
    bodyFont: opts.bodyFont ?? "myeongjo",
    bodyHeight: Math.round(bodyPt * 100),
    lineSpacing: opts.lineSpacing ?? d.lineSpacing,
    numbering: opts.numbering ?? d.numbering,
    margins: opts.margins ?? OFFICIAL_MARGINS,
    centerTitle: opts.centerTitle ?? true,
  }
}

// ─── 항목부호 시퀀스 생성 ────────────────────────────

// 가나다 초성 14자(쌍자음 제외) — 0xAC00 음절 조합용 초성 인덱스
const HANGUL_INITIALS = [0, 2, 3, 5, 6, 7, 9, 11, 12, 14, 15, 16, 17, 18]
// 단모음 순 중성 인덱스: ㅏ ㅓ ㅗ ㅜ ㅡ ㅣ (편람: 가→…→하→거→…→허→고→…)
const HANGUL_MEDIALS = [0, 4, 8, 13, 18, 20]

/** 0-based n → 가, 나, 다, … 하, 거, 너, … (단모음 연속) */
export function hangulOrdinal(n: number): string {
  const cols = HANGUL_INITIALS.length // 14
  const vowel = HANGUL_MEDIALS[Math.min(Math.floor(n / cols), HANGUL_MEDIALS.length - 1)]
  const init = HANGUL_INITIALS[n % cols]
  return String.fromCodePoint(0xac00 + init * 588 + vowel * 28)
}

/** 0-based n → ① ② ③ … (U+2460~). 20 초과 시 순환(실무상 도달 불가) */
export function circledNumber(n: number): string {
  return String.fromCodePoint(0x2460 + (n % 20))
}

/** 0-based n → ㉮ ㉯ ㉰ … ㉻ (U+326E~, 14자). 초과 시 순환 */
export function circledHangul(n: number): string {
  return String.fromCodePoint(0x326e + (n % 14))
}

/** 보고서 모드 단계별 불릿(정부 보고서 관행: □ 대 / ○ 중 / - 소 / ㆍ 세) */
const REPORT_BULLETS = ["□", "○", "-", "ㆍ"]

/**
 * 'standard'(법정 8단계) 마커. depth 0~7, n은 해당 단계 형제 중 0-based 순번.
 * 5·6단계는 반드시 괄호 3글자 조합, 7·8단계는 단일 유니코드 문자.
 */
export function standardMarker(depth: number, n: number): string {
  switch (depth) {
    case 0: return `${n + 1}.`
    case 1: return `${hangulOrdinal(n)}.`
    case 2: return `${n + 1})`
    case 3: return `${hangulOrdinal(n)})`
    case 4: return `(${n + 1})`
    case 5: return `(${hangulOrdinal(n)})`
    case 6: return circledNumber(n)
    case 7: return circledHangul(n)
    default: return circledHangul(n) // 8단계 초과(실무상 없음)
  }
}

/** 'report' 모드 마커(불릿, 순번 무관) */
export function reportMarker(depth: number): string {
  return REPORT_BULLETS[Math.min(depth, REPORT_BULLETS.length - 1)]
}

// ─── 단계별 들여쓰기(left/내어쓰기 indent) 계산 ──────

export interface LevelIndent {
  /** 문단 왼쪽 여백(HWPUNIT) — 단계별 누적 들여쓰기. 첫 줄 부호가 여기서 시작 */
  left: number
  /**
   * 첫 줄 들여쓰기(HWPUNIT, hc:intent). **음수 = 내어쓰기**: 첫 줄은 left에서 시작하고
   * 둘째 줄부터 |intent| 만큼 오른쪽으로 들여쓴다(= 내용 첫 글자에 정렬). 한컴 실측 의미.
   */
  indent: number
}

/**
 * depth(0~)별 들여쓰기 계산. (한컴 OWPML 실측 모델)
 * - 1타 = bodyHeight/2 HWPUNIT (1pt≈100 HWPUNIT, 한글 1자=2타=bodyHeight)
 * - left = depth × 2타 (단계마다 한 글자씩 누적 — 첫 줄 부호 위치)
 * - intent = -(부호폭 + 1타) (음수 내어쓰기 → 둘째 줄이 left+|intent| = 내용 첫 글자에 정렬)
 */
export function levelIndent(
  depth: number,
  bodyHeight: number,
  numbering: GongmunNumbering,
): LevelIndent {
  const ta = bodyHeight / 2 // 1타
  // 부호폭(타): standard 5·6단계((1)/(가))만 3타, 그 외 2타. report는 전부 2타.
  const markerTa = numbering === "standard" && (depth === 4 || depth === 5) ? 3 : 2
  const hang = Math.round((markerTa + 1) * ta)
  return { left: Math.round(depth * bodyHeight), indent: -hang }
}

// ─── 단일 형제 부호 생략(2-pass) ─────────────────────

/**
 * 리스트 항목들의 (depth) 시퀀스를 받아, 각 항목의 '형제 수'를 계산.
 * 규정: 항목이 하나만 있으면 부호를 부여하지 않는다.
 * 같은 부모 아래 같은 depth 형제가 1개뿐이면 true(=부호 생략) 반환 배열.
 * (불릿 'report' 모드에는 적용하지 않는다 — 호출 측에서 분기.)
 *
 * 입력은 하나의 연속된 리스트(run)의 depth 배열.
 */
export function computeSuppression(depths: number[]): boolean[] {
  // groupKey(부모 경로) → 형제 수
  const counts = new Map<string, number>()
  const keys: string[] = []
  const path: number[] = [] // path[d] = depth d에서 현재까지 등장한 형제 순번
  for (const depth of depths) {
    path.length = depth + 1
    path[depth] = (path[depth] ?? 0) + 1
    const parentKey = path.slice(0, depth).join(".") + "|" + depth
    keys.push(parentKey)
    counts.set(parentKey, (counts.get(parentKey) ?? 0) + 1)
  }
  return keys.map((k) => (counts.get(k) ?? 0) <= 1)
}

// ─── 마커 카운터(렌더 시 형제 순번 추적) ──────────────

/**
 * 리스트 run을 순회하며 depth별 카운터를 유지, 각 항목의 마커 문자열을 산출.
 * 상위 depth가 진행되면 하위 카운터는 리셋된다.
 */
export class GongmunNumberer {
  private counts: number[] = []
  constructor(private numbering: GongmunNumbering) {}

  /** depth 항목 하나에 대한 마커. suppress=true면 빈 문자열(부호 없음) */
  next(depth: number, suppress: boolean): string {
    // 하위 depth 카운터 리셋
    this.counts.length = depth + 1
    const n = (this.counts[depth] ?? 0)
    this.counts[depth] = n + 1
    if (suppress) return ""
    return this.numbering === "report"
      ? reportMarker(depth)
      : standardMarker(depth, n)
  }

  reset(): void {
    this.counts = []
  }
}

// ─── HWPUNIT 환산 ───────────────────────────────────

/** 1mm → HWPUNIT (7200/25.4) */
export function mmToHwpunit(mm: number): number {
  return Math.round((mm * 7200) / 25.4)
}
