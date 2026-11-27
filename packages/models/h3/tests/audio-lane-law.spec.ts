// @contract models-h3-audio-lane-law
//
// THE AUDIO LANE LAW (2026-11-17, the M-17 burn: "audio that goes
// into window 1 gets put into window 2"): one lane per class per
// window, and the lane's OWNER is chosen by position, not row order —
// a clip that STARTS inside the window owns its class's lane; a
// seam-crossing clip owns only a window no same-class clip starts
// inside (the line continues, never restarts, but it yields to the
// window's own speech); two same-class clips starting inside ONE
// window refuse loud, naming both rows and the cure. Before this law
// first-wins row order owned the lane outright: a crossing row stole
// window 2's dialogue lane from the row that started there — window
// 2 re-performed line 1 while the real row conditioned nothing (the
// silent drop). chooseLaneClips (filmMix.ts) is the ONE owner — the
// conditioning stamps in actions.ts and computeFilmMix's conditioned
// set both drive it, so the stamps and the overlay cannot disagree.
//
// THE WORDS RIDE WHERE THE TAKE IS HEARD FROM ITS HEAD (2026-11-26,
// the operator's "audio being copied across windows"): the slice
// always continued correctly; the <d> sentence did not — it carried
// the whole line in every window the clip stamped, so a window that
// picked the take up mid-way re-spoke the line from its own frame 0
// and its rendition (which runs `genStart − start` frames past the
// take's end) walked out of the duck span as a second telling. One
// line, one telling: the words (and an sfx event's onset) ride a
// window iff that window hears the take from its head; a window that
// picks it up mid-way is told the voice continues. Music is exempt —
// a score is a state, not an onset.
//
// A CLIP THE WINDOW NEVER DELIVERS CONDITIONS NOTHING THERE
// (2026-11-27, EP01 Draft 2 Scene 2): a crosser whose whole overlap
// with a window is that window's carry head is heard by none of its
// delivered frames. It used to own the lane all the same — the line's
// tail pinned at frame 0, "the same voice is already speaking", and
// no no-speech indicator — and the window went on speaking words
// nobody wrote (run-51a6d59be053-1be84c54: 2.8 s of invented speech
// at −27…−42 dBFS). The same doc with the row ended before the
// window's generation span (run-0e33fe586e87-1bf5e7c9) took the
// indicator and was silent. Such a clip owns no lane in that window.
//
// DEPTH: the real composition root (loadCardDefs → def.schema →
// def.compose — the same door the run rides) plus the manifest and
// the chooser's own unit faces; the graph asserts ride
// MeliteAudioSlice nodes and the prompt's own <d> tag text, never a
// copy of the chooser's output.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { chooseLaneClips, computeFilmMix, parseFilmMixClips } from "../src/filmMix.ts";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LAWFUL_TEXT, LAWFUL_TEXT_CARRIED } from "../../../video/h3-timeline/tests/lawfulText.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type GNode = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, GNode>;

/** The burn's own doc shape: window 1 [0,124), window 2 [124,243),
 * line 1 starting at frame 4 and CROSSING the seam (4..149), line 2
 * starting INSIDE window 2 (150..242). */
const SEAM_DOC = {
  length: 243,
  audio_clips: [
    { src: "/art/tts/line1.flac", start_frame: 4, dur_frames: 145, text: "the first line, spoken over the seam", class: "dialogue" },
    { src: "/art/tts/line2.flac", start_frame: 150, dur_frames: 92, text: "the second line, starting inside window two", class: "dialogue" },
  ],
  calls: [
    { text: LAWFUL_TEXT, start_frame: 0, end_frame: 124 },
    { text: LAWFUL_TEXT_CARRIED, start_frame: 124, end_frame: 243 },
  ],
};

