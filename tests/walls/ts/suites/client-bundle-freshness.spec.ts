// client-bundle-freshness.spec.ts — THE SERVED-BUNDLE FRESHNESS LAW
// (2026-10-24, the operator's burn: hours of stale-serve after the
// tree was cured — tsc-only rebuilds never touch lib/client.js, the
// prebuilt artifact the lane serves verbatim, and every wall read
// src). The CONTRACTS §3 staleness row judges OLD-ONLY era markers
// of one 2026-10-12 crime — a museum piece; a bundle missing any
// LATER cure contains none of those markers and passes green. This
// wall judges FRESHNESS itself, derived, zero maintained literals:
//
//   every served lib/client.js is at least as new as every source
//   byte of its own package (every .ts/.tsx/.css under src).
//
// A checkout or edit that writes src after the last bundle build
// reds HERE, before a lane boot ever serves the stale bundle — the
// build-order law (tsdown before tsc) becomes an executed gate, not
// a script comment. Profile-rendered copies are symlinks to these
// very files: same inode, same mtime, one truth.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

const isDir = (p: string): boolean => {
  try { return statSync(p).isDirectory(); } catch { return false; }
};

/** Every served client bundle: a client.js inside a directory named
 * lib, under packages/, outside node_modules. */
function clientBundles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (isDir(p)) {
        if (e === "node_modules" || e === ".git") continue;
        walk(p);
      } else if (e === "client.js" && dir.endsWith("lib")) {
        out.push(p);
      }
    }
  };
  walk(join(ROOT, "packages"));
  return out;
}

/** The newest source byte of one package: max mtime over every
 * .ts/.tsx/.css under src (the tsdown inputs — the client preset
 * compiles ts/tsx and inlines css modules). */
function newestSource(pkgRoot: string): { mtime: number; file: string } | null {
  let best: { mtime: number; file: string } | null = null;
  const srcDir = join(pkgRoot, "src");
  if (!isDir(srcDir)) return null;
  const walk = (dir: string): void => {
    for (const e of readdirSync(dir)) {
      const p = join(dir, e);
      if (isDir(p)) { walk(p); continue }
      if (!/\.(ts|tsx|css)$/.test(e)) continue
      const m = statSync(p).mtimeMs;
      if (best === null || m > best.mtime) best = { mtime: m, file: p };
    }
  };
  walk(srcDir);
  return best;
}

/** The stale predicate, one home: a bundle is stale when its bytes
 *  predate the package's newest source byte. Both arms below ride
 *  THIS function — the firing arm feeds it synthetic mtimes, so no
 *  wall-clock gap on the real tree can ever false-red it (the
 *  2026-10-26 time-bomb: the old arm demanded bundle−src < 1h, and a
 *  lawful no-change rebuild tripped it on a healthy tree). */
function isStale(bundleMtime: number, newestSrcMtime: number): boolean {
  return bundleMtime < newestSrcMtime;
}

