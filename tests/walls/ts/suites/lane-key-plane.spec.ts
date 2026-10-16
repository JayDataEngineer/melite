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
// THE SWEEP DISCIPLINE (flake class 3, flake-slowness-wave2
// 2026-11-08): a process keys ONLY on an explicit --profile flag —
// the bare `profiles/<lane>` substring face keyed test-spawned
// children (they inherit the worker's environ) into the union, so
// the verdict raced sibling specs' subprocesses every gate. The
// reader's own process tree is excluded, a substring-only process
// survives as a named-check, and a first-sweep miss settles once
// and rechecks before reding (a lane restarting mid-read is not a
// missing key).
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

/** A cmdline's lane, FOR THE SWEEP: only an explicit `--profile <lane>`
 *  (space or `=` form) keys a process into its lane's env union.
 *  The legacy bare-substring face (any argv mentioning
 *  `profiles/<lane>`) keyed TEST-SPAWNED children — a spec's
 *  `--patch profiles/web/...` subprocess inherits the worker's
 *  environ — into that lane's union, so the sweep's verdict raced
 *  sibling specs' subprocesses every gate (flake class 3,
 *  flake-slowness-wave2). The substring face survives as
 *  laneMentioned (the named-check), never as a key.
 *  `--profile` parses FIRST — a `--profile headless --patch
 *  profiles/web/...` boot must not read as web (the lane-key row,
 *  2026-10-20).
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
  return null;
}

/** The lane a cmdline MENTIONS without keying: the legacy
 *  `profiles/<lane>` substring face, demoted to a named-check — the
 *  live arm reports these processes by lane so a genuinely running
 *  lane that boots flagless stays visible instead of silently
 *  unswept. Never feeds the env union.
 *  @param cmdline — a /proc cmdline body (NUL-separated argv).
 *  @returns the mentioned lane name, or null. */
export function laneMentioned(cmdline: string): string | null {
  const m = cmdline.match(/profiles[\/\\]([a-zA-Z0-9_-]+)/);
  return m === null ? null : m[1]!;
}

/** The sweep's own process tree (the worker and its ancestors): a
 *  wall that reads /proc must never key the reader into the read.
 *  @returns pids to skip during the sweep. */
export function ownTreePids(): Set<string> {
  const ppidOf = new Map<string, string>();
  for (const pid of readdirSync("/proc")) {
    if (!/^\d+$/.test(pid)) continue;
    try {
      // /proc/<pid>/stat: `pid (comm) state ppid ...` — parse after
      // the LAST ')' so a comm containing spaces cannot shift fields
      const stat = readFileSync(join("/proc", pid, "stat"), "utf8");
      const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
      const ppid = fields[1];
      if (ppid !== undefined) ppidOf.set(pid, ppid);
    } catch { /* the process exited mid-read */ }
  }
  const tree = new Set<string>();
  let cur: string | undefined = String(process.pid);
  while (cur !== undefined && cur !== "0" && !tree.has(cur)) {
    tree.add(cur);
    cur = ppidOf.get(cur);
  }
  return tree;
}

/** One env-keys snapshot per RUNNING lane. A process keys by
 *  laneOfCmdline ONLY (the explicit-flag face); bare-substring
 *  processes are counted per lane in `mentioned` for the live arm's
 *  named-check. The reader's own process tree never enters either
 *  map. Returns `keyed` lane → union of its processes' env key
 *  names, and `mentioned` lane → process count. */
