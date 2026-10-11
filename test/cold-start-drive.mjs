#!/usr/bin/env node
// cold-start-drive.mjs — F7: the PUBLIC QUICKSTART, replicable, one
// command (operator 2026-10-18): "the LLM driver has all the stuff it
// needs to literally set it all up and make content from a state of
// no comfyui-extensions installed and no models downloaded" — and the
// consumer installs EXACTLY THE WAY NORMAL DSH SESSIONS WORK: the
// estate profile's @melite/* dependencies come from a REGISTRY (the
// committed fake, tools/local-npm-registry.mjs), the way production
// will install from npmjs after the GO.
//
//   node test/cold-start-drive.mjs
//
// The walk (every phase logged; every root scratch; the live estate,
// ~/.dsh, and :8188 are never touched):
//
//   P1 fake npm registry up (state under the scratch root)
//   P2 the gated release bytes: gh release download <tag> — the same
//      tarballs the mint verified (98 @melite packages + manifest +
//      order; the SSPL/LICENSE gate already rode them)
//   P3 publish-npm --registry -> the gated set lands in the fake,
//      sha256-verified against the release manifest, dep-ordered
//   P4 the engine leg (the engine is not an npm package — ComfyUI
//      provisions from a clone): shallow clone, pnpm install,
//      overlay seats :8288 + an EMPTY model store, provision
//      paths+sync (NO extensions leg — cold means custom_nodes empty
//      too), boot, /system_stats gate, census-before = 0/0
//   P5 THE CONSUMER INSTALL, normal-DSH shape: DSH_HOME/profiles/
//      estate carries the SAME profile the provisioner materializes
//      (bundles, hoisted linker, headless cordis.patch.yml) but with
//      REGISTRY SPECS — @melite/harness-tools@<version> resolved by
//      .npmrc's per-scope redirect to the fake; @deepseek-ai bundles
//      keep coming from the real npm. pnpm install does the rest.
//   P6 spawn `dsh --profile estate` headless, driver route
//      opencode-go/muse-spark-1.3-contributor (the operator's seated
//      default), engine + store seated by the P4 overlay pins (the
//      endpoint json's url/model bases + inference.local.json's
//      models roots) anchored through MELITE_REPO_ROOT — the
//      MELITE_MODELS_STORE_ROOT / MELITE_STATE_ROOT env vars are
//      dead letters (zero readers; kept for log parity only)
//   P7 TURN 1, full reign: the AGENT sets itself up — discover ->
//      load -> construct -> comfy_manage install_extension +
//      acquire_weight (the operator's F9 product call)
//   P8 THE USER'S PRESS: the harness (playing the person) reads the
//      bench draft and presses run — never the agent's (AGENT MODE)
//   P9 settle-poll to terminal; assert artifact bytes, the weight on
//      disk, the extension in custom_nodes
//
// Exit 0 = clone-to-content cold walk proven against the registry.
//
// Knobs: COLD_DRIVE_TAG (default: latest prerelease), COLD_DRIVE_ROOT,
// COLD_DRIVE_ORIGIN, COLD_DRIVE_REF, COLD_DRIVE_ROUTE,
// COLD_DRIVE_PORT_REG / COLD_DRIVE_PORT_ENGINE (defaults 4873/8288 —
// set them when a sibling drive's seats hold the defaults; both legs
// refuse loud when the port answers from a foreign pid),
// COLD_DRIVE_CREDENTIALS (default ~/.dsh/.credentials.yaml — copied
// into the scratch home, never printed, never hardcoded).

