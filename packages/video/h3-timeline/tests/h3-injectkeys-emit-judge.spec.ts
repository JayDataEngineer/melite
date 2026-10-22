/**
 * h3-injectkeys-emit-judge.spec.ts — THE EMIT-SIDE JUDGE ARM (ERROR
 * g/h, audit §3 SD-3 "the emit-dialect vs presence-gate" + §7 P3's
 * family-judge half). Method: dev_docs/THE_JOURNEY_LAW.md §4 Q10
 * (judge the hop where the burn lives) — this arm rides hops [2]→[4]:
 * the studio serializer's EMIT (docHydrate.ts serializeLayerA) → the
 * stored arrival → the REAL t4r clause (the same walk
 * packages/models/h3/src/schema.ts:573-601 runs; the card's
 * admitFamily face and the run door are its other seats).
 *
 * THE INVARIANT: a doc the studio's own serializer emitted must
 * compose clean on the lane it ARRIVES on — and the estate must own
 * the emit→arrival transition: either the emit side re-derives the
 * family at every arrival (reseat), or the arrival's flip gesture
 * refuses. Today the emit side honors the clause ONLY when it derives
 * t4r at EMIT time (B1's strip, docHydrate.ts:437-439, inside studio
 * commits — useShownDoc.ts:20-28 is the writer's only jurisdiction);
 * a family flip that lands BETWEEN commits (an agent patch, a tool
 * write, a settlement strand — useShownDoc.ts:226-231 names the
 * honest edge) re-derives the lane under a LEGAL emit and the walk
 * refuses LIVE. That is SD-3: the always-emit booleans
 * (docHydrate.ts:336-337) and the true-gated masters (docHydrate.ts:
 * 354-372) speak the EMIT dialect, the walk judges PRESENCE on the
 * arrival (schema.ts:573-577), and no single owner decides the legal
 * key set at the seam outside studio commits.
 *
 * THE PRE-REGISTERED RED (today's tree): a legal t4_open emit (every
 * boolean it carries was sanctioned on ITS lane) settles under a
 * non-studio keyframe pin and refuses at the real door with the
 * operator's verbatim spine; and the serializer's ALWAYS-EMIT poles
 * (false, unstated by anyone) alone poison the same arrival.
 */
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts"
import "../../../../tests/helpers/boot-models.ts"
import { describe, expect, it, beforeAll, afterAll } from "vitest"
import { Context } from "@deepseek-ai/cordis"
import type {} from "../../../../packages/harness/estate-queue/src/service.ts"
import { CardRegistryService } from "../../../../packages/harness/estate-queue/src/cardsRegistry.ts"
import { formSpecArm } from "../../../../packages/harness/melite-tools/src/discovery.ts"
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { serializeLayerA, hydrateLayerA } from "../src/ui/studio/docHydrate.ts"
import { schema as h3schemaFn } from "@melite/models-h3/schema"
import { deriveWindowFamily, reseatFamilyDead } from "@melite/models-h3/timelineContract"

const REFUSAL_SPINE = /h3_window\(t4r\): unsanctioned inject keys: /

/** THE BENCH MERGE-PATCH LAW (drafts door, bench.ts:969-985 — per
 *  key, null deletes), SETTLED THROUGH THE FAMILY RESEAT (the ERROR
 *  g/h cure, 2026-11-08): the door's merge runs first (the raw
 *  merged view below is what a seat WITHOUT the reseat would land),
 *  then the settlement spine drops the family-dead carry the flip
 *  strands — the row that lands is the row the next run composes.
 *  The raw view rides OUT of this function too (the no-mute
 *  companion judges the door still refuses it). */
function settleRaw(base: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  const settled: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(saved)) {
    if (v === null) delete settled[k]
    else settled[k] = v
  }
  return settled
}
function settle(base: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  // run seat: the doc itself is the history (nothing is authored at
  // a run press) — the carry line drops the whole stranded strand.
  const settled = settleRaw(base, saved)
  return reseatFamilyDead(settled, settled).doc
}