function runningLaneEnvs(): { keyed: Map<string, Set<string>>; mentioned: Map<string, number> } {
  const keyed = new Map<string, Set<string>>();
  const mentioned = new Map<string, number>();
  const skip = ownTreePids();
  for (const pid of readdirSync("/proc")) {
    if (!/^\d+$/.test(pid) || skip.has(pid)) continue;
    let cmdline: string;
    try { cmdline = readFileSync(join("/proc", pid, "cmdline"), "utf8"); } catch { continue; }
    const lane = laneOfCmdline(cmdline);
    if (lane !== null) {
      try {
        const keys = environKeys(pid);
        keyed.set(lane, new Set([...(keyed.get(lane) ?? []), ...keys]));
      } catch { /* the process exited between the two reads */ }
      continue;
    }
    const mention = laneMentioned(cmdline);
    if (mention !== null) mentioned.set(mention, (mentioned.get(mention) ?? 0) + 1);
  }
  return { keyed, mentioned };
}

/** The settle window between the two sweeps: long enough for a lane
 *  restart's process handoff, far under the project's 30s test
 *  budget. */
const SETTLE_MS = 2500;

/** THE SETTLE-AND-RECHECK VERDICT (class 3's cure): a first-sweep
 *  miss may be a lane restarting mid-read — the snapshot caught the
 *  gap between the old process's exit and the new one's environ, and
 *  reding on it names a key the REAL lane provides. On missing keys
 *  the verdict settles once, re-sweeps, and judges the PERSISTENT
 *  result: a transient boot gap passes; genuinely missing keys red.
 *  Exported for the negative controls (the transient shape must be
 *  unreachable without the recheck).
 *  @param patchNames — lane → every `apiKeyEnv` name its patch declares.
 *  @param sweep — one live /proc env-keys snapshot.
 *  @param sleep — the settle wait, injected so the controls pay nothing.
 *  @returns the missing `lane: VAR` pairs and whether a recheck ran. */
