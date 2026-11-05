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
import { deriveWindowFamily } from "@melite/models-h3/timelineContract";
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
    // THE SWAP-PARITY GATE (friction-report #1): the film door
    // answers only when the replace arm is empty; the armed swap
    // answers MiniMaxH3ChainAssemble (the swap terminal,
    // copy_to_output true). An unconditional SaveVideo pin here let
    // the estate refuse every swap with `expects * as SaveVideo,
    // got missing`.
    const bindings = [...(def.flowOutputBindings ?? [])];
    // FIVE conditional doors (the extend arm's law, 2026-11-12; the
    // refine arm, 2026-10-29; the upscale arm, F19 2026-11-12): film
    // (SaveVideo, the graph terminal) vs swap/repair
    // (MiniMaxH3ChainAssemble) vs extend (the joined-film SaveVideo —
    // no ChainAssemble: its `_final.mp4` name is not a prefix the
    // concat can glob) vs refine (the second-pass SaveVideo) vs
    // upscale (the deferred loop's ChainAssemble at <runId>/upscale).
    assert.equal(bindings.length, 5, "five conditional doors: film vs swap/repair vs extend vs refine vs upscale");
    const film = bindings.find((b) => b.nodeClass === "SaveVideo" && b.when!({}));
    const swap = bindings.find((b) => b.nodeClass === "MiniMaxH3ChainAssemble" && b.when!({ replace: [{ source_clip: "c" }] }));
    const extend = bindings.find((b) => b.nodeClass === "SaveVideo" && b.when!({ extend: [{ source_clip: "c" }] }));
    const refine = bindings.find((b) => b.nodeClass === "SaveVideo" && b.when!({ refine: [{ source_clip: "c" }] }));
    const upscale = bindings.find((b) => b.nodeClass === "MiniMaxH3ChainAssemble" && b.when!({ upscale: [{ chain_run: "r" }] }));
    assert.ok(film?.when, "the film door is conditional");
    assert.ok(swap?.when, "the swap door is conditional");
    assert.ok(extend?.when, "the extend door is conditional");
    assert.ok(refine?.when, "the refine door is conditional");
    assert.ok(upscale?.when, "the upscale door is conditional");
    assert.equal(film.when!({}), true, "empty params ride the film door");
    assert.equal(film.when!({ replace: [{ source_clip: "c" }] }), false, "an armed bag leaves the film door");
    assert.equal(film.when!({ extend: [{ source_clip: "c" }] }), false, "an armed extend bag leaves the film door");
    assert.equal(film.when!({ refine: [{ source_clip: "c" }] }), false, "an armed refine bag leaves the film door");
    assert.equal(film.when!({ upscale: [{ chain_run: "r" }] }), false, "an armed upscale bag leaves the film door");
    assert.equal(swap.when!({}), false, "empty params leave the swap door");
    assert.equal(swap.when!({ replace: [{ source_clip: "c" }] }), true, "an armed bag rides the swap door");
    assert.equal(swap.when!({ extend: [{ source_clip: "c" }] }), false, "an armed extend bag never rides the swap door");
    assert.equal(swap.when!({ refine: [{ source_clip: "c" }] }), false, "an armed refine bag never rides the swap door");
    assert.equal(extend.when!({}), false, "empty params leave the extend door");
    assert.equal(extend.when!({ extend: [{ source_clip: "c" }] }), true, "an armed extend bag rides the extend door");
    assert.equal(extend.when!({ replace: [{ source_clip: "c" }] }), false, "an armed replace bag never rides the extend door");
    assert.equal(extend.when!({ refine: [{ source_clip: "c" }] }), false, "an armed refine bag never rides the extend door");
    assert.equal(refine.when!({}), false, "empty params leave the refine door");
    assert.equal(refine.when!({ refine: [{ source_clip: "c" }] }), true, "an armed refine bag rides the refine door");
    assert.equal(refine.when!({ replace: [{ source_clip: "c" }] }), false, "an armed replace bag never rides the refine door");
    assert.equal(refine.when!({ extend: [{ source_clip: "c" }] }), false, "an armed extend bag never rides the refine door");
    assert.equal(upscale.when!({}), false, "empty params leave the upscale door");
    assert.equal(upscale.when!({ upscale: [{ chain_run: "r" }] }), true, "an armed upscale bag rides the upscale door");
    assert.equal(upscale.when!({ replace: [{ source_clip: "c" }] }), false, "an armed replace bag never rides the upscale door (the two assemble doors are disjoint)");
    assert.equal(swap.when!({ upscale: [{ chain_run: "r" }] }), false, "an armed upscale bag never rides the swap door (the two assemble doors are disjoint)");
    // SLICE 1: keyframes joined the JSON row contract (the any-frame
    // pin bus) — the census grows WITH the behavior, and the new
    // container refusal is judged in the same arm.
    assert.deepEqual(def.jsonArrayParams, ["calls", "audio_clips", "keyframes"]);
    assert.throws(() => def.schema({ calls: '{"text":"not an array"}' }), /calls must be an array/);
    assert.throws(() => def.schema({ calls: [{ text: "ok", start_frame: 0, end_frame: 56 }], audio_clips: '{"src":"line.flac"}' }), /audio_clips must be an array/);
    assert.throws(() => def.schema({ keyframes: '{"image":"anchor.png","frame":0}' }), /keyframes must be an array of pin rows/);
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
    // F14 (2026-11-12): the film save rides the run scope —
    // `<runId>/h3_t4_film` — like every chain save, so the harvest
    // walks it run-scoped (the flat prefix was the outlier).
    assert.equal(node.inputs.filename_prefix, "run_output_binding/h3_t4_film");
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
    // (re-pin 2026-10-26, burn b — the graph-mirror law): the post
    // limbs mount IFF the master + their own leaf gate compose on;
    // the routing switches are gone — the master's verdict is the
    // limbs' PRESENCE, judged per class.
    const leaves = { sharpen_enabled: true, interpolate_enabled: true, sr_switch: true } as Record<string, unknown>;
    const limbsOf = (master: boolean) => {
      const g = new GraphBuilder();
      def.compose(def.schema({ calls: [SHOT()], length: 56, second_pass_enabled: master, ...leaves }), model, g, `run_master_${master}`);
      const out = Object.values(g.toJSON() as Record<string, { class_type: string }>);
      return new Set(["ImageSharpenKJ", "FrameInterpolate", "SeedVR2VideoUpscaler"].filter((cls) => out.some((n) => n.class_type === cls)));
    };
    const off = limbsOf(false);
    const on = limbsOf(true);
    // master on arms EXACTLY the post trio (sharpen/interp/VSR)
    assert.equal(on.size, 3, "master on mounts exactly the three post limbs");
    // master off: legacy leaves cannot force a pass — no limb at all
    assert.equal(off.size, 0, "master off composes NONE of the post limbs (legacy leaves cannot force a pass)");
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
    assert.equal(sharpen.inputs["method"], "rcas", "the default method rides the base wire");
    assert.equal(sharpen.inputs["method.strength"], 0.3, "the explicit leaf patches the dotted wire");
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
    assert.ok(savePrefixes(openRows).includes("run_valve/h3_t4_film"), "the film saves in-graph (the file tail)");
    assert.deepEqual(
      savePrefixes(openRows).filter((p) => /(?:^|[/_])h3_t4_w\d+$/.test(p)).sort(),
      ["run_valve/h3_t4_w1", "run_valve/h3_t4_w2"],
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
        .filter(([, n]) => n.class_type === "SaveVideo" && /(?:^|[/_])h3_t4_w\d+$/.test(String(n.inputs["filename_prefix"])))
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
    assert.equal(concats[0]![1].inputs["videos"], "run_valve/h3_t4_w1,run_valve/h3_t4_w2", "the loader names the window files in film order");
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
      savePrefixes(closedRows).includes("run_valve/h3_t4_film"),
      "the clips arm delivers the film mp4 (GAP 1 — same file-tail join, mixed audio wired in)",
    );
    assert.equal(byClass(closedRows, "MeliteConcatVideos").length, 1, "exactly one file-tail video join for clips docs");
    assert.equal(byClass(closedRows, "MeliteAudioDuck").length, 0, "no in-graph duck for clips docs");
    assert.equal(byClass(closedRows, "MeliteAudioMix").length, 0, "no in-graph mix for clips docs");
    assert.equal(byClass(closedRows, "MeliteUnload").length, 2, "windows still free per-window behind the chained boundaries");
    const filmMix = byClass(closedRows, "MeliteFilmAudioMix");
    assert.equal(filmMix.length, 1, "one post-generation mix node");
    assert.equal(filmMix[0]![1].inputs["videos"], "run_valve/h3_t4_w1,run_valve/h3_t4_w2", "the mix names the window files in film order");
    const audioSaves = byClass(closedRows, "SaveAudio");
    assert.equal(audioSaves.length, 1, "one film-audio save");
    assert.equal(audioSaves[0]![1].inputs["filename_prefix"], "run_valve/h3_t4_film_audio", "under the film-audio name");
    assert.ok(
      !closedRows.some(([, n]) => n.class_type === "MiniMaxH3FiniteSegmentFinalize" && "accumulated_images" in n.inputs),
      "no film accumulation composes for positioned clips either",
    );
    // 3. single window, nothing to mix: the FROZEN shape — the
    //    dispatch keeps single-call docs byte-identical (one window
    //    artifact, no film nodes, no decode round)
    const singleRows = nodeRows({ calls: [SHOT()], length: 56 });
    assert.deepEqual(savePrefixes(singleRows), ["run_valve/h3_t4_w1"], "a single-window doc saves exactly one window file — the film tail is a multi-call property");
    assert.equal(byClass(singleRows, "MeliteConcatVideos").length, 0, "no decode round for a lone window");
    assert.equal(byClass(singleRows, "MeliteUnload").length, 0, "no boundary needed — nothing to order");
  });

  it("THE ONE-MODEL LAW (roadmap §8): the card boards ONE family; the dead families' addresses ride the tool enum as variant routes", async () => {
    const { BOARDED, VARIANT_ADDRESSES } = await import("../src/card.ts");
    assert.deepEqual(BOARDED, ["h3"], "one H3 row in the Model dropdown — the checkpoint id, never a lane (survivor-id correction 2026-09-22: anima isn't anima-generate)");
    assert.deepEqual(VARIANT_ADDRESSES, ["h3-timeline", "h3-singularity"],
      "two checkpoint lanes, one card (the krea-2 raw-lane precedent, 2026-10-17): the folded single-shot/keyframe addresses stay retired with the recipe rework — old drafts naming them refuse LOUD at the run door",
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
    // TWO lanes since the Singularity checkpoint joined (2026-10-17;
    // the krea-2 raw-lane precedent — one card, one family, distinct
    // route addresses per lane): the served set is exactly
    // {h3, h3-singularity, h3-timeline} — still ≥1 so the loop below
    // proves routing, never zero-green.
    assert.ok(rows.length >= 1, `expected the served h3-timeline addresses, found ${String(rows.length)}`);
    assert.deepEqual(
      rows.map((r) => r.id).sort(),
      ["h3", "h3-singularity", "h3-timeline", "h3-timeline-convrot", "h3-timeline-pruned"],
      "the family head, its TWO checkpoint lanes, and the timeline's three-member quant-tier cell routes (2026-10-26 quant cure — the folded single-shot/keyframe addresses stay retired)",
    );
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

// ── THE LANE-LAW RETIREMENT (2026-11-15) ───────────────────────────
// The card's CardDefinition.admitFamily face (B5, the write doors'
// arm of the walk) is DELETED with the t4r dead-key set: the t4r
// render arm now mounts the post chain, so no finish key is
// lane-dead and there is nothing to refuse one hop early. The walk
// (def.schema) is the one truth these arms judge — the burn shape
// ADMITS with its stamps intact, on every derived lane.
describe("the family admission face is retired — the walk admits the finish keys", () => {
  const KEYFRAME_DOC = {
    keyframes: [{ image: "webp/run1/pin-0.png", frame: 0 }],
    steps: 20,
    loras: [],
  };

  it("the card declares no admitFamily face — no write-door dead-letter exists", () => {
    assert.equal(def.admitFamily, undefined);
  });

  it("the Final-Cut stamp on a keyframe doc walks and keeps its stamps", () => {
    const walked = def.schema!({ ...KEYFRAME_DOC, second_pass_enabled: true, sr_switch: true });
    assert.equal(deriveWindowFamily(walked as Record<string, unknown>), "t4r");
    assert.equal(walked.second_pass_enabled, true);
    assert.equal(walked.sr_switch, true);
  });

  it("the four-key finish doc walks (the exact refusal shape now admits)", () => {
    const walked = def.schema!({
      ...KEYFRAME_DOC,
      interpolate_enabled: true,
      interp_model: "film_net_fp16.safetensors",
      interp_multiplier: 2,
      sharpen_enabled: true,
    });
    assert.equal(deriveWindowFamily(walked as Record<string, unknown>), "t4r");
    assert.equal(walked.interpolate_enabled, true);
    assert.equal(walked.sharpen_enabled, true);
  });

  it("the reference surface derives t4r under a finish stamp and still walks", () => {
    const walked = def.schema!({ ...KEYFRAME_DOC, ref_images: ["webp/ref.png"], sr_switch: true });
    assert.equal(deriveWindowFamily(walked as Record<string, unknown>), "t4r");
    assert.equal(walked.sr_switch, true);
  });

  it("a clean keyframe doc (t4r, no post keys) walks", () => {
    assert.equal(deriveWindowFamily(def.schema!(KEYFRAME_DOC) as Record<string, unknown>), "t4r");
  });

  it("the same stamps on a t4_open doc walk", () => {
    const walked = def.schema!({ steps: 20, second_pass_enabled: true, sr_switch: true });
    assert.equal(deriveWindowFamily(walked as Record<string, unknown>), "t4_open");
  });

  it("the same stamps on a t4_chain film walk", () => {
    const walked = def.schema!({
      calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
      length: 124,
      sr_switch: true,
      second_pass_enabled: true,
    });
    assert.equal(deriveWindowFamily(walked as Record<string, unknown>), "t4_chain");
  });

  it("null-carried finish keys stay UNSTATED at the walk (THE ONE NULL LAW survives the retirement)", () => {
    const walked = def.schema!({
      ...KEYFRAME_DOC,
      interpolate_enabled: null,
      second_pass_enabled: null,
      sharpen_enabled: null,
      sr_switch: null,
    });
    // the walk's stated-and-valued grammar: null never counts as stated,
    // so the family derivation and every gate read the doc as un-stamped.
    assert.equal(deriveWindowFamily(walked as Record<string, unknown>), "t4r");
  });
});
