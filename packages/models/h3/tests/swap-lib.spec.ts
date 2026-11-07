// @melite/models-h3 — the swap renderer as a library
// (friction-report #6: the renderer-as-library property is what made
// the direct-drive bypass safe — the operator emitted the
// byte-faithful family graph from the built package entry point
// rather than hand-transcribing. This spec guards that face: the
// barrel exports renderH3Swap, and a minimal entry composes the
// masked-edit chain ending in MiniMaxH3ChainAssemble with the
// timeline fed by the lazy VIDEO wire — independent of the card's
// replace door).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Swap } from "../src/index.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

const ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/source.mp4",
  still: "stills/hero.png",
  mannequin: "masks/mannequin.mp4",
  mask: "masks/person.png",
  swap_prompt: "the same person smiling, studio light",
});

describe("renderH3Swap as a library (the bypass face)", () => {
  it("is exported from the barrel and composes the assemble terminal", () => {
    assert.equal(typeof renderH3Swap, "function", "the barrel serves the swap renderer (the direct-drive import face)");
    const g = new GraphBuilder();
    renderH3Swap(ENTRY(), {}, FACTS, g, "run_lib_swap");
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const assemble = Object.entries(out).filter(([, n]) => n.class_type === "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "one assemble terminal ends the chain");
    assert.equal(assemble[0]![1].inputs.filename, "run_lib_swap/swap", "the assemble rides the run tree");
  });

  it("feeds the timeline the lazy VIDEO wire (friction-report #4)", () => {
    const g = new GraphBuilder();
    renderH3Swap(ENTRY(), {}, FACTS, g, "run_lib_wire");
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const loaders = Object.entries(out).filter(([, n]) => n.class_type === "LoadVideo");
    assert.equal(loaders.length, 1, "one core LoadVideo carries the source clip");
    const timelines = Object.entries(out).filter(([, n]) => n.class_type === "MiniMaxH3SourceTimeline");
    assert.equal(timelines.length, 1, "one source timeline gates the loop");
    assert.deepEqual(
      timelines[0]![1].inputs.source_video, [loaders[0]![0], 0],
      "the timeline reads the file-backed VIDEO wire, never the CWD-relative video_path",
    );
  });

  it("refuses loud naming the empty seat", () => {
    const entry = ENTRY();
    delete entry.still;
    assert.throws(
      () => renderH3Swap(entry, {}, FACTS, new GraphBuilder(), "run_lib_missing"),
      /'still' names no media/,
    );
  });

  it("carries a stated resolution tier and roles text verbatim at the plan head (the coverage-arm law, 2026-11-07)", () => {
    // both seats are OPTIONAL strings on the entry ('' falls to the
    // declared default tier / no roles row); a stated pair rides the
    // plan node's own inputs verbatim — a wiring that dropped either
    // would compose the default tier under a doc that stated another
    // (the F34 shape-true class, at the swap's own head).
    const g = new GraphBuilder();
    renderH3Swap(
      { ...ENTRY(), resolution: "1080p", roles: "the detective, the witness" },
      {}, FACTS, g, "run_lib_tier",
    );
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const plan = Object.entries(out).find(([, n]) => n.class_type === "H3OneClickSwapPlan");
    assert.ok(plan, "the plan head composes");
    assert.equal(plan[1]!.inputs.resolution, "1080p", "a stated tier rides the plan verbatim");
    assert.equal(plan[1]!.inputs.roles, "the detective, the witness", "a stated roles row rides the plan verbatim");
  });

  it("keep_audio:false composes the generated soundtrack at the assemble (both audio seats spell the dial)", () => {
    const g = new GraphBuilder();
    renderH3Swap({ ...ENTRY(), keep_audio: false }, {}, FACTS, g, "run_lib_gen_audio");
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const assemble = Object.entries(out).filter(([, n]) => n.class_type === "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "one assemble terminal");
    assert.equal(
      assemble[0]![1].inputs.audio_source, "generated",
      "keep_audio:false spells the generated pole at the assemble's own seat (the default composes 'source')",
    );
  });

  it("carries stated numeric seats verbatim (steps + seed ride the chain plan's own literals; unstated they default)", () => {
    // num()'s stated arm: an entry that states steps/seed as numbers
    // must carry them onto MiniMaxH3ChainPlanModern verbatim — a
    // reader that dropped the stated value would compose the
    // declared defaults (6/0) under a doc that stated another.
    const g = new GraphBuilder();
    renderH3Swap({ ...ENTRY(), steps: 9, seed: 4242 }, {}, FACTS, g, "run_lib_numeric");
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const chainPlan = Object.entries(out).find(([, n]) => n.class_type === "MiniMaxH3ChainPlanModern");
    assert.ok(chainPlan, "the chain plan composes");
    assert.equal(chainPlan[1]!.inputs.default_steps, 9, "a stated steps count rides the plan literal (default 6)");
    assert.equal(chainPlan[1]!.inputs.base_seed, 4242, "a stated seed rides the plan literal (default 0)");
  });
});

describe("THE TILING LAW (operator 2026-11-14: \"EVERY MOD MUST BE ABLE TO BE BROKEN UP\")", () => {
  // The engine's own census word for the plan node's clip_seconds:
  // "Longest clip per H3 generation" — the per-window budget, never
  // the total; overlap_frames: "Frames each clip repeats from the
  // previous clip" — the seam carry. THE BURN: the emission always
  // composed multi-window (one press, N engine-sided clips, joined
  // by the chain's own assemble) but the card's law said "one
  // render" and the skill said "Single-clip (R1)" — the served
  // declaration FORBADE the capability the engine ships. These arms
  // pin the three facts that MAKE the tiling, on the real emission.
  const graph = (): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
    const g = new GraphBuilder();
    renderH3Swap(ENTRY(), {}, FACTS, g, "run_lib_tile");
    return g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
  };

  it("A. wires plan_json_input off the plan node — the source-slicing law (the plan's derived shots rule, N clips for a long source)", () => {
    const out = graph();
    const plans = Object.entries(out).filter(([, n]) => n.class_type === "H3OneClickSwapPlan");
    assert.equal(plans.length, 1, "one plan head");
    const chainPlans = Object.entries(out).filter(([, n]) => n.class_type === "MiniMaxH3ChainPlanModern");
    assert.equal(chainPlans.length, 1, "one chain plan");
    assert.deepEqual(
      chainPlans[0]![1].inputs.plan_json_input, [plans[0]![0], 0],
      "plan_json_input rides the plan node's derived shots — the SOURCE-SLICING semantics; unwired, the literal one-shot plan would rule and a long source would render one window",
    );
  });

  it("B. loads the WHOLE source — the plan slices, never the loader (frame_load_cap 0 / skip 0, the swap's posture)", () => {
    const out = graph();
    // the mannequin rides its own VHS loader — judge the SOURCE
    // loader by its video leaf.
    const vhs = Object.entries(out).filter(([, n]) =>
      n.class_type === "VHS_LoadVideo" && n.inputs.video === "clips/source.mp4");
    assert.equal(vhs.length, 1, "one VHS loader for the source clip");
    assert.equal(vhs[0]![1].inputs.frame_load_cap, 0,
      "cap 0 loads the whole clip — the window budget belongs to the plan node, and a loader cap here would silently truncate a long source to one window");
    assert.equal(vhs[0]![1].inputs.skip_first_frames, 0, "no skip — the swap starts at the source head");
  });

  it("C. the chain's own assemble joins the windows (one terminal at <runId>/swap)", () => {
    const out = graph();
    const assemble = Object.entries(out).filter(([, n]) => n.class_type === "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "the join terminal exists — N windows land as one film");
    assert.equal(assemble[0]![1].inputs.filename, "run_lib_tile/swap", "the assembled swap rides the run tree");
  });
});
