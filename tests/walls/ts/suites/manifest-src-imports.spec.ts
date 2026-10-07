// manifest-src-imports.spec.ts — runtime() VALUE IMPORTS ARE
// runtime() DEPENDENCIES, walled (batch AN, 2026-10-17).
//
// The DSH practice row's manifest-discipline item, measured: five
// packages VALUE-imported runtime seats (@melite/contracts,
// mask-studio, catalog, the atoms, typert, schemastery) while
// declaring them only in devDependencies — and the two atoms
// cases were invisible to the s4 atom-host census, which reads
// dependencies alone. A dev-only runtime import also breaks a
// consumer's install (the dep ships missing).
//
// The wall derives every package's VALUE imports from src (an
// `import type` binds nothing at runtime and is exempt; cordis is
// exempt everywhere — the peer law: harness packages declare
// @deepseek-ai/cordis in peer/devDependencies, the host provides
// it; a self-name import, bare or subpath, is the package's own
// exports row) and refuses a runtime import that is not in
// dependencies.
//
// Run: npx vitest run tests/walls/ts/suites/manifest-src-imports.spec.ts

import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

interface PkgRow {
  dir: string;
  name: string;
  deps: Set<string>;
}

function discoverPackages(): PkgRow[] {
  const out: PkgRow[] = [];
  const walk = (dir: string): void => {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
      if (ent.name === "e2e") continue; // profile seeds link, never install
      const full = join(dir, ent.name);
      if (ent.isDirectory()) { walk(full); continue; }
      if (ent.name !== "package.json") continue;
      try {
        const pkg = JSON.parse(readFileSync(full, "utf8")) as {
          name?: string; dependencies?: Record<string, string>;
        };
        if (typeof pkg.name !== "string" || pkg.name === "") continue;
        out.push({ dir: dirname(full), name: pkg.name, deps: new Set(Object.keys(pkg.dependencies ?? {})) });
      } catch { /* unparseable manifests are another gate's voice */ }
    }
  };
  walk(join(repoRoot, "packages"));
  return out;
}

/** VALUE imports of workspace/published @ scopes from a package's
 * src tree — an `import type` / `export type` binding is compile-
 * only and exempt; block-form imports hold their whole span. */
function valueImportsOf(pkg: PkgRow): Map<string, number> {
  const found = new Map<string, number>();
  const files: string[] = [];
  const walk = (dir: string): void => {
    try {
      for (const ent of readdirSync(dir, { withFileTypes: true })) {
        if (ent.name === "node_modules" || ent.name.startsWith(".")) continue;
        const full = join(dir, ent.name);
        if (ent.isDirectory()) { walk(full); continue; }
        if (/\.(ts|tsx)$/.test(ent.name)) files.push(full);
      }
    } catch { /* absent dir: nothing to read */ }
  };
  walk(join(pkg.dir, "src"));
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    let inBlock = false;
    for (const raw of lines) {
      const t = raw.trim();
      if (t.startsWith("//") || t.startsWith("*")) continue;
      if (inBlock) { if (t.includes("}")) inBlock = false; continue; }
      if (/^import\s+type\b/.test(t) || /^export\s+type\b/.test(t)) continue;
      const isImport = /^import\b/.test(t) || /^export\b.*\bfrom\b/.test(t);
      if (!isImport) continue;
      if (t.includes("{") && !t.includes("}")) inBlock = true;
      const m = /from\s+["']([^"']+)["']/.exec(t) ?? /^import\s+["']([^"']+)["']/.exec(t);
      if (m === null) continue;
      const spec = m[1] as string;
      if (!spec.startsWith("@melite/") && !spec.startsWith("@deepseek-ai/")) continue;
      const id = spec.split("/").length > 2 ? spec.split("/").slice(0, 2).join("/") : spec;
      if (id === pkg.name) continue; // self-name import: own exports row
      found.set(id, (found.get(id) ?? 0) + 1);
    }
  }
  return found;
}

describe("runtime value imports are runtime dependencies", () => {
  it("every src VALUE import sits in dependencies (cordis peer law and type-only imports exempt)", () => {
    const offenders: string[] = [];
    for (const pkg of discoverPackages()) {
      for (const id of valueImportsOf(pkg).keys()) {
        if (id === "@deepseek-ai/cordis") continue; // the peer law
        if (!pkg.deps.has(id)) offenders.push(pkg.name + " value-imports " + id + " (deps lacks it)");
      }
    }
    assert.deepEqual(offenders, []);
  });
});