import { spawn, spawnSync } from "node:child_process";
import {
  appendFileSync, chmodSync, copyFileSync, existsSync, mkdirSync,
  mkdtempSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const PORT_REG = Number(process.env["COLD_DRIVE_PORT_REG"] ?? 4873);
const PORT_ENGINE = Number(process.env["COLD_DRIVE_PORT_ENGINE"] ?? 8288);
const REGISTRY = "http://127.0.0.1:" + PORT_REG;
const ROOT = process.env["COLD_DRIVE_ROOT"] ||
  mkdtempSync(join(tmpdir(), "melite-cold-"));
const REPO = join(ROOT, "repo");
const STORE = join(ROOT, "models");
const DSH_HOME = join(ROOT, "dsh-home");
const STATE = join(ROOT, "state");
const SET = join(ROOT, "set");
const DRIVE_KEY = process.env["COLD_DRIVE_CREDENTIALS"] ||
  join(process.env["HOME"] ?? "/", ".dsh", ".credentials.yaml");
const AGENT_ROUTE = process.env["COLD_DRIVE_ROUTE"] ??
  "opencode-go/muse-spark-1.3-contributor";
const ORIGIN = process.env["COLD_DRIVE_ORIGIN"] ||
  (spawnSync("git", ["remote", "get-url", "origin"], { encoding: "utf8" }).stdout ?? "").trim() ||
  "https://github.com/JayDataEngineer/melite.git";
const REF_ENV = process.env["COLD_DRIVE_REF"];
const REF = REF_ENV ?? "cordis";
// THE 3D VARIANTS (2026-10-11, the autonomy commission): three knobs
// beyond the original cold walk.
// COLD_DRIVE_LOCAL=1 — pack the set from a fresh clone of THIS tree
// (committed HEAD only, isolated from any co-editor's uncommitted
// work) instead of downloading a gh release; the engine leg reuses
// the same clone. For drives that must exercise UNRELEASED flows.
// COLD_DRIVE_WARM=1 — reuse a preserved ROOT's model store (weights
// stay, no re-download), but wipe the fake registry and the consumer
// profile's node_modules so the (possibly same-version) packed bytes
// actually reach the estate. Census-before logs the warm state
// instead of failing.
// COLD_DRIVE_SCENARIO=image|object — the content scenario: "image"
// (default) is the proven sailboat; "object" drives the object-forge
// flow (prompt -> z-image concept -> trellis2-native lift -> quad
// remesh) through the {flow:} door and verifies .glb artifacts.
const LOCAL_MODE = process.env["COLD_DRIVE_LOCAL"] === "1";
const WARM_MODE = process.env["COLD_DRIVE_WARM"] === "1";
const SCENARIO = process.env["COLD_DRIVE_SCENARIO"] ?? "image";

// PATH SELF-HEAL (IaC, operator 2026-10-07: "next time we run this in
// the future, it should just work"): the drive must not depend on the
// launching shell's exports. pnpm is system-installed at
// /usr/local/bin on this machine; a fresh box that only carries the
// per-user standalone still works through these prepends.
const CHILD_PATH = [
  join(process.env["HOME"] ?? "/", ".local", "share", "pnpm"),
  join(process.env["HOME"] ?? "/", ".local", "bin"),
  process.env["PATH"] ?? "",
].join(":");
const childEnv = (extra = {}) => ({ ...process.env, PATH: CHILD_PATH, ...extra });

for (const d of [STORE, STATE, DSH_HOME, SET]) mkdirSync(d, { recursive: true });
// SELF-TIMING (2026-10-18, the operator's "taking forever to
// publish"): every log line carries drive-elapsed seconds and every
// finished leg its own wall time — a stall names its phase in-log
// (the silent legs are provision sync's torch stack and the weight
// pull, never the publish loop) instead of reading as a hang.
const tDrive0 = Date.now();
const driveSecs = (t) => ((Date.now() - t) / 1000).toFixed(1) + "s";
const logPath = join(ROOT, "drive.log");
const log = (line) => { const stamped = `[+${driveSecs(tDrive0)}] ${line}`; console.log(stamped); appendFileSync(logPath, stamped + "\n"); };
// WARM-MODE WIPES (the same-version trap): a preserved registry would
// answer "already published" for the packed version and the profile's
// hoisted node_modules would satisfy pnpm without re-fetching — the
// estate would then serve the OLD bytes and the drive would prove
// nothing about the current tree. The store alone is kept: weights
// are the expensive part and content-identical.
if (WARM_MODE) {
  for (const p of [join(ROOT, "registry"), join(DSH_HOME, "profiles", "estate", "node_modules"),
    join(DSH_HOME, "profiles", "estate", "pnpm-lock.yaml"), join(ROOT, "pnpm-cache")]) {
    rmSync(p, { recursive: true, force: true });
  }
  log("warm mode: registry + consumer node_modules + pnpm-cache wiped, model store preserved (" +
    Math.round(parseInt(spawnSync("du", ["-sb", STORE], { encoding: "utf8" }).stdout ?? "0", 10) / 1073741824) + "G)");
}
// LOCAL-MODE SET WIPE: a preserved set holds the last release's
// tarballs; packing alongside them would publish both and the
// harness-tools VERSION regex could match the stale one first.
if (LOCAL_MODE) {
  for (const f of (() => { try { return readdirSync(SET); } catch { return []; } })()) {
    rmSync(join(SET, f), { recursive: true, force: true });
  }
}
const readdirSafe = (p) => { try { return readdirSync(p); } catch { return []; } };
const procs = [];
const run = (argv, opts = {}, timeoutMs = 900000) => {
  // maxBuffer 64MB: pnpm's unicode dependency tree on a 98-package
  // closure dwarfs spawnSync's 1MB default (the ENOBUFS kill)
  const tLeg = Date.now();
  const r = spawnSync(argv[0], argv.slice(1), { encoding: "utf8", timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024, ...opts });
  appendFileSync(logPath, `\n$ ${argv.join(" ")}\n${r.stdout ?? ""}${r.stderr ?? ""}` +
    (r.error ? `\n[spawn error: ${r.error.message}]` : "") + `\n[exit ${r.status}, ${driveSecs(tLeg)}]\n`);
  return r;
};
const fail = (msg) => {
  log("COLD-START DRIVE: FAIL — " + msg);
  log("everything preserved under " + ROOT + " (full log: " + logPath + ")");
  for (const p of procs) { try { p.kill("SIGTERM"); } catch { /* already gone */ } }
  process.exit(1);
};
const spawnBg = (argv, opts = {}) => {
  const p = spawn(argv[0], argv.slice(1), { detached: true, stdio: "ignore", ...opts });
  procs.push(p);
  return p;
};

/** The pids owning a listening port — EVERY ss line matching the
 *  port, not just the first, and null for any line whose pid is
 *  unreadable (another user's socket) — per ss. A health probe
 *  cannot distinguish this drive's child from a foreign listener
 *  on the same port (the 2026-10-10 fire: a sibling drive's
 *  registry answered P1's probe, then its restart window ate P3's
 *  publish with ECONNREFUSED). Both legs assert ownership after
 *  the probe. The engine leg's equality rides the bash boot
 *  wrapper tail-exec'ing into python (drive-8b: asserted pid
 *  402743 = the ss python pid on a healthy PASS); a bash that
 *  forked-and-waited would fail loud every fire — accepted,
 *  fail-loud is the safe direction. */
function portOwnerPids(port) {
  const r = spawnSync("ss", ["-ltnp"], { encoding: "utf8" });
  const lines = (r.stdout ?? "").split("\n").filter((l) => l.includes(":" + port + " "));
  if (lines.length === 0) return [];
  const pids = [];
  for (const line of lines) {
    const m = line.match(/pid=(\d+)/);
    if (!m) return [null]; // readable only by root or the owner — unreadable ownership refuses
    pids.push(Number(m[1]));
  }
  return pids;
}

log("cold-start drive root: " + ROOT);

// P1 — the fake npm registry (committed tool; state persists on disk)
const regRoot = join(ROOT, "registry");
const registryLog = join(ROOT, "registry.log");
const registryProc = spawnBg(["node", join(process.cwd(), "tools/local-npm-registry.mjs"),
  "--port", String(PORT_REG), "--root", regRoot], {
  stdio: ["ignore", openSync(registryLog, "a"), openSync(registryLog, "a")],
});
const tReg = Date.now();
let regUp = false;
while (Date.now() - tReg < 30000) {
  const probe = spawnSync("curl", ["-s", REGISTRY + "/-/ping"], { encoding: "utf8" });
  if (probe.stdout?.includes('"ok"')) { regUp = true; break; }
  await new Promise((r) => setTimeout(r, 500));
}
if (!regUp) fail("fake registry never answered on :" + PORT_REG);
const regOwners = portOwnerPids(PORT_REG);
if (!(regOwners.length > 0 && regOwners.every((p) => p === registryProc.pid))) {
  fail(`port ${PORT_REG} answers from pid ${regOwners.join("/")}, not this drive's registry (pid ${registryProc.pid}) — a foreign listener holds the port; re-fire with COLD_DRIVE_PORT_REG set to a free port (never kill the foreign seat)`);
}
log("P1 fake npm registry up: " + REGISTRY + " (state: " + regRoot + ")");

// P2 — the gated release bytes (what the mint verified is what ships),
// or — COLD_DRIVE_LOCAL=1 — the current tree packed from a fresh
// clone (unreleased flows reach the drive; the clone isolates the
// pack from any co-editor's uncommitted worktree).
let VERSION;
if (LOCAL_MODE) {
  if (existsSync(REPO)) rmSync(REPO, { recursive: true, force: true });
  const cloneL = run(["git", "clone", "--depth", "1", "file://" + process.cwd(), REPO]);
  if (cloneL.status !== 0) fail("local clone failed: " + (cloneL.stderr ?? "").slice(-400));
  log("P2 local clone at " + run(["git", "-C", REPO, "log", "--oneline", "-1"]).stdout.trim());
  // The clone has no node_modules — build-plane's tsc/esbuild need
  // them; the shared pnpm store makes this fast on a warm machine.
  const instL = run(["pnpm", "install", "--frozen-lockfile"], { cwd: REPO, env: childEnv() }, 1_800_000);
  if (instL.status !== 0) fail("local clone install failed: " + ((instL.error?.message ?? "") + (instL.stderr ?? "")).slice(-500));
  // G1 law (the mint's own order): built lib/, never source.
  const buildL = run(["node", "tools/build-plane.mjs", "build"], { cwd: REPO, env: childEnv() }, 1_800_000);
  if (buildL.status !== 0) fail("local build-plane failed: " + ((buildL.error?.message ?? "") + (buildL.stderr ?? "")).slice(-500));
  const packL = run(["pnpm", "-r", "pack", "--pack-destination", SET], { cwd: REPO, env: childEnv() }, 1_800_000);
  if (packL.status !== 0) fail("local pack failed: " + ((packL.error?.message ?? "") + (packL.stderr ?? "")).slice(-500));
  // THE MINT'S OWN PASSES, IN THE MINT'S OWN ORDER (tools/release-artifacts.mjs
  // :477/:486): workspace tarballs pack with `private: true` verbatim —
  // npm publish refuses them (EPRIVATE). The vendor tier (non melite-*
  // names) leaves FIRST — their upstream licenses are not ours to
  // rewrite, so they must never reach the strip gate — then the strip
  // (private drop + publishConfig + license gate) runs on what ships.
  const strip = await import(pathToFileURL(join(REPO, "tools", "release-artifacts.mjs")));
  const packed = readdirSync(SET).filter((f) => f.endsWith(".tgz")).map((f) => join(SET, f));
  const ship = strip.publishableTarballs(packed);
  strip.stripPackedTarballs(ship);
  const tgzs = ship.map((p) => p.split("/").pop());
  // Manifest synthesis — publish-npm consumes only file+sha256 (the
  // order derives by its dependency walk when order.txt is absent).
  const sha = (f) => spawnSync("sha256sum", [join(SET, f)], { encoding: "utf8" }).stdout.split(/\s/)[0];
  writeFileSync(join(SET, "release-manifest.json"), JSON.stringify({
    packages: tgzs.map((f) => ({ file: f, sha256: sha(f) })),
  }, null, 2) + "\n");
  log(`P2 local pack: ${packed.length} packed -> ${tgzs.length} publishable (vendor tier stays out)`);
  VERSION = /-(\d+\.\d+\.\d+(?:-[-0-9A-Za-z.]+)*)\.tgz$/.exec(
    readdirSync(SET).find((f) => /^melite-harness-tools-/.test(f)) ?? "")?.[1];
  if (!VERSION) fail("harness-tools tarball missing from the local set — cannot pin the profile");
  log("P2 local set: " + tgzs.length + " tarballs, version " + VERSION);
} else {
const tag = process.env["COLD_DRIVE_TAG"] ||
  (spawnSync("gh", ["release", "list", "--limit", "10", "--json", "tagName,isPrerelease", "-q",
    "[.[] | select(.isPrerelease)] | .[0].tagName"], { encoding: "utf8" }).stdout ?? "").trim();
if (!tag || !/^v/.test(tag)) fail("no prerelease tag resolvable (gh release list)");
// THE TAG PIN (run-4 lesson, drive 2026-10-11): the clone must be the
// tree the registry was built from — the release tag, never branch
// HEAD. HEAD drifts ahead of the release (flux-klein landed post-tag;
// its model-facts row named a family the 98-set never shipped and the
// cold estate refused "unknown model 'flux-klein'" at boot AND at the
// P8 press). COLD_DRIVE_REF stays as an explicit override.
const REF = REF_ENV || tag;
const dl = run(["gh", "release", "download", tag, "--dir", SET, "--clobber"]);
if (dl.status !== 0) fail("gh release download " + tag + " failed: " + (dl.stderr ?? "").slice(-400));
const tgzCount = readdirSync(SET).filter((f) => f.endsWith(".tgz")).length;
if (tgzCount < 90) fail("release set incomplete: " + tgzCount + " tarballs (expected 98)");
VERSION = /-(\d+\.\d+\.\d+(?:-[-0-9A-Za-z.]+)*)\.tgz$/.exec(
  readdirSync(SET).find((f) => /^melite-harness-tools-/.test(f)) ?? "")?.[1];
if (!VERSION) fail("harness-tools tarball missing from the set — cannot pin the profile");
log("P2 release " + tag + ": " + tgzCount + " tarballs, version " + VERSION);
}

// P3 — publish the gated set into the fake (sha256-verified, ordered).
// Auth rides a .npmrc NEXT TO the bytes: scope-pinned registry +
// bearer for that host — the same file shape a consumer machine
// writes for a private registry.
// the minted set carries TWO scopes — @melite plus the rescoped
// vendor plane @melite-plugin — both redirect to the fake; upstream
// @deepseek-ai bundles keep coming from the real npm (the census
// over the set's inner manifests names exactly these two)
writeFileSync(join(SET, ".npmrc"),
  "@melite:registry=" + REGISTRY + "\n" +
  "@melite-plugin:registry=" + REGISTRY + "\n" +
  "//127.0.0.1:" + PORT_REG + "/:_authToken=cold-drive-local\n" +
  "always-auth=true\n");
const pub = run(["node", "tools/publish-npm.mjs", "--from", SET, "--registry", REGISTRY],
  // env-form userconfig: npm ignores project-level .npmrc for auth,
  // but honors the file named here — same file, lawful door (proven
  // in the registry smoke: publish lands, zero errors)
  { cwd: process.cwd(), env: { ...process.env, npm_config_userconfig: join(SET, ".npmrc") } },
  1_800_000);
if (pub.status !== 0) fail("publish into the fake registry failed: " + (pub.stderr ?? pub.stdout ?? "").slice(-500));
log("P3 gated set published into the fake: " + (pub.stdout ?? "").trim().split("\n").pop());

// P4 — the engine leg (ComfyUI provisions from a clone; the session
// leg P5 never uses this clone — it installs from the registry)
// STALE-CLONE SELF-HEAL: a reused ROOT carries the previous run's
// clone — git clone refuses a dirty target, and a kept clone could
// silently pin the wrong ref. The clone is regenerable; the weight
// store next to it is not.
if (LOCAL_MODE) {
  log("P4 engine leg reuses the P2 local clone (" + REPO + ")");
} else {
  if (existsSync(REPO)) rmSync(REPO, { recursive: true, force: true });
  const clone = run(["git", "clone", "--depth", "1", "-b", REF, ORIGIN, REPO]);
  if (clone.status !== 0) fail("clone failed: " + (clone.stderr ?? "").slice(-400));
}
const inst = run(["pnpm", "install"], { cwd: REPO, env: childEnv() });
if (inst.status !== 0) {
  fail("pnpm install (engine clone) failed: " + ((inst.error?.message ?? "") + " " + (inst.stderr ?? "")).slice(-400));
}
mkdirSync(join(REPO, "data"), { recursive: true });
// THE STORE-PIN OVERLAY (live-fire drive-5, the split-brain cure):
// the provisioner DOWNLOADS to MELITE_MODELS_STORE_ROOT (env), but
// the lane-PRESENCE read (catalog.ts rootModelsReadRoot) derives its
// store from models.read_root in the merged root config — the env
// seam is not on the read path. Without this overlay the read side
// resolves REPO/data/models/image-gen/comfyui (the tracked default),
// never sees a single downloaded byte, and melite_construct validate
// refuses "no store copy exists" forever while the weights sit in
// the drive store (proven: encoder landed 15:36, refusals still
// firing at 16:01). The overlay is the machine statement — pin BOTH
// legs to the same root.
writeFileSync(join(REPO, "data", "inference.local.json"), JSON.stringify({
  engines: { comfyui: {
    url: "http://127.0.0.1:" + PORT_ENGINE,
    model_base_path: STORE,
    model_download_path: STORE,
  } },
  models: { read_root: STORE, download_root: STORE },
}, null, 2) + "\n");
// THE ENDPOINT PIN: the manage plane's probe reads the endpoint
// CONFIG's url (probeEndpoint → mctx.endpoint()), not COMFYUI_URL —
// and with MELITE_REPO_ROOT pinned to the clone, the config file
// the estate reads is the clone's tracked default (:8188). Point
// it at this drive's engine port or the status door reports down.
// model_base_path rides the same pin (the endpoint machine statement
// always wins over root inheritance on the presence mount leg).
{
  const ep = join(REPO, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json");
  const cfg = JSON.parse(readFileSync(ep, "utf8"));
  cfg["url"] = "http://127.0.0.1:" + PORT_ENGINE;
  cfg["model_base_path"] = STORE;
  cfg["model_download_path"] = STORE;
  writeFileSync(ep, JSON.stringify(cfg, null, 2) + "\n");
}
// OVERLAY READ-BACK (audit drive-P6): the pins ARE the store seat —
// an env var seats nothing — so both legs are verified on disk before
// the ~50-minute setup turn runs on them. A regression wiping one leg
// used to surface only as a P8 lane-presence refusal (or worse, rode
// the catalog's fallback silently).
{
  const overlay = JSON.parse(readFileSync(join(REPO, "data", "inference.local.json"), "utf8"));
  const epCfg = JSON.parse(readFileSync(join(REPO, "packages", "engines", "comfyui-cordis", "data", "comfyui_endpoint.json"), "utf8"));
  const modelsRoot = overlay?.models?.read_root;
  const dlRoot = overlay?.models?.download_root;
  const epUrl = epCfg?.url;
  const epBase = epCfg?.model_base_path;
  if (modelsRoot !== STORE || dlRoot !== STORE) {
    fail("overlay store pins lost (read_root=" + modelsRoot + " download_root=" + dlRoot + " want " + STORE + ") — split-brain would ride the fallback");
  }
  if (epUrl !== "http://127.0.0.1:" + PORT_ENGINE || epBase !== STORE || epCfg?.model_download_path !== STORE) {
    fail("endpoint pin lost (url=" + epUrl + " base=" + epBase + " want http://127.0.0.1:" + PORT_ENGINE + " / " + STORE + ")");
  }
  log("P4 overlay read-back: both pin legs verified on disk (models.root+download → STORE, endpoint url+bases → this drive)");
}
// init-store lays the empty model store a fresh clone lacks (paths
// refuses dead roots BY LAW — the bootstrap mount is this leg, never
// a silent mkdir inside paths). sync lands the pinned engine core
// BEFORE paths: the core checkout refuses the untracked runtime
// model dirs paths lays (pointers), so a cold tree syncs first.
for (const leg of ["init-store", "sync", "paths"]) {
  const r = run(["pnpm", "run", "provision", "--", leg], { cwd: REPO, env: childEnv() }, 1_800_000);
  if (r.status !== 0) {
    fail("provision " + leg + " failed: " + ((r.error?.message ?? "") + " " + (r.stderr ?? "")).slice(-500));
  }
}
const bootCmdOut = run(["pnpm", "run", "provision", "--", "boot-cmd"], { cwd: REPO, env: childEnv() });
if (bootCmdOut.status !== 0) fail("boot-cmd failed: " + (bootCmdOut.stderr ?? "").slice(-400));
const bootCmd = bootCmdOut.stdout.trim().split("\n").filter(Boolean).pop()
  .replaceAll("--port 8188", "--port " + PORT_ENGINE);
if (!/main\.py/.test(bootCmd)) fail("boot-cmd did not name the engine entry: " + bootCmd);
const engine = spawnBg(["bash", "-c", bootCmd], { cwd: REPO });
const tBoot = Date.now();
let booted = false;
while (Date.now() - tBoot < 240000) {
  const probe = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}",
    "http://127.0.0.1:" + PORT_ENGINE + "/system_stats"], { encoding: "utf8" });
  if (probe.stdout === "200") { booted = true; break; }
  await new Promise((r) => setTimeout(r, 2000));
}
if (!booted) fail("engine never answered on :" + PORT_ENGINE);
const engineOwners = portOwnerPids(PORT_ENGINE);
if (!(engineOwners.length > 0 && engineOwners.every((p) => p === engine.pid))) {
  fail(`port ${PORT_ENGINE} answers from pid ${engineOwners.join("/")}, not this drive's engine (pid ${engine.pid}) — a foreign engine holds the port; re-fire with COLD_DRIVE_PORT_ENGINE set to a free port (the live estate's :8188 and any sibling seat are never touched)`);
}
log("P4 cold engine booted on :" + PORT_ENGINE + " (pid " + engine.pid + ")");

