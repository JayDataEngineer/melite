#!/usr/bin/env node
// comfy-engine.mjs — THE ENGINE LIFECYCLE DOOR (operator order
// 2026-11-06: lifecycle/queuing/markers). ComfyUI is Layer B, an
// independent service the harness never spawns implicitly (see
// supervisor.ts: the reachability supervisor owns the seat, never
// the process). This door is the EXPLICIT process owner: up, down,
// status — config-driven, never hardcoded.
//
// Config precedence mirrors comfyui-config.ts endpointConfigPath:
//   1. $COMFYUI_ENDPOINT_CONFIG (explicit path wins),
//   2. <repo>/data/comfyui_endpoint.json (untracked state home),
//   3. the package seed data/comfyui_endpoint.json.
// Reads `url` (liveness + busy) and `boot_cmd` (spawn); `<repo>`
// in boot_cmd resolves to this checkout's top level.
//
// State: <repo>/data/runtime/comfyui/engine.pid (gitignored —
// machine state, never committed). down KILLS the pidfile pid, or
// — with no pidfile (a hand-started instance, like the Oct-15
// squatter) — the main.py whose cmdline carries the configured
// port. down REFUSES a busy engine (running or pending work is
// someone's render) unless --force.
//
// Node port 2026-11-19 (operator law: npm + python only). The .sh's
// `setsid bash -c boot_cmd` leg now runs the boot command through
// the boot_cmd's own interpreter exactly as written (the config
// string is the operator's; the door spawns it detached, logs to
// engine.log, owns the pidfile).
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = sh("git", ["rev-parse", "--show-toplevel"]).out || resolve(join(fileURLToPath(import.meta.url), "..", ".."));
const SEED = join(REPO, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
let CFG = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? join(REPO, "data", "comfyui_endpoint.json");
if (!existsSync(CFG)) CFG = SEED;
const PIDFILE = join(REPO, "data", "runtime", "comfyui", "engine.pid");

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  return { code: r.status, out: String(r.stdout ?? "").trim(), err: String(r.stderr ?? "").trim() };
}

function cfgRead(key) {
  try { return String(JSON.parse(readFileSync(CFG, "utf8"))[key] ?? ""); }
  catch { return ""; }
}

const URL = cfgRead("url");
if (URL === "") { console.error("comfy-engine: no url in " + CFG); process.exit(2); }
const PORT = URL.split(":").pop().split("/")[0];

const alive = () => sh("curl", ["-sf", "-m", "5", URL + "/system_stats"]).code === 0;

function queueDepth() {
  const r = sh("curl", ["-sf", "-m", "10", URL + "/queue"]);
  if (r.code !== 0) return 0;
  try {
    const q = JSON.parse(r.out);
    return ((q.queue_running ?? []).length) + ((q.queue_pending ?? []).length);
  } catch { return 0; }
}

function occupantPid() {
  if (existsSync(PIDFILE)) {
    const pid = readFileSync(PIDFILE, "utf8").trim();
    try { process.kill(Number(pid), 0); return pid; } catch { /* stale pidfile — fall through to the port scan */ }
  }
  // no (or stale) pidfile: the main.py carrying our port
  const ps = sh("ps", ["-eo", "pid,args"]);
  for (const line of ps.out.split("\n")) {
    if (line.includes("main.py") && line.includes("--port " + PORT)) {
      return line.trim().split(/\s+/)[0];
    }
  }
  return "";
}

function cmdStatus() {
  if (!alive()) { console.log("DOWN " + URL); process.exit(1); }
  const depth = queueDepth();
  const pid = occupantPid();
  const stats = sh("curl", ["-sf", "-m", "5", URL + "/system_stats"]);
  let ver = "?";
  try { const j = JSON.parse(stats.out); ver = j.system?.comfyui_version ?? j.comfyui_version ?? "?"; } catch { /* keep ? */ }
  console.log("UP   " + URL + " (comfyui " + ver + ", queue depth " + String(depth) + (pid !== "" ? ", pid " + pid : "") + ")");
}

async function cmdUp() {
  if (alive()) { console.log("comfy-engine: already up —"); cmdStatus(); process.exit(0); }
  let boot = cfgRead("boot_cmd");
  if (boot === "") { console.error("comfy-engine: no boot_cmd in " + CFG); process.exit(2); }
  boot = boot.replaceAll("<repo>", REPO);
  // the boot_cmd's shape is `cd <dir> && <command>` (the config's own law)
  const m = boot.match(/^cd\s+(\S+)\s*&&\s*(.*)$/);
  if (m === null) { console.error("comfy-engine: boot_cmd is not `cd <dir> && <command>`: " + boot); process.exit(2); }
  const dir = m[1], cmd = m[2];
  if (!existsSync(dir)) { console.error("comfy-engine: boot dir missing: " + dir); process.exit(2); }
  mkdirSync(dirname(PIDFILE), { recursive: true });
  console.log("comfy-engine: spawning in " + dir);
  // detached spawn (the setsid equivalent): the pidfile owns the child
  const child = spawn(cmd, { cwd: dir, detached: true, shell: true,
    stdio: ["ignore", "pipe", "pipe"] });
  const logStream = createWriteStream(join(dir, "engine.log"), { flags: "a" });
  child.stdout.pipe(logStream); child.stderr.pipe(logStream);
  child.unref();
  writeFileSync(PIDFILE, String(child.pid));
  console.log("comfy-engine: pid " + String(child.pid) + " — waiting for /system_stats (up to 180s)");
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    if (alive()) { console.log("comfy-engine:"); cmdStatus(); process.exit(0); }
  }
  console.error("comfy-engine: engine did not answer in 180s — see " + join(dir, "engine.log"));
  process.exit(1);
}

async function cmdDown() {
  const force = process.argv[3] ?? "";
  const depth = queueDepth();
  if (depth !== 0 && force !== "--force") {
    console.error("comfy-engine: REFUSING — queue depth " + String(depth) + " (someone's render). down --force to kill it.");
    process.exit(3);
  }
  const pid = occupantPid();
  if (pid === "") {
    console.log("comfy-engine: nothing to kill (down at " + URL + ", no occupant)");
    rmSync(PIDFILE, { force: true });
    process.exit(0);
  }
  console.log("comfy-engine: SIGTERM " + pid);
  try { process.kill(Number(pid), "SIGTERM"); } catch { /* already gone */ }
  for (let i = 0; i < 15; i++) {
    try { process.kill(Number(pid), 0); } catch { break; }
    await new Promise((r) => setTimeout(r, 1000));
  }
  try {
    process.kill(Number(pid), 0);
    console.log("comfy-engine: SIGKILL " + pid);
    try { process.kill(Number(pid), "SIGKILL"); } catch { /* raced away */ }
  } catch { /* exited after SIGTERM */ }
  rmSync(PIDFILE, { force: true });
  console.log("comfy-engine: down");
}

const cmd = process.argv[2] ?? "status";
if (cmd === "status") { cmdStatus(); }
else if (cmd === "up") { await cmdUp(); }
else if (cmd === "down") { await cmdDown(); }
else { console.error("usage: comfy-engine.mjs [status|up|down [--force]]"); process.exit(2); }
