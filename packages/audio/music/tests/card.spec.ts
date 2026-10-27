// @melite/audio-music — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission stays on the card: the structured caption
// is the music (what the song IS); the lane body rides the kit
// against the REAL music3 facts row.
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
import { ACTION_BINDINGS } from "../src/card.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let music3: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("music")!;
  assert.ok(def, "the composition root serves the music card");
  music3 = facts.models.music3!;
  assert.ok(music3, "the music3 facts row serves");
});

describe("the music compose gate", () => {
  it("a missing caption refuses loud (the caption IS the song)", () => {
    assert.throws(
      () => def.compose(def.schema({}), music3, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the music card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope duration refuses loud (declared 5–360), never composes", () => {
    assert.throws(
      () => def.compose({ prompt: "funk, pop", duration: 900 }, music3, new GraphBuilder(), "r_oob"),
      /duration|900|between|range/i,
    );
  });

  it("THE SCHEMA GATE: an unstated duration arrives as the declared default 30 (the walk fills it)", () => {
    // The duration's ONE seat is the encoder's max_duration (audit 014 D1:
    // the latent's seconds is the AR's realized-length LINK, never the
    // literal — a second literal seat diverges when the AR ends early).
    const g = new GraphBuilder();
    def.compose({ prompt: "funk, pop" }, music3, g, "r_def");
    const encode = g.toJSON()["MiniMaxMusic3TextEncode.0"];
    assert.equal(encode.inputs.max_duration, 30,
      "the fresh doc composes the schema-declared default 30, not undefined");
    assert.deepEqual(g.toJSON()["EmptyMiniMaxMusic3LatentAudio.0"].inputs.seconds,
      ["MiniMaxMusic3TextEncode.0", 1],
      "the latent's seconds stays the AR link, default included");
  });

  it("the happy lane encodes the caption and saves mp3", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "funk, pop, soul, guitar, 105 BPM", lyrics: "[verse]..." }), music3, g, "run_2");
    const graph = g.toJSON();
    const encode = graph["MiniMaxMusic3TextEncode.0"];
    assert.ok(encode, "the structured-caption encoder rides");
    assert.equal(encode.inputs.caption, "funk, pop, soul, guitar, 105 BPM");
    assert.equal(encode.inputs.lyrics, "[verse]...");
    assert.ok(graph["UNETLoader.0"], "the lane loads its unet");
    assert.ok(graph["KSampler.0"], "the flow-matching sampler rides");
    const save = graph["SaveAudioAdvanced.0"];
    assert.ok(save, "the mp3 save rides");
    assert.equal(save.inputs.filename_prefix, "run_2/music");
  });

  // THE DECODE TIER SURFACE (audit 014 C3) + THE STEP TIER SURFACE
  // (audit 014 C4): the card serves the toggle and the tier's
  // default — absence rides the derivation, never a second literal.
  it("unstated tiled_decode decodes plain at a short track (the derivation owns the absent seat)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "funk, pop" }), music3, g, "r_plain");
    const graph = g.toJSON();
    assert.ok(graph["VAEDecodeAudio.0"], "the short unstated compose decodes plain");
    assert.ok(!graph["VAEDecodeAudioTiled.0"], "no tiled node rides the roomy default");
  });

  it("a stated tiled_decode=true tiles with the template's seats", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "funk, pop", tiled_decode: true }), music3, g, "r_tiled");
    const graph = g.toJSON();
    assert.ok(!graph["VAEDecodeAudio.0"], "the stated knob replaces the plain decode");
    assert.deepEqual(
      { tile_size: graph["VAEDecodeAudioTiled.0"].inputs.tile_size, overlap: graph["VAEDecodeAudioTiled.0"].inputs.overlap },
      { tile_size: 1536, overlap: 64 },
      "the card-served knob lands the template's own seats");
  });

  it("unstated at a full-length track tiles (the card passes the duration cap through)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "funk, pop", duration: 360 }), music3, g, "r_long");
    assert.ok(g.toJSON()["VAEDecodeAudioTiled.0"], "a 360 s card compose tiles without a stated knob");
  });

  it("the unstated steps is the full tier's default (the card derives it from tier.ts — one home)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "funk, pop" }), music3, g, "r_steps");
    assert.equal(g.toJSON()["KSampler.0"].inputs.steps, 30,
      "the fresh doc samples the checkpoint tier's default, never a card-literal twin");
  });
});