async function composeH3(doc: Record<string, unknown>, runId: string): Promise<Graph> {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const model: ModelFacts | undefined = facts.models["h3"];
  assert.ok(model, "the h3 family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

describe("chooseLaneClips — the lane's owner is chosen by position", () => {
  const clips = [
    { src: "line1.flac", start: 4, dur: 145, text: "one", srcIn: 0, cls: "dialogue" as const },
    { src: "line2.flac", start: 150, dur: 92, text: "two", srcIn: 0, cls: "dialogue" as const },
  ];

  it("a clip STARTING inside the window owns its class's lane over a crosser (the M-17 burn's own numbers)", () => {
    // window 2 [124,243), generation from 124−22 carry = 102
    const lanes = chooseLaneClips(clips, 124, 243, 102);
    assert.equal(lanes.dialogue, 1, "window 2's dialogue lane belongs to the row that STARTS there, never to the crossing row that merely spills in");
    // window 1 [0,124) — the crosser STARTS here
    const lanes1 = chooseLaneClips(clips, 0, 124, 0);
    assert.equal(lanes1.dialogue, 0, "window 1's dialogue lane belongs to the row that starts inside it");
  });

  it("a crosser owns an UNCONTESTED window (the line continues, never restarts)", () => {
    const solo = [{ src: "line1.flac", start: 4, dur: 145, text: "one", srcIn: 0, cls: "dialogue" as const }];
    const lanes = chooseLaneClips(solo, 124, 243, 102);
    assert.equal(lanes.dialogue, 0, "with no row starting inside window 2, the seam-crossing line still stamps it");
  });

  it("two same-class clips starting inside ONE window refuse loud, naming both rows and the cure", () => {
    const clashing = [
      { src: "a.flac", start: 4, dur: 60, text: "one", srcIn: 0, cls: "dialogue" as const },
      { src: "b.flac", start: 30, dur: 60, text: "two", srcIn: 0, cls: "dialogue" as const },
    ];
    assert.throws(
      () => chooseLaneClips(clashing, 0, 124, 0),
      /two dialogue clips start inside one window \(doc frames 0–124\) — "a\.flac" and "b\.flac".*one lane per class per window: end the first inside the window, merge the rows, or move the seam/s,
      "two starters cannot share the lane and neither may silently drop its conditioning",
    );
  });

  it("a sub-0.1s overlap cannot size a slice and owns no lane", () => {
    const grazed = [{ src: "tick.flac", start: 0, dur: 103, text: "", srcIn: 0, cls: "sfx" as const }];
    const lanes = chooseLaneClips(grazed, 124, 125, 102); // overlap [102,103) = 1 frame
    assert.equal(lanes.sfx, undefined, "a 1-frame overlap is below the slice node's floor — the clip stays overlay-only");
  });

  it("a crosser that ENDS inside the carry head owns no lane — no delivered frame of the window hears it", () => {
    // run-51a6d59be053-1be84c54's own numbers: window 2 [158,260),
    // generation from 158−22 = 136; the row [18,153) — its last 17
    // frames lie in the head the assembly trims
    const seamOnly = [{ src: "l42.flac", start: 18, dur: 135, text: "sir", srcIn: 0, cls: "dialogue" as const }];
    assert.equal(chooseLaneClips(seamOnly, 158, 260, 136).dialogue, undefined, "the window's delivered frames hold none of the row — it must not stamp it");
    assert.equal(chooseLaneClips(seamOnly, 0, 158, 0).dialogue, 0, "the row still owns the window it starts in");
    // one delivered frame is enough: the row [18,159) is heard at frame 158 and keeps the lane
    const oneFrameIn = [{ src: "l42.flac", start: 18, dur: 141, text: "sir", srcIn: 0, cls: "dialogue" as const }];
    assert.equal(chooseLaneClips(oneFrameIn, 158, 260, 136).dialogue, 0, "a crosser heard in the window's delivered frames keeps the lane");
    // a take STARTING in the carry head is not a crosser: both windows hear it from its head
    const inTheHead = [{ src: "l42.flac", start: 140, dur: 60, text: "sir", srcIn: 0, cls: "dialogue" as const }];
    assert.equal(chooseLaneClips(inTheHead, 158, 260, 136).dialogue, 0, "a take that starts inside the carry head keeps the lane");
  });
});

describe("computeFilmMix — the conditioned set drives the same law", () => {
  it("BOTH rows condition the film (the silent drop is the defect: row 2 conditioned nothing before the cure)", () => {
    const spans = [
      { start: 0, end: 124 },
      { start: 124, end: 243 },
    ];
    const clips = SEAM_DOC.audio_clips.map((c) => ({
      src: c.src as string, start: c.start_frame as number, dur: c.dur_frames as number,
      text: c.text as string, srcIn: 0, cls: "dialogue" as const,
    }));
    const manifest = computeFilmMix({ spans, clips, windowSecs: [124 / 24, 119 / 24] });
    // every dialogue row that owns a lane somewhere lands in the
    // conditioned set — index 1 (line 2) was the dropped row
    const ducked = manifest.duckSpans.length; // both rows' spans duck the film track
    assert.ok(ducked >= 2, `both conditioned rows duck the film track (got ${ducked})`);
  });

  it("a seam-only row still ducks the film track — its own seat in the window it starts in, held to that window's end (F11)", () => {
    const clips = [{ src: "l42.flac", start: 18, dur: 135, text: "sir", srcIn: 0, cls: "dialogue" as const }];
    const spans = [{ start: 0, end: 158 }, { start: 158, end: 260 }];
    const manifest = computeFilmMix({ spans, clips, windowSecs: [158 / 24, 85 / 24] });
    // the overlay seat is the row's own; the duck OPENS there and
    // (F11) HOLDS to window 1's end (158/24) because the row stops
    // 5f early — never into window 2, which the row never stamps
    assert.deepEqual(manifest.duckSpans, [{ start: 0.75, end: 6.583 }], "the row conditions the window it starts in: its duck opens at its seat and holds to that window's end");
    assert.deepEqual(manifest.placements.map((p) => p.filmSec), [0.75]);
  });
});

describe("the compose door — window 2 hears line 2, never a re-performance of line 1", () => {
  it("BOTH lines ride their own slice nodes at their own clocks (row 2's slice existed nowhere before the cure)", async () => {
    const graph = await composeH3(SEAM_DOC, "h3_lane_law_arm_1");
    const slices = Object.values(graph).filter((n) => n.class_type === "MeliteAudioSlice");
    const bySrc = new Map(slices.map((n) => [n.inputs["audio"] as string, n]));
    const line1 = bySrc.get("/art/tts/line1.flac");
    const line2 = bySrc.get("/art/tts/line2.flac");
    assert.ok(line1, "line 1 keeps its conditioning slice (it starts inside window 1)");
    assert.ok(line2, "line 2's conditioning slice must EXIST — its silent drop was the M-17 burn");
    // line 2 starts at frame 150; window 2's generation starts at
    // 124−22 carry = 102 → delay 48 frames = 2.0s at the 24 doc clock
    assert.equal(line2!.inputs["start_seconds"], 0, "line 2's slice starts at its source head (it starts after the generation head)");
    assert.equal(line2!.inputs["duration_seconds"], 3.833, "line 2's slice carries its own span (92 frames, ms-rounded)");
    // line 1: starts at 4 inside window 1 (generation head 0) → delay 4/24
    assert.equal(line1!.inputs["start_seconds"], 0);
    assert.equal(line1!.inputs["duration_seconds"], 120 / 24, "line 1's slice spans its in-window overlap [4,124)");
  });

  it("the prompt's <d> tag carries LINE 2's words on window 2 (the operator-visible half: window 2 re-performed line 1 before the cure)", async () => {
    const graph = await composeH3(SEAM_DOC, "h3_lane_law_arm_2");
    const texts = Object.values(graph).flatMap((n) => Object.values(n.inputs).filter((v): v is string => typeof v === "string"));
    const line1Tags = texts.filter((t) => t.includes("<d>") && t.includes("the first line"));
    const line2Tags = texts.filter((t) => t.includes("<d>") && t.includes("the second line"));
    assert.equal(line1Tags.length, 1, "line 1's tag rides exactly one window's prompt");
    assert.equal(line2Tags.length, 1, "line 2's tag rides exactly one window's prompt — the window where it STARTS");
  });

  it("two dialogue rows starting inside ONE window refuse the compose with the named cure", async () => {
    const doc = {
      ...SEAM_DOC,
      audio_clips: [
        { src: "/art/tts/a.flac", start_frame: 4, dur_frames: 60, text: "one", class: "dialogue" },
        { src: "/art/tts/b.flac", start_frame: 30, dur_frames: 60, text: "two", class: "dialogue" },
      ],
    };
    await expect(composeH3(doc, "h3_lane_law_arm_3")).rejects.toThrow(
      /two dialogue clips start inside one window.*end the first inside the window, merge the rows, or move the seam/s,
    );
  });
});

describe("THE WORDS RIDE WHERE THE TAKE IS HEARD FROM ITS HEAD (the copy-across-windows burn)", () => {
  // The operator's 2026-11-26 report: "audio being copied across
  // windows". The SLICE was always right — a window whose generation
  // starts late hears the take from `genStart − start` frames into
  // the source, so the film plays the line once. The WORDS were not:
  // the <d> sentence carried the WHOLE line in every window the clip
  // stamped, so a window that picks the take up mid-way re-spoke the
  // line from its own frame 0 — and its rendition, which runs
  // `genStart − start` frames past the take's end, walked out of the
  // duck span and played the line's tail a second time. One line, one
  // telling: the words ride a window iff that window HEARS the take
  // from its head (slice_start == the row's in-point).
  const LINE = "We should have turned back at the river.";
  const tags = (prompt: string): number => (prompt.match(/<d>\[English\]/g) ?? []).length;
  const slicesOf = (graph: Graph, window: number): GNode[] =>
    Object.entries(graph).filter(([id]) => id.startsWith(`window${window}_`)).map(([, n]) => n)
      .filter((n) => n.class_type === "MeliteAudioSlice");

  it("a line the second window picks up MID-WAY is never re-spoken there", async () => {
    // window 1 [0,124), window 2 [124,243) — window 2's generation
    // starts at 124−22 = 102. The row starts at 60, so window 1 hears
    // it from the head (delay 60f) and window 2 picks it up 42f in.
    const graph = await composeH3({
      length: 243,
      audio_clips: [
        { src: "/art/tts/long.flac", start_frame: 60, dur_frames: 120, text: LINE, class: "dialogue" },
      ],
      calls: [
        { text: LAWFUL_TEXT, start_frame: 0, end_frame: 124 },
        { text: LAWFUL_TEXT_CARRIED, start_frame: 124, end_frame: 243 },
      ],
    }, "h3_words_head_arm_1");
    const prompts = [1, 2].map((w) => Object.entries(graph)
      .filter(([id]) => id.startsWith(`window${w}_`))
      .map(([, n]) => n.inputs["prompt"])
      .filter((v): v is string => typeof v === "string" && v !== "")
      .join("\n"));
    const [p1, p2] = prompts as [string, string];
    expect(tags(p1)).toBe(1);
    expect(p1).toContain(LINE);
    expect(tags(p2)).toBe(0);
    expect(p2).not.toContain(LINE);
    // …and window 2 is told the truth about the voice it hears
    expect(p2).toMatch(/already speaking/);
    expect(p2).toMatch(/mid-sentence/);
    // the AUDIO half is untouched: the slice still continues the take
    const s2 = slicesOf(graph, 2);
    expect(s2.length).toBe(1);
    expect(s2[0]!.inputs["audio"]).toBe("/art/tts/long.flac");
    expect(s2[0]!.inputs["start_seconds"]).toBe(1.75);
    // the slice reaches back into the carry head: [102,180) = 78f
    expect(s2[0]!.inputs["duration_seconds"]).toBe(3.25);
    // window 1 hears the head, so its slice starts at the source head
    const s1 = slicesOf(graph, 1);
    expect(s1.length).toBe(1);
    expect(s1[0]!.inputs["start_seconds"]).toBe(0);
  });

  it("a line that ENDS inside the next window's carry head stamps nothing there — that window takes the no-speech indicator", async () => {
    // run-51a6d59be053-1be84c54's own numbers: 260f, window 1 [0,158),
    // window 2 [158,260) with its generation from 136, the row
    // [18,153): window 2's delivered frames open 5 frames after the
    // row ends.
    const graph = await composeH3({
      length: 260,
      audio_clips: [
        { src: "/art/tts/l42.flac", start_frame: 18, dur_frames: 135, text: LINE, class: "dialogue" },
      ],
      calls: [
        { text: LAWFUL_TEXT, start_frame: 0, end_frame: 158 },
        { text: LAWFUL_TEXT_CARRIED, start_frame: 158, end_frame: 260 },
      ],
    }, "h3_seam_only_arm_1");
    const promptOf = (w: number): string => Object.entries(graph)
      .filter(([id]) => id.startsWith(`window${w}_`))
      .map(([, n]) => n.inputs["prompt"])
      .filter((v): v is string => typeof v === "string" && v !== "")
      .join("\n");
    const [p1, p2] = [promptOf(1), promptOf(2)];
    // the window that holds the line speaks it, from its head
    expect(tags(p1)).toBe(1);
    expect(p1).toContain(LINE);
    expect(p1).toContain("At 00:00.750");
    // the next window holds none of it: no words, no continuing voice,
    // and the indicator the operator's gibberish law requires
    expect(tags(p2)).toBe(0);
    expect(p2).not.toContain(LINE);
    expect(p2).not.toMatch(/already speaking/);
    expect(p2).not.toMatch(/mid-sentence/);
    expect(p2).toContain("No speech or dialogue in this shot");
    // no speech-carrying audio reaches that window: no slice, no audio guide
    expect(slicesOf(graph, 2).length).toBe(0);
    const audioGuides2 = Object.entries(graph)
      .filter(([id]) => id.startsWith("window2_"))
      .map(([, n]) => n)
      .filter((n) => n.class_type === "MiniMaxH3AddGuide" && "audio" in n.inputs);
    expect(audioGuides2.length).toBe(0);
    // the holding window's slice is the whole take
    const s1 = slicesOf(graph, 1);
    expect(s1.length).toBe(1);
    expect(s1[0]!.inputs["start_seconds"]).toBe(0);
    expect(s1[0]!.inputs["duration_seconds"]).toBe(5.625);
    // the overlay half: the row's duck opens at its own seat and
    // holds to window 1's end (F11 — the row stops 5f early)
    const mix = Object.values(graph).find((n) => n.class_type === "MeliteFilmAudioMix");
    expect(mix?.inputs["duck_spans"]).toBe("0.75:6.583");
  });

  it("a take starting inside the CARRY head still speaks in both windows — each hears it from its head", async () => {
    // the row starts at 110, inside window 1's span [0,124) and 8f
    // into window 2's generation (102) — so BOTH windows hear the
    // take's head and both must move the mouth for it (window 1's
    // film plays the line's first 14f; window 2's starts 14f in).
    const graph = await composeH3({
      length: 243,
      audio_clips: [
        { src: "/art/tts/carry.flac", start_frame: 110, dur_frames: 60, text: LINE, class: "dialogue" },
      ],
      calls: [
        { text: LAWFUL_TEXT, start_frame: 0, end_frame: 124 },
        { text: LAWFUL_TEXT_CARRIED, start_frame: 124, end_frame: 243 },
      ],
    }, "h3_words_head_arm_2");
    const promptOf = (w: number): string => Object.entries(graph)
      .filter(([id]) => id.startsWith(`window${w}_`))
      .map(([, n]) => n.inputs["prompt"])
      .filter((v): v is string => typeof v === "string" && v !== "")
      .join("\n");
    // each window states the words at ITS OWN clock (one clock law)
    expect(promptOf(1)).toContain(`At 00:04.583`);
    expect(tags(promptOf(1))).toBe(1);
    expect(promptOf(2)).toContain(`At 00:00.333`);
    expect(tags(promptOf(2))).toBe(1);
    // both slices start at the source head — the model articulates
    // the line from its beginning in each
    expect(slicesOf(graph, 1)[0]!.inputs["start_seconds"]).toBe(0);
    expect(slicesOf(graph, 2)[0]!.inputs["start_seconds"]).toBe(0);
  });

  it("an sfx event picked up mid-way is marked as continuing, never struck again at 00:00", async () => {
    const EVENT = "the crane horn blasts twice across the yard";
    const graph = await composeH3({
      length: 243,
      audio_clips: [
        { src: "/art/sfx/horn.flac", start_frame: 60, dur_frames: 120, text: EVENT, class: "sfx" },
      ],
      calls: [
        { text: LAWFUL_TEXT, start_frame: 0, end_frame: 124 },
        { text: LAWFUL_TEXT_CARRIED, start_frame: 124, end_frame: 243 },
      ],
    }, "h3_words_head_arm_3");
    const promptOf = (w: number): string => Object.entries(graph)
      .filter(([id]) => id.startsWith(`window${w}_`))
      .map(([, n]) => n.inputs["prompt"])
      .filter((v): v is string => typeof v === "string" && v !== "")
      .join("\n");
    expect(promptOf(1)).toContain(`At 00:02.500, ${EVENT}`);
    const p2 = promptOf(2);
    expect(p2).toContain(EVENT);
    expect(p2).toMatch(/already under way/);
    expect(p2).toMatch(/no fresh onset/);
    expect(p2).not.toContain(`At 00:00.000, ${EVENT}`);
  });
});

describe("the clipping lane — in_frames (the source in-point)", () => {
  it("parse: absent = 0 (the head, byte-identical to every prior film); stated rides; the int-string restore holds", () => {
    const [head, mid, strung] = parseFilmMixClips([
      { src: "a.flac", start_frame: 4, dur_frames: 40, text: "one" },
      { src: "a.flac", start_frame: 150, dur_frames: 40, in_frames: 48, text: "two" },
      { src: "a.flac", start_frame: 60, dur_frames: 40, in_frames: "96", text: "three" },
    ])
    assert.equal(head!.srcIn, 0)
    assert.equal(mid!.srcIn, 48)
    assert.equal(strung!.srcIn, 96)
  });

  it("parse: a negative or non-numeric in-point refuses loud, never a silent clamp", () => {
    expect(() => parseFilmMixClips([
      { src: "a.flac", start_frame: 4, dur_frames: 40, in_frames: -12, text: "x" },
    ])).toThrow(/in_frames -12.*non-negative number of frames/)
    expect(() => parseFilmMixClips([
      { src: "a.flac", start_frame: 4, dur_frames: 40, in_frames: "later", text: "x" },
    ])).toThrow(/in_frames "later".*non-negative number of frames/)
  });

  it("the compose door: the conditioning slice starts in_frames into the source, not at its head", async () => {
    const graph = await composeH3({
      ...SEAM_DOC,
      audio_clips: [
        { src: "/art/tts/line1.flac", start_frame: 4, dur_frames: 40, in_frames: 48, text: "the first line, from its middle", class: "dialogue" },
      ],
    }, "h3_lane_law_inpoint_1");
    const slice = Object.values(graph).find((n) => n.class_type === "MeliteAudioSlice");
    assert.ok(slice, "the conditioned clip rides a slice node");
    assert.equal(slice!.inputs["start_seconds"], 2, "48 frames at the 24 doc clock = 2s into the SOURCE (the operator's clipping ask: the model hears the segment the film plays)")
  });

  it("the manifest row: in_sec rides ONLY when the in-point is past the head (a head row stays byte-frozen, the wired-arm shape law)", async () => {
    const graph = await composeH3({
      ...SEAM_DOC,
      audio_clips: [
        { src: "/art/tts/line1.flac", start_frame: 4, dur_frames: 40, in_frames: 72, text: "from three seconds in", class: "dialogue" },
        { src: "/art/tts/line2.flac", start_frame: 150, dur_frames: 92, text: "the second line", class: "dialogue" },
      ],
    }, "h3_lane_law_inpoint_2");
    const mix = Object.values(graph).find((n) => n.class_type === "MeliteFilmAudioMix");
    assert.ok(mix, "the film tail seats");
    const rows = JSON.parse(mix!.inputs["clips_json"] as string) as Array<Record<string, unknown>>;
    const inRow = rows.find((r) => typeof r.src === "string" && (r.src as string).includes("line1"));
    const headRow = rows.find((r) => typeof r.src === "string" && (r.src as string).includes("line2"));
    assert.equal(inRow!["in_sec"], 3, "72 frames at 24fps = 3s into the source — the overlay starts where the conditioning slice starts")
    assert.equal("in_sec" in (headRow ?? {}), false, "a head-playing row omits the key entirely (byte-frozen, the pre-lane shape)")
  });
});
