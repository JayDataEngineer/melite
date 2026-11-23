#!/usr/bin/env node
// lane-rebuild.mjs — THE ONE COMMAND (operator demand, 2026-10-13):
// rebuild every melite web lib AND every browser-served client bundle
// (the tsdown step — the outage of 2026-10-13 was a tsc-only rebuild
// that left the STALE prebuilt lib/client.js bundles serving: the
// server serves those files verbatim, it never compiles src), then
// re-render the melite-test lane profile from the CURRENT workspace,
// wipe every browser-cache seat, kill any orphan holding :3088,
// restart the lane, POLL for the new boot's live token (a token
// grepped too early is dead — the boot prints it late), and VERIFY
// the estate doors + the served bundle bytes before printing the URL.
//
// ORDER LAW: tsdown (client bundles) runs BEFORE tsc — tsdown cleans
// lib/, tsc does not, so this order leaves BOTH faces present:
// lib/client.js (served to browsers) + lib/host.js (the estate fiber).
// @melite/harness-tools is NEVER tsdown-built: bundle-repro.spec.ts
// asserts its committed lib/ is full tsc output.
//
// Usage:  node scripts/lane-rebuild.mjs          (from anywhere — the :3088 lane)
//         node scripts/lane-rebuild.mjs <port>   (a BRANCH lane — never 3089)
//         Flags (the operator no-env law, 2026-11-16 — the promote-prod
//         shape): --main-home PATH  the main dsh home a branch lane links its
//             shared stores onto (default ~/.dsh-dev) · --public-host HOST  the
//             host spliced into the printed URL hint (default 127.0.0.1). The
//             port is the positional <port>; the LANE_* pins stay env for now
//             (the audit's later lane-config cure).
// NEVER 3089 (operator 2026-11-10: "YOU NEVER TOUCH 3089. THE WHOLE
// POINT WAS THAT *YOU NEVER TOUCH 3089*. NEVER. EVER."): :3089 is the
// operator's LIVING lane — a rebuild restarts its unit, which kills
// their in-flight turn ("The DSH process exited before this turn
// finished"). The refusal below is ABSOLUTE: no override, no flag.
// :3089 changes reach the operator only when THEY restart it.
// Never hand-cp libs into ~/.dsh-dev again — the provisioner owns
// that tree; a hand-cp is a lie that the next render erases.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

// set -euo pipefail + cd "$(dirname "$0")/.."
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.resolve(SCRIPT_DIR, ".."));

// [ -f ./.env ] && . ./.env   (deployment env; .env is gitignored)
const envPath = path.resolve(".env");
if (fs.existsSync(envPath)) {
  for (const rawLine of fs.readFileSync(envPath, "utf8").split("\n")) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[line.slice(0, eq).trim()] = value;
  }
}

// ── flags + the positional port (the no-env law) ──────────────────
let PORT = "";
let MAIN_HOME = path.join(os.homedir(), ".dsh-dev");
let PUBLIC_HOST = "127.0.0.1";
{
  const args = process.argv.slice(2);
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === "--main-home") {
      if (i + 1 >= args.length) {
        console.error("--main-home needs the main dsh home");
        process.exit(1);
      }
      MAIN_HOME = args[i + 1];
      i += 2;
    } else if (arg === "--public-host") {
      if (i + 1 >= args.length) {
        console.error("--public-host needs a hostname");
        process.exit(1);
      }
      PUBLIC_HOST = args[i + 1];
      i += 2;
    } else {
      if (PORT === "") {
        PORT = arg;
        i += 1;
      } else {
        console.error(`lane-rebuild: unknown argument ${arg} (lawful: <port> | --main-home PATH | --public-host HOST)`);
        process.exit(2);
      }
    }
  }
}
PORT = PORT || process.env.LANE_PORT || "3088";

// THE 3089 REFUSAL (ABSOLUTE — the law above): the operator's living
// lane dies on every restart; no session may ever restart it through
// this script, whatever the reason, however urgent the change is.
if (PORT === "3089") {
  console.log("LANE REFUSED: :3089 is the operator's living lane — NEVER rebuilt, NEVER restarted, no override exists.");
  console.log("A rebuild here kills their in-flight turn. Land changes on :3088; :3089 adopts them when the OPERATOR restarts it.");
  process.exit(1);
}

