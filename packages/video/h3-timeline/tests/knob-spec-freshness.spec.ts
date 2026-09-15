/**
 * knob-spec freshness gate (2026-09-15) — the fold's schema face is
 * a BUILD-TIME walk (scripts/gen-knob-spec.ts) because the client
 * purity gate refuses runtime schemastery in the browser face. This
 * gate re-walks the carrier HERE (node face, schemastery lawful) and
 * fails the build the moment src/card.ts changes without
 * regenerating src/ui/studio/knob-spec.gen.ts. Drift can never ship
 * silent — the generated file and the carrier stay one truth.
 * (The gate asserts the PROJECTION, not card.ts's bytes: a carrier
 * change that alters any knob's type/label/enum fails below; one
 * that doesn't, needs no regeneration.)
 */
import { describe, expect, it } from "vitest"
import { carrier, BOARDED } from "../src/card.ts"
import { emitParamsSpec } from "@melite/comfyui-cordis/params-emit"
import { KNOB_ORDER } from "../src/ui/studio/docModel.ts"
import { KNOB_SPEC, CARRIER_GAP_KEYS } from "../src/ui/studio/knob-spec.gen"

const schemaKey = (knob: string): string =>
  knob === "sampling_steps" ? "steps" : knob.startsWith("h3_") ? knob.slice(3) : knob

describe("knob-spec freshness (the fold's schema face)", () => {
  it("every knob row equals a fresh carrier walk", () => {
    const spec = emitParamsSpec(carrier as never, BOARDED)
    for (const knob of KNOB_ORDER) {
      const node = spec[schemaKey(knob)]
      const face = KNOB_SPEC[knob]
      expect(face, `knob ${knob} present in the generated spec`).toBeDefined()
      if (!node) {
        // carrier-absent: must be one of the NAMED gap keys — a new
        // carrier-absent knob without a gap entry fails the generator
        // itself (never a silent drop).
        expect(CARRIER_GAP_KEYS, `knob ${knob} has no carrier row — gap it or declare it`).toContain(knob)
        continue
      }
      expect(face.type, `knob ${knob} type`).toBe(node.type)
      const label = (node.description ?? knob).replace(/\s*\(min:.*\)\s*$/, "").trim()
      expect(face.label, `knob ${knob} label`).toBe(label)
      if (Array.isArray(node.enum) && node.enum.length > 0) {
        expect(face.enum, `knob ${knob} enum`).toEqual(node.enum.map(String))
      } else {
        expect(face.enum, `knob ${knob} has no enum when the carrier has none`).toBeUndefined()
      }
    }
  })

  it("the generated spec carries exactly the fold's knobs", () => {
    expect(Object.keys(KNOB_SPEC).sort()).toEqual([...KNOB_ORDER].sort())
  })
})
