// @melite/motion — THE MIRROR-ABSENCE PIN (nativity audit F7, 2026-11-05)
// — the one-truth rework's structural law, fired as a wall: the studio is
// f(doc, pendingOps) and carries NO mirror, NO once-only hydration latch,
// NO echo-guard persist ref. The tlPrompts/tlKeyframes/tlIntervals/
// constraintPayloads React mirrors and their guard machinery
// (promptsAuthoredRef, didHydratePrompts, lastPromptsPersistedRef,
// lastSeededT) died in the rework; any reintroduction is the two-state
// disease coming back — this spec fires the moment one appears in a
// one-truth file.
//
// DEPTH NOTE: this wall judges source TEXT because the law IS structural
// (the absent thing cannot be asserted behaviorally); the behavioral
// halves (retirement by content, supersession, stale-hold, external-write
// re-hydration) live in studio-pending-ops.spec.ts, and the wire
// roundtrip lives in motion-doc-roundtrip.spec.ts. Ported from the h3
// collapse's studio-no-mirrors.spec.ts (G7).
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

/** The one-truth files — the pin's jurisdiction. */
const ONE_TRUTH_FILES = [
  "motionDoc.ts",
  "useMotionDoc.ts",
  "useTimelineEnvelope.ts",
  "useTimelineAuthoring.ts",
  "useMotionUndoStack.ts",
  "component.tsx",
] as const

/** The mirror vocabulary: every shape a doc mirror or its guard can
 *  hide behind. Whitespace-flexible matches (`guard Ref`) via \s*. */
const FORBIDDEN: RegExp[] = [
  /useState<TimelinePrompt\[\]/,
  /useState<TimelineKeyframe\[\]/,
  /useState<TimelineInterval\[\]/,
  /useState<Record<string,\s*MotionConstraint>/,
  /promptsAuthored/,
  /didHydrate/,
  /lastPromptsPersisted/,
  /lastPersisted/,
  /lastSeeded/,
  /epoch/i,
  /hasUnsettled/,
  /guard\s*Ref/i,
  /dirty\s*Ref/i,
  /touched\s*Ref/i,
  /mirror/i,
]

const readSrc = (f: string): string =>
  readFileSync(join(import.meta.dirname, "..", "src", "ui", "studio", f), "utf8")

describe("the one-truth studio carries no mirror, no latch, no echo guard (F7)", () => {
  it("every one-truth file is mirror-free (the structural law fires on reintroduction)", () => {
    const offenders: string[] = []
    for (const f of ONE_TRUTH_FILES) {
      const src = readSrc(f)
      // comments are allowed to NAME the banned thing (this wall's own
      // header does); only CODE is judged — strip comments first.
      const code = src
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
      for (const rx of FORBIDDEN) {
        if (rx.test(code)) offenders.push(`${f}: ${rx.source}`)
      }
    }
    expect(offenders).toEqual([])
  })

  it("motionDoc exports ONLY the content law (no guard-shaped export)", () => {
    const src = readSrc("motionDoc.ts")
    const exports = [...src.matchAll(/export\s+(?:const|function)\s+(\w+)/g)].map((m) => m[1])
    expect(exports.sort()).toEqual([
      "canonicalJson", "healPrompts", "liveOps", "opCurrency",
      "overlayMotionDoc", "projectMotionDoc", "promptsSettle",
      "serializeChannel", "serializeConstraintsParam",
      "serializePromptsParams", "supersedeOps",
    ].sort())
  })

  it("the envelope carries envelope math only (no doc-channel vocabulary)", () => {
    const code = readSrc("useTimelineEnvelope.ts")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, "")
    // The doc channel's serialization/hydration vocabulary lives in
    // motionDoc.ts alone; the envelope owns baseT/targetT/extend.
    for (const banned of [
      "MOTION_PROMPTS_PARAM", "MOTION_CONSTRAINTS_PARAM",
      "serializeMotionPrompts", "serializeConstraints",
      "hydrateMotionPrompts", "hydrateConstraints",
      "tlPrompts", "tlKeyframes", "constraintPayloads",
    ]) {
      expect(code).not.toContain(banned)
    }
  })
})
