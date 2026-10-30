// @melite/models-h3 — the chain-upscale renderer as a library (the
// F19 bypass face, the swap-lib precedent: what makes the
// direct-drive emission safe is the renderer-as-library property —
// the operator can emit the loop graph from the built package entry
// point rather than hand-transcribing). Drives renderH3ChainUpscale
// at its own door: the barrel face, the seat and denoise refusals,
// and the full loop compose (the bare name at the head, the family
// plane beneath, the res_multistep tail, the assemble terminal) —
// independent of the card's upscale door.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3ChainUpscale, upscaleArmed } from "../src/index.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

const ENTRY = (): Record<string, unknown> => ({
  chain_run: "swap_0154b9ae9c",
  prompt: "the same film at twice the resolution",
  denoise: 0.24,
  steps: 20,
  segment_crf: 18,
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const ofClass = (out: Record<string, Node>, cls: string): Node[] =>
  Object.values(out).filter((n) => n.class_type === cls);

describe("renderH3ChainUpscale as a library (the bypass face)", () => {
  it("is exported from the barrel and composes the loop ending in ChainAssemble", () => {
    assert.equal(typeof renderH3ChainUpscale, "function", "the barrel serves the chain-upscale renderer (the direct-drive import face)");
    const g = new GraphBuilder();
    renderH3ChainUpscale(ENTRY(), {}, FACTS, g, "run_lib_up");
    const out = g.toJSON() as Record<string, Node>;
    const assemble = ofClass(out, "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "one assemble terminal ends the loop");
    assert.equal(assemble[0]!.inputs.filename, "run_lib_up/upscale", "the assemble rides the run tree");
    assert.equal(assemble[0]!.inputs.copy_to_output, true, "the estate film law");
  });

  it("carries the bare run name at the head (the execute door resolves it)", () => {
    const g = new GraphBuilder();
    renderH3ChainUpscale(ENTRY(), {}, FACTS, g, "run_lib_name");
    const out = g.toJSON() as Record<string, Node>;
    const managers = ofClass(out, "MiniMaxH3ChainCheckpointManager");
    assert.equal(managers.length, 1, "one CheckpointManager at the head");
    assert.equal(managers[0]!.inputs.selection_json, "swap_0154b9ae9c", "the BARE name — never a hand-authored lineage here");
    const adapters = ofClass(out, "MiniMaxH3ChainUpscaleAdapter");
    assert.deepEqual(
      adapters[0]!.inputs.source_manifest, ["MiniMaxH3ChainCheckpointManager.0", 0],
      "the manifest is the manager's wired output, never a literal",
    );
  });

  it("rides the family plane and the loop family's own sampler spelling", () => {
    const g = new GraphBuilder();
    renderH3ChainUpscale(ENTRY(), {}, FACTS, g, "run_lib_plane");
    const out = g.toJSON() as Record<string, Node>;
    assert.equal(ofClass(out, "H3SLAAttention").length, 1, "the shared plane's SLA seat");
    assert.equal(ofClass(out, "LTX_lora_loader").length, 1, "the operator's lora law seat");
    assert.equal(ofClass(out, "MiniMaxH3SigmaShift").length, 1, "the plane's sigma shift");
    assert.ok(
      ofClass(out, "KSamplerSelect").some((n) => n.inputs.sampler_name === "res_multistep"),
      "the pass-2 sampler is res_multistep, the loop family's own recipe spelling",
    );
    assert.equal(ofClass(out, "MiniMaxH3ChainPass2Prepare").length, 1, "the pass-2 prepare seat");
    assert.equal(ofClass(out, "MiniMaxH3ChainUpscaleLoopEnd").length, 1, "the loop tail");
  });

  it("refuses loud naming the empty seat", () => {
    const entry = ENTRY();
    delete entry.chain_run;
    assert.throws(
      () => renderH3ChainUpscale(entry, {}, FACTS, new GraphBuilder(), "run_lib_missing"),
      /'chain_run' names no run — .*an upscale needs the prior chain run bound/s,
      "the refusal names the seat and the run law",
    );
  });

  it("refuses full denoise naming the sigmas law", () => {
    assert.throws(
      () => renderH3ChainUpscale({ ...ENTRY(), denoise: 1.2 }, {}, FACTS, new GraphBuilder(), "run_lib_hot"),
      /denoise 1\.2 >= 1 — a second pass is an upscale, never a re-render/,
      "a full-noise pass is a reshoot, never this arm",
    );
  });

  it("a minimal entry rides the recipe's own defaults (prompt blank, denoise 0.24, steps 20, crf 18)", () => {
    const g = new GraphBuilder();
    renderH3ChainUpscale({ chain_run: "swap_min" }, {}, FACTS, g, "run_lib_defaults");
    const out = g.toJSON() as Record<string, Node>;
    const conds = ofClass(out, "MiniMaxH3ChainUpscaleReferenceConditioning");
    assert.equal(conds[0]!.inputs.prompt_override, "", "a blank prompt reuses the run's own scene prompts");
    const sched = ofClass(out, "BasicScheduler").find((n) => n.inputs.denoise === 0.24);
    assert.ok(sched, "the default pass-2 window rides the schedule");
    assert.equal(sched!.inputs.steps, 20, "the default steps");
    assert.equal(ofClass(out, "MiniMaxH3ChainUpscaleAdapter")[0]!.inputs.segment_crf, 18, "the default segment quality");
  });

  it("the arm predicate is bag presence", () => {
    assert.equal(upscaleArmed({}), false);
    assert.equal(upscaleArmed({ upscale: [] }), false);
    assert.equal(upscaleArmed({ upscale: [ENTRY()] }), true);
  });
});
