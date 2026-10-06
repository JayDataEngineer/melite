// src-orphan-law.spec.ts — THE ORPHAN-MODULE WALL (R4-08's class).
// A tracked src module nothing imports, nothing exports, and no
// artifact mirrors is dead code wearing a tracked face: no gate
// named the last 13 (round-4 §8(d)), and a hand sweep had to
// delete them. This wall names them THE DAY they orphan.
//
// The law: every tracked src/**/*.{ts,tsx} must carry at least ONE
// of three lives —
//   1. an importer: some tracked src/test file's import/export
//      specifier RESOLVES to it (relative specs resolved against
//      the importer's own dir; workspace-package specs resolved
//      through the name→package-dir map; extension and /index
//      variants tried),
//   2. an entry seat: the owning package.json's exports map,
//      main, or bin names its compiled lib path,
//   3. a registry seat: the module's package is named in the
//      cardPackages SSOT (cardDefs.ts) — card packages load via
//      runtime-constructed specifiers no static census can see,
//      and their own dual-face walls (the cardPackages row, the
//      literal exports rows, the client bundle seam) own that
//      plane's judgment.
// A module only a test imports is judged (test files are scanned
// too — a wall fixture is a life). A module failing all three is
// listed verbatim; the cure is deletion or a real consumer.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..", "..", "..", "..");

function sh(args: string[]): string {
  return execFileSync(args[0]!, args.slice(1), { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

/** name -> package dir for every workspace package with a
 *  package.json under packages/. */
function packageDirs(): Map<string, string> {
  const out = new Map<string, string>();
  for (const mf of sh(["git", "ls-files", "packages"]).split("\n").filter((f) => f.endsWith("/package.json"))) {
    const dir = mf.slice(0, -"/package.json".length);
    const name = JSON.parse(readFileSync(join(ROOT, mf), "utf8")).name;
    if (typeof name === "string") out.set(name, dir);
  }
  return out;
}

const PKGS = packageDirs();

/** The cardPackages SSOT (cardDefs.ts) — the registry seat. */
function registryPackages(): Set<string> {
  const src = readFileSync(
    join(ROOT, "packages/engines/comfyui-cordis/src/cardDefs.ts"),
    "utf8",
  );
  const m = src.match(/export const cardPackages[^=]*=\s*\[([^\]]*)\]/u);
  if (m === null) throw new Error("cardPackages SSOT array not found in cardDefs.ts — the registry seat parse broke");
  // Strip line comments BEFORE reading string literals: the array's
  // prose comments carry quotes ("skeleton + weights on this GLB")
  // that would otherwise open phantom strings.
  const bare = m[1]!.replace(/\/\/[^\n]*/gu, "");
  // Entries may carry subpaths ('@melite/3d-anny/card'); the SEAT is
  // the package root — every module under a registry package rides
  // the runtime compose loop.
  const root = (spec: string): string =>
    spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]!;
  return new Set([...bare.matchAll(/['"]([^'"]+)['"]/gu)].map((x) => root(x[1]!)));
}
const REGISTRY = registryPackages();

/** The owning package name for a module path (""). */
function owningPackage(mod: string): string {
  const mf = mod.split("/").slice(0, -1);
  let dir = mf.join("/");
  while (dir.startsWith("packages") && !existsSync(join(ROOT, dir, "package.json"))) {
    const up = dir.split("/").slice(0, -1).join("/");
    if (up === dir) break;
    dir = up;
  }
  const f = join(ROOT, dir, "package.json");
  if (!existsSync(f)) return "";
  return (JSON.parse(readFileSync(f, "utf8")).name ?? "") as string;
}

/** Resolve one specifier the way TS would (the variants a real
 *  import can spell), returning repo-relative candidates. */
function resolveSpec(fromFile: string, rawSpec: string): string[] {
  // TS ESM spells the artifact extension: "./foo.js" means foo.ts
  const spec = rawSpec.replace(/\.(js|mjs|cjs)$/u, "");
  const out: string[] = [];
  if (spec.startsWith(".")) {
    const base = normalize(join(dirname(fromFile), spec));
    // the base itself is a candidate: this estate spells relative
    // imports with the .ts extension ("./filmLead.ts")
    for (const c of [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")]) {
      out.push(c.split(sep).join("/"));
    }
    return out;
  }
  // workspace package spec: @scope/name[/rest] or name[/rest]
  const parts = spec.split("/");
  const tryRoots = parts[0]!.startsWith("@") ? [parts.slice(0, 2).join("/"), parts[0]!] : [parts[0]!];
  for (const root of tryRoots) {
    const dir = PKGS.get(root);
    if (dir === undefined) continue;
    const rest = spec.slice(root.length + 1);
    const base = rest === "" ? join(dir, "src") : join(dir, "src", rest);
    for (const c of [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")]) {
      out.push(c.split(sep).join("/"));
    }
  }
  return out;
}

/** Every src path a tracked tree file imports (src + tests, no lib). */
function importedSet(): Set<string> {
  const out = new Set<string>();
  const files = sh(["git", "ls-files", "packages", "tests"])
    .split("\n")
    .filter((f) => /\.(ts|tsx|mjs)$/u.test(f) && !f.includes(`${sep}lib${sep}`) && !f.endsWith(".d.ts"));
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), "utf8");
    for (const m of text.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/gu)) {
      for (const c of resolveSpec(f, m[1]!)) out.add(c);
    }
  }
  return out;
}

