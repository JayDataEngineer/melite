// @melite/models-qwen3-tts — THE TTS DISPATCH LAWS, at the lane's
// home (the kit-arm retirement 2026-09-30; the size-at-quant fold
// 2026-10-26 — the design lane moved IN from the dead
// qwen3-tts-voicedesign family). The lane is this family's declared
// action. The wire is pinned to committed goldens in action.spec.ts;
// these cases pin the DISPATCH law — which segment a stated row
// routes to, never a switch on the family id or the size cell.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { speak, exportAction } from "../src/actions.ts";

const stub = (id: string, variant?: string): ModelFacts => ({
  id, card: "tts", defaults: { mode: "tts", ...(variant ? { variant } : {}) },
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
    const model = {
      ...stub("anything", "customvoice"),
      defaults: { mode: "tts", variant: "yodel" },
    } as unknown as ModelFacts;
    assert.throws(
      () => instantiateAction(speak, { text: "hi", seed: 1 }, model, new GraphBuilder(), "rs"),
      /qwen3-tts: no lane topology for variant "yodel" — the DECL declares no such lane/,
    );
    // and a row whose defaults carry NO variant at all — the guard
    // coerces to the empty key and the same refusal names it
    const bare = { ...stub("anything", "customvoice"), defaults: { mode: "tts" } } as unknown as ModelFacts;
    assert.throws(
      () => instantiateAction(speak, { text: "hi", seed: 1 }, bare, new GraphBuilder(), "rs2"),
      /qwen3-tts: no lane topology for variant "" — the DECL declares no such lane/,
    );
  });

  it("the base variant routes the clone lane (reference audio + transcript)", () => {
    const g = new GraphBuilder();
    instantiateAction(speak, { text: "hi", seed: 1, ref_audio: "/a.wav", ref_text: "a" }, stub("whatever", "base"), g, "rc");
    const row = dump(g);
    assert.ok(classes(row).includes("AudiocoreTTS"), "the clone lane emits the synth node");
    assert.ok(Object.values(row).some((n) => n.inputs.reference_audio === "/a.wav"), "the reference rides");
  });

  it("the voicedesign variant routes the design lane (the studio's preview segment — the boolean law: no save without save_qvoice)", () => {
    const g = new GraphBuilder();
    instantiateAction(speak, { text: "hi", seed: 1, design_prompt: "warm" }, stub("whatever", "voicedesign"), g, "rd");
    const row = dump(g);
    assert.ok(Object.values(row).some((n) => n.class_type === "AudiocoreVoiceStudio"), "the design lane emits the studio node");
    assert.ok(!classes(row).includes("MeliteQVoiceCopy"), "a plain design run persists nothing (the boolean is the save)");
  });

  it("the export action routes the VoiceStudio lane whatever the id (the exporter composes whatever the family)", () => {
    const g = new GraphBuilder();
    // THE LANE'S OWN PROMPT ROW (2026-09-23): design_prompt is the
    // card's task-named "Voice Persona & Timbre" row — the pack
    // carries the save boolean + sampling, never the prompt.
    instantiateAction(exportAction, { text: "hi", seed: 1, save_qvoice: true, design_prompt: "warm" }, stub("not-the-real-id"), g, "rs");
    assert.ok(classes(dump(g)).includes("AudiocoreVoiceStudio"), "the design lane emits the studio node");
  });

  it("THE SIZE AXIS IS DISPATCH-DEAF — both quant cells of a lane hit the SAME segment (the cell names the tree, never the branch)", () => {
    // The fold's dispatch law: the size coordinate lives in
    // lane_inputs (the load), so a lane's two cells compose the same
    // node classes — only the model_path string differs.
    for (const tree of ["Qwen3-TTS-12Hz-1.7B-CustomVoice-merged", "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged"]) {
      const g = new GraphBuilder();
      instantiateAction(speak, { text: "hi", seed: 1, voice: "vivian" }, { ...stub(tree, "customvoice"), lane_inputs: { model_path: tree } }, g, "rs");
      const row = dump(g);
      assert.ok(classes(row).includes("AudiocoreTTS"), `${tree}: the speak lane either size`);
      assert.ok(!classes(row).includes("AudiocoreVoiceStudio"), `${tree}: no studio node either size`);
    }
  });
});
