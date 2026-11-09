// reshoot-skill-parity.spec.ts — THE SKILL-PARITY WALL (2026-11-12): the
// re-shoot skill's dial table and the one-door roster are DERIVED facts,
// so they must agree with the code's own homes, not a prose copy.
//
// THE BURN this closes (skills audit 2026-11-12, MEDIUM): `agent-docs.spec.ts`
// pinned phrases ("the identity camera", "never flat") but nothing pinned the
// skill's NUMBERS. A band or default could drift in SKILL.md while the card
// still served the emission's bounds — the exact class the §8 unification
// folded into `RESHOOT_DIAL_BOUNDS`, recreated on the doc face.
//
// THE LAW here: every bounded dial the emission enforces appears in the
// SKILL.md table with the SAME band and the SAME served default; every
// served field is documented with the same default; the boolean seats are
// documented as false; and both bag skills name ALL FIFTEEN one-door pairs the
// card refuses (five bags → ten unordered pairs), derived from the card's
// own armed kinds rather than a hand list.
import "../../../../tests/helpers/boot-models.ts";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { loadCardDefs } from "@melite/comfyui-cordis";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { RESHOOT_DIAL_BOUNDS } from "../../../models/h3/src/reshoot.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILLS = join(HERE, "..", "src", "agents", "skills");
const readSkill = (name: string): string =>
  readFileSync(join(SKILLS, name, "SKILL.md"), "utf-8");

let def: CardDefinition;
let reshootKind: Record<string, unknown>;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  reshootKind = ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
    .find((k) => k.kind === "reshoot")!;
  assert.ok(reshootKind, "the served card carries the reshoot mod kind");
});

type FieldRow = { name: string; default: unknown; min?: number; max?: number };
const fields = (): Map<string, FieldRow> =>
  new Map(
    ((reshootKind.fields as FieldRow[] | undefined) ?? []).map((f) => [f.name, f]),
  );

/** The skill's dial line: `- \`name\` (BAND, DEFAULT) — prose`. Returns
 *  the band and default as numbers, or null when the line is absent. */
const dialLine = (md: string, name: string): { band: string; def: number } | null => {
  const m = md.match(new RegExp(`^\\s*- \`${name}\` \\(([^,]+), ([^)]+)\\)`, "m"));
  if (m === null) return null;
  const bare = (s: string): number => Number(s.trim().replace("−", "-"));
  return { band: m[1]!.trim(), def: bare(m[2]!) };
};

/** Parse the skill's band notation: `±180` or `lo–hi` (unicode minus and
 *  en dash, the doc's own typography). */
const bandOf = (band: string): [number, number] => {
  const num = (s: string): number => Number(s.replace("−", "-"));
  if (band.startsWith("±")) {
    const n = num(band.slice(1));
    return [-n, n];
  }
  const [lo, hi] = band.split("–");
  return [num(lo!), num(hi!)];
};

