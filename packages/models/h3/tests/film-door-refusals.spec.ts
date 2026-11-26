// @contract models-h3-film-door-refusals
//
// THE PROMOTED TAIL'S SEAT AND THE FILM CEILING (defects F4/F5/F6, cured
// 2026-11-25): two refusals at the compose door, where the ownership and
// the arithmetic are both in hand.
//
// F4 + F5 are one cause. The CLIPS-STITCH promotion appends a 51 f silent
// tail to a one-call doc carrying a Music row and mints it with NO seat
// beyond its text (by design: a seat in the tail can invent a line). A
// SEATLESS window derives the NON-reference arm, and that arm wires the
// generator's canvas to CrossViewPrepareClip in a re-shoot — so the tail
// rendered at the PREPARED canvas (896 wide) while every guided window
// rendered at the film's own (864): the tail's continuation died in the
// engine, `ValueError: The linear temporal mask requires matching latent
// spatial dimensions; got (30, 54) -> (30, 56)` (receipt
// run-61fe80a093bc). Without a re-shoot the same seatless tail renders
// its own constant text with nothing anchoring the film's scene and
// free-forms a different room (run-9e54c56bd0b9 — a living room in the
// tail of a beach film). THE TAIL-STAMP LAW: a row must REACH the tail.
// A row spanning it stamps it (chooseLaneClips hands a crossing clip to
// the window no same-class clip starts inside), and a stamped window is a
// reference window — the film's canvas and the film's own conditioning.
// A row that stops at the sole call leaves the tail seatless: refused.
//
// F6 is the ceiling. spanStanzaFrames books `22 + 17k` held under
// GRID_MAX_FRAMES (362) with a Math.min, so a window honestly authored
// 345 with a 22 f carry requested 367 and was silently seated 362: the
// clip rendered 17 f short of its own doc span and the film ran off the
// end of the frame it saved. A request past the ceiling now refuses at
// the seat, naming both numbers and the cure.
//
// DEPTH: every arm rides the real card def (the served h3-timeline face),
// the real schema walk and the real compose — no literal copies.
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import "../../../../tests/helpers/boot-models.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { LAWFUL_TEXT } from "../../../video/h3-timeline/tests/lawfulText.ts";

type Graph = Record<string, { class_type: string; inputs: Record<string, unknown> }>;

const FACTS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "engines", "comfyui-cordis", "data", "model-facts.json");
const facts = loadFacts(FACTS, { getModel, registryIds, registryModel });

/** The one-call doc the promotion appends its tail after: 0→107 is
 *  22 + 17·5, so the tail seats at 107→158 with no snap anywhere. */
const SOLE_CALL = { text: LAWFUL_TEXT, start_frame: 0, end_frame: 107 };
const TAIL_END = 158;

/** A music row on the doc's one call — the CLIPS-STITCH promotion's seat. */
const musicRow = (start: number, dur: number, text: string) => ({
  src: "/art/tts/bed.flac",
  start_frame: start,
  dur_frames: dur,
  text,
  class: "music",
});

