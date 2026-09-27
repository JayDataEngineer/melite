// comfyui-merge.spec.ts — the merge plane's pure walkers (TEST-2
// breadth, the deterministic census): namespaceWires' shape arms
// (wire rewrite, array walk, object walk, scalar ride),
// rewriteSpells' $substitution law (link first, initial second,
// leftover refuses with the verbatim voice), isWire's shape law,
// and assertWiresResolve's dangling refusal.
import { describe, it, expect } from "vitest";
import {
  namespaceWires,
  rewriteSpells,
  isWire,
  assertWiresResolve,
} from "../src/comfyui-merge.ts";
import { ComfyError } from "../src/comfyui-types.ts";

describe("namespaceWires (the stage-namespacing walk)", () => {
  const ids = new Set(["src", "other"]);
  it("a [stage_id, slot] wire rewrites to the namespaced id", () => {
    expect(namespaceWires(["src", 1], "s1", ids)).toEqual(["s1::src", 1]);
  });
  it("a wire whose target is NOT a stage id rides untouched", () => {
    expect(namespaceWires(["foreign", 0], "s1", ids)).toEqual(["foreign", 0]);
  });
  it("near-wire arrays walk (wrong length, wrong types)", () => {
    // length != 2: NOT a wire — the array walks its items; strings ride
    expect(namespaceWires(["src", 1, 2], "s1", ids)).toEqual(["src", 1, 2]);
    expect(namespaceWires(["src"], "s1", ids)).toEqual(["src"]);
    expect(namespaceWires([0, "src"], "s1", ids)).toEqual([0, "src"]);
  });
  it("arrays walk their items; objects walk their values; scalars ride", () => {
    expect(namespaceWires([["src", 0], 5], "s1", ids)).toEqual([["s1::src", 0], 5]);
    expect(namespaceWires({ k: ["other", 2] }, "s1", ids)).toEqual({ k: ["s1::other", 2] });
    expect(namespaceWires({ k: { deep: ["src", 3] } }, "s1", ids)).toEqual({
      k: { deep: ["s1::src", 3] },
    });
    expect(namespaceWires("plain", "s1", ids)).toBe("plain");
    expect(namespaceWires(7, "s1", ids)).toBe(7);
    expect(namespaceWires(null, "s1", ids)).toBe(null);
  });
});

describe("rewriteSpells (the $substitution law)", () => {
  const links = { wired: ["n1", 0] } as Record<string, [string, number]>;
  const initials = { seed: 42 } as Record<string, unknown>;
  it("a $link becomes its wire tuple", () => {
    expect(rewriteSpells("$wired", links, initials as never, "at")).toEqual(["n1", 0]);
  });
  it("a $initial substitutes its value", () => {
    expect(rewriteSpells("$seed", links, initials as never, "at")).toBe(42);
  });
  it("a leftover $spell refuses with the verbatim voice", () => {
    let caught: unknown = null;
    try {
      rewriteSpells("$ghost", links, initials as never, "stage 2");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ComfyError);
    expect((caught as Error).message).match(
      /workflow carries \$ghost .* neither a FromStage-wired input name nor a request initial/,
    );
  });
  it("arrays and objects walk; scalars ride; non-$ strings ride", () => {
    expect(rewriteSpells(["$wired", "$seed"], links, initials as never, "at"))
      .toEqual([["n1", 0], 42]);
    expect(rewriteSpells({ a: "$wired" }, links, initials as never, "at"))
      .toEqual({ a: ["n1", 0] });
    expect(rewriteSpells("plain", links, initials as never, "at")).toBe("plain");
    expect(rewriteSpells(9, links, initials as never, "at")).toBe(9);
  });
});

describe("isWire (the link shape)", () => {
  it("only [string, number] pairs of length 2 are wires", () => {
    expect(isWire(["n", 0])).toBe(true);
    expect(isWire(["n"])).toBe(false);
    expect(isWire(["n", 0, 1])).toBe(false);
    expect(isWire([0, "n"])).toBe(false);
    expect(isWire("n")).toBe(false);
    expect(isWire(null)).toBe(false);
  });
});

