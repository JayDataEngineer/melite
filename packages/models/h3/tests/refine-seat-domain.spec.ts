// @melite/models-h3 — THE REFINE SEAT'S ROW-DOMAIN LAW (the F2
// re-home, actions.ts resolveRefineSeat). The second-pass rider's
// steps must live inside the named catalog row's DECLARED domain:
// outside counts refuse loud naming the row and the open bound.
// The served catalog's eleven rows all declare [min, max]; the
// table's fields are optional BY LAW (`steps_min?`/`steps_max?` —
// the larryvrh row's shift_video is column-less by design, the same
// optional-column class), so the domain reader narrows with `in`
// and renders an open side as '…' when a future row declares only
// one bound. THESE arms pin that reader against a catalog that
// carries such rows: a row with no declared domain composes at the
// row's own count; a one-sided domain refuses naming the open side
// with '…'; a stated count inside a one-sided domain composes.
// The rider's refinement WINDOW (resolveStage2Denoise) also rides
// here unstated: the declared 0.35 default is the seat's own fill
// (the walk fills the same number on walked docs — the raw door is
// where the seat's own fallback is the only law).
//
// THE CATALOG SWAP (the door.spec idiom): this file's vi.mock keeps
// every served row and APPENDS three synthetic rows whose ids are
// unmistakably test-owned. Every served row keeps its real shape.
// @contract models-h3-refine-seat-domain
import { describe, it, expect, vi } from "vitest";
import { film } from "../src/actions.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";

vi.mock("@melite/models-h3/mods/loras", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@melite/models-h3/mods/loras")>();
  const synthetic = (over: { id: string; steps: number; steps_min?: number; steps_max?: number }) => ({
    filename: `h3/synthetic_${over.id}.safetensors`,
    source_url: `https://example.invalid/${over.id}.safetensors`,
    label: `Synthetic: ${over.id}`,
    category: "distill",
    default_strength: 1,
    ...over,
  });
  return {
    ...actual,
    H3_LORA_ROWS: [
      ...actual.H3_LORA_ROWS,
      // no declared domain — the optional-columns class
      synthetic({ id: "h3_domainless", steps: 5 }),
      // floor only — the ceiling is open
      synthetic({ id: "h3_floor_only", steps: 6, steps_min: 3 }),
      // ceiling only — the floor is open
      synthetic({ id: "h3_ceiling_only", steps: 6, steps_max: 8 }),
    ],
  };
});

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

type Graph = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

/** The RAW action door (the walk-bypass face the single-window raw
 *  arms ride): the refine seats read the doc verbatim, so the seat's
 *  own fills — never a walk's — are what these arms judge. */
const compose = (over: Record<string, unknown>): Graph => {
  const g = new GraphBuilder();
  instantiateAction(
    film,
    {
      variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
      loras: [{ name: "distill-8.safetensors", strength: 0.6 }],
      ...over,
    },
    WINDOW_MODEL, g, "run_refine_domain",
  );
  return g.toJSON() as Graph;
};

const ofClass = (graph: Graph, cls: string) =>
  Object.values(graph).filter((n) => n.class_type === cls);

describe("the refine rider's row-domain law (a stated count rides inside the named row's declared domain)", () => {
  it("a row that declares NO refinement domain composes at the row's own count and the declared refinement window", () => {
    const graph = compose({ second_pass_enabled: true, refine_lora: "h3_domainless" });
    // the rider mounts (two passes) …
    expect(ofClass(graph, "SamplerCustomAdvanced")).toHaveLength(2);
    // … at the row's OWN count (5) — no domain to refuse, no invention
    const riderSched = ofClass(graph, "BasicScheduler")
      .find((n) => n.inputs.steps === 5);
    expect(riderSched, "the rider scheduler carries the domain-less row's own count").toBeDefined();
    // … in the DECLARED refinement window: refine_denoise unstated at
    // the raw door rides the seat's declared 0.35 (the walk fills the
    // same number on walked docs — here the seat's own fill is the law)
    expect(riderSched!.inputs.denoise).toBe(0.35);
    // the rider loader carries the resolved catalog file at the row's
    // default strength
    const rider = ofClass(graph, "LTX_lora_loader")
      .find((n) => typeof n.inputs.stack_data === "string"
        && (n.inputs.stack_data as string).includes("synthetic_h3_domainless"));
    expect(rider, "the rider loader resolves the synthetic row's file").toBeDefined();
    const stack = JSON.parse(rider!.inputs.stack_data as string) as Array<{ lora: string; str: number }>;
    expect(stack[0]!.lora).toBe("h3/synthetic_h3_domainless.safetensors");
    expect(stack[0]!.str).toBe(1);
  });

  it("a floor-only domain refuses a count below its floor, naming the OPEN ceiling with '…'", () => {
    expect(() => compose({
      second_pass_enabled: true, refine_lora: "h3_floor_only", refine_steps: 1,
    })).toThrow(/refine_steps 1 for refine_lora 'h3_floor_only' falls outside the row's declared domain \[3, …\]/);
  });

  it("a ceiling-only domain refuses a count above its ceiling, naming the OPEN floor with '…'", () => {
    expect(() => compose({
      second_pass_enabled: true, refine_lora: "h3_ceiling_only", refine_steps: 9,
    })).toThrow(/refine_steps 9 for refine_lora 'h3_ceiling_only' falls outside the row's declared domain \[…, 8\]/);
  });

  it("a stated count inside a one-sided domain composes at the stated count", () => {
    const graph = compose({
      second_pass_enabled: true, refine_lora: "h3_floor_only", refine_steps: 4,
    });
    expect(ofClass(graph, "SamplerCustomAdvanced")).toHaveLength(2);
    expect(ofClass(graph, "BasicScheduler").some((n) => n.inputs.steps === 4 && n.inputs.denoise === 0.35))
      .toBe(true);
  });
});
