// @contract models-h3-extend-audio-line-law
//
// THE EXTENSION CARRIES THE SPOKEN LINE (2026-11-27, F8 — the benchgen
// film's first block: "an extension cannot carry a spoken line"). The
// film lane's audio_clips rows were read by the film loop alone
// (actions.ts renderH3Film): a continuation's appended seconds had no
// door to a pinned voice, and the edit door's silent-inert guard
// named no cure for a clip that must go on speaking.
//
// THE LAW: the continuation's ONE window carries the film lane's own
// law end to end, from the same owners —
//   PIN — each lane's winner (chooseLaneClips) pins its slice into
//   the window's latent at its generation frame on the extension
//   clock (laneStamps: frame_idx = start_frame at 24 fps), AFTER the
//   forced seam and in the film loop's order (dialogue → sfx →
//   music); the seat is the spell law's (a $spell rides the tensor
//   slice, a path the file slice).
//   PROMPT — the window's prompt rides the film lane's assembly
//   (lanePromptText: the words at the stamp's clock, the line's end
//   stated, the sfx and music fields, the no-speech indicator where
//   no dialogue row rides); a <d> line in the seat under a dialogue
//   row refuses (the row owns the words); the plan's shot carries the
//   same text (the chain loop composes once — both seats read one
//   string).
//   MIX — ONE MeliteFilmAudioMix reads the saved window as the
//   generated track and overlays the rows at their extension-clock
//   seats with the generated voice ducked under them (the film
//   manifest's own law, the F11 ghost hold included); the mixed stem
//   muxes into x1m and the prior joins it by file (x0 + x1m); no
//   audio concat lives in-graph (Layer C owns the mix).
//   REFUSALS — rows on a multi-window continuation (the body
//   composes once; the plan carries prompts only), a row starting
//   past or running past the delivered frames (never cut mid-word at
//   the join), a negative start, a wrong-typed rows seat, a row that
//   wins no lane (too short to size a slice — it would overlay a
//   line the model was never told to speak), two same-class starters
//   (the lane law's own voice). Without rows the arm's graph is
//   byte-frozen (no mix, no x1m, the one seam guide, the prompt
//   verbatim).
//   KNOB — duck_depth_db fires on this lane (the mix reads it), so
//   the walk's film-only gate admits it on a continuation carrying
//   rows and keeps its refusal everywhere else.
//
// DEPTH: the real composition root (loadCardDefs → def.schema →
// def.compose — the door the run rides) for the graph; the lib door
// (renderH3Extend) for the wrong-typed seat the walk already refuses.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { renderH3Extend } from "../src/index.ts";
import { computeFilmMix, laneStamps, parseFilmMixClips } from "../src/filmMix.ts";
import { NO_SPEECH_FIELD, lanePromptText } from "../src/audioStamp.ts";
import type { H3Facts } from "../src/actions.ts";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type GNode = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, GNode>;
type Link = [string, number];

const FACTS: H3Facts = {
  unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
  clip: "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
  vae_video: "minimax_h3_video_vae_int8_convrot.safetensors",
  vae_audio: "minimax_h3_audio_vae_fp32.safetensors",
};

const LINE = "It wasn't a code.";
const BASE = "she keeps walking toward the door, the door opens";
// 3.75 s = 90 f — one window; the row sounds at 0.5 s for 3 s and
// ends at 3.5 s, 0.25 s before the window's end (the F11 hold's case)
const ROW = { id: "l1", name: "line.flac", src: "line.flac", start_frame: 12, dur_frames: 72, text: LINE };
const HORN = { id: "s1", name: "horn.flac", src: "horn.flac", start_frame: 24, dur_frames: 18, text: "a horn", class: "sfx" };
const SCORE = { id: "m1", name: "pad.flac", src: "pad.flac", start_frame: 0, dur_frames: 90, class: "music", text: "a low synth pad" };

