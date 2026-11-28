#!/usr/bin/env node
// hook-walls-leased.mjs — the pre-push NODE seat, leased (push-
// pipeline rework, 2026-11-17: "a done release never takes another
// 24h"). The lefthook walls job once ran `vitest run --project node`
// un-leased on EVERY push — the same suite the battery's walls tier
// owns, paid twice per changed tree. This wrapper keys the run to
// the walls-node lease (tools/battery-leases.mjs owns the inputs):
// an unchanged tree carries the prior green (one line, exit 0); a
// changed tree fires the suite ONCE and writes the lease, so the
// battery's own walls tier and this seat agree on what ran.
//
// The invocation is the job it replaces, verbatim: the same env
// scrub (MELITE_MCP_ENGINES / MELITE_AGENT_ROUTE off — the walls
// judge the DEFAULTS), the same /var/tmp mktemp TMPDIR (the /tmp
// janitor law), the same SIGPIPE-safe file log under .scratch with
// the verdict on the last lines, the log kept on failure.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadLeases, saveLeases, tierGate } from "./battery-leases.mjs";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const LEASE_PATH = join(REPO, "data/tmp/battery-leases.json");
const TIER = "walls-node";
const FORCE = process.env.DSH_BATTERY_FORCE === "1";

const leases = loadLeases(LEASE_PATH);
const gate = tierGate(REPO, leases, TIER);

if (!FORCE && gate.decision.carry) {
  console.log(`ok   ${TIER} (vitest --project node; ${gate.files} files hashed; lease green, carried from ${leases[TIER]?.at ?? "?"})`);
  process.exit(0);
}

// The run: node project, env scrubbed, janitor-safe TMPDIR, log to a
// file (never a pipe — the SIGPIPE class), verdict on the last lines.
mkdirSync(join(REPO, ".scratch"), { recursive: true });
const logPath = join(REPO, `.scratch/hook-walls-node.${process.pid}.log`);
const tmp = mkdtempSync(join(tmpdir() === "/tmp" ? "/var/tmp" : tmpdir(), "melite-walls-XXXXXX"));
const env = { ...process.env, TMPDIR: tmp };
delete env.MELITE_MCP_ENGINES;
delete env.MELITE_AGENT_ROUTE;
// THE QUICK-SEAT CEILING (2026-11-28, push #4): this seat runs the
// whole node project beside the box's standing load — three boot-heavy
// arms starved past the scoped 30s ceiling in one run while the
// coverage seat passed them at its stretched one. The seat declares
// its pool through loaded-wait's slower-box door: the default budget
// (vitest.config.ts BOOT_BUDGET) and every LOADED_WAIT-keyed arm
// follow it. An operator-set ceiling stands.
env.MELITE_LOADED_WAIT_MS ??= "60000";

const vitest = join(REPO, "node_modules/vitest/vitest.mjs");
const run = spawnSync(process.execPath, [vitest, "run", "--config", "vitest.config.ts", "--project", "node"], {
  cwd: REPO, env, encoding: "utf8", maxBuffer: 1 << 28,
});
writeFileSync(logPath, run.stdout + "\n" + run.stderr);
const tail = (run.stdout + "\n" + run.stderr).split("\n").slice(-6).join("\n");
console.log(tail);
rmSync(tmp, { recursive: true, force: true });

const status = run.status ?? 1;
leases[TIER] = {
  status: status === 0 ? "green" : "red",
  hash: gate.hash,
  at: new Date().toISOString(),
  files: gate.files,
};
saveLeases(LEASE_PATH, leases);
if (status !== 0) {
  console.error(`${TIER} log kept at ${logPath}`);
  process.exit(status);
}
rmSync(logPath, { force: true });
process.exit(0);
