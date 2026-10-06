#!/usr/bin/env node
// hook-full-battery.mjs — pre-push checkpoint: tsc per typecheck
// package + the walls (root vitest node project) + lib-sync (a
// fresh full build must reproduce the committed lib/ byte-for-byte).
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
// EVERY PROJECT, not just `node` (round-6 audit, 2026-10-13): the
// hook and the pre-commit job both run `--project node`, so the dom
// / dom18 / deck projects (~3,000 specs) had NO local owner while
// the CI unit job that runs them fires on main/master only. The
// battery is the last local gate before a push, so it owns the full
// fleet; the pre-commit job keeps the fast node-only seat.
const walls = spawnSync(vitest, ["run"], {
  cwd: REPO,
  stdio: "inherit",
});
if (walls.status !== 0) {
  console.error("BATTERY FAIL: walls");
  process.exit(1);
}

// THE LIB-SYNC ARM (R4-03): a fresh full build must reproduce the
// committed lib/ byte-for-byte. The class recurred 149× in 90
// commits — src landed without its artifact, invisible to every
// existing gate (the .src-stamp is gitignored, the singleton wall
// covered client bundles only, CI built with no diff). This arm
// owns the whole artifact plane: build everything, then refuse on
// any tracked lib/ file a fresh build would rewrite. The cure it
// names is the law: the artifact lands in the SAME commit as the
// src (pnpm run build, then stage the diff).
const build = spawnSync(process.execPath, ["tools/build-plane.mjs", "build"], {
  cwd: REPO,
  stdio: "inherit",
});
if (build.status !== 0) {
  console.error("BATTERY FAIL: lib-sync build (tools/build-plane.mjs build)");
  process.exit(1);
}
const drift = spawnSync("git", ["status", "--porcelain", "--", "**/lib/**"], {
  cwd: REPO,
  encoding: "utf8",
});
if (drift.status !== 0 || typeof drift.stdout !== "string") {
  console.error("BATTERY FAIL: lib-sync git status unreadable");
  process.exit(1);
}
// Drift is WORKTREE vs INDEX (second column / untracked), not
// index vs HEAD: staged lib updates are the law's own end state —
// the artifact sits staged for the same commit as its src. Only a
// file the fresh build rewrote PAST what is staged refuses.
const dirty = drift.stdout
  .split("\n")
  .filter((l) => l.trim() !== "")
  // XY path: refuse when Y is non-space (worktree differs from
  // index) or the file is untracked — a fresh build minted it.
  .filter((l) => (l[1] !== undefined && l[1] !== " ") || l.startsWith("??"));
if (dirty.length > 0) {
  console.error("BATTERY FAIL: lib/ drifted past the staged artifact — the build rewrote files beyond what is staged:");
  for (const line of dirty) console.error("  " + line);
  console.error("The artifact lands in the SAME commit as the src: pnpm run build, then stage the diff.");
  process.exit(1);
}
// THE ACCEPTANCE ARMS (round-6 audit, 2026-10-13): the tiers job
// and the pytest seat run in CI only, and CI fires on main/master —
// so on the branch the team works on, the expected / bench /
// snapshot surfaces and the vendored layer C pytest seat were
// judged by NOTHING. All four are keyless and cheap, and they run
// AFTER the lib-sync build so the expected tier judges fresh
// artifacts (CI's own order: build, then expected). pytest skips
// LOUD — never silently — where the box has no pytest, and names
// the install line.
for (const [label, config] of [
  ["expected", "vitest.expected.config.ts"],
  ["bench", "vitest.bench.config.ts"],
  ["snapshot", "vitest.snapshot.config.ts"],
  ["web", "vitest.web.config.ts"],
]) {
  const arm = spawnSync(vitest, ["run", "--config", config], { cwd: REPO, stdio: "inherit" });
  if (arm.status !== 0) {
    console.error(`BATTERY FAIL: ${label} tier (vitest run --config ${config})`);
    process.exit(1);
  }
  console.log(`ok   ${label} tier`);
}
const pytest = spawnSync("python3", ["-m", "pytest", "tests/", "-q"], { cwd: REPO, encoding: "utf8" });
if (pytest.error !== undefined && pytest.error !== null) {
  console.warn("SKIP-LOUD: python3 absent — the vendored layer C pytest seat is unjudged here (CI owns it; install python3 + pytest to judge locally)");
} else if (pytest.status === 5 || /No module named pytest/u.test(pytest.stdout + pytest.stderr)) {
  console.warn("SKIP-LOUD: pytest absent — the vendored layer C seat is unjudged here (pip install pytest; CI owns it)");
} else if (pytest.status !== 0) {
  console.error(pytest.stdout);
  console.error(pytest.stderr);
  console.error("BATTERY FAIL: pytest seat (python3 -m pytest tests/ -q)");
  process.exit(1);
} else {
  console.log("ok   pytest seat (vendored layer C)");
}
console.log(`battery green: tsc x${PACKAGES.length} + walls (every project) + lib-sync + acceptance arms`);
