/**
 * REFERENCES SEED PIN (2026-11-21 — the refs-drift audit's owed wall,
 * ROADMAP row "RE-SEAT THE SEEDED REFERENCES LAW", audit
 * dev_docs/audits/2026-11-20-dsh-refs-drift-audit.md).
 *
 * THE LAW: `references/` is SEEDED, NEVER GIT-TRACKED (AGENTS.md Layer
 * A) — a fresh clone carries none of it, and nothing in the build or
 * test tiers reads it. Because the seed is invisible to git, its seed
 * DRIFTED two generations silently (dsh-v0.2.1-alpha.4 ->
 * dsh-v0.2.2-rc.5; the audit found it by reading the tree's own
 * package.json). The cure is a TRACKED pin — tools/references-pin.json
 * — that names the tag the seed must carry, and a STAMP inside the
 * seed (`references/.seed-stamp.json`, untracked by law alongside the
 * rest of references/) that names the pin it was seeded from. The wall
 * judges the join, so the next drift reds instead of hiding.
 *
 * THE ARMS (each its own firing path — LAW 4 enforcement):
 *   1. THE PIN IS REAL — the tracked pin file parses and is coherent
 *      (tag shape, stamp path rooted in the ignored seed tree, the
 *      tree-version row agreeing with the tag). Always judged; the one
 *      arm a fresh clone runs.
 *   2. THE SILENCE — references/ present but the stamp missing or
 *      unparseable: a seed that names nothing is the exact class that
 *      hid two generations of drift.
 *   3. THE DRIFT — the stamp names a pin other than the tracked pin:
 *      the seed and the law disagree; reseed to the pin or move the
 *      pin deliberately (a tracked diff, never a silent one).
 *   4. THE LAYOUT — the pinned source layout (cordis-paper.txt +
 *      deepseek-harness/docs/) is present; a partial seed is the
 *      drift-adjacent silence.
 *   5. THE TREE TRUTH — the seed tree's own version marker
 *      (deepseek-harness/package.json) equals the pin's expected
 *      version: the audit's own door. A tree rsynced forward without
 *      the stamp moving reds here; a stamp moved without the tree
 *      reds on arm 3 or here.
 *   6. THE FRESH CLONE — references/ absent: nothing seeded, nothing
 *      to judge; the wall never demands the seed (untracked by law).
 *
 * Run: npx vitest run tests/walls/ts/suites/references-pin.spec.ts
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE: string = dirname(fileURLToPath(import.meta.url));
const REPO: string = join(HERE, "..", "..", "..", "..");

/** The tracked pin (the truth home; an operator reseeds it with a
 *  visible diff, never silently). */
interface ReferencesPin {
  expected_tag: string;
  stamp_path: string;
  layout: string[];
  tree_version: { file: string; field: string; expected: string };
}

const PIN_REL = "tools/references-pin.json";
const SEED_ROOT = join(REPO, "references");
const SEEDED = existsSync(SEED_ROOT);

function readPin(): ReferencesPin {
  return JSON.parse(readFileSync(join(REPO, PIN_REL), "utf8")) as ReferencesPin;
}

/** The stamp's payload; unparseable stamps are the silence class, so
 *  the parse failure is the arm's red, never a crash. */
function readStamp(path: string): { pin?: unknown } | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as { pin?: unknown };
  } catch {
    return null;
  }
}

