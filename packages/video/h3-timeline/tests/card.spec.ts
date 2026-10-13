// @melite/video-h3-timeline — the card's compose arms (TEST-2
// breadth, closing the branch debt census of 2026-09-19). The
// studio DOM specs own the doc/state planes; THIS file drives the
// module-private renderers (renderH3Film/renderH3Window) the only
// honest way they can be reached — through the registered card's
// compose door, GraphBuilder truth, real family facts.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs, resolveCardFlowOutputs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import { ACTION_BINDINGS } from "../src/card.ts";
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
  model = facts.models["h3"]!;
  assert.ok(model, "the h3 family facts row serves (survivor-id correction 2026-09-22: the checkpoint id, was h3-timeline)");
});

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

describe("the h3-timeline compose gate", () => {
  it("declares its JSON array contract and refuses non-array containers", () => {
    assert.deepEqual(def.flowOutputBindings, [{ channel: "default", node: "*", nodeClass: "SaveVideo" }]);
    assert.deepEqual(def.jsonArrayParams, ["calls", "audio_clips"]);
    assert.throws(() => def.schema({ calls: '{"text":"not an array"}' }), /calls must be an array/);
    assert.throws(() => def.schema({ calls: [{ text: "ok", start_frame: 0, end_frame: 56 }], audio_clips: '{"src":"line.flac"}' }), /audio_clips must be an array/);
  });

  it("binds the final film SaveVideo as the declared video output", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      length: 124,
    }), model, g, "run_output_binding");
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const flow = resolveCardFlowOutputs(def, {}, graph);
    assert.deepEqual(flow.outputs, { default: "video" });
    const node = graph[flow.outputNodes.default!]!;
    assert.equal(node.class_type, "SaveVideo");
    assert.equal(node.inputs.filename_prefix, "h3_t4_film");
  });

  it("a fresh press (params {}) composes the card's own one-shot document", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({}), model, g, "run_fresh");
    const out = g.toJSON() as Record<string, { class_type: string }>;
    assert.ok(Object.keys(out).length > 0, "the fresh-card document composes real nodes");
  });

  it("M5: the fresh-card admission — a blank prompt renders EMPTY conditioning, never an error", () => {
    // the fallback audit's M5 verdict, pinned: `p.prompt ?? ''` at
    // the window render is the deliberate fresh-card admission (the
    // operator's 2026-09-17 fresh-press law), NOT a fallback crime.
    // The asymmetry with films is the law: a FILM's textless call
    // refuses (card-gap.spec pins it); the one-window shape's text
    // owner is p.prompt itself, and absent = empty conditioning.
    const g = new GraphBuilder();
    def.compose(def.schema({ calls: [{ start_frame: 0, end_frame: 90 }] }), model, g, "run_textless_single");
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.keys(out).length > 0, "the textless single-call window composes (the admission)");
    const carriers = Object.values(out).filter((n) => n.inputs["prompt"] !== undefined);
    assert.ok(carriers.length > 0, "the graph carries a prompt input");
    for (const n of carriers) {
      assert.equal(n.inputs["prompt"], "", "absent prompt = empty conditioning — never coerced, never refused");
    }
  });

  it("one text call composes the film rail (t4_open derivation)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], length: 56 }),
      model, g, "run_open",
    );
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.ok(Object.values(out).length > 0, "the single-call film composes");
  });

  it("an image-anchored opener rides t4r (the marker node exists)", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT({ ref_image: "/m/ref.png" })], length: 56 }),
      model, g, "run_t4r",
    );
    const out = g.toJSON() as Record<string, { class_type: string }>;
    const classes = Object.values(out).map((n) => n.class_type);
    assert.ok(
      classes.some((c) => c.startsWith("MiniMaxH3")),
      "the image-anchored family marker composes",
    );
  });

  it("multiple calls chain (t4_chain): each call is a window on one rail", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
        length: 124,
      }),
      model, g, "run_chain",
    );
    const out = g.toJSON() as Record<string, unknown>;
    assert.ok(Object.keys(out).length > 0, "the chain composes");
  });

  it("THE SECOND-PASS MASTER (2026-09-22, operator: \"it is very unclear if it is on or off\"): off renders the plain pass even when leaves are set; on arms the chain", () => {
    const leaves = { sharpen_enabled: true, interpolate_enabled: true, sr_switch: true } as Record<string, unknown>;
    const switchesOf = (master: boolean) => {
      const g = new GraphBuilder();
      def.compose(def.schema({ calls: [SHOT()], length: 56, second_pass_enabled: master, ...leaves }), model, g, `run_master_${master}`);
      const out = Object.entries(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>)
        .filter(([, n]) => n.class_type === "ComfySwitchNode") as [string, { class_type: string; inputs: Record<string, unknown> }][];
      return new Map(out.map(([id, n]) => [id, n.inputs["switch"] === true]));
    };
    const off = switchesOf(false);
    const on = switchesOf(true);
    // the master flips EXACTLY the post trio (sharpen/interp/VSR) —
    // every other switch (the r2vBool lane pick, etc.) is untouched
    const flipped = [...off.keys()].filter((id) => off.get(id) === false && on.get(id) === true);
    assert.equal(flipped.length, 3, "master on arms exactly the three post switches");
    for (const id of off.keys()) {
      if (!flipped.includes(id)) assert.equal(on.get(id), off.get(id), `non-post switch ${id} is master-blind`);
    }
    // master off: legacy leaves cannot force a pass
    for (const id of flipped) assert.equal(off.get(id), false, "master off routes the plain path for every post switch");
  });

  it("explicitly-set sharpen leaves ride; absent leaves never patch", () => {
    const g = new GraphBuilder();
    def.compose(
      def.schema({ calls: [SHOT()], length: 56, second_pass_enabled: true, sharpen_enabled: true, sharpen_strength: 0.3 }),
      model, g, "run_sharp",
    );
    const out = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const sharpen = Object.values(out).find((n) => n.class_type === "ImageSharpenKJ");
    assert.ok(sharpen, "sharpen_enabled composes the RCAS node");
    const grouped = sharpen.inputs["method"] as Record<string, unknown>;
    assert.equal(grouped["strength"], 0.3, "the explicit leaf patches the grouped dict");
  });

  it("schema: variant derivation voices every family arm", () => {
    assert.equal(def.schema({}).variant, "t4_open");
    assert.equal(def.schema({ calls: [SHOT({ ref_image: "/m/r.png" })] }).variant, "t4r");
    const chained = def.schema({
      calls: [SHOT(), SHOT({ start_frame: 56, end_frame: 124 })],
    });
    assert.ok(["t4_chain", "t4r"].includes(String(chained.variant)), "chains derive a family");
  });

  it("THE FILM TAIL, FILE FORM (§20's amendment, 2026-09-22 — the operator's provenance law; the valve's second arm, 2026-09-24; GAP 1 CLOSED same night — the clips arm emits the film mp4): every multi-window film emits windows + MeliteUnload boundaries (orders the saves, flushes the allocator, KEEPS the weights); clips-free films assemble in-graph (MeliteConcatVideos → SaveVideo h3_t4_film), clips-carrying films compose audio post-generation (MeliteFilmAudioMix → SaveAudio h3_t4_film_audio) AND emit the same file-tail video join with the mixed audio wired in; no accumulation node exists (each window's tensors die at its own SaveVideo)", () => {
    const nodeRows = (params: Record<string, unknown>) => {
      const g = new GraphBuilder();
      def.compose(def.schema(params), model, g, "run_valve");
      return Object.entries(g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>);
    };
    const savePrefixes = (rows: [string, { class_type: string; inputs: Record<string, unknown> }][]) =>
      rows.filter(([, n]) => n.class_type === "SaveVideo").map(([, n]) => String(n.inputs["filename_prefix"]));
    const byClass = (rows: [string, { class_type: string; inputs: Record<string, unknown> }][], cls: string) =>
      rows.filter(([, n]) => n.class_type === cls);
    const windowsDoc = {
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      length: 124,
    };
    // 1. the plain multi-window film: windows save, THEN the file
    //    tail assembles — boundary → concat → film save
    const openRows = nodeRows(windowsDoc);
    assert.ok(savePrefixes(openRows).includes("h3_t4_film"), "the film saves in-graph (the file tail)");
    assert.deepEqual(
      savePrefixes(openRows).filter((p) => p.startsWith("h3_t4_w")).sort(),
      ["h3_t4_w1", "h3_t4_w2"],
      "both windows save their own files",
    );
    const unloads = byClass(openRows, "MeliteUnload");
    assert.equal(unloads.length, 2, "one boundary PER window save — the chain orders every save (2026-09-23: the single last-save boundary left cut windows' saves unordered islands)");
    for (const [, n] of unloads) {
      assert.equal(n.inputs["unload_models"], false, "every boundary keeps weights resident (the reload law)");
    }
    // THE ORDERING CHAIN LAW: every window save feeds its OWN boundary,
    // boundaries token-chain through the optional 'after' input, and the
    // loader's 'after' is the chain's end — no save is an unordered island
    const byId = new Map(openRows);
    const windowSaveIds = new Set(
      openRows
        .filter(([, n]) => n.class_type === "SaveVideo" && String(n.inputs["filename_prefix"]).startsWith("h3_t4_w"))
        .map(([id]) => id),
    );
    const boundaryVideoSrcs = unloads.map(([, n]) => (n.inputs["video"] as [string, number])[0]);
    for (const src of boundaryVideoSrcs) assert.ok(windowSaveIds.has(src), `each boundary eats a window save (${src})`);
    assert.equal(new Set(boundaryVideoSrcs).size, boundaryVideoSrcs.length, "each boundary eats its OWN window's save — one per save, none orphaned");
    const afterSrc = (n: { class_type: string; inputs: Record<string, unknown> }): string | undefined =>
      (n.inputs["after"] as [string, number] | undefined)?.[0];
    assert.equal(unloads.filter(([, n]) => afterSrc(n) === undefined).length, 1, "exactly one chain head (the first boundary)");
    const concats = byClass(openRows, "MeliteConcatVideos");
    assert.equal(concats.length, 1, "exactly one file loader");
    const chainEnd = (concats[0]![1].inputs["after"] as [string, number])[0];
    let walked = 0;
    let cursor: string | undefined = chainEnd;
    while (cursor !== undefined) {
      const node = byId.get(cursor) as { class_type: string; inputs: Record<string, unknown> };
      assert.equal(node.class_type, "MeliteUnload", "the chain links only boundaries");
      walked += 1;
      cursor = afterSrc(node);
    }
    assert.equal(walked, unloads.length, "the chain threads EVERY boundary — the loader provably waits for all saves");
    assert.equal(concats[0]![1].inputs["videos"], "h3_t4_w1,h3_t4_w2", "the loader names the window files in film order");
    assert.ok(
      !openRows.some(([, n]) => n.class_type === "MiniMaxH3FiniteSegmentFinalize" && "accumulated_images" in n.inputs),
      "no accumulation node — nothing holds window 1's tensors while window 2 samples (a per-window finalize without accumulated_images may remain — that one is window-local)",
    );
    // 2. positioned clips: the film takes the valve's second arm
    //    (2026-09-24, the VRAM-leak fix — operator law: WE USE
    //    COMFYUI, NEVER FFMPEG for the mix; GAP 1 CLOSED same night
    //    — the arm delivers the film mp4): windows still save +
    //    free per-window behind the chained boundaries, and ONE
    //    post-generation MeliteFilmAudioMix composes the film's
    //    audio — no in-graph AUDIO stitch (duck/mix/delay); the
    //    file-tail video join rides with the MIXED audio wired into
    //    CreateVideo → SaveVideo h3_t4_film; SaveAudio emits the stem.
    const closedRows = nodeRows({
      ...windowsDoc,
      audio_clips: [{ src: "/assets/line.flac", start_frame: 10, dur_frames: 40, text: "hello" }],
    });
    assert.ok(
      savePrefixes(closedRows).includes("h3_t4_film"),
      "the clips arm delivers the film mp4 (GAP 1 — same file-tail join, mixed audio wired in)",
    );
    assert.equal(byClass(closedRows, "MeliteConcatVideos").length, 1, "exactly one file-tail video join for clips docs");
    assert.equal(byClass(closedRows, "MeliteAudioDuck").length, 0, "no in-graph duck for clips docs");
    assert.equal(byClass(closedRows, "MeliteAudioMix").length, 0, "no in-graph mix for clips docs");
    assert.equal(byClass(closedRows, "MeliteUnload").length, 2, "windows still free per-window behind the chained boundaries");
    const filmMix = byClass(closedRows, "MeliteFilmAudioMix");
    assert.equal(filmMix.length, 1, "one post-generation mix node");
    assert.equal(filmMix[0]![1].inputs["videos"], "h3_t4_w1,h3_t4_w2", "the mix names the window files in film order");
    const audioSaves = byClass(closedRows, "SaveAudio");
    assert.equal(audioSaves.length, 1, "one film-audio save");
    assert.equal(audioSaves[0]![1].inputs["filename_prefix"], "h3_t4_film_audio", "under the film-audio name");
    assert.ok(
      !closedRows.some(([, n]) => n.class_type === "MiniMaxH3FiniteSegmentFinalize" && "accumulated_images" in n.inputs),
      "no film accumulation composes for positioned clips either",
    );
    // 3. single window, nothing to mix: the FROZEN shape — the
    //    dispatch keeps single-call docs byte-identical (one window
    //    artifact, no film nodes, no decode round)
    const singleRows = nodeRows({ calls: [SHOT()], length: 56 });
    assert.deepEqual(savePrefixes(singleRows), ["h3_t4_w1"], "a single-window doc saves exactly one window file — the film tail is a multi-call property");
    assert.equal(byClass(singleRows, "MeliteConcatVideos").length, 0, "no decode round for a lone window");
    assert.equal(byClass(singleRows, "MeliteUnload").length, 0, "no boundary needed — nothing to order");
  });

  it("THE ONE-MODEL LAW (roadmap §8): the card boards ONE family; the dead families' addresses ride the tool enum as variant routes", async () => {
    const { BOARDED, VARIANT_ADDRESSES } = await import("../src/card.ts");
    assert.deepEqual(BOARDED, ["h3"], "one H3 row in the Model dropdown — the checkpoint id, never a lane (survivor-id correction 2026-09-22: anima isn't anima-generate)");
    assert.deepEqual(
      [...VARIANT_ADDRESSES].sort(),
      ["h3-fl2va", "h3-keyframe", "h3-ref2va", "h3-timeline", "h3-timeline-ref"],
      "every historical address stays agent-reachable (the pre-correction family id h3-timeline rides as the timeline lane's route; h3-fl2va replaces the dead-family route h3)",
    );
  });
});

