// @melite/video-h3-timeline — THE REPLACE NAME (slice 4 of the
// collapse: THE DELETION). The name left the DECLARED roster — the
// served face is edit + reshoot + loras — and lives on as the edit
// bag's identity-swap preset cell. This suite drives the card's OWN
// doors: def.mods proves the name is GONE as a peer bag; def.compose
// proves a doc still carrying `replace` resolves through the ONE
// door into the SAME emission the equivalent stated cell composes
// (the translation is the cell, node for node); the untranslatable
// seats refuse LOUD rather than dropping silently. Every row asserts
// served truth or refusal text — never expect(true).
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

/** The classic swap entry — the three bound seats a swap has always
 *  needed (source, still, mannequin) plus the staged mask. */
const REPLACE_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  still: "clips/face.png",
  mannequin: "clips/mannequin.mp4",
  mask: "clips/mask.png",
  swap_prompt: "the same person smiling, studio light",
  keep_audio: true,
});

/** The SAME cell stated on the edit bag — the dials the alias must
 *  resolve to (FRICTION_3's collapse map: swap = mask + denoise 1 +
 *  reference). */
const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  still: "clips/face.png",
  mannequin: "clips/mannequin.mp4",
  mask: "clips/mask.png",
  keep_audio: true,
  edit_prompt: "the same person smiling, studio light",
  mask_source: "static-png",
  reference: "still+mannequin",
  denoise: 1,
});

const compose = (doc: Record<string, unknown>, runId: string): Record<string, Node> => {
  const walked = def.schema(doc) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, runId);
  return graphOf(g);
};

describe("the Replace name — a preset cell of the one edit bag (the collapse, slice 4)", () => {
  it("THE NAME LEFT THE ROSTER: the card serves edit + reshoot + loras, never a replace peer bag", () => {
    const kinds = ((def as { mods?: Array<Record<string, unknown>> }).mods ?? []).map((k) => k.kind);
    assert.deepEqual(kinds, ["reshoot", "edit", "loras"],
      "the declared roster is the survivor set — the five peer bags are cells now");
    assert.equal(kinds.includes("replace"), false, "no replace kind is served (the deletion's own wall)");
  });

  it("THE NAME STILL COMPOSES: a replace doc resolves through the one door to the masked-edit emission", () => {
    const out = compose({ replace: [REPLACE_ENTRY()] }, "run_replace_alias");
    const assemble = ofClass(out, "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "the chain assemble terminates the emission");
    assert.equal(assemble[0][1].inputs.filename, "run_replace_alias/edit",
      "the emission rides the edit tree under the door's own name");
    assert.equal(ofClass(out, "MiniMaxH3ReferenceToVideo").length, 1, "the identity anchors ride the r2v seat");
    assert.ok(ofClass(out, "MiniMaxH3ContexMaskedTarget").length > 0, "the masked target serves");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the equivalent stated edit entry", () => {
    const viaAlias = compose({ replace: [REPLACE_ENTRY()] }, "run_replace_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_replace_equiv");
    assert.deepEqual(viaAlias, viaEdit,
      "the alias states the same dial cell — no second mechanism, no silent seat drop");
  });

  it("leaves the film byte-identical with the arm absent", () => {
    const out = compose({}, "run_replace_empty");
    for (const cls of ["MiniMaxH3ContexMaskedTarget", "MiniMaxH3ChainAssemble"]) {
      assert.equal(ofClass(out, cls).length, 0, `the empty-arm film composes no ${cls}`);
    }
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the film still delivers its SaveVideo");
  });

  it("an EMPTY legacy bag is the unused arm — the film path stays byte-identical", () => {
    const withEmpty = compose({ replace: [] }, "run_replace_empty_bag");
    const withAbsent = compose({}, "run_replace_empty_bag");
    assert.deepEqual(withEmpty, withAbsent, "an empty array predates the collapse and still composes its film");
  });

  it("ONE DOOR: replace beside an armed edit bag refuses, naming both", () => {
    assert.throws(
      () => compose({ replace: [REPLACE_ENTRY()], edit: [EDIT_EQUIVALENT()] }, "run_replace_race"),
      /Video edit and replace are both armed/,
    );
  });

  it("ONE DOOR PER DOC: replace beside repair refuses — the pair matrix's one surviving law", () => {
    assert.throws(
      () => compose({
        replace: [REPLACE_ENTRY()],
        repair: [{ source_clip: "clips/take.mp4", repair_prompt: "clean hands", region_prompt: "hands" }],
      }, "run_replace_pair"),
      /replace and repair are both armed — one door per doc/,
    );
  });

  it("an UNTRANSLATABLE seat refuses loud: the swap arm's roles rail has no edit dial", () => {
    assert.throws(
      () => compose({ replace: [{ ...REPLACE_ENTRY(), roles: "hero: alice" }] }, "run_replace_roles"),
      /the replace arm's 'roles' seat rides no edit dial/,
    );
  });

  it("a swap with its anchors unstated refuses at the edit door's own law", () => {
    const { still: _s, ...noStill } = REPLACE_ENTRY();
    assert.throws(
      () => compose({ replace: [noStill] }, "run_replace_no_still"),
      /the still\+mannequin reference dial needs both seats bound/,
    );
  });

  it("a swap with no staged mask refuses at the static-png law", () => {
    const { mask: _m, ...noMask } = REPLACE_ENTRY();
    assert.throws(
      () => compose({ replace: [noMask] }, "run_replace_no_mask"),
      /the static-png mask dial names no image/,
    );
  });
});