describe("THE REFERENCES SEED PIN WALL (the seed names the pin it was seeded from)", () => {
  it("ARM 1 — the tracked pin is real and coherent (the fresh clone's only judge)", () => {
    expect(existsSync(join(REPO, PIN_REL)), `the pin file ${PIN_REL} is tracked law — it cannot go missing`).toBe(true);
    const pin = readPin();
    expect(pin.expected_tag, "the pin names a dsh tag").toMatch(/^dsh-v\d+\.\d+\.\d+/);
    expect(pin.stamp_path, "the stamp lives inside the ignored seed tree (references/), never tracked").toMatch(/^references\//);
    expect(pin.layout.length, "the pin pins a non-empty source layout (a layout-less pin pins nothing)").toBeGreaterThan(0);
    const stripped = pin.expected_tag.slice("dsh-v".length);
    expect(
      pin.tree_version.expected,
      `the tree-version row must agree with the tag (${pin.tree_version.expected} vs ${stripped}) — an incoherent pin drifts its own arms apart`,
    ).toBe(stripped);
  });

  it("ARM 2 — a present references/ carries a stamp naming the pin (THE SILENCE)", () => {
    if (!SEEDED) return; // fresh clone: arm 6 owns the absent path
    const pin = readPin();
    const stampPath = join(REPO, pin.stamp_path);
    expect(
      existsSync(stampPath),
      `THE SILENCE — references/ is seeded but ${pin.stamp_path} is missing: the seed names no pin, the exact class that hid the two-generation drift. Write the stamp naming ${pin.expected_tag} (the tracked pin ${PIN_REL}) when you seed`,
    ).toBe(true);
    const stamp = readStamp(stampPath);
    expect(stamp, `the seed stamp ${pin.stamp_path} is not parseable JSON — a stamp that names nothing is the silence`).not.toBeNull();
    expect(
      typeof stamp?.pin,
      `the seed stamp ${pin.stamp_path} carries no "pin" field — it names no pin`,
    ).toBe("string");
  });

  it("ARM 3 — the stamp names the tracked pin, never a different generation (THE DRIFT)", () => {
    const pin = readPin();
    const stampPath = join(REPO, pin.stamp_path);
    if (!existsSync(stampPath)) return; // arm 2 owns the missing stamp
    const stamp = readStamp(stampPath);
    if (stamp === null || typeof stamp.pin !== "string") return; // arm 2 owns the unparseable stamp
    expect(
      stamp.pin,
      `THE DRIFT — the seed stamp names ${stamp.pin} but the tracked pin ${PIN_REL} names ${pin.expected_tag}: reseed references/ to ${pin.expected_tag} (source checkout, never node_modules) or move the pin deliberately with its tree_version + layout`,
    ).toBe(pin.expected_tag);
  });

  it("ARM 4 — the pinned source layout is present (a partial seed is a silence)", () => {
    if (!SEEDED) return;
    const pin = readPin();
    const missing = pin.layout.filter((rel) => {
      const p = join(SEED_ROOT, rel);
      try {
        statSync(p);
        return false;
      } catch {
        return true;
      }
    });
    expect(
      missing,
      `THE LAYOUT — the seed is missing pinned paths of ${pin.expected_tag}: ${JSON.stringify(missing)} — reseed from the DSH source checkout (AGENTS.md Layer A), never a partial copy`,
    ).toEqual([]);
  });

  it("ARM 5 — the seed tree's own version marker equals the pin (THE TREE TRUTH, the audit's door)", () => {
    const pin = readPin();
    const treeFile = join(REPO, pin.tree_version.file);
    if (!SEEDED || !existsSync(treeFile)) return; // fresh clone / tree-less stamp: nothing to judge
    const tree = JSON.parse(readFileSync(treeFile, "utf8")) as Record<string, unknown>;
    expect(
      String(tree[pin.tree_version.field]),
      `THE TREE TRUTH — ${pin.tree_version.file} carries version ${String(tree[pin.tree_version.field])} but the pin expects ${pin.tree_version.expected}: the tree moved without the pin (or vice versa) — reseed/re-pin as ONE step, then rewrite the stamp`,
    ).toBe(pin.tree_version.expected);
  });

  it("ARM 6 — the fresh clone passes: references/ absent, nothing seeded, nothing to judge", () => {
    if (SEEDED) return; // seeded machines are judged by arms 2-5
    expect(
      existsSync(SEED_ROOT),
      "references/ reappeared mid-run — re-run the suite; the seeded path is judged by arms 2-5",
    ).toBe(false);
    // The law holds with zero demands beyond arm 1's tracked plane:
    // the wall never requires references/ to exist (untracked by law).
    expect(readPin().expected_tag).toMatch(/^dsh-v/);
  });
});
