// models-lib-sync.spec.ts — THE MODEL-LIB SYNC WALL (2026-10-23).
//
// The lesion it kills: the family packages' lib/ (tsc emit, tracked)
// is the plane the estate gateway SERVES — every package.json exports
// "." → "./lib/index.js" — while every wall and test resolves the
// same families to SRC through tsconfig paths. A DECL that grows in
// src without a rebuild ships a served registry that contradicts
// every green wall: the 2026-10-23 qwen-img-21 turbo landing passed
// the registry, against-cards, flows, url-liveness and decl walls
// with the variant fully declared, and the gateway's provision door
// still refused "has no variant 'turbo-int8'" because its boot-time
// lib predates the commit. The client-bundle-sync wall owns the
// tsdown loader-bundle plane; lib-sync owns the .d.ts face; THIS
// wall owns the family lib emit — the third artifact plane, judged
// here because nothing else compared it.
//
// The judge: re-emit each family's build programs (tsconfig.build.json,
// plus tsconfig.build-mods.json when the package ships mods) with the
// package's OWN typescript into a temp dir, and judge the RUNTIME
// plane byte-exact: every emitted .js must exist in lib with equal
// bytes modulo the sourceMappingURL comment (the only maps-on vs
// maps-off delta), and every lib .js under the emitted tree's
// directories must be emitted (a src module deleted without a rebuild
// leaves a stale served file — that half drifts too). The .d.ts face
// is presence-judged, never byte-judged: declaration emit bakes
// toolchain-flavored import-specifier spellings (a fresh
// rewriteRelativeImportExtensions emit writes "./actions.ts" where
// the tracked face reads "./actions.js" — same sources, same
// compiler version) while serving nothing at runtime. The gateway
// EXECUTES lib/index.js; that plane is the one which refused the
// turbo variant every wall swore existed.
//
// Run: npx vitest run tests/walls/ts/suites/models-lib-sync.spec.ts
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
const MODELS = join(ROOT, "packages/models");

export type LibDrift = { pkg: string; program: string; stale: string[]; unemitted: string[]; buildError?: string };

/** The package's own compiler: node_modules/typescript/bin/tsc (the
 *  pnpm symlink to the version the package's build script runs —
 *  .bin/tsc is a shell shim, not a node entry). */
function packageTsc(pkgDir: string): string {
  const bin = join(pkgDir, "node_modules/typescript/bin/tsc");
  if (!existsSync(bin)) throw new Error(`${relative(ROOT, pkgDir)} ships no node_modules/typescript — the family cannot rebuild`);
  return bin;
}

/** Re-emit one tsconfig program to a fresh temp dir; throw loud with
 *  the compiler's stderr (noEmitOnError makes a type error a build
 *  failure, which IS drift — the served lib cannot have come from
 *  this src). */
function emitProgram(pkgDir: string, tsconfig: string, tsc: string): string {
  const out = mkdtempSync(join(tmpdir(), "models-lib-emit-"));
  try {
    execFileSync(process.execPath, [
      tsc, "-p", join(pkgDir, tsconfig),
      "--outDir", out,
      "--sourceMap", "false",
      "--declarationMap", "false",
    ], { stdio: ["ignore", "ignore", "pipe"] });
  } catch (err) {
    rmSync(out, { recursive: true, force: true });
    const stderr = err instanceof Error && "stderr" in err ? String((err as { stderr?: unknown }).stderr ?? "") : "";
    throw new Error(`${relative(ROOT, pkgDir)} ${tsconfig} refuses to emit — ${stderr.slice(0, 400)}`);
  }
  return out;
}

/** The comparison bytes: sourceMappingURL comment lines stripped (the
 *  lib plane carries them, a maps-off emit does not), trailing
 *  whitespace normalized (tsc's final newline rides the comment). */
function normalizedBody(path: string): string {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => !line.startsWith("//# sourceMappingURL="))
    .join("\n")
    .replace(/\s+$/, "");
}

function walkFiles(dir: string, prefix = ""): string[] {
  const rows: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) rows.push(...walkFiles(join(dir, entry.name), rel));
    else rows.push(rel);
  }
  return rows.sort();
}

/** Byte equality for the RUNTIME plane (.js), presence for types
 *  (.d.ts). `emitted` is the fresh temp tree, `lib` the served plane;
 *  only files under directories the program actually emits are
 *  required to exist in the emit (a sibling program — the mods build
 *  — owns the rest of lib). */
