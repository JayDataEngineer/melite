#!/usr/bin/env node
// run.mjs — the TS walls-plane orchestrator (successor of the condemned
// tools/run_walls.py — never run that file: condemned plane).
//
// Usage: node tests/walls/ts/run.mjs [--suite <basename-prefix>]
//
// Runs every suites/*.test.ts under the serving runtime
// (node --experimental-strip-types --test), one subprocess per suite,
// and reports the tally. Sandbox guards (HARD BOUNDARIES):
//   - refuses GATEWAY_PORT=33081 (never touch the live PROD gateway);
//   - strips ambient MELITE_STATE_ROOT / MELITE_REPO_ROOT so a leaked
//     operator export can never point a suite at the real tree
//     (helpers/boot.ts always mints fresh sandbox dirs anyway).
import { readdirSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(here, "..", "..", "..");
const SUITES = join(here, "suites");

if ((process.env["GATEWAY_PORT"] ?? "") === "33081") {
  console.error("REFUSED: GATEWAY_PORT=33081 (the live PROD gateway is off-limits)");
  process.exit(2);
}

const only = process.argv.includes("--suite")
  ? process.argv[process.argv.indexOf("--suite") + 1]
  : null;

const files = readdirSync(SUITES)
  .filter((f) => f.endsWith(".test.ts") && (only === null || f.startsWith(only)))
  .sort()
  .map((f) => join(SUITES, f));
if (files.length === 0) {
  console.error("no suites matched" + (only === null ? "" : " (filter " + only + ")"));
  process.exit(2);
}
for (const f of files) {
  if (!existsSync(f)) {
    console.error("missing suite file: " + f);
    process.exit(2);
  }
}

let pass = 0;
let fail = 0;
for (const f of files) {
  const rel = f.slice(REPO.length + 1);
  console.log("### " + rel);
  const env = { ...process.env };
  delete env["MELITE_STATE_ROOT"];
  delete env["MELITE_REPO_ROOT"];
  delete env["GATEWAY_PORT"];
  const r = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--test", f],
    { cwd: REPO, env, stdio: "inherit" },
  );
  if (r.status === 0) {
    pass += 1;
    console.log("### PASS " + rel);
  } else {
    fail += 1;
    console.log("### FAIL " + rel + " (exit " + r.status + ")");
  }
}
console.log("WALLS-TS PASS " + pass + " FAIL " + fail);
process.exit(fail === 0 ? 0 : 1);