describe("THE EMIT-SIDE JUDGE ARM (SD-3 — a studio-emitted doc composes clean on the lane it arrives on)", () => {
  let svc: CardRegistryService
  beforeAll(async () => {
    const ctx = new Context()
    ;(ctx as unknown as { queue: unknown }).queue = {
      stateRoot: mkdtempSync(join(tmpdir(), "emit-judge-boot-")),
      stateRoots: [] as string[],
    }
    svc = new CardRegistryService(ctx)
    await svc.prime()
    assertHermeticRode()
    installLaneStoreOverlay()
    if ((await formSpecArm("h3")) === null) throw new Error("the served h3 form-spec did not answer")
  }, 90_000)
  afterAll(() => { restoreLaneStoreOverlay() })

  /** THE LEGAL EMIT: a t4_open state whose every post boolean was
   *  sanctioned on ITS OWN lane (the Final-Cut era of the doc), run
   *  through the REAL serializer with the persisted base the commit
   *  seam rides. */
  function legalEmit(): Record<string, unknown> {
    const base: Record<string, unknown> = {
      seed: 7, width: 768, height: 448, steps: 12,
      calls: [{ text: "the harbour holds its breath", start_frame: 0, end_frame: 90 }],
    }
    const state = {
      seed: 7, width: 768, height: 448, steps: 12,
      second_pass_enabled: true, sr_switch: true,
      sharpen_enabled: false, interpolate_enabled: false,
    }
    const out = serializeLayerA(state as never, base)
    expect(deriveWindowFamily(out), "the emit's own derived lane is t4_open — the stamps were legal HERE").toBe("t4_open")
    return out
  }

  it("BASELINE (must stay green): the legal emit composes clean on its OWN derived lane — the real walk and the real door", async () => {
    const out = legalEmit()
    expect(() => h3schemaFn(out), "the walk must accept the emit on the lane the emit itself derives").not.toThrow()
    await expect(
      svc.phase1Card({ ...out, card: "h3-timeline", model: "h3" }, "h3"),
      "the legal emit composes at the real door on its own lane",
    ).resolves.toBeDefined()
  })

  it("THE SD-3 TRANSITION (ERROR g): the legal emit settles under a non-studio keyframe pin and the ARRIVAL LANDS COMPOSING — the settlement seat owns the flip", async () => {
    const out = legalEmit()
    // THE FLIP, outside any studio commit: the pin rides a params
    // patch (agent patch / tool write spelling — the exact keys the
    // write carries), settled by the bench merge-patch onto the
    // emitted doc. No studio writer (useShownDoc's flip writer is
    // jurisdiction-bound to studio commits) re-runs the emit law —
    // the SETTLEMENT seat does (the family reseat, drafts doors).
    const raw = settleRaw(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    const arrival = settle(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    expect(deriveWindowFamily(arrival), "the flip flipped the derived family").toBe("t4r")
    // THE INVARIANT THE ARM EXISTS FOR: the transition lands a
    // composing doc — the settlement reseated the emit's stamps for
    // the new lane (the reseat receipt below names them; the no-mute
    // companion proves the door never lost its teeth).
    let refused: string | null = null
    try {
      h3schemaFn(arrival)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    const doorRefused = await svc.phase1Card({ ...arrival, card: "h3-timeline", model: "h3" }, "h3")
      .then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)))
    const clean = refused === null && doorRefused === null
    expect(clean, `ERROR g/h (SD-3): the LEGAL emit (t4_open, every stamp sanctioned on its own lane) arrives t4r and REFUSES — walk: ${String(refused)} — door: ${String(doorRefused)} — the settlement seat (the family reseat) did not own the flip`).toBe(true)
    // THE RESEAT RECEIPT (the cure's own voice, never silent): the
    // arrival carries NONE of the carried stamps — the spine dropped
    // exactly the burn's four (sorted), and the RAW merged view (what
    // a seat without the reseat would land) still walks into the
    // operator's spine.
    const dropped = reseatFamilyDead(raw, raw).dropped
    expect(dropped, "the reseat names exactly what it dropped (sorted)").toEqual(
      ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"],
    )
    for (const k of dropped) {
      expect(arrival, `the arrival no longer carries '${k}'`).not.toHaveProperty(k)
    }
    // THE NO-MUTE COMPANION (never silenced): the door still refuses
    // the RAW view in the operator's own words — the reseat at the
    // settlement never muted the walk.
    expect(() => h3schemaFn(raw), "the raw merged view still refuses with the spine")
      .toThrow(REFUSAL_SPINE)
  })

  it("THE ALWAYS-EMIT FALSE POLES: the serializer's unstated poles alone cannot poison the settled arrival — the reseat owns them at the flip", async () => {
    // A doc that NEVER carried a post boolean — the hydrate materializes
    // false poles, and serializeLayerA emits them UNCONDITIONALLY
    // (docHydrate.ts:336-337: `sharpen_enabled: a.sharpen_enabled === true`
    // — false is a VALUE, and presence is the walk's crime).
    const sparse = { seed: 7, steps: 12, fps: 24 }
    const out = serializeLayerA(hydrateLayerA(sparse) as never)
    expect(out.sharpen_enabled).toBe(false)
    expect(out.interpolate_enabled).toBe(false)
    // The emit is legal on its own open lane…
    expect(deriveWindowFamily(out)).toBe("t4_open")
    expect(() => h3schemaFn(out)).not.toThrow()
    // …and the settled arrival lands clean: the poles nobody authored
    // are PRESENCE to the walk, so the settlement seat drops them with
    // the rest of the family-dead carry (the cure owns the exact
    // ERROR h face — an arrival flip can no longer weaponize booleans
    // no gesture authored).
    const arrival = settle(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    let refused: string | null = null
    try {
      h3schemaFn(arrival)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    const clean = refused === null
    expect(clean, `ERROR h (SD-3): the settled arrival still refuses — ${String(refused)} — the settlement seat (the family reseat) did not own the unstated poles`).toBe(true)
    expect(arrival, "the poles nobody authored do not ride the arrival").not.toHaveProperty("sharpen_enabled")
    expect(arrival, "the poles nobody authored do not ride the arrival").not.toHaveProperty("interpolate_enabled")
  })
})
