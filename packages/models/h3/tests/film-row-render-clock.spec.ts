// @contract models-h3-row-render-clock
//
// THE ROW RENDER-CLOCK LAW (defect F7, cured 2026-11-25): a film row is
// seated, stamped, and ducked on the clock the film RENDERS, never the
// clock the doc authored. `admitCallSpans` re-tiles: a window whose
// authored length is not 22+17k snaps, and every window after it starts
// where the rendered film now ends. The rows kept their authored frames,
// so from the first snap on a row authored inside window N fell before
// N's rendered start — the lane law gave it to N-1: the card voiced the
// line in BOTH windows and ducked on the authored second (receipt
// run-b455015a839a-1268cd59: authored 107/107/124/107 rendered
// 0-107 / 107-226 / 226-362 / 362-481).
//
// DEPTH: the retime is judged against the admission walk's OWN output
// (never a literal), and the door arms ride the real compose — the
// graph's MeliteFilmAudioMix clips_json and the conditioning prompts,
// the two seats the operator's burn reads.
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
import { admitCallSpans, retimeRowsToRendered, transitionOverlap } from "../src/timelineContract.ts";

const DOC_FPS = 24;
const ROW_TEXT = "the line the take is the voice of";

/** The receipt's four-window doc: authored starts 0/107/214/338 with
 *  lengths 107/107/124/107 (the operator's run-b455015a839a-1268cd59
 *  film). Every later window slides because window 3 snaps. */
const RECEIPT_CALLS = [
  { text: LAWFUL_TEXT, start_frame: 0, end_frame: 107 },
  { text: LAWFUL_TEXT, start_frame: 107, end_frame: 214 },
  { text: LAWFUL_TEXT, start_frame: 214, end_frame: 338 },
  { text: LAWFUL_TEXT, start_frame: 338, end_frame: 445 },
];

const row = (start: number, cls: "dialogue" | "music" = "dialogue") => ({
  src: `/art/tts/row-${start}.flac`,
  start,
  dur: 48,
  text: ROW_TEXT,
  srcIn: 0,
  cls,
});

/** The window whose RENDERED span contains the frame — derived from the
 *  admit walk, the same ownership the lane law applies. */
const renderedOwner = (spans: ReadonlyArray<{ start: number; end: number }>, frame: number): number =>
  spans.findIndex((s) => frame >= s.start && frame < s.end);

describe("the retime slides rows onto the rendered clock (the receipt's doc)", () => {
  const authored = RECEIPT_CALLS.map((c) => ({ start: c.start_frame }));
  const { spans: rendered } = admitCallSpans(RECEIPT_CALLS, transitionOverlap);

  it("every row lands inside the rendered window it was authored in", () => {
    // one row in each authored window, plus boundary seats
    const frames = [10, 107, 150, 214, 250, 338, 340, 440];
    const moved = retimeRowsToRendered(authored, rendered, frames.map((f) => row(f)));
    for (let i = 0; i < frames.length; i++) {
      const authoredOwner = renderedOwner(RECEIPT_CALLS.map((c) => ({ start: c.start_frame, end: c.end_frame })), frames[i]!);
      expect(authoredOwner, `frame ${frames[i]} is authored in a window`).toBeGreaterThanOrEqual(0);
      expect(renderedOwner(rendered, moved[i]!.start), `row authored at ${frames[i]}`).toBe(authoredOwner);
    }
  });

  it("a row authored inside the last window is stamped there (the receipt's double-voicing is dead)", () => {
    const moved = retimeRowsToRendered(authored, rendered, [row(340)]);
    // window 4 renders 362-481: the row must be past 362, never before it
    expect(moved[0]!.start).toBeGreaterThan(362);
    expect(renderedOwner(rendered, moved[0]!.start)).toBe(3);
  });

  it("lengths and every other field are held — only the clock slides", () => {
    const rows = [row(10), row(250), row(340, "music")];
    const moved = retimeRowsToRendered(authored, rendered, rows);
    expect(moved).toHaveLength(rows.length);
    for (let i = 0; i < rows.length; i++) {
      expect({ ...moved[i]!, start: 0 }).toEqual({ ...rows[i]!, start: 0 });
    }
    // the slide is what moved, and it is monotone with the window index
    expect(moved[0]!.start).toBe(rows[0]!.start);
    expect(moved[2]!.start).toBeGreaterThan(rows[2]!.start);
  });

  it("a verbatim doc is untouched (the same spans, byte-identical rows)", () => {
    const same = RECEIPT_CALLS.map((c) => ({ start: c.start_frame }));
    const rows = [row(10), row(150)];
    expect(retimeRowsToRendered(same, same, rows)).toEqual(rows);
  });

  it("a disagreeing walk is refused, never half-mapped", () => {
    const rows = [row(250)];
    expect(retimeRowsToRendered(authored, rendered.slice(0, 2), rows)).toEqual(rows);
    expect(retimeRowsToRendered(authored, [], rows)).toEqual(rows);
  });
});

