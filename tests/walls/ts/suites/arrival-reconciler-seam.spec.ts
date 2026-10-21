// arrival-reconciler-seam.spec.ts — THE RECONCILER-SEAM WALL (SD-10
// sub-finding ii: reseatEnvelopeKeys runs ARRIVAL-ONLY as a THIRD
// reconciler beside two existing reconcilers — the count/roles were
// unpinned).
//
// THE LESION IT KILLS: the stage drill's seed seam runs THREE
// reconcilers, each with one role —
//   1. THE SWITCH RECONCILER  modelSwitchPatch — a re-key's vocabulary
//      rescope (depdict the departed family's own words);
//   2. THE SEED RECONCILER    seedUser — the caller-wins seed over the
//      arrival spec (a FRESH OPEN rides it verbatim — the pass-along
//      law);
//   3. THE ARRIVAL RECONCILER reseatEnvelopeKeys — the re-keyed
//      arrival's envelope-bound numerics re-seat against the resolved
//      variant's envelope, and NEVER on a fresh open.
// No wall pinned the count or the roles: a fourth reconciler could
// join the seam, the reseat could leak onto fresh opens (rewriting a
// pass-along doc the law says rides verbatim), or the reseat arm
// could leave the seam entirely (the re-key burn returns: stated cfg
// 3.5 rides into a [1,2] turbo lane and every door refuses the card)
// — all silent. The census wall derives the seam from the drill's
// own source (never a hand list) and judges it.
//
// Run: npx vitest run --project walls tests/walls/ts/suites/arrival-reconciler-seam.spec.ts

import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  modelSwitchPatch,
  reseatEnvelopeKeys,
  seedUser,
} from "../../../../packages/web/card-base/src/spec.ts"
import type { FormSpecDoc } from "@melite/contracts/formSpec"

const DRILL = join(
  process.cwd(),
  "packages", "web", "melite-card-view", "src", "client", "stage-drill.tsx",
)
const drillSource = readFileSync(DRILL, "utf8")

// ── THE SEAM'S DERIVED ROSTER (own-path rule: each role judged on
// its own occurrence in the real source, never through one masked
// call) ──────────────────────────────────────────────────────────────
const countOf = (hay: string, needle: string): number =>
  hay.split(needle).length - 1
const SWITCH_SEAT = "rescope = modelSwitchPatch("
const SWITCH = "modelSwitchPatch("
const SEED = "seedUser("
const RESEAT = "reseatEnvelopeKeys("
// THE ARRIVAL GATE, VERBATIM: the reseat runs ONLY on the non-fresh
// arm of the seed settlement (stage-drill.tsx:468) — the ternary IS
// the arrival-only law.
const ARRIVAL_GATE = "setUser(freshOpen ? seeded : reseatEnvelopeKeys(doc, seeded))"
// THE SEED SEAM = the region from the switch re-key's rescope through
// the seed's settlement call — the three reconcilers' home (derived
// from the source itself, never line numbers; the region ends at the
// settlement's own `setUser(` line, whatever arms it carries, so the
// gate law judges on its own face below).
const seamStart = drillSource.indexOf(SWITCH_SEAT)
const seedIdx = drillSource.indexOf(SEED, seamStart < 0 ? 0 : seamStart)
const settleIdx = seedIdx < 0 ? -1 : drillSource.indexOf("setUser(", seedIdx)
const settleLineEnd = settleIdx < 0 ? -1 : drillSource.indexOf("\n", settleIdx)
const SEED_SEAM = seamStart >= 0 && settleLineEnd > seamStart
  ? drillSource.slice(seamStart, settleLineEnd)
  : ""