export function compareEmitted(pkg: string, program: string, emittedDir: string, libDir: string): LibDrift {
  const drift: LibDrift = { pkg, program, stale: [], unemitted: [] };
  const emittedFiles = walkFiles(emittedDir);
  for (const rel of emittedFiles) {
    const served = join(libDir, rel);
    if (!existsSync(served)) {
      drift.stale.push(`${rel} (served lib misses the emitted file)`);
      continue;
    }
    if (rel.endsWith(".js") && normalizedBody(served) !== normalizedBody(join(emittedDir, rel))) {
      drift.stale.push(rel);
    }
  }
  const emittedDirs = new Set(emittedFiles.map((rel) => dirname(rel)));
  for (const rel of walkFiles(libDir)) {
    if (!/\.(js|d\.ts)$/.test(rel)) continue;
    if (!emittedDirs.has(dirname(rel))) continue;
    if (!emittedFiles.includes(rel)) drift.unemitted.push(`${rel} (served lib carries a file the src no longer emits)`);
  }
  return drift;
}

function familyDirs(): string[] {
  return readdirSync(MODELS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(MODELS, e.name))
    .filter((d) => existsSync(join(d, "src/index.ts")))
    .sort();
}

describe("models-lib-sync (the served family lib is the fresh emit of its src)", () => {
  it("every family's built lib byte-matches a fresh emit of its src (the gateway serves lib, the walls judge src — never again)", () => {
    const families = familyDirs();
    // >40 -> >30 (2026-10-12, the family-kill sweep: 47 dirs minus
    // the 12 fossils = 35; the floor stays an anti-vacuum pin, not
    // a census — the exact production count is the boot arm's job).
    expect(families.length).toBeGreaterThan(30);
    const drifts: LibDrift[] = [];
    for (const pkgDir of families) {
      const lib = join(pkgDir, "lib");
      expect(existsSync(lib), `${relative(ROOT, pkgDir)} ships no lib — the gateway imports the barrel through package exports and this family serves nothing`).toBe(true);
      const tsc = packageTsc(pkgDir);
      const programs = ["tsconfig.build.json", "tsconfig.build-mods.json"].filter((c) => existsSync(join(pkgDir, c)));
      for (const program of programs) {
        const out = emitProgram(pkgDir, program, tsc);
        try {
          const drift = compareEmitted(relative(MODELS, pkgDir), program, out, lib);
          if (drift.stale.length > 0 || drift.unemitted.length > 0) drifts.push(drift);
        } finally {
          rmSync(out, { recursive: true, force: true });
        }
      }
    }
    const rendered = drifts.map((d) =>
      `${d.pkg} [${d.program}]:\n  stale (src moved, lib did not): ${d.stale.join(", ") || "—"}\n  unemitted (src removed, lib still serves): ${d.unemitted.join(", ") || "—"}`,
    ).join("\n");
    expect(rendered, `${drifts.length} family lib(s) are stale — run \`pnpm run build\` in each named package and commit the lib (the served plane must be the src's own emit)`).toBe("");
  }, 600_000);

  it("the judge can fail: a stale or extra served file is named (the vacuity cure)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "models-lib-fixture-"));
    try {
      const emitted = join(tmp, "emitted");
      const lib = join(tmp, "lib");
      for (const dir of [emitted, join(emitted, "sub"), lib, join(lib, "sub")]) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(join(emitted, "index.js"), "export const a = 1;\n");
      writeFileSync(join(emitted, "sub", "mod.js"), "export const b = 2;\n");
      // lib: same shape, drifted bytes, plus a file the src no longer emits
      writeFileSync(join(lib, "index.js"), "export const a = 0;\n");
      writeFileSync(join(lib, "sub", "mod.js"), "export const b = 2;\n");
      writeFileSync(join(lib, "sub", "ghost.js"), "export const dead = 3;\n");
      const drift = compareEmitted("fixture", "tsconfig.build.json", emitted, lib);
      expect(drift.stale).toEqual(["index.js"]);
      expect(drift.unemitted).toEqual(["sub/ghost.js (served lib carries a file the src no longer emits)"]);
      // the fresh twin passes
      writeFileSync(join(lib, "index.js"), "export const a = 1;\n");
      rmSync(join(lib, "sub", "ghost.js"));
      const clean = compareEmitted("fixture", "tsconfig.build.json", emitted, lib);
      expect(clean.stale).toEqual([]);
      expect(clean.unemitted).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
