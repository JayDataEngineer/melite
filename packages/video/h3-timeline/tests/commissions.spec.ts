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
  CALLS_READING_KINDS, COMMISSION_KINDS, callsLaneFace, deriveCommissions,
  isStarterCallText, type CommissionKind,
} from "../src/ui/studio/commissions.ts"
import { STARTER_CALLS } from "../src/ui/studio/docModel.ts"
import { studioCopy } from "../src/ui/studio/studioCopy.ts"

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
// 2026-10-31 (audit 2026-10-31-modpress-row-face): refine + upscale
// bags ride the rail too — five of seven declared kinds had no row, so
// a mod-only row drew an empty rail and the operator saw nothing
const REFINE = { source_clip: "clips/take5.mp4", denoise: 0.32, scale: 2 }
const UPSCALE = { source_clip: "clips/take6.mp4", denoise: 0.24, segment_crf: 18 }
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
      const entry = { edit: EDIT, replace: REPLACE, repair: REPAIR, extend: EXTEND, refine: REFINE, upscale: UPSCALE, reshoot: RESHOOT, loras: LORAS }[kind]
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
      edit: [EDIT], reshoot: [RESHOOT], extend: [EXTEND], repair: [REPAIR], replace: [REPLACE],
      refine: [REFINE], upscale: [UPSCALE], loras: [LORAS],
    })
    expect(rows.map((r) => r.kind)).toEqual([...COMMISSION_KINDS])
    // the kinds constant IS the card's declaration order (the rail's own
    // reading order is a contract, not an accident of object keys); refine
    // + upscale joined 2026-10-31 (modpress-row-face): the quality mods
    // seat between extend and reshoot; `edit` seats FIRST (2026-11-16,
    // the read-list collapse): the canonical bag leads, the legacy five
    // are its translation
    expect([...COMMISSION_KINDS]).toEqual(["edit", "replace", "repair", "extend", "refine", "upscale", "reshoot", "loras"])
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
      edit: EDIT, replace: REPLACE, repair: REPAIR, extend: EXTEND, refine: REFINE, upscale: UPSCALE, reshoot: RESHOOT, loras: LORAS,
    }
    for (const kind of COMMISSION_KINDS) {
      const rows = deriveCommissions({ [kind]: [entries[kind]] })
      expect(rows[0]!.seats.length, `${kind} names at least one seat`).toBeGreaterThan(0)
    }
  })
})

// ── THE MOD-MODE CALLS FACE (operator 2026-11-14) — the derivation the
// strip's calls lane renders from. THE READERSHIP TABLE is not a new
// opinion: each kind's own mod spec pins its compose against the real
// door — replace/repair/extend/refine/upscale compose from the bag
// entry alone (their graphs never read a call's text), while reshoot
// and loras RIDE the film action (reshoot's prompt is
// "crossview. " + the call text) — this wall pins the DERIVED table
// the lane renders: every reading kind faces `prompt`, every
// non-reading armed doc faces `dormant`, nothing armed faces `plain`.
describe("THE MOD-MODE CALLS FACE (2026-11-14 — the lane's calls-readership)", () => {
  it("ARM R1 — the readership table: every reading kind faces prompt, edit faces v2v, every other non-reading kind faces dormant", () => {
    for (const kind of COMMISSION_KINDS) {
      const entries: Record<CommissionKind, Record<string, unknown>> = {
        edit: EDIT, replace: REPLACE, repair: REPAIR, extend: EXTEND, refine: REFINE,
        upscale: UPSCALE, reshoot: RESHOOT, loras: LORAS,
      }
      const face = callsLaneFace(deriveCommissions({ [kind]: [entries[kind]] }))
      const reads = (CALLS_READING_KINDS as readonly string[]).includes(kind)
      // (queue 11, operator 2026-11-08) the edit bag owns the v2v
      // face: its windows ARE the run's video-to-video spans — the
      // cut-authoring lane, live where the others stand down
      const want = reads ? { face: "prompt", kind }
        : kind === "edit" ? { face: "v2v", kind: "edit" as const }
          : { face: "dormant", kind }
      expect(face, `${kind}: the lane names its readership`).toEqual(want)
    }
  })

  it("ARM R2 — a reader armed BESIDE non-readers wins (the run reads calls if ANY armed action does)", () => {
    const face = callsLaneFace(deriveCommissions({
      replace: [REPLACE], loras: [LORAS],
    }))
    expect(face).toEqual({ face: "prompt", kind: "loras" })
  })

  it("ARM R2b — THE EDIT BAG WINS OVER A READER (queue 11 reopened: the operator's live doc carried edit + loras and the lane drew the plain prompt face; their law has no precedence clause — the swap is unconditional)", () => {
    const face = callsLaneFace(deriveCommissions({
      edit: [EDIT], loras: [LORAS],
    }))
    expect(face).toEqual({ face: "v2v", kind: "edit" })
    // reshoot (the other reader) disarms nothing either
    expect(callsLaneFace(deriveCommissions({
      edit: [EDIT], reshoot: [RESHOOT],
    }))).toEqual({ face: "v2v", kind: "edit" })
  })

  it("ARM R3 — nothing armed faces plain (absent AND explicit-empty bags alike — the arm is presence)", () => {
    expect(callsLaneFace([])).toEqual({ face: "plain" })
    expect(callsLaneFace(deriveCommissions({ reshoot: [], replace: [] })))
      .toEqual({ face: "plain" })
  })

  it("ARM R4 — the starter predicate: the verbatim placeholder (whitespace-padded included), never authored prose", () => {
    const starterText = STARTER_CALLS[0]!.text!
    expect(isStarterCallText(starterText)).toBe(true)
    expect(isStarterCallText(`  ${starterText}  `)).toBe(true)
    // authored prose, the empty string, and a single word of the
    // placeholder are all NOT the placeholder
    expect(isStarterCallText("she walks on")).toBe(false)
    expect(isStarterCallText("")).toBe(false)
    expect(isStarterCallText("A single shot")).toBe(false)
  })

  it("ARM R5 — a stacked bag's bad entry stays armed-and-refused per entry (the bad-entry side of the stack split)", () => {
    // a loras stack with one array entry + one good adapter: the bad
    // entry draws its own bad-entry row, the good entry its seats row
    expect(deriveCommissions({ loras: [[], LORAS] })).toEqual([
      { kind: "loras", seats: [], note: "bad-entry" },
      { kind: "loras", seats: [{ key: "id", value: "h3_lightx2v_turbo" }, { key: "strength", value: "0.8" }] },
    ])
    // the refine stack's bad entry takes the same side
    expect(deriveCommissions({ refine: [null] })).toEqual([
      { kind: "refine", seats: [], note: "bad-entry" },
    ])
  })
})

