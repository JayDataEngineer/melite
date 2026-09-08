#!/usr/bin/env node
// hook-full-battery.mjs — pre-push checkpoint: tsc ×5 + WALLS-TS.
// The walls are the estate's gate law; tsc per package mirrors CI's
// matrix locally. Exits non-zero on the FIRST failure (loud, named).
import { spawnSync } from "node:child_process";

const PACKAGES = [
  "packages/gateway/core",
  "packages/gateway/doors",
  "packages/gateway/shell",
  "packages/gateway/queue",
  "packages/engines/comfyui",
];

for (const p of PACKAGES) {
  const tsc = `${p}/node_modules/.bin/tsc`;
  const r = spawnSync(tsc, ["--noEmit", "-p", `${p}/tsconfig.json`], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error(`BATTERY FAIL: tsc ${p}`);
    process.exit(1);
  }
}

const walls = spawnSync("node", ["tests/walls/ts/run.mjs"], { stdio: "inherit" });
if (walls.status !== 0) {
  console.error("BATTERY FAIL: walls");
  process.exit(1);
}
console.log("battery green: tsc x5 + walls");