let UNIT;
let DSH_HOME;
if (PORT === "3088") {
  UNIT = "dsh-melite-test.service";
  DSH_HOME = process.env.LANE_DSH_HOME || path.join(os.homedir(), ".dsh-dev");
} else {
  UNIT = `dsh-melite-test-${PORT}.service`;
  DSH_HOME = process.env.LANE_DSH_HOME || path.join(os.homedir(), `.dsh-lane${PORT}`);
  // THE SERVE PROXY (loud, never silent loopback): the tailnet face
  // https://cloud.tailb1e597.ts.net:$PORT is a tailscale-serve proxy
  // onto 127.0.0.1:$PORT — :3089 exists already; any OTHER port owes
  // its own proxy first, and a lane that answers only loopback while
  // the receipt prints a cloud URL is a lie.
  const serve = spawnSync("tailscale", ["serve", "status"], { encoding: "utf8" });
  if (serve.status !== 0 || !(serve.stdout || "").includes(`cloud.tailb1e597.ts.net:${PORT} `)) {
    console.log(`LANE REFUSED: no tailscale-serve proxy for :${PORT} — add one first (an https proxy onto http://127.0.0.1:${PORT}), then re-run`);
    process.exit(1);
  }
}
const LOG = path.join(DSH_HOME, `melite-test-${PORT}.log`);

// THE RENDER CONTRACT (the model-loss cure, 2026-11-06): the profile
// render MUST carry the same flags lane-sync uses — a FLAGLESS render
// regenerates cordis.patch.yml wholesale with an EMPTY operator-rows
// splice, deleting every LLM row (llm-pi-ai, agent-default-model) and
// the agentRoute pin: the lane then boots with ZERO LLM models while
// the script's llm-blind receipts still print success.
const PROFILE = process.env.LANE_PROFILE || "melite-test";
// (DSH_HOME is seated in the PORT case above: the default lane's
// ~/.dsh-dev, a branch lane's own ~/.dsh-lane$PORT — never re-derived
// here, or the branch home would be clobbered back onto the main one)
// The seat is the PRIMARY brain (zai/glm-5.3-flash, same as :3080's
// MELITE_AGENT_ROUTE). It sat on the muse FALLBACK until 2026-10-20 —
// every lane-sync re-pin stuck the lane on muse and the rate-limit
// "switch back" never reached it (owner report 2026-10-20). LANE_ROUTE
// still overrides for a deliberate muse seat.
const ROUTE = process.env.LANE_ROUTE || "zai/glm-5.3-flash";
const ROWS = "dev_docs/deployment/studio-lane-rows.yml";

console.log("── [1/6] building browser client bundles (tsdown — the files :3088 serves)");
// EVERY browser-served package rides tsdown (the 2026-10-26 outage:
// this loop skipped packages outside packages/web and served a stale
// bundle with the silent-drop cure absent; the serve audit then found
// motion-motion + img-to-mesh one edit from the same replay — a
// served seat outside this loop is a stale-bundle bomb).
for (const dir of [
  "packages/web/card-base", "packages/web/melite-card-view",
  "packages/web/melite-card-deck", "packages/web/infer-gallery",
  "packages/web/viewer", "packages/web/three-client",
  "packages/video/h3-timeline", "packages/motion/motion",
  "packages/3d/img-to-mesh", "packages/web-kit/timeline",
]) {
  if (!fs.existsSync(path.join(dir, "tsdown.config.ts"))) continue;
  console.log(`   tsdown ${dir}`);
  // FAIL LOUD (the 2026-10-30 outage: this line discarded the voice and
  // set -e killed the script after a bare "tsdown <dir>" echo — card-base
  // had never DECLARED tsdown; its bin had only ever resolved through the
  // long-dead tracked node_modules symlink, so the honest per-package
  // install exited 127 into /dev/null and :3088 never came up). The
  // output still rides the null device while the build is green; a red
  // build prints its own tail, naming the package and the cure door.
  const tsErr = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "lane-rebuild-")), "tsdown.log");
  const fd = fs.openSync(tsErr, "w");
  // THE BIN PATH IS ABSOLUTE (2026-11-23, the 127 burn): a relative
  // program path with options.cwd re-resolves $0 from the CHILD's cwd
  // — the pnpm shim's basedir doubled the package dir under itself and
  // exec'd a path that does not exist (exit 127, misread as a missing
  // devDep). resolve() pins both the program and its cwd to the repo
  // root, so the shim's dirname is the real .bin wherever this runs.
  const bin = path.resolve(dir, "node_modules", ".bin", "tsdown");
  const run = spawnSync(bin, [], {
    cwd: path.resolve(dir),
    stdio: ["ignore", fd, fd],
  });
  fs.closeSync(fd);
  // the shell reports a missing/non-execable bin as exit 127 — spawnSync
  // surfaces it as an ENOENT error instead, so map it back to the 127 the
  // bash script's missing-devDep branch keys on
  const code = run.status ?? (run.error?.code === "ENOENT" ? 127 : 1);
  if (code !== 0) {
    if (code === 127) {
      console.log(`TSDOWN FAILED: ${dir} — ./node_modules/.bin/tsdown missing (exit 127): the package does not declare the tsdown devDep — every browser-served package must`);
    } else {
      console.log(`TSDOWN FAILED: ${dir} (exit ${code} — head + tail of its own output; full log kept at ${tsErr})`);
    }
    console.log("── head ──");
    console.log(fs.readFileSync(tsErr, "utf8").split("\n").slice(0, 30).join("\n"));
    console.log("── tail ──");
    console.log(fs.readFileSync(tsErr, "utf8").split("\n").slice(-30).join("\n"));
    process.exit(1);
  }
  fs.rmSync(path.dirname(tsErr), { recursive: true, force: true });
}

