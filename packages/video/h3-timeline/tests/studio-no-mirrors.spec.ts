/**
 * THE PROBE-ABSENCE PIN (G7, R3 2026-10-27) — the collapse's
 * structural law, fired as a wall: f(doc, pendingOps) carries NO
 * guard, NO epoch, NO probe, NO touched mirror. The two-state
 * mirror died in a24e56923; any reintroduction of a probe-shaped
 * counterpart (an epoch int, a dirty flag, a "hasUnsettledWrites"
 * prop, a touchedRef) is the old disease coming back — this spec
 * fires the moment one appears in a collapse file.
 *
 * DEPTH NOTE: this wall judges source TEXT because the law IS
 * structural (the absent thing cannot be asserted behaviorally);
 * the behavioral halves (retirement by content, stale-hold, op
 * clear on switch) live in pending-ops / one-truth / channels
 * specs. The parallel session's stage-drill probe prop
 * (`hasUnsettledWrites`) is exactly the shape banned here — in
 * the drill's tree it is their cure to satisfy or revert; in the
 * collapse's tree the ban is absolute.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/** The collapse's own files — the pin's jurisdiction. */
const COLLAPSE_FILES = [
  "useShownDoc.ts",
  "pendingOps.ts",
  "docHydrate.ts",
  "docModel.ts",
  "docCalls.ts",
  "useViewSelection.ts",
  "useStudioViewSync.ts",
] as const

/** The probe vocabulary: every name a mirror can hide behind.
 * Whitespace-flexible matches (`touched Ref`) included via \s*. */
const FORBIDDEN: RegExp[] = [
  /epoch/i,
  /\bprobe/i,
  /touched\s*Ref/i,
  /dirty\s*Ref/i,
  /guard\s*Ref/i,
  /hasUnsettled/i,
  /isStale\s*Ref/i,
  /mirror/i,
]

const readSrc = (f: string): string =>
  readFileSync(join(import.meta.dirname, "..", "src", "ui", "studio", f), "utf8")

describe("the collapse carries no probe, no epoch, no touched mirror (G7)", () => {
  it("every collapse file is probe-free (the structural law fires on reintroduction)", () => {
    const offenders: string[] = []
    for (const f of COLLAPSE_FILES) {
      const src = readSrc(f)
      // comments are allowed to NAME the banned thing (this wall's
      // own spec text does); only CODE is judged — strip block and
      // line comments first.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
      for (const rx of FORBIDDEN) {
        if (rx.test(code)) offenders.push(`${f}: ${rx.source}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("pendingOps exports ONLY the content law (no probe-shaped export)", () => {
    const src = readSrc("pendingOps.ts")
    const exports = [...src.matchAll(/export\s+(?:const|function)\s+(\w+)/g)].map((m) => m[1])
    expect(exports.sort()).toEqual([
      "canonicalJson", "liveOps", "overlayDoc", "projectDoc", "serializeChannel",
    ].sort())
  })
})
