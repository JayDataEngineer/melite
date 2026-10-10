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
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { ACTION_BINDINGS } from "../src/card.ts";

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

  it("a root-relative run-media URL with no estate manifest refuses LOUD (J12: no cwd guess)", () => {
    assert.throws(
      () => def.compose(def.schema({ input_image: "/melite-media/runs/run-x/out.png" }), model, new GraphBuilder(), "r_root"),
      /linked input needs the estate state root — compose with the queue seat's roots manifest/,
    );
  });

  it("a root-relative run-media URL rewrites against the manifest's first state root (then verifies)", () => {
    const root = mkdtempSync(join(tmpdir(), "upscale-root-"));
    const abs = join(root, "output", "run-x");
    mkdirSync(abs, { recursive: true });
    writeFileSync(join(abs, "out.png"), "png");
    const g = new GraphBuilder();
    def.compose(
      def.schema({ input_image: "/melite-media/runs/run-x/out.png" }),
      model,
      g,
      "r_rewrite",
      { stateRoots: [root] },
    );
    const json = JSON.stringify(g.toJSON());
    assert.ok(json.includes(join(root, "output", "run-x", "out.png")), "the ref rides rewritten to the runs root");
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

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the upscale-tools card serves: (1) the row's
// OWNING FAMILY holds an ACTION_BINDINGS row — no address silently
// rides the legacy lane while its siblings compose the declared
// segment; (2) the row composes ITS OWN declared truth — the unet
// and vae the row spells are the weights the graph loads. The
// row's lane_inputs are the oracle; the graph is the accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const upscaleRows = Object.values(facts.models).filter((m) => m.card === "upscale-tools");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(upscaleRows.length >= 1, `expected the served upscale addresses, found ${String(upscaleRows.length)}`);
  });

  for (const row of upscaleRows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      // (1) THE BINDING: the owning family holds a row — a route id
      // keying nothing was the silent miss this wall exists to kill.
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the row's own declared weights.
      const g = new GraphBuilder();
      def.compose(def.schema({ input_image: "$image" }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const li = row.lane_inputs as Record<string, unknown>;
      const dit = Object.values(graph).find((n) => n.class_type === "SeedVR2LoadDiTModel")!;
      assert.equal(dit.inputs.model, li.unet, "the graph loads the row's OWN DiT weights");
      const vae = Object.values(graph).find((n) => n.class_type === "SeedVR2LoadVAEModel")!;
      assert.equal(vae.inputs.model, li.vae, "the graph loads the row's OWN VAE weights");
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    // A synthetic family-less row (no served facts row carries this
    // shape): the dispatch refuses loud rather than riding a legacy
    // lane in the open (the interlock).
    const row = { ...facts.models["seedvr2_ema"]!, id: "synthetic-upscale", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ input_image: "$image" }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-upscale' on the upscale-tools card — every boarded family \(seedvr2_ema\)/,
    );
  });
});
