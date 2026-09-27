import "../../../../tests/helpers/boot-models.ts";
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

  it("THE SCHEMA GATE: an out-of-envelope batch_size refuses loud (declared 1–16), never composes", () => {
    assert.throws(
      () => def.compose({ input_image: "$image", batch_size: 99 }, model, new GraphBuilder(), "r_oob"),
      /batch_size|99|between|range/i,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed resolution refuses loud (declared number)", () => {
    assert.throws(
      () => def.compose({ input_image: "$image", resolution: "1080p" }, model, new GraphBuilder(), "r_wt"),
      /resolution|expected number/i,
    );
  });

  it("THE SCHEMA GATE: an unstated seed arrives as the declared default -1 (the walk fills it)", () => {
    // seed is the card's only schema-defaulted knob (resolution /
    // max_resolution / batch_size ride the model cascade) — read it
    // off the same walk compose runs, then ride the raw doc through
    // compose to prove the lane still builds from the filled doc.
    const doc = def.schema({ input_image: "$image" }) as Record<string, unknown>;
    assert.equal(doc.seed, -1,
      "the fresh doc carries the schema-declared default seed -1, not undefined");
    const g = new GraphBuilder();
    def.compose({ input_image: "$image" }, model, g, "r_def");
    assert.ok(g.toJSON()["SeedVR2VideoUpscaler.0"], "the filled doc composes the lane");
  });

  it("THE SCHEMA GATE: admits keys pass the walk verbatim (no stamp drop)", () => {
    const doc = def.schema({ input_image: "$image", filename_prefix: "r/gen" }) as Record<string, unknown>;
    assert.equal(doc.filename_prefix, "r/gen",
      "the admitted filename_prefix survives the gate to the composer");
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
