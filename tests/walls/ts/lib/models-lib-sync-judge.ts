// models-lib-sync-judge.ts — the lib-sync judge, factored out of
// models-lib-sync.spec.ts (C3(a), 2026-11-07) so the regen script
// scripts/models-lib-sync-manifest.mjs runs THE SAME judge the wall
// runs: one truth, never a second implementation a hand-written
// manifest could diverge from (LAW 2). The wall consults the
// committed cache manifest for the fast path; the script is the only
// writer of that manifest, and it writes only what this judge just
// passed. Both importers resolve this file as TypeScript — vitest
// through its transform, the script through Node's native type
// stripping (>= 23.6; the script guards it loud).
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

/** Repo root (this file sits at tests/walls/ts/lib/). */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
/** The family package plane the wall judges. */
export const MODELS = join(ROOT, "packages/models");
/** The committed cache manifest: one {srcHash, libHash} row per
 *  family. Written ONLY by scripts/models-lib-sync-manifest.mjs. */
export const MANIFEST_PATH = join(ROOT, "tests/walls/ts/fixtures/models-lib-sync-manifest.json");

/** One program's comparison outcome: `stale` names served bytes the
 *  src's fresh emit contradicts, `unemitted` names served files the
 *  src no longer emits; `buildError` marks a program that refuses to
 *  emit at all (which IS drift — the served lib cannot have come
 *  from this src). */
export type LibDrift = { pkg: string; program: string; stale: string[]; unemitted: string[]; buildError?: string };

/** One family's manifest row. A cache hit requires BOTH hashes to
 *  match; either mismatch re-runs the full judge. */
export type ManifestRow = { srcHash: string; libHash: string };

/** The manifest's committed shape. */
export type LibSyncManifest = { version: 1; families: Record<string, ManifestRow> };

/** The package's own compiler: node_modules/typescript/bin/tsc (the
 *  pnpm symlink to the version the package's build script runs —
 *  .bin/tsc is a shell shim, not a node entry). */
export function packageTsc(pkgDir: string): string {
  const bin = join(pkgDir, "node_modules/typescript/bin/tsc");
  if (!existsSync(bin)) throw new Error(`${relative(ROOT, pkgDir)} ships no node_modules/typescript — the family cannot rebuild`);
  return bin;
}

/** Re-emit one tsconfig program to a fresh temp dir; throw loud with
 *  the compiler's stderr (noEmitOnError makes a type error a build
 *  failure, which IS drift — the served lib cannot have come from
 *  this src). Returns the temp dir; the caller removes it. */
export function emitProgram(pkgDir: string, tsconfig: string, tsc: string): string {
  const out = mkdtempSync(join(tmpdir(), "models-lib-emit-"));
  try {
    execFileSync(process.execPath, [
      tsc, "-p", join(pkgDir, tsconfig),
      "--outDir", out,
      "--sourceMap", "false",
      "--declarationMap", "false",
      "--newLine", "lf",
    ], { stdio: ["ignore", "pipe", "pipe"] });
  } catch (err) {
    rmSync(out, { recursive: true, force: true });
    // tsc reports config-load failures (TS50xx) on STDOUT, type
    // errors on stderr — a refusal message that reads only one
    // stream names nothing.
    const streams = err instanceof Error && "stdout" in err
      ? `${String((err as { stdout?: unknown }).stdout ?? "")}${String((err as { stderr?: unknown }).stderr ?? "")}`
      : "";
    throw new Error(`${relative(ROOT, pkgDir)} ${tsconfig} refuses to emit — ${streams.slice(0, 400)}`);
  }
  return out;
}

/** The comparison bytes: sourceMappingURL comment lines stripped (the
 *  lib plane carries them, a maps-off emit does not), trailing
 *  whitespace normalized (tsc's final newline rides the comment). */
export function normalizedBody(path: string): string {
  return normalizeBody(readFileSync(path, "utf8"));
}

/** Sorted relative paths of every file under `dir` (slash separators
 *  regardless of platform — the manifest's keys ride this order). */