export async function keyPlaneVerdict(
  patchNames: Map<string, string[]>,
  sweep: () => Map<string, Set<string>>,
  sleep: (ms: number) => Promise<void>,
): Promise<{ missing: string[]; rechecked: boolean }> {
  let missing = resolveKeyPlane(patchNames, sweep());
  if (missing.length === 0) return { missing, rechecked: false };
  await sleep(SETTLE_MS);
  missing = resolveKeyPlane(patchNames, sweep());
  return { missing, rechecked: true };
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

test("laneOfCmdline keys ONLY on --profile; the substring face is the named-check (the lane-key row + class 3)", () => {
  const nul = "\0";
  // the row's exact shape: the flag names headless, the patch path
  // names web — the boot keys to HEADLESS
  assert.equal(laneOfCmdline(["dsh", "web", "--profile", "headless", "--patch", "profiles/web/cordis.patch.yml"].join(nul)), "headless");
  // = form parses the same way
  assert.equal(laneOfCmdline(["dsh", "--profile=bench", "serve"].join(nul)), "bench");
  // a flag with no value keys nothing
  assert.equal(laneOfCmdline(["dsh", "--profile"].join(nul)), null);
  // THE CLASS-3 CURE: the bare substring (a patch path in ANY
  // subprocess's argv — test children inherit the worker's environ)
  // keys nothing; laneMentioned is where it stays visible
  assert.equal(laneOfCmdline(["node", "/home/u/.dsh/profiles/web/boot.mjs"].join(nul)), null);
  assert.equal(laneOfCmdline(["node", "dsh", "--patch", "profiles/web/cordis.patch.yml"].join(nul)), null);
  assert.equal(laneMentioned(["node", "/home/u/.dsh/profiles/web/boot.mjs"].join(nul)), "web");
  assert.equal(laneMentioned(["node", "dsh", "--patch", "profiles/web/cordis.patch.yml"].join(nul)), "web");
  assert.equal(laneMentioned(["node", "server.js"].join(nul)), null);
});

test("a first-sweep miss that the settled sweep heals passes ONLY through the recheck (the transient control)", async () => {
  let calls = 0;
  const sweep = (): Map<string, Set<string>> => {
    calls += 1;
    // call 1: the boot-gap snapshot (the patch's key absent); the
    // restarted lane's environ carries it
    return new Map([["web", new Set(calls === 1 ? ["OPENROUTER_API_KEY"] : ["OPENROUTER_API_KEY", "GONE_API_KEY"])]]);
  };
  const { missing, rechecked } = await keyPlaneVerdict(
    new Map([["web", ["OPENROUTER_API_KEY", "GONE_API_KEY"]]]),
    sweep,
    async () => {},
  );
  assert.equal(rechecked, true, "the transient shape must have exercised the recheck");
  assert.deepEqual(missing, [], "a lane restarting mid-sweep is not a missing key");
});

test("a key missing across BOTH sweeps reds (the wall keeps its own firing arm)", async () => {
  const { missing, rechecked } = await keyPlaneVerdict(
    new Map([["web", ["OPENROUTER_API_KEY", "GONE_API_KEY"]]]),
    () => new Map([["web", new Set(["OPENROUTER_API_KEY"])]]),
    async () => {},
  );
  assert.equal(rechecked, true);
  assert.deepEqual(missing, ["web: GONE_API_KEY"],
    "persistent drift reds — the recheck settles boot gaps, never masks real loss");
});

test.skipIf(!existsSync(PROFILES))("no operator lanes on this machine (CI)", () => {
  // reachable only where the lanes exist; the companion below does
  // the real work. this arm keeps the skip visible in the report.
});

test.skipIf(!existsSync(PROFILES))("every lane patch apiKeyEnv name is provided by that lane's running boot env", async () => {
  const { keyed, mentioned } = runningLaneEnvs();
  const checked: string[] = [];
  for (const lane of readdirSync(PROFILES)) {
    const patch = join(PROFILES, lane, "cordis.patch.yml");
    if (!existsSync(patch)) continue;
    const names = patchKeyNames(patch);
    if (names.length === 0) continue;
    const env = keyed.get(lane);
    if (env === undefined) {
      // The lane is not RUNNING under an explicit --profile: nothing
      // to resolve against. A bare-substring process (the legacy
      // boot shape) stays VISIBLE here without keying into the union
      // (class 3: a test child's patch-path argv must never feed
      // this verdict); a flagless mention of a lane that should be
      // up is still named.
      const shape = mentioned.has(lane)
        ? `(not keyed — ${mentioned.get(lane)} bare-substring process(es) mention this lane without --profile; skipped, patch names ${names.join(", ")})`
        : "(not running — skipped, patch names " + names.join(", ") + ")";
      checked.push(`${lane}: ${shape}`);
      continue;
    }
    checked.push(`${lane}: ${names.length} apiKeyEnv names`);
  }
  assert.ok(checked.length > 0, `at least one lane patch names apiKeyEnv keys (checked: ${checked.join("; ") || "none"})`);
  // THE SETTLE-AND-RECHECK (class 3): a first sweep inside a lane's
  // restart gap must not red on keys the real lane provides — judge
  // the PERSISTENT verdict, naming the boot gap when it passed.
  const { missing, rechecked } = await keyPlaneVerdict(
    patchNamesByLane(),
    () => runningLaneEnvs().keyed,
    (ms) => new Promise((resolve) => { setTimeout(resolve, ms); }),
  );
  assert.deepEqual(missing, [],
    `each named key must be provided by its lane's boot env${rechecked ? " (persisted across the settle-and-recheck — not a boot gap)" : ""} (missing VARIABLE NAMES: ${missing.join(", ")}; checked ${checked.join("; ")}) — key rotation or a boot under the wrong env must fail HERE, naming the variable, never at first inference`);
});

/** Every patch's apiKeyEnv names by lane (the live arm's verdict
 *  input; lanes whose patch carries none are omitted). */
function patchNamesByLane(): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const lane of readdirSync(PROFILES)) {
    const patch = join(PROFILES, lane, "cordis.patch.yml");
    if (!existsSync(patch)) continue;
    const names = patchKeyNames(patch);
    if (names.length > 0) out.set(lane, names);
  }
  return out;
}
