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
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { execSync, execFileSync, spawnSync } from "node:child_process";
import { deriveSrcStamp } from "../../../../tools/src-stamp.mjs";
import { affectedBundles, bundlePackages, bytesEqual, ownerPackageName } from "../../../../tools/hook-client-bundle-bytes.mjs";
import { tmpdir } from "node:os";
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

// THE CHECKOUT-MTIME CLASS (the 2026-11-09 CI cure): this arm's mtime
// signal is meaningful only AFTER a build act. A fresh checkout
// materializes the committed lib/client.js and every src byte within
// the same second in readdir order — the bundle's mtime there is the
// checkout's write order, never a build, so the arm judges noise and
// reds healthy trees. CI judges the same law BY BYTES instead: the
// unit job's Lib-sync step rebuilds and refuses any lib/ drift (the
// stale bundle would diverge from its own src). The dev-box law —
// "a tsc-only rebuild left a stale serve" — fires here, where mtimes
// carry the build act. Same dual check tools/install-lefthook.mjs
// uses for the same CI shape.
const CHECKOUT_MTIMES = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

describe("THE SERVED-BUNDLE FRESHNESS LAW", () => {
  it.skipIf(CHECKOUT_MTIMES)("every lib/client.js is at least as new as its package's newest src byte (tsc-only rebuilds can never leave a stale serve; CI: the Lib-sync byte gate owns this law — checkout mtimes are write order, not a build)", () => {
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
  // could never pass. The recipe is node-native now
  // (tools/src-stamp.mjs deriveSrcStamp — in-process crypto over the
  // deterministic input set, byte-identical to the LC_ALL=C shell
  // recipe it replaced; ship-lane.sh stamp_src stays the shell
  // oracle and emit-determinism.spec.ts proves node === shell); this
  // arm recomputes every tracked lib/.src-stamp through the native
  // derivation and refuses on mismatch — a stale stamp OR a
  // derivation drift reds here, derivation over literal.
  it("every tracked lib/.src-stamp equals the canonical (LC_ALL=C) recompute of its own src", () => {
    const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
      .split("\n")
      .filter((f) => /\/lib\/\.src-stamp$/.test(f));
    assert.ok(tracked.length >= 4, `the stamp roster collapsed (${tracked.length}) — the walk broke`);
    const offenders: string[] = [];
    for (const f of tracked) {
      const pkgDir = join(ROOT, dirname(dirname(f))); // the package root — the derivation walks src there, not in lib/
      const live = deriveSrcStamp(pkgDir);
      const seated = readFileSync(join(ROOT, f), "utf8").trim();
      if (live !== seated) offenders.push(`${f}: canonical ${live}, seated ${seated}`);
    }
    assert.deepEqual(offenders, [], `non-canonical src stamps (rebuild with the node recipe — node tools/build-plane.mjs build <pkg>):\n${offenders.join("\n")}`);
  });

  // THE BUILDER-DECLARATION LAW (the 2026-10-30 lane outage): every
  // browser-served package (one carrying a tsdown.config.ts) must
  // DECLARE the builder it is built with — card-base's tsdown bin had
  // only ever resolved through a long-dead tracked node_modules
  // symlink; once the honest per-package install materialized, the
  // bin was gone, lane-rebuild step 1 exited 127 into /dev/null, and
  // :3088 never came up. The declaration, not the bin, is the truth a
  // fresh clone installs from; the bin is its shadow.
  //
  // THE ROSTER RIDES ARGV (class B R9, 2026-10-31): the roster query
  // used to shell `git ls-files '**/tsdown.config.ts'` — single
  // quotes are NOT quotes under cmd.exe, so on windows the pathspec
  // matched nothing and the roster collapsed to 0. The argv form
  // carries the same git and the same pathspec with no shell to
  // misquote it.
  it("every package with a tsdown.config.ts declares tsdown in devDependencies (the builder is installed, never inherited)", () => {    const tracked = execFileSync("git", ["ls-files", "**/tsdown.config.ts"], { cwd: ROOT, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
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

  // THE BYTE-EQUALITY ARM (2026-11-10, the stale-embed lesson —
  // roadmap OPEN row "THE LANDING HOOK'S BYTE BLIND SPOT"): the
  // tree arm above judges mtimes, and mtimes cannot see the v2v
  // class — inputs that moved in ANOTHER package while this
  // bundle's own src stood still (h3-timeline bytes inside
  // card-view's bundle; the battery's lib-sync drift arm stashes
  // bundles without rebuilding them, so it is blind too). This arm
  // judges BYTES: every seated lib/client.js must be byte-identical
  // to a fresh tsdown emit of its inputs, rebuilt to a temp dir
  // (never in place). No mtimes anywhere — this arm runs on CI too
  // (the checkout-mtime class does not apply: `git show :path`
  // reads the index, not the checkout's write order). A failed emit
  // IS a refusal (the input-prep class: an unreproducible bundle
  // can never carry new bytes — its fossil serves forever).
  it("every seated lib/client.js is byte-identical to a fresh tsdown emit of its inputs (the v2v embed class dies here — CI-safe, no mtimes)", () => {
    const bundles = bundlePackages();
    assert.ok(bundles.length >= 6, `the bundle roster collapsed (${bundles.length}) — the tsdown.config walk broke`);
    const stale: string[] = [];
    for (const pkgDir of bundles) {
      const bin = join(ROOT, pkgDir, "node_modules", ".bin", process.platform === "win32" ? "tsdown.cmd" : "tsdown");
      assert.ok(existsSync(bin), `${pkgDir}: no tsdown builder (run pnpm install — the declaration arm above owns the declaration, this arm owns the binary)`);
      const tmp = mkdtempSync(join(tmpdir(), "wall-bundle-bytes-"));
      try {
        // THE PRODUCTION-EMIT LAW (same as the hook tool's): the
        // shared preset defines NODE_ENV into the bundle, defaulting
        // unset to 'production'. This suite runs under vitest
        // (NODE_ENV=test) — an unstripped emit carries zustand's dev
        // branches and false-reds every bundle. Strip it.
        const { NODE_ENV: _stripped, ...childEnv } = process.env;
        const r = spawnSync(bin, ["-d", tmp, "--silent"], { cwd: join(ROOT, pkgDir), encoding: "utf8", env: childEnv });
        if (r.status !== 0) {
          stale.push(`${pkgDir}/lib/client.js: fresh emit FAILED — the bundle is unreproducible and can never carry new bytes:\n${String(r.stdout + "\n" + r.stderr).split("\n").filter((l) => /ERROR|purity|cannot|failed/i.test(l)).slice(0, 3).join("\n")}`);
          continue;
        }
        const fresh = join(tmp, "client.js");
        if (!existsSync(fresh)) {
          stale.push(`${pkgDir}/lib/client.js: emit produced no client.js — the config no longer builds the served bundle`);
          continue;
        }
        const seated = execFileSync("git", ["show", `:${pkgDir}/lib/client.js`], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 });
        if (!bytesEqual(readFileSync(fresh), seated)) {
          stale.push(`${pkgDir}/lib/client.js: STALE BYTES — a fresh tsdown emit of its inputs differs from the seated bundle (inputs moved without a rebuild): cd ${pkgDir} && ./node_modules/.bin/tsdown (tsdown BEFORE tsc), then stage the diff`);
        }
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }
    assert.deepEqual(stale, [], "STALE SERVED BUNDLES (bytes, not mtimes) — the lane serves these files verbatim and their inputs moved on:\n" + stale.join("\n"));
  }, 300_000);

  // THE FIRING ARMS (synthetic fixtures, never the tree — the wall-clock can never false-red these):
  // the byte predicate and the affected-set derivation ride the SAME functions the hook runs.
  it("the byte gate FIRES (equal bytes pass, one flipped byte refuses; the affected set derives own-src + embed + preset + empty)", () => {
    assert.equal(bytesEqual(Buffer.from("abc"), Buffer.from("abc")), true, "identical bytes are fresh");
    assert.equal(bytesEqual(Buffer.from("abc"), Buffer.from("abd")), false, "one flipped byte is stale");
    assert.equal(bytesEqual(Buffer.from("abc"), Buffer.from("abcd")), false, "a length change is stale");
    const bundles = ["packages/motion/motion", "packages/web/melite-card-view"];
    const nameOf = (f: string): string | null => {
      if (f.startsWith("packages/estate/drafts/")) return "@melite/estate-drafts";
      if (f.startsWith("packages/motion/motion/")) return "@melite/motion-motion";
      if (f.startsWith("packages/web/melite-card-view/")) return "@melite/melite-card-view";
      return null;
    };
    const importsOf = (b: string): Set<string> => new Set(
      b === "packages/web/melite-card-view" ? ["@melite/estate-drafts", "@melite/estate-runs"] : ["@melite/contracts"],
    );
    // OWN-SRC: the bundle's own src dirties itself, never its sibling.
    assert.deepEqual(
      affectedBundles(["packages/motion/motion/src/client/x.ts"], { bundles, nameOf, importsOf }),
      ["packages/motion/motion"], "own-src change dirties its own bundle only",
    );
    // EMBED (the v2v class): drafts bytes ride card-view's bundle — the draft change dirties card-view, never motion.
    assert.deepEqual(
      affectedBundles(["packages/estate/drafts/src/bench.ts"], { bundles, nameOf, importsOf }),
      ["packages/web/melite-card-view"], "embed-input change dirties the importing bundle only",
    );
    // SHARED PRESET: the preset change dirties every bundle.
    assert.deepEqual(
      affectedBundles(["packages/web/shared/tsdown.client.ts"], { bundles, nameOf, importsOf }),
      [...bundles].sort(), "shared-preset change dirties all bundles",
    );
    // EMPTY: no inputs moved, no bundles judged.
    assert.deepEqual(affectedBundles([], { bundles, nameOf, importsOf }), [], "empty set judges nothing");
    // OWNER: the manifest names the package, unknown dirs stay null.
    assert.equal(ownerPackageName("packages/estate/drafts/src/bench.ts", { readPkg: (d: string) => d === "packages/estate/drafts" ? { name: "@melite/estate-drafts" } : {} as never }), "@melite/estate-drafts", "the manifest names the owner");
    assert.equal(ownerPackageName("docs/notes.md", { readPkg: () => { throw new Error("must not read"); } }), null, "non-package paths stay null without a read");
  });
});
