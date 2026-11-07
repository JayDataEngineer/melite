// @contract cards-h3-bag-skills
// bag-skill-coverage.spec.ts — THE DOC-COVERAGE WALL for the three
// mod bags that shipped without a skill leaf (2026-11-13, the
// friction report's §14 coverage finding: SEVEN served mod kinds,
// TWO documented). A bag an agent cannot read the dials of is a bag
// it guesses at, and every guess is a burn — repair guessed at the
// denoise window, upscale guessed at the dotted `mode.scale` key,
// loras guessed at whether the default row existed at all.
//
// THE LAW: every armed mod kind the card SERVES has exactly one
// skill leaf (locally, or in the declared external seat the flow
// bundle owns) — the roster is derived from the served kinds, never
// hand-listed; every number-bounded dial in a covered leaf quotes
// the card's OWN band and default; and each leaf carries the dated
// VERIFIED stamp naming a receipt that exists plus what is still
// unproven.
import "../../../../tests/helpers/boot-models.ts";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(HERE, "..", "src", "agents", "skills");
const ROOT = join(HERE, "..", "..", "..", "..");
const readSkill = (name: string): string =>
  readFileSync(join(SKILLS, name, "SKILL.md"), "utf-8");

/** The LEGACY spellings whose alias leaf is not at
 *  `<name>/SKILL.md` in this package (post-collapse none of them is
 *  an armed bag; the roster is edit/reshoot/loras):
 *  `extend` rides the family's extend-flow bundle (served from the
 *  engine's models plane), and `replace`'s seat is served under the
 *  `swap` id — the leaf is `swap/SKILL.md` and it binds
 *  `params.replace`, which ARM 1 asserts. Declared here (never
 *  hand-listed as a pass) so the roster stays DERIVED from the card. */
const LEAF_SEAT: Record<string, { path: string; binds: string }> = {
  extend: {
    path: "packages/engines/comfyui-cordis/models/video/h3/agents/skills/extend-flow/SKILL.md",
    binds: "extend",
  },
  replace: { path: "packages/video/h3-timeline/src/agents/skills/swap/SKILL.md", binds: "replace" },
};

type FieldRow = {
  name: string; type?: string; default: unknown;
  min?: number; max?: number;
};
type Kind = Record<string, unknown> & { param_key?: string; fields?: FieldRow[] };

let def: CardDefinition;
let kinds: Kind[];

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  kinds = ((def as unknown as { mods?: Kind[] }).mods ?? []).filter(
    (k) => typeof k.param_key === "string",
  );
});

/** The skill's dial line: `- \`name\` (BAND, …, DEFAULT) — prose`. The
 *  default is the LAST comma segment inside the parens, so a line that
 *  states its step (`22–56, step 17, 39`) parses the same as a plain
 *  `0.05–0.5, 0.32`. Returns null when the line is absent. */
const dialLine = (md: string, name: string): { band: string; def: number } | null => {
  const m = md.match(new RegExp(`^\\s*- \`${name}\` \\(([^)]+)\\)`, "m"));
  if (m === null) return null;
  const parts = m[1]!.split(",").map((s) => s.trim());
  const bare = (s: string): number => Number(s.replace("−", "-"));
  return { band: parts[0]!, def: bare(parts[parts.length - 1]!) };
};

const bandOf = (band: string): [number, number] => {
  const num = (s: string): number => Number(s.replace("−", "-"));
  const [lo, hi] = band.split("–");
  return [num(lo!), num(hi!)];
};

const bounded = (kind: Kind): FieldRow[] =>
  (kind.fields ?? []).filter(
    (f) => typeof f.min === "number" && typeof f.max === "number",
  );