// census-before: the cold state asserted, not assumed
const weightFiles = () => {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(safetensors|ckpt|pt|gguf|bin|npz)$/i.test(e.name)) out.push(p);
    }
  };
  if (existsSync(STORE)) walk(STORE);
  return out;
};
const nodesDir = () => {
  const d = join(REPO, "data", "runtime", "comfyui", "custom_nodes");
  return existsSync(d) ? readdirSync(d) : [];
};
// the engine core's own stock entries (the manager rides sync; the
// example files ship with core; __pycache__ is runtime dirt) — COLD
// means no ESTATE-installed extension beyond this baseline
const STOCK_NODES = new Set(["__pycache__", "comfyui-manager",
  "example_node.py.example", "websocket_image_save.py"]);
const estateNodes = () => nodesDir().filter((n) => !STOCK_NODES.has(n));
if (WARM_MODE) {
  log("census-before (WARM): " + weightFiles().length + " weight file(s), custom_nodes estate entries: " +
    estateNodes().length + " — a preserved store is the point of warm mode; the estate-extension check still holds");
  if (estateNodes().length !== 0) fail("custom_nodes is not cold: " + estateNodes().join(", ") + " beyond the core baseline");
} else {
  if (weightFiles().length !== 0) fail("model store is not cold: " + weightFiles().length + " weights already present");
  if (estateNodes().length !== 0) fail("custom_nodes is not cold: " + estateNodes().join(", ") + " beyond the core baseline");
  log("census-before: 0 weights, 0 estate extensions (core baseline only) — the cold state holds");
}

