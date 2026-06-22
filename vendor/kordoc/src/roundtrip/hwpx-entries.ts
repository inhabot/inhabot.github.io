/**
 * HWPX ZIP 섹션 엔트리 해석 — patcher/session/filler 공용.
 *
 * manifest(content.hpf) 기반으로 파서(parser.ts resolveSectionPaths)와 동일한
 * 섹션 목록을 만든다. zip 엔트리 정확 일치만 포함 (대소문자 보정 금지 — 파서가
 * 못 본 섹션이 스캔에 끼면 중복 텍스트 문단 수정이 비가시 섹션에 적용되는
 * cross-section bleed 발생).
 */

import type JSZip from "jszip"

export async function resolveSectionEntryNames(zip: JSZip): Promise<string[]> {
  for (const mp of ["Contents/content.hpf", "content.hpf"]) {
    const f = zip.file(mp)
    if (!f) continue
    const xml = await f.async("text")
    const paths = sectionPathsFromManifest(xml).filter(p => zip.file(p) !== null)
    if (paths.length > 0) return paths
  }
  return Object.keys(zip.files).filter(n => /[Ss]ection\d+\.xml$/.test(n)).sort()
}

function sectionPathsFromManifest(xml: string): string[] {
  const isSectionId = (id: string) => /^s/i.test(id) || id.toLowerCase().includes("section")
  const attr = (tag: string, name: string): string => {
    const m = tag.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`))
    return m ? (m[1] ?? m[2]) : ""
  }
  const idToHref = new Map<string, string>()
  for (const m of xml.matchAll(/<opf:item(\s(?:"[^"]*"|'[^']*'|[^>"'])*?)\/?>/g)) {
    const id = attr(m[1], "id")
    let href = attr(m[1], "href")
    const mediaType = attr(m[1], "media-type")
    if (!isSectionId(id) && !mediaType.includes("xml")) continue
    if (!href.startsWith("/") && !href.startsWith("Contents/") && isSectionId(id)) href = "Contents/" + href
    if (id) idToHref.set(id, href)
  }
  const ordered: string[] = []
  for (const m of xml.matchAll(/<opf:itemref(\s(?:"[^"]*"|'[^']*'|[^>"'])*?)\/?>/g)) {
    const href = idToHref.get(attr(m[1], "idref"))
    if (href) ordered.push(href)
  }
  if (ordered.length > 0) return ordered
  return Array.from(idToHref.entries())
    .filter(([id]) => isSectionId(id))
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, href]) => href)
}
