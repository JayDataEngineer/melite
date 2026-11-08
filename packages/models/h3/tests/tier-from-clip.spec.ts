// @melite/models-h3 — P0-3 at the RENDERER plane (defect board row
// 3): "default the plan tier to the source clip's own geometry. An
// agent should never know the source's tier." The burn: every film
// is 1344×768, the edit plan defaulted 736p, and the join emitted a
// CROSS-REGIME warning the operator had to cure by hand
// (run-b2f768706593 → resolution "768p" in run-77d671387b7e). The
// cure: an UNSTATED or 'auto' resolution derives the film regime's
// own pin at compose (the walked doc's width/height), and the plan
// node carries it — the engine never sees 'auto'. These arms read
// the COMPOSED H3OneClickSwapPlan input per cell.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { renderH3Repair, renderH3Swap, renderH3Edit, renderH3Extend } from "../src/index.ts";
import type { H3Facts } from "../src/actions.ts";

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

type Node = { class_type: string; inputs: Record<string, unknown> };
const out = (g: GraphBuilder): Record<string, Node> => g.toJSON() as Record<string, Node>;
const ofClass = (o: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(o).filter(([, n]) => n.class_type === cls);

/** the plan node's resolution input — what the ENGINE resolves. */
const planTier = (o: Record<string, Node>): unknown =>
  ofClass(o, "H3OneClickSwapPlan")[0]![1].inputs.resolution;

const FILM: Record<string, unknown> = { width: 1344, height: 768 };

const REPAIR = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4", repair_prompt: "clean hands", mask: "masks/hands.png",
});

describe("P0-3 tier-from-clip — the plan node carries the film's own tier unless the agent overrides", () => {
  it("THE PIN DEFAULT: unstated resolution on a 1344×768 doc composes the plan at 768p (run-b2f768706593's class is dead)", () => {
    for (const [name, compose] of [
      ["repair", (g: GraphBuilder) => renderH3Repair(REPAIR(), FILM, FACTS, g, "r_pin")],
      ["swap", (g: GraphBuilder) => renderH3Swap({
        source_clip: "c.mp4", still: "s.png", mannequin: "m.mp4", mask: "k.png", swap_prompt: "p",
      }, FILM, FACTS, g, "r_pin")],
      ["edit", (g: GraphBuilder) => renderH3Edit({
        source_clip: "c.mp4", edit_prompt: "p", denoise: 0.32,
      }, { source: "static-png", image: "k.png" } as never, { mode: "self" } as never, FILM, FACTS, g, "r_pin")],
      ["extend", (g: GraphBuilder) => renderH3Extend({
        source_clip: "c.mp4", extend_prompt: "p",
      }, FILM, FACTS, g, "r_pin")],
    ] as const) {
      const g = new GraphBuilder();
      compose(g);
      assert.equal(planTier(out(g)), "768p", `${name}: the plan derives the film's own pin — the agent stated no tier`);
    }
  });

  it("THE AUTO FORM VALUE: 'auto' (the form's derived default) composes the same pin — the engine never sees 'auto'", () => {
    const g = new GraphBuilder();
    renderH3Repair({ ...REPAIR(), resolution: "auto" }, FILM, FACTS, g, "r_auto");
    assert.equal(planTier(out(g)), "768p", "auto resolves to the pin at compose, before the engine");
  });

  it("THE OVERRIDE STAYS: a stated 736p rides verbatim (the admission owns its warning — the default never second-guesses authorship)", () => {
    const g = new GraphBuilder();
    renderH3Repair({ ...REPAIR(), resolution: "736p" }, FILM, FACTS, g, "r_over");
    assert.equal(planTier(out(g)), "736p", "an explicit tier is the agent's own choice");
  });

  it("THE DOC'S OWN GEOMETRY RULES: a 960×544 doc pins the nearest rung 576p (the film's shape, not a hardcoded label)", () => {
    const g = new GraphBuilder();
    renderH3Repair(REPAIR(), { width: 960, height: 544 }, FACTS, g, "r_odd");
    assert.equal(planTier(out(g)), "576p", "the pin follows the walked doc's width/height — every film shape, not just the default");
  });
});
