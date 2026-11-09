// @contract cards-h3-refine-skill
// refine-skill-parity.spec.ts — THE SKILL-PARITY WALL for the refine
// NAME (repinned for THE COLLAPSE, slice 4). The refine arm left the
// DECLARED roster: refine is now a knob on the ONE Video edit bag
// (refine + scale + clip_seconds), and the legacy `refine` spelling
// resolves into that cell. The wall judges the SURVIVING homes: the
// edit leaf's dial table against the served edit kind, the window law
// against the code's own constants, and the legacy leaf's alias law —
// so an agent reading either leaf is never sent at a removed door.
import "../../../../tests/helpers/boot-models.ts";
import { readFileSync } from "node:fs";
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
const readSkill = (name: string): string =>
  readFileSync(join(SKILLS, name, "SKILL.md"), "utf-8");

type FieldRow = {
  name: string; type?: string; default: unknown;
  min?: number; max?: number; tooltip?: string;
};
let def: CardDefinition;
let kinds: Array<Record<string, unknown> & { param_key?: string; fields?: FieldRow[] }>;
let editKind: Record<string, unknown> & { fields?: FieldRow[] };

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  kinds = ((def as unknown as { mods?: typeof kinds }).mods ?? []).filter(
    (k) => typeof k.param_key === "string",
  );
  editKind = kinds.find((k) => k.param_key === "edit")!;
  assert.ok(editKind, "the card serves the one edit bag");
});

/** The skill's dial line: `- \`name\` (BAND, …, DEFAULT) — prose`. */
const dialLine = (md: string, name: string): { band: string; def: number } | null => {
  const m = md.match(new RegExp(`^\\s*- \`${name}\` \\(([^)]+)\\)`, "m"));
  if (m === null) return null;
  const parts = m[1]!.split(",").map((x) => x.trim());
  const bare = (x: string): number => Number(x.replace("−", "-"));
  return { band: parts[0]!, def: bare(parts[parts.length - 1]!) };
};
const bandOf = (band: string): [number, number] => {
  const num = (x: string): number => Number(x.replace("−", "-"));
  const [lo, hi] = band.split("–");
  return [num(lo!), num(hi!)];
};

describe("the refine name's surviving homes (the collapse, slice 4)", () => {
  it("ARM 1 — THE NAME LEFT THE ROSTER: three kinds, no refine bag, and the alias leaf names the cell", () => {
    const roster = kinds.map((k) => String(k.param_key)).sort();
    expect(roster).toEqual(["edit", "loras", "reshoot"]);
    const md = readSkill("refine");
    assert.match(md, /PRESET CELL/, "refine/SKILL.md names the collapse");
    assert.match(md, /params\.edit/, "the leaf binds the ONE edit bag");
    assert.match(md, /refine: true/, "the translation's refine switch is stated");
    assert.match(md, /whole-frame/, "the translation's blank mask is stated");
    assert.match(md, /0\.32/, "the arm's declared default is stated");
    assert.match(md, /ONE window per/i, "the one-window law is stated");
    assert.match(md, /multi-entry[\s\S]*?tilting refuses|tiling refuses/i,
      "the retired tiling appears only as a refusal, never taught as live");
  });

  it("ARM 2 — the surviving DIAL TABLE: every bounded edit dial quotes the card's own band and default", () => {
    const md = readSkill("edit");
    const bounded = (editKind.fields ?? []).filter(
      // P1-5: internal seats are admitted-but-unserved; the skill's
      // dial table teaches only the agent-visible rows
      (f) => typeof f.min === "number" && typeof f.max === "number" && (f as { internal?: unknown }).internal !== true,
    );
    expect(bounded.length, "the edit kind serves bounded dials to judge").toBeGreaterThan(6);
    for (const row of bounded) {
      const line = dialLine(md, row.name);
      assert.ok(line !== null, `edit/SKILL.md states the ${row.name} band`);
      assert.deepEqual(bandOf(line!.band), [row.min, row.max],
        `edit/SKILL.md's ${row.name} band ${line!.band} == the served [${row.min}, ${row.max}]`);
      assert.equal(line!.def, row.default,
        `edit/SKILL.md's ${row.name} default ${line!.def} == the served ${String(row.default)}`);
    }
    assert.match(md, /One door per doc/,
      "the doc states the one-door law it is subject to");
  });

  it("ARM 3 — THE WINDOW LAW is the CODE's constants, converted, never a hand-typed memory", () => {
    const md = readSkill("edit");
    const defaultFrames = Math.round(REFINE_DEFAULT_CLIP_SECONDS * 24);
    assert.equal(defaultFrames, 56, "the default window is the DESIGN 56 f (the 2 s class's rung)");
    assert.equal(REFINE_2X_OOM_FRAMES, 141, "the ceiling is the measured-OOM 141 f");
    assert.ok(md.includes(`${defaultFrames} f`),
      `the doc states the ${defaultFrames} f design window`);
    assert.ok(md.includes(`${REFINE_2X_OOM_FRAMES} f`),
      `the doc states the ${REFINE_2X_OOM_FRAMES} f measured OOM ceiling`);
    assert.match(md, /22\+17k/,
      "the doc names the engine's token grid, so the ~2 s window's rung is stated, never guessed");
    assert.match(md, /2\.33s = 56f/,
      "the doc states the design window as seconds and frames together");
  });

  it("ARM 4 — THE SERVED SEAT carries the refine law: partial denoise only, same run, blank mask + self + refine", () => {
    const md = readSkill("edit");
    assert.match(md, /refine` \(boolean, false\)/, "the switch is a documented dial");
    assert.match(md, /same run|OWN latents/i, "the doc states the same-run handoff");
    assert.match(md, /partial/i, "the doc states the partial-denoise law");
    const tooltip = String((editKind.fields ?? []).find((f) => f.name === "refine")?.tooltip ?? "");
    assert.match(tooltip, /same run/, "the served switch states the same-run fact");
    assert.match(tooltip, /partial denoise only/, "the served switch states the partial-only law");
  });

  it("ARM 5 — THE STAMP LAW (recured by the 2026-11-09 docs audit: provenance narration is history — the leaf states the walled fact and cites no archaeology)", () => {
    const md = readSkill("refine");
    assert.match(md, /walled/,
      "refine/SKILL.md states its suite-side wall in plain present-tense law");
    assert.match(md, /one window per doc/i,
      "the one-window law is restated where the hedge lived");
    assert.doesNotMatch(md, /VERIFIED LIVE \d{4}-\d{2}-\d{2}/,
      "refine/SKILL.md carries no dated VERIFIED LIVE stamp");
    assert.doesNotMatch(md, /receipts\/[a-z0-9-]+\.md/,
      "refine/SKILL.md cites no receipt path");
    assert.doesNotMatch(md, /run-[0-9a-f]{8,}/,
      "refine/SKILL.md cites no run id");
  });
});
