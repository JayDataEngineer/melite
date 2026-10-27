// @contract cards-cinemadir-skill
//
// THE CINEMADIR SKILL WALL (2026-10-27, the CinemaDir lane): the
// camera-grammar skill is a contract surface — everything it teaches
// must be a construct the estate actually serves, and its honesty
// section must keep promising inside the graph's real envelope. Four
// arms, each with its own firing path:
//
//   ARM 1 — EXISTENCE + FRONTMATTER: the leaf sits at the served walk
//     (estate-queue cardRows reads src/agents/skills/<dir>/SKILL.md),
//     carries name: cinemadir, and a description the serving slice
//     (description.slice(0, 200)) never cuts. Toggling the skill out
//     (rename/remove frontmatter) reds THIS arm.
//   ARM 2 — DOOR VOCABULARY (depth): the numbers and fields the skill
//     teaches are read back from the REAL contract (the imported
//     timelineContract constants, the card gate's rider list, the h3
//     schema rows) — the skill cannot drift off the served truth.
//   ARM 3 — THE SPAN LAW: the skill's worked examples must COMPOSE —
//     calls tile, spans ride the card's own grid families, keyframe
//     pins fall inside a window. An edited example that the write door
//     would refuse reds here before an agent learns it.
//   ARM 4 — THE HONESTY LAW: the no-native-geometric-camera line, the
//     no-camera-parameter-seat line, and the re-shoot ceiling are
//     present; the retired spellings never ride; the loop names the
//     three bench doors; validate teaching keeps the craft-defer
//     condition; no pre-read demand creeps in.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DOC_FPS_DEFAULT,
  GRID_BASE_FRAMES,
  GRID_MAX_FRAMES,
  GRID_STEP_FRAMES,
  REF_CAPS,
  SEAM_OVERLAP_FRAMES,
} from "@melite/models-h3/timelineContract";

const ROOT = join(__dirname, "..");
const read = (rel: string): string => readFileSync(join(ROOT, rel), "utf-8");

const SKILL = "src/agents/skills/cinemadir/SKILL.md";
const TOOL_TS = "src/tool.ts";
const CARD_TS = "src/card.ts";
const H3_SCHEMA = join(ROOT, "..", "..", "models", "h3", "src", "schema.ts");

// the card's own span families (timelineContract spanFor): the first
// call and any "cut" call author a 22+17k span inside [22, 362]; a
// carried call authors a 17k span.
const isCutFamilySpan = (span: number): boolean =>
  span >= GRID_BASE_FRAMES &&
  span <= GRID_MAX_FRAMES &&
  (span - GRID_BASE_FRAMES) % GRID_STEP_FRAMES === 0;
const isCarrySpan = (span: number): boolean =>
  span % GRID_STEP_FRAMES === 0 && span >= GRID_STEP_FRAMES;

interface ExampleCall {
  start_frame: number;
  end_frame: number;
  transition?: string;
}
interface ExampleParams {
  calls?: ExampleCall[];
  keyframes?: Array<{ frame: number }>;
}