describe("the compose door seats and stamps rows on the rendered clock", () => {
  const FACTS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "engines", "comfyui-cordis", "data", "model-facts.json");
  const facts = loadFacts(FACTS, { getModel, registryIds, registryModel });

  async function composeFilm(calls: Array<Record<string, unknown>>, rowStart: number) {
    const defs = await loadCardDefs();
    const def = defs.get("h3-timeline");
    assert.ok(def, "the composition root serves the h3-timeline card");
    const model: ModelFacts | undefined = facts.models["h3"];
    assert.ok(model, "the h3 family facts row serves");
    const g = new GraphBuilder();
    def.compose(
      def.schema({
        calls,
        audio_clips: [{ src: "/art/tts/line1.flac", start_frame: rowStart, dur_frames: 48, text: ROW_TEXT, class: "dialogue" }],
      }),
      model,
      g,
      "run_f7_row_clock",
    );
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const mix = Object.values(graph).find((n) => n.class_type === "MeliteFilmAudioMix");
    assert.ok(mix, "the film tail seats a MeliteFilmAudioMix");
    return { graph, clips: JSON.parse(mix!.inputs["clips_json"] as string) as Array<{ start_sec: number }> };
  }

  /** A doc whose FIRST window snaps (110 is not 22+17k → 124), so every
   *  later window slides by 14 frames; the row is authored inside the
   *  second authored window (110→217) and must render in the second. */
  const RETILE_CALLS = [
    { text: LAWFUL_TEXT, start_frame: 0, end_frame: 110 },
    { text: LAWFUL_TEXT, start_frame: 110, end_frame: 217 },
  ];

  it("the mix row is booked on the retimed second, not the authored one", async () => {
    const { spans } = admitCallSpans(RETILE_CALLS, transitionOverlap);
    const [{ start: renderedStart }] = retimeRowsToRendered(
      RETILE_CALLS.map((c) => ({ start: c.start_frame })),
      spans,
      [{ start: 115 }],
    );
    const { clips } = await composeFilm(RETILE_CALLS, 115);
    expect(clips[0]!.start_sec).toBeCloseTo(renderedStart! / DOC_FPS, 6);
    // the authored frame would have booked 4.792 s — the defect's number
    expect(clips[0]!.start_sec).not.toBeCloseTo(115 / DOC_FPS, 6);
  });

  it("the line conditions the window it renders in, and only that window", async () => {
    const { graph } = await composeFilm(RETILE_CALLS, 115);
    const prompts = Object.entries(graph)
      .filter(([, n]) => typeof n.inputs["prompt"] === "string")
      .map(([id, n]) => [id, n.inputs["prompt"] as string] as const);
    const carriers = prompts.filter(([, p]) => p.includes(ROW_TEXT)).map(([id]) => id);
    assert.ok(carriers.length > 0, "the placed row conditions its window");
    for (const id of carriers) expect(id.startsWith("window2_"), `carrier ${id} is not the row's rendered window`).toBe(true);
  });

  it("no snap, no slide: a grid-legal doc books the authored second", async () => {
    const gridCalls = [
      { text: LAWFUL_TEXT, start_frame: 0, end_frame: 107 },
      { text: LAWFUL_TEXT, start_frame: 107, end_frame: 226 },
    ];
    const { clips } = await composeFilm(gridCalls, 150);
    expect(clips[0]!.start_sec).toBeCloseTo(150 / DOC_FPS, 6);
  });
});
