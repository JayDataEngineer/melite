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
import { deriveWindowFamily } from "@melite/models-h3/timelineContract"

const REFUSAL_SPINE = /h3_window\(t4r\): unsanctioned inject keys: /

/** THE BENCH MERGE-PATCH LAW (drafts door, bench.ts:969-985 — per
 *  key, null deletes): the settlement every write lands through. */
function settle(base: Record<string, unknown>, saved: Record<string, unknown>): Record<string, unknown> {
  const settled: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(saved)) {
    if (v === null) delete settled[k]
    else settled[k] = v
  }
  return settled
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

  it("THE SD-3 TRANSITION (ERROR g, red): the legal emit settles under a non-studio keyframe pin and the arrival refuses — no seat owns the flip between commits", async () => {
    const out = legalEmit()
    // THE FLIP, outside any studio commit: the pin rides a params
    // patch (agent patch / tool write spelling — the exact keys the
    // write carries), settled by the bench merge-patch onto the
    // emitted doc. No studio writer (useShownDoc's flip writer is
    // jurisdiction-bound to studio commits) re-runs the emit law.
    const arrival = settle(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    expect(deriveWindowFamily(arrival)).toBe("t4r")
    // THE INVARIANT THE ARM EXISTS FOR: the transition must land a
    // composing doc (some seat reseated the emit's stamps for the new
    // lane) or the flip must refuse AT THE WRITER. Today neither seat
    // exists — the arrival refuses at the door.
    let refused: string | null = null
    try {
      h3schemaFn(arrival)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    const doorRefused = await svc.phase1Card({ ...arrival, card: "h3-timeline", model: "h3" }, "h3")
      .then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)))
    const clean = refused === null && doorRefused === null
    expect(clean, `ERROR g/h (SD-3): the LEGAL emit (t4_open, every stamp sanctioned on its own lane) arrives t4r and REFUSES — walk: ${String(refused)} — door: ${String(doorRefused)} — the emit side honors the clause only at emit time (docHydrate.ts:437-439, studio-commit jurisdiction per useShownDoc.ts:20-28) and the walk judges presence at the door (schema.ts:573-577); no owner re-derives the family at the arrival flip`).toBe(true)
    // THE HONEST RECEIPT (never silenced): the refusal is the
    // operator's own spine — the cure reseats at the flip, it never
    // mutes the door.
    expect(refused ?? doorRefused ?? "", "the arrival's refusal names the unsanctioned keys").toMatch(REFUSAL_SPINE)
  })

  it("THE ALWAYS-EMIT FALSE POLES (red): the serializer states booleans nobody stated, and their bare presence poisons the flipped arrival", async () => {
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
    // …and the SAME unstated false poles alone refuse the flipped
    // arrival: a flip that lands between commits turns poles nobody
    // authored into the burn's refusal, naming keys the operator
    // never saw a control for (ERROR h's invisible-state face).
    const arrival = settle(out, { keyframes: [{ image: "anchor.png", frame: 0 }] })
    let refused: string | null = null
    try {
      h3schemaFn(arrival)
    } catch (e) {
      refused = e instanceof Error ? e.message : String(e)
    }
    const clean = refused === null
    expect(clean, `ERROR h (SD-3): unstated false poles alone refuse the arrival — ${String(refused)} — the emit dialect (always-emit, docHydrate.ts:336-337) must state only what was stated, or the presence walk must read the emit dialect; today an arrival flip weaponizes booleans no gesture authored`).toBe(true)
  })
})