export function walkFiles(dir: string, prefix = ""): string[] {
  const rows: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) rows.push(...walkFiles(join(dir, entry.name), rel));
    else rows.push(rel);
  }
  return rows.sort();
}

/** A served-plane reader: one lib-relative path in, the plane's text
 *  for it — or null when the plane does not carry it (a judged miss,
 *  never an error). Everything the judge compares rides this seam. */
export type ServedReader = (rel: string) => string | null;

/** THE INDEX-BYTE SERVED READER (class B D4, 2026-10-31): the plane
 *  the judge consults is the COMMITTED one — stage-0 index bytes
 *  (`git show :<rel>`), exactly what a fresh clone checks out —
 *  never the working tree, where an uncommitted rebuild could pass
 *  the judge while the committed bytes drifted (the manifest would
 *  then bless the drift). Checkout-independent by construction: the
 *  index stores LF, so a CRLF checkout reads the same bytes back.
 *  The root and spawn are injectable — the wall arms the reader on
 *  throwaway /tmp repos. */
export function indexReader(libDir: string, root: string = ROOT, spawn: typeof spawnSync = spawnSync): ServedReader {
  const prefix = relative(root, libDir).split("\\").join("/");
  if (prefix.startsWith("..")) throw new Error(`indexReader: ${libDir} is not inside ${root}`);
  return (rel) => {
    const r = spawn("git", ["show", `:${prefix}/${rel}`], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) return null;
    return r.stdout ?? "";
  };
}

/** The committed plane's FILE LIST (class B D4): tracked entries
 *  under the lib dir, lib-relative — the enumeration the unemitted
 *  sweep and the lib hash ride, so an untracked leftover on disk
 *  (never a clone's bytes) cannot enter a verdict. */
export function indexLibFiles(libDir: string, root: string = ROOT, spawn: typeof spawnSync = spawnSync): string[] {
  const prefix = relative(root, libDir).split("\\").join("/");
  if (prefix.startsWith("..")) throw new Error(`indexLibFiles: ${libDir} is not inside ${root}`);
  const r = spawn("git", ["ls-files", "--", prefix], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`indexLibFiles: git ls-files refused (${r.stderr})`);
  return (r.stdout ?? "").split("\n")
    .filter((p) => p !== "")
    .map((p) => p.startsWith(`${prefix}/`) ? p.slice(prefix.length + 1) : p)
    .sort();
}

/** The normalization at text level (the path-level `normalizedBody`
 *  below is its file reader). */
export function normalizeBody(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.startsWith("//# sourceMappingURL="))
    .join("\n")
    .replace(/\s+$/, "");
}

/** Byte equality for the RUNTIME plane (.js), presence for types
 *  (.d.ts). `emitted` is the fresh temp tree; the served plane is
 *  read through `served` — by default the INDEX reader below, so the
 *  judged plane is the committed one, never the working tree's
 *  maybe-rebuilt copy (class B D4). */
export function compareEmitted(pkg: string, program: string, emittedDir: string, libDir: string, served: ServedReader = indexReader(libDir), servedFiles: string[] = indexLibFiles(libDir)): LibDrift {
  const drift: LibDrift = { pkg, program, stale: [], unemitted: [] };
  const emittedFiles = walkFiles(emittedDir);
  for (const rel of emittedFiles) {
    const servedBytes = served(rel);
    if (servedBytes === null) {
      drift.stale.push(`${rel} (served lib misses the emitted file)`);
      continue;
    }
    if (rel.endsWith(".js") && normalizeBody(servedBytes) !== normalizedBody(join(emittedDir, rel))) {
      drift.stale.push(rel);
    }
  }
  const emittedDirs = new Set(emittedFiles.map((rel) => dirname(rel)));
  for (const rel of servedFiles) {
    if (!/\.(js|d\.ts)$/.test(rel)) continue;
    if (!emittedDirs.has(dirname(rel))) continue;
    if (!emittedFiles.includes(rel)) drift.unemitted.push(`${rel} (served lib carries a file the src no longer emits)`);
  }
  return drift;
}