console.log("── [2/6] building every profile-bundled melite package (build-plane rides tsc + the plane laws)");
// THE BUILD-PLANE LAW (serve audit, 2026-10-26): the old loop ran raw
// `pnpm --filter <pkg> build` on 10 packages only — no trailing-newline
// finisher, no lib/.src-stamp refresh, and NO packages/models/* family
// rebuild (their stale libs red the lib-sync wall while src was
// honest). build-plane owns every tsc face in the tree, so one call
// builds the profile set AND the families. tsdown (step 1) still runs
// first: build-plane never touches client bundles, and tsdown cleans
// lib/ while tsc does not (the ORDER LAW in the header).
{
  const build = spawnSync(process.execPath, ["tools/build-plane.mjs", "build"], { stdio: "inherit" });
  if (build.status !== 0) process.exit(build.status ?? 1);
}

console.log(`── [3/6] rendering the ${PROFILE} profile from the current tree (lane-sync's render contract)`);
// THE BRANCH ROOTS LAW (2026-11-10, the lane-3089 lock collision): the
// 3088 estate pins the repo's data/runs state root and holds its
// single-writer gateway lock for its lifetime. A branch lane rendering
// the same rows derives the SAME root, and every one of its queue-plane
// seats dies on the lock at boot ("another estate owns this root") —
// the demo lane's own cure (--estate-state-root, J12) applies here: a
// branch names its OWN runs root under its OWN DSH_HOME, so the two
// lanes are two estates, never two writers on one root.
const branchRootArgs = [];
if (PORT !== "3088") {
  branchRootArgs.push("--estate-state-root", path.join(DSH_HOME, "runs"));
  console.log(`   branch state root: ${path.join(DSH_HOME, "runs")} (the repo's data/runs stays 3088's)`);
}
{
  const prov = spawnSync(process.execPath, [
    "packages/harness/provisioner/bin/infer-provision.mjs", "profile", PROFILE,
    "--dsh-home", DSH_HOME,
    "--estate-agent-route", ROUTE,
    "--profile-rows", ROWS,
    ...branchRootArgs,
  ], { stdio: ["inherit", "ignore", "inherit"] });
  if (prov.status !== 0) process.exit(prov.status ?? 1);
}
// (the model-loss wall, 2026-11-06) the render is only honest if the
// LLM rows + the agent route SURVIVED it — a stripped render reboots
// a modelless lane that every downstream receipt still calls green.
const PATCH = path.join(DSH_HOME, "profiles", PROFILE, "cordis.patch.yml");
// an unreadable patch IS the lying-render failure path (the
// missing-file class the .sh era printed cleanly): refuse with the
// same RENDER REFUSED voice, never a node stack trace
const patchText = fs.existsSync(PATCH) ? fs.readFileSync(PATCH, "utf8") : "";
if (!patchText.includes("llm-pi-ai")) {
  console.log(`RENDER REFUSED: ${PATCH} carries no llm-pi-ai rows — the LLM models would vanish (see dev_docs/audits/features/lane-rebuild-model-loss-2026-11-06.md)`);
  process.exit(1);
}
if (!patchText.includes("agentRoute")) {
  console.log(`RENDER REFUSED: ${PATCH} lost the agentRoute pin — the estate agent would not seat`);
  process.exit(1);
}
if (PORT !== "3088") {
  if (!patchText.includes(`stateRoot: "${path.join(DSH_HOME, "runs")}"`)) {
    console.log(`RENDER REFUSED: ${PATCH} carries no branch stateRoot — the lane would boot onto 3088's runs root and die on its gateway lock`);
    process.exit(1);
  }
  console.log(`   render verified: branch stateRoot pinned in ${PATCH}`);
}
console.log(`   render verified: llm-pi-ai rows + agentRoute present in ${PATCH}`);

