// @melite/3d-blender — the card's compose gate. The one admission
// lives on the card: the script path; the script_args shape
// pre-validates HERE (the node refuses too, but a typo fails at
// compose, never after the run queues).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("blender")!;
  assert.ok(def, "the composition root serves the blender card");
});

describe("the blender compose gate", () => {
  it("a missing script_path refuses, named", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) script_path missing on the blender lane/,
    );
  });

  it("a blank script_path refuses like a missing one", () => {
    assert.throws(
      () => def.compose(def.schema({ script_path: "  " }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) script_path missing on the blender lane/,
    );
  });

  it("unparseable script_args refuses at compose, never mid-run", () => {
    assert.throws(
      () => def.compose(
        def.schema({ script_path: "/b/job.py", script_args: "{bad" }),
        DUMMY_MODEL, new GraphBuilder(), "r1",
      ),
      /script_args is not a JSON list on the blender lane/,
    );
  });

  it("non-list script_args refuses at compose, never mid-run", () => {
    assert.throws(
      () => def.compose(
        def.schema({ script_path: "/b/job.py", script_args: '{"a":1}' }),
        DUMMY_MODEL, new GraphBuilder(), "r1",
      ),
      /script_args must be a JSON list on the blender lane/,
    );
  });

  it("the happy lane runs the script and tails the log", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        script_path: "/b/job.py",
        script_args: '["--frames", "1-10"]', timeout: 900,
      }),
      DUMMY_MODEL, g, "run_7",
    );
    const graph = g.toJSON();
    const run = graph["MeliteBlenderRunScript.0"] as { inputs: Record<string, unknown> };
    assert.ok(run, "the run node derives");
    assert.equal(run.inputs.script_path, "/b/job.py");
    // compose normalizes the argv (compact JSON — the node parses it back).
    assert.equal(run.inputs.script_args, '["--frames","1-10"]');
    assert.equal(run.inputs.timeout, 900);
    const tail = graph["SaveText.0"] as { inputs: Record<string, unknown> };
    assert.ok(tail, "the log tail derives");
    assert.equal(tail.inputs.format, "txt");
    assert.equal(tail.inputs.filename_prefix, "run_7/blender_log");
  });

  it("defaults ride the node untouched (empty args, 600s)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ script_path: "/b/job.py" }),
      DUMMY_MODEL, g, "r1",
    );
    const run = g.toJSON()["MeliteBlenderRunScript.0"] as { inputs: Record<string, unknown> };
    assert.equal(run.inputs.script_args, "[]");
    assert.equal(run.inputs.timeout, 600);
  });

  it("hand-composed params ride the fallbacks (the schema default never reaches them)", () => {
    const g = new GraphBuilder();
    def.compose(
      { script_path: "/b/job.py" } as never,
      DUMMY_MODEL, g, "r1",
    );
    const run = g.toJSON()["MeliteBlenderRunScript.0"] as { inputs: Record<string, unknown> };
    assert.equal(run.inputs.script_args, "[]");
  });
});
