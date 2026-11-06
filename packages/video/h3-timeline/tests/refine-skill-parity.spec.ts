// @contract cards-h3-refine-skill
// refine-skill-parity.spec.ts — THE SKILL-PARITY WALL for the refine
// skill (2026-11-13, the F24 window cure's doc half): the skill's
// dial table, its window law, and its one-door roster are DERIVED
// from the code's own homes, never a prose copy.
//
// THE BURN this closes: the refine arm had NO skill doc at all (the
// skills audit's coverage gap) while the arm itself burned twice —
// once on a dead dotted `mode.scale`, once on loading the WHOLE clip
// into a 2x handoff that OOMs past the measured ceiling (report
// §13.2). A doc written once and never tied to the constants would
// drift the moment either the card's bands or the ceiling moved.
//
// THE LAW: every bounded dial the card serves appears in the
// SKILL.md table with the SAME band and default; the select seat
// states the same default the card serves; the window's measured
// numbers (the 56 f design default, the 141 f OOM ceiling) are the
// CODE's constants, converted and stated, never a hand-typed
// recollection; every one of the fifteen one-door pairs is named;
// and the doc names what is live-proven and what is still unproven
// without citing any history archaeology (no dated stamp, receipt
// path, or run id in served copy).
import "../../../../tests/helpers/boot-models.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import {
  REFINE_2X_OOM_FRAMES, REFINE_DEFAULT_CLIP_SECONDS, REFINE_WORKAROUND_WIDE_FRAMES,
} from "../../../models/h3/src/refine.ts";
import { MAX_COMPOSED_WINDOWS } from "../../../models/h3/src/timelineContract.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(HERE, "..", "src", "agents", "skills");
const readSkill = (name: string): string =>
  readFileSync(join(SKILLS, name, "SKILL.md"), "utf-8");

let def: CardDefinition;
let refineKind: Record<string, unknown>;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  refineKind = ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
    .find((k) => k.kind === "refine")!;
  assert.ok(refineKind, "the served card carries the refine mod kind");
});

type FieldRow = {
  name: string; type?: string; default: unknown;
  min?: number; max?: number; options?: unknown[];
};
const fields = (): Map<string, FieldRow> =>
  new Map(
    ((refineKind.fields as FieldRow[] | undefined) ?? []).map((f) => [f.name, f]),
  );

/** The skill's dial line: `- \`name\` (BAND, DEFAULT) — prose`. Returns
 *  the band text and numeric default, or null when the line is absent. */
const dialLine = (md: string, name: string): { band: string; def: number } | null => {
  const m = md.match(new RegExp(`^\\s*- \`${name}\` \\(([^,]+), ([^)]+)\\)`, "m"));
  if (m === null) return null;
  const bare = (s: string): number => Number(s.trim().replace("−", "-"));
  return { band: m[1]!.trim(), def: bare(m[2]!) };
};

/** Parse the skill's band notation: `lo–hi` (unicode minus and en dash,
 *  the doc's own typography). */
const bandOf = (band: string): [number, number] => {
  const num = (s: string): number => Number(s.replace("−", "-"));
  const [lo, hi] = band.split("–");
  return [num(lo!), num(hi!)];
};