// THE RENDER-PROVENANCE FRESHNESS GATE (HMR audit 009 F5, 2026-10-24):
// the receipts at [6/6] prove the BOOT — this gate proves the RENDER.
// The provisioner stamps render-provenance.json (who/what/when) beside
// the profile; a render that silently failed (or a profile tree a hand
// `pnpm add` mutated after the fact) leaves a stale stamp naming a
// DIFFERENT tree than HEAD, and every downstream receipt would still
// go green over the stale bytes. The stamp must name THIS commit and
// carry a fresh renderedAt (the render ran seconds ago in step 3).
const PROV = path.join(DSH_HOME, "profiles", PROFILE, "render-provenance.json");
const PROV_HEAD = (() => {
  const rev = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  if (rev.status !== 0) process.exit(rev.status ?? 1);
  return (rev.stdout || "").trim();
})();
{
  let p;
  try {
    p = JSON.parse(fs.readFileSync(PROV, "utf8"));
  } catch {
    console.error(`RENDER REFUSED: ${PROV} is unreadable — the provisioner never stamped this render`);
    process.exit(1);
  }
  if (p.source?.commit !== PROV_HEAD) {
    console.error(`RENDER REFUSED: render-provenance names commit ${p.source?.commit} but HEAD is ${PROV_HEAD} — the profile renders a different tree; re-run the render (never hand-cp into ~/.dsh-dev)`);
    process.exit(1);
  }
  const ageMin = (Date.now() - Date.parse(p.renderedAt)) / 60000;
  if (!(ageMin >= 0 && ageMin < 10)) {
    console.error(`RENDER REFUSED: render-provenance renderedAt ${p.renderedAt} is not fresh (${ageMin.toFixed(1)} min old) — a stale render serves stale bytes under green receipts`);
    process.exit(1);
  }
  console.log(`   render provenance fresh: ${p.source.commit.slice(0, 9)} rendered ${ageMin.toFixed(1)} min ago${p.source.dirty ? " (dirty tree — uncommitted bytes ride the render)" : ""} ✓`);
}

// command -v <name> (PATH scan) — no shell builtin in argv-array land
const which = (name) => {
  for (const dir of (process.env.PATH || "").split(path.delimiter)) {
    if (dir === "") continue;
    const candidate = path.join(dir, name);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch { /* keep scanning PATH */ }
  }
  return "";
};

if (PORT === "3088") {
  console.log("── [4/6] wiping every cache seat (embedded browsers + chrome profiles)");
  for (const seat of [
    path.join(os.homedir(), ".cache", "dsh-chrome-profile", "Default", "Cache"),
    path.join(os.homedir(), ".cache", "dsh-chrome-profile", "Default", "Code Cache"),
    path.join(os.homedir(), ".cache", "dsh-chrome-profile", "Default", "Service Worker"),
    path.join(os.homedir(), ".cache", "dsh-chrome-profile2", "Default", "Cache"),
    path.join(os.homedir(), ".cache", "dsh-chrome-profile2", "Default", "Code Cache"),
    path.join(os.homedir(), ".cache", "dsh-chrome-profile2", "Default", "Service Worker"),
  ]) {
    try { fs.rmSync(seat, { recursive: true, force: true }); } catch { /* || true */ }
  }
} else {
  // THE BRANCH LANE never wipes the cache seats: the sidecar browsers
  // belong to the :3088 lane the operator may be mid-test on — wiping
  // them from a branch boot would rip :3088's face down, the exact
  // harm this parameter exists to prevent. The branch's own boot is a
  // fresh unit anyway.
  console.log("── [4/6] branch lane — cache seats untouched (they belong to :3088's sidecars)");
}