describe("assertWiresResolve (the dangling gate)", () => {
  it("wires into merged nodes ride", () => {
    assertWiresResolve({ n1: { inputs: ["n0", 1] }, n0: {} }, {});
  });
  it("a wire targeting a missing node refuses at construction", () => {
    expect(() => assertWiresResolve({ n1: { inputs: ["ghost", 0] } }, {}))
      ;
    try {
      assertWiresResolve({ n1: { inputs: ["ghost", 0] } }, {});
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ComfyError);
      expect((e as Error).message).match(/targets no node in the merged graph/);
    }
  });
  it("nested arrays and objects walk to the wire", () => {
    expect(() => assertWiresResolve({ n1: { deep: [["ghost", 0]] } }, {}))
      .throws(/targets no node/);
  });
});

// ── planMerge (the merge planner's every refusal + the rides) ────
import { planMerge } from "../src/comfyui-merge.ts";
import type { MergeRow } from "../src/comfyui-merge.ts";

const row = (over: Partial<MergeRow> = {}): MergeRow => ({
  stageId: "s1",
  workflow: { k1: { class_type: "KSampler", inputs: {} } },
  ...over,
} as MergeRow);

const refuse = (fn: () => unknown): Error => {
  try {
    fn();
  } catch (e) {
    return e as Error;
  }
  throw new Error("expected a refusal");
};

describe("planMerge (the planner)", () => {
  it("a clean two-stage plan merges with namespacing + producer links", () => {
    const rows: MergeRow[] = [
      row({
        stageId: "gen",
        workflow: { save: { class_type: "SaveImage", inputs: {} } },
        outputs: { image: "png" },
      }),
      row({
        stageId: "upscale",
        workflow: {
          up: { class_type: "ImageUpscale", inputs: { image: "$source" } },
        },
      }),
    ];
    const names = { upscale: { source: "gen.image" } };
    const plan = planMerge(rows, {}, names);
    const up = plan.workflow["upscale::up"] as Record<string, unknown>;
    expect(up["inputs"]).toEqual({ image: ["gen::save", 0] });
  });

  it("an empty workflow refuses (bridge first)", () => {
    const e = refuse(() => planMerge([row({ workflow: {} })], {}, {}));
    expect(e.message).match(/no workflow to merge/);
  });

  it("declared output_nodes naming a missing node refuses", () => {
    const e = refuse(() =>
      planMerge([row({ outputNodes: { image: "ghost" } })], {}, {}),
    );
    expect(e.message).match(/carries no such node/);
  });

  it("declared output_nodes win over Save inference", () => {
    const rows: MergeRow[] = [
      row({
        stageId: "gen",
        workflow: { a: { class_type: "VAEDecode", inputs: {} }, b: { class_type: "Other", inputs: {} } },
        outputNodes: { image: "a" },
        outputs: { image: "png" },
      }),
      row({ stageId: "next", workflow: { n: { class_type: "X", inputs: { v: "$p" } } } }),
    ];
    const plan = planMerge(rows, {}, { next: { p: "gen.image" } });
    const n = plan.workflow["next::n"] as Record<string, unknown>;
    expect(n["inputs"]).toEqual({ v: ["gen::a", 0] });
  });

  it("two Saves with outputs refuse ambiguous (declare output_nodes)", () => {
    const e = refuse(() =>
      planMerge([
        row({
          workflow: {
            s1: { class_type: "SaveImage", inputs: {} },
            s2: { class_type: "SaveImageWEBP", inputs: {} },
          },
          outputs: { image: "png" },
        }),
      ], {}, {}),
    );
    expect(e.message).match(/ambiguous producers/);
  });

  it("a namespaced collision refuses (stage ids + node ids)", () => {
    const e = refuse(() =>
      planMerge([row(), row()], {}, {}),
    );
    expect(e.message).match(/duplicate namespaced node/);
  });

  it("a wire to an unknown upstream stage refuses", () => {
    const e = refuse(() =>
      planMerge(
        [row({ stageId: "b", workflow: { n: { class_type: "X", inputs: { i: "$v" } } } })],
        {},
        { b: { v: "ghost.image" } },
      ),
    );
    expect(e.message).match(/declares no mergeable producer/);
  });

  it("a wire to an unproduced channel refuses", () => {
    const e = refuse(() =>
      planMerge(
        [row({ outputs: { image: "png" } }), row({ stageId: "b", workflow: { n: { class_type: "X", inputs: { i: "$v" } } } })],
        {},
        { b: { v: "s1.audio" } },
      ),
    );
    expect(e.message).match(/produces no such channel/);
  });

  it("a dot-less non-initial ref treats the whole ref as upstream", () => {
    const e = refuse(() =>
      planMerge(
        [row({ stageId: "b", workflow: { n: { class_type: "X", inputs: {} } } })],
        {},
        { b: { v: "ghost" } },
      ),
    );
    expect(e.message).match(/declares no mergeable producer/);
  });

  it("ROW-4: a producer link in a Load* file slot refuses", () => {
    const e = refuse(() =>
      planMerge(
        [
          row({
            workflow: { save: { class_type: "SaveImage", inputs: {} } },
            outputs: { image: "png" },
          }),
          row({
            stageId: "b",
            workflow: {
              l: { class_type: "LoadImage", inputs: { image: "$v" } },
            },
          }),
        ],
        {},
        { b: { v: "s1.image" } },
      ),
    );
    expect(e.message).match(/cannot land in a file slot/);
  });

  it("an initial-wired input skips the link walk (rides to spells)", () => {
    const rows: MergeRow[] = [
      row({
        stageId: "b",
        workflow: { n: { class_type: "X", inputs: { i: "$seed" } } },
      }),
    ];
    const plan = planMerge(rows, { seed: 7 }, { b: { seed: "__initial__.seed" } });
    const n = plan.workflow["b::n"] as Record<string, unknown>;
    expect(n["inputs"]).toEqual({ i: 7 });
  });
});

