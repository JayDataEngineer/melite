// release-set-proof.spec.ts — THE RELEASE-SET TRUTH JUDGE (kill-
// residue audit O8, 2026-10-12; closed in the "FIX ALL GAPS" round):
// tools/release-set.json is a hand-maintained manifest with no code
// consumer, so excisions and joins drift it silently — the
// autoremesher excision (2026-10-13) left `@melite/3d-quad-remesh`
// and `@melite/models-autoremesher` as dead rows while never adding
// the flux-klein join, and `count` had drifted to 97 over 80 names.
// This wall pins the manifest to the PACKAGES TREE (derived roster,
// never a hand count): every row names a real workspace package,
// every melite package is listed, and count === names.length.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const SET_F = join(ROOT, "tools", "release-set.json");

const isDir = (p: string): boolean => {
  try { return statSync(p).isDirectory(); } catch { return false; }
};

/** Every melite package name in the tree (the derived roster): a
 * full recursive walk of packages/ for package.json files (skip
 * node_modules/lib/dist) — plugin names live DEEP (the engine's
 * card tenants sit at engines/comfyui/src/action_cards/3d/ui).
 * Vendored/private rescopes are @deepseek-ai/* — not this set's
 * plane. */
function melitePackages(): string[] {
  const names: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      if (e === "node_modules" || e === "lib" || e === "dist") continue;
      const p = join(dir, e);
      if (!isDir(p)) continue;
      const pj = join(p, "package.json");
      if (existsSync(pj)) {
        const { name } = JSON.parse(readFileSync(pj, "utf8")) as { name?: string };
        if (name?.startsWith("@melite")) names.push(name);
      }
      walk(p);
    }
  };
  walk(join(ROOT, "packages"));
  return [...new Set(names)].sort();
}

describe("the release set names the tree (O8)", () => {
  it("rows === workspace packages, exactly", () => {
    const set = JSON.parse(readFileSync(SET_F, "utf8")) as
      { count?: number; names?: string[] };
    assert.ok(Array.isArray(set.names) && set.names.length > 0,
      "tools/release-set.json carries no names array");
    const tree = melitePackages();
    // MUTATION KILL: a broken walk passes vacuously
    assert.ok(tree.length >= 40, `the packages walk found ${tree.length} — it must find the estate`);
    const rows = new Set(set.names);
    const real = new Set(tree);
    const deadRows = set.names!.filter((n) => !real.has(n));
    const missing = tree.filter((n) => !rows.has(n));
    assert.deepEqual(
      { deadRows, missing },
      { deadRows: [], missing: [] },
      "release-set.json drifts the tree — dead rows name excised packages; missing rows are packages the set never joined",
    );
    assert.equal(set.count, set.names!.length,
      `count (${set.count}) !== names.length (${set.names!.length}) — never a hand count`);
    assert.deepEqual(set.names, [...set.names].sort(), "names stay sorted");
  });
});
