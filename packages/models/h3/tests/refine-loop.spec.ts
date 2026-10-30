// @melite/models-h3 — THE REFINE LOOP (F24's one-press cure, 2026-11-13).
// The mod arm refines ONE window per doc; walking a film meant pressing
// once per window and hand-splicing (the §16 42-minute demo). The loop
// seat renders N windows over ONE source clip, every window saved
// `<runId>/refine_w<k>`, ordered by the film's unload boundary chain and
// assembled IN-GRAPH by the file join — no harness media, no ffmpeg.
// Every assertion is DERIVED from the exports (the arithmetic from its
// own function, the caps from the constants), never a frozen literal.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import {
  REFINE_DEFAULT_CLIP_SECONDS,
  REFINE_2X_OOM_FRAMES,
  refineWindowCount,
  refineWindowStarts,
  renderH3RefineWindow,
  renderH3RefineWindows,
} from "../src/index.ts";
import type { RefineWindowSeat } from "../src/index.ts";

const SEAM_SECONDS = 22 / 24;
const FPS = 24;

type Nodes = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

const facts = {
  unet: "minimax_h3_t2v_bf16.safetensors",
  clip: "clip.safetensors",
  vae_video: "vae_video.safetensors",
  vae_audio: "vae_audio.safetensors",
};

const entry = {
  source_clip: "staged/source.mp4",
  refine_prompt: "sharper detail, unchanged motion",
  denoise: 0.32,
  steps: 6,
  seed: 0,
  clip_seconds: REFINE_DEFAULT_CLIP_SECONDS,
  start_seconds: 0,
  mode: "scale by multiplier",
  scale: 2,
};

const walk = (g: GraphBuilder): Nodes =>
  g.toJSON() as unknown as Nodes;

const ofClass = (nodes: Nodes, cls: string): Array<[string, Nodes[string]]> =>
  Object.entries(nodes).filter(([, n]) => n.class_type === cls);

const nodeOf = (nodes: Nodes, ref: unknown): Nodes[string] => nodes[refOf(ref)]!;

const refOf = (v: unknown): string => (Array.isArray(v) ? String(v[0]) : String(v));