describe("the refine skill's dial table agrees with the code's own homes", () => {
  it("ARM 1 — every number-bounded dial carries the SAME band and served default (numbers, not phrases)", () => {
    const md = readSkill("refine");
    const served = fields();
    const bounded = [...served.values()].filter(
      (f) => typeof f.min === "number" && typeof f.max === "number",
    );
    expect(bounded.length, "the card serves bounded dials to judge").toBeGreaterThan(4);
    for (const row of bounded) {
      const line = dialLine(md, row.name);
      assert.ok(line !== null, `SKILL.md states the ${row.name} band`);
      assert.deepEqual(bandOf(line!.band), [row.min, row.max],
        `SKILL.md's ${row.name} band ${line!.band} == the served [${row.min}, ${row.max}]`);
      assert.equal(line!.def, row.default,
        `SKILL.md's ${row.name} default ${line!.def} == the served ${String(row.default)}`);
    }
  });

  it("ARM 2 — the select seat is documented with the card's own served default and option count", () => {
    const md = readSkill("refine");
    const mode = fields().get("mode");
    assert.equal(mode?.type, "select", "the card serves mode as a select");
    assert.equal(mode?.default, "scale by multiplier");
    assert.equal(mode?.options?.length, 3, "three sizing modes");
    assert.match(md, /`mode` \(select, 'scale by multiplier'\)/,
      "the doc quotes the served default verbatim");
    // the three served option values are the node's own three modes
    for (const value of (mode!.options as Array<{ value?: string }>).map((o) => o.value)) {
      assert.ok(md.includes(`'${value}'`) || md.includes(`\`${value}\``),
        `the doc names the served option ${String(value)}`);
    }
  });

  it("ARM 3 — THE WINDOW LAW is the CODE's constants, converted, never a hand-typed memory", () => {
    // F24: the doc states the measured sweep's numbers; the numbers
    // come from the renderer's own exports, so a ceiling move reds
    // the prose instead of rotting it (the F2 stamp law's cheap half).
    // W-7: the taught window is the DESIGN — the ~2 s carry-joined
    // window (the 2 s class's rung), never the workaround's wide
    // window as law.
    const md = readSkill("refine");
    const defaultFrames = Math.round(REFINE_DEFAULT_CLIP_SECONDS * 24);
    assert.equal(defaultFrames, 56, "the default window is the DESIGN 56 f (the 2 s class's rung)");
    assert.equal(REFINE_2X_OOM_FRAMES, 141, "the ceiling is the measured-OOM 141 f");
    assert.equal(REFINE_WORKAROUND_WIDE_FRAMES, 90, "the workaround's wide window stays the measured-green 90 f (history, never the design)");
    const ceilingSeconds = REFINE_2X_OOM_FRAMES / 24;
    assert.match(md, new RegExp(`\`clip_seconds\` \\([^)]*${String(REFINE_DEFAULT_CLIP_SECONDS)}\\)`),
      "the dial line's default is the code's REFINE_DEFAULT_CLIP_SECONDS");
    assert.ok(md.includes(`${defaultFrames} f`),
      `the doc states the ${defaultFrames} f design window`);
    assert.ok(md.includes(`${REFINE_WORKAROUND_WIDE_FRAMES} f`),
      `the doc cites the ${REFINE_WORKAROUND_WIDE_FRAMES} f workaround window as history, never as the design`);
    assert.ok(md.includes(`${REFINE_2X_OOM_FRAMES} f`),
      `the doc states the ${REFINE_2X_OOM_FRAMES} f measured OOM ceiling`);
    assert.ok(md.includes(ceilingSeconds.toFixed(3)),
      `the doc states the refuse point as seconds too (${ceilingSeconds.toFixed(3)} s)`);
    assert.match(md, /DESIGN window/i,
      "the doc teaches the design window, never the workaround as law");
    assert.match(md, /2 s class/,
      "the doc names the 2 s class the default window belongs to");
    assert.match(md, /22\+17k/,
      "the doc names the engine's token grid, so the ~2 s window's rung is stated, never guessed");
    assert.match(md, /workaround's wide window/,
      "the doc frames 90 f as the hard-cut workaround's history");
    // the workaround's default number (3.75) is gone from the doc
    expect(md).not.toMatch(/3\.75/);
    assert.match(md, /frame_load_cap/, "the doc names the loader seat the window rides");
    assert.match(md, /skip_first_frames/, "the doc names the loader seat the start rides");
    assert.match(md, /trimmed to the same window|soundtrack is trimmed/i,
      "the doc states the audio law: the soundtrack follows the same window");
  });

  it("ARM 4 — the skill names ALL FIFTEEN one-door pairs, derived from the card's armed kinds", () => {
    // GAPS-19: the door roster is no longer "max_stack === 1" — the
    // refine door stacks its windows (max_stack 32) while staying ONE
    // door. A door is every armed kind except the co-arming adapter
    // bag (loras rides WITH a door, it is not one), so the derivation
    // follows the kind, not the stack ceiling.
    const kinds = ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
      .filter((k) => typeof k.param_key === "string" && k.kind !== "loras")
      .map((k) => String(k.param_key));
    expect(kinds.sort()).toEqual(["extend", "refine", "repair", "replace", "reshoot", "upscale"]);
    const md = readSkill("refine");
    const lower = md.toLowerCase();
    const pairs: string[] = [];
    for (let i = 0; i < kinds.length; i++) {
      for (let j = i + 1; j < kinds.length; j++) pairs.push(`${kinds[i]}↔${kinds[j]}`);
    }
    expect(pairs).toHaveLength(15);
    for (const pair of pairs) {
      const [a, b] = pair.split("↔");
      assert.ok(lower.includes(`${a}↔${b}`) || lower.includes(`${b}↔${a}`),
        `refine/SKILL.md names the ${pair} refusal`);
    }
    assert.match(md, /one door per doc/i, "refine/SKILL.md states the law");
  });

  it("ARM 5 — F36: the prompt is the only style lever, stated in the doc AND on the served seat", () => {
    const md = readSkill("refine");
    // the law: nothing carries, so the prompt must restate the look
    assert.match(md, /## The prompt is the ONLY style lever/i,
      "refine/SKILL.md names the style-lever law as its own section");
    assert.match(md, /MUST restate the source's own look/i,
      "the doc states the requirement in the imperative, never a hint");
    assert.match(md, /the medium/i, "the doc names the medium as an anchor");
    assert.match(md, /identity anchors/i, "the doc names the identity anchors");
    // the worked example is prose an agent can copy — it must contain
    // the medium clause AND the unchanged clause (the operator's own
    // good prompt), never a quality-only shape
    assert.match(md, /glossy 3D anime render style/, "the worked example carries the medium clause");
    assert.match(md, /unchanged pose, motion\s+and background/, "the worked example carries the unchanged clause");
    // and the drift evidence: a named failure shape, so the rule is
    // never read as taste
    assert.match(md, /photoreal/i, "the doc names the failure mode (the photoreal drift)");
    // THE SERVED SEAT CARRIES THE SAME LAW — a user editing the form
    // never learns it from the doc alone
    const tooltip = String((fields().get("refine_prompt") as { tooltip?: string } | undefined)?.tooltip ?? "");
    assert.match(tooltip, /ONLY STYLE LEVER/,
      "the served refine_prompt tooltip names the same law");
    assert.match(tooltip, /restyles the shot|restate the source/i,
      "the served tooltip states the consequence, not just a label");
  });

  it("ARM 6 — the door restyles pixels, it cannot carry a run: the no-lineage law is in the doc AND on the served seat", () => {
    const md = readSkill("refine");
    assert.match(md, /## This door restyles pixels; it cannot carry a run/i,
      "refine/SKILL.md names the no-lineage law as its own section");
    assert.match(md, /DECODED PIXELS/i,
      "the doc states the reason (a saved clip is decoded pixels)");
    // the two consequences an agent must not get wrong: no context over
    // a file, and the context-carrying door is the chain arm
    assert.match(md, /no "second pass with context" over a file/i,
      "the doc refuses the file-sourced 'second pass with context'");
    assert.match(md, /CHAIN door/i,
      "the doc points at the chain door as the context-carrying pass");
    assert.match(md, /ARM 3b/i,
      "the doc names the carrier harness whose carry is stood down (F3-14)");
    assert.match(md, /Never describe a\s+press here as "the second pass"/i,
      "the doc names the wrong label an agent must not use");
    // THE SERVED SEAT carries the same fact, so a form user learns it
    const tooltip = String((fields().get("refine_prompt") as { tooltip?: string } | undefined)?.tooltip ?? "");
    assert.match(tooltip, /RESTYLES decoded pixels and carries no lineage/i,
      "the served refine_prompt tooltip states the no-lineage fact");
    assert.match(tooltip, /chain 2-pass door/i,
      "the served seat names the door that does carry context");
  });

  it("GAPS-19 — the doc states the TILING design, and the walk is the declared alternative, never the design", () => {
    // THE PLAN'S RISK 6: the reword must keep parity green and the
    // numbers code-derived. The served bag ceiling is the code's own
    // MAX_COMPOSED_WINDOWS, and the doc's multi-entry sentence derives
    // from it — a ceiling move reds the prose instead of rotting it.
    const md = readSkill("refine");
    const servedStack = refineKind.max_stack;
    assert.equal(servedStack, MAX_COMPOSED_WINDOWS,
      "the served refine bag stacks to the composed-window ceiling");
    // THE DESIGN: the bag takes multiple window entries, and the
    // MULTI-WINDOW PRESS IS THE ABUTTING HARD CUT — the carried join
    // is dead in the engine (F3-14) and refused at the door, so the
    // doc must name the burn instead of promising the carried tile.
    assert.match(md, /multiple window entries/,
      "the doc states the bag takes multiple window entries");
    assert.match(md, /F3-14/,
      "the doc names the F3-14 stand-down");
    assert.match(md, /DEAD in the engine today/i,
      "the doc states the carried join is dead in the engine");
    assert.match(md, /ABUTTING/i,
      "the doc states the lawful multi-window press: the abutting hard cut");
    expect(md).not.toMatch(/one press tiles the film/i);
    // the STOPGAP claim is gone — the doc no longer teaches the gap
    expect(md).not.toMatch(/the bag is max_stack 1/i);
    expect(md).not.toMatch(/DECLARED STOPGAP/);
    expect(md).not.toMatch(/the splice must be agent-side/i);
    // THE WALK STAYS, RE-HEADED: per-window judgment between presses is
    // a lawful posture, so the doc keeps it under its declared heading
    assert.match(md, /DECLARED ALTERNATIVE/i,
      "the walk sections are re-headed as the declared alternative");
    assert.match(md, /judge each window before pressing the next/i,
      "the F36 posture survives: judge each window before pressing the next");
    // and the N face is stated with the ceiling from the constants
    assert.ok(md.includes(`up to ${String(MAX_COMPOSED_WINDOWS)} window entries`),
      `the doc states the ${String(MAX_COMPOSED_WINDOWS)}-entry ceiling from MAX_COMPOSED_WINDOWS`);
  });

  it("THE STAMP LAW: the skill names what is live-proven, says what is still unproven, and cites no archaeology", () => {
    const md = readSkill("refine");
    assert.match(md, /Live-proven on the GPU lane/,
      "refine/SKILL.md names what is live-proven in plain present-tense law");
    assert.match(md, /NOT yet proven live/i,
      "refine/SKILL.md names what is STILL unproven — never a blanket 'verified live' over an unrendered window path");
    // Served copy carries no history archaeology: no dated verification
    // stamp, no receipt path, no run id — dev_docs owns that material.
    assert.doesNotMatch(md, /VERIFIED LIVE \d{4}-\d{2}-\d{2}/,
      "refine/SKILL.md carries no dated VERIFIED LIVE stamp");
    assert.doesNotMatch(md, /receipts\/[a-z0-9-]+\.md/,
      "refine/SKILL.md cites no receipt path");
    assert.doesNotMatch(md, /run-[0-9a-f]{8,}/,
      "refine/SKILL.md cites no run id");
  });
});
