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
    { text: "a woman at a table", start_frame: 0, end_frame: 124 },
    { text: "she looks up", start_frame: 124, end_frame: 243 },
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
