#!/usr/bin/env node
// hook-full-battery.mjs — pre-push checkpoint: tsc per typecheck
// package + the walls (root vitest node project).
// The walls are the estate's gate law; tsc mirrors each package's own
// `typecheck` script locally (CI runs unit/coverage/tiers only —
// types are this battery's to own). Exits non-zero on the FIRST
// failure (loud, named). Uses per-package .bin/tsc + the repo
// node_modules/.bin/vitest directly (no pnpm at run time).
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPO = new URL("..", import.meta.url).pathname;

// Every package owning a `typecheck` script (tsc --noEmit in its dir),
// DERIVED from the workspace manifests — never hardcoded. The
// hardcoded list drifted twice (a dead packages/web/editor path;
// estate/models + web/melite-run-wire silently ungated), so the
// battery now reads the truth: any package that declares the script
// is gated, the day it declares it (gate-found 2026-09-12).
function typecheckPackages() {
  const out = [];
  const genres = readdirSync(join(REPO, "packages"), { withFileTypes: true })
    .filter((d) => d.isDirectory());
  for (const genre of genres) {
    const genreDir = join(REPO, "packages", genre.name);
    // A genre dir may itself be a package (packages/<name>/package.json).
    for (const dir of [genreDir, ...readdirSync(genreDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(genreDir, d.name))]) {
      const manifest = join(dir, "package.json");
      if (!existsSync(manifest)) continue;
      let scripts;
      try {
        scripts = JSON.parse(readFileSync(manifest, "utf8")).scripts ?? {};
      } catch {
        continue; // unparseable manifest: not this battery's wall
      }
      if (typeof scripts.typecheck === "string") {
        out.push(dir.slice(REPO.length));
      }
    }
  }
  return out.sort();
}
const PACKAGES = typecheckPackages();

// THE TSC NET (2026-10-02): the loop ran one package at a time —
// spawnSync per package, ~100s of the pre-push battery's ~190s on a
// 24-core machine with sixteen cores idle. The net is now a bounded
// pool at width 8: the SAME width scripts/ship-lane.sh uses for this
// net, and the same width tests/walls/ts/suites/typecheck-gate.spec.ts
// runs its package sweep at, so one number governs all three seats.
// The stage boundary keeps it safe — the net runs BEFORE vitest, so no
// tsc process ever competes with the suite's forks (the reason
// typecheck-gate.spec.ts holds the tier at TC_POOL=3).
const TSC_WIDTH = 8;

/** One tsc run; resolves to its exit status and captured stdout. */
function runTsc(dir) {
  const tsc = `${REPO}${dir}/node_modules/.bin/tsc`;
  return new Promise((resolve) => {
    const child = spawn(tsc, ["--noEmit"], {
      cwd: `${REPO}${dir}`,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { out += chunk; });
    child.on("error", (e) => resolve({ status: -1, out: String(e) }));
    child.on("close", (status) => resolve({ status, out }));
  });
}

// A declared package without its own tsc fails the battery before any
// tsc runs: a missing binary is an install defect, not a type defect,
// and one named line is louder than a pile of spawn errors.
for (const p of PACKAGES) {
  if (!existsSync(`${REPO}${p}/node_modules/.bin/tsc`)) {
    console.error(`BATTERY FAIL: tsc missing for ${p} (run pnpm install)`);
    process.exit(1);
  }
}

let next = 0;
let failed = null;
const lanes = Array.from(
  { length: Math.min(TSC_WIDTH, PACKAGES.length) },
  async () => {
    for (;;) {
      // A red package ends the battery: no new work is launched once
      // one is known, and the in-flight lanes are allowed to close so
      // no orphan tsc survives the exit.
      if (failed !== null) return;
      const dir = PACKAGES[next++];
      if (dir === undefined) return;
      const r = await runTsc(dir);
      if (r.status !== 0 && failed === null) {
        failed = { dir, out: r.out };
      }
    }
  },
);
await Promise.all(lanes);
if (failed !== null) {
  console.error(`BATTERY FAIL: tsc ${failed.dir}`);
  if (failed.out.trim() !== "") console.error(failed.out.trim());
  process.exit(1);
}

const vitest = `${REPO}node_modules/.bin/vitest`;
if (!existsSync(vitest)) {
  console.error("BATTERY FAIL: repo vitest missing (run pnpm install)");
  process.exit(1);
}
const walls = spawnSync(vitest, ["run", "--project", "node"], {
  cwd: REPO,
  stdio: "inherit",
});
if (walls.status !== 0) {
  console.error("BATTERY FAIL: walls");
  process.exit(1);
}
console.log(`battery green: tsc x${PACKAGES.length} + walls`);