describe("THE SERVED-BUNDLE FRESHNESS LAW", () => {
  it("every lib/client.js is at least as new as its package's newest src byte (tsc-only rebuilds can never leave a stale serve)", () => {
    const bundles = clientBundles();
    assert.ok(bundles.length >= 6, "the census sees the six web client bundles (got " + String(bundles.length) + " — the walker itself rotted)");
    const stale: string[] = [];
    for (const bundle of bundles) {
      const pkgRoot = dirname(dirname(bundle)); // .../pkg/lib/client.js → .../pkg
      const newest = newestSource(pkgRoot);
      if (newest === null) continue // no src: a leaf that only wraps deps
      const bundleMtime = statSync(bundle).mtimeMs;
      if (isStale(bundleMtime, newest.mtime)) {
        stale.push(relative(ROOT, bundle) + " (built " + new Date(bundleMtime).toISOString() +
          ") is OLDER than " + relative(ROOT, newest.file) + " (" + new Date(newest.mtime).toISOString() + ") — REBUILD IT: cd " +
          relative(ROOT, pkgRoot) + " && ./node_modules/.bin/tsdown  (tsdown BEFORE tsc: the ORDER LAW)");
      }
    }
    assert.deepEqual(stale, [], "STALE SERVED BUNDLES — the lane serves lib/client.js verbatim and these predate their own src (the 2026-10-24 outage class):\n" + stale.join("\n"));
  });

  it("the law FIRES (the stale predicate reds a backdated bundle and greens a fresh one — synthetic mtimes, never the wall clock)", () => {
    // the firing arm rides the SAME predicate the first arm runs:
    // a bundle one hour older than its src is stale, a bundle one
    // hour newer is fresh. No tree mtimes involved — a lawful
    // no-change rebuild can never trip this arm.
    const now = Date.now();
    assert.equal(isStale(now - 3600_000, now), true, "a bundle backdated one hour IS stale");
    assert.equal(isStale(now, now - 3600_000), false, "a bundle one hour newer than src is fresh");
    assert.equal(isStale(now, now), false, "a same-instant bundle is fresh (the predicate is strict)");
  });

  // THE CANONICAL MAP LAW (sweep F5b, 2026-10-26 — cured 2026-10-27):
  // tsdown's map serialization races on the trailing byte (one run
  // ends the JSON with a newline, the next without — a one-byte
  // churn class that put 988KB of spurious diff in post-commit
  // rebuilds while client.js + .src-stamp stayed clean). The
  // canonical form is the repo's own file-end law: exactly one
  // trailing newline. The wall judges every TRACKED lib/*.map —
  // a rebuild that flips the byte reds here before it churns a
  // diff; the builder normalizes (scripts/canonicalize-sourcemaps.mjs).
  it("every tracked lib/*.map ends with exactly one trailing newline (the canonical form — the tsdown flip class dies here)", () => {
    const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter((f) => /\/lib\/.*\.map$/.test(f));
    assert.ok(tracked.length > 1000, `the tracked-map roster collapsed (${tracked.length}) — the walk broke`);
    const offenders: string[] = [];
    for (const f of tracked) {
      const abs = join(ROOT, f);
      if (!existsSync(abs)) continue;
      const buf = readFileSync(abs);
      if (!(buf.length > 0 && buf[buf.length - 1] === 0x0a)) offenders.push(`${f}: no trailing newline`);
      else if (buf.length > 1 && buf[buf.length - 2] === 0x0a) offenders.push(`${f}: more than one trailing newline`);
    }
    assert.deepEqual(offenders, [], `non-canonical sourcemaps (rebuild with scripts/canonicalize-sourcemaps.mjs):\n${offenders.join("\n")}`);
  });

  // THE STAMP CANONICALITY LAW (tiers lib-drift, 2026-10-30): the
  // stamp recipe sorted with the shell's ambient sort, whose order
  // is a function of the builder's locale (en_US.UTF-8 interfiles
  // upper/lowercase differently than C) — a stamp built on a dev
  // box NEVER matched a CI recompute, so the tiers lib-drift gate
  // could never pass. The recipe is LC_ALL=C now (ship-lane.sh
  // stamp_src, lane-freshness.sh, build-plane.mjs writeSrcStamp);
  // this arm recomputes every tracked lib/.src-stamp through the
  // canonical pipeline and refuses on mismatch — a stale stamp OR
  // a recipe drift reds here, derivation over literal.
  it("every tracked lib/.src-stamp equals the canonical (LC_ALL=C) recompute of its own src", () => {
    const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter((f) => /\/lib\/\.src-stamp$/.test(f));
    assert.ok(tracked.length >= 4, `the stamp roster collapsed (${tracked.length}) — the walk broke`);
    const offenders: string[] = [];
    for (const f of tracked) {
      const pkgDir = join(ROOT, dirname(dirname(f))); // the package root — find src runs there, not in lib/
      const live = execSync(
        "find src \\( -name '*.ts' -o -name '*.tsx' \\) | LC_ALL=C sort | xargs sha256sum 2>/dev/null | sha256sum | cut -c1-16",
        { cwd: pkgDir, encoding: "utf8" },
      ).trim();
      const seated = readFileSync(join(ROOT, f), "utf8").trim();
      if (live !== seated) offenders.push(`${f}: canonical ${live}, seated ${seated}`);
    }
    assert.deepEqual(offenders, [], `non-canonical src stamps (rebuild them with the LC_ALL=C recipe):\n${offenders.join("\n")}`);
  });

  // THE BUILDER-DECLARATION LAW (the 2026-10-30 lane outage): every
  // browser-served package (one carrying a tsdown.config.ts) must
  // DECLARE the builder it is built with — card-base's tsdown bin had
  // only ever resolved through a long-dead tracked node_modules
  // symlink; once the honest per-package install materialized, the
  // bin was gone, lane-rebuild step 1 exited 127 into /dev/null, and
  // :3088 never came up. The declaration, not the bin, is the truth a
  // fresh clone installs from; the bin is its shadow.
  it("every package with a tsdown.config.ts declares tsdown in devDependencies (the builder is installed, never inherited)", () => {
    const tracked = execSync("git ls-files '**/tsdown.config.ts'", { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
      .split("\n")
      .filter((f) => f.trim() !== "");
    assert.ok(tracked.length >= 10, `the tsdown config roster collapsed (${tracked.length}) — the walk broke`);
    const offenders: string[] = [];
    for (const f of tracked) {
      const pkgDir = join(ROOT, dirname(f));
      const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8")) as { devDependencies?: Record<string, string> };
      if (pkg.devDependencies?.tsdown === undefined) offenders.push(`${f}: no tsdown devDep — a fresh clone has no builder for this bundle`);
    }
    assert.deepEqual(offenders, [], `browser-served packages missing their builder declaration:\n${offenders.join("\n")}`);
  });
});