if (PORT !== "3088") {
  // THE BRANCH UNIT (installed, not hand-run — systemd owns restarts):
  // mirrors dsh-melite-demo's own-home shape with this port's numbers.
  // Bin paths are read off the LIVE :3088 unit (ground truth on this
  // box), never guessed.
  const unitCat = spawnSync("systemctl", ["--user", "cat", "dsh-melite-test.service"], { encoding: "utf8" });
  const unitCatText = (unitCat.stdout || "");
  let NODE_BIN = "";
  {
    const m = unitCatText.match(/^ExecStart=[^ ]+\/bin\/node [^ ]+/m);
    if (m) NODE_BIN = m[0].split(" ")[0].split("=")[1];
  }
  let DSH_BIN = "";
  {
    const m = unitCatText.match(/[^ ]+\/bin\/dsh/m);
    if (m) DSH_BIN = m[0];
  }
  const nodeExecutable = () => {
    try { fs.accessSync(NODE_BIN, fs.constants.X_OK); return true; } catch { return false; }
  };
  if (!(NODE_BIN !== "" && nodeExecutable())) NODE_BIN = which("node");
  if (!(DSH_BIN !== "" && (() => { try { fs.accessSync(DSH_BIN, fs.constants.X_OK); return true; } catch { return false; } })())) DSH_BIN = which("dsh");
  fs.mkdirSync(DSH_HOME, { recursive: true });
  fs.mkdirSync(path.join(os.homedir(), ".config", "systemd", "user"), { recursive: true });
  // THE SHARED-CHAT LAW (operator 2026-11-10, "make 3088 and 3089 share
  // dsh chat sessions"): sessions live in DSH_HOME/sessions keyed by the
  // workspace slug, session BODIES reference their uploads in
  // DSH_HOME/attachments, and the sidebar attributes them by the home's
  // anonymous-user-id — a branch home with its own stores would boot
  // with a BLANK chat list, and a SHARED session continued on the
  // branch dies mid-turn ("Attachment object is missing") the moment it
  // loads a message whose upload lives in the main home. The branch
  // therefore (a) links its sessions AND attachments dirs onto :3088's
  // stores and (b) adopts :3088's anonymous id, so both lanes list,
  // continue, and read the SAME chats. One live writer per chat is the
  // user's own discipline (the same chat open twice writes twice);
  // read/resume across lanes is the requested behavior.
  // (MAIN_HOME: --main-home, default ~/.dsh-dev — seated in the flag parse)
  for (const SHARED_STORE of ["sessions", "attachments"]) {
    const mainStore = path.join(MAIN_HOME, SHARED_STORE);
    const branchStore = path.join(DSH_HOME, SHARED_STORE);
    if (fs.existsSync(mainStore) && fs.statSync(mainStore).isDirectory()) {
      let isLink = false;
      let exists = false;
      try { fs.lstatSync(branchStore); isLink = fs.lstatSync(branchStore).isSymbolicLink(); exists = true; } catch { /* absent */ }
      if (isLink || exists) {
        let linkTarget = "";
        try { linkTarget = fs.readlinkSync(branchStore); } catch { /* not a link — || true */ }
        if (linkTarget !== mainStore) {
          console.log(`FATAL: ${branchStore} exists and is not the shared store link — refusing to touch it`);
          process.exit(1);
        }
      } else {
        try {
          fs.symlinkSync(mainStore, branchStore);
        } catch {
          console.log(`FATAL: cannot link ${SHARED_STORE} onto ${mainStore}`);
          process.exit(1);
        }
      }
      console.log(`   shared chat ${SHARED_STORE}: ${branchStore} → ${mainStore}`);
    } else {
      console.log(`   NOTE: ${mainStore} not found — the branch keeps its own ${SHARED_STORE} store`);
    }
  }
  const anonSrc = path.join(MAIN_HOME, ".anonymous-user-id");
  if (fs.existsSync(anonSrc)) {
    fs.copyFileSync(anonSrc, path.join(DSH_HOME, ".anonymous-user-id"));
    console.log("   shared chat identity: branch adopts :3088's anonymous user id");
  }
  // THE 1:1 ROSTER LAW (operator 2026-11-10, "IT LOST ALL TOOLS"): the
  // delegation record ($DSH_HOME/melite-runs-state.json) decides the
  // boot's tool roster — delegated=true seats melite_flow + run_status
  // AND pins the six estate doors at boot (the seat-pin cure); a branch
  // home born without the record boots the browser-law roster and a
  // session crossing lanes loses tools mid-flight ("unknown tool
  // run_status"). The branch adopts the main home's record verbatim:
  // same toggle, same roster, no delta.
  const runsStateSrc = path.join(MAIN_HOME, "melite-runs-state.json");
  if (fs.existsSync(runsStateSrc)) {
    fs.copyFileSync(runsStateSrc, path.join(DSH_HOME, "melite-runs-state.json"));
    console.log("   1:1 tool roster: branch adopts :3088's melite-runs delegation record");
  }
  // THE SHARED MODEL CREDENTIALS (2026-11-10, "not hooked into my
  // models"): provider keys live per-home in .credentials.yaml refs —
  // a branch home boots with only its browser-session grant and its
  // agent seat has NO model backend. The branch therefore MERGES the
  // main home's refs into its own file (refs only — the branch's own
  // records, e.g. its live browser session, are never clobbered).
  // Values are never echoed; the merge is idempotent.
  const mainCred = path.join(MAIN_HOME, ".credentials.yaml");
  const branchCred = path.join(DSH_HOME, ".credentials.yaml");
  if (fs.existsSync(mainCred) && fs.existsSync(branchCred)) {
    try {
      // structural merge of the credentials file (order-independent,
      // idempotent): top-level blocks are split by column-0 lines; the
      // branch keeps its OWN version + records (its live browser
      // session), refs merge with the branch winning key ties.
      // Values are never echoed.
      const blocks = (p) => {
        const out = new Map();
        let cur = null, body = [];
        for (const line of fs.readFileSync(p, "utf8").split("\n")) {
          if (/^[A-Za-z_]/.test(line)) { if (cur) out.set(cur, body.join("\n")); cur = line.split(":")[0]; body = [line]; }
          else if (cur) body.push(line);
        }
        if (cur) out.set(cur, body.join("\n"));
        return out;
      };
      const main = blocks(mainCred);
      const br = blocks(branchCred);
      const refsOf = (b) => { const m = new Map(); for (const line of (b.get("refs") || "").split("\n").slice(1)) { const kv = line.trim().match(/^([^:]+):\s*(.+)$/); if (kv) m.set(kv[1], kv[2]); } return m; };
      const merged = new Map([...refsOf(main), ...refsOf(br)]);
      const version = br.get("version") || "version: 1";
      const records = br.get("records") || "records: []";
      const refsBlock = "refs:\n" + [...merged].map(([k, v]) => `  ${k}: ${v}`).join("\n");
      const tmp = branchCred + ".tmp";
      fs.writeFileSync(tmp, `${version}\n${records}\n${refsBlock}\n`, { mode: 0o600 });
      fs.renameSync(tmp, branchCred);
      console.log(`   shared model credentials: merged ${merged.size} refs into the branch home`);
    } catch {
      console.log("FATAL: credentials merge failed");
      process.exit(1);
    }
  }
  const unitFile = `\
[Unit]
Description=DSH branch lane (melite series, port ${PORT}, own DSH_HOME, script-launched)
After=network.target

[Service]
WorkingDirectory=${process.cwd()}
Environment=PATH=/home/user/.local/share/mise/shims:/home/user/.local/bin:/home/user/bin:/usr/local/bin:/usr/bin:/bin
Environment=DSH_HOME=${DSH_HOME}
ExecStart=${NODE_BIN} ${DSH_BIN} --profile melite-test --host 127.0.0.1 --port ${PORT} --trusted-host cloud.tailb1e597.ts.net:${PORT} --no-open
Restart=always
RestartSec=4
StandardOutput=append:${LOG}
StandardError=inherit
UMask=0077

[Install]
WantedBy=default.target
`;
  fs.writeFileSync(path.join(os.homedir(), ".config", "systemd", "user", UNIT), unitFile);
  {
    const reload = spawnSync("systemctl", ["--user", "daemon-reload"], { stdio: "inherit" });
    if (reload.status !== 0) process.exit(reload.status ?? 1);
  }
}