describe("every served mod bag has a skill leaf an agent can read", () => {
  it("ARM 1 — the roster is DERIVED from the card's three kinds; each armed kind has ONE leaf, and every legacy spelling keeps an ALIAS leaf", () => {
    const armed = kinds.filter((k) => k.kind !== "loras").map((k) => k.param_key!);
    expect(armed.sort()).toEqual(["edit", "reshoot"]);
    for (const key of armed) {
      const seat = LEAF_SEAT[key];
      const path = seat?.path ?? join("packages/video/h3-timeline/src/agents/skills", key, "SKILL.md");
      assert.ok(existsSync(join(ROOT, path)),
        `the card serves the ${key} bag, so its leaf exists: ${path}`);
      const md = readFileSync(join(ROOT, path), "utf-8");
      assert.ok(md.includes(`params.${seat?.binds ?? key}`),
        `${path} binds the served bag it documents (params.${seat?.binds ?? key})`);
    }
    const loras = kinds.find((k) => k.param_key === "loras")!;
    assert.equal(loras.max_stack, 4, "loras is the multi-entry bag, so it has its own leaf");
    assert.ok(existsSync(join(SKILLS, "loras", "SKILL.md")),
      "the loras bag carries its own leaf (the F29 'I can't see or change the LORA' cure)");
    // THE COLLAPSE (slice 4): the five legacy keys are still ACCEPTED
    // parameters (old docs keep composing), so each keeps a leaf that
    // sends an agent at the ONE edit bag instead of the retired door.
    for (const legacy of ["replace", "repair", "extend", "refine", "upscale"]) {
      const seat = LEAF_SEAT[legacy] ?? {
        path: join("packages/video/h3-timeline/src/agents/skills", legacy, "SKILL.md"),
        binds: legacy,
      };
      assert.ok(existsSync(join(ROOT, seat.path)),
        `the legacy ${legacy} spelling keeps its alias leaf: ${seat.path}`);
      const md = readFileSync(join(ROOT, seat.path), "utf-8");
      assert.match(md, /PRESET CELL/, `${seat.path} names the collapse`);
      assert.match(md, /params\.edit/, `${seat.path} binds the ONE edit bag`);
    }
  });

  it("ARM 1b — the edit leaf's CHIP CENSUS is derived from the served kind (every preset id the card declares is taught, and the door law states the true doors)", () => {
    // (the back-end audit's verification pass 2026-11-07, residual
    // debt) the leaf's prose law sections (NAMED CELLS / It is NOT /
    // It IS) were cured in content but content-UNJUDGED — a future
    // re-rot rides served with no red. The census is DERIVED off
    // def.mods now: a chip the card declares that the leaf forgets
    // reds by name, and the door-law lines are pinned to the true
    // doors (reshoot the only NOT; continuation/refine/upscale the
    // dials).
    const kind = kinds.find((k) => k.param_key === "edit")!;
    const presets = (kind as unknown as { presets?: Array<{ id: string }> }).presets ?? [];
    assert.ok(presets.length > 0, "the edit kind carries preset chips");
    const md = readSkill("edit");
    for (const chip of presets) {
      assert.ok(md.includes(`\`${chip.id}\``),
        `edit/SKILL.md teaches the '${chip.id}' chip (the served cell census is derived, never hand-counted)`);
    }
    // THE DOOR LAW: only Reshoot stays out; the three postures that
    // read like doors are dials ON this one
    const isNot = md.slice(md.indexOf("It is NOT"), md.indexOf("It IS"));
    assert.ok(isNot.includes("reshoot"), "the NOT section names the one true other door");
    for (const retired of ["extend", "refine", "upscale", "repair", "replace"]) {
      assert.ok(!/`/.test(retired) && !isNot.includes(`\`${retired}\``),
        `the NOT section no longer calls '${retired}' a second door (the collapse's own law)`);
    }
    const isIs = md.slice(md.indexOf("It IS"), md.indexOf("## The flow"));
    for (const dial of ["continuation", "refine", "chain_run"]) {
      assert.ok(isIs.includes(`\`${dial}\``), `the IS section names the '${dial}' dial`);
    }
  });

  it("ARM 2a — the edit door's every bounded dial quotes the card's OWN band and default (the matrix leaf)", () => {
    // The timeline rework's stage 2b (2026-11-15): the edit bag is
    // the eighth kind and its leaf teaches the whole matrix — the
    // same dial-line law as repair's, judged off the served kind.
    const kind = kinds.find((k) => k.param_key === "edit")!;
    assert.ok(kind, "the card serves the edit kind");
    const md = readSkill("edit");
    const rows = bounded(kind);
    expect(rows.length, "the edit kind serves bounded dials to judge").toBeGreaterThan(6);
    for (const row of rows) {
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

  it("ARM 2 — the repair ALIAS leaf quotes the edit bag's own band and the arm's declared default", () => {
    const kind = kinds.find((k) => k.param_key === "edit")!;
    const md = readSkill("repair");
    const denoise = (kind.fields ?? []).find((f) => f.name === "denoise")!;
    const line = dialLine(md, "denoise");
    assert.ok(line !== null, "repair/SKILL.md states the denoise dial line");
    assert.deepEqual(bandOf(line!.band), [denoise.min, denoise.max],
      "the alias leaf quotes the SERVED edit bag's band (0.05–1), never the retired arm's 0.05–0.5");
    assert.equal(line!.def, 0.32, "the retired arm's declared default rides the banner");
    assert.match(md, /mask_source: "region"/, "the translation's mask dial is stated");
    assert.match(md, /reference: "self"/, "the translation's anchor is stated");
    assert.match(md, /one entry per/i, "the doc states the one-entry law");
  });

  it("ARM 3 — the upscale ALIAS leaf quotes the edit band, the pass-2 default, and the bare run name law", () => {
    const kind = kinds.find((k) => k.param_key === "edit")!;
    const md = readSkill("upscale");
    const denoise = (kind.fields ?? []).find((f) => f.name === "denoise")!;
    const line = dialLine(md, "denoise");
    assert.ok(line !== null, "upscale/SKILL.md states the denoise dial line");
    assert.deepEqual(bandOf(line!.band), [denoise.min, denoise.max],
      "the alias leaf quotes the SERVED edit bag's band (0.05–1)");
    assert.equal(line!.def, 0.24, "the pass-2 recipe's declared default rides the banner");
    assert.match(md, /bare run name/i,
      "the doc states the execute door resolves the bare name (F6: never hand-author a scene suffix)");
    assert.match(md, /mode\.scale/,
      "the doc names the dotted child key the engine validates (round 5's burn)");
    assert.match(md, /chain_run/, "the arming seat is named");
    assert.match(md, /params\.edit/, "the doc binds the ONE edit bag");
  });

  it("ARM 4 — loras documents its stack ceiling and both bounded dials from the card", () => {
    const kind = kinds.find((k) => k.param_key === "loras")!;
    const md = readSkill("loras");
    assert.equal(kind.max_stack, 4);
    assert.match(md, /max_stack 4/, "the doc states the served stack ceiling");
    for (const row of bounded(kind)) {
      const line = dialLine(md, row.name);
      assert.ok(line !== null, `loras/SKILL.md states the ${row.name} band`);
      assert.deepEqual(bandOf(line!.band), [row.min, row.max],
        `loras/SKILL.md's ${row.name} band ${line!.band} == the served [${row.min}, ${row.max}]`);
      assert.equal(line!.def, row.default,
        `loras/SKILL.md's ${row.name} default ${line!.def} == the served ${String(row.default)}`);
    }
    const id = (kind.fields ?? []).find((f) => f.name === "id")!;
    assert.equal(id.type, "select", "the id seat is a served catalog select");
    assert.ok(md.includes(`'${String(id.default)}'`),
      "the doc quotes the served default adapter id verbatim");
  });

  it("ARM 6 — the swap leaf states the alias law: the ONE real pair, the five preset cells, and that loras coexists", () => {
    const md = readSkill("swap");
    const armed = kinds.filter((k) => k.kind !== "loras").map((k) => k.param_key!);
    expect(armed.length).toBe(2);
    const cap = (w: string): string => w[0]!.toUpperCase() + w.slice(1);
    const canonical = (a: string, b: string): string => [a, b].sort().join("↔");
    const pairs = armed.flatMap((a, i) => armed.slice(i + 1).map((b) => canonical(cap(a), cap(b))));
    expect(pairs.length).toBe(1);
    // the doc's OWN pair spellings, order-normalized
    const stated = new Set([...md.matchAll(/([A-Z][a-z]+)↔([A-Z][a-z]+)/g)]
      .map((m) => canonical(m[1]!, m[2]!)));
    assert.deepEqual([...stated], pairs, "the leaf names exactly the one live pair (Edit↔Reshoot)");
    // the five legacy names are PRESET CELLS, never doors
    for (const legacy of ["replace", "repair", "extend", "refine", "upscale"]) {
      assert.match(md, new RegExp(legacy, "i"), `swap/SKILL.md names the ${legacy} alias spelling`);
    }
    // never the false universal again
    expect(md).not.toMatch(/ANY two armed mod bags/i);
    // and the coexistence half: loras is not an arm
    expect(md).toMatch(/COEXISTS/i);
    expect(md).toMatch(/THE LORA BAG IS NOT AN ARM/);
    expect(md).toMatch(/empty `loras` to disarm/i);
  });

  it("ARM 5 — THE STAMP LAW: each new leaf names what is live-proven, its unproven half, and cites no archaeology", () => {
    for (const name of ["repair", "upscale", "loras"]) {
      const md = readSkill(name);
      assert.match(md, /Live-proven/,
        `${name}/SKILL.md names what is live-proven in plain present-tense law`);
      assert.match(md, /NOT yet (?:proven|verified) live/i,
        `${name}/SKILL.md names what is STILL unproven — never a blanket claim`);
      // Served copy carries no history archaeology: no dated verification
      // stamp, no receipt path, no run id — dev_docs owns that material.
      assert.doesNotMatch(md, /VERIFIED LIVE \d{4}-\d{2}-\d{2}/,
        `${name}/SKILL.md carries no dated VERIFIED LIVE stamp`);
      assert.doesNotMatch(md, /receipts\/[a-z0-9-]+\.md/,
        `${name}/SKILL.md cites no receipt path`);
      assert.doesNotMatch(md, /run-[0-9a-f]{8,}/,
        `${name}/SKILL.md cites no run id`);
    }
  });

  it("ARM 7 — the measured craft lives in the ONE edit leaf (the skills collapse, 2026-11-16): the seam law, the worked recipe, and the OOM ceilings", () => {
    // RE-PIN (the collapse's skills pass): the five legacy leaves are
    // THIN ALIASES now - a PRESET CELL banner, the translation, and a
    // pointer - because they all serve the SAME interface. The
    // measured law they each carried (the friction report's speed
    // findings) moved HOME to the edit leaf: the retired multi-window
    // refine walk died with the tiling it taught (ONE window per doc,
    // the parity wall's own law), and its teaching must not survive
    // as a dead door's recipe.
    const edit = readSkill("edit");
    // NO CROSSFADE (the pop is structural): a blend of two
    // independent renders is a double exposure, never a soft step.
    assert.match(edit, /a blend of\s+two INDEPENDENT renders is\s+a DOUBLE EXPOSURE \(the ghost\),\s+not a soft step and not a cure for\s+the pop/i,
      "edit/SKILL.md names the crossfade as the ghost, never as a pop cure");
    assert.match(edit, /\u03948\.86\u20139\.80[\s\S]{0,200}\u03944\.3/,
      "edit/SKILL.md carries the measured seam delta against the adjacent-frame delta");
    assert.match(edit, /off-grid carry REFUSES at compose/,
      "edit/SKILL.md states the refusal that retires the blend fallback");
    assert.match(edit, /the carried span is BIT-IDENTICAL[\s\S]{0,220}the audio seam keeps its soft step/i,
      "edit/SKILL.md states the carry face's honest limits - exact video, soft audio");
    assert.match(edit, /ONE\s+56 f window \(2\.33 s\)[\s\S]{0,80}a single window is seam-free/,
      "edit/SKILL.md names the seam-free posture (one design window)");
    assert.match(edit, /430 f window @1\.0 OOM/i,
      "edit/SKILL.md carries the measured 430 f-at-1.0 OOM beside the 141 f @2x");
    // THE WORKED RECIPE binds the ONE bag (the repair leaf's recipe
    // moved home when the leaf collapsed to its alias banner).
    const recipe = /## Worked recipe/.exec(edit);
    assert.ok(recipe, "edit/SKILL.md carries a worked recipe section");
    const section = edit.slice(recipe!.index);
    assert.match(section, /params\.edit = \[\{/,
      "the recipe binds through params.edit (the ONE bag, never a legacy spelling)");
    const starts = [...section.matchAll(/window_start:\s*(\d+)/g)].map((m) => Number(m[1]));
    assert.ok(starts.length >= 2, "the recipe shows BOTH shapes (a whole-clip press and a splice-aware press)");
    assert.ok(starts.includes(68) && starts.includes(77),
      "the splice-aware recipe rides the SAME 68 f step the film walk teaches (window 90, overlap 22)");
    assert.match(section, /replaces the same slot|same slot in the\s+assembly/i,
      "the recipe says the edited window drops back into its slot");
    assert.match(section, /never weld an?\s+(?:edit|repair) window onto a different step/i,
      "the recipe forbids the seam drift");
    // and the thin alias leaves POINT at the one home - an agent
    // reading a legacy spelling is never left holding a retired
    // recipe of its own.
    for (const leaf of ["repair", "refine", "upscale", "swap"]) {
      const md = readSkill(leaf);
      assert.match(md, /ONE place: the `edit` skill/,
        `${leaf}/SKILL.md points at the ONE interface home`);
    }
  });

  it("ARM 8 — the extend leaf states the measured SEAM LAW (an anchor is not a pixel lock)", () => {
    // Extend does not pop the way refine does — its continuation is
    // generated across the boundary — but the anchor is an IMAGE
    // reference, not a pixel lock. (JOIN-LAW re-pin: the first
    // measurement pinned a Δ24.8 butt-join; the seed-continuity
    // probes collapsed that band ~8× — the join size follows the
    // SEED, and the leaf must teach the bands it now measures:
    // interior Δ1.0–1.3, same-seed butt-join Δ3.1, a chained extend
    // at a fresh seed Δ1.7, and an action-naming prompt at Δ≈35 —
    // the prompt is the biggest term, not the anchor.)
    const md = readFileSync(join(ROOT, LEAF_SEAT["extend"]!.path), "utf-8");
    assert.match(md, /IMAGE REFERENCE, not a pixel lock/,
      "the extend leaf names what the anchor is");
    assert.match(md, /adjacent frames inside a window\s+: Δ1\.0–1\.3/,
      "the extend leaf carries the interior adjacent-frame delta");
    assert.match(md, /same-seed extend, butt-join\s+: Δ3\.1/,
      "the extend leaf carries the measured same-seed join step");
    assert.match(md, /chained extend \(fresh seed\)\s+: Δ1\.7/,
      "the extend leaf carries the chained-extend join step");
    assert.match(md, /Δ≈35/,
      "the extend leaf carries the action-naming prompt cost");
    assert.match(md, /SEED CONTINUITY/,
      "the extend leaf names the law the join size follows");
    assert.match(md, /SOFT step/i,
      "the extend leaf states the verdict in words");
  });

  it("ARM 9 — loras names its SETTLED default seat and the ghost chip; upscale names its OPEN half instead of promising it", () => {
    // F34b CLOSED 2026-11-13 + operator re-confirmed 2026-10-31: the
    // default seat IS the merged DARE-TIES row, and F34's invisible
    // chip is CURED (the card serves the default as a ghost chip).
    // The leaf must teach the settled law — an agent reading it may
    // RELY on the default, never hedge around it. The upscale half
    // stays OPEN (F23) and must stay unpromised.
    const loras = readSkill("loras");
    assert.match(loras, /## Worked stacks/, "the loras leaf carries worked stacks");
    assert.match(loras, /params\.loras = \[/, "the stacks bind through params.loras");
    assert.match(loras, /SETTLED/, "the leaf names the default-seat decision as SETTLED");
    assert.match(loras, /h3_silver_dareties/, "the leaf names the default row id (the silveroxides merge, 2026-11-01)");
    assert.match(loras, /DARE-TIES/, "the leaf names the merge the row is");
    assert.match(loras, /ghost chip/i,
      "the leaf teaches the no-bag face: the default renders as ONE ghost chip");
    assert.match(loras, /Relying on the default is safe/i,
      "the leaf lets an agent rely on the default instead of hedging");
    // F23's open half — RE-AIMED 2026-11-01 (the battery residual
    // cures): the F23-era literal "nothing in the tree WRITES
    // per-scene revisions" went stale when the write side it described
    // LANDED (the chain-store write batch — the engine
    // checkpoints every chain-spine run and the estate stamps
    // chain_store on the run row); the leaf was re-served to that
    // truth in the same move while the wall kept judging the old
    // absence. The open half the wall actually guards moved with it:
    // the door refuses cleanly past validation (the leaf states the
    // refusal law) and the END-TO-END upscaled render is
    // still unverified. The re-aim pins exactly that — the unproven
    // render and the refusal law — never a settled promise.
    const upscale = readSkill("upscale");
    assert.match(upscale, /THE DOOR REFUSES CLEANLY PAST VALIDATION/,
      "the upscale leaf says the door refuses cleanly past its validation");
    assert.match(upscale, /NOT yet verified live: an END-TO-END upscaled render/,
      "the upscale leaf names the open half: the loop's own render is unproven");
    assert.match(upscale, /Do not promise an upscale/,
      "the upscale leaf forbids the promise");
  });

  it("ARM 10 — every card-local arm leaf keeps the lora exemption, never the false universal, and the legacy leaves name the collapse", () => {
    // The one-door law binds the ONE edit bag and the reshoot door;
    // `loras` is the co-arming adapter bag and COEXISTS with every
    // arm. A leaf that keeps the contiguous "ANY two armed mod bags"
    // wording teaches an agent to refuse a legal loras-plus-arm
    // press, and a legacy leaf that still calls its dead key a door
    // sends the agent at a removed surface.
    const familyExtend = readFileSync(join(ROOT, LEAF_SEAT.extend.path), "utf-8");
    for (const md of ["repair", "swap", "reshoot", "refine", "upscale"].map(readSkill).concat(familyExtend)) {
      expect(md).not.toMatch(/ANY two armed mod bags/i);
      if (md !== readSkill("reshoot")) {
        expect(md).toMatch(/THE LORA BAG IS NOT AN ARM/);
        expect(md).toMatch(/COEXISTS/i);
        expect(md).toMatch(/PRESET CELL/);
      }
    }
  });
});
