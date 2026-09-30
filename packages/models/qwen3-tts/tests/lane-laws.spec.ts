// @melite/models-qwen3-tts — THE DESIGN-ROUTE LAW, at the lane's new home (the kit-arm retirement, 2026-09-30). The lane is this family's declared
// action; these dispatch cases moved with it out of the card kit,
// where they called the arm directly. The wire is pinned to committed
// goldens in action.spec.ts; these cases pin the DISPATCH law — which
// segment a stated row routes to, never a switch on the family id.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { exportAction } from "../src/actions.ts";

const stub = (id: string, synthLane: string): ModelFacts => ({
  id, card: "tts", defaults: { mode: "tts" },
  lane_inputs: { model_path: id, synth_lane: synthLane },
  variants: [], variant_groups: [], mods: ["qvoice_save"], accepts: [], studio: {},
} as unknown as ModelFacts);

const dump = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;
const classes = (row: Record<string, { class_type: string }>): string[] => Object.values(row).map((n) => n.class_type);

describe("the design route (a stated design_prompt picks the studio segment whatever the id)", () => {
  it("synth_lane 'design' routes the VoiceStudio lane whatever the id", () => {
    const g = new GraphBuilder();
    // THE LANE'S OWN PROMPT ROW (2026-09-23): design_prompt is the
    // card's task-named "Voice Persona & Timbre" row — the pack
    // carries the export name + sampling, never the prompt.
    instantiateAction(exportAction, { text: "hi", seed: 1, voice_name: "V", design_prompt: "warm" }, stub("not-the-real-id", "design"), g, "rs");
    assert.ok(classes(dump(g)).includes("AudiocoreVoiceStudio"), "the design lane emits the studio node");
  });
});