describe("the yue2 lane (YuE2-3B boarding — style + lyrics with ABC planning, 2026-09-20)", () => {
  it("the yue2 facts row serves, the card boards it, and the rail resolves the checkpoint lane_inputs", () => {
    const yue2 = facts.models.yue2!;
    assert.ok(yue2, "the yue2 facts row serves");
    assert.equal(yue2.card, "music");
    assert.ok((def.boarded ?? []).includes("yue2"), "the music card boards yue2");
    assert.equal(yue2.lane_inputs.checkpoint, "yue2_3b_int8_convrot.safetensors");
  });

  it("composes the checkpoint lane: ONE file carries model+clip+vae; ABC plans; GenerateMusic conditions; dpm_2/sgm_uniform at cfg 1", () => {
    const yue2 = facts.models.yue2!;
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "English, warm female vocal, indie pop, 96 BPM", lyrics: "[Verse]..." }), yue2, g, "run_y");
    const graph = g.toJSON();
    const ckpt = graph["CheckpointLoaderSimple.0"];
    assert.ok(ckpt, "the single-checkpoint loader rides");
    assert.equal(ckpt.inputs.ckpt_name, "yue2_3b_int8_convrot.safetensors");
    const abc = graph["YuE2GenerateABC.0"];
    assert.ok(abc, "the ABC planner rides (mode full default)");
    assert.equal(abc.inputs.style, "English, warm female vocal, indie pop, 96 BPM");
    assert.equal(abc.inputs.lyrics, "[Verse]...");
    const music = graph["YuE2GenerateMusic.0"];
    assert.ok(music, "the music conditioner rides");
    assert.equal(music.inputs.mode, "full");
    assert.equal(music.inputs.max_duration, 30, "the card duration rides as max_duration (schema default filled)");
    assert.ok(graph["EmptyYuE2LatentAudio.0"], "the yue2 latent rides (sized by the conditioner's seconds)");
    assert.ok(!graph["UNETLoader.0"] && !graph["MiniMaxMusic3TextEncode.0"], "the music3 loaders stay on their own lane");
    const ks = graph["KSampler.0"];
    assert.ok(ks, "the sampler rides");
    assert.equal(ks.inputs.sampler_name, "dpm_2", "the template's sampler");
    assert.equal(ks.inputs.scheduler, "sgm_uniform", "the template's scheduler");
    assert.equal(ks.inputs.cfg, 1, "guidance lives on the AR side, not the sampler — cfg 1");
    assert.ok(graph["VAEDecodeAudio.0"], "audio decode rides");
    assert.equal(graph["SaveAudioAdvanced.0"].inputs.filename_prefix, "run_y/music");
  });

  it("mode off omits the ABC planner (GenerateMusic rides empty abc → the engine's own off mode)", () => {
    const yue2 = facts.models.yue2!;
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "jazz trio, brushed drums", mode: "off" }), yue2, g, "run_o");
    const graph = g.toJSON();
    assert.ok(!graph["YuE2GenerateABC.0"], "no planner node when mode is off");
    assert.equal(graph["YuE2GenerateMusic.0"].inputs.abc, "");
  });

  it("mode melody plans melody-only (the cover-recommended plan)", () => {
    const yue2 = facts.models.yue2!;
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "lo-fi piano", mode: "melody" }), yue2, g, "run_me");
    assert.equal(g.toJSON()["YuE2GenerateABC.0"].inputs.mode, "melody");
    assert.equal(g.toJSON()["YuE2GenerateMusic.0"].inputs.mode, "melody");
  });

  it("an unknown mode refuses loud at the schema gate, never composes", () => {
    const yue2 = facts.models.yue2!;
    assert.throws(
      () => def.compose({ prompt: "x", mode: "jazzy" }, yue2, new GraphBuilder(), "r_mode"),
      /jazzy|mode|expected/i,
    );
  });

  it("the music3 lane is unchanged by the boarding (unet+clip+vae loaders still compose, no checkpoint node)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "funk" }), music3, g, "run_m");
    const graph = g.toJSON();
    assert.ok(graph["UNETLoader.0"] && graph["MiniMaxMusic3TextEncode.0"], "the music3 lane body stands");
    assert.ok(!graph["CheckpointLoaderSimple.0"], "no checkpoint node on the music3 lane");
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the music card serves: (1) the row's OWNING
// FAMILY holds an ACTION_BINDINGS row — no address silently rides
// the legacy lane while its siblings compose the declared segment;
// (2) the row composes ITS OWN declared segment — the song saves
// under the run-scoped prefix. The audio lane's graph is the
// accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "music");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(rows.length >= 2, `expected the served music addresses, found ${String(rows.length)}`);
  });

  for (const row of rows) {
    it(`address '${row.id}' (family '${row.family ?? row.id}') is bound and composes its own truth`, () => {
      // (1) THE BINDING: the owning family holds a row — a route id
      // keying nothing was the silent miss this wall exists to kill.
      assert.ok(
        (row.family ?? row.id) in ACTION_BINDINGS,
        `family '${row.family ?? row.id}' holds no ACTION_BINDINGS row — address '${row.id}' would silently ride the legacy lane`,
      );
      // (2) THE COMPOSE: the row's own declared segment.
      const g = new GraphBuilder();
      def.compose(def.schema({ prompt: "wall probe", lyrics: "[verse]wall" }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const save = Object.values(graph).find((n) => n.class_type === "SaveAudioAdvanced")!;
      assert.ok(save, "the declared segment saves the song");
      assert.equal(save.inputs.filename_prefix, `wall_${row.id}/music`, "compose stamps the run prefix");
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES on both data branches — the card never guesses a lane", () => {
    // A synthetic family-less row (no served facts row carries this
    // shape): the dispatch refuses loud rather than riding a legacy
    // lane in the open (the interlock) — on the music3 branch AND
    // the YuE2 latent branch alike.
    const row = { ...rows[0]!, id: "synthetic-music", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ prompt: "fallback probe" }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-music' on the music card — every boarded family \(music3, yue2\).*State params\.model \(one of the boarded families\)/,
    );
    const yue2Row = rows.find((r) => r.lane_inputs.latent_node === "EmptyYuE2LatentAudio") ?? rows[0]!;
    const fallen = { ...yue2Row, id: "synthetic-music-yue2", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ prompt: "fallback probe" }), fallen as never, new GraphBuilder(), "wall_fallback_yue2"),
      /no declared action for family 'synthetic-music-yue2' on the music card — every boarded family \(music3, yue2\)/,
    );
  });
});
