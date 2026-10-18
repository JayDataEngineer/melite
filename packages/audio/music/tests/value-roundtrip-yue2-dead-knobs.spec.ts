// value-roundtrip-yue2-dead-knobs.spec.ts — THE YUE2 DEAD-KNOB WALL
// (purge P2's scalar-switch wedge on the music lane, 2026-11-08).
//
// THE BURN: the yue2 DECL serves `guidance_scale` + `lm_cfg_scale`
// (packages/models/yue2/src/index.ts params row) but the yue2
// compose action NEVER READS them (packages/models/yue2/src/
// actions.ts:57-95 — KSampler cfg is the lane's fixed 1, no lm_cfg
// input exists on either YuE2 node; "guidance lives on the AR
// side"). The card schema admits both knobs on every model
// (visible_when is a UI render hint — admission gates on the schema
// dict, never visible_when), so a draft stating guidance on yue2 —
// e.g. authored on music3, then the model switched (the SD-1 wedge:
// authored-on-A-fires-nothing-on-B) — is ADMITTED, HIDDEN, and
// UNREAD. The purge's NOT-COVERED names exactly this row: "music
// yue2 DECL params row for the guidance/lm_cfg symmetry (one-line
// verify owed)".
//
// THE CLASS LAW a stated knob owes (the mode precedent, music3/
// actions.ts:59-78 + value-roundtrip.spec.ts ARM 2): fire at a
// consumer, or refuse LOUD naming the knob. Silence is the burn.
//
// THE CURE (owed, not this file): the mode precedent's two layers —
// the DECL drops the dead knobs from its params surface and the
// compose action refuses a legacy draft still carrying them in the
// knob's own voice, while the schema default-filled doc rides (the
// CONTROL below documents the trap: the gated doc always carries
// 1.7s, so the refusal must key on the STATED draft, never the
// composed doc — exactly how the write door + build split the mode
// job). NO SOURCE FILE IS FIXED HERE — tests first.
//
// SELF-CONTAINED BY DESIGN: this wall duplicates the sibling
// value-roundtrip.spec.ts's card-path seats (hermetic boot +
// composeCard) rather than importing them — the P2-numerics journey
// auditor measures that file, and this wall must not touch it.
//
// Run: npx vitest run packages/audio/music/tests/value-roundtrip-yue2-dead-knobs.spec.ts

// THE HERMETIC ENGINE, FIRST IMPORT (the boot-models first-import
// law): the mock registers before any estate barrel evaluates, so
// no path in this file can dial a live engine.
import "../../../../tests/helpers/hermetic-engine.ts";
// THE MODELS BOOT, SECOND (the per-file boot brick — the served
// families table the card defs and the facts rows resolve through).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll, afterAll } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Context } from "@deepseek-ai/cordis";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { assertHermeticRode } from "../../../../tests/helpers/hermetic-engine.ts";
// THE DOOR (D3/D4, layer 1) — the music wall's proven boot shape
// (CardRegistryService + queue stub + lane-store overlay): the
// admission gate refuses the dropped knobs BEFORE any compose.
import { CardRegistryService } from "../../../harness/estate-queue/src/cardsRegistry.ts";
import type {} from "../../../harness/estate-queue/src/service.ts";
import { FlowsSeatService } from "../../../harness/estate-queue/src/flowsData.ts";
import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type Graph = Record<string, { class_type?: unknown; inputs?: Record<string, unknown> }>;

let def: CardDefinition;
let yue2: ModelFacts;
let door: CardRegistryService;

/** Compose through the card def's REAL path (the schema walk then
 *  def.compose — the service's own order). */
function composeCard(doc: Record<string, unknown>, model: ModelFacts, runId: string): Graph {
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

beforeAll(async () => {
  def = (await loadCardDefs()).get("music")!;
  assert.ok(def, "the composition root serves the music card");
  yue2 = facts.models.yue2!;
  assert.ok(yue2 !== undefined, "the yue2 family serves a facts row");
  // THE DOOR BOOT (the music wall's proven hermetic seat): the queue
  // stub pins a temp tree, the registry primes through the mocked
  // liveObjectInfo, and the lane store overlay materializes the
  // DECLared music weights.
  const ctx = new Context();
  new FlowsSeatService(ctx);
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "yue2-dead-knobs-")),
    stateRoots: [] as string[],
  };
  door = new CardRegistryService(ctx);
  await door.prime();
  assertHermeticRode();
  installLaneStoreOverlay();
}, 120_000);

afterAll(() => {
  restoreLaneStoreOverlay();
});

