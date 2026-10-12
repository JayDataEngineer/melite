// lib-sync.spec.ts — THE BUILT-LIB SYNC WALL (2026-10-22).
//
// The lesion it kills: the walls tier resolves every workspace
// import through tsconfig paths to SRC, while the deployed lane
// serves the BUILT lib/ through the package exports map. A value
// export that lands in src without a rebuild ships a lane whose
// bundler resolves a lib missing the name — the run dies with
// "(0, m.NAME) is not a function" on a card whose tests all green
// (the Generate Video / seedRecipeStamp crash, audit 004/C4's
// checkpoint). This wall walks every workspace package that
// declares a tsc build, extracts the VALUE exports of its public
// src entries (following the export closure), and refuses the
// package whose built .d.ts face is missing any of them.
//
// Type-only exports are not runtime seams; the signature surface
// stays the typecheck's job. This wall owns presence, not shape.
//
// Run: npx vitest run tests/walls/ts/suites/lib-sync.spec.ts
import { describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

/** The workspace member dirs, expanded from pnpm-workspace.yaml's
 *  glob rows (2026-10-23: the old filter kept only two-part globs;
 *  the workspace's rows are three-segment — domain over package —
 *  so the walk yielded NOTHING and this wall passed vacuously. The
 *  expansion is generic: literal prefix, then one directory level
 *  per star segment; negated rows prune the result).
 *  Exported for the client-bundle sync wall — one walk, one law. */
export function packageDirs(): string[] {
  const text = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  const rows: Array<{ parts: string[]; negated: boolean }> = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*-\s+'([^']+)'/);
    if (!m) continue;
    rows.push({ parts: m[1].split("/"), negated: m[1].startsWith("!") });
  }
  const negated = new Set(
    rows.filter((r) => r.negated).map((r) => r.parts.filter((p) => p !== "!").join("/")),
  );
  const dirs = new Set<string>();
  const expand = (base: string, parts: string[]): void => {
    if (parts.length === 0) {
      if (existsSync(join(base, "package.json"))) dirs.add(base);
      return;
    }
    const [head, ...rest] = parts;
    const dir = join(ROOT, base);
    if (head !== "*") {
      if (existsSync(join(dir, head))) expand(join(base, head), rest);
      return;
    }
    if (!existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === "node_modules" || e.name.startsWith(".")) continue;
      expand(join(base, e.name), rest);
    }
  };
  for (const row of rows) {
    if (row.negated) continue;
    expand("", row.parts);
  }
  return [...dirs].filter((d) => !negated.has(d.slice(ROOT.length + 1)));
}

/** Value-export names stated by one src file's own text (no
 *  following here — the closure walk does that). */
function statedValueExports(src: string): string[] {
  const names: string[] = [];
  // export function f / export async function f / export function* g
  for (const m of src.matchAll(/export\s+(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g)) names.push(m[1]);
  // export const c = (arrow/fn/value — all runtime seams)
  for (const m of src.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)/g)) names.push(m[1]);
  // export class C
  for (const m of src.matchAll(/export\s+class\s+([A-Za-z_$][\w$]*)/g)) names.push(m[1]);
  // export enum E (values live at runtime)
  for (const m of src.matchAll(/export\s+(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/g)) names.push(m[1]);
  // export { a, type B, c as d } — braces lists, skipping type-only
  for (const m of src.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const raw of m[1].split(",")) {
      const item = raw.trim();
      if (!item || item.startsWith("type ")) continue;
      const as = item.match(/^[\w$]+\s+as\s+([A-Za-z_$][\w$]*)$/);
      names.push(as ? as[1] : item.split(/\s/)[0]);
    }
  }
  return [...new Set(names.filter((n) => n && n !== "default"))];
}

/** The src export closure, CHAIN-ACCURATE (2026-10-23): a star
 *  re-export crosses the whole target face, but a NAMED list
 *  (`export { X } from './B'`) crosses only the listed names — the
 *  target's other exports stay internal to the served artifact. The
 *  first cut visited the named target wholesale and over-collected
 *  every internal helper behind a barrel (the bundle wall's face
 *  half false-positive on square-provider/pick-store internals).
 *  Exported for the client-bundle sync wall, which judges the same
 *  closure against the SERVED bundle table (this file owns the tsc
 *  .d.ts face; the bundle is the other artifact plane). */
export function exportClosure(srcPath: string, depth = 0, seen = new Set<string>()): string[] {
  if (depth > 6 || seen.has(srcPath) || !existsSync(srcPath)) return [];
  seen.add(srcPath);
  const text = readFileSync(srcPath, "utf8");
  const names = statedValueExports(text);
  // Star arms only — a named-from list crosses just its aliases,
  // which statedValueExports already collected from this file's own
  // text; the named target is NOT visited.
  for (const m of text.matchAll(/export\s+\*\s+from\s*['"](\.[^'"]+)['"]/g)) {
    const rel = m[1].replace(/\.js$/, ".ts");
    const base = join(dirname(srcPath), rel);
    for (const cand of [base, join(base, "index.ts")]) {
      if (existsSync(cand)) names.push(...exportClosure(cand, depth + 1, seen));
    }
  }
  return [...new Set(names)];
}

export type StaleLib = { pkg: string; entry: string; missing: string[]; cure: string };

