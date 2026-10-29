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
// documented as false; and both bag skills name ALL SIX one-door pairs the
// card refuses (four bags → six unordered pairs), derived from the card's
// own armed kinds rather than a hand list.
import "../../../../tests/helpers/boot-models.ts";
import { existsSync, readFileSync } from "node:fs";
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

  it("ARM 3 — both bag skills name ALL SIX one-door pairs, derived from the card's armed kinds", () => {
    // the armed bags are the card's own list (param_key + max_stack 1);
    // four kinds → six unordered pairs, so a fifth bag forces both docs
    // to state its five new pairs
    const kinds = ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
      .filter((k) => typeof k.param_key === "string" && k.max_stack === 1)
      .map((k) => String(k.param_key));
    expect(kinds.sort()).toEqual(["extend", "repair", "replace", "reshoot"]);
    const pairs: string[] = [];
    for (let i = 0; i < kinds.length; i++) {
      for (let j = i + 1; j < kinds.length; j++) pairs.push(`${kinds[i]}↔${kinds[j]}`);
    }
    expect(pairs).toHaveLength(6);
    for (const skill of ["reshoot", "swap"]) {
      const md = readSkill(skill);
      const lower = md.toLowerCase();
      for (const pair of pairs) {
        const [a, b] = pair.split("↔");
        assert.ok(lower.includes(`${a}↔${b}`) || lower.includes(`${b}↔${a}`),
          `${skill}/SKILL.md names the ${pair} refusal`);
      }
      assert.match(md, /one door per doc/i, `${skill}/SKILL.md states the law`);
    }
  });

  it("THE STAMP LAW (F2, 2026-11-12): the re-shoot skill carries its verified-against line, and the receipt it names EXISTS on disk", () => {
    // F2's burn (h3-timeline friction report): the skill taught a dead
    // flat surface for a whole feature cycle because nothing tied the
    // prose to a dated verification. The stamp is the cheap check: a
    // VERIFIED LIVE line naming its evidence (the F2 sweep's one
    // format everywhere — LIVE + date + receipt + run id), and the
    // receipt it cites is a real file — a moved/deleted receipt reds
    // rather than rots.
    const md = readSkill("reshoot");
    assert.match(md, /VERIFIED LIVE \d{4}-\d{2}-\d{2} against/,
      "reshoot/SKILL.md carries the canonical VERIFIED LIVE stamp (the F2 one-format law)");
    const stamp = /VERIFIED (?:LIVE )?(\d{4}-\d{2}-\d{2}) against ([\s\S]*?)(?=\n\n)/.exec(md);
    assert.ok(stamp, "reshoot/SKILL.md carries a dated VERIFIED line (the doc-stamp law)");
    assert.match(stamp![1]!, /^2026-/, "the stamp is dated");
    const receipt = /receipts\/[a-z0-9-]+\.md/.exec(stamp![2]!);
    assert.ok(receipt, "the stamp names a receipt under dev_docs/contracts/receipts/");
    const root = join(HERE, "..", "..", "..", "..");
    const receiptPath = join(root, "dev_docs", "contracts", receipt![0]!);
    assert.ok(existsSync(receiptPath), `the named receipt exists: ${receipt![0]}`);
    assert.match(stamp![2]!, /NOT yet verified live/i,
      "the stamp names what is STILL unproven (the honest half — never a blanket 'verified live' over an unrendered chain)");
  });
});