async function compose(path: string, params: Record<string, unknown>) {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const model: ModelFacts | undefined = facts.models["h3"];
  assert.ok(model, "the h3 family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema(params), model, g, path);
  return g.toJSON() as Graph;
}

/** Every window-scoped generation length the graph states. */
const windowLengths = (graph: Graph): number[] =>
  Object.entries(graph)
    .filter(([id]) => /^window\d+_/.test(id))
    .map(([, n]) => n.inputs["length"])
    .filter((v): v is number => typeof v === "number");

/** The prompt a window's generation actually hears. */
const windowPrompt = (graph: Graph, window: number): string => {
  const hits = Object.entries(graph)
    .filter(([id]) => id.startsWith(`window${window}_`))
    .map(([, n]) => n.inputs["prompt"])
    .filter((v): v is string => typeof v === "string" && v !== "");
  return hits.join("\n");
};

describe("the promoted silent tail must carry a seat", () => {
  it("a row that stops at the sole call leaves the tail seatless — refused by name", async () => {
    // 48 f of music inside the first window only: it never reaches 107.
    await expect(compose("run_f5_seatless_tail", {
      calls: [SOLE_CALL],
      audio_clips: [musicRow(0, 48, "a low warm bed")],
    })).rejects.toThrow(/promoted silent tail/);
  });

  it("the refusal names the tail's length, the engine's error, both receipts and the cures", async () => {
    const err = await compose("run_f5_seatless_tail_named", {
      calls: [SOLE_CALL],
      audio_clips: [musicRow(0, 48, "a low warm bed")],
    }).then(() => null, (e: unknown) => e as Error);
    assert.ok(err, "the seatless tail refuses at the door");
    const msg = err.message;
    // the tail's own constant and the two receipts the defect burned
    expect(msg).toContain("51 f");
    expect(msg).toContain("(30, 54) -> (30, 56)");
    expect(msg).toContain("run-61fe80a093bc");
    expect(msg).toContain("run-9e54c56bd0b9");
    // the cures, in the operator's own terms
    expect(msg).toContain("Spread the audio row across the tail");
    expect(msg).toContain("two calls");
    // the non-reference arm is NAMED as the cause, not the tail's text
    expect(msg).toContain("non-reference arm");
    expect(msg).toContain("PREPARED canvas");
  });

  it("a music row that crosses into the tail stamps it — the film composes and the tail hears the bed", async () => {
    // start 0, dur 158: the row STARTS in window 1 and reaches the tail's
    // last frame. The lane law hands the crossing clip to the window no
    // same-class clip starts inside — the tail — so the tail is stamped.
    const graph = await compose("run_f5_rowed_tail", {
      calls: [SOLE_CALL],
      audio_clips: [musicRow(0, TAIL_END, "warm strings carry the dusk")],
    });
    expect(windowPrompt(graph, 2)).toContain("warm strings carry the dusk");
    expect(windowPrompt(graph, 2)).toContain("non_diegetic_music");
  });

  it("a row that STARTS inside the tail stamps it too", async () => {
    const graph = await compose("run_f5_row_inside_tail", {
      calls: [SOLE_CALL],
      audio_clips: [musicRow(120, TAIL_END - 120, "a low drone under the room")],
    });
    expect(windowPrompt(graph, 2)).toContain("a low drone under the room");
  });
});

describe("the film ceiling is refused, never clamped", () => {
  /** 345 is 22 + 17·19 — grid-legal as a first window. Carried, it
   *  requests 367, past GRID_MAX_FRAMES (362): the walk refuses it and
   *  the seat's own guard stands behind that refusal. */
  const CARRIED_CALLS = [
    { text: LAWFUL_TEXT, start_frame: 0, end_frame: 345 },
    { text: LAWFUL_TEXT, start_frame: 345, end_frame: 690 },
  ];

  it("a carried 345 f window requests 367 and refuses at the ceiling", async () => {
    const err = await compose("run_f6_carried_ceiling", { calls: CARRIED_CALLS })
      .then(() => null, (e: unknown) => e as Error);
    assert.ok(err, "the over-ceiling window refuses at the door");
    const msg = err.message;
    expect(msg).toContain("367");
    expect(msg).toContain("362");
    expect(msg).toContain("345→690");
  });

  it("a first window at the lattice's own 345 seats at 345, exactly what it authors", async () => {
    const graph = await compose("run_f6_cut_seam", {
      calls: [CARRIED_CALLS[0]!, { ...CARRIED_CALLS[1]!, transition: "cut" }],
    });
    const lengths = windowLengths(graph);
    expect(lengths.length).toBeGreaterThan(0);
    for (const l of lengths) expect(l).toBe(345);
  });

  it("a carried window at the carried ceiling seats at 362, never clamped below its request", async () => {
    // 340 is 17·20 — a carried window's legal content; +22 = 362, the
    // ceiling, and the seat must book that whole generation.
    const graph = await compose("run_f6_carried_ceiling_seat", {
      calls: [
        { text: LAWFUL_TEXT, start_frame: 0, end_frame: 345 },
        { text: LAWFUL_TEXT, start_frame: 345, end_frame: 685 },
      ],
    });
    const lengths = windowLengths(graph);
    expect(lengths).toContain(362);
    expect(lengths).toContain(345);
  });
});
