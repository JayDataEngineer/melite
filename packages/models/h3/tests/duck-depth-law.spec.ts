// @contract models-h3-duck-depth-law
//
// THE DUCK DEPTH LAW (defect A3, cured 2026-11-25): how far the
// generated track yields under a conditioned row follows WHY it yields.
// A placed dialogue row IS the voice — the operator's EP01
// (`run-e0e296e18f37-124ae24a`) measured the model's own rendition at
// -14 dB still a second voice (raw correlation 0.970 against the source
// take, 1.0000 at -48 dB) and every film spec of the show had to state
// `duck_depth_db: -48` by hand. A score-only film keeps the shallow bed
// dip. The operator's stated knob always wins in both shapes, and the
// default has ONE home (computeFilmMix): a schema `.default()` would
// outvote the film's own rows before the mix ever read them.
//
// DEPTH: the real manifest builder (the seat actions.ts wires into
// MeliteFilmAudioMix.duck_db) and the real schema object the tool face
// publishes — never a literal copied out of either.
import { describe, it, expect } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { computeFilmMix, parseFilmMixClips } from "../src/filmMix.ts";
import "../../../../tests/helpers/boot-models.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { LAWFUL_TEXT } from "../../../video/h3-timeline/tests/lawfulText.ts";
import { paramSchema } from "../src/schema.ts";

const CLOCKS = { start: 0, end: 124 };
const DOC_FPS = 24;

const dialogueRow = {
  src: "/art/tts/line1.flac",
  start_frame: 4,
  dur_frames: 48,
  text: "the line the take is the voice of",
  class: "dialogue",
};
const musicRow = { src: "/art/score/bed.flac", start_frame: 4, dur_frames: 48, class: "music" };

const seat = (row: Record<string, unknown>) => ({
  src: row.src as string,
  start: row.start_frame as number,
  dur: row.dur_frames as number,
  text: (row.text as string) ?? "",
  srcIn: 0,
  cls: row.class as "dialogue" | "music" | "sfx",
});

function manifestOf(rows: Array<Record<string, unknown>>, duckDb?: number) {
  return computeFilmMix({
    spans: [CLOCKS],
    clips: rows.map(seat),
    windowSecs: [(CLOCKS.end - CLOCKS.start) / DOC_FPS],
    fps: DOC_FPS,
    ...(duckDb === undefined ? {} : { duckDb }),
  });
}

describe("the depth default follows the reason for ducking", () => {
  it("a placed dialogue row silences the generated voice under it — the unstated depth is -48", () => {
    const m = manifestOf([dialogueRow]);
    assert.ok(m.duckSpans.length >= 1, "the dialogue row ducks the film track");
    expect(m.duckDb).toBe(-48);
  });

  it("a score-only film keeps the shallow bed dip — the unstated depth is -14", () => {
    const m = manifestOf([musicRow]);
    assert.ok(m.duckSpans.length >= 1, "the music row conditions the window, so the track still ducks");
    expect(m.duckDb).toBe(-14);
  });

  it("the operator's knob wins in both shapes (the default is a default, never a floor)", () => {
    expect(manifestOf([dialogueRow], -22).duckDb).toBe(-22);
    expect(manifestOf([musicRow], -9).duckDb).toBe(-9);
    expect(manifestOf([dialogueRow, musicRow], -30).duckDb).toBe(-30);
  });

  it("a mixed film (dialogue + music) takes the dialogue depth — one voice, the line's", () => {
    expect(manifestOf([dialogueRow, musicRow]).duckDb).toBe(-48);
  });
});

describe("the compose door wires the derived depth (the film tail reads ONE number)", () => {
  const FACTS = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "engines", "comfyui-cordis", "data", "model-facts.json");
  const facts = loadFacts(FACTS, { getModel, registryIds, registryModel });

  async function composedDuckDb(doc: Record<string, unknown>, runId: string): Promise<unknown> {
    const defs = await loadCardDefs();
    const def = defs.get("h3-timeline");
    assert.ok(def, "the composition root serves the h3-timeline card");
    const model: ModelFacts | undefined = facts.models["h3"];
    assert.ok(model, "the h3 family facts row serves");
    const g = new GraphBuilder();
    def.compose(def.schema({ ...doc }), model, g, runId);
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const mix = Object.values(graph).find((n) => n.class_type === "MeliteFilmAudioMix");
    assert.ok(mix, "the film tail seats a MeliteFilmAudioMix");
    return mix!.inputs["duck_db"];
  }

  // the operator's EP01 shape: spoken rows whose words condition the windows
  const filmDoc = (clips: Array<Record<string, unknown>>) => ({
    calls: [
      { text: LAWFUL_TEXT, start_frame: 0, end_frame: 124 },
      { text: LAWFUL_TEXT, start_frame: 124, end_frame: 243 },
    ],
    audio_clips: clips,
  });

  it("an unstated knob reaches the mix as -48 when the film places dialogue", async () => {
    const depth = await composedDuckDb(filmDoc([{ ...dialogueRow }]), "run_duck_depth_dialogue");
    expect(depth).toBe(-48);
  });

  it("a stated knob still rides verbatim (the operator's EP01 line: duck_depth_db: -48)", async () => {
    const depth = await composedDuckDb({ ...filmDoc([{ ...dialogueRow }]), duck_depth_db: -22 }, "run_duck_depth_stated");
    expect(depth).toBe(-22);
  });
});

describe("the default has ONE home", () => {
  it("the schema face declares no default for duck_depth_db (a schema default would outvote the film's rows)", () => {
    const field = (paramSchema as unknown as {
      dict?: Record<string, { meta?: { default?: unknown; min?: number; max?: number } }>;
    }).dict?.duck_depth_db;
    assert.ok(field, "the tool face still declares the knob");
    expect(field!.meta?.default).toBeUndefined();
    // …and the knob keeps its bounds (the operator's -48 is legal).
    expect(field!.meta?.min).toBe(-48);
    expect(field!.meta?.max).toBe(0);
  });

  it("the defaults are named once, in the manifest builder (never a literal at the wire)", () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "web-kit", "contracts", "src", "filmMix.ts"), "utf8");
    assert.equal(src.match(/DIALOGUE_DUCK_DB = -48/g)?.length, 1, "one dialogue default");
    assert.equal(src.match(/MUSIC_DUCK_DB = -14/g)?.length, 1, "one music default");
    assert.ok(!/\?\?\s*-14|:\s*-14\b/.test(src), "no bare -14 fallback left beside the named constant");
  });
});
