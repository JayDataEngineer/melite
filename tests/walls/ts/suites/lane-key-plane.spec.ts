// lane-key-plane.spec.ts — D7, THE KEY-PLANE WALL (boot-plane
// residuals, 2026-10-18 audit; walled 2026-10-19). The lanes'
// patches name apiKeyEnv keys; nothing resolved those names against
// the lane's ACTUAL boot env — a renamed or dropped key silently
// 401s at first inference while every keyless wall stays green
// (the "lane dead, battery green" shape).
//
// THE SURFACE (the deploy-path audit's D7 row proposed
// start-dsh.sh exports; that file is RETIRED — the boot door today
// is `dsh web` from ~/.dsh/profiles/<lane>): this wall reads the
// RUNNING lane processes' environments from /proc/<pid>/environ —
// KEY NAMES ONLY, never values (LAW 9). A lane patch's every
// apiKeyEnv name must be provided by that lane's own process env.
//
// SELF-SKIP: the patches are operator-machine state (~/.dsh), never
// repo content — CI has no lanes and the wall skips there. The
// failure text names the missing VARIABLE NAMES only; secret values
// never enter the assertion, the output, or the log.
import { test } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { parse as parseYaml } from "yaml";

const DSH_HOME: string = join(homedir(), ".dsh");
const PROFILES: string = join(DSH_HOME, "profiles");

/** Every `apiKeyEnv:` name a lane patch declares (YAML-parsed rows;
 *  these are VARIABLE NAMES, not secrets). */
function patchKeyNames(patchPath: string): string[] {
  const rows = parseYaml(readFileSync(patchPath, "utf8")) as unknown;
  const names: string[] = [];
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node !== null && typeof node === "object") {
      for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
        if (k === "apiKeyEnv" && typeof v === "string" && v !== "") names.push(v);
        else walk(v);
      }
    }
  };
  walk(rows);
  return [...new Set(names)].sort();
}

/** Key names of a running process's environment (never values). */
function environKeys(pid: string): Set<string> {
  const keys = new Set<string>();
  for (const entry of readFileSync(join("/proc", pid, "environ"), "utf8").split("\0")) {
    const eq = entry.indexOf("=");
    if (eq > 0) keys.add(entry.slice(0, eq));
  }
  return keys;
}

/** A cmdline's lane: `--profile <lane>` (space or `=` form) parses
 *  FIRST — a `--profile headless --patch profiles/web/...` boot must
 *  not read as web because the patch path's substring matches first
 *  (the lane-key row, 2026-10-20). Without the flag, a cmdline naming
 *  ~/.dsh/profiles/<lane> still keys to that lane (the legacy face).
 *  @param cmdline — a /proc cmdline body (NUL-separated argv).
 *  @returns the lane name, or null when nothing keys it. */
export function laneOfCmdline(cmdline: string): string | null {
  const parts = cmdline.split("\0").filter((p) => p !== "");
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]!;
    if (p === "--profile") {
      const next = parts[i + 1];
      if (next !== undefined && next !== "") return next;
    } else if (p.startsWith("--profile=")) {
      const v = p.slice("--profile=".length);
      if (v !== "") return v;
    }
  }
  const m = cmdline.match(/profiles[\/\\]([a-zA-Z0-9_-]+)/);
  return m === null ? null : m[1]!;
}

/** One env-keys snapshot per RUNNING lane, keyed by laneOfCmdline.
 *  Returns lane → union of its processes' env key names. */
function runningLaneEnvs(): Map<string, Set<string>> {
  const lanes = new Map<string, Set<string>>();
  for (const pid of readdirSync("/proc")) {
    if (!/^\d+$/.test(pid)) continue;
    let cmdline: string;
    try { cmdline = readFileSync(join("/proc", pid, "cmdline"), "utf8"); } catch { continue; }
    const lane = laneOfCmdline(cmdline);
    if (lane === null) continue;
    try {
      const keys = environKeys(pid);
      lanes.set(lane, new Set([...(lanes.get(lane) ?? []), ...keys]));
    } catch { /* the process exited between the two reads */ }
  }
  return lanes;
}

/** The resolution itself, pure over its inputs (the negative
 *  control's seam): every patch name must appear in the env set.
 *  @returns the missing `lane: VAR` pairs, names only. */
export function resolveKeyPlane(patchNames: Map<string, string[]>, envs: Map<string, Set<string>>): string[] {
  const missing: string[] = [];
  for (const [lane, names] of patchNames) {
    const env = envs.get(lane);
    if (env === undefined) continue;
    for (const n of names) if (!env.has(n)) missing.push(`${lane}: ${n}`);
  }
  return missing;
}

test("resolution names a rotated-away key (the negative control)", () => {
  const missing = resolveKeyPlane(
    new Map([["web", ["OPENROUTER_API_KEY", "GONE_API_KEY"]]]),
    new Map([["web", new Set(["OPENROUTER_API_KEY"])]]),
  );
  assert.deepEqual(missing, ["web: GONE_API_KEY"],
    "a key the patch names but the boot env lost fails HERE, naming the variable — never at first inference");
});

test("laneOfCmdline parses --profile first, never the patch-path substring (the lane-key row)", () => {
  const nul = "\0";
  // the row's exact shape: the flag names headless, the patch path
  // names web — the boot keys to HEADLESS
  assert.equal(laneOfCmdline(["dsh", "web", "--profile", "headless", "--patch", "profiles/web/cordis.patch.yml"].join(nul)), "headless");
  // = form parses the same way
  assert.equal(laneOfCmdline(["dsh", "--profile=bench", "serve"].join(nul)), "bench");
  // a flag with no value falls through to the legacy path face (and
  // the valueless flag itself is never the lane)
  assert.equal(laneOfCmdline(["dsh", "--profile"].join(nul)), null);
  // legacy face: no flag, the profile dir in the cmdline keys the lane
  assert.equal(laneOfCmdline(["node", "/home/u/.dsh/profiles/web/boot.mjs"].join(nul)), "web");
  assert.equal(laneOfCmdline(["node", "server.js"].join(nul)), null);
});

test.skipIf(!existsSync(PROFILES))("no operator lanes on this machine (CI)", () => {
  // reachable only where the lanes exist; the companion below does
  // the real work. this arm keeps the skip visible in the report.
});

test.skipIf(!existsSync(PROFILES))("every lane patch apiKeyEnv name is provided by that lane's running boot env", () => {
  const lanes = runningLaneEnvs();
  const missing: string[] = [];
  const checked: string[] = [];
  for (const lane of readdirSync(PROFILES)) {
    const patch = join(PROFILES, lane, "cordis.patch.yml");
    if (!existsSync(patch)) continue;
    const names = patchKeyNames(patch);
    if (names.length === 0) continue;
    const env = lanes.get(lane);
    if (env === undefined) {
      // The lane is not RUNNING: nothing to resolve against — skip
      // it by naming it, so a lane that should be up is visible.
      checked.push(`${lane}: (not running — skipped, patch names ${names.join(", ")})`);
      continue;
    }
    checked.push(`${lane}: ${names.length} apiKeyEnv names`);
    for (const n of names) if (!env.has(n)) missing.push(`${lane}: ${n}`);
  }
  assert.ok(checked.length > 0, `at least one lane patch names apiKeyEnv keys (checked: ${checked.join("; ") || "none"})`);
  assert.deepEqual(missing, [],
    `each named key must be provided by its lane's boot env (missing VARIABLE NAMES: ${missing.join(", ")}; checked ${checked.join("; ")}) — key rotation or a boot under the wrong env must fail HERE, naming the variable, never at first inference`);
});
