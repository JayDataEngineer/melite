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
import { existsSync, readdirSync, statSync } from "node:fs";
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
      if (bundleMtime < newest.mtime) {
        stale.push(relative(ROOT, bundle) + " (built " + new Date(bundleMtime).toISOString() +
          ") is OLDER than " + relative(ROOT, newest.file) + " (" + new Date(newest.mtime).toISOString() + ") — REBUILD IT: cd " +
          relative(ROOT, pkgRoot) + " && ./node_modules/.bin/tsdown  (tsdown BEFORE tsc: the ORDER LAW)");
      }
    }
    assert.deepEqual(stale, [], "STALE SERVED BUNDLES — the lane serves lib/client.js verbatim and these predate their own src (the 2026-10-24 outage class):\n" + stale.join("\n"));
  });

  it("the law FIRES (a bundle backdated one hour reds the freshness arm)", () => {
    // the firing arm, proven on a copy of the judgment itself: a
    // bundle whose mtime predates its newest src is stale by the
    // exact predicate the first arm runs against the real tree.
    const bundles = clientBundles();
    const bundle = bundles.find((b) => b.includes("card-base")) ?? bundles[0]!;
    const pkgRoot = dirname(dirname(bundle));
    const newest = newestSource(pkgRoot);
    assert.ok(newest !== null, "the probe package has src to judge against");
    const realBundleMtime = statSync(bundle).mtimeMs;
    const backdated = realBundleMtime - 3600_000;
    assert.ok(backdated < newest.mtime,
      "the toggle is honest: backdating one hour must fall under the newest src byte (src mtime " +
      new Date(newest.mtime).toISOString() + ", bundle " + new Date(realBundleMtime).toISOString() + ")");
  });
});
