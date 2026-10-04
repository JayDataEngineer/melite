#!/usr/bin/env node
// fresh-clone-probe — the fresh-machine proof, repo-owned.
//
// The operator's law (2026-10-15): the repo is shared on GitHub, so
// "works on other people's computers" must be provable HERE, not
// argued. This script does what a stranger does — a plain public
// clone, pnpm install, the README's own sequence — on an isolated
// sandbox it owns, and reports every step PASS/FAIL with verbatim
// refusals. It is the executable form of the 2026-10-14 sandbox
// audit (dev_docs/audits/sandbox-zimage-autoprovision-2026-10-14.md,
// developer-local), whose F1–F3 cured; whatever it catches next is
// a finding to cure, not a probe bug.
//
// Scope honesty (the README's own law): weights are separate,
// deliberate downloads. The probe NEVER runs `provision models` —
// no tens-of-GB fetch, no GPU needed. It proves: the clone is
// complete, the workspace installs, profiles render, the engine
// core + Manager provision, the engine boots on a private port,
// declared extensions install through Manager's git-url door,
// verify goes green, and the keyless snapshot suite passes from
// the fresh tree.
//
// ISOLATION (absolute): the sandbox workdir owns everything it
// writes — the clone, the DSH home, the engine runtime, the
// machine-local overlay. It never touches the live estate: no
// request to the live engine ports, no write to the operator's
// ~/.dsh, no read of credentials. The private engine port is
// claimed by binding before it is used, and the live ports are
// refused outright.
//
// Usage:
//   node tools/fresh-clone-probe.mjs [--remote <url>] [--branch <name>]
//        [--workdir <dir>] [--keep] [--skip-snapshot]
//   --remote      default https://github.com/JayDataEngineer/melite.git
//   --branch      default cordis
//   --workdir     default /var/tmp/melite-fresh-<pid>
//   --keep        keep the sandbox on disk after the run (debug)
//   --skip-snapshot   skip the keyless snapshot step (engine proof
//                     still runs; the harness replay is the slow leg)
//
// Exit: 0 when every step passed, 1 otherwise. The report prints
// even on failure — a refusal met is a finding, reported verbatim.

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdirSync, readFileSync, rmSync, statfsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

// ── flags ──

function flag(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith("--") ? fallback : v;
}
function boolFlag(name) {
  return process.argv.includes(name);
}

/** Picks the sandbox root. os.tmpdir() is RAM-backed on this class
 *  of machine (tmpfs) and the engine tier's venv + core checkout
 *  exhausted it mid-run (the pass-3 receipt: ENOSPC on a log write
 *  with the tmpfs reporting 39G — tmpfs spends RAM, and the OOM
 *  refusal has no veto). A disk-backed /var/tmp takes precedence
 *  when it exists; TMPDIR set by the user wins over both.
 *  @returns {string} the sandbox root directory */
function sandboxRoot() {
  if (process.env["TMPDIR"] !== undefined) return tmpdir();
  return existsSync("/var/tmp") ? "/var/tmp" : tmpdir();
}

const REMOTE = flag("--remote", "https://github.com/JayDataEngineer/melite.git");
const BRANCH = flag("--branch", "cordis");
const WORKDIR = resolve(flag("--workdir",
  join(sandboxRoot(), "melite-fresh-" + String(process.pid))));
const KEEP = boolFlag("--keep");
const SKIP_SNAPSHOT = boolFlag("--skip-snapshot");

// The live estate's own ports — the probe refuses to touch these
// even if a derived value were to collide (the estate is untouchable
// except through its provisioner doors; an engine restart is
// operator-invoked, never a probe side effect).
const LIVE_PORTS = new Set([8188, 33081, 3080]);

/** Resolves a tool the way the stranger's PATH would, with the same
 *  pnpm fallback infer-provision.mjs uses on this class of machine.
 *  @param {string} name the executable to resolve
 *  @returns {string} an absolute or PATH-resolvable command */
function tool(name) {
  if (name === "pnpm") {
    const fallback = join(process.env["HOME"] ?? "", ".local/share/pnpm/pnpm");
    if (existsSync(fallback)) return fallback;
  }
  return name;
}

// ── the step runner ──

const results = [];

/** Spawns a command capturing ALL output to a log file (the report's
 *  verbatim tail). A step passes when the exit code is 0, no timeout
 *  hit, and the optional check finds no refusal — a stranger's
 *  refusal is the finding, never paraphrased away.
 *
 * @param {string} name the step's report name
 * @param {{cmd: string, args: string[], cwd?: string,
 *          env?: Record<string, string>, timeoutMs?: number,
 *          check?: (text: string) => string | null}} spec
 * @returns {Promise<boolean>} true when the step passed
 */