// P5 — THE CONSUMER INSTALL (normal-DSH shape, registry specs). This
// mirrors provision-dsh materializeProfile EXACTLY (bundles, hoisted
// linker, the headless cordis.patch.yml) with one difference that IS
// the point: @melite deps are registry specs, resolved from the fake
// via .npmrc's per-scope redirect — the way a real consumer installs
// from npmjs on the day of the GO.
if (!existsSync(DRIVE_KEY)) fail("driver credentials not found at " + DRIVE_KEY);
copyFileSync(DRIVE_KEY, join(DSH_HOME, ".credentials.yaml"));
chmodSync(join(DSH_HOME, ".credentials.yaml"), 0o600);
// settings.yaml wires the LLM provider (the opencode-go adapter
// registers on settings arrival — the probe18 law); a home without
// it dead-spins initialize forever. Copied, never printed — same
// key-material law as the credentials file.
const DRIVE_SETTINGS = join(homedir(), ".dsh", "settings.yaml");
if (existsSync(DRIVE_SETTINGS)) {
  copyFileSync(DRIVE_SETTINGS, join(DSH_HOME, "settings.yaml"));
  chmodSync(join(DSH_HOME, "settings.yaml"), 0o600);
}
// HOME-LEVEL LOCAL PATCH (provision dsh's own layer: "provider/model
// overrides… belong here") — the llm-pi-ai row that seats the
// opencode-go adapter. Mirrored row-for-row from the live web
// profile's cordis.patch.yml (muse-spark rides the /responses
// protocol; the browser UA is mandatory — Cloudflare 1010s a
// non-browser UA before auth). The key rides the credentials store
// (apiKeyEnv OPENCODE_API_KEY, present in .credentials.yaml).
writeFileSync(join(DSH_HOME, "cordis.patch.yml"),
  "# harness-home local patch — GENERATED by the cold-start drive\n" +
  "# (the layer provision dsh hands the operator for provider rows).\n" +
  "- id: llm-pi-ai\n" +
  "  config:\n" +
  "    providers:\n" +
  "      opencode-go:\n" +
  "        apiKeyEnv: OPENCODE_API_KEY\n" +
  "        api: openai-responses\n" +
  "        baseURL: https://opencode.ai/zen/go/v1\n" +
  "        reasoning: xhigh\n" +
  "        retryPolicy:\n" +
  "          mode: normal\n" +
  "          maxRetries: 15\n" +
  "          retryableCodes: [EMPTY_RESPONSE, RATE_LIMIT, SERVER, TIMEOUT, TRANSPORT, PI_AI_ERROR]\n" +
  "          backoff: {initialDelayMs: 300, maxDelayMs: 5000, jitterRatio: 0.3}\n" +
  "        headers:\n" +
  "          User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36\n" +
  "          x-opencode-session: estate-job-server\n" +
  "        models:\n" +
  "          - id: muse-spark-1.3-contributor\n" +
  "            name: Muse Spark 1.3 (Contributor)\n" +
  "            contextWindow: 200000\n" +
  "            input:\n" +
  "              - text\n" +
  "              - image\n" +
  "            reasoningEfforts:\n" +
  '              "off": null\n' +
  "              minimal: minimal\n" +
  "              low: low\n" +
  "              medium: medium\n" +
  "              high: high\n" +
  "              xhigh: xhigh\n" +
  "              max: max\n" +
  "      # THE ZAI CODING-PLAN SEAT (route zai/glm-5.3-flash, the 2026-10-10\n" +
  "      # cold-start commission): first-class adapter — no baseURL/api row,\n" +
  "      # shape copied verbatim from the seated headless profile's row.\n" +
  "      # Carried unconditionally so the COLD_DRIVE_ROUTE knob picks it up;\n" +
  "      # the key rides the credentials refs (apiKeyEnv), same store as\n" +
  "      # OPENCODE's.\n" +
  "      zai:\n" +
  "        apiKeyEnv: ZAI_API_KEY\n" +
  "        retryPolicy:\n" +
  "          mode: normal\n" +
  "          maxRetries: 30\n" +
  "          retryableCodes: [EMPTY_RESPONSE, RATE_LIMIT, SERVER, TIMEOUT, TRANSPORT, PI_AI_ERROR]\n" +
  "          backoff: {initialDelayMs: 300, maxDelayMs: 5000, jitterRatio: 0.3}\n" +
  "        models:\n" +
  "          - id: glm-5.3-flash\n" +
  "            name: GLM-5.3 Flash (Coding Plan)\n" +
  "            contextWindow: 200000\n" +
  "            maxTokens: 32768\n" +
  "            input:\n" +
  "              - text\n" +
  "              - image\n" +
  "            reasoningEfforts:\n" +
  "              low: low\n" +
  "              high: high\n" +
  "              max: max\n" +
  "              xhigh: max\n");
