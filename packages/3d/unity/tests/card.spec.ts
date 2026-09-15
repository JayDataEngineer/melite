// @melite/3d-unity — the card's compose gate. The two admissions
// live on the card: the project directory and the method name; the
// extra_args shape pre-validates HERE (the node refuses too, but a
// typo fails at compose, never after the run queues).
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import type { CardDefinition } from "@melite/comfyui-cordis/service";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;

beforeAll(async () => {
  def = (await loadCardDefs()).get("unity")!;
  assert.ok(def, "the composition root serves the unity card");
});

describe("the unity compose gate", () => {
  it("project and method missing refuse TOGETHER, named", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) project_path, execute_method missing on the unity lane/,
    );
  });

  it("the method alone refuses when the project is present", () => {
    assert.throws(
      () => def.compose(def.schema({ project_path: "/u/proj" }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) execute_method missing on the unity lane/,
    );
  });

  it("the project alone refuses when the method is present", () => {
    assert.throws(
      () => def.compose(def.schema({ execute_method: "Build.Do" }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) project_path missing on the unity lane/,
    );
  });

  it("blank strings refuse like missing ones", () => {
    assert.throws(
      () => def.compose(def.schema({ project_path: "  ", execute_method: " " }), DUMMY_MODEL, new GraphBuilder(), "r1"),
      /required param\(s\) project_path, execute_method missing on the unity lane/,
    );
  });

  it("unparseable extra_args refuses at compose, never mid-run", () => {
    assert.throws(
      () => def.compose(
        def.schema({ project_path: "/u/proj", execute_method: "Build.Do", extra_args: "{bad" }),
        DUMMY_MODEL, new GraphBuilder(), "r1",
      ),
      /extra_args is not a JSON list on the unity lane/,
    );
  });

  it("non-list extra_args refuses at compose, never mid-run", () => {
    assert.throws(
      () => def.compose(
        def.schema({ project_path: "/u/proj", execute_method: "Build.Do", extra_args: '{"a":1}' }),
        DUMMY_MODEL, new GraphBuilder(), "r1",
      ),
      /extra_args must be a JSON list on the unity lane/,
    );
  });

  it("the happy lane batches Unity and tails the log", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        project_path: "/u/proj", execute_method: "Build.Do",
        scene: "Assets/Main.unity", extra_args: '["-nographics"]', timeout: 900,
      }),
      DUMMY_MODEL, g, "run_7",
    );
    const graph = g.toJSON();
    const batch = graph["MeliteUnityBatch.0"] as { inputs: Record<string, unknown> };
    assert.ok(batch, "the batch node derives");
    assert.equal(batch.inputs.project_path, "/u/proj");
    assert.equal(batch.inputs.execute_method, "Build.Do");
    assert.equal(batch.inputs.scene, "Assets/Main.unity");
    assert.equal(batch.inputs.extra_args, '["-nographics"]');
    assert.equal(batch.inputs.timeout, 900);
    const tail = graph["SaveText.0"] as { inputs: Record<string, unknown> };
    assert.ok(tail, "the log tail derives");
    assert.equal(tail.inputs.format, "txt");
    assert.equal(tail.inputs.filename_prefix, "run_7/unity_log");
  });

  it("defaults ride the node untouched (empty scene, empty args, 600s)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ project_path: "/u/proj", execute_method: "Build.Do" }),
      DUMMY_MODEL, g, "r1",
    );
    const batch = g.toJSON()["MeliteUnityBatch.0"] as { inputs: Record<string, unknown> };
    assert.equal(batch.inputs.scene, "");
    assert.equal(batch.inputs.extra_args, "[]");
    assert.equal(batch.inputs.timeout, 600);
  });

  it("hand-composed params ride the fallbacks (the schema default never reaches them)", () => {
    const g = new GraphBuilder();
    def.compose(
      { project_path: "/u/proj", execute_method: "Build.Do" } as never,
      DUMMY_MODEL, g, "r1",
    );
    const batch = g.toJSON()["MeliteUnityBatch.0"] as { inputs: Record<string, unknown> };
    assert.equal(batch.inputs.scene, "");
    assert.equal(batch.inputs.extra_args, "[]");
  });
});
