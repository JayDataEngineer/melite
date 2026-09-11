#!/usr/bin/env node
// hook-full-battery.mjs — pre-push checkpoint: tsc per typecheck
// package + the walls (root vitest node project).
// The walls are the estate's gate law; tsc mirrors each package's own
// `typecheck` script locally (CI runs unit/coverage/tiers only —
// types are this battery's to own). Exits non-zero on the FIRST
// failure (loud, named). Uses per-package .bin/tsc + the repo
// node_modules/.bin/vitest directly (no pnpm at run time).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const REPO = new URL("..", import.meta.url).pathname;

// Every package owning a `typecheck` script (tsc --noEmit in its dir).
const PACKAGES = [
  "packages/3d/clothing-placement",
  "packages/engines/comfyui-card-kit",
  "packages/engines/comfyui-cordis",
  "packages/estate/manage",
  "packages/estate/runs",
  "packages/harness/estate-queue",
  "packages/harness/melite-tools",
  "packages/web/editor",
  "packages/web/infer-gallery",
  "packages/web/melite-card-deck",
  "packages/web/melite-card-view",
];

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
