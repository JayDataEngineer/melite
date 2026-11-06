// @melite/models-h3 — THE CONTINUATION DIAL (slice 2 of the
// collapse — FRICTION_3's collapse map: "extend = mask=whole-frame
// + continuation policy, not a separate arm"). This spec fires on
// the card's OWN compose door (def.compose) for the edit kind:
// continuation ON delegates to the continuation seat (the forced
// AddGuide seam, the fresh full-denoise windows, the join into one
// film), the four posture laws refuse loud BEFORE the delegation
// (blank mask, self anchors, full denoise, refine off), the
// composition solver rides verbatim through this door, and the
// default path stays byte-clean of the continuation vocabulary
// (resolve default-fills extend_seconds on every entry — presence
// is never authorship; inertness is the law). The continuation
// seat's own emission laws live in the extend suite; the preset
// cells in edit-presets.spec.ts. No @contract marker:
// package-local law, prose header (the registry row owns the law).
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

/** The continuation posture as the edit door's own entry: blank
 * mask, self anchors, full denoise, the switch on. */
const CONT_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "she keeps walking toward the door, the door opens",
  mask_source: "whole-frame",
  reference: "self",
  denoise: 1,
  keep_audio: false,
  continuation: true,
  extend_seconds: 2.33,
});

const compose = (entry: Record<string, unknown>): Record<string, Node> => {
  const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
  const g = new GraphBuilder();
  def.compose(walked, model, g, "run_edit_continuation");
  return graphOf(g);
};

describe("the continuation dial — the extend posture on the one edit bag (the collapse, slice 2)", () => {
  it("continuation ON composes the continuation emission through the edit door: the forced seam + the joined film", () => {
    const out = compose(CONT_ENTRY());
    const guides = ofClass(out, "MiniMaxH3AddGuide");
    assert.equal(guides.length, 1, "the forced AddGuide seam pins the prior's last frame at frame 0");
    assert.equal(guides[0][1].inputs.frame_idx, 0, "the seam lands at the first appended frame");
    assert.equal(
      ofClass(out, "ImageFromBatch").length >= 1, true,
      "the prior's last frame is taken in-graph (the positive out-of-band index law)",
    );
    assert.match(
      JSON.stringify(out), /extend_film/,
      "the join delivers the one-film grammar (the prior + the extension)",
    );
  });

  it("a masked continuation refuses — extended seconds are NEW content, nothing is held", () => {
    assert.throws(
      () => compose({ ...CONT_ENTRY(), mask_source: "region", region_prompt: "hands" }),
      /a masked continuation/,
    );
  });

  it("an anchored continuation refuses — the anchors are the prior's own", () => {
    assert.throws(
      () => compose({
        ...CONT_ENTRY(), reference: "still+mannequin", still: "clips/still.png", mannequin: "clips/mannequin.mp4",
      }),
      /an anchored continuation/,
    );
  });

  it("a partial continuation refuses — fresh seconds generate at full denoise", () => {
    assert.throws(
      () => compose({ ...CONT_ENTRY(), denoise: 0.32 }),
      /extended seconds generate FRESH at full denoise/,
    );
  });

  it("the refine pass under a continuation refuses — full noise discards the learned latent", () => {
    assert.throws(
      () => compose({ ...CONT_ENTRY(), refine: true }),
      /the refine pass under a continuation/,
    );
  });

  it("continuation OFF (the default path) is inert: no seam, no join vocabulary, the matrix emission serves", () => {
    const { continuation: _c, keep_audio: _k, ...entry } = CONT_ENTRY();
    entry.mask_source = "region";
    entry.region_prompt = "hands";
    entry.denoise = 0.32;
    entry.keep_audio = true;
    const out = compose(entry);
    assert.equal(ofClass(out, "MiniMaxH3AddGuide").length, 0, "no forced seam on the matrix path");
    const json = JSON.stringify(out);
    assert.equal(json.includes("extend_film"), false,
      "the join grammar never rides the default path — resolve default-fills extend_seconds on every entry (the default-fill burn), so INERTNESS is the law");
    assert.equal(ofClass(out, "MiniMaxH3ContexMaskedTarget").length >= 1, true,
      "the matrix emission serves");
  });

  it("the composition solver rides verbatim through this door: beyond one window the N-window law composes", () => {
    // 19.33 s = 464 f > 362 f (the largest single window) — the
    // solver composes 5 uniform 124f windows (delivering 464 f
    // exactly, the round-trip law); the delivered join grammar
    // serves through the edit door exactly as at the extend
    // kind's own door.
    const out = compose({ ...CONT_ENTRY(), extend_seconds: 19.33 });
    assert.equal(ofClass(out, "MiniMaxH3ChainAssemble").length, 1,
      "a multi-window continuation assembles in-chain");
    assert.match(JSON.stringify(out), /extend_chain/,
      "the assembled extension rides the join's append seat");
  });
});