// ── THE STATED VALUES (distinctive non-defaults: guidance 2.5 ≠
// 1.7, lm_cfg 3.5 ≠ 1.7 — a default-echoing wall would pass on a
// default carry and prove nothing). ──
const GUIDANCE = 2.5;
const LM_CFG = 3.5;

describe("the yue2 dead knobs refuse loud (guidance_scale/lm_cfg_scale fire nothing on the YuE2 lane)", () => {
  it("D1 CURED: a stated guidance_scale on yue2 REFUSES loud naming the knob (DECL surface dropped + build refuses legacy drafts, mode precedent)", () => {
    // THE SD-1 WEDGE on the music lane: authored on music3 (where
    // guidance drives KSampler cfg), model switched to yue2 (where
    // KSampler cfg is the lane's fixed 1) — the knob is ADMITTED by
    // the card schema, HIDDEN by visible_when, and UNREAD by the
    // compose. The mode precedent (music3/actions.ts:59-78) is the
    // law: fire at a consumer, or refuse LOUD naming the knob.
    assert.throws(
      () => composeCard(
        { prompt: " ZZQ-D1 ", lyrics: "", guidance_scale: GUIDANCE, seed: 4242 },
        yue2, "yue2_dead_knobs_d1",
      ),
      /guidance_scale/,
      "STATED-KNOB LAW (hop [4]→[5]): yue2 composed a stated guidance_scale in silence — " +
      "the knob fires at no consumer (KSampler cfg is the lane's fixed 1) and no voice names it. " +
      "The cure drops it from the DECL surface + refuses legacy drafts in the knob's own voice (mode precedent).",
    );
  });

  it("D2 CURED: a stated lm_cfg_scale on yue2 REFUSES loud naming the knob (same cure as D1)", () => {
    // The lm_cfg twin: neither YuE2GenerateABC nor YuE2GenerateMusic
    // declares an lm_cfg input — the lyric-encoder guidance is the
    // MiniMax lane's cfg_scale only.
    assert.throws(
      () => composeCard(
        { prompt: " ZZQ-D2 ", lyrics: "", lm_cfg_scale: LM_CFG, seed: 4242 },
        yue2, "yue2_dead_knobs_d2",
      ),
      /lm_cfg_scale/,
      "STATED-KNOB LAW (hop [4]→[5]): yue2 composed a stated lm_cfg_scale in silence — " +
      "the knob fires at no consumer and no voice names it. Same cure as D1 (mode precedent).",
    );
  });

  it("CONTROL: the unstated doc rides (the cure must key on the STATED draft, never the composed doc)", () => {
    // THE DEFAULT-FILL TRAP the cure respects: the gated doc ALWAYS
    // carries guidance_scale 1.7 + lm_cfg_scale 1.7 (card schema
    // defaults) — a compose-time refusal on presence would break
    // every yue2 run. The mode precedent splits the job: the write
    // door refuses the STATED draft (D3/D4 below), the build refuses
    // what a legacy draft still carries non-default (D1/D2 above).
    // This control pins the ride half.
    const graph = composeCard({ prompt: " ZZQ-CTRL ", lyrics: "", seed: 4242 }, yue2, "yue2_dead_knobs_ctrl");
    const samplers = Object.values(graph).filter((n) => n.class_type === "KSampler");
    assert.equal(samplers.length, 1, "the unstated doc composes its sampler");
    assert.equal(samplers[0]!.inputs!["cfg"], 1, "yue2 KSampler cfg stays the lane's fixed 1");
  });

  it("D3 CURED (layer 1, door): phase1Card refuses a guidance-stated yue2 draft naming the knob", async () => {
    // THE WRITE-DOOR HALF of the cure: the DECL surface no longer
    // serves guidance_scale on yue2, so the admission gate refuses
    // the STATED draft before any schema walk — the SD-1 wedge dies
    // at the door, not in the graph.
    await assert.rejects(
      door.phase1Card({ model: "yue2", prompt: " ZZQ-D3 ", lyrics: "", guidance_scale: GUIDANCE, seed: 4242 }, "yue2"),
      /refuses the state: field 'guidance_scale'/,
      "the door admitted a guidance-stated yue2 draft — the DECL surface must not serve the knob",
    );
  });

  it("D4 CURED (layer 1, door): phase1Card refuses an lm_cfg-stated yue2 draft naming the knob", async () => {
    await assert.rejects(
      door.phase1Card({ model: "yue2", prompt: " ZZQ-D4 ", lyrics: "", lm_cfg_scale: LM_CFG, seed: 4242 }, "yue2"),
      /refuses the state: field 'lm_cfg_scale'/,
      "the door admitted an lm_cfg-stated yue2 draft — the DECL surface must not serve the knob",
    );
  });
});
