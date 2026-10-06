// inline-safe-surface.spec.ts — INLINE_SAFE IS THE MEASURED
// MELITE IMPORT SURFACE, walled (batch AK, 2026-10-17).
//
// The inline allowlist in packages/web/shared/tsdown.client.ts
// drifted twice: dsh-session and dsh-host-apiproxy rode the preset
// from its first day with ZERO importers, and the roadmap row
// ("diverges from upstream's") read the delta as a mystery rather
// than a measurement. This wall makes the set self-policing: every
// member must be imported by melite code (a member nothing imports
// is a stale allowance, refused), and the five measured members
// must all be present (an accidental drop is refused too — each
// has live importers the bundles inline).
//
// Run: npx vitest run tests/walls/ts/suites/inline-safe-surface.spec.ts

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const CONFIG = join(repoRoot, "packages", "web", "shared", "tsdown.client.ts");

/** The allowlist's members, read from the config's own regex
 * literal (the config is the single home; the wall never re-spells
 * the set). Parsed by string slicing — matching a regex literal
 * with another regex is its own bug class. */
function inlineSafeMembers(): string[] {
  const text = readFileSync(CONFIG, "utf8");
  const line = text.split("\n").find((l) => l.startsWith("const INLINE_SAFE = "));
  assert.ok(line !== undefined, "INLINE_SAFE declaration not found in tsdown.client.ts");
  const open = line.indexOf("(");
  const close = line.indexOf(")", open);
  assert.ok(open !== -1 && close > open, "INLINE_SAFE alternation group not found");
  return line.slice(open + 1, close).split("|");
}

/** Every @deepseek-ai/dsh-* package name imported anywhere in
 * melite's packages tree (src/test alike, node_modules and built
 * lib/ skipped, the shared tsdown config itself skipped — it names
 * the set, it does not use it). */
function importedDshPackages(): Set<string> {
  const found = new Set<string>();
  const importRe = /['"]@deepseek-ai\/(dsh-[a-z0-9-]+)[/'"]/g;
  const walk = (dir: string): void => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name === "lib" || ent.name.startsWith(".")) continue;
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { walk(full); continue; }
      if (!/\.(ts|tsx)$/.test(ent.name)) continue;
      if (full === CONFIG) continue;
      const text = readFileSync(full, "utf8");
      for (const m of text.matchAll(importRe)) found.add(m[1] as string);
    }
  };
  walk(join(repoRoot, "packages"));
  return found;
}

describe("INLINE_SAFE — the measured melite surface", () => {
  const members = inlineSafeMembers();
  const imported = importedDshPackages();

  it("every member is imported by melite code (a zero-importer member is a stale allowance)", () => {
    const stale = members.filter((m) => !imported.has("dsh-" + m));
    assert.deepEqual(stale, [], "stale INLINE_SAFE members — remove them or import them");
  });

  it("the five measured members are all present (no accidental drop)", () => {
    for (const m of ["llm", "tools", "brand", "typert-protocol", "util-values"]) {
      assert.ok(members.includes(m), "dsh-" + m + " has live importers — INLINE_SAFE must keep it");
    }
  });

  it("the set has no duplicate members", () => {
    assert.equal(new Set(members).size, members.length);
  });
});
