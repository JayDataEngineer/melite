// @melite/audio-sfx — the card's compose gate (TEST-2 breadth,
// 2026-09-12). Admission: describe the SOUND, not the scene; the
// lane rides the kit against the REAL moss-sfx facts row.
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
let moss: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("sfx")!;
  assert.ok(def, "the composition root serves the sfx card");
  moss = facts.models["moss-sfx"]!;
  assert.ok(moss, "the moss-sfx facts row serves");
});

describe("the sfx compose gate", () => {
  it("a missing prompt refuses loud (describe the SOUND)", () => {
    assert.throws(
      () => def.compose(def.schema({}), moss, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the sfx card/,
    );
  });

  it("THE SCHEMA GATE: an out-of-envelope duration refuses loud (declared 0.5–300), never composes", () => {
    assert.throws(
      () => def.compose({ prompt: "clang", duration: 9999 }, moss, new GraphBuilder(), "r_oob"),
      /duration|9999|between|range/i,
    );
  });

  it("the happy lane synthesizes the effect", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "sword unsheathe, metallic ring" }), moss, g, "run_6");
    const graph = g.toJSON();
    const synth = graph["AudiocoreTTS.0"];
    assert.ok(synth, "the Audiocore synth rides");
    assert.equal(synth.inputs.prompt, "sword unsheathe, metallic ring");
    assert.equal(synth.inputs.mode, "tts", "the sfx lane's own mode");
    assert.equal(graph["SaveAudio.0"].inputs.filename_prefix, "run_6/sfx");
  });

  it("UPSTREAM 1:1 DEFAULTS — the card carries MOSS-SFX-v2's pipeline point (100 steps, cfg 4.0)", () => {
    // defect b (2026-09-23): upstream pipeline_moss_soundeffect.py
    // declares num_inference_steps=100 / cfg_scale=4.0; the card
    // shipped the INNER wan_audio layer's 50/5.0 — half budget,
    // over-guided. The schema's defaults ARE the quality point the
    // operator gets on a bare Run press; pin them to upstream.
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "thunder crack" }), moss, g, "run_up1");
    const synth = g.toJSON()["AudiocoreTTS.0"];
    assert.equal(synth.inputs.num_inference_steps, 100,
      "upstream pipeline default (100), not the wan_audio layer floor (50)");
    assert.equal(synth.inputs.guidance_scale, 4.0,
      "upstream pipeline default (4.0), not the wan_audio layer default (5.0)");
  });
});

// ── THE EVERY-ADDRESS WALL (the atom vocabulary, stroke 3): for
// EVERY facts row the sfx card serves: (1) the row's OWNING FAMILY
// holds an ACTION_BINDINGS row — no address silently rides the
// legacy lane while its siblings compose the declared segment; (2)
// the row composes ITS OWN declared segment — the effect saves
// under the run-scoped prefix. The audio lane's graph is the
// accused.
describe("THE EVERY-ADDRESS WALL — every served address composes its own declared segment", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "sfx");

  it("the card serves every boarded family (the wall's own footing)", () => {
    assert.ok(rows.length >= 1, `expected the served sfx addresses, found ${String(rows.length)}`);
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
      def.compose(def.schema({ prompt: "sharp metallic clang" }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const save = Object.values(graph).find((n) => n.class_type === "SaveAudio")!;
      assert.ok(save, "the declared segment saves the effect");
      assert.equal(save.inputs.filename_prefix, `wall_${row.id}/sfx`, "compose stamps the run prefix");
    });
  }

  it("THE DECLARED FALLBACK: a row with no owning family REFUSES — the card never guesses a lane", () => {
    // A synthetic family-less row (no served facts row carries this
    // shape): the dispatch refuses loud rather than riding a legacy
    // lane in the open (the interlock).
    const row = { ...rows[0]!, id: "synthetic-sfx", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ prompt: "fallback probe" }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'synthetic-sfx' on the sfx card — every boarded family \(moss-sfx\)/,
    );
  });
});