describe("THE CINEMADIR SKILL WALL (the camera grammar rides the real doors)", () => {
  const md = read(SKILL);

  it("ARM 1: the leaf exists at the served walk with name cinemadir and an uncut description", () => {
    const fm = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(md);
    expect(fm, "frontmatter block present — the gate reads name/description from it").not.toBeNull();
    const name = /^name:\s*(.+)$/m.exec(fm![1]!);
    const description = /^description:\s*(.+)$/m.exec(fm![1]!);
    expect(name?.[1]?.trim(), "frontmatter name is cinemadir").toBe("cinemadir");
    expect(description?.[1]?.trim().length ?? 0, "description non-empty").toBeGreaterThan(0);
    expect(
      description?.[1]?.trim().length ?? Infinity,
      "description fits the serving slice (readDoc slices to 200) uncut",
    ).toBeLessThanOrEqual(200);
  });

  it("ARM 2: the taught numbers and fields are the estate's real ones", () => {
    // grid + seam + fps literals come from the imported contract, so a
    // contract change reds until the skill is re-cut
    for (const constant of [
      ["grid base", GRID_BASE_FRAMES],
      ["grid step", GRID_STEP_FRAMES],
      ["grid max", GRID_MAX_FRAMES],
      ["seam overlap", SEAM_OVERLAP_FRAMES],
      ["doc fps", DOC_FPS_DEFAULT],
    ] as const) {
      expect(
        md.includes(String(constant[1])),
        `the skill teaches the real ${constant[0]} (${String(constant[1])})`,
      ).toBe(true);
    }
    // the keyframes rider the skill teaches is legal at the compose gate
    expect(read(CARD_TS).match(/'calls', 'audio_clips', 'keyframes'/), "card gate rider list admits keyframes").not.toBeNull();
    // the tool plane declares the per-call camera fields it teaches
    const tool = read(TOOL_TS);
    expect(tool.match(/start_frame/), "tool spec carries start_frame").not.toBeNull();
    expect(tool.match(/transition/), "tool spec carries transition").not.toBeNull();
    // the h3 schema declares the reference rails the skill teaches,
    // and the ref_videos cap the skill cites is the real cap
    const schema = readFileSync(H3_SCHEMA, "utf-8");
    for (const field of ["ref_images", "ref_videos", "ref_audios", "ref_video_trims"]) {
      expect(schema.includes(`${field}:`), `h3 schema declares ${field}`).toBe(true);
    }
    expect(
      md.includes(`max ${REF_CAPS.videos}`),
      `the skill cites the real ref_videos cap (${REF_CAPS.videos})`,
    ).toBe(true);
  });

  it("ARM 3: every worked example composes — calls tile on the grid families, pins sit inside windows", () => {
    const blocks = [...md.matchAll(/```json\n([\s\S]*?)```/g)].map((m) => m[1]!);
    expect(blocks.length, "the skill carries json worked examples").toBeGreaterThanOrEqual(3);
    for (const block of blocks) {
      const parsed = JSON.parse(block) as { params?: ExampleParams };
      const calls = parsed.params?.calls ?? [];
      expect(calls.length, "the example films at least one call").toBeGreaterThan(0);
      let prevEnd = 0;
      for (const [i, call] of calls.entries()) {
        expect(Number.isInteger(call.start_frame) && Number.isInteger(call.end_frame), "integer frames").toBe(true);
        expect(call.end_frame, "end after start").toBeGreaterThan(call.start_frame);
        expect(call.start_frame, `call ${i} tiles the film (starts at the previous end)`).toBe(prevEnd);
        // THE FAMILY LAW the write door enforces (timelineContract
        // spanFor): index 0 and "cut" author 22+17k; a carried call 17k.
        const span = call.end_frame - call.start_frame;
        const cutFamily = i === 0 || call.transition === "cut";
        expect(
          cutFamily ? isCutFamilySpan(span) : isCarrySpan(span),
          `call ${i} span ${span} rides its family (cut=${String(cutFamily)})`,
        ).toBe(true);
        expect(call.end_frame, "the film stays inside the grid").toBeLessThanOrEqual(GRID_MAX_FRAMES);
        prevEnd = call.end_frame;
      }
      for (const pin of parsed.params?.keyframes ?? []) {
        expect(
          calls.some((c) => pin.frame >= c.start_frame && pin.frame < c.end_frame),
          `keyframe pin ${pin.frame} falls inside a window [start, end)`,
        ).toBe(true);
      }
    }
  });

  it("ARM 4: the honesty law is taught, the retired spellings never ride, the loop names the three doors", () => {
    // the honesty contract: no native geometric camera conditioning, no
    // camera parameter seat, and the re-shoot ceiling — the agent must
    // never promise what the graph cannot deliver
    expect(md.match(/NO native geometric camera node/), "the no-native-geometric law is stated").not.toBeNull();
    expect(md.match(/no camera parameter seat/), "the no-camera-seat law is stated").not.toBeNull();
    expect(md.match(/small-to-moderate re-angles/), "the re-shoot ceiling is stated").not.toBeNull();
    expect(md.match(/2\.5D parallax/), "the 2.5D parallax ceiling is stated").not.toBeNull();
    // the retired spellings (the agent-docs wall's law, this skill's arm)
    for (const [name, re] of [
      ["per-call audio", /"audio"\s*:|\bcall'?s? `audio`|per-call `audio`/],
      ["audio_stem", /audio_stem/],
      ["seam_carry", /seam_carry/],
      ["retired step spelling", /\bsampler_steps\b|\bsampling_steps\b/],
    ] as Array<[string, RegExp]>) {
      expect(md, `retired ${name}`).not.toMatch(re);
    }
    // the bench loop, spelled in the door order
    expect(md.match(/melite_discover → melite_load → melite_construct/), "the loop names the three doors").not.toBeNull();
    // the craft-defer law: a validate line that names the construct
    // carries its deferral condition
    for (const line of md.split("\n")) {
      if (/validate/.test(line) && /melite_construct/.test(line)) {
        expect(line, `validate line defers to the landing's verdict: ${line.trim()}`).toMatch(
          /only|needs no second opinion|did not just write/,
        );
      }
    }
    // no pre-read demand (the estate craft-defer law's class)
    expect(md, "no read-before-writing demand").not.toMatch(
      /(read|reading)\s+before\s+(writing|composing)|before\s+you\s+(write|compose)/i,
    );
  });
});
