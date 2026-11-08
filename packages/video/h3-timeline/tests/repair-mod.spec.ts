// @melite/video-h3-timeline — THE REPAIR NAME (slice 4 of the
// collapse: THE DELETION). The operator's own ruling: "REPAIR AND
// REPLACE ARE THE [redacted - the emphatic spelling lives in the
// receipt] SAME OPERATION! REPAIR JUST USES THE ORIGINAL." The name
// left the DECLARED roster and lives on as the
// edit bag's masked-partial cell: the translation states the
// RECEIVED static mask (P0-2, defect board row 2 — "repair receives
// a mask and errors without one") + the source as its own anchor +
// the stated denoise, node for node. The suite drives the card's own
// doors (def.mods proves the name is gone; def.compose proves the
// doc still composes) and pins the SURVIVING laws: the unguided
// full-render refusal, the declared band, the one-door matrix. The
// mask-required + prose-demotion arms live in
// repair-receives-mask.spec.ts (the contract's own wall).
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

const REPAIR_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  repair_prompt: "the same hands, five clean fingers, gripping the cup",
  mask: "masks/hands_union.png",
});

const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  mask: "masks/hands_union.png",
  edit_prompt: "the same hands, five clean fingers, gripping the cup",
  mask_source: "static-png",
  reference: "self",
  // the arm's declared default, stated: absence is not authorship
  denoise: 0.32,
});

describe("the Repair name — the masked-partial cell of the one edit bag (the collapse, slice 4)", () => {
  it("THE NAME LEFT THE ROSTER: no repair peer bag is served", () => {
    const kinds = ((def as { mods?: Array<Record<string, unknown>> }).mods ?? []).map((k) => k.kind);
    assert.deepEqual(kinds, ["reshoot", "edit", "loras"], "the survivor roster");
    assert.equal(kinds.includes("repair"), false);
  });

  it("THE NAME STILL COMPOSES: the RECEIVED static mask rides the one door", () => {
    const out = compose({ repair: [REPAIR_ENTRY()] }, "run_repair_alias");
    assert.equal(ofClass(out, "ImageToMask").length, 1, "the received PNG decodes once (the static mask)");
    assert.equal(ofClass(out, "SAM3_VideoTrack").length, 0, "no prose manufacture rides the repair alias (P0-2)");
    assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1, "the chain assemble terminates the emission");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the stated edit entry", () => {
    const viaAlias = compose({ repair: [REPAIR_ENTRY()] }, "run_repair_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_repair_equiv");
    assert.deepEqual(viaAlias, viaEdit, "mask + source anchor + denoise: the same cell, node for node");
  });

  it("leaves the film byte-identical with the arm absent", () => {
    const out = compose({}, "run_repair_empty");
    for (const cls of ["ImageToMask", "MiniMaxH3ContexMaskedTarget"]) {
      assert.equal(ofClass(out, cls).length, 0, `the empty-arm film composes no ${cls}`);
    }
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the film still delivers");
  });

  it("an EMPTY legacy bag is the unused arm", () => {
    assert.deepEqual(
      compose({ repair: [] }, "run_repair_empty_bag"),
      compose({}, "run_repair_empty_bag"),
      "an empty array still composes the film",
    );
  });

  it("P0-2: the prose door is DEAD at this cell — a stated region_prompt rides no dial (the sweep's own law)", () => {
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), region_prompt: "hands" }] }, "run_repair_prose"),
      /'region_prompt' seat rides no edit dial/,
      "the mask-less manufacture that let run-e79f3b304e4b repair from prose is gone",
    );
  });

  it("a FULL-DENOISE repair refuses — the unguided re-render law that replaced the arm name", () => {
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), denoise: 1 }] }, "run_repair_full"),
      /an unguided full re-render of the masked region/,
    );
  });

  it("THE DECLARED BAND BINDS: denoise 1.2 refuses naming the edit bag's 0.05–1 band", () => {
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), denoise: 1.2 }] }, "run_repair_band"),
      /outside this seat's declared band 0\.05–1/,
    );
  });

  it("ONE DOOR: repair beside an armed edit bag refuses", () => {
    assert.throws(
      () => compose({ repair: [REPAIR_ENTRY()], edit: [EDIT_EQUIVALENT()] }, "run_repair_race"),
      /Video edit and repair are both armed/,
    );
  });

  it("ONE DOOR PER DOC: repair beside extend refuses", () => {
    assert.throws(
      () => compose({
        repair: [REPAIR_ENTRY()],
        extend: [{ source_clip: "clips/take.mp4", extend_prompt: "keeps walking" }],
      }, "run_repair_pair"),
      /repair and extend are both armed — one door per doc/,
    );
  });
});