// THE EVERY-ADDRESS WALL (stroke E — the atom vocabulary's video
// leg): every served address on this card resolves through the ONE
// h3 family, so every row composes through the family's declared
// film action (the binding keys on the family id, never the address
// id); a family-less row has NO fallback — the legacy else body is
// deleted (the action oracle's own law), so the wall proves the
// ROUTING here: every bound row saves through the family action,
// and the interlock below proves the family-less row REFUSES at
// the dispatch instead of composing anything.
describe("THE EVERY-ADDRESS WALL — every served address composes through the family action", () => {
  const rows = Object.values(facts.models).filter((m) => m.card === "h3-timeline");

  it("the card serves its variant addresses (the wall's own footing)", () => {
    assert.ok(rows.length >= 3, `expected the served h3-timeline addresses, found ${String(rows.length)}`);
  });

  for (const row of rows) {
    const fam = row.family ?? row.id;
    it(`address '${row.id}' (family '${fam}') is bound to the film action and composes`, () => {
      assert.strictEqual(fam, "h3", "every variant address folds to the ONE h3 family (the survivor-id law)");
      assert.ok("h3" in ACTION_BINDINGS, "the h3 family holds the ACTION_BINDINGS row");
      const g = new GraphBuilder();
      def.compose(def.schema({ calls: [SHOT()], length: 56 }), row, g, `wall_${row.id}`);
      const graph = g.toJSON() as Record<string, { class_type: string }>;
      assert.ok(
        Object.values(graph).some((n) => n.class_type === "SaveVideo"),
        `address '${row.id}' composes a saving graph through the family action`,
      );
    });
  }

  it("THE DECLARED FALLBACK: a family-less row REFUSES at the dispatch (the interlock)", () => {
    const row = { ...structuredClone(rows[0]!), id: "legacy-h3", family: undefined };
    assert.throws(
      () => def.compose(def.schema({ calls: [SHOT()], length: 56 }), row as never, new GraphBuilder(), "wall_fallback"),
      /no declared action for family 'legacy-h3' on the h3-timeline card — every boarded family \(h3\)/,
    );
  });
});