/** The owning package.json (nearest above the module) names the
 *  module's compiled path in exports/main/bin. */
function hasEntrySeat(mod: string): boolean {
  const parts = mod.split("/");
  let dir = parts.slice(0, -1).join("/");
  while (dir.startsWith("packages") && !existsSync(join(ROOT, dir, "package.json"))) {
    const up = dir.split("/").slice(0, -1).join("/");
    if (up === dir) break;
    dir = up;
  }
  const mf = join(ROOT, dir, "package.json");
  if (!existsSync(mf)) return false;
  const manifest = readFileSync(mf, "utf8");
  const pkgRelLib = mod.slice(dir.length + 1).replace(/\/src\//u, "lib/").replace(/\.(ts|tsx)$/u, "");
  return manifest.includes(pkgRelLib) || manifest.includes(pkgRelLib + ".js");
}

/** A DOOR seat: some tracked file names the module's own path as a
 *  string literal (a spec that spawns `node src/dump-registry.ts`,
 *  a discovery table, a test that loads by URL). The path itself is
 *  the reference — no import syntax can express it. */
function hasDoorSeat(mod: string, files: string[]): boolean {
  const needle = mod.split("/").slice(-3).join("/");
  for (const f of files) {
    const text = readFileSync(join(ROOT, f), "utf8");
    if (text.includes(mod) || (text.includes(needle) && text.includes(mod.split("/").slice(-1)[0]!.replace(/\.(ts|tsx)$/u, "")))) return true;
  }
  return false;
}

describe("THE SRC-ORPHAN WALL — every tracked src module has a life", () => {
  const files = sh(["git", "ls-files", "packages", "tests"])
    .split("\n")
    .filter((f) => /\.(ts|tsx|mjs|md|json|sh)$/u.test(f) && !f.includes(`${sep}lib${sep}`));

  it("no src module is unimported and unexported (the R4-08 census, machine-checked)", () => {
    const imported = importedSet();
    const orphans: string[] = [];
    for (const mod of sh(["git", "ls-files", "packages"]).split("\n")) {
      if (!mod.includes("/src/") || !/\.(ts|tsx)$/u.test(mod) || mod.endsWith(".d.ts")) continue;
      if (imported.has(mod)) continue;
      if (hasEntrySeat(mod)) continue;
      if (REGISTRY.has(owningPackage(mod))) continue;
      if (hasDoorSeat(mod, files)) continue;
      orphans.push(mod);
    }
    expect(
      orphans,
      "these tracked src modules have no importer and no exports seat — delete them or wire them to a real consumer",
    ).toEqual([]);
  });

  it("the census itself is armed (both walks see the tracked plane)", () => {
    // Silent walks would pass the arm above vacuously — the floors
    // are the tracked plane's own size.
    expect(files.length, "the file census found nothing — the git ls-files parse broke").toBeGreaterThan(100);
    const sample = importedSet();
    expect(sample.size, "the import census resolved no specifiers — the parse broke").toBeGreaterThan(100);
    expect(PKGS.size, "the package map is empty — the manifest walk broke").toBeGreaterThan(10);
    expect(REGISTRY.size, "the registry seat is empty — the cardPackages parse broke").toBeGreaterThan(10);
  });
});