const prof = join(DSH_HOME, "profiles", "estate");
mkdirSync(prof, { recursive: true });
writeFileSync(join(DSH_HOME, ".gitignore"), "*\n");
// the @deepseek-ai bundle rows are DIRECT dependencies pinned at the
// SEATED dsh runtime's version — the live profile's own shape: left
// floating, the @melite packages' rc.1 transitive pins win the
// hoist, dsh's version police disables the rows (tools, subprocess,
// settings…) and the estate dead-boots waiting on missing services
const dshVersion = (run(["dsh", "--version"]).stdout ?? "").trim().split("\n")[0]?.replace(/^dsh\s+/i, "") ?? "";
if (!/^\d+\.\d+\./.test(dshVersion)) fail("dsh --version did not answer a version (got '" + dshVersion + "')");
// FLAT-RESOLUTION LAW (live-fire 2026-10-07): the melite set's
// cross-deps otherwise nest a second @melite/comfyui-cordis inside
// @melite/estate-queue — its module-anchored resolveRepoRoot() then
// names the estate-queue dir as the repo root and every disclose/
// construct/endpoint read refuses. One override row per published
// @melite name forces the single hoisted copy; MELITE_REPO_ROOT on
// the spawn stays the primary seam, this removes the broken fallback.
const meliteNames = readdirSync(SET).filter((f) => f.endsWith(".tgz"))
  .map((f) => /^melite-(.+)-\d+\.\d+\.\d/.exec(f)?.[1])
  .filter((n) => n !== undefined && !n.startsWith("plugin-"))
  .map((n) => "@melite/" + n);
const overrides = Object.fromEntries(meliteNames.map((n) => [n, VERSION]));
writeFileSync(join(prof, "package.json"), JSON.stringify({
  name: "dsh-profile-estate",
  private: true,
  dependencies: {
    "@deepseek-ai/dsh-base": dshVersion,
    "@deepseek-ai/dsh-sdk-app": dshVersion,
    "@melite/harness-provisioner": VERSION,
    "@melite/harness-tools": VERSION,
    // the estate SEATS bundle — its melite-estate row mounts the
    // disclose/load/runs/skills/queue/manage seats in-process;
    // without the row every estate door refuses (lane absence)
    "@melite-plugin/dsh-estate": VERSION,
  },
  pnpm: { overrides },
  dsh: { profile: { bundles: [
    "@deepseek-ai/dsh-base",
    "@deepseek-ai/dsh-sdk-app",
    "@melite/harness-provisioner",
    "@melite/harness-tools",
    "@melite-plugin/dsh-estate",
  ] } },
}, null, 2) + "\n");
writeFileSync(join(prof, ".npmrc"),
  "@melite:registry=" + REGISTRY + "\n" +
  "@melite-plugin:registry=" + REGISTRY + "\n" +
  "//127.0.0.1:" + PORT_REG + "/:_authToken=cold-drive-local\n" +
  "always-auth=true\n");
writeFileSync(join(prof, "pnpm-workspace.yaml"),
  "packages:\n  - .\n\nnodeLinker: hoisted\nautoInstallPeers: false\n");
writeFileSync(join(prof, "cordis.yml"),
  "# dsh profile root — an empty entry list; the tree composes from\n" +
  "# the bundles' patches. GENERATED by the cold-start drive.\n[]\n");
writeFileSync(join(prof, "cordis.patch.yml"),
  "# estate server profile patch — GENERATED by the cold-start drive\n" +
  "# (consumer mode: same rows provision-dsh materializes).\n" +
  "# INTERFACE LAW: the server mount is the HEADLESS agent —\n" +
  "# config-pinned run doors (melite_flow / run_status).\n" +
  "# THE QUEUE PIN (J12, 2026-10-19): the runs seat resolves its\n" +
  "# state root from CONFIG ONLY — the MELITE_STATE_ROOT env seam is\n" +
  "# retired (zero readers); an unpinned boot REFUSES. The pin rides\n" +
  "# the melite-estate row: its apply() resolves the roots and\n" +
  "# threads them into the queue + drafts plugins itself (index.ts\n" +
  "# :438-452) — a bare estate-queue row would be overwritten. The\n" +
  "# drive's runs tree is ROOT/state, where P9 reads the artifacts.\n" +
  "- id: melite-estate\n  config:\n    stateRoot: " + STATE + "\n" +
  "- id: melite-tools\n  config:\n    headless: true\n" +
  "- id: melite-tools-doors\n  disabled: true\n" +
  "- id: infer-card-view-host\n  disabled: true\n" +
  "- id: infer-card-view-client\n  disabled: true\n" +
  "- id: ray-card-deck\n  disabled: true\n" +
  "- id: infer-media\n  disabled: true\n" +
  "- id: infer-gallery\n  disabled: true\n");
// HERMETIC CACHE LAW: pnpm memoizes packuments under XDG_CACHE_HOME
// — a previous registry run's metadata must never answer for this
// one (the smoke proved that exact poison). The consumer install
// carries its own scratch cache; the shared store still dedupes.
const consInstall = run(["pnpm", "install"],
  { cwd: prof, env: childEnv({ XDG_CACHE_HOME: join(ROOT, "pnpm-cache") }) }, 1_800_000);
