// commissions.spec.ts — §9 OF THE MULTIWINDOW UNIFICATION AUDIT (2026-11-12):
// THE STUDIO'S MOD PROJECTION.
//
// THE BURN (operator, live lane): "the UI that displays the timeline and
// all the separate clips isn't updating. It looks default, despite the AI
// agent using the card to string together multiple clips with a mod." The
// doc carried the commission, the compose honored it, and the lane
// rendered as if nothing was armed — the journey's UI hop was unwalled.
//
// THE WALL judges the derivation the rail renders from: bag presence IS
// the arm (an absent/empty bag contributes NO row — the same byte-stable
// posture the card's compose door keeps), every armed bag contributes
// exactly one row with its entry's seats named, and the extend's row
// carries the SAME window composition the compose door will build (one
// solver, two consumers — a rail that drew a different number of windows
// than the run would build is the exact lie §9 cured).
//
// It also pins the two hard edges §9 demands be visible rather than
// silently dropped: a stated extension that composes nowhere exactly
// surfaces the door's own refusal voice, and a bag the card REFUSES
// (multi-window under a non-39 overlap) still shows as an armed row —
// the operator sees the armed-and-doomed doc before pressing Run.
import "../../../../tests/helpers/boot-models.ts"
import { beforeAll, describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { GraphBuilder } from "@melite/comfyui-card-kit/graph"
import { loadCardDefs } from "@melite/comfyui-cordis"
import { loadFacts } from "@melite/comfyui-card-kit/facts"
import type { ModelFacts } from "@melite/comfyui-card-kit/facts"
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition"
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts"
import { solveWindowComposition } from "@melite/models-h3/timelineContract"
import {
  COMMISSION_KINDS, deriveCommissions, type CommissionKind,
} from "../src/ui/studio/commissions.ts"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..")
let def: CardDefinition
let model: ModelFacts
beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!
  assert.ok(def, "the composition root serves the h3-timeline card")
  model = loadFacts(
    join(ROOT, "packages", "engines", "comfyui-cordis", "data", "model-facts.json"),
    { getModel, registryIds, registryModel },
  ).models["h3-timeline"]!
  assert.ok(model, "the h3-timeline family facts row serves")
})

type Node = { class_type: string; inputs: Record<string, unknown> }
/** Compose the doc on the card's real door and read the composed
 *  window count off the chain plan's own shots roster. */
const composedWindows = (doc: Record<string, unknown>): number => {
  const g = new GraphBuilder()
  def.compose(def.schema(doc) as Record<string, unknown>, model, g, "run_cross_door")
  const out = g.toJSON() as Record<string, Node>
  const plan = Object.values(out).find((n) => n.class_type === "MiniMaxH3ChainPlanModern")
  assert.ok(plan, "the extend graph carries the chain plan")
  const parsed = JSON.parse(String(plan.inputs.plan_json)) as { shots: unknown[] }
  return parsed.shots.length
}

const REPLACE = { source_clip: "clips/take1.mp4", prompt: "the same person, now indoors" }
const REPAIR = { source_clip: "clips/take2.mp4", mask: "clips/mask.png", denoise: 0.32 }
const EXTEND = { source_clip: "clips/take3.mp4", extend_prompt: "she walks on", extend_seconds: 16.5 }
const RESHOOT = { source_clip: "clips/take4.mp4", orbit: 30, dolly: 0.8 }
// F29 (2026-10-30): the LoRA bag reaches the graph, so the rail owes it a
// row — the operator could not see the adapters at all before this
const LORAS = { id: "h3_lightx2v_turbo", strength: 0.8 }

