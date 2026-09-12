#!/usr/bin/env node
// hook-full-battery.mjs — pre-push checkpoint: tsc per typecheck
// package + the walls (root vitest node project).
// The walls are the estate's gate law; tsc mirrors each package's own
// `typecheck` script locally (CI runs unit/coverage/tiers only —
// types are this battery's to own). Exits non-zero on the FIRST
// failure (loud, named). Uses per-package .bin/tsc + the repo
// node_modules/.bin/vitest directly (no pnpm at run time).
import { spawnSync } from "node:child_process";
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

for (const p of PACKAGES) {
  const tsc = `${REPO}${p}/node_modules/.bin/tsc`;
  if (!existsSync(tsc)) {
    console.error(`BATTERY FAIL: tsc missing for ${p} (run pnpm install)`);
    process.exit(1);
  }
  const r = spawnSync(tsc, ["--noEmit"], {
    cwd: `${REPO}${p}`,
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`BATTERY FAIL: tsc ${p}`);
    process.exit(1);
  }
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
