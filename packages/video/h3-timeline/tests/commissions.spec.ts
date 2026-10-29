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
import { describe, expect, it } from "vitest"
import {
  COMMISSION_KINDS, deriveCommissions, type CommissionKind,
} from "../src/ui/studio/commissions.ts"
import { solveWindowComposition } from "@melite/models-h3/timelineContract"

const REPLACE = { source_clip: "clips/take1.mp4", prompt: "the same person, now indoors" }
const REPAIR = { source_clip: "clips/take2.mp4", mask: "clips/mask.png", denoise: 0.32 }
const EXTEND = { source_clip: "clips/take3.mp4", extend_prompt: "she walks on", extend_seconds: 16.5 }
const RESHOOT = { source_clip: "clips/take4.mp4", orbit: 30, dolly: 0.8 }

describe("§9 — the studio's mod projection (the commission derivation)", () => {
  it("ARM 1 — no bags and EMPTY bags derive NO commission (the unused arm is surface, never a placeholder row)", () => {
    expect(deriveCommissions(undefined)).toEqual([])
    expect(deriveCommissions({})).toEqual([])
    // every bag PRESENT but empty is still the unused arm — the card's own
    // predicate (an empty array never arms) — so no row may render
    const empty = Object.fromEntries(COMMISSION_KINDS.map((k) => [k, []]))
    expect(deriveCommissions(empty)).toEqual([])
    // and a non-array value is not a bag (the wire never coerces one)
    expect(deriveCommissions({ replace: "clips/take1.mp4" } as never)).toEqual([])
  })

  it("ARM 2 — each armed bag derives exactly one row, carrying its entry's seats", () => {
    for (const kind of COMMISSION_KINDS) {
      const entry = { replace: REPLACE, repair: REPAIR, extend: EXTEND, reshoot: RESHOOT }[kind]
      const rows = deriveCommissions({ [kind]: [entry] })
      expect(rows, `${kind}: one armed bag is one row`).toHaveLength(1)
      expect(rows[0]!.kind).toBe(kind)
      // the seats are the entry's OWN keys — nothing added, nothing dropped
      expect(rows[0]!.seats.map((s) => s.key).sort()).toEqual(Object.keys(entry).sort())
      expect(rows[0]!.seats.find((s) => s.key === "source_clip")!.value).toBe(entry.source_clip)
    }
  })

  it("ARM 3 — the row order follows the card's bag order (one deterministic rail)", () => {
    const rows = deriveCommissions({
      reshoot: [RESHOOT], extend: [EXTEND], repair: [REPAIR], replace: [REPLACE],
    })
    expect(rows.map((r) => r.kind)).toEqual([...COMMISSION_KINDS])
    // the kinds constant IS the card's declaration order (the rail's own
    // reading order is a contract, not an accident of object keys)
    expect([...COMMISSION_KINDS]).toEqual(["replace", "repair", "extend", "reshoot"])
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
    for (const kind of ["replace", "repair", "reshoot"] as const) {
      const entry = { replace: REPLACE, repair: REPAIR, reshoot: RESHOOT }[kind]
      expect(deriveCommissions({ [kind]: [entry] })[0]!.geometry).toBeUndefined()
    }
  })

  it("ARM 5 — a stated extension that composes nowhere exactly surfaces the door's OWN refusal voice (never a lane that looks fine)", () => {
    // 5s + an off-grid remainder: no uniform 22+17k composition delivers it
    const doomed = { ...EXTEND, extend_seconds: 5.31 }
    const row = deriveCommissions({ extend: [doomed] })[0]!
    expect(row.refusal, "the armed-and-doomed doc shows the refusal").toBeDefined()
    expect(row.refusal).toMatch(/h3-timeline extend: stated \d+f composes nowhere exactly/)
    expect(row.geometry, "a refused composition draws no windows").toBeUndefined()
    // the SAME voice the compose door raises — one sentence, two faces
    expect(() => solveWindowComposition(Math.round(5.31 * 24), "h3-timeline extend"))
      .toThrow(/composes nowhere exactly/)
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

  it("ARM 9 — a bag holding a NON-OBJECT entry derives no row (the card's reader treats it as disarmed)", () => {
    // the entry's shape is the card's authority, not the rail's: a row that
    // rendered here would name seats the compose door never reads
    expect(deriveCommissions({ extend: [42] })).toEqual([])
    expect(deriveCommissions({ reshoot: ["clips/take4.mp4"] })).toEqual([])
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

  it("ARM 8 — every kind is derivable from a real card-shaped entry (no kind is a stub)", () => {
    const entries: Record<CommissionKind, Record<string, unknown>> = {
      replace: REPLACE, repair: REPAIR, extend: EXTEND, reshoot: RESHOOT,
    }
    for (const kind of COMMISSION_KINDS) {
      const rows = deriveCommissions({ [kind]: [entries[kind]] })
      expect(rows[0]!.seats.length, `${kind} names at least one seat`).toBeGreaterThan(0)
    }
  })
})
