// @melite/video-video-gen — the card's compose gate (TEST-2
// breadth, 2026-09-12). TWO families ride the card (wan-vace the
// reference-image restyle; scail2-animate the pose-driven
// animation) — each family's required-path admission is its OWN
// (VIDEO_REQUIRED_PATHS), the negative falls back to the kit's
// real-negative law.
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { VIDEO_NEGATIVE_FALLBACK } from "@melite/comfyui-card-kit";
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

let def: CardDefinition;
let wan: ModelFacts;
let scail: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("video-gen")!;
  assert.ok(def, "the composition root serves the video-gen card");
  wan = facts.models["wan-vace"]!;
  scail = facts.models["scail2-animate"]!;
  assert.ok(wan && scail, "both family facts rows serve");
});

describe("the video-gen compose gate", () => {
  it("a missing prompt refuses loud on either family (what MOVES)", () => {
    assert.throws(
      () => def.compose(def.schema({}), wan, new GraphBuilder(), "r1"),
      /required param 'prompt' missing or empty on the wan-vace video card/,
    );
  });

  it("wan-vace requires its reference_image (the family's own lane)", () => {
    assert.throws(
      () => def.compose(def.schema({ prompt: "runs" }), wan, new GraphBuilder(), "r1"),
      /required param 'reference_image' missing on the wan-vace lane/,
    );
  });

  it("scail2 requires reference_image AND pose_video (two lanes)", () => {
    assert.throws(
      () => def.compose(def.schema({ prompt: "runs" }), scail, new GraphBuilder(), "r1"),
      /required param 'reference_image' missing on the scail2-animate lane/,
    );
    assert.throws(
      () => def.compose(def.schema({ prompt: "runs", reference_image: "/m/ref.png" }), scail, new GraphBuilder(), "r1"),
      /required param 'pose_video' missing on the scail2-animate lane/,
    );
  });

  it("the wan-vace happy lane (restores the reference, lightning lora)", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({ prompt: "runs through the market", reference_image: "/m/ref.png" }), wan, g, "run_1");
    const graph = g.toJSON();
    assert.equal(graph["CLIPTextEncode.0"].inputs.text, "runs through the market");
    // the negative falls back to the kit's REAL negative (empty text
    // hits the fp8 path server-side — the video-gen law).
    assert.equal(graph["CLIPTextEncode.1"].inputs.text, VIDEO_NEGATIVE_FALLBACK);
    assert.equal(graph["LoadImage.0"].inputs.image, "/m/ref.png");
    assert.ok(graph["LoraLoaderModelOnly.0"], "the lightning lora rides");
    assert.ok(graph["ModelSamplingSD3.0"], "the flow-shift rides");
  });

  it("an EXPLICIT negative rides verbatim (no fallback)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "runs", reference_image: "/m/ref.png", negative_prompt: "blurry" }),
      wan, g, "run_2",
    );
    assert.equal(g.toJSON()["CLIPTextEncode.1"].inputs.text, "blurry");
  });

  it("the scail2 happy lane (pose-driven animation)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ prompt: "dances", reference_image: "/m/char.png", pose_video: "/m/pose.mp4" }),
      scail, g, "run_3",
    );
    const graph = g.toJSON();
    assert.equal(graph["CLIPTextEncode.0"].inputs.text, "dances");
    assert.ok(graph["UNETLoader.0"], "the family checkpoint loads");
    assert.ok(graph["VAELoader.0"], "the family vae loads");
  });
});

describe("the unknown-family default admission (VIDEO_REQUIRED_PATHS fallback)", () => {
  it("a family with no row admits the BOTH-PATHS default", () => {
    const stranger = { ...wan, id: "stranger-video" } as typeof wan;
    assert.throws(
      () => def.compose(def.schema({ prompt: "runs" }), stranger, new GraphBuilder(), "r1"),
      /required param 'reference_image' missing on the stranger-video lane/,
    );
    assert.throws(
      () => def.compose(def.schema({ prompt: "runs", reference_image: "/m/r.png" }), stranger, new GraphBuilder(), "r1"),
      /required param 'pose_video' missing on the stranger-video lane/,
    );
  });
});
