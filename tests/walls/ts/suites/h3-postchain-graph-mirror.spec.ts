// THE POST-CHAIN GRAPH MIRROR (burn b, 2026-10-26 — operator: "H3
// VIDEO UI LIE… UI DOES NOT REFLECT BACKEND AT ALL, IT WILL ALWAYS
// UPSCALE"). The serialized h3 graph is a FACE: the operator reads
// it (the run's _flow.json, the engine queue) as the backend's own
// statement of what a press will do. The reworked post chain gates
// sharpen/interp/SeedVR2 behind doc switches — but the composer
// built EVERY limb unconditionally and routed a lazy
// ComfySwitchNode around each: the doc said off, the face offered
// the off switch, and every composed graph still carried the
// upscaler (proven live: run-72a08d81afd3, all switches off,
// nodes=33 with SeedVR2VideoUpscaler + both loaders + FrameInterpolate
// + ImageSharpenKJ + three post switches). THE GRAPH IS THE
// STATEMENT — a graph that always carries the upscaler is a backend
// that says "it will always upscale", whatever the UI serves.
//
// THE LAW THIS WALL OWNS: each post-chain limb composes IFF its own
// doc gate is on. The off doc's graph carries NONE of them — the
// engine never even sees the nodes (no lazy-switch bet, no dead
// weight in the queue), and an on limb rides with its stated values
// verbatim. The switches themselves die at the compose seat: the TS
// build picks the wire (the doc's truth at build time), the same
// way the latent-upscale handoff and the refine rider already mount
// behind their gates.
//
// THE DOOR: the card def's REAL path (def.schema then def.compose —
// the same hop the run rides), booted through the real models table
// (boot-models header law). THE WITNESS: class census over the
// serialized graph — presence judged per limb, values judged at the
// limb's own inputs (the value-roundtrip wall's voice, hop [5]).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "@melite/comfyui-cordis";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type GNode = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, GNode>;

