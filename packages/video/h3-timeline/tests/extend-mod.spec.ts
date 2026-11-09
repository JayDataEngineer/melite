// @melite/video-h3-timeline — THE EXTEND NAME (slice 4 of the
// collapse: THE DELETION). The name left the DECLARED roster and
// lives on as the edit bag's CONTINUATION posture: blank mask, self
// anchors, full denoise, the forced seam, the joined film. The
// suite drives the card's own doors and pins the surviving laws the
// extend arm always carried (the seam, the grid, the solver's
// refusal voice) through the alias.
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

const EXTEND_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  extend_prompt: "she keeps walking toward the door, the door opens",
  extend_seconds: 3.75,
});

const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "she keeps walking toward the door, the door opens",
  continuation: true,
  mask_source: "whole-frame",
  reference: "self",
  denoise: 1,
  extend_seconds: 3.75,
});

describe("the Extend name — the continuation posture of the one edit bag (the collapse, slice 4)", () => {
  it("THE NAME LEFT THE ROSTER: no extend peer bag is served", () => {
    const kinds = ((def as { mods?: Array<Record<string, unknown>> }).mods ?? []).map((k) => k.kind);
    assert.deepEqual(kinds, ["reshoot", "edit", "loras"], "the survivor roster");
    assert.equal(kinds.includes("extend"), false);
  });

  it("THE NAME STILL COMPOSES: the forced seam + the joined film through the one door", () => {
    const out = compose({ extend: [EXTEND_ENTRY()] }, "run_extend_alias");
    const guides = ofClass(out, "MiniMaxH3AddGuide");
    assert.equal(guides.length, 1, "the forced seam pins the prior's last frame");
    assert.equal(guides[0][1].inputs.frame_idx, 0, "the seam lands at the first appended frame");
    assert.match(JSON.stringify(out), /extend_film/, "the join delivers the one-film grammar");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the stated continuation entry", () => {
    const viaAlias = compose({ extend: [EXTEND_ENTRY()] }, "run_extend_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_extend_equiv");
    assert.deepEqual(viaAlias, viaEdit, "blank mask + self anchors + full denoise: the same posture, node for node");
  });

  it("leaves the film byte-identical with the arm absent", () => {
    const out = compose({}, "run_extend_empty");
    assert.equal(ofClass(out, "MiniMaxH3AddGuide").length, 0, "the empty-arm film composes no forced seam");
    assert.equal(JSON.stringify(out).includes("extend_film"), false, "no join vocabulary on the film path");
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the film still delivers");
  });

  it("an EMPTY legacy bag is the unused arm", () => {
    assert.deepEqual(
      compose({ extend: [] }, "run_extend_empty_bag"),
      compose({}, "run_extend_empty_bag"),
      "an empty array still composes the film",
    );
  });

  it("a continuation with NO prompt refuses at the edit door's prompt law", () => {
    const { extend_prompt: _p, ...noPrompt } = EXTEND_ENTRY();
    assert.throws(
      () => compose({ extend: [noPrompt] }, "run_extend_no_prompt"),
      /'edit_prompt' names no action/,
    );
  });

  it("an OFF-GRID extension still refuses through the solver, naming its neighbors", () => {
    assert.throws(
      () => compose({ extend: [{ ...EXTEND_ENTRY(), extend_seconds: 20 }] }, "run_extend_offgrid"),
      /composes nowhere exactly/,
    );
  });

  it("a MULTI-WINDOW extension under a stated non-39 carry refuses the composition law (MED-1)", () => {
    // 90 is AV-legal (resolveCarryOverlap accepts it) — so this arm
    // reaches the composition door itself: the solver always carries
    // the policy's 39f overlap; a stated knob never rides seam math
    // in a multi-window composition.
    assert.throws(
      () => compose(
        { extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24, overlap_frames: 90 }] },
        "run_extend_multi_carry",
      ),
      /multi-window composition law carries the policy's 39f context overlap.*re-state overlap_frames 39/s,
    );
  });

  it("ONE DOOR: extend beside an armed edit bag refuses", () => {
    assert.throws(
      () => compose({ extend: [EXTEND_ENTRY()], edit: [EDIT_EQUIVALENT()] }, "run_extend_race"),
      /Video edit and extend are both armed/,
    );
  });

  it("ONE DOOR PER DOC: extend beside upscale refuses", () => {
    assert.throws(
      () => compose({
        extend: [EXTEND_ENTRY()],
        upscale: [{ chain_run: "run_prior" }],
      }, "run_extend_pair"),
      /extend and upscale are both armed — one door per doc/,
    );
  });
});
