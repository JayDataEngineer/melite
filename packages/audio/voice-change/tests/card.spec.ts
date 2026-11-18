// @melite/audio-voice-change — the card's compose gate (TEST-2
// breadth, the sfx shape). The lane rides the boarded seed-vc
// family's own declared convert action against the REAL registry
// rows (both routes — speech + the singing f0 lane).
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
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
import { ACTION_BINDINGS, BOARDED, VARIANT_ADDRESSES, DEFAULT_MODEL, composeFamilyAction } from "../src/card.ts";
import { primeFamilySeats, seatOf } from "../src/family-seats.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let speech: ModelFacts;

beforeAll(async () => {
  // THE SEATS, PRIMED EXPLICITLY (the plugin law's test shape): the
  // card's compose dispatch resolves the family DECL through the
  // guarded dynamic seat — this file composes with the family
  // installed, so the seat is filled before the first arm runs.
  await primeFamilySeats();
  def = (await loadCardDefs()).get("voice-change")!;
  assert.ok(def, "the composition root serves the voice-change card");
  speech = facts.models["seed-vc"]!;
  assert.ok(speech, "the seed-vc facts row serves");
});

describe("the voice-change compose gate", () => {
  it("a missing source_audio refuses loud (the words to keep)", () => {
    assert.throws(
      () => def.compose(def.schema({ ref_audio: "/tmp/ref.wav" }), speech, new GraphBuilder(), "r1"),
      /required param 'source_audio' missing or empty on the voice-change card/,
    );
  });

  it("a missing ref_audio refuses loud (the voice to borrow)", () => {
    assert.throws(
      () => def.compose(def.schema({ source_audio: "/tmp/src.wav" }), speech, new GraphBuilder(), "r2"),
      /required param 'ref_audio' missing or empty on the voice-change card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope steps refuses loud (1–200), never composes", () => {
    assert.throws(
      () => def.compose({ source_audio: "/tmp/s.wav", ref_audio: "/tmp/r.wav", steps: 9999 }, speech, new GraphBuilder(), "r_oob"),
      /steps|9999|between|range/i,
    );
  });

  it("THE SCHEMA GATE: pitch_shift outside ±24 refuses loud", () => {
    assert.throws(
      () => def.compose({ source_audio: "/tmp/s.wav", ref_audio: "/tmp/r.wav", pitch_shift: 30 }, speech, new GraphBuilder(), "r_ps"),
      /pitch|30|between|range/i,
    );
  });

  it("the happy lane composes the upstream node verbatim — both audio seats load, SaveAudio under <run>/vc", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source_audio: "take.wav", ref_audio: "voice.flac" }), speech, g, "run_6");
    const graph = g.toJSON();
    const load1 = graph["LoadAudio.0"];
    const load2 = graph["LoadAudio.1"];
    assert.ok(load1 && load2, "both audio heads ride (source + reference)");
    const seats = [load1.inputs.audio, load2.inputs.audio].sort();
    assert.deepEqual(seats, ["take.wav", "voice.flac"]);
    const run = graph["SeedVCRun.0"];
    assert.ok(run, "the upstream SeedVCRun node rides");
    assert.equal(run.inputs.steps, 30, "upstream default steps (30)");
    assert.equal(run.inputs.speed, 1, "upstream default speed (1.0 — the rhythm-keeping contract)");
    assert.equal(run.inputs.inference_cfg_rate, 0.7, "upstream default cfg rate (0.7)");
    assert.equal(run.inputs.f0_condition, false, "the speech lane keeps f0_condition off");
    assert.equal(run.inputs.auto_f0_adjust, true, "upstream default auto_f0_adjust (true)");
    assert.equal(run.inputs.pitch_shift, 0, "upstream default pitch_shift (0)");
    assert.equal(run.inputs.unload_model, true, "upstream default unload_model (true)");
    assert.equal(graph["SaveAudio.0"].inputs.filename_prefix, "run_6/vc", "the tail saves under <run>/vc");
  });

  it("THE SINGING LANE: the f0 recipe stamp rides verbatim (the 44.1k f0 DiT lane)", () => {
    const g = new GraphBuilder();
    // the singing RECIPE stamps f0_condition=true into the draft at
    // the bench (plane canon L1: wire_defaults is the Recipe
    // plane's macro) — the compose gate passes it through verbatim
    def.compose(def.schema({ source_audio: "sung.wav", ref_audio: "voice.flac", f0_condition: true }), speech, g, "run_f0");
    const run = g.toJSON()["SeedVCRun.0"];
    assert.ok(run, "the lane composes on the f0 stamp");
    assert.equal(run.inputs.f0_condition, true,
      "the singing recipe's stamp rides the node verbatim");
  });

  it("a stated knob rides verbatim (steps 50, pitch_shift -3, unload off for chains)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ source_audio: "s.wav", ref_audio: "r.wav", steps: 50, pitch_shift: -3, unload_model: false }), speech, g, "run_k");
    const run = g.toJSON()["SeedVCRun.0"];
    assert.equal(run.inputs.steps, 50);
    assert.equal(run.inputs.pitch_shift, -3);
    assert.equal(run.inputs.unload_model, false);
  });

  it("THE PLUGIN LAW: an absent family seat refuses loud BY NAME — the card composes nothing", () => {
    // the dispatch's own door (family-seats returns undefined for a
    // family whose package is absent from the install)
    assert.throws(
      () => composeFamilyAction('seed-vc-not-installed', {}, speech, new GraphBuilder(), "r_x"),
      /no declared action for family 'seed-vc-not-installed' on the voice-change card/,
    );
    assert.equal(seatOf('seed-vc-not-installed'), undefined);
  });

  it("an unboarded family refuses loud at the dispatch (a route id keys nothing)", () => {
    assert.equal(ACTION_BINDINGS['moss-sfx'], undefined, "the sfx family is not this card's");
    assert.throws(
      () => def.compose(def.schema({ source_audio: "s.wav", ref_audio: "r.wav" }), { ...speech, family: 'moss-sfx' } as ModelFacts, new GraphBuilder(), "r_u"),
      /no declared action for family 'moss-sfx' on the voice-change card/,
    );
  });

  it("BOARDS the family and both routes; the speech lane is the default", () => {
    assert.deepEqual(BOARDED, ['seed-vc']);
    assert.deepEqual(VARIANT_ADDRESSES, []);
    assert.deepEqual(def.boarded, ['seed-vc']);
    assert.equal(DEFAULT_MODEL, 'seed-vc');
    assert.deepEqual(def.flowKinds?.inputs, { source_audio: 'audio', ref_audio: 'audio' });
    assert.deepEqual(def.flowKinds?.outputs, { default: 'audio' });
    assert.equal(def.flowKinds?.requiresModel, true, "the card composes through the family's model row");
  });

  it("REQUIRES the upstream pack — the node is not core", () => {
    assert.deepEqual(def.requires, ['ComfyUI_Seed-VC']);
  });
});