/** THE COMPOSE DOOR — the same def.compose the run rides (hop 4). */
async function composeH3(doc: Record<string, unknown>, runId: string): Promise<Graph> {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const model: ModelFacts | undefined = facts.models["h3"];
  assert.ok(model, "the h3 family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

/** The post-chain limb classes — every node the reworked chain can
 *  mount. Judged as a census: presence per class, never order. */
const POST_CLASSES = [
  "SeedVR2VideoUpscaler", "SeedVR2LoadDiTModel", "SeedVR2LoadVAEModel",
  "FrameInterpolate", "FrameInterpolationModelLoader", "ImageSharpenKJ",
] as const;

function census(graph: Graph, cls: string): Array<[string, GNode]> {
  return Object.entries(graph).filter(([, n]) => n.class_type === cls);
}

/** THE MIRROR VOICE: name exactly which limbs leaked onto an off
 *  doc — the census that fired, not a count. */
function assertNoPostLimbs(graph: Graph, what: string): void {
  const leaked = POST_CLASSES
    .flatMap((cls) => census(graph, cls).map(([id]) => `${id} (${cls})`));
  assert.deepEqual(leaked, [],
    `${what}: the off doc's serialized graph still carries post-chain limbs [${leaked.join(", ")}] — the graph states an upscale/sharpen/interp the doc never asked for (THE ALWAYS-UPSCALE LIE: the UI says off, every composed graph says on)`);
}

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

describe("the h3 post chain mirrors the doc (burn b — the serialized graph is the backend's own face)", () => {
  let def: CardDefinition;
  beforeAll(async () => {
    def = (await loadCardDefs()).get("h3-timeline")!;
    void def;
  });

  it("ARM 1 — THE OFF DOC: every second-pass switch off composes ZERO post-chain limbs (the graph itself says no upscale)", async () => {
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: false,
      calls: [SHOT()],
    }, "h3_postchain_arm1_off");
    assertNoPostLimbs(graph, "ARM 1 (stated master off)");
  });

  it("ARM 1b — THE UNSTATED DOC (the operator's own bench shape): no second-pass key at all composes ZERO post-chain limbs", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
    }, "h3_postchain_arm1b_unstated");
    assertNoPostLimbs(graph, "ARM 1b (unstated master)");
  });

  it("ARM 2 — sr on (and ONLY sr): the upscaler rides with its stated values, the interp/sharpen limbs stay absent", async () => {
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: true, sr_switch: true,
      sr_model: "seedvr2_ema_3b_fp8_e4m3fn.safetensors", sr_resolution: 1440,
      calls: [SHOT()],
    }, "h3_postchain_arm2_sr");
    const sr = census(graph, "SeedVR2VideoUpscaler");
    assert.ok(sr.length === 1, "sr_switch on composes exactly one SeedVR2VideoUpscaler");
    assert.equal(sr[0][1].inputs.resolution, 1440, "the stated sr_resolution rides the upscaler");
    const dit = census(graph, "SeedVR2LoadDiTModel");
    assert.ok(dit.length === 1 && dit[0][1].inputs.model === "seedvr2_ema_3b_fp8_e4m3fn.safetensors",
      "the stated sr_model rides the DiT loader");
    assert.ok(census(graph, "FrameInterpolate").length === 0, "interp off ⇒ no FrameInterpolate (leaves own their own switches)");
    assert.ok(census(graph, "ImageSharpenKJ").length === 0, "sharpen off ⇒ no ImageSharpenKJ");
  });

  it("ARM 3 — interp on (and ONLY interp): the interpolator rides with its stated multiplier, the sr/sharpen limbs stay absent", async () => {
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: true, interpolate_enabled: true, interp_multiplier: 4,
      calls: [SHOT()],
    }, "h3_postchain_arm3_interp");
    const interp = census(graph, "FrameInterpolate");
    assert.ok(interp.length === 1, "interpolate_enabled on composes exactly one FrameInterpolate");
    assert.equal(interp[0][1].inputs.multiplier, 4, "the stated interp_multiplier rides the interpolator");
    assert.ok(census(graph, "SeedVR2VideoUpscaler").length === 0, "sr off ⇒ no SeedVR2VideoUpscaler");
    assert.ok(census(graph, "ImageSharpenKJ").length === 0, "sharpen off ⇒ no ImageSharpenKJ");
  });

  it("ARM 4 — sharpen on (and ONLY sharpen): the sharpener rides its stated method, the sr/interp limbs stay absent", async () => {
    const graph = await composeH3({
      length: 56,
      second_pass_enabled: true, sharpen_enabled: true,
      sharpen_method: "adaptive_usm", sharpen_strength: 0.55,
      calls: [SHOT()],
    }, "h3_postchain_arm4_sharpen");
    const sharp = census(graph, "ImageSharpenKJ");
    assert.ok(sharp.length === 1, "sharpen_enabled on composes exactly one ImageSharpenKJ");
    const method = sharp[0][1].inputs.method as Record<string, unknown>;
    assert.equal(method.method, "adaptive_usm", "the stated sharpen_method rides the method dict");
    assert.equal(method.strength, 0.55, "the stated sharpen_strength rides the method dict");
    assert.ok(census(graph, "SeedVR2VideoUpscaler").length === 0, "sr off ⇒ no SeedVR2VideoUpscaler");
    assert.ok(census(graph, "FrameInterpolate").length === 0, "interp off ⇒ no FrameInterpolate");
  });

  it("ARM 5 — THE MASTER GATE SURVIVES THE MIRROR: legacy leaves (sr_switch on) WITHOUT the master compose the plain pass — no limb, no exception", async () => {
    const graph = await composeH3({
      length: 56,
      sr_switch: true, interpolate_enabled: true, sharpen_enabled: true,
      calls: [SHOT()],
    }, "h3_postchain_arm5_master_gate");
    assertNoPostLimbs(graph, "ARM 5 (legacy leaves, master absent — the 2026-09-22 master gate)");
  });
});
