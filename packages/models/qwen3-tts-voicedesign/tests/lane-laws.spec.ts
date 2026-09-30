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

const stub = (id: string, variant: string): ModelFacts => ({
  id, card: "tts", defaults: { mode: "tts", variant },
  lane_inputs: { model_path: id },
  variants: [], variant_groups: [], mods: ["qvoice_save"], accepts: [], studio: {},
} as unknown as ModelFacts);

const dump = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;
const classes = (row: Record<string, { class_type: string }>): string[] => Object.values(row).map((n) => n.class_type);

describe("the tts lane dispatch (variant topology data, never the family id)", () => {
  it("the head variant (customvoice) speaks — the default pick's own lane", () => {
    const g = new GraphBuilder();
    instantiateAction(speak, { text: "hi", seed: 1 }, stub("anything", "customvoice"), g, "rs");
    const row = dump(g);
    assert.ok(classes(row).includes("AudiocoreTTS"), "the speak lane emits the synth node");
    assert.ok(!Object.values(row).some((n) => n.class_type === "AudiocoreVoiceStudio"), "no studio node");
  });

  it("an unknown variant id REFUSES field-named (the silent speak fallback is gone)", () => {
    // THE DIVERGENCE THE RETIRED ARM HID: `p.synth_lane || 'speak'`
    // let a garbage value fall to the speak lane in silence. The
    // lane topology keys on the resolved variant and refuses an id
    // the DECL declares no lane for — the loud half of the same
    // law the head-variant case pins.
    const model = {
      ...stub("anything", "customvoice"),
      defaults: { mode: "tts", variant: "yodel" },
    } as unknown as ModelFacts;
    assert.throws(
      () => instantiateAction(speak, { text: "hi", seed: 1 }, model, new GraphBuilder(), "rs"),
      /qwen3-tts-voicedesign: no lane topology for variant "yodel" — the DECL declares no such lane/,
    );
  });

  it("the base variant routes the clone lane (reference audio + transcript)", () => {
    const g = new GraphBuilder();
    instantiateAction(speak, { text: "hi", seed: 1, ref_audio: "/a.wav", ref_text: "a" }, stub("whatever", "base"), g, "rc");
    const row = dump(g);
    assert.ok(classes(row).includes("AudiocoreTTS"), "the clone lane emits the synth node");
    assert.ok(Object.values(row).some((n) => n.inputs.reference_audio === "/a.wav"), "the reference rides");
  });

  it("the voicedesign variant routes the design lane (the studio's export segment)", () => {
    const g = new GraphBuilder();
    instantiateAction(speak, { text: "hi", seed: 1, voice_name: "V", design_prompt: "warm" }, stub("whatever", "voicedesign"), g, "rd");
    const row = dump(g);
    assert.ok(Object.values(row).some((n) => n.class_type === "AudiocoreVoiceStudio"), "the design lane emits the studio node");
  });
});
