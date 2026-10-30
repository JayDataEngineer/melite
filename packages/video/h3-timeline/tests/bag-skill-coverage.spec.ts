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

/** The two armed bags whose leaf is not at `<param_key>/SKILL.md`:
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
  it("ARM 1 — the roster is DERIVED from the card, and each armed kind resolves to ONE leaf", () => {
    const armed = kinds.filter((k) => k.max_stack === 1).map((k) => k.param_key!);
    expect(armed.sort()).toEqual([
      "extend", "refine", "repair", "replace", "reshoot", "upscale",
    ]);
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
  });

  it("ARM 2 — repair's every bounded dial quotes the card's OWN band and default", () => {
    const kind = kinds.find((k) => k.param_key === "repair")!;
    const md = readSkill("repair");
    const rows = bounded(kind);
    expect(rows.length, "the repair kind serves bounded dials to judge").toBeGreaterThan(6);
    for (const row of rows) {
      const line = dialLine(md, row.name);
      assert.ok(line !== null, `repair/SKILL.md states the ${row.name} band`);
      assert.deepEqual(bandOf(line!.band), [row.min, row.max],
        `repair/SKILL.md's ${row.name} band ${line!.band} == the served [${row.min}, ${row.max}]`);
      assert.equal(line!.def, row.default,
        `repair/SKILL.md's ${row.name} default ${line!.def} == the served ${String(row.default)}`);
    }
    assert.match(md, /One door per doc/,
      "the doc states the one-door law it is subject to");
  });

  it("ARM 3 — upscale's every bounded dial quotes the card's OWN band and default, and names the bare run name law", () => {
    const kind = kinds.find((k) => k.param_key === "upscale")!;
    const md = readSkill("upscale");
    for (const row of bounded(kind)) {
      const line = dialLine(md, row.name);
      assert.ok(line !== null, `upscale/SKILL.md states the ${row.name} band`);
      assert.deepEqual(bandOf(line!.band), [row.min, row.max],
        `upscale/SKILL.md's ${row.name} band ${line!.band} == the served [${row.min}, ${row.max}]`);
      assert.equal(line!.def, row.default,
        `upscale/SKILL.md's ${row.name} default ${line!.def} == the served ${String(row.default)}`);
    }
    assert.match(md, /bare run name/i,
      "the doc states the execute door resolves the bare name (F6: never hand-author a scene suffix)");
    assert.match(md, /mode\.scale/,
      "the doc names the dotted child key the engine validates (round 5's burn)");
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

  it("ARM 6 — the swap leaf states the SIX-arm exclusivity as the 15 DERIVED pairs, and that loras coexists", () => {
    // The doc said "ANY two armed mod bags REFUSE loud" — false as a
    // universal: `loras` is the SEVENTH bag and rides inside every arm
    // (the swap's own law above says the lora plane is the doc's).
    // Judge the DERIVED pair list off the card's own armed bags, so a
    // seventh arm kind cannot land without the leaf naming its pairs.
    const md = readSkill("swap");
    const armed = kinds.filter((k) => k.max_stack === 1).map((k) => k.param_key!);
    expect(armed.length).toBe(6);
    const cap = (w: string): string => w[0]!.toUpperCase() + w.slice(1);
    const canonical = (a: string, b: string): string => [a, b].sort().join("↔");
    const pairs = armed.flatMap((a, i) => armed.slice(i + 1).map((b) => canonical(cap(a), cap(b))));
    expect(pairs.length).toBe(15);
    // the doc's OWN pair spellings, order-normalized (the leaf lists
    // Reshoot↔Refine where the derivation says Refine↔Reshoot)
    const stated = new Set([...md.matchAll(/([A-Z][a-z]+)↔([A-Z][a-z]+)/g)]
      .map((m) => canonical(m[1]!, m[2]!)));
    for (const pair of pairs) {
      expect(stated.has(pair), `swap/SKILL.md names the ${pair} refusal`).toBe(true);
    }
    expect(stated.size, "no pair the card does not refuse is taught").toBe(15);
    // never the false universal again
    expect(md).not.toMatch(/ANY two armed mod bags/i);
    // and the coexistence half: loras is named as the seventh bag
    expect(md).toMatch(/SEVENTH bag/i);
    expect(md).toMatch(/COEXISTS/i);
    expect(md).toMatch(/THE LORA BAG IS NOT AN ARM/);
    expect(md).toMatch(/empty `loras` to disarm/i);
  });

  it("ARM 5 — THE STAMP LAW: each new leaf carries a dated VERIFIED line, a receipt that EXISTS, and its unproven half", () => {
    for (const name of ["repair", "upscale", "loras"]) {
      const md = readSkill(name);
      assert.match(md, /VERIFIED LIVE \d{4}-\d{2}-\d{2} against/,
        `${name}/SKILL.md carries the canonical VERIFIED LIVE stamp`);
      const stamp = /VERIFIED (?:LIVE )?(\d{4}-\d{2}-\d{2}) against ([\s\S]*?)(?=\n\n)/.exec(md);
      assert.ok(stamp, `${name}/SKILL.md carries a dated VERIFIED line`);
      const receipt = /receipts\/[a-z0-9-]+\.md/.exec(stamp![2]!);
      assert.ok(receipt, `${name}/SKILL.md's stamp names a receipt under dev_docs/contracts/receipts/`);
      assert.ok(existsSync(join(ROOT, "dev_docs", "contracts", receipt![0]!)),
        `the named receipt exists: ${receipt![0]}`);
      assert.match(stamp![2]!, /NOT yet verified live/i,
        `${name}/SKILL.md names what is STILL unproven — never a blanket claim`);
      const runId = /run-[0-9a-f]{12}-[0-9a-f]{8}/.exec(md);
      assert.ok(runId, `${name}/SKILL.md cites the live run id its stamp stands on`);
    }
  });

  it("ARM 7 — the two dial docs whose numbers misled carry the MEASURED law, not a recipe-free promise", () => {
    // The friction report's speed findings: refine taught "step = the
    // window length" (zero overlap, a hard cut at every seam) and read
    // scale 1.0 as a whole-clip capacity cure (430 f at 1.0 measured
    // OOM); repair shipped every dial with NO worked press, so an
    // agent had to invent its window numbers. Both are now law.
    const refine = readSkill("refine");
    assert.match(refine, /step is the window length MINUS the 22 f seam overlap/,
      "refine/SKILL.md states the step is the window MINUS the 22 f overlap");
    assert.match(refine, /never\s+the window length itself/,
      "refine/SKILL.md REFUTES the step=window teaching that leaves a hard cut");
    assert.match(refine, /90 − 22 = 68 f = 2\.833 s/,
      "refine/SKILL.md shows the arithmetic on the reference window");
    assert.match(refine, /0 \/ 2\.83 \/ 5\.67/,
      "refine/SKILL.md walks start_seconds at the stepped clock");
    assert.match(refine, /430 f window @1\.0 OOM/i,
      "refine/SKILL.md carries the measured 430 f-at-1.0 OOM");
    assert.match(refine, /NO trim verb/i,
      "refine/SKILL.md names the missing trim seat instead of implying one");
    // round 8 measured the pop as STRUCTURAL: a crossfade cannot make
    // two independent denoise realisations agree, so the doc must not
    // sell the splice as a cure (the operator: "POPS DO NOT WORK").
    assert.match(refine, /this splice is\s+NOT a cure for the pop/i,
      "refine/SKILL.md refuses to sell the crossfade as a pop cure");
    assert.match(refine, /Δ8\.86–9\.80[\s\S]{0,200}Δ4\.3/,
      "refine/SKILL.md carries the measured seam delta against the adjacent-frame delta");
    assert.match(refine, /ONE 90 f window \(3\.75 s\)[\s\S]{0,80}a single window is seam-free/,
      "refine/SKILL.md names the seam-free posture (one window)");

    const repair = readSkill("repair");
    const recipe = /## Worked recipe/.exec(repair);
    assert.ok(recipe, "repair/SKILL.md carries a worked recipe section");
    const section = repair.slice(recipe!.index);
    assert.match(section, /params\.repair = \[\{/,
      "the recipe binds through params.repair (never a flat key)");
    const starts = [...section.matchAll(/window_start:\s*(\d+)/g)].map((m) => Number(m[1]));
    assert.ok(starts.length >= 2, "the recipe shows BOTH shapes (a whole-clip press and a splice-aware press)");
    assert.ok(starts.includes(68) && starts.includes(77),
      "the splice-aware recipe rides the SAME 68 f step the refine walk teaches (window 90, overlap 22)");
    assert.match(section, /replaces the same slot|same slot in the\s+assembly/i,
      "the recipe says the repaired window drops back into its slot");
    assert.match(section, /never weld a\s+repair window onto a different step/i,
      "the recipe forbids the seam drift");
  });

  it("ARM 8 — the extend leaf states the measured SEAM LAW (an anchor is not a pixel lock)", () => {
    // Extend does not pop the way refine does — its continuation is
    // generated across the boundary — but the anchor is an IMAGE
    // reference, not a pixel lock: measured Δ24.8 from the source's
    // last frame to extension[0] against Δ2.8–4.1 between adjacent
    // frames. The leaf must say so before the press, or an agent sells
    // a seamless join the arm cannot make.
    const md = readFileSync(join(ROOT, LEAF_SEAT["extend"]!.path), "utf-8");
    assert.match(md, /IMAGE REFERENCE, not a pixel lock/,
      "the extend leaf names what the anchor is");
    assert.match(md, /Δ24\.8/, "the extend leaf carries the measured join step");
    assert.match(md, /Δ2\.8–4\.1/, "the extend leaf carries the in-source adjacent delta it is measured against");
    assert.match(md, /visible step at the join|step at the join/i,
      "the extend leaf states the verdict in words");
  });
});