describe("the refine loop (F24: one press walks the film)", () => {
  it("ARM 1 — the loop arithmetic is DERIVED and states its own refusals", () => {
    const step = REFINE_DEFAULT_CLIP_SECONDS - SEAM_SECONDS;
    // a film one window long is ONE window — never a phantom second
    assert.equal(refineWindowCount(REFINE_DEFAULT_CLIP_SECONDS, REFINE_DEFAULT_CLIP_SECONDS, SEAM_SECONDS), 1);
    assert.equal(refineWindowCount(1, REFINE_DEFAULT_CLIP_SECONDS, SEAM_SECONDS), 1);
    // a film past the window grows a window per `step` of extra length
    const total = REFINE_DEFAULT_CLIP_SECONDS * 3;
    assert.equal(
      refineWindowCount(total, REFINE_DEFAULT_CLIP_SECONDS, SEAM_SECONDS),
      Math.ceil((total - SEAM_SECONDS) / step),
      "the count is the plan's own formula, judged against the function",
    );
    // the starts advance by step and the FIRST is the entry's offset
    const starts = refineWindowStarts(3, REFINE_DEFAULT_CLIP_SECONDS, SEAM_SECONDS, 0.5);
    assert.deepEqual(starts, [0.5, 0.5 + step, 0.5 + 2 * step]);
    // refusals: a stated-length-less walk and an overlap that never advances
    assert.throws(() => refineWindowCount(0, REFINE_DEFAULT_CLIP_SECONDS, SEAM_SECONDS),
      /total_seconds 0 — an auto walk states the source film's length/);
    assert.throws(() => refineWindowCount(10, REFINE_DEFAULT_CLIP_SECONDS, REFINE_DEFAULT_CLIP_SECONDS),
      /a carried overlap shorter than the window is the only walk that advances/);
  });

  it("ARM 2 — a ONE-window loop is the arm's own graph plus the join tail (no finalize, no extra composer)", () => {
    const g = new GraphBuilder();
    renderH3RefineWindows(entry, {}, facts, g, "run-loop", { windows: 1, overlapFrames: 22 });
    const nodes = walk(g);
    const saves = ofClass(nodes, "SaveVideo");
    // the window save + the assembled film save
    assert.deepEqual(saves.map(([, n]) => n.inputs.filename_prefix),
      ["run-loop/refine_w0", "run-loop/refine"]);
    // ONE window body: one loader, one handoff, one window mux
    assert.equal(ofClass(nodes, "VHS_LoadVideo").length, 1);
    assert.equal(ofClass(nodes, "MinimaxH3LatentUpscaler3DRefineHandoff").length, 1);
    // no carried head on the first window — no finalize node at all
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize").length, 0);
    // the join tail: one boundary token per save, the concat, its container
    assert.equal(ofClass(nodes, "MeliteUnload").length, 1);
    const concat = ofClass(nodes, "MeliteConcatVideos");
    assert.equal(concat.length, 1);
    assert.equal(concat[0]![1].inputs.videos, "run-loop/refine_w0");
    assert.ok(refOf(concat[0]![1].inputs.after) !== "", "the concat waits on the boundary token");
  });

  it("ARM 3 — the carried head: k≥2 windows start at the step and TRIM their own overlap", () => {
    const g = new GraphBuilder();
    const cap = Math.round(REFINE_DEFAULT_CLIP_SECONDS * FPS);
    const step = cap - 22;
    renderH3RefineWindows(entry, {}, facts, g, "run-two", { windows: 2, overlapFrames: 22 });
    const nodes = walk(g);
    const loads = ofClass(nodes, "VHS_LoadVideo")
      .map(([, n]) => ({ cap: n.inputs.frame_load_cap, skip: n.inputs.skip_first_frames }));
    assert.deepEqual(loads, [
      { cap, skip: 0 },
      { cap, skip: step },
    ], "window 0 opens the clip; window 1 starts one step in (cap − overlap)");
    // exactly the SECOND window carries the finalize, with the film's
    // own trim law (picture + sound leave by the same overlap)
    const fins = ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize");
    assert.equal(fins.length, 1, "only a carried window trims a head");
    assert.equal(fins[0]![1].inputs.overlap_frames, 22);
    assert.equal(fins[0]![1].inputs.trim_audio_head, true);
    // the window's own save reads the TRIMMED decode, never the raw one
    const w1 = ofClass(nodes, "SaveVideo").find(([, n]) => n.inputs.filename_prefix === "run-two/refine_w1")!;
    const created = nodeOf(nodes, w1[1].inputs.video);
    const finId = refOf(created.inputs.images);
    assert.equal(nodes[finId]!.class_type, "MiniMaxH3FiniteSegmentFinalize");
    // the concat's members are the window prefixes, FILM ORDER
    const concat = ofClass(nodes, "MeliteConcatVideos")[0]!;
    assert.equal(concat[1].inputs.videos, "run-two/refine_w0,run-two/refine_w1");
    // one boundary token per window save (the ordering proof)
    assert.equal(ofClass(nodes, "MeliteUnload").length, 2);
  });

  it("ARM 4 — every window muxes through the join-rate door (one audio law: 48 kHz)", () => {
    const g = new GraphBuilder();
    renderH3RefineWindows(entry, {}, facts, g, "run-audio", { windows: 2, overlapFrames: 22 });
    const nodes = walk(g);
    // each window's own container muxes through the resample door; the
    // assembled film's container takes the CONCAT's audio leg instead —
    // its members are the windows' 48 kHz files, so a second resample
    // would be a no-op node and a second audio law
    const created = ofClass(nodes, "CreateVideo");
    assert.equal(created.length, 3, "two window containers + the film container");
    const windowMuxes = created.filter(([, n]) => nodeOf(nodes, n.inputs.audio).class_type === "MeliteAudioResample");
    const filmMuxes = created.filter(([, n]) => nodeOf(nodes, n.inputs.audio).class_type === "MeliteConcatVideos");
    assert.equal(windowMuxes.length, 2, "both windows mux through the resample door");
    for (const [id, n] of windowMuxes) {
      const audio = nodeOf(nodes, n.inputs.audio);
      assert.equal(audio.inputs.sample_rate, 48000, `CreateVideo ${id} rides the film rate, never the sound VAE's 32 kHz`);
    }
    assert.equal(filmMuxes.length, 1, "the assembled container rides the join's own 48 kHz leg — no second resample");
  });

  it("ARM 5 — the ceiling belongs to the WINDOW: a past-OOM window refuses, the loop does not multiply it", () => {
    const overSeconds = (REFINE_2X_OOM_FRAMES + 17) / FPS;
    const seat: RefineWindowSeat = {
      cap: Math.round(overSeconds * FPS), skip: 0, overlapFrames: 0, prefix: "x/w0",
    };
    assert.throws(
      () => renderH3RefineWindow(entry, {}, facts, new GraphBuilder(), seat),
      /the ceiling belongs to the WINDOW/,
      "a wide window refuses at the same door the arm uses",
    );
    // and the capacity cure still exempts a same-size pass at the SAME window
    const sameSize = { ...entry, scale: 1 };
    assert.doesNotThrow(() =>
      renderH3RefineWindow(sameSize, {}, facts, new GraphBuilder(), seat),
      "scale 1 sizes its own window — the measured 144 f fit",
    );
  });

  it("ARM 6 — the loop refuses a zero-window walk and a short overlap LOUD", () => {
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, new GraphBuilder(), "run", { windows: 0, overlapFrames: 22 }),
      /0 windows — a refine loop renders at least one window/,
    );
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, new GraphBuilder(), "run", {
        windows: 2, overlapFrames: Math.round(REFINE_DEFAULT_CLIP_SECONDS * FPS),
      }),
      /a carried overlap shorter than the window is the only walk that advances/,
    );
  });
});
