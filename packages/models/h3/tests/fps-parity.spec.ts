// fps-parity.spec.ts — THE FPS STRING/SEAT PARITY WALL (audit 015
// C3): the compose builds TWO fps consumers off one clock — the
// PrimitiveFloat seat (the container's fps input) and the
// ComfyMathExpression string (mathStepsGold embeds the fps INSIDE
// the expression text). A string built from a different clock than
// the seat's value is the split-brain class: frames right, seconds
// stolen. The wall composes ONE graph at a distinctive non-default
// fps (30 — never the 24 default, so a defaulted seat cannot pass
// vacuously) and judges the two consumers against each other and
// against the doc.
// @contract models-h3-fps-parity
import { describe, it, expect } from "vitest";
import { film } from "../src/actions.ts";
import { schema as h3schema, paramSchema } from "../src/schema.ts";
import { DOC_FPS_DEFAULT } from "../src/timelineContract.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

const WINDOW_MODEL: ModelFacts = {
  id: "h3",
  card: "h3-timeline",
  defaults: {},
  lane_inputs: {
    unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  },
  variants: [],
  variant_groups: [],
  outputs: [],
};

const DISTINCTIVE_FPS = 30;

/** One compose at the distinctive clock: a t4r guide doc (the fps
 *  seat lives in the t4r arm — the walk-first PrimitiveFloat and the
 *  preview override's step expression), no loras, no second pass —
 *  the smallest graph that builds both fps consumers. */
const compose = (): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
  const walked = h3schema({
    length: 90, prompt: "she waves", seed: 7, fps: DISTINCTIVE_FPS,
    calls: [{ text: "she waves", start_frame: 0, end_frame: 90, image: "refs/anchor.png" }],
  }) as Record<string, unknown>;
  const g = new GraphBuilder();
  instantiateAction(film, walked, WINDOW_MODEL, g, "run_fps_parity");
  return g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
};

describe("THE FPS STRING/SEAT PARITY WALL (audit 015 C3) — one clock, both consumers", () => {
  const out = compose();

  it("the PrimitiveFloat SEAT rides the doc's stated fps — never a defaulted or hardcoded clock", () => {
    const seats = Object.values(out).filter((n) => n.class_type === "PrimitiveFloat" && n.inputs["value"] === DISTINCTIVE_FPS);
    expect(seats.length).toBe(1);
  });

  it("the ComfyMathExpression STRING embeds the SAME fps as the seat — the expression text is derived, never a second clock", () => {
    // mathStepsGold embeds the clock twice per round/max pair; every
    // literal fps token in the expression must equal the seat's
    // value (the string and the seat share one derivation — the
    // fpsClock variable — and this arm reds the day one of them
    // drifts back to a hardcoded 24).
    const seatValue = DISTINCTIVE_FPS;
    const exprs = Object.values(out)
      .filter((n) => n.class_type === "ComfyMathExpression")
      .map((n) => String(n.inputs["expression"]));
    expect(exprs.length).toBeGreaterThanOrEqual(1);
    for (const expression of exprs) {
      // every `* <num>` multiplication token is a clock mention
      const clocks = [...expression.matchAll(/\*\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
      expect(clocks.length).toBeGreaterThanOrEqual(1);
      for (const c of clocks) {
        expect(c).toBe(seatValue);
      }
    }
  });

  it("the ONE-HOME derivation holds: the carrier fps default IS DOC_FPS_DEFAULT, and a DEFAULTED doc books the same clock both places", () => {
    // the fps default's one home (cure 3d's value law, re-pinned on
    // the compose path) ...
    const fps = (paramSchema as unknown as { dict: Record<string, { meta?: { default?: unknown } }> }).dict["fps"];
    expect(fps?.meta?.default).toBe(DOC_FPS_DEFAULT);
    // ... and the default-clock compose agrees with itself: the seat
    // value and every expression clock token equal the ONE-HOME const.
    const walked = h3schema({
      length: 90, prompt: "she waves", seed: 7,
      calls: [{ text: "she waves", start_frame: 0, end_frame: 90, image: "refs/anchor.png" }],
    }) as Record<string, unknown>;
    expect(walked["fps"]).toBe(DOC_FPS_DEFAULT);
    const g = new GraphBuilder();
    instantiateAction(film, walked, WINDOW_MODEL, g, "run_fps_parity_default");
    const json = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const seat = Object.values(json).find((n) => n.class_type === "PrimitiveFloat" && n.inputs["value"] === DOC_FPS_DEFAULT);
    expect(seat).toBeDefined();
    for (const n of Object.values(json).filter((n) => n.class_type === "ComfyMathExpression")) {
      for (const m of String(n.inputs["expression"]).matchAll(/\*\s*(\d+(?:\.\d+)?)/g)) {
        expect(Number(m[1])).toBe(DOC_FPS_DEFAULT);
      }
    }
  });
});