describe("§9 — the studio's mod projection (the commission derivation)", () => {
  it("ARM 1 — no bags and EMPTY bags derive NO commission (the unused arm is surface, never a placeholder row)", () => {
    expect(deriveCommissions(undefined)).toEqual([])
    expect(deriveCommissions({})).toEqual([])
    // every bag PRESENT but empty is still the unused arm — the card's own
    // predicate (an empty array never arms) — so no row may render
    const empty = Object.fromEntries(COMMISSION_KINDS.map((k) => [k, []]))
    expect(deriveCommissions(empty)).toEqual([])
    // and a non-array value is not a bag (the wire never coerces one)
    // a present NON-array is armed-and-refused (ARM 11's own row), never
    // a clean empty lane: the card's guard throws for it at the door
    expect(deriveCommissions({ replace: "clips/take1.mp4" } as never)[0]!.note).toBe("malformed")
  })

  it("ARM 2 — each armed bag derives exactly one row, carrying its entry's seats", () => {
    for (const kind of COMMISSION_KINDS) {
      const entry = { replace: REPLACE, repair: REPAIR, extend: EXTEND, reshoot: RESHOOT, loras: LORAS }[kind]
      const rows = deriveCommissions({ [kind]: [entry] })
      expect(rows, `${kind}: one armed bag is one row`).toHaveLength(1)
      expect(rows[0]!.kind).toBe(kind)
      // the seats are the entry's OWN keys — nothing added, nothing dropped
      expect(rows[0]!.seats.map((s) => s.key).sort()).toEqual(Object.keys(entry).sort())
      // every entry seat rides verbatim; the LoRA bag's own keys are id +
      // strength (no source_clip on that arm)
      const anchor = kind === "loras" ? "id" : "source_clip"
      const seats = new Map(rows[0]!.seats.map((s) => [s.key, s.value]))
      expect(seats.get(anchor)).toBe(String((entry as Record<string, unknown>)[anchor]))
    }
  })

  it("ARM 3 — the row order follows the card's bag order (one deterministic rail)", () => {
    const rows = deriveCommissions({
      reshoot: [RESHOOT], extend: [EXTEND], repair: [REPAIR], replace: [REPLACE], loras: [LORAS],
    })
    expect(rows.map((r) => r.kind)).toEqual([...COMMISSION_KINDS])
    // the kinds constant IS the card's declaration order (the rail's own
    // reading order is a contract, not an accident of object keys)
    expect([...COMMISSION_KINDS]).toEqual(["replace", "repair", "extend", "reshoot", "loras"])
  })

  it("ARM 4 — the extend row draws the SAME composition the compose door builds (one solver, two consumers)", () => {
    const rows = deriveCommissions({ extend: [EXTEND] })
    const geometry = rows[0]!.geometry
    expect(geometry, "an extend with stated seconds carries its composition").toBeDefined()
    // the authoritative answer: the contract-face solver, asked directly
    const expected = solveWindowComposition(16.5 * 24, "h3-timeline extend")
    expect(geometry).toEqual(expected)
    expect(geometry!.windows, "16.5s is a THREE-window composition (396f > the 362f window ceiling)").toBe(3)
    expect(geometry!.windowFrames).toBe(158)
    expect(geometry!.deliveredFrames).toBe(16.5 * 24)
    // the non-extend arms carry no geometry (they do not compose windows)
    for (const kind of ["replace", "repair", "reshoot", "loras"] as const) {
      const entry = { replace: REPLACE, repair: REPAIR, reshoot: RESHOOT, loras: LORAS }[kind]
      expect(deriveCommissions({ [kind]: [entry] })[0]!.geometry).toBeUndefined()
    }
  })

  it("ARM 5 — a refused extension surfaces the DOOR's own sentence for that input (both door branches, rail == door)", () => {
    // THE DOOR'S OWN BRANCH (rail audit H1): one window (≤362f) takes
    // assertGridLength; >362f takes the solver. The rail follows the
    // same branch, so each input shows the sentence the door raises
    // for THAT input — never the other branch's wording.
    const gridBound = { ...EXTEND, extend_seconds: 5.31 } // 127f ≤ 362
    const gridRow = deriveCommissions({ extend: [gridBound] })[0]!
    expect(gridRow.refusal, "the armed-and-doomed doc shows the refusal").toBeDefined()
    expect(gridRow.refusal).toMatch(/h3-timeline extend: length 127f is off-grid/)
    expect(gridRow.refusal).toMatch(/22\+17k frames in \[22,362\]/)
    expect(gridRow.geometry, "a refused composition draws no windows").toBeUndefined()
    // the solver branch (>362f) keeps the solver's sentence
    const solverBound = { ...EXTEND, extend_seconds: 20.13 } // 483f > 362
    const solverRow = deriveCommissions({ extend: [solverBound] })[0]!
    expect(solverRow.refusal, "483f refuses on the solver branch").toMatch(/stated 483f composes nowhere exactly/)
    expect(solverRow.geometry).toBeUndefined()
    // and the compose door raises the grind sentence on the SAME input
    // when it refuses (one branch, one voice)
    const boom = (doc: Record<string, unknown>): string => {
      try { composedWindows(doc); return "" } catch (err) { return err instanceof Error ? err.message : String(err) }
    }
    const calls = [{ text: "she walks on", start_frame: 0, end_frame: 56 }]
    expect(boom({ calls, length: 56, extend: [gridBound] })).toMatch(/length 127f is off-grid/)
    expect(boom({ calls, length: 56, extend: [solverBound] }))
      .toMatch(/stated 483f composes nowhere exactly/)
  })

  it("ARM 6 — only channels the operator can act on are named: empty strings, non-finite numbers, and stated-false flags drop", () => {
    const row = deriveCommissions({
      reshoot: [{
        source_clip: "clips/take4.mp4",
        orbit: 0,
        smooth_depth: false,
        invert_depth: true,
        note: "   ",
        broken: Number.NaN,
        nested: { a: 1 },
      }],
    })[0]!
    const keys = row.seats.map((s) => s.key)
    expect(keys).toEqual(["source_clip", "orbit", "invert_depth"])
    expect(row.seats.find((s) => s.key === "orbit")!.value).toBe("0")
    expect(row.seats.find((s) => s.key === "invert_depth")!.value).toBe("true")
  })

  it("ARM 7 — the derivation is read-only over its input (the durable row is untouched)", () => {
    const params = { replace: [{ ...REPLACE }], extend: [{ ...EXTEND }] }
    const before = JSON.stringify(params)
    deriveCommissions(params)
    expect(JSON.stringify(params)).toBe(before)
  })

  it("ARM 9 — a NON-OBJECT entry stays ARMED: the row says the door refuses it, never a clean lane", () => {
    // THE CARD'S OWN PREDICATE (rail audit H4): armed = non-empty
    // array, whatever the entry's shape. Every sibling arm refuses
    // loud at the door on such an entry, so the rail must NOT hide
    // the arm — a doc that will refuse shows as a refusal row.
    for (const entry of [42, "clips/take4.mp4", null, ["nested"]]) {
      const rows = deriveCommissions({ extend: [entry] })
      expect(rows).toHaveLength(1)
      expect(rows[0]!.kind).toBe("extend")
      expect(rows[0]!.note).toBe("bad-entry")
      expect(rows[0]!.seats).toEqual([])
      expect(rows[0]!.geometry).toBeUndefined()
    }
    // the reshoot's predicate agrees (the model's armed law): armed,
    // and its door refuses the missing clip loud
    const rs = deriveCommissions({ reshoot: ["clips/take4.mp4"] })[0]!
    expect(rs.note).toBe("bad-entry")
  })

  it("ARM 10 — an extension stating no usable seconds still draws its row, but no geometry (nothing was composed)", () => {
    // absent, non-numeric, and zero-second statements: the row is the
    // operator's evidence the arm is bound; geometry is only the solver's
    for (const stated of [
      { ...EXTEND, extend_seconds: undefined },
      { ...EXTEND, extend_seconds: "16.5" },
      { ...EXTEND, extend_seconds: 0 },
      { ...EXTEND, extend_seconds: -1 },
    ]) {
      const row = deriveCommissions({ extend: [stated] })[0]!
      expect(row.kind).toBe("extend")
      expect(row.geometry, `geometry for ${String(stated.extend_seconds)}`).toBeUndefined()
      expect(row.refusal, "nothing was composed, so nothing refused").toBeUndefined()
    }
  })

  it("ARM 11 — a present NON-ARRAY bag is armed-and-refused (the door throws; the rail shows the malformed row)", () => {
    // the card's guard refuses a present non-array bag loud, so the
    // rail must not draw a clean lane for it (H4's inverted-burn
    // class: the doc that will refuse is the one that shows nothing)
    const rows = deriveCommissions({ extend: "clips/take3.mp4" })
    expect(rows).toHaveLength(1)
    expect(rows[0]!.kind).toBe("extend")
    expect(rows[0]!.note).toBe("malformed")
    expect(rows[0]!.seats).toEqual([])
    // an EMPTY array stays the unused arm — never a malformed row
    expect(deriveCommissions({ extend: [] })).toEqual([])
  })

  it("ARM 12 — DRAWN windows == COMPOSED windows on the SAME doc (cross-door: the rail's geometry vs the chain plan)", () => {
    // rail audit H2: comparing the rail's solver call against another
    // solver call is agreement-by-shared-import. This arm feeds ONE
    // doc through the rail and through def.compose, and counts the
    // windows the RUN actually plans.
    for (const seconds of [243 / 24, 362 / 24, 396 / 24]) {
      const entry = { ...EXTEND, extend_seconds: seconds }
      const drawn = deriveCommissions({ extend: [entry] })[0]!.geometry!
      const composed = composedWindows({
        calls: [{ text: "she walks on", start_frame: 0, end_frame: 56 }],
        length: 56,
        extend: [entry],
      })
      expect(composed, `${seconds}s: the run plans the ${drawn.windows} windows the rail draws`)
        .toBe(drawn.windows)
    }
  })

  it("ARM 8 — every kind is derivable from a real card-shaped entry (no kind is a stub)", () => {
    const entries: Record<CommissionKind, Record<string, unknown>> = {
      replace: REPLACE, repair: REPAIR, extend: EXTEND, reshoot: RESHOOT, loras: LORAS,
    }
    for (const kind of COMMISSION_KINDS) {
      const rows = deriveCommissions({ [kind]: [entries[kind]] })
      expect(rows[0]!.seats.length, `${kind} names at least one seat`).toBeGreaterThan(0)
    }
  })
})
