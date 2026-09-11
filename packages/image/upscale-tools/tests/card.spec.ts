import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
const DUMMY: ModelFacts = { id: "x", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("upscale-tools")!;
  assert.ok(def, "the composition root serves the upscale-tools card");
});
// + the estate-file contract arms (resolveLinkedInput + the
// existence check — tmpdir files, chdir-free absolute paths).
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

const model = facts.models["seedvr2_ema"]!;

describe("the upscale-tools compose gate", () => {
  it("a missing input_image refuses (what gets upscaled)", () => {
    assert.throws(
      () => def.compose(def.schema({}), model, new GraphBuilder(), "r1"),
      /required param 'input_image' missing or empty on the upscale-tools card/,
    );
  });

  it("a dead local path refuses loud (the estate-file contract)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/no/such/file.png" }), model, new GraphBuilder(), "r1"),
      /is not a file on this estate/,
    );
  });

  it("a $spell rides verbatim (a wired stage input, never a file)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "$image" }), model, g, "run_1");
    assert.ok(g.toJSON()["SeedVR2VideoUpscaler.0"], "the upscaler rides the spell");
  });

  it("an https URL rides verbatim (the submit-time uploader owns it)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: "https://estate/v1/assets/runs/x/out.png" }), model, g, "run_2");
    assert.ok(g.toJSON()["SeedVR2LoadDiTModel.0"], "the lane loads its DiT");
  });

  it("a RELATIVE path resolves against the working root (then verifies)", () => {
    const dir = mkdtempSync(join(tmpdir(), "upscale-rel-"));
    writeFileSync(join(dir, "rel.png"), "png");
    const cwd = process.cwd();
    try {
      process.chdir(dir);
      const g = new GraphBuilder();
      def.compose(def.schema({ input_image: "rel.png" }), model, g, "run_4");
      assert.ok(g.toJSON()["SeedVR2VideoUpscaler.0"], "the relative file resolved and rides");
    } finally {
      process.chdir(cwd);
    }
  });

  it("a real tmpdir file upscales (the happy lane)", () => {
    const dir = mkdtempSync(join(tmpdir(), "upscale-"));
    const pic = join(dir, "pic.png");
    writeFileSync(pic, "png");
    const g = new GraphBuilder();
    def.compose(def.schema({ input_image: pic }), model, g, "run_3");
    assert.ok(g.toJSON()["SeedVR2VideoUpscaler.0"], "the upscaster rides");
  });
});
