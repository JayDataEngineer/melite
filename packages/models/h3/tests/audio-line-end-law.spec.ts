// @contract models-h3-audio-line-end-law
//
// THE LINE'S END IS STATED AND HELD (2026-11-27, F11 — EP01 Draft 2
// run-1fe005f28233-12ab5a02: "It wasn't a code." heard at 7.62–9.56 s
// and again at 11.0–12.0 s): the dialogue sentence stated the line's
// start and never its end, the duck span was the row's span, and the
// no-speech indicator rode only windows with NO dialogue stamp — so
// the frames between a window's last row and the window's end carried
// the model's own reading of the line at full level, under a prompt
// that had only said "the speaker says the line".
//
// THE LAW, two halves on one clock:
//   PROMPT — a row that ENDS inside a window is told where, on the
//   window's own clock (the start's clock), and that nobody speaks
//   after it. A row that runs past the window's end is continued by
//   the next window and states no end here (a false end would silence
//   a line still being spoken).
//   MIX — a DIALOGUE row that stops before the end of the last window
//   that hears it HOLDS the film track's duck to that window's end
//   (the ghost hold). The row's own seat, the music bus's duck (the
//   score returns under room tone), and every sfx row are untouched.
//
// DEPTH: the real composition root (loadCardDefs → def.schema →
// def.compose — the door the run rides) for the prompt and the mix
// node; computeFilmMix's own face for the span arithmetic.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { computeFilmMix, stanzaSecs } from "../src/filmMix.ts";
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

const LINE = "It wasn't a code.";
const W1 = { start: 0, end: 124 };
const W2 = { start: 124, end: 243 };
// THE COMPOSE-CLOCK WINDOW SECONDS: window 1 renders its span, k≥2
// carries spanOverlap — the stanza is carry + span (stanzaSecs' law)
const W2_SPANS = [W1, W2];
const W2_SECS = stanzaSecs(W2_SPANS);
const dialogue = (start: number, dur: number, src = "line.flac") =>
  ({ src, start, dur, text: LINE, srcIn: 0, cls: "dialogue" as const });

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

function promptOf(graph: Graph, w: number): string {
  return Object.entries(graph)
    .filter(([id]) => id.startsWith(`window${w}_`))
    .map(([, n]) => n.inputs["prompt"])
    .filter((v): v is string => typeof v === "string" && v !== "")
    .join("\n");
}

function duckSpansOf(graph: Graph): string {
  const mix = Object.values(graph).find((n) => n.class_type === "MeliteFilmAudioMix");
  assert.ok(mix, "the film tail seats its mix node");
  return String(mix.inputs["duck_spans"]);
}

describe("computeFilmMix — the ghost hold", () => {
  it("a dialogue row that stops before its window's end holds the film track's duck to that end", () => {
    // the row [18,100) in the window [0,124): its own span ends at
    // 100/24; the hold carries the duck to 124/24 — the 24 frames
    // where the model's own reading used to return at full level
    const manifest = computeFilmMix({ spans: [W1], clips: [dialogue(18, 82)], windowSecs: [124 / 24] });
    assert.deepEqual(manifest.duckSpans, [{ start: 0.75, end: 5.167 }]);
    assert.deepEqual(manifest.placements.map((p) => [p.filmSec, p.durSec]), [[0.75, 3.417]], "the overlay seat and fit are the row's own — the hold touches only the duck");
  });

  it("a row that runs to the window's end holds nothing new", () => {
    const manifest = computeFilmMix({ spans: [W1, W2], clips: [dialogue(100, 24)], windowSecs: W2_SECS });
    assert.deepEqual(manifest.duckSpans, [{ start: 4.167, end: 5.167 }], "the row's own end IS window 1's end — no second span, no reach into window 2");
  });

  it("the hold ends at the LAST window that hears the row — never in the silent window after it", () => {
    const manifest = computeFilmMix({ spans: [W1, W2], clips: [dialogue(4, 96)], windowSecs: W2_SECS });
    assert.deepEqual(manifest.duckSpans, [{ start: 0.167, end: 5.167 }], "held to window 1's film end (124/24), where the next window's own track begins");
  });

  it("a crosser that ENDS inside the next window holds to THAT window's end", () => {
    // the row [60,180) starts in window 1 and ends 63f into window 2:
    // the hold is window 2's film end — the owner map's accumulation
    // over the stanza clock (124 + 141 − 22 carry)/24 = the film's end
    const manifest = computeFilmMix({ spans: W2_SPANS, clips: [dialogue(60, 120)], windowSecs: W2_SECS });
    assert.deepEqual(manifest.duckSpans, [{ start: 2.5, end: 10.125 }]);
    assert.equal(manifest.filmSec, 10.125, "the hold ends exactly at the film's end");
  });

  it("an sfx row ending early is NOT held, and the music bus's duck is never held", () => {
    const sfx = { src: "horn.flac", start: 18, dur: 82, text: "a horn", srcIn: 0, cls: "sfx" as const };
    const sfxOnly = computeFilmMix({ spans: [W1], clips: [sfx], windowSecs: [124 / 24] });
    assert.deepEqual(sfxOnly.duckSpans, [{ start: 0.75, end: 4.167 }], "an event is not a voice — its span is its own");
    const both = computeFilmMix({ spans: [W1], clips: [dialogue(18, 82), sfx], windowSecs: [124 / 24] });
    assert.deepEqual(both.duckSpans, [{ start: 0.75, end: 5.167 }, { start: 0.75, end: 4.167 }], "the film track: the voice held, the horn not");
    assert.deepEqual(both.musicDuckSpans, [{ start: 0.75, end: 4.167 }, { start: 0.75, end: 4.167 }], "the score yields to the spoken words and the event for their own spans, then returns under the room tone");
  });

  it("a row that cannot size a slice conditions nothing and holds nothing", () => {
    const manifest = computeFilmMix({ spans: [W1], clips: [dialogue(18, 0)], windowSecs: [124 / 24] });
    assert.deepEqual(manifest.duckSpans, []);
  });
});

