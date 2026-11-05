// @melite/models-h3 — THE REFINE LOOP (F24's one-press cure, 2026-11-13).
// The mod arm refines ONE window per doc; walking a film meant pressing
// once per window and hand-splicing (the §16 42-minute demo). The loop
// seat renders N windows over ONE source clip, every window saved
// `<runId>/refine_w<k>`, ordered by the film's unload boundary chain and
// assembled IN-GRAPH by the file join — no harness media, no ffmpeg.
// THE CONTEXT CARRY IS THE FILM'S OWN (round 27, operator order: "ZERO
// DIFFERENCE BETWEEN THE CONTEXT CARRY FROM THE NORMAL GENS AND THE
// REFINE GENS"): every carried join mounts
// MiniMaxH3FiniteLatentContinuation with the film's seats, the carried
// head is trimmed by the film's finalize, and the tail is the plain
// file concat — no crossfade, no list execution.
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
  renderH3RefineCarry,
  renderH3RefineWindow,
  renderH3RefineWindows,
  tokenExactCarry,
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

  // ARM 3 (re-pinned round 27, operator order): the carried join is the
  // FILM'S OWN — window k≥2 mounts MiniMaxH3FiniteLatentContinuation
  // with the film's seats (iteration, overlap_frames,
  // continue_audio_latent, the model + sigmas the handoff samples with,
  // previous_latent = window k−1's joint latent), the film's finalize
  // trims the carried head, and the tail is the plain file concat. No
  // crossfade, no list execution.
  it("ARM 3 — THE CARRY STAND-DOWN (F3-14): a carried loop REFUSES at the door, naming the engine failure, before any node", () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, g, "run-two", { windows: 2, overlapFrames: 22 }),
      /a 2-window loop at a 22 f overlap \(1 carried join\) would carry the film's own continuation between windows — and that carry is DEAD in the engine today \(F3-14/,
      "the carried loop refuses at the door, never billing window 0",
    );
    assert.deepEqual(walk(g), {}, "no node emitted — the refusal lands before the loop builds anything");
  });

  it("ARM 3b — the carrier's own shape (the harness the engine cure re-wires): the film's continuation per join, the head-trim, the concat", () => {
    const g = new GraphBuilder();
    const cap = Math.round(REFINE_DEFAULT_CLIP_SECONDS * FPS);
    const step = cap - 22;
    const windowEntry = entry;
    renderH3RefineCarry(
      [windowEntry, windowEntry],
      {}, facts, g,
      [{ cap, skip: 0 }, { cap, skip: step }],
      [22],
      "run-two",
    );
    const nodes = walk(g);
    const loads = ofClass(nodes, "VHS_LoadVideo")
      .map(([, n]) => ({ cap: n.inputs.frame_load_cap, skip: n.inputs.skip_first_frames }));
    assert.deepEqual(loads, [
      { cap, skip: 0 },
      { cap, skip: step },
    ], "window 0 opens the clip; window 1 starts one step in (cap − overlap)");
    // ONE handoff per window (each window's own refine sample) and ONE
    // continuation at the one join, with the film's own seats.
    const hands = ofClass(nodes, "MinimaxH3LatentUpscaler3DRefineHandoff");
    assert.equal(hands.length, 2, "one handoff per window — a carried film re-samples each window, never a list execution");
    const conts = ofClass(nodes, "MiniMaxH3FiniteLatentContinuation");
    assert.equal(conts.length, 1, "one continuation at the one join");
    const [contId, cont] = conts[0]!;
    assert.equal(cont.inputs.iteration, 1, "the join is window 1's continuation");
    assert.equal(cont.inputs.overlap_frames, 22, "the film's own seam");
    assert.equal(cont.inputs.continue_audio_latent, true, "the sound takes the film's soft release");
    assert.equal(nodeOf(nodes, cont.inputs.previous_latent).class_type,
      "MiniMaxH3ContexMaskedTarget", "previous_latent is window 0's JOINT target — the base grid its handoff refined");
    assert.equal(nodeOf(nodes, cont.inputs.target_latent).class_type,
      "MiniMaxH3ContexMaskedTarget", "window 1's own joint target is the carried target");
    assert.equal(nodeOf(nodes, cont.inputs.sigmas).class_type, "BasicScheduler",
      "the schedule the sampler walks is the continuation's own");
    // the continued window's handoff re-samples the continuation's
    // patched model + masked target — the drift-control carry binds
    // the sampler, exactly as it binds the film's guider.
    const continued = hands.find(([, n]) => refOf(n.inputs.latent) === contId)!;
    assert.deepEqual(continued[1].inputs.latent, [contId, 1],
      "the continued handoff samples the masked target the continuation returned");
    assert.deepEqual(continued[1].inputs.positive, [contId, 0],
      "…under the continuation's positive");
    assert.deepEqual(continued[1].inputs.model, [contId, 3],
      "…and the drift-controlled model it patched (out 3)");
    // the head-trim: only the carried window trims; the seam never replays
    const fins = ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize");
    assert.equal(fins.length, 1, "window 0 carries nothing — only window 1 trims a head");
    const [finId, fin] = fins[0]!;
    assert.equal(fin.inputs.iteration, 1, "the film's finalize seat");
    assert.equal(fin.inputs.overlap_frames, 22, "the trim states the carried span");
    assert.equal(fin.inputs.trim_audio_head, true, "the seam leaves picture AND sound");
    assert.equal(refOf(fin.inputs.sampled_latent), continued[0],
      "the trim consumes the continued window's own refined latent");
    // the window saves: window 0 muxes its own decode, window 1 muxes
    // the trimmed picture (the finalize's out 1)
    const windows = ofClass(nodes, "SaveVideo")
      .filter(([, n]) => String(n.inputs.filename_prefix).includes("refine_w"));
    assert.equal(windows.length, 2, "one member save per window");
    const rawMux = nodeOf(nodes, windows.find(([, n]) => String(n.inputs.filename_prefix).endsWith("refine_w0"))![1].inputs.video);
    assert.equal(nodeOf(nodes, rawMux.inputs.images).class_type, "VAEDecode",
      "window 0 saves its own untrimmed decode");
    const trimMux = nodeOf(nodes, windows.find(([, n]) => String(n.inputs.filename_prefix).endsWith("refine_w1"))![1].inputs.video);
    assert.deepEqual(trimMux.inputs.images, [finId, 1],
      "window 1 saves the trimmed picture — the carried span never replays");
    // the tail is the FILM'S OWN join: the plain file concat
    const concat = ofClass(nodes, "MeliteConcatVideos")[0]!;
    assert.equal(concat[1].inputs.videos, "run-two/refine_w0,run-two/refine_w1",
      "the concat consumes the member prefixes in film order");
    assert.equal(ofClass(nodes, "MeliteOverlapJoinVideos").length, 0,
      "no crossfade anywhere — the carry is the latent, not a blend");
    assert.equal(ofClass(nodes, "MeliteCollectLatents").length, 0,
      "no list door — one body per window");
    assert.equal(ofClass(nodes, "MeliteUnload").length, 2, "one boundary token per window save");
  });

  it("ARM 4 — every window muxes through the join-rate door (one audio law: 48 kHz)", () => {
    // the carried loop refuses (ARM 3), so the audio law is judged on
    // the abutting loop — the same per-window mux, no carry.
    const g = new GraphBuilder();
    renderH3RefineWindows(entry, {}, facts, g, "run-audio", { windows: 2, overlapFrames: 0 });
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
    assert.equal(filmMuxes.length, 1, "the assembled container rides the concat's own 48 kHz leg — no second resample");
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

  it("ARM 7 — THE THREE-WINDOW CARRY STAND-DOWN: the loop refuses, naming every carried join it would mount", () => {
    // ROUND 27 (operator order: "ZERO DIFFERENCE BETWEEN THE CONTEXT
    // CARRY FROM THE NORMAL GENS AND THE REFINE GENS"): the refine
    // mounts the SAME MiniMaxH3FiniteLatentContinuation the film
    // mounts — iteration, overlap_frames, continue_audio_latent true,
    // the model + sigmas the sampler samples with, previous_latent =
    // the predecessor's joint AV latent. F62's list-seat copy
    // (carry_prefix_frames + MeliteCollectLatents) was a refine-only
    // divergence and is retired with this arm.
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, g, "run-carry", { windows: 3, overlapFrames: 22 }),
      /\(2 carried joins\) would carry the film's own continuation between windows/,
      "windows 1 and 2 would carry — the door refuses both joins by name",
    );
    assert.deepEqual(walk(g), {}, "no node emitted");
  });

  it("ARM 8 — a NON-token-exact overlap REFUSES (the crossfade of two independent renders is the ghost)", () => {
    // 21 f is not token-exact ((21-5) % 17 !== 0): it cannot continue
    // the stream, and the face that used to catch it — the F61
    // crossfade of two independent renders — is a double exposure
    // (FRICTION F26). The door refuses, names the grid, the next rung,
    // and the lawful alternative (0 = the abutting hard cut).
    const g = new GraphBuilder()
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, g, "run-blend", { windows: 2, overlapFrames: 21 }),
      /the loop carries a 21 f overlap — not token-exact/,
      "the refusal names the measured overlap",
    )
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, g, "run-blend-rung", { windows: 2, overlapFrames: 21 }),
      /the nearest rung above 21 f is 22 f/,
      "the next lawful rung is a stated number",
    )
    assert.deepEqual(g.toJSON(), {}, "nothing lands on the builder — the refusal precedes composition")
    // the face chooser itself: the law in one line, judged directly
    assert.equal(tokenExactCarry(22), true, "22 f is the film's own token-exact seam")
    assert.equal(tokenExactCarry(21), false, "21 f is not — it refuses")
    assert.equal(tokenExactCarry(5), true, "5 f is the smallest token-exact carry")
    assert.equal(tokenExactCarry(39), true, "39 f rides the next token step")
    assert.equal(tokenExactCarry(4), false, "below the first token pair there is no carry")
  })

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
    // the film's composed-window ceiling is the loop's own cap
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, new GraphBuilder(), "run", {
        windows: 33, overlapFrames: 22,
      }),
      /the film's composed-window ceiling is 32/,
    );
  });

  it("ARM 9 — THE ZERO-OVERLAP LOOP: abutting windows tile through the plain concat (nothing to blend)", () => {
    // windows ≥ 2 with overlap 0: the join face is the concat, and
    // every k≥2 member walks the head-trim seat with a 0 (nothing
    // carried, nothing trimmed).
    const g = new GraphBuilder();
    const cap = Math.round(REFINE_DEFAULT_CLIP_SECONDS * FPS);
    renderH3RefineWindows(entry, {}, facts, g, "run-zero", { windows: 2, overlapFrames: 0 });
    const nodes = walk(g);
    const loads = ofClass(nodes, "VHS_LoadVideo")
      .map(([, n]) => ({ cap: n.inputs.frame_load_cap, skip: n.inputs.skip_first_frames }));
    assert.deepEqual(loads, [
      { cap, skip: 0 },
      { cap, skip: cap },
    ], "the step is the whole window — window 1 starts where window 0 ends");
    assert.equal(ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize").length, 0,
      "no carried head — abutting windows duplicate nothing");
    assert.equal(ofClass(nodes, "MeliteOverlapJoinVideos").length, 0,
      "no blend — a zero carry is the concat's own seat");
    const concat = ofClass(nodes, "MeliteConcatVideos")[0]!;
    assert.equal(concat[1].inputs.videos, "run-zero/refine_w0,run-zero/refine_w1",
      "the abutting loop joins through the plain file concat");
    assert.equal(ofClass(nodes, "SaveVideo").length, 3, "two window saves + the one terminal film save");
  });

  it("ARM 10 — THE CARRIED HEAD: a k≥2 window trims its carried overlap IN-GRAPH (picture and sound leave by the same seam)", () => {
    // the direct window door with a carried overlap: the film's own
    // finalize node hard-trims the head, and the mux reads the trimmed
    // picture (out 1) and the trimmed sound (out 2).
    const g = new GraphBuilder();
    renderH3RefineWindow(entry, {}, facts, g, {
      cap: Math.round(2 * FPS), skip: Math.round(1.5 * FPS), overlapFrames: 12, prefix: "run-trim/refine",
    });
    const nodes = walk(g);
    const fins = ofClass(nodes, "MiniMaxH3FiniteSegmentFinalize");
    assert.equal(fins.length, 1, "the carried head mounts the film's own finalize");
    const [finId, fin] = fins[0]!;
    assert.equal(fin.inputs.overlap_frames, 12, "the trim states the carried overlap");
    assert.equal(fin.inputs.trim_audio_head, true, "the carried seam leaves picture AND sound");
    // the trim consumes the window's OWN decodes, off its OWN handoff
    assert.equal(nodeOf(nodes, fin.inputs.sampled_latent).class_type,
      "MinimaxH3LatentUpscaler3DRefineHandoff", "the trim rides the window's own handoff");
    assert.equal(nodeOf(nodes, fin.inputs.images).class_type,
      "VAEDecode", "the trim consumes the window's own picture decode");
    assert.equal(nodeOf(nodes, fin.inputs.audio).class_type,
      "VAEDecodeAudio", "the trim consumes the window's own sound decode");
    // and the mux reads the TRIMMED pair: the finalize's out(1) picture
    // and out(2) sound (the seam never replays).
    const created = ofClass(nodes, "CreateVideo")[0]!;
    assert.deepEqual(created[1].inputs.images, [finId, 1],
      "the mux reads the trimmed picture — the finalize's out(1)");
    const resample = ofClass(nodes, "MeliteAudioResample")[0]!;
    assert.deepEqual(resample[1].inputs.audio, [finId, 2],
      "the soundtrack rides the same trim — the finalize's out(2)");
    assert.deepEqual(ofClass(nodes, "SaveVideo").map(([, n]) => n.inputs.filename_prefix), ["run-trim/refine"],
      "the trimmed window still saves at its own prefix");
  });
});