/** THE CHECK, exported for the rejection-path proof below: every
 *  value export of a built package's public src face must appear in
 *  the package's built .d.ts face. */
export function staleLibs(packages: string[]): StaleLib[] {
  const stale: StaleLib[] = [];
  for (const dir of packages) {
    const pkgJsonPath = join(dir, "package.json");
    if (!existsSync(pkgJsonPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8")) as {
      name?: string;
      scripts?: Record<string, string>;
      exports?: Record<string, unknown>;
    };
    // A tsc build means a lib/ is expected — a package that declares
    // one and never built it ships nothing where its consumers link.
    if (!pkg.scripts?.build?.includes("tsc")) continue;
    const libDir = join(dir, "lib");
    if (!existsSync(libDir)) {
      stale.push({ pkg: pkg.name ?? dir, entry: "*", missing: ["<the whole lib/>"], cure: `pnpm --filter ${pkg.name} build` });
      continue;
    }
    // One read per .d.ts in the built face; presence is package-wide
    // (the exports map may re-home an entry's types — client/index.d.ts
    // beside client.d.ts — and the seam is the package, not the file).
    let dtsText = "";
    const stack = [libDir];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const f of readdirSync(cur)) {
        const p = join(cur, f);
        if (statSync(p).isDirectory()) stack.push(p);
        else if (f.endsWith(".d.ts")) dtsText += readFileSync(p, "utf8") + "\n";
      }
    }
    for (const [key, target] of Object.entries(pkg.exports ?? {})) {
      if (key === "./package.json" || typeof target !== "object" || target === null) continue;
      const def = (target as Record<string, string>).default;
      if (!def?.endsWith(".js")) continue;
      const rel = def.replace(/^\.\/lib\//, "").replace(/\.js$/, "");
      for (const cand of [join(dir, "src", `${rel}.ts`), join(dir, "src", rel, "index.ts")]) {
        if (!existsSync(cand)) continue;
        const missing = exportClosure(cand).filter((n) => !new RegExp(`\\b${n}\\b`).test(dtsText));
        if (missing.length) {
          stale.push({ pkg: pkg.name ?? dir, entry: key, missing, cure: `pnpm --filter ${pkg.name} build` });
        }
        break;
      }
    }
  }
  return stale;
}

describe("the built-lib sync wall (src face == lib face)", () => {
  it("every value export of a built package's public src face exists in its built .d.ts face", () => {
    const stale = staleLibs(packageDirs());
    assert.deepEqual(
      stale,
      [],
      `stale built libs — the lane serves these, the walls run src: ${stale.map((s) => `${s.pkg}${s.entry === "*" ? "" : ` [${s.entry}]`}: missing ${s.missing.join(", ")} (cure: ${s.cure})`).join("; ")}`,
    );
  });

  it("the rejection path: a src export absent from the built face is named at its package", () => {
    expect(staleLibs([])).toEqual([]);
    const fake = join(ROOT, "packages/web/card-base");
    // The real helper on the REAL package: seed a synthetic package
    // row pointing at card-base's lib but a src entry exporting a
    // name the lib never had — the helper must flag it by name.
    // THE FIXTURE SEAT (the 2026-10-12 hook flake): the synthetic
    // package used to live at packages/web/card-base-synthetic —
    // INSIDE the tree the singleton wall's clientBundles() walk
    // censuses concurrently, so the walk could see its lib/client.js,
    // the fixture's rmSync could delete it before the stamp arm read
    // it, and a green tree bounced the commit hook. staleLibs takes
    // explicit dirs with no repo-root dependency, so the fixture
    // lives in a mktemp dir OUTSIDE packages/ — the census tree is
    // never a fixture scratch space.
    const seat = mkdtempSync(join(tmpdir(), "melite-libsync-"));
    const synthetic = [join(seat, "card-base-synthetic")];
    // (build the synthetic package on the fly: src exports a ghost,
    // lib copied from the real one)
    const { mkdirSync, writeFileSync, cpSync, rmSync } = await_import_node_fs();
    try {
      mkdirSync(join(synthetic[0], "src"), { recursive: true });
      cpSync(join(fake, "lib"), join(synthetic[0], "lib"), { recursive: true });
      writeFileSync(
        join(synthetic[0], "src", "spec.ts"),
        "export function ghostSeamNameForTheSyncWall(): number { return 1; }\n",
      );
      writeFileSync(
        join(synthetic[0], "package.json"),
        JSON.stringify({
          name: "@melite/synthetic-stale",
          scripts: { build: "tsc -p tsconfig.build.json" },
          exports: { "./spec": { default: "./lib/spec.js" } },
        }),
      );
      const flagged = staleLibs(synthetic);
      assert.equal(flagged.length, 1, "the ghost export is flagged");
      assert.equal(flagged[0].pkg, "@melite/synthetic-stale");
      assert.deepEqual(flagged[0].missing, ["ghostSeamNameForTheSyncWall"]);
      assert.match(flagged[0].cure, /pnpm --filter @melite\/synthetic-stale build/);
    } finally {
      rmSync(seat, { recursive: true, force: true });
    }
  });
});

/** Await-import shim so the fixture arm stays inside the test body
 *  (vitest transforms top-level await; the shim keeps this file
 *  plain-importable like every suite here). */
import * as nodeFs from "node:fs";
function await_import_node_fs(): typeof nodeFs {
  return nodeFs;
}