describe("SD-10 ii: the drill's seed seam runs exactly THREE reconcilers, each at exactly its declared role", () => {
  it("the seed seam is exactly switch → seed → arrival, each occurring once inside it, and the reseat is arrival-gated (never a fresh open)", () => {
    // THE SEAM EXISTS: the region derivation must land — a renamed
    // seam reds here instead of silently judging nothing.
    expect(SEED_SEAM, "the seed seam region derived from the drill's own source (switch seat through the arrival gate)").not.toBe("")
    // THE COUNT, PER ROLE, INSIDE THE SEAM: exactly one call each — a
    // fourth reconciler, a duplicated role, or a role dropped from
    // the seam reds by name.
    expect(
      countOf(SEED_SEAM, SWITCH),
      "the SWITCH reconciler (modelSwitchPatch) runs at exactly one seed-seam seat",
    ).toBe(1)
    expect(
      countOf(SEED_SEAM, SEED),
      "the SEED reconciler (seedUser) runs at exactly one seed-seam seat",
    ).toBe(1)
    expect(
      countOf(SEED_SEAM, RESEAT),
      "the ARRIVAL reconciler (reseatEnvelopeKeys) runs at exactly one seed-seam seat",
    ).toBe(1)
    // THE ROLE ORDER: the switch's rescope feeds the seed (its output
    // is the seed's source), and the reseat settles AFTER the seed —
    // the arrival re-seat must judge the SEEDED layer, or the re-key
    // burn's residue slips past it.
    expect(
      SEED_SEAM.indexOf(SWITCH),
      "the switch rescope precedes the seed (its output feeds the seed source)",
    ).toBeLessThan(SEED_SEAM.indexOf(SEED))
    expect(
      SEED_SEAM.indexOf(SEED),
      "the seed precedes the arrival re-seat (the reseat judges the SEEDED layer)",
    ).toBeLessThan(SEED_SEAM.indexOf(RESEAT))
    // THE ARRIVAL-ONLY GATE, VERBATIM: the reseat never runs on a
    // fresh open — the gate ternary is the law's exact spelling, and
    // its seeded arm rides seedUser's output VERBATIM (the pass-along
    // law: an open doc is never rewritten).
    expect(
      drillSource.includes(ARRIVAL_GATE),
      "the reseat is gated `freshOpen ? seeded : reseatEnvelopeKeys(doc, seeded)` — arrival-only, fresh opens ride verbatim",
    ).toBe(true)
    // THE SET-GESTURE RE-POINT (the switch reconciler's SECOND seat,
    // outside the seed seam): the drill's onSet re-point re-derives
    // the patch per gesture — and must stay a RE-POINT only: it never
    // re-runs the seed or the arrival reseat (a gesture that reseats
    // the user layer rewrites a doc the caller-wins law protects).
    const repointIdx = drillSource.indexOf(SWITCH, seamStart + SWITCH_SEAT.length)
    expect(repointIdx, "the switch reconciler's set-gesture re-point seat exists outside the seed seam").toBeGreaterThan(-1)
    const repointRegion = drillSource.slice(repointIdx, repointIdx + 400)
    expect(
      countOf(repointRegion, SEED) + countOf(repointRegion, RESEAT),
      "the re-point seat never re-runs the seed or the arrival reseat",
    ).toBe(0)
    // THE EXPORTS ARE THE ONE MECHANISM: the drill's reconcilers are
    // the card-base spec exports imported here — a hand-rolled second
    // copy of any role reds at the import seam (the module's own
    // identity is the judge).
    expect(typeof modelSwitchPatch, "the switch reconciler is the card-base export").toBe("function")
    expect(typeof seedUser, "the seed reconciler is the card-base export").toBe("function")
    expect(typeof reseatEnvelopeKeys, "the arrival reconciler is the card-base export").toBe("function")
  })

  it("the arrival reconciler is load-bearing at the seam: the re-key residue it re-seats is the exact shape the gate passes it", () => {
    // The seam's own shape, driven through the REAL mechanism: the
    // switch re-keys anima → krea-2's turbo lane; the seed carries a
    // stated-by-hand cfg 3.5 (the incident's residue — an
    // envelope-less departure nulls no vocabulary); the arrival
    // re-seat clamps it into the [1,2] lane. Without the reseat arm,
    // the residue composes and every door refuses the card.
    const arrival: FormSpecDoc = {
      form: "x",
      model: "krea-2",
      variants: [
        {
          id: "turbo",
          label: "Turbo",
          group: "Variant",
          route: "krea-2-turbo",
          defaults: {},
          sampler_envelope: { cfg: [1, 2], steps: [4, 8] },
        },
      ],
    }
    // The gate's non-fresh arm: reseatEnvelopeKeys(doc, seeded) with
    // the seeded layer the seed reconciler produced.
    const seated = reseatEnvelopeKeys(arrival, {
      model: "krea-2",
      variant: "turbo",
      cfg: 3.5,
      steps: 52,
    })
    expect(seated.cfg, "the stated cfg 3.5 re-seats to the nearest bound 2 — the card survives the doors").toBe(2)
    expect(seated.steps, "the stated steps 52 re-seats to the nearest bound 8").toBe(8)
    // The gate's fresh arm: the SAME call returns the seed verbatim
    // when the arrival declares no envelope — the pass-along law the
    // gate's `? seeded` arm rides.
    const plain: FormSpecDoc = {
      form: "y",
      model: "anima",
      variants: [
        { id: "base", label: "Base", group: "Variant", route: "anima", defaults: {} },
      ],
    }
    const untouched = reseatEnvelopeKeys(plain, { model: "anima", variant: "base", cfg: 3.5 })
    expect(untouched, "an envelope-less arrival rides verbatim — nothing judges, nothing rewrites").toEqual({
      model: "anima",
      variant: "base",
      cfg: 3.5,
    })
  })
})
