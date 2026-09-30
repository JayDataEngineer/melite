// @melite/video-h3-timeline — the interlock oracle (the atom
// vocabulary's video leg, closed): the h3 family's declared film
// action — resolved off the DECL at boarding — is the ONLY compose
// arm. The stroke-E byte-oracle proved the port lost nothing
// against the card's legacy lane body; that body is deleted, and
// this oracle owns what survives it: every shape composes through
// the bound action, the refusals keep their words, seed -1 mints
// client-side, and a family the card boards but does not bind
// REFUSES at the dispatch — never a legacy fallback.
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
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let h3: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  h3 = facts.models["h3"]!;
  assert.ok(h3, "the h3 family row serves");
  assert.strictEqual(h3.family, "h3", "the row carries the family id the binding keys on");
});

/** Compose the doc through the bound family action and return the
 *  graph (the doc mutation forces a fresh clone per call). */
function oneWay(doc: Record<string, unknown>): Record<string, { class_type?: string; inputs?: Record<string, unknown> }> {
  const g = new GraphBuilder();
  def.compose(def.schema(structuredClone(doc)), h3, g, "oracle");
  return g.toJSON() as never;
}

/** The bound action must refuse with its own words (a refusal is
 *  behavior too — the family action may not soften or reword it).
 *  The schema gate runs before the dispatch seam, so the walk
 *  succeeds first and the refusal compared here is the action's
 *  own. */
function refuses(doc: Record<string, unknown>): string {
  const gated = def.schema(doc) as Record<string, unknown>;
  try {
    def.compose(structuredClone(gated) as never, h3, new GraphBuilder(), "oracle");
  } catch (e) {
    return (e as Error).message;
  }
  assert.fail("the doc composed — expected the family action's refusal");
}

/** the estate's own shot-row shape (card.spec's SHOT): the calls
 *  vocabulary the schema's CALL_KEYS gate admits. */
const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

describe("the h3 film action oracle (the interlock)", () => {
  it("a frozen single-window doc (t4_open) composes through the declared action", () => {
    const graph = oneWay({ prompt: "a lantern pushes off through the rain", width: 768, height: 448, length: 56 });
    const nodes = Object.values(graph);
    assert.ok(nodes.some((n) => n.class_type === "MiniMaxH3ReferenceToVideo"), "the r2v lane composes (r2v is the only lane)");
    assert.ok(nodes.some((n) => n.class_type === "SaveVideo"), "the window saves");
    assert.ok(nodes.some((n) => n.class_type === "SeedVR2VideoUpscaler"), "the film tail's upscale rides");
  });

  it("a t4r reference window (guide + refs) composes through the declared action", () => {
    const graph = oneWay({
      prompt: "the courier turns to face the camera",
      variant: "t4r",
      image: "/bench/guide.png",
      ref_images: ["/bench/ref_a.png", "/bench/ref_b.png"],
      length: 56,
    });
    const nodes = Object.values(graph);
    assert.ok(nodes.some((n) => n.class_type === "MiniMaxH3ImageToVideo"), "the t4r family marker rides the graph");
    assert.ok(nodes.some((n) => n.class_type === "LoadImage"), "the guide image loads");
  });

  it("a merged two-window film (the film path) composes through the declared action", () => {
    const graph = oneWay({
      calls: [
        SHOT(),
        SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 }),
      ],
      length: 124,
    });
    assert.ok(Object.keys(graph).some((id) => id.startsWith("window1_")), "the film scopes per-window");
    assert.ok(Object.keys(graph).some((id) => id.startsWith("window2_")), "both windows ride the merged film");
    assert.ok(Object.values(graph).some((n) => n.class_type === "MeliteConcatVideos"), "the film tail stitches");
  });

  it("a film with audio clips (the MeliteFilmAudioMix arm) composes through the declared action", () => {
    const graph = oneWay({
      calls: [SHOT(), SHOT({ start_frame: 56, end_frame: 124 })],
      length: 124,
      audio_clips: [{ src: "/bench/line.mp3", start_frame: 24, dur_sec: 2, class: "dialogue" }],
    });
    assert.ok(
      Object.values(graph).some((n) => n.class_type === "MeliteFilmAudioMix"),
      "the audio-mix arm composes",
    );
  });

  it("the single-call lift composes through the declared action", () => {
    const graph = oneWay({
      calls: [SHOT({ text: "one lifted window", image: "/bench/first.png", knobs: { width: 768, height: 448 } })],
      length: 56,
    });
    const nodes = Object.values(graph);
    assert.ok(nodes.some((n) => n.class_type === "MiniMaxH3ReferenceToVideo"), "the lifted window composes the single-window shape");
    assert.ok(nodes.some((n) => n.class_type === "SaveVideo"), "the lifted window saves");
  });

  it("the lora-steps arm (single window + a steps-carrying lora bag) composes through the declared action", () => {
    const graph = oneWay({
      prompt: "the drone shot holds on the bridge",
      loras: [{ on: true, lora: "h3/distill_v4.safetensors", str: 0.6, steps: 8 }],
      length: 56,
    });
    assert.ok(
      Object.values(graph).some((n) => n.class_type === "LTX_lora_loader"),
      "the lora bag rides the film's lora loader",
    );
  });

  it("seed -1 mints client-side (GATE S) — the raw -1 never reaches the wire", () => {
    const graph = oneWay({ calls: [SHOT()], length: 56, seed: -1 });
    const seeds: unknown[] = [];
    for (const node of Object.values(graph)) {
      for (const key of ["seed", "noise_seed"] as const) {
        if (node.inputs && key in node.inputs) seeds.push(node.inputs[key]);
      }
    }
    assert.equal(seeds.filter((s) => s === -1).length, 0, `no raw -1 rides the wire (got ${JSON.stringify(seeds)})`);
    const minted = seeds.filter((s) => s !== 42);
    assert.equal(minted.length, 1, `exactly one minted seed (got ${JSON.stringify(seeds)})`);
    assert.ok(typeof minted[0] === "number" && Number.isInteger(minted[0]!) && minted[0]! >= 0, "a real minted int");
  });

  it("the clips law refuses on a single-window doc", () => {
    const msg = refuses({
      calls: [SHOT()],
      k: 1,
      length: 56,
      audio_clips: [{ src: "/bench/vocal.mp3", start_frame: 12, dur_sec: 1.5, class: "dialogue" }],
    });
    assert.match(msg, /audio clips ride the FILM path/);
  });

  it("the guideless t4r window (no refs, no anchor) refuses", () => {
    const msg = refuses({ prompt: "an anchored window with no anchor", variant: "t4r", length: 56 } as Record<string, unknown>);
    assert.match(msg, /without a staged guide image/);
  });

  it("THE INTERLOCK: a family the card boards but does not bind REFUSES at the dispatch", () => {
    const row = { ...structuredClone(h3), id: "legacy-else", family: undefined } as ModelFacts;
    assert.throws(
      () => def.compose(def.schema({ prompt: "a probe", length: 56 }), row, new GraphBuilder(), "oracle"),
      /no declared action for family 'legacy-else' on the h3-timeline card — every boarded family \(h3\)/,
    );
  });
});
