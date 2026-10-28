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
});
