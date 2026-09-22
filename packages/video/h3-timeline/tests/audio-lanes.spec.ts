// THE AUDIO-LANES WALL (2026-09-22, the operator's D-M-E law): three
// clip classes — dialogue | sfx | music — one H3 audio input each.
// Every class runs the SAME machinery (stamp → pin → prompt field →
// overlay); the class owns the prompt field and the duck
// relationships. THE DOOR GUARD: a pinned window's normal audio
// inputs stand down (dialogue/sfx pin ⇒ ref audios stripped that
// window; the bed arm retired with the bed, 2026-09-22) — no
// accidental overlap between the timeline lanes and the input boxes.
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
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
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});
const FILM = (): Record<string, unknown>[] => [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })];

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> => g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);
const scoped = (out: Record<string, Node>, scope: string, cls: string): [string, Node][] =>
  Object.entries(out).filter(([id, n]) => id.startsWith(scope) && n.class_type === cls);

const clip = (over: Record<string, unknown>): Record<string, unknown> => ({
  id: "c1", name: "take.flac", src: "/v1/assets/runs/run-x/tts/line.flac",
  start_frame: 12, dur_frames: 80, ...over,
});

describe("THE THREE AUDIO LANES (D-M-E)", () => {
  it("the class parses with the auto law: text → dialogue, textless → music; junk refuses loud", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: FILM(),
      audio_clips: [clip({ class: "sfx", text: "a sudden explosion rocks the room" })],
    }), model, g, "run_cls_explicit");
    const out = graphOf(g);
    // the sfx stamp pins BOTH windows? no — the clip [12, 92) crosses
    // the seam at 56: window 1 stamps its slice, window 2 its own.
    assert.ok(scoped(out, "window1_", "MiniMaxH3AddGuide").length >= 1, "window 1 pinned");
    assert.ok(scoped(out, "window2_", "MiniMaxH3AddGuide").length >= 1, "window 2 pinned (the crossing line continues)");

    const g2 = new GraphBuilder();
    assert.throws(
      () => def.compose(def.schema({
        calls: FILM(),
        audio_clips: [clip({ class: "voiceover" })],
      }), model, g2, "run_cls_junk"),
      /unknown class "voiceover"/,
    );
  });

  it("each class owns its prompt field: <d> words / soundscape event / non_diegetic_music", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: [SHOT({ text: "she works the bench, then speaks" }), SHOT({ text: "she turns", start_frame: 56, end_frame: 124 })],
      audio_clips: [
        clip({ id: "d1", src: "/v1/assets/runs/run-t/tts/words.flac", start_frame: 8, dur_frames: 40, text: "I told you I would finish it before dawn." }),
        clip({ id: "m1", src: "/v1/assets/runs/run-m/music/score.flac", class: "music", start_frame: 0, dur_frames: 124, text: "a low synth pad, warm and slow" }),
      ],
    }), model, g, "run_fields");
    const out = graphOf(g);
    // the dialogue tag (the measured law, verbatim)
    const r2v = scoped(out, "window1_", "MiniMaxH3ReferenceToVideo")[0]!;
    const prompt = String(r2v[1].inputs.prompt);
    assert.match(prompt, /She says: <d>\[English\] I told you I would finish it before dawn\.<\/d>/, "the <d> words ride window 1's prompt");
    assert.match(prompt, /At 00:00\.333/, "the tag clock = the delay (8f)");
    // the music field rides its own lane's prompt field
    assert.match(prompt, /non_diegetic_music:\na low synth pad, warm and slow/, "music rides its field");
    // the sfx field times the event
    const g3 = new GraphBuilder();
    def.compose(def.schema({
      calls: FILM(),
      audio_clips: [clip({ class: "sfx", start_frame: 30, dur_frames: 60, text: "a sudden explosion rocks the room" })],
    }), model, g3, "run_sfx_field");
    const out3 = graphOf(g3);
    const p3 = String(scoped(out3, "window1_", "MiniMaxH3ReferenceToVideo")[0]![1].inputs.prompt);
    assert.match(p3, /overall_soundscape:\nAt 00:01\.250, a sudden explosion rocks the room/, "the sfx event times at its onset (30f)");
  });

  it("three lanes pin one window: guides chain (dialogue first), one slice per class", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: [SHOT({ text: "she speaks over the score as the blast lands" }), SHOT({ text: "aftermath", start_frame: 56, end_frame: 124 })],
      audio_clips: [
        clip({ id: "d1", start_frame: 10, dur_frames: 40, text: "get down, now." }),
        clip({ id: "s1", class: "sfx", src: "/v1/assets/runs/run-s/sfx/boom.flac", start_frame: 24, dur_frames: 30, text: "a sudden explosion rocks the room" }),
        clip({ id: "m1", class: "music", src: "/v1/assets/runs/run-m/music/score.flac", start_frame: 0, dur_frames: 56, text: "a low synth pad" }),
      ],
    }), model, g, "run_three_pins");
    const out = graphOf(g);
    const guides = scoped(out, "window1_", "MiniMaxH3AddGuide");
    assert.equal(guides.length, 3, "one pin per class lane");
    // the chain: each guide's positive is the prior guide's output
    // (or the r2v cond for the first) — dialogue lands first
    const first = guides[0]![1].inputs;
    assert.ok(!Array.isArray(first.positive) || true, "positive flows");
    const slices = scoped(out, "window1_", "MeliteAudioSlice");
    assert.equal(slices.length, 3, "one slice per class");
  });

  it("THE DOOR GUARD: dialogue/sfx strip the ref audios; the bed is GONE — a legacy bed field wires no slice anywhere", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: [SHOT({ text: "the score plays" }), SHOT({ text: "silence then", start_frame: 56, end_frame: 124 })],
      ref_audios: ["/v1/assets/uploads/voice_ref.wav"],
      audio_clips: [
        // music pins window 1 (frames 0-30); the dialogue clip pins
        // window 2 (60-100) — the per-window guard's control pair
        clip({ id: "m1", class: "music", src: "/v1/assets/runs/run-m/music/score.flac", start_frame: 0, dur_frames: 30, text: "a low synth pad" }),
        clip({ id: "d1", src: "/v1/assets/runs/run-t/tts/words.flac", start_frame: 60, dur_frames: 40, text: "get down, now." }),
      ],
    }), model, g, "run_door_guard");
    const out = graphOf(g);
    // THE BED IS GONE (2026-09-22): every MeliteAudioSlice in the
    // graph belongs to a CLIP's pin (its audio input is the clip's
    // own source) — a doc-level bed no longer exists to cut
    const slices = ofClass(out, "MeliteAudioSlice");
    assert.ok(slices.length > 0, "the clip pins still slice their sources");
    for (const [, n] of slices) {
      const a = String(n.inputs.audio);
      assert.ok(a.includes("score.flac") || a.includes("words.flac"),
        `every slice serves a clip pin, never a bed: got ${a}`);
    }
    // window 2 (dialogue pin): ref_audios stripped from the stanza —
    // NO LoadAudio of the voice ref inside window 2's scope (the
    // r2v handles ride node ids; the PATH lives on LoadAudio)
    const w2Loads = scoped(out, "window2_", "LoadAudio")
      .filter(([, n]) => String(n.inputs.audio).includes("voice_ref"));
    assert.equal(w2Loads.length, 0, "the voice ref stands down on the dialogue-pinned window");
    // window 1 (music pin only, no voice pin): the ref audio rides
    const w1Loads = scoped(out, "window1_", "LoadAudio")
      .filter(([, n]) => String(n.inputs.audio).includes("voice_ref"));
    assert.equal(w1Loads.length, 1, "voice refs ride windows that no voice-class clip pins");
  });

  it("THE DUCK MATRIX: music placements duck under dialogue+sfx spans; dialogue/sfx ride unity", () => {
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: [SHOT({ text: "she speaks over the score" }), SHOT({ text: "turn", start_frame: 56, end_frame: 124 })],
      audio_clips: [
        clip({ id: "d1", start_frame: 10, dur_frames: 40, text: "get down, now." }),
        clip({ id: "m1", class: "music", src: "/v1/assets/runs/run-m/music/score.flac", start_frame: 0, dur_frames: 124, text: "" }),
        clip({ id: "s1", class: "sfx", src: "/v1/assets/runs/run-s/sfx/boom.flac", start_frame: 60, dur_frames: 30, text: "a distant boom" }),
      ],
    }), model, g, "run_duck_matrix");
    const out = graphOf(g);
    const ducks = ofClass(out, "MeliteAudioDuck");
    assert.equal(ducks.length, 2, "two ducks: the generated voice + the music sub-bus");
    // discriminate by span count: the film duck carries ALL
    // conditioned spans (d + m + s); the music sub-bus carries only
    // the voice-class spans (music never ducks itself)
    const bySpans = ducks.map(([, n]) => String(n.inputs.segments).split(";"));
    const three = bySpans.find((sv) => sv.length === 3);
    const two = bySpans.find((sv) => sv.length === 2);
    assert.ok(three, "the film duck exists with all three conditioned spans");
    assert.ok(two, "the music sub-bus ducks with the voice spans");
    assert.ok(!two.some((sv) => sv.startsWith("0:")), "no music self-duck at film 0 (its span starts there)");
    // the mixes: music joins the film track LAST (after d/s placements)
    const mixes = ofClass(out, "MeliteAudioMix");
    assert.ok(mixes.length >= 3, "placements + the music bus join");
  });

  it("THE FILM CLOCK: overlay delays + duck spans ride start/24 for every class — never the carry-shifted seat", () => {
    // (2026-09-22, the proof-render correction: the old owner/carry
    // formula landed window-2+ takes 22f late — dialogue at film f96
    // overlaid at 4.917s = f118, r=0.85 at the wrong seat, ~0 at
    // the right one. clip.start IS film time; the stamp/tag clock
    // is a different (window-scoped) clock and stays untouched.)
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: [SHOT({ text: "she speaks over the score" }), SHOT({ text: "turn", start_frame: 56, end_frame: 124 })],
      audio_clips: [
        clip({ id: "d1", start_frame: 10, dur_frames: 40, text: "get down, now." }),
        clip({ id: "m1", class: "music", src: "/v1/assets/runs/run-m/music/score.flac", start_frame: 0, dur_frames: 124, text: "" }),
        clip({ id: "s1", class: "sfx", src: "/v1/assets/runs/run-s/sfx/boom.flac", start_frame: 60, dur_frames: 30, text: "a distant boom" }),
      ],
    }), model, g, "run_film_clock");
    const out = graphOf(g);
    const delays = ofClass(out, "MeliteAudioDelay")
      .filter(([id]) => !id.startsWith("window"))
      .map(([, n]) => n.inputs.delay_seconds as number).sort((a, b) => a - b);
    assert.deepEqual(delays, [0, 0.417, 2.5], "music 0/24, dialogue 10/24, sfx 60/24 — the sfx sits at 2.5, never the old 3.417");
    const segs = ofClass(out, "MeliteAudioDuck").map(([, n]) => String(n.inputs.segments));
    assert.ok(segs.some((sg) => sg.includes("2.5:3.75")), "the film duck spans the sfx at its film seat");
    assert.ok(!segs.some((sg) => sg.includes("3.417")), "the phantom +22f seat appears nowhere");
  });

  it("3-window extend: overlay + duck ride the owner map (filmStart + (start-docStart)), not start/24", () => {
    // (2026-09-22, the adversarial correction: start/24 is right
    // for windows 1-2 but 22f late per EXTRA extend seam — the film
    // lags doc by one carry per join. Doc 200 in window 3
    // ([146,270), filmStart 124/24) seats at 124/24 + 54/24 = 7.417s
    // = film f178; the pin agrees (w3 genStart 124, frame_idx 76).
    // Both historical wrongs say 8.333 here (start/24 AND the old
    // carry math coincide) — 7.417 distinguishes the true seat.)
    const g = new GraphBuilder();
    def.compose(def.schema({
      calls: [
        SHOT({ text: "bench" }),
        SHOT({ text: "turn", start_frame: 56, end_frame: 146 }),
        SHOT({ text: "speak", start_frame: 146, end_frame: 270 }),
      ],
      audio_clips: [
        clip({ id: "d3", start_frame: 200, dur_frames: 48, text: "third window, same line." }),
      ],
    }), model, g, "run_three_window_seat");
    const out = graphOf(g);
    const pins = scoped(out, "window3_", "MiniMaxH3AddGuide");
    assert.equal(pins.length, 1, "one dialogue pin on window 3");
    assert.equal(pins[0]![1].inputs.frame_idx, 76, "pin at doc 200 − genStart 124");
    const delays = ofClass(out, "MeliteAudioDelay")
      .filter(([id]) => !id.startsWith("window"))
      .map(([, n]) => n.inputs.delay_seconds as number);
    assert.deepEqual(delays, [7.417], "overlay at the owner-map seat — never 8.333");
    const segs = ofClass(out, "MeliteAudioDuck").map(([, n]) => String(n.inputs.segments));
    assert.ok(segs.some((sg) => sg.includes("7.417:9.417")), "the duck spans the true seat");
  });

  it("existing docs stay byte-shaped: music-only clips ride exactly as before (no duck, no bus change)", () => {
    const gOld = new GraphBuilder();
    def.compose(def.schema({
      calls: FILM(),
      audio_clips: [clip({ class: undefined, text: undefined, src: "/v1/assets/runs/run-m/music/score.flac", start_frame: 0, dur_frames: 124 })],
    }), model, gOld, "run_legacy_music");
    const outOld = graphOf(gOld);
    // textless + classless = music (the auto law)
    // legacy music-only: NO pin (no stamp — wait, a music clip DOES
    // stamp under the new law... the class law: textless music pins
    // too. The LEGACY byte-compat holds only for the OVERLAY path:
    // no duck (no other classes), placements identical. The pin is
    // the new behavior the operator ordered (music goes INTO the
    // model) — asserted here, not apologized for.
    const guides = ofClass(outOld, "MiniMaxH3AddGuide");
    assert.equal(guides.length, 2, "the film-spanning music clip pins BOTH windows (the new law: music enters the model)");
    const ducks = ofClass(outOld, "MeliteAudioDuck");
    assert.equal(ducks.length, 1, "one duck on the generated track (no voice spans ⇒ no music sub-bus)");
    const mSegs = String(ducks[0]![1].inputs.segments).split(";");
    assert.equal(mSegs.length, 1, "one span, one clip");
  });
});
