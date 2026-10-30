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
// numbers (the 90 f green default, the 141 f OOM ceiling) are the
// CODE's constants, converted and stated, never a hand-typed
// recollection; every one of the fifteen one-door pairs is named;
// and the doc carries a dated VERIFIED stamp naming a receipt that
// exists, plus what is still unproven.
import "../../../../tests/helpers/boot-models.ts";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import {
  REFINE_2X_OOM_FRAMES, REFINE_DEFAULT_CLIP_SECONDS,
} from "../../../models/h3/src/refine.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(HERE, "..", "src", "agents", "skills");
const ROOT = join(HERE, "..", "..", "..", "..");
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
    const md = readSkill("refine");
    const defaultFrames = Math.round(REFINE_DEFAULT_CLIP_SECONDS * 24);
    assert.equal(defaultFrames, 90, "the default window is the measured-GREEN 90 f");
    assert.equal(REFINE_2X_OOM_FRAMES, 141, "the ceiling is the measured-OOM 141 f");
    const ceilingSeconds = REFINE_2X_OOM_FRAMES / 24;
    assert.match(md, new RegExp(`\`clip_seconds\` \\([^)]*${String(REFINE_DEFAULT_CLIP_SECONDS)}\\)`),
      "the dial line's default is the code's REFINE_DEFAULT_CLIP_SECONDS");
    assert.ok(md.includes(`${defaultFrames} f`),
      `the doc states the ${defaultFrames} f default window`);
    assert.ok(md.includes(`${REFINE_2X_OOM_FRAMES} f`),
      `the doc states the ${REFINE_2X_OOM_FRAMES} f measured OOM ceiling`);
    assert.ok(md.includes(ceilingSeconds.toFixed(3)),
      `the doc states the refuse point as seconds too (${ceilingSeconds.toFixed(3)} s)`);
    assert.match(md, /frame_load_cap/, "the doc names the loader seat the window rides");
    assert.match(md, /skip_first_frames/, "the doc names the loader seat the start rides");
    assert.match(md, /trimmed to the same window|soundtrack is trimmed/i,
      "the doc states the audio law: the soundtrack follows the same window");
  });

  it("ARM 4 — the skill names ALL FIFTEEN one-door pairs, derived from the card's armed kinds", () => {
    const kinds = ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
      .filter((k) => typeof k.param_key === "string" && k.max_stack === 1)
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
    assert.match(md, /ARM 7/i, "the doc names the wall that settles the carry seat");
    assert.match(md, /Never describe a\s+press here as "the second pass"/i,
      "the doc names the wrong label an agent must not use");
    // THE SERVED SEAT carries the same fact, so a form user learns it
    const tooltip = String((fields().get("refine_prompt") as { tooltip?: string } | undefined)?.tooltip ?? "");
    assert.match(tooltip, /RESTYLES decoded pixels and carries no lineage/i,
      "the served refine_prompt tooltip states the no-lineage fact");
    assert.match(tooltip, /chain 2-pass door/i,
      "the served seat names the door that does carry context");
  });

  it("THE STAMP LAW: the skill carries its verified-against line, names a receipt that EXISTS, and says what is still unproven", () => {
    const md = readSkill("refine");
    assert.match(md, /VERIFIED LIVE \d{4}-\d{2}-\d{2} against/,
      "refine/SKILL.md carries the canonical VERIFIED LIVE stamp (the F2 one-format law)");
    const stamp = /VERIFIED (?:LIVE )?(\d{4}-\d{2}-\d{2}) against ([\s\S]*?)(?=\n\n)/.exec(md);
    assert.ok(stamp, "refine/SKILL.md carries a dated VERIFIED line");
    const receipt = /receipts\/[a-z0-9-]+\.md/.exec(stamp![2]!);
    assert.ok(receipt, "the stamp names a receipt under dev_docs/contracts/receipts/");
    const receiptPath = join(ROOT, "dev_docs", "contracts", receipt![0]!);
    assert.ok(existsSync(receiptPath), `the named receipt exists: ${receipt![0]}`);
    assert.match(stamp![2]!, /NOT yet verified live/i,
      "the stamp names what is STILL unproven — never a blanket 'verified live' over an unrendered window path");
  });
});