if (consInstall.status !== 0) {
  fail("CONSUMER INSTALL failed (the registry walk's own gate): " + (consInstall.stderr ?? "").slice(-800));
}
const installed = readdirSync(join(prof, "node_modules", "@melite"));
if (!installed.includes("harness-tools")) fail("@melite/harness-tools did not land in the profile");
log("P5 consumer install: @melite { " + installed.join(", ") + " } @ " + VERSION + " FROM THE FAKE REGISTRY");
// THE NESTED-@melite SWEEP (live-fire 2026-10-07, drive-2 instrumented
// probe): even with every @melite/* overridden to the exact VERSION,
// pnpm's hoisted linker nests a SECOND copy of comfyui-cordis (and
// estate-queue) inside @melite/estate-queue and @melite/harness-tools
// — per-edge placement, all same version. Each nested copy is its own
// ESM instance: the web bundle's cardRegistryProvider primes ONE
// instance's models singleton (48 families, proven by the settle
// probe's import.meta.url log) while the tools plane's manage seat
// reads ANOTHER instance whose boot stays null — acquire_weight /
// install_extension refuse "models service not booted" forever.
// Deleting the nested @melite subtrees (only @melite — @deepseek-ai
// nests are real version conflicts) collapses every import stack onto
// the single root copy: one instance, one primed table, all seats.
{
  const nmRoot = join(prof, "node_modules");
  // any @melite / @melite-plugin scope dir BELOW the root level is a
  // nest (@melite-plugin bundles can nest @melite just as @melite
  // packages nest each other); the root scopes themselves stay
  const nestScan = (post) => `find ${JSON.stringify(nmRoot)} -type d \\( -path '*/node_modules/@melite' -o -path '*/node_modules/@melite-plugin' \\) ! -path ${JSON.stringify(nmRoot + "/@melite")} ! -path ${JSON.stringify(nmRoot + "/@melite-plugin")}${post}`;
  const nested = run(["bash", "-c", nestScan("")], {}, 120_000);
  if (nested.status !== 0) fail("nested-@melite sweep could not scan: " + (nested.stderr ?? "").slice(-200));
  const dirs = (nested.stdout ?? "").split("\n").filter((l) => l.trim() !== "");
  // PRE-FLIGHT: every package in a nest must exist at the root scope —
  // deleting a nest that uniquely hosts a package (a bundle-only dep
  // pnpm left nested) would starve loadFamilies. Fail loud with the
  // names instead.
  for (const d of dirs) {
    const scope = d.endsWith("/@melite") ? "@melite" : "@melite-plugin";
    const rootScope = join(nmRoot, scope);
    for (const name of readdirSafe(d)) {
      if (!existsSync(join(rootScope, name))) {
        fail("nested-" + scope + " sweep pre-flight: " + name + " exists ONLY nested under " + d + " — hoisting is incomplete, refusing to delete");
      }
    }
  }
  for (const d of dirs) {
    const r = run(["rm", "-rf", d], {}, 120_000);
    if (r.status !== 0) fail("nested-@melite sweep failed on " + d + ": " + (r.stderr ?? "").slice(-200));
  }
  // residue check: no nested @melite scope may survive the sweep
  const residue = run(["bash", "-c", nestScan(" | head -1")], {}, 120_000);
  if ((residue.stdout ?? "").trim() !== "") fail("nested-@melite residue survived the sweep: " + residue.stdout);
  log("P5 nested-@melite sweep: " + dirs.length + " subtree(s) removed (" + dirs.map((d) => d.replace(nmRoot + "/", "") + "/…").join(", ") + ")");
}

// P6 — spawn the estate headless from the registry-installed profile
const child = spawn("dsh", ["--profile", "estate"], {
  stdio: ["pipe", "pipe", "pipe"],
  cwd: STATE,
  env: childEnv({
    DSH_HOME,
    COMFYUI_URL: "http://127.0.0.1:" + PORT_ENGINE,
    // THE SOURCE-TIER PIN: the disclosure plane (disclose/load/
    // skills), model-facts, and the endpoint config all anchor the
    // repo tree (the walk reads cards' src/card.ts — node resolution
    // starves by design). The clone IS that tree for this estate.
    MELITE_REPO_ROOT: REPO,
    // DEAD LETTER (audit drive-P6): MELITE_MODELS_STORE_ROOT and
    // MELITE_STATE_ROOT have zero readers in the tree — the store is
    // seated by the P4 overlay pins (inference.local.json + the
    // endpoint json), never by these. Passed only for log parity
    // with older fires; do not trust them to seat anything.
    MELITE_MODELS_STORE_ROOT: STORE,
    MELITE_STATE_ROOT: STATE,
    MELITE_HEADLESS: "1",
    MELITE_AGENT_ROUTE: AGENT_ROUTE,
  }),
});
procs.push(child); // every fail() path must reap the estate (an orphan keeps burning ZAI quota server-side)
let buf = "";
const frames = [];
let hostLogTail = "";
const childOutLog = join(STATE, "child-stdout.log");
const childErrLog = join(STATE, "child-stderr.log");
child.stdout.on("data", (d) => {
  appendFileSync(childOutLog, d);
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 1);
    if (line.trim()) {
      try { frames.push(JSON.parse(line)); } catch { hostLogTail = (hostLogTail + line + "\n").slice(-6000); }
    }
  }
});
let stderrTail = "";
child.stderr.on("data", (d) => { appendFileSync(childErrLog, d); stderrTail = (stderrTail + d).slice(-4000); });

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
  return id;
}
const SESSION = "cold-start-" + Date.now().toString(36);

// BOOT RACE (probe18 law): retry initialize on the transient
// no-adapter refusal — a cold lane is not a dead one.
const [provider, model] = AGENT_ROUTE.split("/");
let init;
for (let attempt = 1; ; attempt++) {
  const initId = request("initialize", { cwd: STATE, provider, model });
  const t0 = Date.now();
  while (!frames.some((f) => f.id === initId)) {
    if (Date.now() - t0 > 60000) fail("initialize timeout (host log: " + childOutLog + ")");
    await new Promise((r) => setTimeout(r, 250));
  }
  init = frames.find((f) => f.id === initId);
  if (!init.error) {
    if (attempt > 1) log("initialize ok (attempt " + attempt + " — adapter arrived mid-boot)");
    break;
  }
  if (!JSON.stringify(init.error).includes("no adapter registered")) {
    fail("initialize refused: " + JSON.stringify(init.error) + " (quota? route? host log: " + childErrLog + ")");
  }
  await new Promise((r) => setTimeout(r, 5000));
}
log("P6 estate booted from the registry install — driver " + AGENT_ROUTE);

