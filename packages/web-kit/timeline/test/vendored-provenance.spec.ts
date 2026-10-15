/**
 * vendored-provenance.spec.ts — THE VENDORED PROVENANCE LAW (F2, the
 * nativity audit 2026-11-05). The kit's pull-diff claim ("the
 * `viser-timeline/` subtree keeps upstream structure so later upstream
 * pulls diff clean", the viser barrel's own header) was FALSE: the
 * overlays file carried melite's estate rewrite — DSH Button + card-base
 * Tip imports, the kit's outward CSS module import, estate testids, and
 * hardcoded zoom copy — and the melite-authored motionTimelineState.ts
 * sat inside the vendored dir. The cure re-homed both; this wall fires
 * the moment the disease returns:
 *
 *   1. every file under src/timeline/viser-timeline/ is melite-free —
 *      no @melite/* or @deepseek-ai/* import, no data-testid, no
 *      outward .module.css import, no census-shaped copy literal;
 *   2. the pull-diff set IS the SPDX set — every module in the dir
 *      except the barrel carries the NVIDIA SPDX header, and every
 *      melite-authored module (no SPDX) lives OUTSIDE the dir;
 *   3. the zoom cluster's copy rides the dictionary (one owner), not
 *      the component.
 */
import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const VISER = join(import.meta.dirname, "..", "src", "timeline", "viser-timeline")
const TIMELINE = join(import.meta.dirname, "..", "src", "timeline")

/** Every .ts/.tsx file in the vendored dir (the barrel included). */
function viserFiles(): string[] {
  return readdirSync(VISER).filter((f) => /\.(ts|tsx)$/.test(f))
}

const readSrc = (dir: string, f: string): string => readFileSync(join(dir, f), "utf8")

/** Strip comments so an arm that names the banned thing in prose cannot
 *  satisfy a source-text law (the studio-no-mirrors idiom). */
const codeOnly = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "")

describe("the vendored provenance law (viser-timeline carries upstream files only)", () => {
  it("no vendored file imports estate atoms, carries a testid, breaches outward for CSS, or owns copy (F2)", () => {
    const offenders: string[] = []
    for (const f of viserFiles()) {
      const code = codeOnly(readSrc(VISER, f))
      if (/@melite\//.test(code)) offenders.push(`${f}: imports @melite/* (estate atom inside the vendored subtree)`)
      if (/@deepseek-ai\//.test(code)) offenders.push(`${f}: imports @deepseek-ai/* (DSH atom inside the vendored subtree)`)
      if (/data-testid/.test(code)) offenders.push(`${f}: carries a data-testid (estate testid inside the vendored subtree)`)
      if (/\.module\.css/.test(code)) offenders.push(`${f}: imports a .module.css (outward breach of the vendored subtree)`)
      if (/aria-label=\{?["'`]|\btip=\{?["'`]/.test(code)) offenders.push(`${f}: hardcodes a census-shaped copy face (copy rides timelineCopy)`)
    }
    expect(offenders, `melite-authored content inside the vendored subtree — re-home it beside the dir (F2):\n${offenders.join("\n")}`).toEqual([])
  })

  it("the pull-diff set is the SPDX set: upstream files carry the header, melite modules live outside", () => {
    const offenders: string[] = []
    for (const f of viserFiles()) {
      const src = readSrc(VISER, f)
      const spdx = src.startsWith("// SPDX-FileCopyrightText: Copyright (c)")
      if (f === "index.ts") {
        // the barrel is the declared melite/vendor boundary, never upstream
        if (spdx) offenders.push("index.ts: the melite/vendor barrel must not carry an upstream SPDX header")
        continue
      }
      if (!spdx) offenders.push(`${f}: no upstream SPDX header — a melite-authored module inside the vendored dir (re-home beside it)`)
    }
    // the re-home's own rows: the melite modules exist OUTSIDE the dir
    for (const f of ["motionTimelineState.ts", "TimelineScrollbar.tsx"]) {
      let ok = false
      try { ok = !readSrc(TIMELINE, f).startsWith("// SPDX-FileCopyrightText:") } catch { ok = false }
      if (!ok) offenders.push(`${f}: missing beside the vendored dir (or wrongly SPDX'd) — the melite module must live outside`)
    }
    expect(offenders, `provenance drift:\n${offenders.join("\n")}`).toEqual([])
  })

  it("the zoom cluster's copy rides timelineCopy (one owner), never the component", () => {
    const dict = readSrc(join(TIMELINE, ".."), "timelineCopy.ts")
    for (const key of ["zoomOutAria", "zoomInAria", "zoomFitTip", "zoomFitLabel"]) {
      expect(dict.includes(`${key}:`), `timelineCopy.ts owns the zoom copy: add \`${key}\``).toBe(true)
    }
    const cluster = readFileSync(join(TIMELINE, "TimelineScrollbar.tsx"), "utf8")
    for (const key of ["zoomOutAria", "zoomInAria", "zoomFitTip", "zoomFitLabel"]) {
      expect(cluster.includes(`timelineCopy.${key}`), `TimelineZoomCluster consumes timelineCopy.${key}`).toBe(true)
    }
    expect(/"Zoom (in|out)"/.test(codeOnly(cluster)), "the cluster owns no zoom literal").toBe(false)
  })
})
