// @melite/video-h3-timeline — P0-2, defect board row 2, the
// operator's contract VERBATIM: "repair receives a mask and errors
// without one." The repair alias forces the edit door's RECEIVED
// static mask (mask_source 'static-png') — the prose door that let
// run-e79f3b304e4b "repair" with no mask asset in or out is DEAD at
// this cell. Arms: the mask-less repair refuses naming 'mask'; the
// received mask composes with zero SAM3 manufacture; the translation
// IS the cell (the alias deep-equals the equivalent stated edit
// entry); stated prose (region_prompt) rides no dial and refuses
// loud — never a silent manufacture, never a silent drop.
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
  repair_prompt: "the same hands, five clean fingers",
  mask: "masks/hands_union.png",
});

/** the SAME cell stated on the edit bag — the dials the alias must
 * resolve to (P0-2's collapse map: repair = received static mask +
 * self reference + partial denoise). */
const EDIT_EQUIVALENT = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  mask: "masks/hands_union.png",
  edit_prompt: "the same hands, five clean fingers",
  mask_source: "static-png",
  reference: "self",
  denoise: 0.32,
});

describe("the repair cell receives a mask (P0-2 — the operator's contract, defect board row 2)", () => {
  it("THE REFUSE: a repair doc with no mask errors naming 'mask' — never a silent whole-frame run", () => {
    const entry = REPAIR_ENTRY();
    delete entry.mask;
    assert.throws(
      () => compose({ repair: [entry] }, "run_repair_nomask"),
      /'mask' seat names no media.*a repair RECEIVES a mask.*refuses without one/s,
      "the refusal names the missing field (the board's own demand: 'say which field is missing')",
    );
    const blank = REPAIR_ENTRY();
    blank.mask = "  ";
    assert.throws(
      () => compose({ repair: [blank] }, "run_repair_blankmask"),
      /'mask' seat names no media/,
      "whitespace is absence",
    );
  });

  it("THE RECEIVED MASK COMPOSES: the alias resolves through the one door with zero SAM3 manufacture", () => {
    const out = compose({ repair: [REPAIR_ENTRY()] }, "run_repair_mask");
    const assemble = ofClass(out, "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "the chain assemble terminates the emission");
    assert.equal(assemble[0][1].inputs.filename, "run_repair_mask/edit",
      "the emission rides the edit tree under the door's own name");
    assert.equal(ofClass(out, "ImageToMask").length, 1, "the RECEIVED PNG decodes once (red channel)");
    assert.equal(ofClass(out, "CheckpointLoaderSimple").length, 0, "no SAM3 checkpoint — prose manufactures nothing");
    assert.equal(ofClass(out, "SAM3_VideoTrack").length, 0, "no video track — nothing is tracked at the repair cell");
    assert.equal(ofClass(out, "CLIPTextEncode").length, 0, "no region conditioning — the prose door is dead here");
    assert.equal(ofClass(out, "GrowMaskWithBlur").length, 0, "no grow — the bridge arrives already grown");
  });

  it("THE TRANSLATION IS THE CELL: the alias graph deep-equals the equivalent stated edit entry", () => {
    const viaAlias = compose({ repair: [REPAIR_ENTRY()] }, "run_repair_equiv");
    const viaEdit = compose({ edit: [EDIT_EQUIVALENT()] }, "run_repair_equiv");
    assert.deepEqual(viaAlias, viaEdit,
      "the repair alias states the same dial cell — no second mechanism, no silent seat drop");
  });

  it("THE PROSE DEMOTION: stated region_prompt rides no edit dial and refuses LOUD (the B-3 sweep — never a silent manufacture)", () => {
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), region_prompt: "hands" }] }, "run_repair_prose"),
      /'region_prompt' seat rides no edit dial.*Restate the doc on the edit bag/s,
      "the prose seat is consumed by nothing — stated, it refuses; the mask-less manufacture it fed is dead",
    );
    assert.throws(
      () => compose({ repair: [{ ...REPAIR_ENTRY(), mask_grow: 32, detection_threshold: 0.9 }] }, "run_repair_tuning"),
      /'mask_grow' seat rides no edit dial/,
      "the SAM3 tuning seats died with the manufacture — the bridge arrives already grown",
    );
  });
});