/** Every family package dir that actually ships a src barrel — the
 *  roster the wall judges and the manifest must cover exactly. */
export function familyDirs(): string[] {
  return readdirSync(MODELS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => join(MODELS, e.name))
    .filter((d) => existsSync(join(d, "src/index.ts")))
    .sort();
}

/** Full judge of one family: re-emit each build program (the base
 *  build plus the mods build when the package ships mods) with the
 *  package's OWN typescript and compare against the served lib.
 *  Returns one drift row per finding program — empty when fresh.
 *  Throws loud when the family cannot be judged at all (no lib, no
 *  compiler): the wall's arms carry their named expects ahead of
 *  this; the regen script reports the throw verbatim. */
export function judgeFamily(pkgDir: string): LibDrift[] {
  const lib = join(pkgDir, "lib");
  if (!existsSync(lib)) throw new Error(`${relative(ROOT, pkgDir)} ships no lib — the gateway imports the barrel through package exports and this family serves nothing`);
  const tsc = packageTsc(pkgDir);
  const programs = ["tsconfig.build.json", "tsconfig.build-mods.json"].filter((c) => existsSync(join(pkgDir, c)));
  const drifts: LibDrift[] = [];
  for (const program of programs) {
    const out = emitProgram(pkgDir, program, tsc);
    try {
      const drift = compareEmitted(relative(MODELS, pkgDir), program, out, lib);
      if (drift.stale.length > 0 || drift.unemitted.length > 0) drifts.push(drift);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }
  return drifts;
}

/** srcHash — every byte the emit consumes: the src tree, the
 *  tsconfig chain (the build configs extend tsconfig.json), and the
 *  compiler version (a tsc bump rotates the emit on untouched src).
 *  Raw bytes, not decoded text — the hash must not care about
 *  encodings. */
export function familySrcHash(pkgDir: string): string {
  const tsc = packageTsc(pkgDir);
  const h = createHash("sha256");
  const tsPkg = JSON.parse(readFileSync(join(pkgDir, "node_modules/typescript/package.json"), "utf8")) as { version?: string };
  h.update(`tsc ${tsPkg.version ?? "unknown"}\n`);
  for (const config of ["tsconfig.json", "tsconfig.build.json", "tsconfig.build-mods.json"]) {
    h.update(`${config} ${existsSync(join(pkgDir, config)) ? readFileSync(join(pkgDir, config)) : "—"}\n`);
  }
  const src = join(pkgDir, "src");
  for (const rel of walkFiles(src)) h.update(`src ${rel}\0${readFileSync(join(src, rel))}\0`);
  return h.digest("hex");
}

/** libHash — the served plane's judged bytes: every .js normalized
 *  exactly as the judge normalizes (sourceMappingURL stripped,
 *  trailing whitespace trimmed), every .d.ts by PRESENCE ONLY. Never
 *  d.ts bytes: declaration emit bakes toolchain-flavored import
 *  spellings (the header law), and hashing them would red-loop the
 *  ratchet on a compiler bump the judge itself passes. (class B D4)
 *  Both the enumeration and the bytes ride the INDEX plane — an
 *  uncommitted rebuild must never bless a manifest row. */
export function familyLibHash(pkgDir: string, served: ServedReader = indexReader(join(pkgDir, "lib")), servedFiles: string[] = indexLibFiles(join(pkgDir, "lib"))): string {
  const h = createHash("sha256");
  for (const rel of servedFiles) {
    if (rel.endsWith(".js")) {
      const bytes = served(rel);
      if (bytes === null) throw new Error(`${relative(ROOT, pkgDir)}/lib/${rel} is tracked but has no stage-0 index bytes — the index and the file list must agree`);
      h.update(`js ${rel}\0${normalizeBody(bytes)}\0`);
    } else if (rel.endsWith(".d.ts")) h.update(`dts ${rel}\n`);
  }
  return h.digest("hex");
}

/** The committed manifest, or null when it has never been generated
 *  (every family then misses the cache and the ratchet arm names the
 *  regen command). */
export function loadManifest(): LibSyncManifest | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as LibSyncManifest;
}
