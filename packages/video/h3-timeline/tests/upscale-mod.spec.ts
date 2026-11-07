// @melite/video-h3-timeline — THE UPSCALE NAME (slice 4 of the
// collapse: THE DELETION). The name left the DECLARED roster and
// lives on as the edit bag's UPSCALE POSTURE: a stated chain_run
// resumes a prior run's checkpointed scenes through the requeue
// loop. The suite drives the card's own doors and pins the
// surviving laws: the loop's bare-name selection, its own
// partial-only sigma law, and the prompt law for an unarmed bag.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

const compose = (doc: Record<string, unknown>, runId: string): Record<string, Node> => {
  const walked = def.schema(doc) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, runId);
  return graphOf(g);
};

const UPSCALE_ENTRY = (): Record<string, unknown> => ({
  chain_run: "run-1d3540406726",
  prompt: "sharpen every subject, keep the framing",
});

const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  edit_prompt: "sharpen every subject, keep the framing",
  chain_run: "run-1d3540406726",
  // the arm's declared pass-2 default, stated (absence is not authorship)
  denoise: 0.24,
});

describe("the Upscale name — the deferred second pass of the one edit bag (the collapse, slice 4)", () => {
  it("THE NAME LEFT THE ROSTER: no upscale peer bag is served", () => {
    const kinds = ((def as { mods?: Array<Record<string, unknown>> }).mods ?? []).map((k) => k.kind);
    assert.deepEqual(kinds, ["reshoot", "edit", "loras"], "the survivor roster");
    assert.equal(kinds.includes("upscale"), false);
  });

  it("THE NAME STILL COMPOSES: the requeue loop through the one door", () => {
    const out = compose({ upscale: [UPSCALE_ENTRY()] }, "run_upscale_alias");
    const manager = ofClass(out, "MiniMaxH3ChainCheckpointManager");
    assert.equal(manager.length, 1, "the loop's checkpoint head serves");
    assert.equal(manager[0][1].inputs.selection_json, "run-1d3540406726",
      "the bare run name at the head (the selection law)");
    assert.equal(ofClass(out, "MiniMaxH3ChainUpscaleLoopEnd").length, 1, "the requeue tail serves");
    assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1, "the assemble terminates the loop");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the stated chain_run entry", () => {
    const viaAlias = compose({ upscale: [UPSCALE_ENTRY()] }, "run_upscale_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_upscale_equiv");
    assert.deepEqual(viaAlias, viaEdit, "the prior-run posture, node for node");
  });

  it("leaves the film byte-identical with the arm absent", () => {
    const out = compose({}, "run_upscale_empty");
    assert.equal(JSON.stringify(out).includes("MiniMaxH3ChainUpscale"), false,
      "no loop vocabulary rides the film path");
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the film still delivers");
  });

  it("an EMPTY legacy bag is the unused arm", () => {
    assert.deepEqual(
      compose({ upscale: [] }, "run_upscale_empty_bag"),
      compose({}, "run_upscale_empty_bag"),
      "an empty array still composes the film",
    );
  });

  it("an armed bag with NO chain_run refuses loud — the posture has nothing to second-pass", () => {
    const { chain_run: _c, ...noRun } = UPSCALE_ENTRY();
    assert.throws(
      () => compose({ upscale: [noRun] }, "run_upscale_no_run"),
      /the upscale arm states no chain_run/,
    );
  });

  it("a full-denoise second pass refuses at the loop's own law", () => {
    assert.throws(
      () => compose({ upscale: [{ ...UPSCALE_ENTRY(), denoise: 1 }] }, "run_upscale_full"),
      /a second pass is an upscale, never a re-render/,
    );
  });

  it("the pass-2 window rides verbatim (the scheduler carries denoise + steps)", () => {
    const out = compose({ upscale: [{ ...UPSCALE_ENTRY(), denoise: 0.3, steps: 22 }] }, "run_upscale_window");
    const sched = ofClass(out, "BasicScheduler");
    assert.equal(sched.length, 1, "the loop's scheduler serves");
    assert.equal(sched[0][1].inputs.denoise, 0.3, "the stated pass-2 window");
    assert.equal(sched[0][1].inputs.steps, 22, "the stated steps");
  });

  it("a TWO-ENTRY bag refuses — one entry per arm, never a silent first-wins", () => {
    assert.throws(
      () => compose({ upscale: [UPSCALE_ENTRY(), UPSCALE_ENTRY()] }, "run_upscale_two"),
      /upscale carries 2 entries/,
    );
  });

  it("ONE DOOR: upscale beside an armed edit bag refuses", () => {
    assert.throws(
      () => compose({ upscale: [UPSCALE_ENTRY()], edit: [EDIT_EQUIVALENT()] }, "run_upscale_race"),
      /Video edit and upscale are both armed/,
    );
  });
});