// THE READ-LIST COLLAPSE (2026-11-16, the one-door law's UI half): the
// canonical bag is `edit` — the spelling the one door's Add writes and
// the compose door reads (the legacy five are translation at the door
// for old documents, never UI). A read list without it is the strip
// blind to the bag the CURRENT door authors: the doc carries the
// commission, the compose builds it, and the rail renders default —
// §9's own burn, back through the front door.
const EDIT = {
  source_clip: "clips/take7.mp4", edit_prompt: "make it night",
  mask_source: "region", region_prompt: "a person", denoise: 0.55,
}

describe("THE READ-LIST COLLAPSE (2026-11-16 — the canonical bag rides the rail)", () => {
  it("ARM E1 — an armed `edit` bag derives its row: the canonical spelling is read, named, and seated", () => {
    const rows = deriveCommissions({ edit: [EDIT] })
    expect(rows, "the canonical bag is not blind to the rail").toHaveLength(1)
    expect(rows[0]!.kind).toBe("edit")
    expect(rows[0]!.seats.map((s) => s.key).sort()).toEqual(Object.keys(EDIT).sort())
    const seats = new Map(rows[0]!.seats.map((s) => [s.key, s.value]))
    expect(seats.get("edit_prompt")).toBe("make it night")
    expect(seats.get("denoise")).toBe("0.55")
  })

  it("ARM E2 — the label face is the operator's word for the door ('Video edit'), never the bare kind id", () => {
    expect(studioCopy.commissionKindLabel("edit")).toBe("Video edit")
  })

  it("ARM E3 — edit composes from its own bag (edit_prompt rides the entry): the calls lane is the V2V face under it — the windows are the run's spans, the prose is not read", () => {
    const face = callsLaneFace(deriveCommissions({ edit: [EDIT] }))
    // (queue 11, operator 2026-11-08) the edit bag no longer stands
    // the lane down: the timeline bar's CALLS section CHANGES to the
    // video-to-video and cuts face — the windows live, only the
    // prose goes quiet
    expect(face).toEqual({ face: "v2v", kind: "edit" })
    if (face.face !== 'v2v') throw new Error(`expected the v2v face, got ${face.face}`)
    expect(studioCopy.callsV2vLabel).toContain("Video-to-video")
    // the prose hint names the split: windows and cuts are read,
    // prose is not — the edit composes from the mod's own prompt seat
    expect(studioCopy.callsV2vProseHint).toContain("its prose is not")
    expect(studioCopy.addCutDoor).toBe("Add cut")
  })

  it("ARM E4 — the hard edges hold for edit too: malformed and bad-entry bags draw the armed-and-refused row", () => {
    expect(deriveCommissions({ edit: "clips/take7.mp4" } as never)).toEqual([
      { kind: "edit", seats: [], note: "malformed" },
    ])
    expect(deriveCommissions({ edit: [null] })).toEqual([
      { kind: "edit", seats: [], note: "bad-entry" },
    ])
    // the unused arm stays surface: an empty edit bag is NO row
    expect(deriveCommissions({ edit: [] })).toEqual([])
  })
})