async function compose(doc: Record<string, unknown>, runId: string): Promise<Graph> {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const model: ModelFacts | undefined = facts.models["h3-timeline"];
  assert.ok(model, "the h3-timeline family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

const extendDoc = (rows?: ReadonlyArray<Record<string, unknown>>, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  extend: [{ source_clip: "clips/take.mp4", extend_prompt: BASE, extend_seconds: 3.75 }],
  ...(rows ? { audio_clips: rows } : {}),
  ...extra,
});

const ofClass = (graph: Graph, cls: string): [string, GNode][] =>
  Object.entries(graph).filter(([, n]) => n.class_type === cls);
const one = (graph: Graph, cls: string): [string, GNode] => {
  const rows = ofClass(graph, cls);
  assert.equal(rows.length, 1, `exactly one ${cls}`);
  return rows[0];
};
const linkOf = (v: unknown, what: string): Link => {
  assert.ok(Array.isArray(v), `${what} is a link`);
  return v as Link;
};
const r2vPrompt = (graph: Graph): string => {
  const [, r2v] = one(graph, "MiniMaxH3ReferenceToVideo");
  return String(r2v.inputs.prompt);
};
const planPrompt = (graph: Graph): string => {
  // the chain plan carries the literal shots (the seat's own plan —
  // clause 3: the geometry node's plan_json_input stays unwired)
  const [, plan] = one(graph, "MiniMaxH3ChainPlanModern");
  const shots = (JSON.parse(String(plan.inputs.plan_json)) as { shots: { prompt: string }[] }).shots;
  assert.equal(shots.length, 1, "one shot — one window");
  return shots[0]!.prompt;
};
/** The guides in chain order: the conditioning link-walk from the
 *  seam pin (the guide whose positive is the r2v) forward. */
const guideChain = (graph: Graph): GNode[] => {
  const guides = ofClass(graph, "MiniMaxH3AddGuide");
  const r2vId = one(graph, "MiniMaxH3ReferenceToVideo")[0];
  const chain: GNode[] = [];
  let cursor: [string, GNode] | undefined = guides.find(([, n]) => linkOf(n.inputs.positive, "positive")[0] === r2vId);
  assert.ok(cursor, "the chain opens on the r2v conditioning");
  while (cursor !== undefined) {
    chain.push(cursor[1]);
    const currentId: string = cursor[0];
    // the next pin is the guide whose positive IS the current guide
    cursor = guides.find(([id, n]) => id !== currentId && linkOf(n.inputs.positive, "positive")[0] === currentId);
  }
  return chain;
};
const saveOf = (graph: Graph, prefix: string): GNode => {
  const row = ofClass(graph, "SaveVideo").find(([, n]) => n.inputs.filename_prefix === prefix);
  assert.ok(row, `a SaveVideo at ${prefix}`);
  return row[1];
};
const muxBehind = (graph: Graph, save: GNode): GNode => graph[linkOf(save.inputs.video, "video")[0]];

describe("the extension carries the spoken line (F8)", () => {
  it("THE PIN: the dialogue row's slice pins the window's latent at its extension-clock frame, after the forced seam, and the chain's conditioning rides it", async () => {
    const graph = await compose(extendDoc([ROW]), "run_line");
    const chain = guideChain(graph);
    assert.equal(chain.length, 2, "two guides: the seam pin, then the dialogue pin");
    assert.equal(chain[0]!.inputs.frame_idx, 0, "the seam pins frame 0");
    assert.equal(chain[0]!.inputs.image !== undefined, true, "the seam is the pixel pin");
    const pin = chain[1]!;
    assert.equal(pin.inputs.frame_idx, 12, "the pin lands at start_frame on the extension clock (12 f = 0.5 s at 24 fps)");
    assert.equal(pin.inputs.image, undefined, "the dialogue pin is audio-only — never an image seat");
    const audio = graph[linkOf(pin.inputs.audio, "audio")[0]];
    assert.equal(audio.class_type, "MeliteAudioSlice", "a path row slices through the file node (the estate boundary — the spell law's other half)");
    assert.deepEqual(
      { audio: audio.inputs.audio, start: audio.inputs.start_seconds, dur: audio.inputs.duration_seconds },
      { audio: "line.flac", start: 0, dur: 3 },
      "the slice is the stamp's: the source from its in-point, the overlap's length",
    );
    const audioVae = graph[linkOf(pin.inputs.audio_vae, "audio_vae")[0]];
    assert.equal(
      Object.values(audioVae.inputs).some((v) => typeof v === "string" && v.includes("audio_vae")), true,
      "the pin rides the AUDIO vae (the loader naming the audio_vae lane file)",
    );
    assert.deepEqual(
      linkOf(pin.inputs.latent, "latent"),
      linkOf(chain[0]!.inputs.latent, "latent"),
      "both pins land on the SAME window latent",
    );
    // THE RIDE: the chain context's conditioning is the LAST pin — an
    // orphan guide emitted beside the chain would pin nothing.
    const [, ctx] = one(graph, "MiniMaxH3ChainContext");
    const last = ofClass(graph, "MiniMaxH3AddGuide").find(([, n]) => n === chain[1])!;
    assert.deepEqual(linkOf(ctx.inputs.conditioning, "conditioning"), [last[0], 0], "the context rides the dialogue pin's output");
  });

  it("THE PROMPT: the window reads the film lane's sentences — the words at the stamp's clock, the line's end stated, no indicator under a dialogue row — in BOTH prompt seats", async () => {
    const graph = await compose(extendDoc([ROW]), "run_words");
    const expected = `${BASE}\n\noverall_soundscape:\nAt 00:00.500, the on-screen speaker says the line below, mouth visible and articulating the words; room tone continues underneath.\nThe line: <d>[English] ${LINE}</d>\nThe line ends at 00:03.500; after it nobody speaks — room tone only.`;
    assert.equal(r2vPrompt(graph), expected, "the r2v prompt carries the lane sentences (the extension clock's stamps)");
    assert.equal(planPrompt(graph), expected, "the plan's shot carries the SAME text — the body composes once, both seats read one string");
    assert.equal(r2vPrompt(graph).includes(NO_SPEECH_FIELD), false, "no no-speech indicator under a dialogue row");
    // the same words the film loop composes for the same stamp — one
    // owner (lanePromptText), judged against the lib's own face
    const stamps = laneStamps(parseFilmMixClips([ROW]), 0, 90, 0, 24);
    assert.equal(lanePromptText(BASE, stamps, { speechLang: "English", hearsRefAudio: false, where: "extend", textSeat: "extend_prompt" }), expected);
  });

  it("THE STAMPS: laneStamps books the extension's single window on the extension clock (one owner with the film loop)", () => {
    const stamps = laneStamps(parseFilmMixClips([{ ...ROW, in_frames: 24 }]), 0, 90, 0, 24);
    assert.deepEqual(stamps.dialogue, {
      src: "line.flac", slice_start_seconds: 1, slice_duration_seconds: 3, delay_seconds: 0.5, text: LINE, fromHead: true, endsHere: true,
    }, "the slice starts at the source in-point, lasts the window overlap, sounds at start_frame; the row ends inside the window");
  });

  it("THE MIX: one MeliteFilmAudioMix overlays the rows over the appended seconds with the voice ducked (the F11 hold), the stem muxes into x1m, the prior joins it by file", async () => {
    const graph = await compose(extendDoc([ROW]), "run_mix");
    const [, mix] = one(graph, "MeliteFilmAudioMix");
    assert.equal(mix.inputs.videos, "run_mix/x1", "the mix reads the saved window as the generated track");
    assert.deepEqual(JSON.parse(String(mix.inputs.clips_json)), [
      { src: "line.flac", start_sec: 0.5, dur_sec: 3, class: "dialogue" },
    ], "the overlay row is the manifest's — the seat on the extension clock, no in_sec at the source head");
    assert.equal(mix.inputs.duck_spans, "0.5:3.75", "the film track ducks under the line AND holds to the window's end (the ghost hold — the voice that rises after the word)");
    assert.equal(mix.inputs.music_duck_spans, "0.5:3.5", "the music bus ducks for the row's own span only");
    assert.equal(mix.inputs.duck_db, -48, "the dialogue default (a pasted line silences the generated voice)");
    assert.equal(mix.inputs.film_seconds, 3.75, "the output fits the appended seconds");
    // the manifest IS computeFilmMix's — the film tail's own composer
    const manifest = computeFilmMix({ spans: [{ start: 0, end: 90 }], clips: parseFilmMixClips([ROW]), windowSecs: [3.75], fps: 24 });
    assert.deepEqual(
      { d: mix.inputs.duck_spans, m: mix.inputs.music_duck_spans, db: mix.inputs.duck_db, f: mix.inputs.film_seconds },
      { d: manifest.duckSpanString, m: manifest.musicDuckSpanString, db: manifest.duckDb, f: manifest.filmSec },
    );
    // THE ORDERING PROOF: the mix waits for x1's boundary
    const boundary = graph[linkOf(mix.inputs.after, "after")[0]];
    assert.equal(boundary.class_type, "MeliteUnload", "the mix rides the boundary token");
    assert.equal(graph[linkOf(boundary.inputs.video, "video")[0]], saveOf(graph, "run_mix/x1"), "the boundary orders x1's save passthrough");
    // x1m: the saved window decodes back (frames + fps) under the MIXED stem
    const mixedMux = muxBehind(graph, saveOf(graph, "run_mix/x1m"));
    assert.deepEqual(linkOf(mixedMux.inputs.audio, "audio"), [ofClass(graph, "MeliteFilmAudioMix")[0][0], 0], "x1m carries the mix's audio");
    const decodeId = linkOf(mixedMux.inputs.images, "images")[0];
    assert.equal(graph[decodeId]!.class_type, "MeliteConcatVideos", "x1m's frames are the saved window decoded back CPU-side");
    assert.equal(graph[decodeId]!.inputs.videos, "run_mix/x1", "the decode reads x1 alone");
    assert.deepEqual(linkOf(mixedMux.inputs.fps, "fps"), [decodeId, 2], "the mux's fps is the file's own");
    // THE JOIN: x0 + x1m through the file-join primitive
    const joins = ofClass(graph, "MeliteConcatVideos");
    assert.equal(joins.length, 2, "the decode pass and the join");
    const join = joins.find(([, n]) => n !== graph[decodeId])!;
    assert.equal(join[1].inputs.videos, "run_mix/x0,run_mix/x1m", "the prior joins the MIXED extension — the extension's own track never reaches the film raw");
    const film = saveOf(graph, "run_mix/extend_film");
    assert.deepEqual(linkOf(muxBehind(graph, film).inputs.images, "images"), [join[0], 0], "the delivered film is the join's frames");
    assert.equal(saveOf(graph, "run_mix/x0").inputs.filename_prefix, "run_mix/x0", "the prior still saves at x0 (its own soundtrack verbatim)");
    // THE MIX IS COMFYUI'S: no in-graph audio concat anywhere
    assert.equal(Object.values(graph).filter((n) => /AudioConcat/i.test(n.class_type)).length, 0, "no AudioConcat — Layer C owns the mix");
  });

  it("THE KNOB: duck_depth_db fires on a continuation carrying rows (the walk admits it; the mix reads it)", async () => {
    const graph = await compose(extendDoc([ROW], { duck_depth_db: -22 }), "run_knob");
    assert.equal(one(graph, "MeliteFilmAudioMix")[1].inputs.duck_db, -22, "the stated depth rides the mix verbatim");
    // the refusal stands where the knob composes into no node
    await expect(compose({ extend: [{ source_clip: "clips/take.mp4", extend_prompt: BASE, extend_seconds: 3.75 }], duck_depth_db: -22 }, "run_knob_dead"))
      .rejects.toThrow(/film-only inject keys: duck_depth_db/);
  });

  it("AN SFX ROW: the event pins at its onset and rides the soundscape; the no-speech indicator still rides (a bed is not speech); the music default ducks", async () => {
    const graph = await compose(extendDoc([HORN]), "run_horn");
    const chain = guideChain(graph);
    assert.equal(chain.length, 2, "the seam, then the sfx pin");
    assert.equal(chain[1]!.inputs.frame_idx, 24, "the horn pins at 1.0 s");
    assert.equal(graph[linkOf(chain[1]!.inputs.audio, "audio")[0]].inputs.audio, "horn.flac", "the sfx slice rides its own row");
    const prompt = r2vPrompt(graph);
    assert.ok(prompt.includes("\n\noverall_soundscape:\nAt 00:01.000, a horn"), `the event rides the soundscape at its clock:\n${prompt}`);
    assert.ok(prompt.endsWith(NO_SPEECH_FIELD), "no dialogue row → the indicator rides (the BRIEF9 law: an sfx bed does not carry speech)");
    const [, mix] = one(graph, "MeliteFilmAudioMix");
    assert.equal(mix.inputs.duck_db, -14, "no dialogue row → the score's shallow dip");
    assert.equal(mix.inputs.duck_spans, "1:1.75", "the event's span is its own — never held (an event is not a voice)");
  });

  it("THE LANES IN ORDER: dialogue, then sfx, then music pin in the film loop's order; music rides its field and never the soundscape", async () => {
    const graph = await compose(extendDoc([ROW, HORN, SCORE]), "run_lanes");
    const chain = guideChain(graph);
    assert.deepEqual(
      chain.slice(1).map((n) => [n.inputs.frame_idx, graph[linkOf(n.inputs.audio, "audio")[0]].inputs.audio]),
      [[12, "line.flac"], [24, "horn.flac"], [0, "pad.flac"]],
      "dialogue → sfx → music, each at its own frame",
    );
    const prompt = r2vPrompt(graph);
    assert.ok(prompt.includes("\n\noverall_soundscape:\nAt 00:00.500, the on-screen speaker"), "the dialogue sentence opens the field");
    assert.ok(prompt.includes("\nAt 00:01.000, a horn"), "the sfx sentence follows in the same field");
    assert.ok(prompt.endsWith("\n\nnon_diegetic_music:\na low synth pad"), "the score rides its own field, last");
    const rows = JSON.parse(String(one(graph, "MeliteFilmAudioMix")[1].inputs.clips_json)) as { class: string; start_sec: number }[];
    assert.deepEqual(rows.map((r) => [r.class, r.start_sec]), [["dialogue", 0.5], ["sfx", 1], ["music", 0]], "the mix places every row in doc order");
  });

  it("A SPELLED ROW: the pin slices the wired tensor and the mix row rides a declared resample seat (the merged-form wire, both halves)", async () => {
    const graph = await compose(extendDoc([{ ...ROW, src: "$tts" }]), "run_spell");
    const pin = guideChain(graph)[1]!;
    const slice = graph[linkOf(pin.inputs.audio, "audio")[0]];
    assert.equal(slice.class_type, "MeliteAudioTensorSlice", "a $spell slices the WIRED AUDIO dict on its typed socket — never the Combo FILE seat");
    assert.deepEqual({ tensor: slice.inputs.audio_tensor, dur: slice.inputs.duration_seconds }, { tensor: "$tts", dur: 3 });
    const [, mix] = one(graph, "MeliteFilmAudioMix");
    assert.deepEqual(JSON.parse(String(mix.inputs.clips_json)), [{ wired: 1, start_sec: 0.5, dur_sec: 3, class: "dialogue" }], "the manifest row names the seat, never a src");
    const hop = graph[linkOf(mix.inputs.wired_audio_1, "wired_audio_1")[0]];
    assert.equal(hop.class_type, "MeliteAudioResample", "the seat is a declared hop");
    assert.deepEqual({ audio: hop.inputs.audio, rate: hop.inputs.sample_rate }, { audio: "$tts", rate: 48000 }, "the hop lands the producer at the film rate");
  });

  it("THE ROSTER: under a stated window_prompts line the lane sentences ride THAT text, and the <d> refusal names the roster seat", async () => {
    const doc = extendDoc([ROW]);
    (doc.extend as Record<string, unknown>[])[0]!["window_prompts"] = "she turns back toward the lantern";
    const graph = await compose(doc, "run_roster");
    assert.ok(r2vPrompt(graph).startsWith("she turns back toward the lantern\n\noverall_soundscape:\nAt 00:00.500"), "the roster line is the text the sentences ride");
    (doc.extend as Record<string, unknown>[])[0]!["window_prompts"] = "she turns back, <d>[English] Go on.</d>";
    await expect(compose(doc, "run_roster_clash")).rejects.toThrow(/h3-timeline extend: window_prompts line 1 carries a <d> spoken line while an audio_clips row owns this window's dialogue/);
  });
});

describe("lanePromptText — the assembly's own face (every arm the two doors ride)", () => {
  const SEATS = { speechLang: "English", hearsRefAudio: false, where: "extend", textSeat: "extend_prompt" };
  const stampOf = (rows: ReadonlyArray<Record<string, unknown>>, end = 90) =>
    laneStamps(parseFilmMixClips(rows), 0, end, 0, 24);

  it("a class-stated row with EMPTY text books its lane and says nothing — no sentence, no field, and the indicator stands down for the class that rode", () => {
    const silent = stampOf([{ ...ROW, text: "", class: "dialogue" }]);
    assert.deepEqual(lanePromptText(BASE, silent, SEATS), BASE, "a textless dialogue row: no sentence, and no no-speech indicator (the lane is taken)");
    const emptySfx = stampOf([{ ...HORN, text: "" }]);
    assert.equal(lanePromptText(BASE, emptySfx, SEATS), BASE + NO_SPEECH_FIELD, "a textless sfx row: no sentence; the indicator rides (no dialogue lane)");
    const emptyMusic = stampOf([{ ...SCORE, text: "" }]);
    assert.equal(lanePromptText(BASE, emptyMusic, SEATS), BASE + NO_SPEECH_FIELD, "a textless music row: no field; the indicator rides");
  });

  it("an overlay-only row (dur 0) books no stamp: no sentence rides and the indicator does — unless live ref audio carries speech or the author already said so", () => {
    const none = stampOf([{ ...ROW, dur_frames: 0 }]);
    assert.deepEqual(none, {}, "no lane without a duration");
    assert.equal(lanePromptText(BASE, none, SEATS), BASE + NO_SPEECH_FIELD, "the indicator rides on a rowless text");
    assert.equal(lanePromptText(BASE, none, { ...SEATS, hearsRefAudio: true }), BASE, "live ref audio stands the indicator down");
    assert.equal(lanePromptText(`${BASE}; no dialogue`, none, SEATS), `${BASE}; no dialogue`, "an authored indication is honored, never doubled");
  });
});

describe("the extension's refusals (F8 — never a row that places nothing, cuts mid-word, or rides a lane it cannot pin)", () => {
  const refusal = async (doc: Record<string, unknown>, runId: string, re: RegExp, what: string): Promise<void> => {
    await expect(compose(doc, runId)).rejects.toThrow(re);
    // the lib door refuses the same doc (one law, both doors)
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Extend(
        { source_clip: "clips/take.mp4", extend_prompt: BASE, ...(doc.extend as Record<string, unknown>[])[0]! },
        { audio_clips: doc.audio_clips ?? [] }, FACTS, g, `${runId}_lib`,
      ),
      re, what,
    );
  };

  it("rows on a multi-window continuation refuse, naming the one-window law and the film door", async () => {
    const doc = extendDoc([ROW]);
    (doc.extend as Record<string, unknown>[])[0]!["extend_seconds"] = 379 / 24;
    await refusal(doc, "run_multi", /audio_clips states 1 row but 379 frames compose 2 windows.*composes its body once inside the loop.*carry the rows in ONE window \(extend_seconds ≤ 15\.08 s = 362 f\), or author the continuation as a film/s, "the chain cannot place a row on one window of a loop");
  });

  it("a row starting past the delivered frames refuses, naming the cure", async () => {
    await refusal(extendDoc([{ ...ROW, start_frame: 120 }]), "run_late", /audio_clips\[0\] \(dialogue, src line\.flac\) starts at frame 120 but the extension delivers 90 frames — the row would place nothing/s, "a row after the extension is a silent no-op");
  });

  it("a row running past the delivered frames refuses — never cut mid-word at the join", async () => {
    await refusal(extendDoc([{ ...ROW, start_frame: 40, dur_frames: 72 }]), "run_over", /audio_clips\[0\] \(dialogue, src line\.flac\) ends at frame 112 but the extension delivers 90 frames — the row would be cut mid-word at the join; extend_seconds ≥ 4\.67 s/s, "the row's end is judged against the window");
  });

  it("a negative start refuses — the extension clock counts from 0", async () => {
    await refusal(extendDoc([{ ...ROW, start_frame: -12 }]), "run_neg", /audio_clips\[0\].*starts at frame -12 — start_frame counts from the appended seconds' first frame \(0\) and is never negative/s, "no negative clock");
  });

  it("a row too short to size a slice refuses — it would overlay a line the model was never told to speak", async () => {
    await refusal(extendDoc([{ ...ROW, dur_frames: 1 }]), "run_tiny", /audio_clips\[0\] \(dialogue, src line\.flac, 1 f\) wins no lane — too short to size a conditioning slice/s, "an unconditioned overlay is the inert class");
  });

  it("two same-class starters refuse in the lane law's own voice", async () => {
    await refusal(extendDoc([ROW, { ...ROW, id: "l2", start_frame: 48, dur_frames: 36, text: "Go on." }]), "run_two", /two dialogue clips start inside one window \(doc frames 0–90\).*one lane per class per window/s, "the lane law judges");
  });

  it("a <d> line in extend_prompt under a dialogue row refuses — the row owns the words", async () => {
    const doc = extendDoc([ROW]);
    (doc.extend as Record<string, unknown>[])[0]!["extend_prompt"] = `${BASE}, <d>[English] ${LINE}</d>`;
    await refusal(doc, "run_clash", /h3-timeline extend: extend_prompt carries a <d> spoken line while an audio_clips row owns this window's dialogue.*Keep extend_prompt free of dialogue/s, "the heard-twice class refuses at both doors");
  });

  it("a wrong-typed rows seat refuses at the lib door (the walk already refuses it at the card door)", async () => {
    const g = new GraphBuilder();
    assert.throws(
      () => renderH3Extend({ source_clip: "clips/take.mp4", extend_prompt: BASE }, { audio_clips: "line.flac" }, FACTS, g, "run_typed"),
      /h3-timeline extend: audio_clips is stated as "line\.flac" — the rows are a list.*never silently reads as unbound/s,
    );
    await expect(compose(extendDoc([{ ...ROW }], { audio_clips: "line.flac" }), "run_typed_card")).rejects.toThrow(/audio_clips must be an array of clip rows/);
  });
});

describe("the rowless extension is byte-frozen (F8 adds a door; it moves nothing else)", () => {
  it("no mix, no x1m, one seam guide, the prompt verbatim, the join x0 + x1", async () => {
    const graph = await compose(extendDoc(), "run_plain");
    assert.equal(ofClass(graph, "MeliteFilmAudioMix").length, 0, "no mix without rows");
    assert.equal(ofClass(graph, "SaveVideo").some(([, n]) => n.inputs.filename_prefix === "run_plain/x1m"), false, "no x1m without rows");
    assert.equal(ofClass(graph, "MiniMaxH3AddGuide").length, 1, "the seam alone");
    assert.equal(ofClass(graph, "MeliteConcatVideos").length, 1, "the join alone");
    assert.equal(ofClass(graph, "MeliteConcatVideos")[0][1].inputs.videos, "run_plain/x0,run_plain/x1", "the landed join");
    assert.equal(r2vPrompt(graph), BASE, "the prompt rides verbatim — no indicator, no field");
    assert.equal(planPrompt(graph), BASE, "the plan carries the same verbatim text");
  });
});
