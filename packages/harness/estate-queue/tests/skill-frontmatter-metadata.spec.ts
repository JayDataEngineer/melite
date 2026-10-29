// THE SKILL-FRONTMATTER METADATA WALL (the skills-vs-dsh-autodocs
// audit's cure 3, 2026-11-12; DSH template
// verify-skill-invocation-metadata): every served SKILL.md's
// frontmatter carries a non-empty name and description, and the
// SERVED tier-1 line carries that description VERBATIM — the
// operator's ruling (2026-11-12: "qwen 21 can accept very long
// prompts and skills — that is intentional") seats the law: the
// length is the author's, the serve must never cut it (readDoc used
// to slice(0, 200), mangling intentional lines mid-word on every
// load with no wall seeing it). Also: no description imposes a read
// duty the door's craft law defers (the s1 burn: prompt-enhance's
// tier-1 line demanded "read before writing" while the door's law
// says the craft line suffices — the agent paid the read). The
// roster DERIVES from the real tree (every agents/skills member
// under the packages and the flows' own SKILL.md leaves), never a
// hand list; the census floor is a tripwire against a collapsed
// walk, not coverage. No @contract marker: package-local law.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { frontmatter } from "../src/skillFrontmatter.ts";
import { readDoc } from "../src/skillRows.ts";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

/** Every served skill leaf, derived: flows' top-level SKILL.md rows
 * and every package's agents/skills dir members (cards' src trees
 * and engine model families alike — both serve tier-1 lines). */
const skillLeaves = (): string[] => {
  const out: string[] = [];
  const walk = (dir: string, depth: number): void => {
    if (depth > 6) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      if (e === "node_modules" || e === "lib" || e.startsWith(".")) continue;
      const full = join(dir, e);
      let isDir: boolean;
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        continue;
      }
      if (!isDir) continue;
      if (e === "skills") {
        for (const s of readdirSync(full)) {
          const leaf = join(full, s, "SKILL.md");
          try {
            statSync(leaf);
            out.push(leaf);
          } catch {
            /* a non-dir skill member (plain.md rows) — not this wall's shape */
          }
        }
        continue;
      }
      walk(full, depth + 1);
    }
  };
  // flows' SKILL.md leaves serve through the flow registry row (no
  // frontmatter tier-1 line — their description law is the flows
  // walls' own), so this census walks the packages tree only.
  walk(join(REPO, "packages"), 0);
  return out;
};

describe("every served SKILL.md's frontmatter (the tier-1 line's metadata law)", () => {
  it("carries a non-empty name and description, and the served row carries the description VERBATIM (never a mid-word cut)", () => {
    const leaves = skillLeaves();
    assert.ok(leaves.length >= 20, `the skill census rides (${leaves.length} leaves; a collapsed walk must not green silently)`);
    for (const leaf of leaves) {
      const text = readFileSync(leaf, "utf8");
      const fm = frontmatter(text);
      const rel = leaf.slice(REPO.length + 1);
      assert.ok(fm.name.trim() !== "", `${rel}: frontmatter name is empty — the served row would carry no name`);
      assert.ok(fm.description.trim() !== "", `${rel}: frontmatter description is empty — the served tier-1 line would be blank`);
      // THE SERVE JUDGMENT: through the real row builder (readDoc —
      // the door every skill row rides), the served description is
      // the authored description, WHOLE. The operator's ruling seats
      // the direction: long lines are intentional (qwen 21 accepts
      // very long prompts and skills); a truncation here mangles
      // every load.
      const served = readDoc(leaf, "wall:" + rel, "card", null, null, null);
      assert.ok(served, `${rel}: readDoc built no row`);
      const servedDesc = (served.row as { description: string }).description;
      assert.equal(
        servedDesc,
        fm.description,
        `${rel}: the served tier-1 line must equal the authored description verbatim (${servedDesc.length} served vs ${fm.description.length} authored)`,
      );
    }
  });

  it("no description imposes a read duty the door's craft law defers (the s1 burn class)", () => {
    const leaves = skillLeaves();
    assert.ok(leaves.length >= 20, `the skill census rides (${leaves.length} leaves; a collapsed walk must not green silently)`);
    for (const leaf of leaves) {
      const fm = frontmatter(readFileSync(leaf, "utf8"));
      const rel = leaf.slice(REPO.length + 1);
      assert.ok(
        !/read (it )?before writing/i.test(fm.description),
        `${rel}: the tier-1 line demands a pre-read — the door's craft law makes skills deepening reads, never required pre-reads`,
      );
    }
  });
});
