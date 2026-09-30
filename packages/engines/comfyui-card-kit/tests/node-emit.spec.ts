import { describe, expect, it } from "vitest";
import { deriveWidgetParams } from "../src/graph.ts";
import type { NodeDefInput } from "../src/graph.ts";

type NodeDefShape = { input?: NodeDefInput };

/** One node's definition, verbatim-shaped from a live /object_info
 *  doc (KSampler + a vendored path row) — the SDK client's own
 *  getNodeDefs() response shape, trimmed to the rows under test. */
const ksampler = {
  input: {
    required: {
      model: ["MODEL", {}],
      seed: ["INT", { default: 0, min: 0, max: 18446744073709552000 }],
      steps: ["INT", { default: 20, min: 1, max: 10000 }],
      cfg: ["FLOAT", { default: 8, min: 0, max: 100, step: 1 }],
      sampler_name: [["euler", "dpmpp_2m", "ddim"], { default: "euler" }],
      scheduler: [["normal", "simple"], {}],
      denoise: ["FLOAT", { default: 1, min: 0, max: 1 }],
      control_after_generate: ["BOOLEAN", { default: false }],
    },
  },
  output: [],
  output_is_list: [],
  output_name: [],
  name: "KSampler",
  display_name: "KSampler",
  description: "",
  category: "sampling",
  output_node: false,
} as unknown as NodeDefShape;

describe("deriveWidgetParams (the node-def → write-plane emission)", () => {
  it("emits INT/FLOAT rows as numbers with the row's own bounds", () => {
    const rows = deriveWidgetParams(ksampler);
    expect(rows.find((r) => r.name === "seed")).toEqual({ name: "seed", type: "number", bounds: [0, 18446744073709552000] });
    expect(rows.find((r) => r.name === "steps")).toEqual({ name: "steps", type: "number", bounds: [1, 10000] });
    expect(rows.find((r) => r.name === "cfg")).toEqual({ name: "cfg", type: "number", bounds: [0, 100] });
  });

  it("emits combo lists as enums carrying the row's own options", () => {
    const rows = deriveWidgetParams(ksampler);
    expect(rows.find((r) => r.name === "sampler_name")).toEqual({ name: "sampler_name", type: "enum", options: ["euler", "dpmpp_2m", "ddim"] });
    expect(rows.find((r) => r.name === "scheduler")).toEqual({ name: "scheduler", type: "enum", options: ["normal", "simple"] });
  });

  it("emits BOOLEAN as boolean and keeps edge-kind inputs off the surface", () => {
    const rows = deriveWidgetParams(ksampler);
    expect(rows.find((r) => r.name === "control_after_generate")).toEqual({ name: "control_after_generate", type: "boolean" });
    expect(rows.find((r) => r.name === "model")).toBeUndefined();
  });

  it("keeps one-sided rows unbounded rather than inventing an end", () => {
    const def = {
      input: { required: { floor_only: ["INT", { min: 512 }] } },
    } as unknown as NodeDefShape;
    expect(deriveWidgetParams(def)).toEqual([{ name: "floor_only", type: "number" }]);
  });
});