describe("the window renderer's whole-frame seat refusals (the loop's loader seats are whole frame counts)", () => {
  it("a window cap that is not a whole positive frame count refuses at the door, naming the count and the safe default", () => {
    assert.throws(
      () => renderH3RefineWindow(entry, {}, facts, new GraphBuilder(), {
        cap: 0, skip: 0, overlapFrames: 0, prefix: "run-bad-cap/refine",
      }),
      /a 0 f window — a refine window needs frames .* the safe default is 3\.75 s = 90 f/,
    );
    assert.throws(
      () => renderH3RefineWindow(entry, {}, facts, new GraphBuilder(), {
        cap: 45.5, skip: 0, overlapFrames: 0, prefix: "run-bad-cap/refine",
      }),
      /a 45\.5 f window — a refine window needs frames/,
    );
  });

  it("a window that starts before the clip's first frame (or off the whole-frame grid) refuses at the door", () => {
    assert.throws(
      () => renderH3RefineWindow(entry, {}, facts, new GraphBuilder(), {
        cap: 90, skip: -1, overlapFrames: 0, prefix: "run-bad-skip/refine",
      }),
      /a window starting at frame -1 — a window starts at or after the clip's first frame/,
    );
    assert.throws(
      () => renderH3RefineWindow(entry, {}, facts, new GraphBuilder(), {
        cap: 90, skip: 0.5, overlapFrames: 0, prefix: "run-bad-skip/refine",
      }),
      /a window starting at frame 0\.5/,
    );
  });

  it("the loop plan refuses a carried overlap that is not a whole non-negative frame count", () => {
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, new GraphBuilder(), "run-bad-overlap", {
        windows: 1, overlapFrames: -1,
      }),
      /overlap -1 f — the carried overlap is a whole frame count at or above zero/,
    );
    assert.throws(
      () => renderH3RefineWindows(entry, {}, facts, new GraphBuilder(), "run-bad-overlap", {
        windows: 1, overlapFrames: 22.5,
      }),
      /overlap 22\.5 f — the carried overlap is a whole frame count at or above zero/,
    );
  });

  it("the loop plan refuses a window length that books no frames (clip_seconds 0)", () => {
    assert.throws(
      () => renderH3RefineWindows({ ...entry, clip_seconds: 0 }, {}, facts, new GraphBuilder(), "run-bad-clip", {
        windows: 1, overlapFrames: 22,
      }),
      /clip_seconds 0 — a refine window needs frames .* seconds × 24 at the film clock/,
    );
  });
});