// the session event drain (agent-drive's law, copied)
const events = [];
let idleSeen = false;
function drain() {
  for (const f of frames) {
    if (f.method === "session.status" && f.params?.sessionId === SESSION) {
      idleSeen = f.params.status === "idle";
    }
    if (f.method === "session.event" && f.params?.sessionId === SESSION &&
      !events.some((e) => JSON.stringify(e) === JSON.stringify(f.params.event))) {
      events.push(f.params.event);
    }
  }
}
function assistantTextSince(before) {
  const texts = [];
  for (const e of events.slice(before)) {
    if (e?.type !== "assistant/message") continue;
    const blocks = e?.data?.content ?? e?.data?.message?.content ?? [];
    if (Array.isArray(blocks)) {
      for (const b of blocks) if (b?.type === "text" && typeof b.text === "string") texts.push(b.text);
    }
  }
  return texts.join("\n");
}
function turnErrors() {
  const out = [];
  for (const e of events) {
    const reason = e?.type === "turn/end" ? e?.data?.reason : undefined;
    if (reason?.kind === "error") out.push(String(reason.error?.message ?? "unknown turn error"));
  }
  return out;
}
async function turn(text, timeoutMs) {
  const before = events.length;
  idleSeen = false;
  request("session/prompt", { sessionId: SESSION, contentBlocks: [{ type: "text", text }] });
  const t1 = Date.now();
  let sawIdle = false;
  while (Date.now() - t1 < timeoutMs) {
    await new Promise((r) => setTimeout(r, 500));
    drain();
    if (idleSeen) { sawIdle = true; break; }
  }
  drain();
  return { text: assistantTextSince(before), idle: sawIdle };
}
const dieOnTurnErrors = (label, t) => {
  const errs = turnErrors();
  if (errs.length > 0) {
    fail(label + " turn died — " + errs.join(" | ") +
      "\nassistant tail: " + (t.text.slice(-600) || "(none)") +
      "\nhost log: " + childOutLog);
  }
  if (!t.idle) fail(label + " turn never reached idle (host log: " + childOutLog + ")");
};

// P7 — TURN 1: full reign, cold to bench. The agent installs the
// extension and acquires the missing weight ITSELF (F9's door); it
// never presses run (AGENT MODE law). The scenario knob swaps the
// content target: the proven sailboat image, or the object-forge
// flow through its {flow:} door.
const warmWord = WARM_MODE
  ? "This estate is WARM: the model store may already hold weights (for example z-image) — " +
    "check presence and acquire ONLY what your construction still lacks. "
  : "This estate is COLD: no model weights are downloaded and no engine " +
    "extensions are installed. ";
const setup = await turn(
  SCENARIO === "object"
    ? "Set yourself up from bare metal and prepare content for me. " + warmWord +
  "You have full reign: " +
  "1) melite_discover for a FLOW that turns a text prompt into a game-ready 3D mesh " +
  "(look for the object-forge flow: prompt to concept image to mesh lift to quad remesh); " +
  "2) melite_load it; " +
  "3) melite_construct it on the bench (add_stage with card 'object-forge') with prompt " +
  "'a weathered brass diving helmet with riveted seams and a round glass porthole, " +
  "studio product shot on a neutral dark background'; " +
  "4) comfy_manage action=install_extension for every engine extension the flow's cards " +
  "require (the lift card requires comfyui-core-trellis2; the remesh card requires " +
  "melite-autoremesher-nodes); " +
  "5) comfy_manage action=acquire_weight for every model weight the flow needs " +
  "(z-image for the concept stage, trellis2-native for the lift stage). " +
  "Finish EVERY download and install YOURSELF, in THIS turn, before " +
  "you reply — never delegate a download to a subagent and reply " +
  "early (a late-landing file makes the run press refuse). " +
  "Do NOT start the run — the run press is MINE. " +
  "Reply when the bench is ready, naming the flow and the models you constructed."
    : "Set yourself up from bare metal and prepare content for me. " + warmWord +
  "You have full reign: " +
  "1) melite_discover a card for a still image; " +
  "2) melite_load it; " +
  "3) melite_construct it on the bench with prompt " +
  "'a small red sailboat on calm glass water, dawn light' — USE THE " +
  "z-image MODEL for the image (it is the small one; do NOT pick " +
  "krea-2); " +
  "4) comfy_manage action=install_extension to install the extension " +
  "named melite-utility-nodes (it will be needed later); " +
  "5) comfy_manage action=acquire_weight for every model weight the " +
  "constructed card needs (the store is empty — download them). " +
  "Finish EVERY download and install YOURSELF, in THIS turn, before " +
  "you reply — never delegate a download to a subagent and reply " +
  "early (a late-landing file makes the run press refuse). " +
  "Do NOT start the run — the run press is MINE. " +
  "Reply when the bench is ready, naming the card and model you constructed.",
  // 60 min: live-fire drive-3 boarded krea-2's 18.99GB checkpoint in
  // ~14 min, then the lane-presence validate demanded the qwen3vl
  // text encoder too — a second multi-GB acquire. 30 min starves a
  // two-weight family on a slower pipe.
  3_600_000,
);
dieOnTurnErrors("setup", setup);
log("P7 setup turn committed (" + setup.text.length + " chars); tail: " + setup.text.slice(-300).replace(/\n/g, " "));

// P8 — THE USER'S PRESS: read the bench draft the agent landed,
// press run through the headless interface (the stringify trap law).
// The queue plane creates its drafts dir lazily on first land —
// the reader tolerates the not-yet-born dir, and if the setup turn
// spent itself diagnosing the lane, ONE retry turn re-arms the
// construct now that the seats bundle mounts them.
mkdirSync(join(STATE, "output"), { recursive: true });
// BENCH-DOC LAW (live-fire 2026-10-07, drive-2): construct lands the
// bench doc at dshHomePath("storages","drafts","docs")/bench-<session>.json
// (estate-queue/src/bench.ts benchDir()) — NOT under MELITE_STATE_ROOT.
// The state root holds runs/output; the bench is a DSH storage doc.
const benchDir = join(DSH_HOME, "storages", "drafts", "docs");
mkdirSync(benchDir, { recursive: true });
const benchDrafts = () => {
  try {
    return readdirSync(benchDir)
      .map((f) => join(benchDir, f))
      .filter((p) => p.endsWith(".json"))
      .map((p) => { const st = spawnSync("stat", ["-c", "%Y", p], { encoding: "utf8" }); return { p, m: Number(st.stdout?.trim() ?? 0) }; })
      .sort((a, b) => b.m - a.m);
  } catch { return []; }
};
if (benchDrafts().length === 0) {
  log("P8 no draft yet — one retry turn (the seats mount asynchronously after the bundle row)");
  const retry = await turn(
    "The estate seats are mounted now. Retry the construction you planned: melite_construct " +
    (SCENARIO === "object"
      ? "the object-forge flow on the bench with the same prompt as before. "
      : "the image card on the bench with prompt 'a small red sailboat on calm glass water, dawn light' " +
        "with the z-image MODEL (the small one — never krea-2). ") +
    "Still do NOT press run — that remains mine.",
    600_000,
  );
  dieOnTurnErrors("construct-retry", retry);
}
const drafts = benchDrafts();
if (drafts.length === 0) fail("no draft landed on the bench — the construct never happened");
// BENCH-DOC SHAPE (live-fire drive-2): { version, record: { doc: {
// draft_id, intent, stages: [{ id, card, params: { model, prompt, … },
// engine, … }], status } } } — the press derives card/model/params
// from stage s_0, never the envelope (card/model live ONLY there).
const benchDoc = JSON.parse(readFileSync(drafts[0].p, "utf8")).record?.doc ?? {};
const stage0 = Array.isArray(benchDoc.stages) ? benchDoc.stages[0] : undefined;
if (stage0 === undefined) fail("bench draft has no stage: " + JSON.stringify(benchDoc).slice(0, 300));
// No defaults here: a stage with a missing card/model is a BROKEN
// construct — pressing defaults would mask it (audit drive-P8).
const stageCard = typeof stage0.card === "string" ? stage0.card : undefined;
const stageParams = (stage0.params && typeof stage0.params === "object" && !Array.isArray(stage0.params)) ? stage0.params : {};
const stageModel = typeof stageParams.model === "string" ? stageParams.model : undefined;
// The flow scenario's bench stage carries no model — the flow ROW
// owns its per-stage models; only the card construct needs the model
// on the stage.
if (stageCard === undefined || (SCENARIO !== "object" && stageModel === undefined)) {
  fail("bench draft stage s_0 misses card/model (card=" + JSON.stringify(stage0?.card) + " model=" + JSON.stringify(stageParams?.model) + ") — refusing to press defaults over a broken construct");
}
log("P8 bench draft: " + drafts[0].p + " -> card " + stageCard + " model " + (stageModel ?? "(none — flow row owns stage models)") +
  " params " + JSON.stringify(stageParams).slice(0, 200));