describe("the compose door — the line's end rides the window's own clock and the mix holds it", () => {
  it("a row that ENDS inside the window: the sentence states the end, the mix node holds the duck to the window's end", async () => {
    const graph = await composeH3({
      length: 243,
      audio_clips: [{ src: "/art/tts/line.flac", start_frame: 18, dur_frames: 82, text: LINE, class: "dialogue" }],
      calls: [
        { text: LAWFUL_TEXT, start_frame: 0, end_frame: 124 },
        { text: LAWFUL_TEXT_CARRIED, start_frame: 124, end_frame: 243 },
      ],
    }, "h3_line_end_arm_1");
    const p1 = promptOf(graph, 1);
    expect(p1).toContain("At 00:00.750");
    expect(p1).toContain(`<d>[English] ${LINE}</d>`);
    expect(p1).toContain("The line ends at 00:04.167; after it nobody speaks — room tone only.");
    expect((p1.match(/The line ends at/g) ?? []).length).toBe(1), "one end sentence, on the start's own clock";
    expect(p1).not.toContain("No speech or dialogue in this shot");
    // the window after the row is silent by law: the indicator, no
    // continuing voice, and the duck does not reach into it
    const p2 = promptOf(graph, 2);
    expect(p2).toContain("No speech or dialogue in this shot");
    expect(p2).not.toContain("The line ends at");
    expect(duckSpansOf(graph)).toBe("0.75:5.167");
  });

  it("a line the second window picks up MID-WAY and that ends there: the continuing voice is told where it stops; the first window, which the line runs past, states no end", async () => {
    const graph = await composeH3({
      length: 243,
      audio_clips: [{ src: "/art/tts/line.flac", start_frame: 60, dur_frames: 120, text: LINE, class: "dialogue" }],
      calls: [
        { text: LAWFUL_TEXT, start_frame: 0, end_frame: 124 },
        { text: LAWFUL_TEXT_CARRIED, start_frame: 124, end_frame: 243 },
      ],
    }, "h3_line_end_arm_2");
    const [p1, p2] = [promptOf(graph, 1), promptOf(graph, 2)];
    expect(p1).toContain("At 00:02.500");
    expect(p1).not.toContain("The line ends at"), "the row runs past window 1's end — a stated end there would silence a line the next window still speaks";
    expect(p2).toMatch(/already speaking/);
    expect(p2).toContain("The line ends at 00:03.250; after it nobody speaks — room tone only.");
    expect((p2.match(/The line ends at/g) ?? []).length).toBe(1), "the end is appended to the continuing sentence, never a second sentence";
    // the mix: the row's seat is 60/24; the hold runs to window 2's
    // film end (the owner map's 10.125), where the film ends
    expect(duckSpansOf(graph)).toBe("2.5:10.125");
  });
});