describe("planMerge producer-inference + Load-gate side arms", () => {
  it("two Saves with NO outputs ride (nothing to infer)", () => {
    const plan = planMerge([
      row({
        workflow: {
          s1: { class_type: "SaveImage", inputs: {} },
          s2: { class_type: "SaveImageWEBP", inputs: {} },
        },
      }),
    ], {}, {});
    expect(Object.keys(plan.workflow).length).toBe(2);
  });
  it("a non-Save class never infers (startsWith arm)", () => {
    const plan = planMerge([row()], {}, {});
    expect(plan.workflow["s1::k1"]).toBeTruthy();
  });
  it("non-Load classes and non-object inputs skip the file-slot gate", () => {
    const plan = planMerge([
      row({
        stageId: "b",
        workflow: {
          n: { class_type: "NotLoad", inputs: { f: "$v" } },
          m: { class_type: "LoadImage", inputs: "not-an-object" },
          weird: { class_type: "LoadImage" },
        },
      }),
    ], { v: 1 }, { b: { v: "__initial__.v" } });
    const n = plan.workflow["b::n"] as Record<string, unknown>;
    expect(n["inputs"]).toEqual({ f: 1 });
  });
  it("a plain array input inside a merged node rides the walk", () => {
    const plan = planMerge([
      row({
        stageId: "b",
        workflow: {
          self: { class_type: "Y", inputs: {} },
          n: { class_type: "X", inputs: { list: [1, ["self", 0]] } },
        },
      }),
    ], {}, {});
    const n = plan.workflow["b::n"] as Record<string, unknown>;
    expect(n["inputs"]).toEqual({ list: [1, ["b::self", 0]] });
  });
});

describe("planMerge's last two toll arms", () => {
  it("a non-string class_type tolls to '' (never infers, never gates)", () => {
    const plan = planMerge([
      row({
        stageId: "b",
        workflow: {
          n: { class_type: 7, inputs: {} },
          bare: { inputs: {} },
          l: { class_type: ["LoadImage"], inputs: { f: "$x" } },
        },
      }),
    ], { x: 1 }, { b: { x: "__initial__.x" } });
    expect(plan.workflow["b::n"]).toBeTruthy();
    const l = plan.workflow["b::l"] as Record<string, unknown>;
    expect(l["inputs"]).toEqual({ f: 1 });
  });
  it("a single Save with NO outputs key tolls the ?? arm", () => {
    const r = row({
      workflow: { save: { class_type: "SaveImage", inputs: {} } },
    }) as MergeRow & { outputs?: unknown };
    delete (r as { outputs?: unknown }).outputs;
    const plan = planMerge([r], {}, {});
    expect(Object.keys(plan.workflow)).toEqual(["s1::save"]);
  });
});