async function runStep(name, spec) {
  const started = Date.now();
  const logPath = join(WORKDIR, "logs", name.replace(/[^a-z0-9-]+/g, "-") + ".log");
  process.stdout.write("== " + name + " … ");
  const pass = await new Promise((resolveStep) => {
    const child = spawn(spec.cmd, spec.args, {
      cwd: spec.cwd ?? WORKDIR,
      env: { ...process.env, ...spec.env },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, spec.timeoutMs ?? 20 * 60_000);
    let out = "";
    child.stdout.on("data", (d) => { out += String(d); });
    child.stderr.on("data", (d) => { out += String(d); });
    child.on("error", (e) => { out += String(e); finish(false, out); });
    child.on("close", (code) => finish(code === 0 && !killed, out));
    function finish(passed, text) {
      clearTimeout(timer);
      mkdirSync(join(WORKDIR, "logs"), { recursive: true });
      if (passed && spec.check) {
        const problem = spec.check(text);
        if (problem !== null) {
          passed = false;
          writeFileSync(logPath, text + "\n[probe] check refused: " + problem + "\n");
          resolveStep(passed);
          return;
        }
      }
      writeFileSync(logPath, text);
      resolveStep(passed);
    }
  });
  const secs = ((Date.now() - started) / 1000).toFixed(1);
  results.push({ name, pass, secs, logPath });
  console.log(pass ? "PASS (" + secs + "s)" : "FAIL (" + secs + "s)");
  return pass;
}

/** Prints the verbatim tail of a step's log — the refusal, as met.
 *  @param {string} logPath the step's captured log
 *  @returns {void} */
function tail(logPath) {
  if (!existsSync(logPath)) return;
  const lines = readFileSync(logPath, "utf8").split("\n");
  console.log("──── verbatim tail (" + logPath + ") ────");
  console.log(lines.slice(-25).join("\n"));
}

// ── the probe itself ──

const CLONE = join(WORKDIR, "melite");
const DSH_HOME = join(WORKDIR, "dsh-home");
const OVERLAY = join(CLONE, "data", "inference.local.json");

/** Claims a free private TCP port by binding :0 — the port is free
 *  the moment the probe needs it, and never one of the live ports.
 *  @returns {Promise<number>} a port the OS just offered */
async function freePort() {
  return new Promise((res, rej) => {
    const srv = createServer();
    srv.listen(0, "127.0.0.1", () => {
      const p = srv.address().port;
      srv.close(() => res(p));
    });
    srv.on("error", rej);
  });
}

/** Polls the sandbox engine until /system_stats answers 200 — the
 *  same liveness check `provision verify` pins.
 *  @param {number} port the private engine port
 *  @param {number} timeoutMs the boot budget
 *  @returns {Promise<boolean>} true when the engine answered */
async function waitEngine(port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch("http://127.0.0.1:" + String(port) + "/system_stats");
      if (r.ok) return true;
    } catch { /* not up yet — keep polling */ }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

async function main() {
  console.log("fresh-clone probe — the shared-repo proof");
  console.log("remote:    " + REMOTE + " (" + BRANCH + ")");
  console.log("workdir:   " + WORKDIR + (KEEP ? " (kept)" : " (removed on exit)"));
  if (existsSync(WORKDIR)) {
    console.error("probe refused: workdir exists — " + WORKDIR);
    process.exit(1);
  }
  // space preflight: the sandbox carries a clone, a workspace install,
  // a ComfyUI core checkout, and the engine venv — a few GB before
  // any model. Refusing up front beats ENOSPC mid-step (the pass-3
  // receipt: a tmpfs sandbox died writing its own log).
  const MIN_FREE = 20 * 1024 ** 3;
  const root = statfsSync(resolve(WORKDIR, ".."));
  const free = Number(root.bavail) * Number(root.bsize);
  if (free < MIN_FREE) {
    console.error("probe refused: " + (free / 1024 ** 3).toFixed(1) +
      "GiB free under the workdir — the engine tier needs " +
      (MIN_FREE / 1024 ** 3).toFixed(0) + "GiB before any model");
    process.exit(1);
  }
  mkdirSync(WORKDIR, { recursive: true });
  mkdirSync(join(WORKDIR, "logs"), { recursive: true });

  const port = await freePort();
  if (LIVE_PORTS.has(port)) {
    console.error("probe refused: OS offered a live-estate port (" + String(port) + ")");
    process.exit(1);
  }
  console.log("engine port (private): " + String(port));

  // 1 — the stranger's clone (plain, no --recurse-submodules: the
  // probe must catch any vendored thing a plain clone leaves empty)
  let ok = await runStep("clone", {
    cmd: "git", args: ["clone", "--branch", BRANCH, "--single-branch", REMOTE, CLONE],
    timeoutMs: 10 * 60_000,
  });
  if (!ok) { report(); teardown(); process.exit(1); }

  // 2 — the documented submodule step (README quick start): a plain
  // clone leaves the 15 vendored trees empty; the README names the
  // init, the probe runs it, and the census below asserts it held
  ok = await runStep("submodule-init", {
    cmd: "git", args: ["submodule", "update", "--init", "--recursive"], cwd: CLONE,
    timeoutMs: 20 * 60_000,
  });
  if (!ok) { report(); teardown(); process.exit(1); }

  // 3 — submodule census: every vendored extension initialized by the
  // documented step (the F1 law — no stranger runs init by hand)
  ok = await runStep("submodules-initialized", {
    cmd: "git", args: ["submodule", "status"], cwd: CLONE,
    check: (t) => t.split("\n").some((l) => l.startsWith("-"))
      ? "uninitialized submodule rows present (prefix '-'): " +
        t.split("\n").filter((l) => l.startsWith("-")).join(" | ")
      : null,
  });
  if (!ok) { report(); teardown(); process.exit(1); }

  // 4 — the workspace install (frozen by the lockfile a stranger gets)
  ok = await runStep("pnpm-install", {
    cmd: tool("pnpm"), args: ["install", "--frozen-lockfile"], cwd: CLONE,
    timeoutMs: 30 * 60_000,
  });
  if (!ok) { report(); teardown(); process.exit(1); }

  // 5 — the DSH profiles render into the SANDBOX's dsh-home (the
  // operator's ~/.dsh is never written; --dsh-home is the door)
  ok = await runStep("profile-render", {
    cmd: process.execPath,
    args: ["packages/harness/provisioner/bin/infer-provision.mjs", "all", "--dsh-home", DSH_HOME],
    cwd: CLONE,
    timeoutMs: 15 * 60_000,
    check: (t) => (t.match(/rendered|profiles/g) === null
      ? "no render receipt in output" : null),
  });
  if (!ok) { report(); teardown(); process.exit(1); }

  // 6 — the machine-local overlay: the DOCUMENTED seam for a machine
  // this engine lives on (untracked by design, tracked shape clean).
  // Port + url only — every other derived key follows from them.
  mkdirSync(join(CLONE, "data"), { recursive: true });
  writeFileSync(OVERLAY, JSON.stringify({
    engines: { comfyui: {
      port: port,
      url: "http://127.0.0.1:" + String(port),
    } },
  }, null, 2) + "\n");
  console.log("== overlay … PASS (data/inference.local.json: port " + String(port) + ")");
  results.push({ name: "overlay", pass: true, secs: "0.0",
    logPath: join(WORKDIR, "logs", "overlay.txt") });
  writeFileSync(join(WORKDIR, "logs", "overlay.txt"),
    "wrote " + OVERLAY + " (port " + String(port) + ")\n");

  // 7 — the engine sync: core at pin, Manager vendored, venv from
  // the tracked uv.lock (this is the ComfyUI engine tier's uv — the
  // one place uv exists in this repo)
  ok = await runStep("engine-sync", {
    cmd: tool("pnpm"), args: ["run", "provision", "--", "sync"], cwd: CLONE,
    timeoutMs: 30 * 60_000,
  });
  if (!ok) { report(); teardown(); process.exit(1); }

  // 8 — boot: the provisioner's own printed launch line, spawned in
  // the sandbox (operator-invoked restarts stay operator-invoked;
  // this engine belongs to the sandbox alone)
  const bootOut = spawnSync(tool("pnpm"), ["run", "provision", "--", "boot-cmd"],
    { cwd: CLONE, encoding: "utf8" });
  const line = (bootOut.stdout + bootOut.stderr)
    .split("\n").find((l) => l.includes("main.py"));
  if (line === undefined) {
    results.push({ name: "engine-boot", pass: false, secs: "0.0",
      logPath: join(WORKDIR, "logs", "engine-boot.log") });
    writeFileSync(join(WORKDIR, "logs", "engine-boot.log"),
      "no launch line in boot-cmd output:\n" + (bootOut.stdout + bootOut.stderr));
    console.log("== engine-boot … FAIL (no launch line)");
    report(); teardown(); process.exit(1);
  }
  const engineLog = join(WORKDIR, "logs", "engine-boot.log");
  const engine = spawn("bash", ["-c", line], { cwd: CLONE,
    env: { ...process.env, DSH_HOME }, stdio: ["ignore", "pipe", "pipe"] });
  // the crash path owns the engine too: a probe crash between spawn
  // and teardown would leak a listening process on a private port
  engineProc = engine;
  let engineText = "";
  engine.stdout.on("data", (d) => { engineText += String(d); });
  engine.stderr.on("data", (d) => { engineText += String(d); });
  const startedBoot = Date.now();
  const up = await waitEngine(port, 4 * 60_000);
  writeFileSync(engineLog, engineText);
  results.push({ name: "engine-boot", pass: up,
    secs: ((Date.now() - startedBoot) / 1000).toFixed(1), logPath: engineLog });
  console.log("== engine-boot … " + (up ? "PASS" : "FAIL"));
  if (!up) { report(); await teardownEngine(engine); teardown(); process.exit(1); }

  // 9 — extensions through Manager's git-url door (the engine must
  // be up first; the door is synchronous clone + pip per row)
  ok = await runStep("extensions-install", {
    cmd: tool("pnpm"), args: ["run", "provision", "--", "extensions"], cwd: CLONE,
    timeoutMs: 30 * 60_000,
  });
  if (!ok) { await teardownEngine(engine); report(); teardown(); process.exit(1); }

  // 10 — verify: every check green against the sandbox instance
  ok = await runStep("verify", {
    cmd: tool("pnpm"), args: ["run", "provision", "--", "verify"], cwd: CLONE,
    timeoutMs: 5 * 60_000,
    check: (t) => (t.includes("REFUSED") || t.includes("FAIL ")
      ? "verify reported a failure" : null),
  });

  // 11 — the keyless harness receipt from the fresh tree (the
  // recorded-session replay owns the stranger-proof lane; e2e self-
  // skips without a key and is not this probe's business)
  if (ok && !SKIP_SNAPSHOT) {
    ok = await runStep("snapshot-replay", {
      cmd: tool("pnpm"), args: ["run", "test:snapshot"], cwd: CLONE,
      timeoutMs: 30 * 60_000,
    });
  }

  await teardownEngine(engine);
  report();
  teardown();
  process.exit(ok ? 0 : 1);
}

/** Stops the sandbox engine and waits for it to die — the sandbox is
 *  torn down clean, the live estate never enters this path.
 *  @param {import("node:child_process").ChildProcess} engine the spawned engine
 *  @returns {Promise<void>} resolves when the process is gone */
async function teardownEngine(engine) {
  if (engine.exitCode !== null) return;
  engine.kill("SIGTERM");
  await new Promise((res) => {
    const t = setTimeout(() => { engine.kill("SIGKILL"); res(); }, 15_000);
    engine.on("close", () => { clearTimeout(t); res(); });
  });
}

/** Prints the report table and the verbatim tails of every failure.
 *  @returns {void} */
function report() {
  console.log("\n──────── probe report ────────");
  for (const r of results) {
    console.log((r.pass ? "  PASS " : "  FAIL ") + r.name.padEnd(24) + r.secs + "s");
  }
  const fails = results.filter((r) => !r.pass);
  if (fails.length === 0) {
    console.log("fresh-clone proof: GREEN — clone → install → render → sync → boot → extensions → verify" +
      (SKIP_SNAPSHOT ? "" : " → snapshot") + " all passed");
    return;
  }
  console.log("fresh-clone proof: " + String(fails.length) + " step(s) failed — verbatim:");
  for (const f of fails) tail(f.logPath);
}

/** Removes the sandbox unless --keep.
 *  @returns {void} */
function teardown() {
  if (KEEP) {
    console.log("(sandbox kept: " + WORKDIR + ")");
    return;
  }
  rmSync(WORKDIR, { recursive: true, force: true });
}

/** The spawned sandbox engine, once booted — the crash path kills it
 *  so a probe crash never leaks a listening process.
 *  @type {import("node:child_process").ChildProcess | null} */
let engineProc = null;

main().catch(async (e) => {
  console.error("probe crashed: " + String(e));
  if (engineProc !== null) await teardownEngine(engineProc);
  teardown();
  process.exit(1);
});