// STORE-STABILITY GATE (live-fire drive-4): the setup turn can go
// idle while a delegated download subagent still streams — the press
// then refuses lane presence for a file that lands minutes later
// (qwen3vl text encoder: refused at press, present 4 min after).
// Press only when the store has real weights AND its byte size is
// stable across three 20s samples, plus a grace beat.
{
  const storeBytes = () => {
    const r = spawnSync("du", ["-sb", STORE], { encoding: "utf8" });
    return Number((r.stdout ?? "").split("\t")[0] ?? 0);
  };
  const t0 = Date.now();
  let stable = 0, last = -1;
  while (Date.now() - t0 < 1_800_000) {
    const now = storeBytes();
    if (now > 0 && now === last) stable++; else stable = 0;
    last = now;
    const hasWeight = weightFiles().some((p) => {
      const st = spawnSync("stat", ["-c", "%s", p], { encoding: "utf8" });
      return Number(st.stdout?.trim() ?? 0) > 50_000_000;
    });
    if (stable >= 3 && hasWeight) break;
    await new Promise((r) => setTimeout(r, 20_000));
  }
  if (stable < 3) log("P8 store-stability gate: WAIVER — timed out waiting; pressing under the press-retry backstop (an unheld gate pressed anyway must be visible in the log, never readable as held)");
  else log("P8 store-stability gate: held at " + Math.round(last / 1073741824) + "G for 60s");
  await new Promise((r) => setTimeout(r, 5_000));
}
async function pressTurn() {
  return await turn(
    "I am pressing run now (the user's press). Make exactly ONE tool call: melite_flow with " +
    (SCENARIO === "object" ? `flow='${stageCard}'` : `card='${stageCard}', model='${stageModel}'`) +
    (Object.keys(stageParams).length > 0
      ? `, params as a REAL OBJECT (never JSON.stringify): ${JSON.stringify(stageParams)}`
      : "") +
    ". Then reply with the tool's raw answer verbatim (the run_id), nothing else.",
    300_000,
  );
}
let press = await pressTurn();
dieOnTurnErrors("press", press);
// ONE PRESS-RETRY (drive-4 law): a lane-presence refusal at press can
// mean the last weight landed between the gate and the call — settle
// 120s and press once more before giving up.
if (!/run-[0-9a-f]+-\w+/.test(press.text)) {
  log("P8 press refused (tail: " + press.text.slice(-160).replace(/\n/g, " ") + ") — settling 120s, one retry");
  await new Promise((r) => setTimeout(r, 120_000));
  press = await pressTurn();
  dieOnTurnErrors("press-retry", press);
}
const runId = press.text.match(/run-[0-9a-f]+-\w+/)?.[0];
if (runId === undefined) fail("no run_id in the press answer; tail: " + press.text.slice(-400));
log("P8 run_id: " + runId);

// P9 — settle-poll (settle evicts the live registry — the law)
const TERMINAL = new Set(["completed", "error", "stopped", "failed"]);
const readSettle = () => {
  try {
    const flow = JSON.parse(readFileSync(join(STATE, "output", runId, "_flow.json"), "utf8"));
    if (typeof flow.status === "string" && TERMINAL.has(flow.status)) {
      return { status: flow.status, error: typeof flow.error === "string" ? flow.error : "" };
    }
  } catch { /* not settled yet */ }
  return null;
};
let status = null;
let settleErr = "";
const pollStart = Date.now();
while (Date.now() - pollStart < 1_800_000) {
  const settled = readSettle();
  if (settled !== null) { status = settled.status; settleErr = settled.error; break; }
  await new Promise((r) => setTimeout(r, 20_000));
}
log("P9 terminal status: " + (status ?? "(none)"));
if (status !== "completed") {
  fail("run never completed (status " + status + "; settle error: " + settleErr.slice(0, 400) + ")");
}

// THE ARTIFACT — bytes on disk, verified by magic + dims. The run
// tree nests node outputs by node name (live-fire drive-6:
// generate/SaveImage.0_gen_00001_.png) — walk it, never list only
// the top level.
const runDir = join(STATE, "output", runId);
// THE ARTIFACT extension rides the scenario: images verify as PNG
// (signature + IHDR dims); the object-forge flow verifies as GLB
// (the 4-byte 'glTF' magic — a fake renamed .glb refuses).
const artExt = SCENARIO === "object" ? ".glb" : ".png";
const arts = [];
{
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(artExt)) arts.push(p);
    }
  };
  try { walk(runDir); } catch { /* no output dir at all */ }
}
if (arts.length === 0) fail("completed but no " + artExt + " artifact under " + runDir);
const b = readFileSync(arts[0]);
let width = 0, height = 0;
if (SCENARIO === "object") {
  const magic = b.length > 12 &&
    b[0] === 0x67 && b[1] === 0x6c && b[2] === 0x54 && b[3] === 0x46;
  if (!magic) fail(arts[0] + " is not a GLB (bytes say otherwise)");
} else {
// FULL signature (8 bytes) + the IHDR chunk header: a 4-byte-prefix
// fake used to pass this check (audit drive-P9).
const magic = b.length > 33 &&
  b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
  b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a &&
  b[12] === 0x49 && b[13] === 0x48 && b[14] === 0x44 && b[15] === 0x52;
if (!magic) fail(arts[0] + " is not a PNG (bytes say otherwise)");
const u32 = (o) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
width = u32(16);
height = u32(20);
if (width < 64 || height < 64 || width > 8192 || height > 8192) {
  fail(arts[0] + " has absurd dimensions " + width + "x" + height + " (parsed-but-unasserted used to slip)");
}
}
log("artifact: " + JSON.stringify({
  file: arts[0], bytes: b.length, count: arts.length,
  ...(width ? { width, height } : {}),
}));

// THE COLD CURE — the agent really did set it all up
const weights = weightFiles();
const bigEnough = weights.filter((p) => {
  const st = spawnSync("stat", ["-c", "%s", p], { encoding: "utf8" });
  return Number(st.stdout?.trim() ?? 0) > 50_000_000;
});
const nodes = estateNodes();
if (bigEnough.length === 0) fail("the model store gained no real weight (" + weights.length + " small files) — the download leg failed");
const wantedExt = SCENARIO === "object" ? /trellis|remesher/i : /utility/i;
if (!nodes.some((n) => wantedExt.test(n))) fail("custom_nodes gained no expected extension (" + (SCENARIO === "object" ? "trellis/remesher" : "utility") + "; entries: " + nodes.join(", ") + ") — the install leg failed");
log("cold cure proven: " + bigEnough.length + " weight(s) on disk (first: " + bigEnough[0] + "), custom_nodes now: " + nodes.join(", "));

request("shutdown", undefined);
await new Promise((r) => setTimeout(r, 1500));
child.kill();
for (const p of procs) { try { p.kill("SIGTERM"); } catch { /* already gone */ } }
log("COLD-START DRIVE: PASS — release bytes -> fake registry -> normal-DSH consumer install -> cold engine -> agent full-reign setup -> user press -> content");
log("everything preserved under " + ROOT);
process.exit(0);