describe("the re-shoot skill's dial table agrees with the code's own homes", () => {
  it("ARM 1 — every emission-bounded dial carries the SAME band and served default (numbers, not phrases)", () => {
    const md = readSkill("reshoot");
    const served = fields();
    for (const [name, [lo, hi]] of Object.entries(RESHOOT_DIAL_BOUNDS)) {
      const line = dialLine(md, name);
      assert.ok(line !== null, `SKILL.md states the ${name} band`);
      assert.deepEqual(bandOf(line.band), [lo, hi],
        `SKILL.md's ${name} band ${line.band} == RESHOOT_DIAL_BOUNDS [${lo}, ${hi}]`);
      const row = served.get(name);
      assert.ok(row !== undefined, `the card serves the ${name} row`);
      assert.equal(line.def, row.default,
        `SKILL.md's ${name} default ${line.def} == the served row's ${String(row.default)}`);
      assert.equal(row.min, lo);
      assert.equal(row.max, hi);
    }
  });

  it("ARM 2 — the boolean seats are documented as off and served as false", () => {
    const md = readSkill("reshoot");
    const served = fields();
    // one shared line names both flags with their default
    assert.match(md, /`smooth_depth` \/ `invert_depth` \(false\)/);
    for (const name of ["smooth_depth", "invert_depth"]) {
      assert.equal(served.get(name)?.default, false, `${name} serves false`);
    }
  });

  it("ARM 3 — both bag skills name the ONE surviving pair and the five alias names, derived from the card's armed kinds", () => {
    // the armed bags are the card's own list — a door is every armed
    // kind except the co-arming adapter bag (GAPS-19: the refine door
    // stacks windows, so the roster follows the kind, not the ceiling);
    // six kinds → fifteen unordered pairs, so a seventh bag forces both
    // docs to state its six new pairs
    const kinds = ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
      .filter((k) => typeof k.param_key === "string" && k.kind !== "loras")
      .map((k) => String(k.param_key));
    expect(kinds.sort()).toEqual(["edit", "reshoot"]);
    const pairs: string[] = [];
    for (let i = 0; i < kinds.length; i++) {
      for (let j = i + 1; j < kinds.length; j++) pairs.push(`${kinds[i]}↔${kinds[j]}`);
    }
    expect(pairs).toHaveLength(1);
    // the five legacy names are preset cells of the edit bag — a leaf
    // that still teaches them as doors would send an agent at a
    // removed surface, so both leaves name the alias law
    for (const legacy of ["replace", "repair", "extend", "refine", "upscale"]) {
      for (const skill of ["reshoot", "swap"]) {
        assert.match(readSkill(skill), new RegExp(legacy),
          `${skill}/SKILL.md names the ${legacy} alias spelling`);
      }
    }
    for (const skill of ["reshoot", "swap"]) {
      const md = readSkill(skill);
      const lower = md.toLowerCase();
      for (const pair of pairs) {
        const [a, b] = pair.split("↔");
        const arrow = lower.includes(`${a}↔${b}`) || lower.includes(`${b}↔${a}`);
        const prose = lower.includes(`${a}`) && lower.includes(`${b}`) &&
          /refuse/i.test(md) && /armed/i.test(md);
        assert.ok(arrow || prose,
          `${skill}/SKILL.md names the ${pair} refusal (arrow or armed-refusal prose)`);
      }
      assert.match(md, /one door per doc/i, `${skill}/SKILL.md states the law`);
    }
    // Friction-report doc nit (item 10): the reshoot leaf used to teach the
    // false universal ("ANY two armed mod bags REFUSE"), while `loras` is the
    // seventh bag and coexists with every arm. The pairs above are the six-arm
    // law; this arm pins the exemption in words.
    const reshootMd = readSkill("reshoot");
    assert.doesNotMatch(reshootMd, /ANY two armed mod bags/i,
      "reshoot/SKILL.md must not teach the false universal — loras is exempt");
    assert.match(reshootMd, /THE LORA BAG IS NOT AN ARM/i,
      "reshoot/SKILL.md names the lora-bag exemption");
    assert.match(reshootMd, /co-arming rider/i,
      "reshoot/SKILL.md names loras as the co-arming rider (never a pair member)");
    assert.match(reshootMd, /COEXISTS/i,
      "reshoot/SKILL.md states that loras coexists with any armed arm");
  });

  it("THE STAMP LAW: the re-shoot skill names what is live-proven, its unproven half, and cites no archaeology", () => {
    // The served skill states its verification posture as plain
    // present-tense law: what the door has proven, and what is STILL
    // unproven (the honest half — never a blanket claim over an
    // unrendered chain). Served copy carries no history archaeology:
    // no dated stamp, no receipt path, no run id — dev_docs owns that
    // material.
    const md = readSkill("reshoot");
    assert.match(md, /TWO doors/i,
      "reshoot/SKILL.md states the served roster (TWO doors) in plain present-tense law");
    assert.match(md, /COEXISTS/i,
      "reshoot/SKILL.md states the loras co-existence law");
    assert.doesNotMatch(md, /VERIFIED LIVE \d{4}-\d{2}-\d{2}/,
      "reshoot/SKILL.md carries no dated VERIFIED LIVE stamp");
    assert.doesNotMatch(md, /receipts\/[a-z0-9-]+\.md/,
      "reshoot/SKILL.md cites no receipt path");
    assert.doesNotMatch(md, /run-[0-9a-f]{8,}/,
      "reshoot/SKILL.md cites no run id");
  });
});