console.log("── [5/6] restarting the lane unit");
if (PORT === "3088") {
  // the main lane keeps its orphan sweep (a crashed dsh outside
  // systemd once held :3088 and every restart bounced off it).
  {
    const ss = spawnSync("ss", ["-tlnp"], { encoding: "utf8" });
    const pids = [];
    for (const line of (ss.stdout || "").split("\n")) {
      if (!line.includes(`127.0.0.1:${PORT}`)) continue;
      for (const m of line.matchAll(/pid=([0-9]+)/g)) pids.push(m[1]);
    }
    if (pids.length > 0) {
      console.log(`   killing orphan PID ${pids.join("\n")} (restarts never owned it)`);
      for (const pid of pids) {
        try { process.kill(Number(pid), "SIGKILL"); } catch { /* 2>/dev/null || true */ }
      }
    }
  }
  // the browser sidecar rides the MAIN lane's face only — a branch
  // boot never restarts it (the operator may be testing :3088 through
  // it this minute).
  {
    const restart = spawnSync("systemctl", ["--user", "restart", "dsh-melite-test.service", "dsh-browser-view.service"], { stdio: "inherit" });
    if (restart.status !== 0) process.exit(restart.status ?? 1);
  }
} else {
  // a branch port's listener is ALWAYS systemd-owned (the unit above
  // is the only thing that ever binds it) — restart owns the stop; a
  // pid-kill here would race systemd's own relaunch.
  {
    const restart = spawnSync("systemctl", ["--user", "restart", UNIT], { stdio: "inherit" });
    if (restart.status !== 0) process.exit(restart.status ?? 1);
  }
}

