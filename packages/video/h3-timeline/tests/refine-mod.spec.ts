// @melite/video-h3-timeline — THE REFINE NAME (slice 4 of the
// collapse: THE DELETION). The name left the DECLARED roster and
// lives on as the edit bag's REFINE SWITCH: blank mask, self
// anchors, the learned same-run handoff. The suite drives the
// card's own doors and pins the surviving laws the refine arm
// carried: the handoff node, the partial-only sigma law, the 2x
// OOM window, and the seats that died with the arm (the N-entry
// tiling, the start_seconds rail) refusing LOUD rather than
// dropping silently.
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

const REFINE_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  refine_prompt: "sharper, same framing",
  // the arm's declared design window (2.33 s = 56 f); the alias maps
  // it onto the edit bag's window_length, never the plan clip budget
  clip_seconds: 2.33,
});

const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "sharper, same framing",
  mask_source: "whole-frame",
  reference: "self",
  refine: true,
  // the arm's declared default, stated: absence is not authorship
  denoise: 0.32,
  window_length: 56,
});

describe("the Refine name — the refine switch of the one edit bag (the collapse, slice 4)", () => {
  it("THE NAME LEFT THE ROSTER: no refine peer bag is served", () => {
    const kinds = ((def as { mods?: Array<Record<string, unknown>> }).mods ?? []).map((k) => k.kind);
    assert.deepEqual(kinds, ["reshoot", "edit", "loras"], "the survivor roster");
    assert.equal(kinds.includes("refine"), false);
  });

  it("THE NAME STILL COMPOSES: the learned handoff rides the one door", () => {
    const out = compose({ refine: [REFINE_ENTRY()] }, "run_refine_alias");
    assert.equal(ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 1,
      "the same-run handoff serves");
    assert.ok(JSON.stringify(out).includes("minimax_h3_latent_upscaler_3d_bf16"),
      "the learned weights ride the one door's graph");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the stated switch entry", () => {
    const viaAlias = compose({ refine: [REFINE_ENTRY()] }, "run_refine_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_refine_equiv");
    assert.deepEqual(viaAlias, viaEdit, "blank mask + self anchors + the switch: the same cell, node for node");
  });

  it("leaves the film byte-identical with the arm absent", () => {
    for (const bag of [undefined, []]) {
      const out = compose(
        { calls: [{ text: "a slow push in", start_frame: 0, end_frame: 56 }], length: 56, ...(bag === undefined ? {} : { refine: bag }) },
        "run_refine_empty",
      );
      assert.equal(ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 0,
        "zero handoff classes ride the film path");
    }
  });

  it("a bare legacy refine doc composes at the DESIGN window (2.33 s = 56 f), never the 2x OOM default", () => {
    // the arm declared clip_seconds 2.33; without it the edit door's
    // 6 s plan default would compute 144 f at 2x and refuse a doc that
    // composed for years — the arm's own default rides the translation
    const bare = { source_clip: "clips/take.mp4", refine_prompt: "sharper, same framing" };
    const out = compose({ refine: [bare] }, "run_refine_bare");
    assert.equal(ofClass(out, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 1,
      "the learned handoff serves a bare legacy doc");
    const sched = ofClass(out, "BasicScheduler").filter(([, n]) => n.inputs.denoise === 0.32);
    assert.equal(sched.length >= 1, true, "the design partial window rides the scheduler");
  });

  it("a FULL-DENOISE refine refuses — the partial-only sigma law", () => {
    assert.throws(
      () => compose({ refine: [{ ...REFINE_ENTRY(), denoise: 1 }] }, "run_refine_full"),
      /with the refine pass on — a second pass is a refine, never a re-render/,
    );
  });

  it("the 2x OOM ceiling refuses naming both cures", () => {
    // the next on-grid window past the ceiling is 158 f (6.58 s): the
    // OOM law's own voice, not the grid's
    assert.throws(
      () => compose({ refine: [{ ...REFINE_ENTRY(), clip_seconds: 6.58 }] }, "run_refine_oom"),
      /TOO LONG.*141 f/,
    );
  });

  it("an UNTRANSLATABLE seat refuses loud: the arm's N-entry tiling has no dial", () => {
    assert.throws(
      () => compose({ refine: [{ ...REFINE_ENTRY(), windows: 3 }] }, "run_refine_windows"),
      /the refine arm's 'windows' seat rides no edit dial/,
    );
  });

  it("an UNTRANSLATABLE seat refuses loud: the start_seconds rail has no dial (frames name the window)", () => {
    assert.throws(
      () => compose({ refine: [{ ...REFINE_ENTRY(), start_seconds: 1 }] }, "run_refine_start"),
      /the refine arm's 'start_seconds' seat rides no edit dial/,
    );
  });

  it("ONE DOOR: refine beside an armed edit bag refuses", () => {
    assert.throws(
      () => compose({ refine: [REFINE_ENTRY()], edit: [EDIT_EQUIVALENT()] }, "run_refine_race"),
      /Video edit and refine are both armed/,
    );
  });

  it("ONE DOOR PER DOC: refine beside replace refuses", () => {
    assert.throws(
      () => compose({
        refine: [REFINE_ENTRY()],
        replace: [{ source_clip: "clips/take.mp4", still: "s.png", mannequin: "m.mp4", mask: "k.png", swap_prompt: "x" }],
      }, "run_refine_pair"),
      /replace and refine are both armed — one door per doc/,
    );
  });
});
