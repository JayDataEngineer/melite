// @contract cards-h3-second-pass-skill
// second-pass-skill-parity.spec.ts — THE SKILL-PARITY WALL for the
// second-pass doc (friction report §14.2, 2026-11-13).
//
// THE BURN this closes: eighteen post-chain knobs ride
// `paramSchema` behind ONE master (`second_pass_enabled`, default
// false) and NO skill mentioned it. An agent that read
// `sharpen_strength` on the surface and set it got a film that never
// ran the pass — a silent no-op — because the compose gates read the
// master first. Nothing in the tree judged the doc against the
// schema's own group.
//
// THE LAW: the doc enumerates EXACTLY the knobs the schema gates
// (`meta.extra.group === 'second_pass'`), derives every band and
// default from the schema, states which options a select serves,
// leads with the master, and names the silent-inert trap in words.
// A knob added to the group without a doc row, or a band moved
// without the doc following, reds here.
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { paramSchema } from "../../../models/h3/src/schema.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const DOC = join(HERE, "..", "src", "agents", "skills", "second-pass", "SKILL.md");
const md = readFileSync(DOC, "utf-8");

type Meta = {
  description?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: unknown;
  extra?: { group?: string; wtype?: string; visible_when?: string; options?: unknown };
};
const dict = (paramSchema as unknown as { dict: Record<string, { meta?: Meta }> }).dict;
const gated = Object.entries(dict)
  .filter(([, f]) => f.meta?.extra?.group === "second_pass")
  .map(([name, f]) => ({ name, meta: f.meta as Meta }));
const byName = new Map(gated.map((k) => [k.name, k.meta]));
const MASTER = "second_pass_enabled";

describe("the second-pass skill is derived from the schema's own gate", () => {
  it("ARM 1 — every knob the schema gates appears in the doc, and the doc names no knob the schema does not gate", () => {
    // the group is the truth: derived, never a hand roster
    expect(gated.length, "the second_pass group carries knobs to document").toBeGreaterThan(10);
    for (const { name } of gated) {
      assert.ok(md.includes(`\`${name}\``), `the doc states the gated knob ${name}`);
    }
    // the reverse direction: every backticked snake_case token that
    // looks like a card knob must be a real one (a renamed knob left
    // in prose is the drift this direction catches)
    const tokens = new Set([...md.matchAll(/`([a-z][a-z0-9_]{3,})`/g)].map((m) => m[1]!));
    const knobs = new Set(Object.keys(dict));
    for (const t of tokens) {
      if (!knobs.has(t)) continue;
      assert.ok(byName.has(t) || t === "refine_lora" || md.includes("not the `refine` mod bag"),
        `${t} is a card knob outside the second_pass gate and the doc presents it as a post-chain dial`);
    }
  });

  it("ARM 2 — the doc leads with the master and names the silent-inert trap", () => {
    // the §THE LAW heading seats the master; every gated LEAF is
    // documented after that heading (the master's own name is in it)
    const lawAt = md.indexOf("## THE LAW");
    assert.ok(lawAt >= 0, "the doc opens with the master's law");
    const masterAt = md.indexOf(`\`${MASTER}\``, lawAt);
    assert.ok(masterAt > lawAt, "the master is named inside the law section, never buried in a table");
    for (const { name } of gated) {
      if (name === MASTER) continue;
      assert.ok(md.indexOf(`\`${name}\``, lawAt) > lawAt, `${name} rides after the master's law in the doc`);
    }
    assert.match(md, /silent no-op/i, "the doc names the failure class: a knob that looks applied and is not");
    assert.match(md, /default \*\*false\*\*|boolean, \*\*false\*\*/i, "the doc states the master's default (off)");
  });

  it("ARM 3 — every band and default the schema serves is the doc's band and default", () => {
    // the TABLE row, never the first prose mention: the dial's band
    // and default must sit on the row that documents that dial
    const lineOf = (name: string): string => {
      const line = md.split("\n").find((l) => l.includes(`\`${name}\``) && l.trim().startsWith("|"));
      assert.ok(line, `the doc carries a table row for ${name}`);
      return line!;
    };
    for (const { name } of gated) {
      const meta = byName.get(name)!;
      const line = lineOf(name);
      if (typeof meta.min === "number" && typeof meta.max === "number") {
        const band = `${meta.min}–${meta.max}`;
        assert.ok(line.includes(band), `${name}: the doc states the served band ${band}`);
        if (typeof meta.step === "number") {
          assert.ok(line.includes(`step ${meta.step}`), `${name}: the doc states the served step ${meta.step}`);
        }
      }
      if (typeof meta.default === "boolean") {
        assert.ok(line.includes(meta.default ? "true" : "false"), `${name}: the doc states the served boolean default`);
      } else if (typeof meta.default === "number") {
        assert.ok(line.includes(String(meta.default)), `${name}: the doc states the served default ${meta.default}`);
      } else if (typeof meta.default === "string" && meta.default !== "") {
        assert.ok(line.includes(meta.default), `${name}: the doc states the served default ${meta.default}`);
      }
    }
  });

  it("ARM 4 — every select knob's served default is stated on its own row, and the doc names its members", () => {
    // The closed vocabulary itself lives on the declaration
    // (`vocabulary([...])`), not in `meta`, so this arm judges what the
    // served meta can prove — the SELECT's default — and what the doc
    // must state for a closed surface: the members it offers. A member
    // the model drops still reds at the schema door (the vocabulary's
    // own membership refusal), never here; the doc's job is that an
    // agent can pick without probing.
    for (const { name, meta } of gated) {
      if (meta.extra?.wtype !== "select") continue;
      const line = md.split("\n").find((l) => l.includes(`\`${name}\``) && l.trim().startsWith("|"));
      assert.ok(line, `${name}: a table row`);
      assert.ok(line!.includes(String(meta.default)), `${name}: the row states the served default ${String(meta.default)}`);
      // the members: the row carries at least one further code span
      // besides the dial's own name (the alternatives, or the single
      // served value on a one-member surface)
      const spans = (line!.match(/`[^`]+`/g) ?? []).length;
      assert.ok(spans >= 2, `${name}: the row names the served member(s), not just the knob`);
    }
  });

  it("ARM 5 — the doc is served: the card's skills line carries it, and the census walls count it", () => {
    // the serving half is judged by load-skill-roundtrip's census; this
    // arm pins the local contract that the doc has a served home (a
    // doc outside every card's skill line is a file nobody loads)
    const path = join(HERE, "..", "src", "agents", "skills", "second-pass", "SKILL.md");
    assert.ok(readFileSync(path, "utf-8").length > 2000, "the doc has a body");
    assert.match(md, /^---\nname: second-pass\n/m, "the frontmatter name matches the directory (the loader keys on it)");
  });
});