console.log("── [6/6] polling for the NEW boot's live token (verified by HTTP, not by grep)");
let TOKEN_URL = "";
{
  let NLINES = 0;
  try {
    NLINES = fs.readFileSync(LOG, "utf8").split("\n").filter((line) => line.includes("dsh web:")).length;
  } catch { /* grep -c fails on a missing log — || true */ }
  void NLINES;
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  for (let i = 1; i <= 40; i += 1) {
    await sleep(4000);
    let CAND = "";
    try {
      const lines = fs.readFileSync(LOG, "utf8").split("\n").filter((line) => line.includes("dsh web:"));
      if (lines.length > 0) CAND = lines[lines.length - 1].replace(/^dsh web: /, "");
    } catch { /* grep fails on a missing log — CAND stays empty */ }
    if (CAND === "") continue;
    const probe = spawnSync("curl", ["-s", "-o", "/dev/null", "-w", "%{http_code}", CAND], { encoding: "utf8" });
    const CODE = (probe.stdout || "").trim();
    if (CODE === "303" || CODE === "200") { TOKEN_URL = CAND; break; }
  }
}
if (TOKEN_URL === "") {
  console.log("FATAL: no live token after 160s — lane did not boot");
  process.exit(1);
}

console.log("");
console.log("── RECEIPTS (all verified before this URL was printed)");
{
  const jar = spawnSync("curl", ["-s", "-c", "/tmp/lane-rebuild-jar", TOKEN_URL, "-o", "/dev/null"]);
  if (jar.status !== 0) process.exit(jar.status ?? 127);
}
const doorCode = () => {
  const probe = spawnSync("curl", ["-s", "-b", "/tmp/lane-rebuild-jar", "-o", "/dev/null", "-w", "%{http_code}", `http://127.0.0.1:${PORT}/v1/model-catalog`], { encoding: "utf8" });
  return (probe.stdout || "").trim();
};
{
  const DOOR = doorCode();
  if (DOOR !== "200") {
    console.log(`FATAL: /v1/model-catalog → ${DOOR} (estate fiber not serving)`);
    process.exit(1);
  }
  console.log(`   /v1/model-catalog → ${DOOR} (estate fiber alive)`);
}
// THE COMPOSED-CATALOG RECEIPT: the catalog must carry the COMPOSED
// family rows — the Loader mounted them from the estate's
// cordis.patch.yml (dsh.bundle.patch). An estate fiber can serve a
// door from a private, family-less boot; 'h3' is a composed family
// atom (family id ≠ card id — the card is h3-timeline), so its
// presence proves the composition — not just liveness. (The atom was
// 'mask-select' until 2026-11-02: WRONG door for a tool family —
// mask-select is unoffered by design (F1: a selection tool, not a
// generative model — the 08-11 catalog contract serves NO row for an
// unoffered family) and its card boards no family, so no lawful tree
// can ever serve the string on this door. 'h3' is the offered
// family-id-≠-card-id atom; its row additionally exercises the
// served-rail head-claim projection — the headless family's address
// derives, never stamps.)
{
  const cat = spawnSync("curl", ["-s", "-b", "/tmp/lane-rebuild-jar", `http://127.0.0.1:${PORT}/v1/model-catalog`], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (cat.status !== 0) process.exit(cat.status ?? 127);
  const CATALOG = cat.stdout || "";
  if (!CATALOG.includes('"h3"')) {
    console.log("FATAL: /v1/model-catalog serves no composed family rows (no 'h3')");
    console.log("   — the patch roster never reached the boot: check dsh.bundle.patch + family deps");
    process.exit(1);
  }
}
console.log("   composed family rows served (h3 present) ✓");
// THE QUEUE-DOOR RECEIPTS (2026-10-24 debt, the silent-green class):
// catalog-200 proves only the catalog row. Five boots (2026-10-23)
// passed every check above while drafts/runs answered seatless 502s —
// a dead required row settles green under cordis, the estate serves
// the catalog from a half-up composition. The settle gate now refuses
// such boots at apply time; these receipts are the door-side proof on
// the SAME boot. The pending gate stamps at FIRST REQUEST (permanent
// agentPresets/tools/pluginMarket waiters keep estateStillActivating
// true), so the first probe may 503 — poll through the 120s grace and
// demand a seated 200 within the budget. A seatless boot fails here.
const doorPoll = async (doorPath, label) => {
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const probe = () => {
    const r = spawnSync("curl", ["-s", "-b", "/tmp/lane-rebuild-jar", "-o", "/dev/null", "-w", "%{http_code}", `http://127.0.0.1:${PORT}${doorPath}`], { encoding: "utf8" });
    return (r.stdout || "").trim();
  };
  let waited = 0;
  // first request starts the pending stamp
  let code = probe();
  for (let i = 1; i <= 42; i += 1) {
    if (code === "200") break;
    await sleep(4000);
    waited += 4;
    code = probe();
  }
  if (code !== "200") {
    console.log(`FATAL: ${label} → ${code} after ${waited}s — the queue plane never seated`);
    console.log("   — the silent-green class: check the boot log for the settle gate's refusal");
    process.exit(1);
  }
  console.log(`   ${label} → 200 (${waited}s past first request) ✓`);
};
await doorPoll("/v1/flows/drafts", "GET /v1/flows/drafts (drafts seat)");
await doorPoll("/v1/flows/runs?limit=1", "GET /v1/flows/runs  (runs seat)");
{
  // head -c 400000 counts BYTES — keep the fetch as a Buffer so the
  // cut is byte-accurate even if multibyte bytes ride the bundle
  const cbFetch = spawnSync("curl", ["-s", `http://127.0.0.1:${PORT}/plugins/??@melite/card-base/client.js&rev=x`], { maxBuffer: 64 * 1024 * 1024 });
  if (cbFetch.status !== 0) process.exit(cbFetch.status ?? 127);
  const CB = (cbFetch.stdout || Buffer.alloc(0)).subarray(0, 400000);
  if (CB.includes("estateInputUrl(props.value)")) {
    console.log("   served card-base carries the input-mirror cure ✓");
  } else {
    console.log("   served card-base: (rev-pinned bytes only render in-app; content check informational)");
  }
}
console.log("");
console.log("OPEN IN A VIRGIN BROWSER (zero cache exists anywhere):");
if (PORT !== "3088") {
  // the branch's face is the tailnet https proxy — splice the token's
  // query onto the cloud host (the serve proxy answers https only).
  const marker = `127.0.0.1:${PORT}`;
  const cut = TOKEN_URL.indexOf(marker);
  const TAIL_QUERY = cut >= 0 ? TOKEN_URL.slice(cut + marker.length) : TOKEN_URL;
  console.log(`  https://cloud.tailb1e597.ts.net:${PORT}${TAIL_QUERY}`);
  console.log(`  (local fallback: ${TOKEN_URL})`);
} else {
  console.log(`  ${TOKEN_URL.replace("127.0.0.1", PUBLIC_HOST)}`);
  console.log(`  (local fallback: ${TOKEN_URL})`);
}
