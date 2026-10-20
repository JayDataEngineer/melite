import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";
import { ACTION_BINDINGS } from "../src/card.ts";
import { SCALE_METHODS, MIN_DIM } from "@melite/models-input";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
const DUMMY: ModelFacts = { id: "x", family: "input", card: "x", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

let def: CardDefinition;
beforeAll(async () => {
  def = (await loadCardDefs()).get("input-prep")!;
  assert.ok(def, "the composition root serves the input-prep card");
});

describe("the input-prep compose gate", () => {
  it("a missing source refuses (staged source is the lane's whole input)", () => {
    assert.throws(
      () => def.compose(def.schema({}), DUMMY, new GraphBuilder(), "r1"),
      /required param 'source' missing on the input-prep card/,
    );
    assert.throws(
      () => def.compose(def.schema({ source: "  " }), DUMMY, new GraphBuilder(), "r1"),
      /required param 'source' missing on the input-prep card/,
    );
  });

  it("THE SCHEMA GATE: a wrong-typed source refuses loud (declared a string path)", () => {
    assert.throws(
      () => def.compose({ source: 42 }, DUMMY, new GraphBuilder(), "r_type"),
      /source/,
    );
  });

  it("THE SCHEMA GATE: the admits overlay rides the gated doc inert (a crop row still crops)", () => {
    const g = new GraphBuilder();
    def.compose(
      { source: "upload.png", crop: { x: 0, y: 0, width: 64, height: 64 } },
      DUMMY, g, "run_crop",
    );
    const graph = g.toJSON();
    assert.ok(Object.values(graph).some((n) => n.class_type === "ImageCrop"), "the crop row survives the gate");
  });

  it("the transform controls are declared and normalize into the image lane", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      source: "upload.png",
      crop_x: 4,
      crop_y: 6,
      crop_width: 64,
      crop_height: 48,
      scale_width: 32,
      scale_height: 24,
      scale_method: "nearest-exact",
    }), DUMMY, g, "run_transform");
    const graph = g.toJSON();
    assert.ok(Object.values(graph).some((node) => node.class_type === "ImageCrop"));
    const scale = Object.values(graph).find((node) => node.class_type === "ImageScale");
    assert.equal(scale?.inputs.width, 32);
    assert.equal(scale?.inputs.height, 24);
    assert.equal(scale?.inputs.upscale_method, "nearest-exact");
  });

  it("partial crop and scale declarations refuse instead of silently defaulting", () => {
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", crop_x: 4 }), DUMMY, new GraphBuilder(), "bad_crop"),
      /crop needs all four/,
    );
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", scale_width: 32 }), DUMMY, new GraphBuilder(), "bad_scale"),
      /scale needs positive/,
    );
  });

  it("THE DROPDOWN LAW (volley item a, 2026-10-24): scale_method is the engine's closed set — a bogus method refuses at the schema gate", () => {
    // The card serves the family's SCALE_METHODS export (one truth,
    // grounded in the engine's ImageScale object_info) — every
    // member composes, anything else dies at resolve, never at the
    // engine as a raw combo error.
    assert.deepEqual([...SCALE_METHODS], ["nearest-exact", "bilinear", "area", "bicubic", "lanczos"]);
    for (const method of SCALE_METHODS) {
      const g = new GraphBuilder();
      def.compose(def.schema({ source: "upload.png", scale_width: 32, scale_height: 24, scale_method: method }), DUMMY, g, `method_${method}`);
      const scale = Object.values(g.toJSON()).find((node) => node.class_type === "ImageScale");
      assert.equal(scale?.inputs.upscale_method, method);
    }
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", scale_width: 32, scale_height: 24, scale_method: "ultra-sharp" }), DUMMY, new GraphBuilder(), "bad_method"),
      /scale_method|ultra-sharp/,
    );
  });

  it("THE MODEL CHAIN (the studio-card directive, 2026-11-08): a stated scale_model composes loader → with-model, verbatim, before any plain scale", () => {
    // The stated model rides UpscaleModelLoader.model_name verbatim;
    // ImageUpscaleWithModel consumes the loader's OUTPUT handle; the
    // plain ImageScale rides downstream ONLY when dims are also
    // stated (a stated downsize after the model's xN).
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "upload.png", scale_model: "RealESRGAN_x4plus" }), DUMMY, g, "run_model");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const loader = Object.values(graph).find((n) => n.class_type === "UpscaleModelLoader");
    assert.ok(loader, "the stated model composes the loader");
    assert.equal(loader!.inputs.model_name, "RealESRGAN_x4plus");
    const withModel = Object.values(graph).find((n) => n.class_type === "ImageUpscaleWithModel");
    assert.ok(withModel, "the with-model node composes");
    assert.deepEqual(withModel!.inputs.upscale_model, ["UpscaleModelLoader.0", 0], "the with-model consumes the loader's OUTPUT handle");
    assert.deepEqual(withModel!.inputs.image, ["LoadImage.0", 0], "the load rides upstream");
    assert.ok(!Object.values(graph).some((n) => n.class_type === "ImageScale"), "no plain scale when no dims are stated");
  });

  it("THE MODEL CHAIN ORDER: crop rides upstream and the plain scale rides downstream of the model", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      source: "upload.png",
      crop_x: 0, crop_y: 0, crop_width: 800, crop_height: 600,
      scale_model: "ESRGAN_x4",
      scale_width: 512, scale_height: 384,
    }), DUMMY, g, "run_model_chain");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const withModel = Object.values(graph).find((n) => n.class_type === "ImageUpscaleWithModel")!;
    assert.ok(withModel, "the model chain composes under crop + dims");
    assert.deepEqual(withModel.inputs.image, ["ImageCrop.0", 0], "the crop rides upstream of the model");
    const scale = Object.values(graph).find((n) => n.class_type === "ImageScale")!;
    assert.deepEqual(scale.inputs.image, ["ImageUpscaleWithModel.0", 0], "the plain resize rides downstream of the model");
  });

  it("THE UNSTATED MODEL IS ABSENT, NEVER PHANTOM: the shipped default composes no model nodes", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "upload.png" }), DUMMY, g, "run_unstated");
    const graph = g.toJSON();
    assert.ok(!Object.values(graph).some((n) => n.class_type === "UpscaleModelLoader"), "no loader from the \"\" default");
    assert.ok(!Object.values(graph).some((n) => n.class_type === "ImageUpscaleWithModel"), "no with-model from the \"\" default");
    const stated = def.schema({ source: "upload.png", scale_model: "" });
    const g2 = new GraphBuilder();
    def.compose(stated, DUMMY, g2, "run_unstated");
    assert.deepEqual(g2.toJSON(), g.toJSON(), "\"\" and absent are the same chain");
  });

  it("THE MODEL'S CLOSED SET: a bogus scale_model refuses at the schema gate (the vocabulary is the card's voice)", () => {
    assert.throws(
      () => def.schema({ source: "upload.png", scale_model: "ultra-sharp" }),
      /\$\.scale_model expected .*but got "ultra-sharp"/,
    );
  });

  it("THE BLANK-IMAGE LAW (volley item f, 2026-10-24): degenerate dims refuse at the gate — the 2x1 receipt never composes again", () => {
    // The live receipt: run-c5eb3f2ec512 rode scale_width 2 /
    // scale_height 1 (+ a 1x1 crop) through every gate, and the lane
    // served a 2x1 beige strip as the run's image. Flat-path dims
    // below the family's MIN_DIM now refuse in the card's voice; the
    // boundary member itself still composes.
    assert.equal(MIN_DIM, 8, "the floor is the universal latent divisor, pinned");
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", scale_width: 2, scale_height: 1 }), DUMMY, new GraphBuilder(), "blank_scale"),
      new RegExp(`input-prep scale needs width and height of at least ${MIN_DIM}px \\(got 2x1\\)`),
    );
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", crop_x: 19, crop_y: 20, crop_width: 1, crop_height: 1 }), DUMMY, new GraphBuilder(), "blank_crop"),
      new RegExp(`input-prep crop needs width and height of at least ${MIN_DIM}px \\(got 1x1\\)`),
    );
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "upload.png", scale_width: MIN_DIM, scale_height: MIN_DIM }), DUMMY, g, "floor_ok");
    assert.ok(Object.values(g.toJSON()).some((node) => node.class_type === "ImageScale"), "the floor member composes");
  });

  it("THE INTEGER LAW (volley item g, 2026-10-24): fractional dims refuse on EVERY path — never engine dialect", () => {
    // FLAT PATH: the schema's step(1) refuses first, in schemastery
    // voice — the exact message the volley quoted (`scale_width
    // expected number multiple of 1 but got 1.5`) is the GATE firing,
    // never a raw engine refusal. Pinned byte-exact so a step
    // regression (or a float widening) reds here.
    assert.throws(
      () => def.schema({ source: "upload.png", scale_width: 1.5, scale_height: 24 }),
      /\$\.scale_width expected number multiple of 1 but got 1\.5/,
    );
    assert.throws(
      () => def.schema({ source: "upload.png", crop_x: 0, crop_y: 0, crop_width: 64.5, crop_height: 48 }),
      /\$\.crop_width expected number multiple of 1 but got 64\.5/,
    );
    // LEGACY-OBJECT PATH: the schema cannot see inside the row — the
    // object rides the admits overlay raw, so the FAMILY backstop
    // refuses in its own voice (compose E2E through the real gate).
    assert.throws(
      () => def.compose({ source: "upload.png", scale: { width: 1.5, height: 24 } }, DUMMY, new GraphBuilder(), "frac_legacy_scale"),
      /scale row refused on the input-prep card: 'width'\/'height' must be integers/,
    );
    assert.throws(
      () => def.compose({ source: "upload.png", crop: { x: 0, y: 0, width: 64.5, height: 48 } }, DUMMY, new GraphBuilder(), "frac_legacy_crop"),
      /crop row refused on the input-prep card: 'width' must be an integer/,
    );
  });

  it("a complete crop with a non-positive dimension refuses", () => {
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png", crop_x: 0, crop_y: 0, crop_width: 0, crop_height: 10 }), DUMMY, new GraphBuilder(), "bad_crop_size"),
      /crop needs non-negative x\/y and positive width\/height/,
    );
  });

  it("legacy crop and scale rows remain usable while non-object overlays fall back", () => {
    const legacy = new GraphBuilder();
    def.compose({
      source: "upload.png",
      crop: { x: 1, y: 2, width: 30, height: 20 },
      scale: { width: 10, height: 12, method: "nearest-exact" },
    }, DUMMY, legacy, "legacy_transform");
    const legacyGraph = legacy.toJSON();
    assert.ok(Object.values(legacyGraph).some((node) => node.class_type === "ImageCrop"));
    const legacyScale = Object.values(legacyGraph).find((node) => node.class_type === "ImageScale");
    assert.equal(legacyScale?.inputs.width, 10);
    assert.equal(legacyScale?.inputs.height, 12);
    assert.equal(legacyScale?.inputs.upscale_method, "nearest-exact");

    for (const scale of [null, []]) {
      const g = new GraphBuilder();
      def.compose({ source: "upload.png", scale }, DUMMY, g, `non_object_${Array.isArray(scale) ? "array" : "null"}`);
      assert.equal(Object.values(g.toJSON()).some((node) => node.class_type === "ImageScale"), false);
    }
  });

  // AUDIT input-prep F3 (input-prep-total-verification-2026-10-20):
  // compose preferred the legacy nested crop/scale object over fresh
  // flat edits, forever — the studio seeds its user layer verbatim
  // from the row, so an old draft carrying a nested object re-sends
  // it on every run press and composes over every new box the
  // operator drags: the display shows the new box (the flat keys),
  // the engine crops the stale one. THE DISPLAY-TRUTH LAW: when any
  // flat key is seated, the flat keys outrank the legacy object; the
  // object only composes when NO flat key is seated.
  it("AUDIT F3: flat crop and scale keys outrank the legacy objects when both ride the doc", () => {
    const g = new GraphBuilder();
    def.compose({
      source: "upload.png",
      crop: { x: 1, y: 2, width: 30, height: 20 },
      crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150,
      scale: { width: 10, height: 12, method: "nearest-exact" },
      scale_width: 640, scale_height: 480,
    }, DUMMY, g, "flat_over_legacy");
    const graph = g.toJSON();
    const crop = Object.values(graph).find((node) => node.class_type === "ImageCrop");
    assert.deepEqual(
      { x: crop?.inputs.x, y: crop?.inputs.y, width: crop?.inputs.width, height: crop?.inputs.height },
      { x: 10, y: 20, width: 100, height: 150 },
      "the fresh flat edit wins — a stale nested object must never compose over the box the operator sees",
    );
    const scale = Object.values(graph).find((node) => node.class_type === "ImageScale");
    assert.equal(scale?.inputs.width, 640, "the flat scale target wins the same way");
    assert.equal(scale?.inputs.height, 480);

    // the counter: a doc with NO flat keys keeps the legacy object
    // composing (old drafts keep parsing — the riders' own law)
    const legacyOnly = new GraphBuilder();
    def.compose({
      source: "upload.png",
      crop: { x: 1, y: 2, width: 30, height: 20 },
      scale: { width: 10, height: 12, method: "nearest-exact" },
    }, DUMMY, legacyOnly, "legacy_only");
    const legacyGraph = legacyOnly.toJSON();
    const legacyCrop = Object.values(legacyGraph).find((node) => node.class_type === "ImageCrop");
    assert.deepEqual(
      { x: legacyCrop?.inputs.x, y: legacyCrop?.inputs.y, width: legacyCrop?.inputs.width, height: legacyCrop?.inputs.height },
      { x: 1, y: 2, width: 30, height: 20 },
      "with no flat keys seated the legacy object still composes",
    );
  });

  it("flow output bindings select exactly the declared media channel", () => {
    const image = def.flowOutputBindings?.[0];
    const audio = def.flowOutputBindings?.[1];
    assert.equal(image?.when?.({ media_type: "image" }), true);
    assert.equal(image?.when?.({ media_type: "audio" }), false);
    assert.equal(audio?.when?.({ media_type: "image" }), false);
    assert.equal(audio?.when?.({ media_type: "audio" }), true);
  });

  // AUDIT input-prep F6.5: the stage-view registration key and the
  // card id are two literals in two files — the mount census derives
  // both rosters from the SAME literal, so a key typo'd away from
  // the card id passes every census and only surfaces as the live
  // LOUD refusal. One arm binds the literals: the studio registers
  // under exactly the card's registered id.
  it("AUDIT F6.5: the stage-view registration key IS the card's registered id (the two literals agree)", () => {
    const cardSrc = readFileSync(join(__dirname, "../src/card.ts"), "utf8");
    const clientSrc = readFileSync(join(__dirname, "../src/client/index.ts"), "utf8");
    const cardId = cardSrc.match(/registerCard\(\{\s*\n?\s*id:\s*'([^']+)'/);
    const regKey = clientSrc.match(/defineStageViewRegistration\('([^']+)'/);
    assert.ok(cardId !== null, "the registerCard id literal is readable in src/card.ts");
    assert.ok(regKey !== null, "the registration key literal is readable in src/client/index.ts");
    assert.equal(regKey[1], cardId[1],
      "the studio registers under the card's id — a typo here passes the mount census (both rosters share one literal) and only fires as the live LOUD refusal");
  });

  // AUDIT input-prep F7: the 'model' rider admitted a key nothing
  // consumes — a silent pass-through for a param compose never
  // reads. The gate refuses it loud now (the refusal names the key).
  it("AUDIT F7: a 'model' param refuses loud — no rider admits a key nothing consumes", () => {
    assert.throws(
      () => def.compose({ source: "upload.png", model: "4x-ultrasharp" }, DUMMY, new GraphBuilder(), "model_rider"),
      /undeclared param\(s\): model/,
      "an admitted-but-unread key is a silent pass-through; the gate's refusal names what to remove",
    );
  });

  it("PRODUCER-ONLY: the card seats no flow inputs (the text-seat trap)", () => {
    // source is dual-media file intake (image-or-audio, role path
    // / wtype file) — the single-kind grammar cannot honestly seat
    // it. source: 'text' offered a picker seat no text producer
    // could ever fill (text links cannot land in LoadImage/
    // LoadAudio file slots under ROW-4). Nothing wires INTO a
    // source card — the file arrives via the form/params face —
    // so inputs is EMPTY while outputs keep both media channels.
    assert.deepEqual(def.flowKinds.inputs, {});
    assert.deepEqual(def.flowKinds.outputs, { image: "image", audio: "audio" });
  });

  it("audio selects the audio output producer instead of an image save", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "speech.wav", media_type: "audio" }), DUMMY, g, "run_audio");
    const graph = g.toJSON();
    assert.ok(Object.values(graph).some((node) => node.class_type === "SaveAudio"));
    assert.ok(!Object.values(graph).some((node) => node.class_type === "SaveImage"));
    assert.deepEqual(def.flowKinds.outputs, { image: "image", audio: "audio" });
  });

  it("the happy lane stages the source for the chain", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source: "upload.png" }), DUMMY, g, "run_1");
    const graph = g.toJSON();
    // the staged-source restage lane: load + save with the run prefix
    const save = Object.values(graph).find((n) => n.class_type === "SaveImage");
    assert.ok(save, "the restage saves");
    assert.match(String(save!.inputs.filename_prefix), /run_1/);
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the input-prep card serves: (1) the row's OWNING
// FAMILY holds an ACTION_BINDINGS row — no address silently rides
// the legacy lane while its siblings compose the declared segment;
// (2) the row composes ITS OWN declared segment — the staged source
// saves under the run-scoped prefix. The weightless lane's graph is
// the accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const prepRows = Object.values(facts.models).filter((m) => m.card === "input-prep");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(prepRows.length >= 1, `expected the served input-prep addresses, found ${String(prepRows.length)}`);
  });

  for (const row of prepRows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      // (1) THE BINDING: the owning family holds a row — a route id
      // keying nothing was the silent miss this wall exists to kill.
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the row's own declared segment.
      const g = new GraphBuilder();
      def.compose(def.schema({ source: "upload.png" }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const save = Object.values(graph).find((n) => n.class_type === "SaveImage")!;
      assert.ok(save, "the declared segment saves the staged source");
      assert.equal(save.inputs.filename_prefix, `wall_${row.id}/input_prep`, "compose stamps the run prefix");
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    // A synthetic family-less row (no served facts row carries this
    // shape): the dispatch refuses loud rather than riding a legacy
    // lane in the open (the interlock).
    const row = { ...prepRows[0]!, id: "synthetic-prep", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ source: "upload.png" }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-prep' on the input-prep card — every boarded family \(input\)/,
    );
  });
});
