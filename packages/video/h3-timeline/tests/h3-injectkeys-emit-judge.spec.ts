/**
 * h3-injectkeys-emit-judge.spec.ts — THE EMIT-SIDE JUDGE ARM
 * (retired lane law, 2026-11-15). The original arm rode hops [2]→[4]
 * of the operator's burn: a studio-emitted doc (the always-emit
 * booleans + the true-gated masters, docHydrate.ts serializeLayerA)
 * settled under a non-studio keyframe pin, re-derived t4r, and the
 * real walk refused the presence of keys that had been legal on the
 * emit's own lane (SD-3 / ERROR g/h). The 2026-11-15 cure went to
 * the ROOT: the t4r render arm now mounts the post chain
 * (actions.ts), so the finish keys are honored on EVERY lane and no
 * arrival refuses them. These arms pin the new truth: the emit →
 * flip → arrival transition LANDS COMPOSING and KEEPS every stamp;
 * the settlement seat drops nothing because nothing is lane-dead.
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
import { deriveWindowFamily } from "@melite/models-h3/timelineContract"

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
  // the bench merge-patch: the whole store, nothing dropped — no key
  // is lane-dead since the 2026-11-15 retirement.
  return settleRaw(base, saved)
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

  it("THE SD-3 TRANSITION (retired): the legal emit settles under a non-studio keyframe pin and the ARRIVAL LANDS COMPOSING with every stamp KEPT", async () => {
    const out = legalEmit()
    // THE FLIP, outside any studio commit: the pin rides a params
    // patch (agent patch / tool write spelling), settled by the
    // bench merge-patch onto the emitted doc.
    const raw = settleRaw(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    const arrival = settle(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    expect(deriveWindowFamily(arrival), "the flip flipped the derived family").toBe("t4r")
    // THE INVARIANT THE ARM EXISTS FOR: the transition lands a
    // composing doc AND keeps the operator's stamps — nothing is
    // reseated because nothing is lane-dead.
    let refused: string | null = null
    try {
      h3schemaFn(arrival)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    const doorRefused = await svc.phase1Card({ ...arrival, card: "h3-timeline", model: "h3" }, "h3")
      .then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)))
    expect(
      refused === null && doorRefused === null,
      `the LEGAL emit (t4_open) arrives t4r and must COMPOSE — walk: ${String(refused)} — door: ${String(doorRefused)}`,
    ).toBe(true)
    // the receipt: the arrival carries the four stamps verbatim (the
    // walk fires them on the t4r arm; nothing is dropped).
    for (const k of ["interpolate_enabled", "second_pass_enabled", "sharpen_enabled", "sr_switch"] as const) {
      expect(arrival, `the arrival keeps '${k}'`).toHaveProperty(k)
    }
    // the RAW merged view is the same doc (no settlement seat exists):
    expect(h3schemaFn(raw), "the raw merged view composes too").toBeDefined()
  });

  it("THE ALWAYS-EMIT FALSE POLES: the serializer's unstated poles ride the settled arrival and compose — false is a value the t4r arm honors", async () => {
    // A doc that NEVER carried a post boolean — the hydrate materializes
    // false poles, and serializeLayerA emits them UNCONDITIONALLY
    // (docHydrate.ts: `sharpen_enabled: a.sharpen_enabled === true`).
    const sparse = { seed: 7, steps: 12, fps: 24 }
    const out = serializeLayerA(hydrateLayerA(sparse) as never)
    expect(out.sharpen_enabled).toBe(false)
    expect(out.interpolate_enabled).toBe(false)
    // The emit is legal on its own open lane…
    expect(deriveWindowFamily(out)).toBe("t4_open")
    expect(() => h3schemaFn(out)).not.toThrow()
    // …and the settled arrival lands clean: the false poles are the
    // arm's own OFF gates, not poison — the t4r compose honors them
    // and builds no post node from them.
    const arrival = settle(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    let refused: string | null = null
    try {
      h3schemaFn(arrival)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    expect(refused, `the settled arrival composes — ${String(refused)}`).toBeNull()
    expect(arrival, "the poles ride (the operator's state is never stripped)").toHaveProperty("sharpen_enabled")
    expect(arrival, "the poles ride (the operator's state is never stripped)").toHaveProperty("interpolate_enabled")
  });
})
