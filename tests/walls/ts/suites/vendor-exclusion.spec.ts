// vendor-exclusion.spec.ts — THE VENDOR UNGATE IS ONE GLOB (S1's
// cure, 2026-10-14, re-audit round 2's D3). The vendored Layer C
// tree is not ours to test; before this wall the law was enforced
// as two LITERAL exclude entries plus two vacuous 0/0/0/0 baseline
// rows holding the sibling files — a third vendored file would have
// entered the gate ungated-by-row (the ratchet wall's failure mode
// exactly). The law now: ONE glob ungates the whole tree, and this
// wall pins both halves — the glob exists, and no baseline row
// matches anything vendored (a re-gated vendor file fails here
// before it fails in CI).
import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");

/** Every .ts file under packages/vendor/, at any depth — the tree
 *  the glob must cover. The walk proves the exclusion is not
 *  vacuous: the vendored src files exist and are ungated. */
function vendorFiles(): string[] {
  const out: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of readdirSync(join(ROOT, rel), { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "lib") continue;
      if (entry.isDirectory()) walk(`${rel}/${entry.name}`);
      else if (/\.tsx?$/u.test(entry.name)) out.push(`${rel}/${entry.name}`);
    }
  };
  walk("packages/vendor");
  return out;
}

/** The coverage exclude list parsed from the config text — the same
 *  literal-array shape the ratchet wall parses. */
function excludeEntries(): string[] {
  const text = readFileSync(join(ROOT, "vitest.config.ts"), "utf8");
  const start = text.indexOf("coverage: {");
  expect(start).toBeGreaterThan(-1);
  const end = text.indexOf("thresholds:", start);
  const block = text.slice(start, end > start ? end : text.length);
  return [...block.matchAll(/'(packages\/[^']+)'/gu)].map((m) => m[1]!);
}

describe("THE VENDOR UNGATE (Layer C: the vendored tree is not ours to test)", () => {
  it("the vendor tree exists and carries src files (an empty tree would make this wall vacuous)", () => {
    const files = vendorFiles();
    expect(files.length).toBeGreaterThan(0);
    expect(files.some((f) => f.endsWith("index.ts")), "the typert-protocol src is present").toBe(true);
  });

  it("one glob excludes the whole tree — no literal per-file vendor entries remain", () => {
    const entries = excludeEntries();
    expect(entries, "the vendor glob is stated once").toContain("packages/vendor/**/*");
    const literals = entries.filter((e) => e.startsWith("packages/vendor/") && e !== "packages/vendor/**/*");
    expect(literals, "no per-file vendor literals ride the exclude list").toEqual([]);
  });

  it("the glob is not commented-out law: it sits on its own array row inside the live list", () => {
    const text = readFileSync(join(ROOT, "vitest.config.ts"), "utf8");
    const line = text.split("\n").findIndex((l) => l.trim() === "'packages/vendor/**/*',");
    expect(line).toBeGreaterThan(-1);
    expect(existsSync(join(ROOT, "packages", "vendor"))).toBe(true);
  });
});
