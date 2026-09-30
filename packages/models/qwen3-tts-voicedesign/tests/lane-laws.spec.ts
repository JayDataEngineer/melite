// @melite/models-qwen3-tts-voicedesign — THE TTS DISPATCH LAWS, at the
// lane's new home (the kit-arm retirement, 2026-09-30). The lane is this
// family's declared
// action; these dispatch cases moved with it out of the card kit,
// where they called the arm directly. The wire is pinned to committed
// goldens in action.spec.ts; these cases pin the DISPATCH law — which
// segment a stated row routes to, never a switch on the family id.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { speak } from "../src/actions.ts";

const stub = (id: string, synthLane: string): ModelFacts => ({
  id, card: "tts", defaults: { mode: "tts" },
  lane_inputs: { model_path: id, synth_lane: synthLane },
  variants: [], variant_groups: [], mods: ["qvoice_save"], accepts: [], studio: {},
} as unknown as ModelFacts);

const dump = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;
const classes = (row: Record<string, { class_type: string }>): string[] => Object.values(row).map((n) => n.class_type);

describe("the tts lane dispatch (synth_lane data, never the family id)", () => {
  it("an absent key falls to the speak lane (the ''-absent law)", () => {
    const g = new GraphBuilder();
    instantiateAction(speak, { text: "hi", seed: 1 }, stub("anything", ""), g, "rs");
    const row = dump(g);
    assert.ok(classes(row).includes("AudiocoreTTS"), "the speak lane emits the synth node");
    assert.ok(!Object.values(row).some((n) => n.class_type === "AudiocoreVoiceStudio"), "no studio node");
  });

  it("a non-string synth lane value REFUSES field-named (the arm's silent speak fallback is gone)", () => {
    // THE DIVERGENCE THE ARM WAS HIDING: the retired kit arm read
    // `p.synth_lane || 'speak'`, so a garbage value fell to the speak
    // lane in silence. The family's facts door reads the row directly
    // and refuses a value outside speak|clone|design — the loud half of
    // the same law the absent-key case pins.
    const model = {
      ...stub("anything", ""),
      lane_inputs: { model_path: "anything", synth_lane: 7 },
    } as unknown as ModelFacts;
    assert.throws(
      () => instantiateAction(speak, { text: "hi", seed: 1 }, model, new GraphBuilder(), "rs"),
      /lane_inputs\.synth_lane = 7 — speak, clone, or design is required/,
    );
  });

  it("synth_lane 'clone' routes the clone lane (reference audio + transcript)", () => {
    const g = new GraphBuilder();
    instantiateAction(speak, { text: "hi", seed: 1, ref_audio: "/a.wav", ref_text: "a" }, stub("whatever", "clone"), g, "rc");
    const row = dump(g);
    assert.ok(classes(row).includes("AudiocoreTTS"), "the clone lane emits the synth node");
    assert.ok(Object.values(row).some((n) => n.inputs.reference_audio === "/a.wav"), "the reference rides");
  });
});
