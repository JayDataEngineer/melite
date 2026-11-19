#!/usr/bin/env node
// hook-full-battery.mjs — pre-push checkpoint: tsc per typecheck
// package + the walls (root vitest node project) + lib-sync (a
// fresh full build must reproduce the committed lib/ byte-for-byte).
// The walls are the estate's gate law; tsc mirrors each package's own
// `typecheck` script locally (CI runs unit/coverage/tiers only —
// types are this battery's to own). Exits non-zero on the FIRST
// failure (loud, named). Uses per-package .bin/tsc + the repo
// node_modules/.bin/vitest directly (no pnpm at run time).
//
// THE TIER-LEASE LAW (operator order 2026-11-17: "FIX THE PIPELINE
// NOW" — a 24h, 14-attempt release arc where every retry re-ran
// every earlier tier): every tier above the cheap probes is keyed to
// a hash of the inputs it actually judges (tools/battery-leases.mjs
// owns the table). Unchanged inputs carry the prior green forward;
// changed inputs re-fire; a refusal writes a RED lease for its tier
// and exits, so the next attempt resumes at the first dirty tier
// with every clean earlier tier carried. The store is
// data/tmp/battery-leases.json (gitignored host cache — a lease is
// never source of truth). DSH_BATTERY_FORCE=1 fires everything (the
// paranoia + CI door). A tier may never carry a green its inputs
// outgrew: the lease keys on the battery's own scripts and the
// lockfile too, so reworking this file invalidates every lease.
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { tierGate, loadLeases, saveLeases } from "./battery-leases.mjs";

// fileURLToPath, never URL.pathname (the windows CI doubled-drive
// class, 2026-10-31: '/D:/…' is drive-rooted RELATIVE on win32).
const REPO = fileURLToPath(new URL("..", import.meta.url));
const FORCE = process.env.DSH_BATTERY_FORCE === "1";
const LEASE_PATH = join(REPO, "data/tmp/battery-leases.json");
const leases = loadLeases(LEASE_PATH);

const carriedTiers = [];
// THE RUN-ONCE-SHOW-ALL LEDGER (operator order 2026-11-17: "A GOOD
// PIPELINE NEEDS TO BE RUN ONCE, THEN ALL ERRORS ARE SHOWING, ALL"):
// the battery once exited at the FIRST red tier — a 20-run ladder
// where every retry re-paid the tiers after the death. A red tier is
// now RECORDED and the battery CONTINUES: every tier fires (or
// carries), every failure lands in one report, one run shows all.
// Install-class defects (missing tsc / vitest binaries, a failed
// build) still STOP the run — later tiers would judge stale
// artifacts and report noise, not errors — but they stop THROUGH the
// ledger now: the red is recorded, the one-run report prints it with
// its tail, and the exit carries the report, never a bare line.
const redTiers = [];

/** The one-run report: every red tier, each with its own captured
 *  tail, in the order they were recorded — then the given exit
 *  status. The ONLY exit door after pre-flight. */
function reportAndExit(code) {
  if (redTiers.length > 0) {
    console.error(`\n${"=".repeat(72)}\nBATTERY RED — ${redTiers.length} tier(s) failed in THIS run:\n${"=".repeat(72)}`);
    for (const { id, tail } of redTiers) {
      console.error(`\n--- ${id} tier ---`);
      const lines = tail.split("\n");
      const failIdx = lines.findIndex((l) => l.includes("Failed Tests") || l.includes("FAIL"));
      const from = failIdx > 10 ? failIdx - 10 : Math.max(0, lines.length - 60);
      const excerpt = lines.slice(from, from + 120).join("\n");
      console.error(excerpt !== "" ? excerpt : "(no captured output — see the live log above)");
    }
    console.error(`\nBATTERY RED tiers: ${redTiers.map((r) => r.id).join(", ")} — carried [${carriedTiers.join(", ")}]`);
  } else {
    console.log(`battery green (tier-leased): ${carriedTiers.length > 0 ? `carried [${carriedTiers.join(", ")}] + ` : ""}fired tiers above`);
  }
  process.exit(code);
}

// THE SILENT-DEATH DOORS (2026-11-17): the battery once died with no
// verdict — the log ended mid-tier, no BATTERY RED line, no stack.
// Every non-exit path out of this process now walks the ledger out:
// an unhandled rejection, an uncaught exception, or an external
// TERM/INT all print the one-run report (every red recorded so far)
// and exit 1 through the one door. Only SIGKILL stays silent —
// nothing can catch it; the detached nohup ritual is its defense.
const dieThroughReport = (origin, err) => {
  redTiers.push({ id: `battery:${origin}`, tail: `${origin} killed the run:\n${err && err.stack ? err.stack : String(err)}` });
  reportAndExit(1);
};
process.on("unhandledRejection", (err) => dieThroughReport("unhandledRejection", err));
process.on("uncaughtException", (err) => dieThroughReport("uncaughtException", err));
process.on("SIGTERM", () => dieThroughReport("SIGTERM", "external SIGTERM — the report below is everything recorded before the kill"));
process.on("SIGINT", () => dieThroughReport("SIGINT", "external SIGINT — the report below is everything recorded before the kill"));

/** Tee-spawn: streams the child's output live AND captures it, so a
 * red tier's tail can land in the final ledger without going dark
 * while it runs. Event-loop friendly (no spawnSync) so the e2e and
 * browser tiers can run in PARALLEL — the battery's long tail is
 // two lanes that share no engine, no port, no state root. */
function spawnTee(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: REPO,
      stdio: ["ignore", "pipe", "pipe"],
      shell: opts.shell ?? false,
      env: opts.env,
    });
    let out = "";
    const tee = (chunk) => { out += chunk; process.stdout.write(chunk); };
    child.stdout.on("data", tee);
    child.stderr.on("data", tee);
    child.on("error", (e) => resolve({ status: -1, out: out + String(e) }));
    child.on("close", (status) => resolve({ status, out }));
  });
}

// One leased tier. The body returns { status, tail? } (0 = green) or
// a promise for one; this wrapper owns the carry/fire decision, the
// lease write (green OR red — a red lease refuses any later carry of
// the same hash, so an unresolved error re-fires instead of riding a
// stale green), and the ledger. There is no such thing as a flake:
// a red is an ERROR; it is recorded and the run CONTINUES so one run
// shows every error.
async function tier(id, body) {
  const gate = tierGate(REPO, leases, id);
  if (!FORCE && gate.decision === "carry") {
    carriedTiers.push(id);
    console.log(`carry ${id} — inputs unchanged since its last green (${gate.files} files hashed)`);
    return;
  }
  // THE SILENT-DEATH LAW (2026-11-17): a tier that THROWS must land
  // in the ledger like any red — before this catch, a thrown body
  // (spawn error, EPIPE, a crashed tier runner) unwound the battery
  // past reportAndExit and the run died with NO verdict line, the
  // log ending mid-tier. A throw is an ERROR; errors show.
  let r;
  try {
    r = await body();
  } catch (err) {
    leases[id] = { status: "red", hash: gate.hash, at: new Date().toISOString(), files: gate.files };
    saveLeases(LEASE_PATH, leases);
    redTiers.push({ id, tail: `${id} tier THREW (the error below, not a test red):\n${err && err.stack ? err.stack : String(err)}` });
    console.error(`RED ${id} tier — THREW; lease recorded red; the battery CONTINUES (one run shows every error)`);
    return;
  }
  const status = typeof r === "number" ? r : r.status;
  leases[id] = { status: status === 0 ? "green" : "red", hash: gate.hash, at: new Date().toISOString(), files: gate.files };
  saveLeases(LEASE_PATH, leases);
  if (status !== 0) {
    const tail = typeof r === "object" && r.tail ? r.tail : "";
    redTiers.push({ id, tail });
    console.error(`RED ${id} tier — lease recorded red; the battery CONTINUES (one run shows every error)`);
    return;
  }
  console.log(`ok   ${id} (${gate.files} files hashed; lease green)`);
}

// THE WORKSPACE EXCLUSION LAW (the typert fast-fail, 2026-11-12):
// pnpm-workspace.yaml EXCLUDES packages/vendor/typert-protocol (the
// hoist-shadow kill, 2026-09-29 — as a member it linked the hoisted
// copy and split RemoteResult identity across two 0.2.0 dts trees;
// the wall is tests/walls/ts/suites/typert-artifact-law.spec.ts).
// A non-member never materializes node_modules, so it can never
// carry the .bin/tsc this battery spawns — the walker below read
// the same tree WITHOUT the negation and failed the whole battery
// on the vendor's own `typecheck` script before any tsc ran. The
// workspace file is the truth; this walker honors its `!` entries
// (exact paths — the one live exclusion is exact, and a globbed
// exclusion would need a matcher here the day one lands).
function workspaceExclusions() {
  const yaml = readFileSync(join(REPO, "pnpm-workspace.yaml"), "utf8");
  const out = [];
  let inPackages = false;
  for (const line of yaml.split("\n")) {
    if (/^packages:/.test(line)) { inPackages = true; continue; }
    if (inPackages && /^\S/.test(line) && !line.startsWith("#")) break;
    const m = inPackages ? line.match(/^\s*-\s*'!(.+?)'\s*$/) : null;
    if (m) out.push(m[1]); // walker spelling: dir.slice(REPO.length), no leading slash
  }
  return out;
}

// Every package owning a `typecheck` script (tsc --noEmit in its dir),
// DERIVED from the workspace manifests — never hardcoded. The
// hardcoded list drifted twice (a dead packages/web/editor path;
// estate/models + web/melite-run-wire silently ungated), so the
// battery now reads the truth: any package that declares the script
// is gated, the day it declares it (gate-found 2026-09-12). A
// package the workspace excludes is not gated — pnpm never installs
// it, so its script is the vendor's own build face, never ours.
function typecheckPackages() {
  const out = [];
  const excluded = new Set(workspaceExclusions());
  const genres = readdirSync(join(REPO, "packages"), { withFileTypes: true })
    .filter((d) => d.isDirectory());
  for (const genre of genres) {
    const genreDir = join(REPO, "packages", genre.name);
    // A genre dir may itself be a package (packages/<name>/package.json).
    for (const dir of [genreDir, ...readdirSync(genreDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(genreDir, d.name))]) {
      const manifest = join(dir, "package.json");
      if (!existsSync(manifest)) continue;
      const rel = dir.slice(REPO.length);
      if (excluded.has(rel)) continue; // the workspace's own `!` law
      let scripts;
      try {
        scripts = JSON.parse(readFileSync(manifest, "utf8")).scripts ?? {};
      } catch {
        continue; // unparseable manifest: not this battery's wall
      }
      if (typeof scripts.typecheck === "string") {
        out.push(rel);
      }
    }
  }
  return out.sort();
}
const PACKAGES = typecheckPackages();

// THE TSC NET (2026-10-02): the loop ran one package at a time —
// spawnSync per package, ~100s of the pre-push battery's ~190s on a
// 24-core machine with sixteen cores idle. The net is now a bounded
// pool at width 8: the SAME width scripts/ship-lane.mjs uses for this
// net, and the same width tests/walls/ts/suites/typecheck-gate.spec.ts
// runs its package sweep at, so one number governs all three seats.
// The stage boundary keeps it safe — the net runs BEFORE vitest, so no
// tsc process ever competes with the suite's forks (the reason
// typecheck-gate.spec.ts holds the tier at TC_POOL=3).
const TSC_WIDTH = 8;

/** One tsc run; resolves to its exit status and captured stdout. */
function runTsc(dir) {
  const tsc = `${REPO}${dir}/node_modules/.bin/tsc`;
  return new Promise((resolve) => {
    const child = spawn(tsc, ["--noEmit"], {
      cwd: `${REPO}${dir}`,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let out = "";
    child.stdout.on("data", (chunk) => { out += chunk; });
    child.stderr.on("data", (chunk) => { out += chunk; });
    child.on("error", (e) => resolve({ status: -1, out: String(e) }));
    child.on("close", (status) => resolve({ status, out }));
  });
}

// A declared package without its own tsc fails the battery before any
// tier runs (an install defect, not a tier judgment — never leased):
// a missing binary is one named line, louder than a pile of spawn
// errors. The red lands in the LEDGER and the report carries it.
for (const p of PACKAGES) {
  if (!existsSync(`${REPO}${p}/node_modules/.bin/tsc`)) {
    redTiers.push({ id: "pre-flight", tail: `BATTERY FAIL: tsc missing for ${p} (run pnpm install)` });
    reportAndExit(1);
  }
}

const vitest = `${REPO}node_modules/.bin/vitest`;
if (!existsSync(vitest)) {
  redTiers.push({ id: "pre-flight", tail: "BATTERY FAIL: repo vitest missing (run pnpm install)" });
  reportAndExit(1);
}

const shell = process.platform === "win32";

await tier("tsc", () => {
  let next = 0;
  let failed = null;
  const lanes = Array.from(
    { length: Math.min(TSC_WIDTH, PACKAGES.length) },
    async () => {
      for (;;) {
        // A red package ends the battery: no new work is launched once
        // one is known, and the in-flight lanes are allowed to close so
        // no orphan tsc survives the exit.
        if (failed !== null) return;
        const dir = PACKAGES[next++];
        if (dir === undefined) return;
        const r = await runTsc(dir);
        if (r.status !== 0 && failed === null) {
          failed = { dir, out: r.out };
        }
      }
    },
  );
  return Promise.all(lanes).then(() => {
    if (failed !== null) {
      console.error(`tsc ${failed.dir}:`);
      if (failed.out.trim() !== "") console.error(failed.out.trim());
      return 1;
    }
    return 0;
  });
});

// THE BUILD PRECEDES THE WALLS (2026-10-13, the vendor-lib race):
// vendor members' lib/ is gitignored (built, never committed), so
// package-files-law's exports-liars check sees it ONLY after a
// build-plane run — every committed lib/ exists regardless, but a
// fresh checkout or a cleaned tree starts with vendor lib/ absent.
// The lib-sync build once ran AFTER the walls, so the same tree
// failed walls in one battery run and passed the next (the build
// had minted the vendor lib by then): three pre-push failures at
// ~117s against green hand-runs, deterministic per tree state.
// Build-then-judge is already the acceptance arms' own law below;
// the walls now inherit it. THE SHOW-ALL LAW (2026-11-17): the build
// is a LEASED TIER now (the once-dead "build" row in TIER_INPUTS is
// live) — a red build still stops the run (every later tier judges
// stale artifacts), but it stops through the ledger: recorded,
// tailed, reported.
{
  const gate = tierGate(REPO, leases, "build");
  if (!FORCE && gate.decision === "carry") {
    carriedTiers.push("build");
    console.log(`carry build — inputs unchanged since its last green (${gate.files} files hashed)`);
  } else {
    const build = await spawnTee(process.execPath, ["tools/build-plane.mjs", "build"]);
    leases["build"] = { status: build.status === 0 ? "green" : "red", hash: gate.hash, at: new Date().toISOString(), files: gate.files };
    saveLeases(LEASE_PATH, leases);
    if (build.status !== 0) {
      redTiers.push({ id: "build", tail: build.out + "\nBATTERY FAIL: lib-sync build (tools/build-plane.mjs build) — later tiers would judge stale artifacts" });
      reportAndExit(1);
    }
    console.log(`ok   build (lib-sync build-plane; ${gate.files} files hashed; lease green)`);
  }
}

await tier("walls", async () => {
  // EVERY PROJECT, not just `node` (round-6 audit, 2026-10-13): the
  // hook and the pre-commit job both run `--project node`, so the dom
  // / dom18 / deck projects (~3,000 specs) had NO local owner while
  // the CI unit job that runs them fires on main/master only. The
  // battery is the last local gate before a push, so it owns the full
  // fleet; the pre-commit job keeps the fast node-only seat.
  const walls = await spawnTee(vitest, ["run"], { cwd: REPO });
  if (walls.status !== 0) return { status: 1, tail: walls.out };
  // THE LIB-SYNC ARM (R4-03): a fresh full build must reproduce the
  // committed lib/ byte-for-byte. The class recurred 149× in 90
  // commits — src landed without its artifact, invisible to every
  // existing gate (the .src-stamp is gitignored, the singleton wall
  // covered client bundles only, CI built with no diff). This arm
  // owns the whole artifact plane: build everything, then refuse on
  // any tracked lib/ file a fresh build would rewrite. The cure it
  // names is the law: the artifact lands in the SAME commit as the
  // src (pnpm run build, then stage the diff). The build itself ran
  // BEFORE the walls (see above); this arm is its drift check.
  const drift = spawnSync("git", ["status", "--porcelain", "--", "**/lib/**"], {
    cwd: REPO,
    encoding: "utf8",
  });
  if (drift.status !== 0 || typeof drift.stdout !== "string") return { status: 1, tail: "git status --porcelain -- '**/lib/**' failed" };
  // Drift is WORKTREE vs INDEX (second column / untracked), not
  // index vs HEAD: staged lib updates are the law's own end state —
  // the artifact sits staged for the same commit as its src. Only a
  // file the fresh build rewrote PAST what is staged refuses.
  const dirty = drift.stdout
    .split("\n")
    .filter((l) => l.trim() !== "")
    // XY path: refuse when Y is non-space (worktree differs from
    // index) or the file is untracked — a fresh build minted it.
    .filter((l) => (l[1] !== undefined && l[1] !== " ") || l.startsWith("??"));
  if (dirty.length > 0) {
    return {
      status: 1,
      tail: walls.out + "\nlib/ drifted past the staged artifact — the build rewrote files beyond what is staged:\n  "
        + dirty.join("\n  ")
        + "\nThe artifact lands in the SAME commit as the src: pnpm run build, then stage the diff.",
    };
  }
  return { status: 0, tail: walls.out };
});

// THE ACCEPTANCE ARMS (round-6 audit, 2026-10-13): the tiers job
// and the pytest seat run in CI only, and CI fires on main/master —
// so on the branch the team works on, the expected / bench /
// snapshot surfaces and the vendored layer C pytest seat were
// judged by NOTHING. All four are keyless and cheap, and they run
// AFTER the lib-sync build so the expected tier judges fresh
// artifacts (CI's own order: build, then expected). pytest skips
// LOUD — never silently — where the box has no pytest, and names
// the install line.
for (const [tierId, config] of [
  ["expected", "vitest.expected.config.ts"],
  ["bench", "vitest.bench.config.ts"],
  ["snapshot", "vitest.snapshot.config.ts"],
  ["web", "vitest.web.config.ts"],
]) {
  await tier(tierId, async () => {
    const arm = await spawnTee(vitest, ["run", "--config", config], { cwd: REPO });
    return { status: arm.status === 0 ? 0 : 1, tail: arm.out };
  });
}
await tier("pytest", async () => {
  // (class B R11, 2026-10-31) windows' python3 is the Store alias stub
  // that opens the marketplace instead of the interpreter — probe
  // 'python' there; same seat, real binary.
  const pythonBin = process.platform === "win32" ? "python" : "python3";
  const pytest = await spawnTee(pythonBin, ["-m", "pytest", "tests/", "-q"], { cwd: REPO });
  if (pytest.status === -1 || /ENOENT|not found|No such file/i.test(pytest.out.slice(0, 500))) {
    console.warn(`SKIP-LOUD: ${pythonBin} absent — the vendored layer C pytest seat is unjudged here (CI owns it; install ${pythonBin} + pytest to judge locally)`);
    return { status: 0 };
  }
  if (pytest.status === 5 || /No module named pytest/u.test(pytest.out)) {
    console.warn("SKIP-LOUD: pytest absent — the vendored layer C seat is unjudged here (pip install pytest; CI owns it)");
    return { status: 0 };
  }
  return { status: pytest.status === 0 ? 0 : 1, tail: pytest.out };
});
// THE CI-PARITY ARMS (2026-11-14 burn: knip 33/15 and coverage red
// on GitHub while every local gate was green — the hook never ran
// what CI runs, so "all tests run locally on push" was a promise
// about a subset). CI owns exactly these gate classes beyond the
// battery above: the knip budget, the per-file coverage gate, the
// keyless e2e self-skip tier, and the playwright browser tier. All
// four run here now — the hook's set IS CI's set.
await tier("knip", async () => {
  const knip = await spawnTee("node", ["tools/knip-budget.mjs"], { cwd: REPO });
  return { status: knip.status === 0 ? 0 : 1, tail: knip.out };
});
await tier("coverage", async () => {
  // THE COVERAGE RATCHET (2026-11-14, the release-deadlock burn): the
  // raw coverage exit reds on the estate's pre-existing per-file debt
  // (95 files, roadmapped, floors untouchable) and made every push
  // impossible — a guard that deadlocks is a defect. The battery still
  // RUNS the full CI coverage suite inside the ratchet; the judgment
  // scopes to the delta: growth reds, shrink moves the row in the same
  // commit. When the debt hits zero the ratchet IS the raw gate.
  const coverage = await spawnTee("node", ["tools/coverage-ratchet.mjs"], { cwd: REPO });
  return { status: coverage.status === 0 ? 0 : 1, tail: coverage.out };
});
// THE ONE-ENGINE LAW (2026-11-18, attempt-14's burn): the GPU rows
// press ONE shared engine — and so does the browser lane: the
// journeys specs press REAL runs through the lane's estate on the
// same 8188 card. The parallel tail cross-fired BOTH ways in one
// run: the lane's runs stole the card between the anny row's VRAM
// probe and its press (9543 MiB free against a 15500 budget — the
// admission door refused CORRECTLY), the h3-image t2i row died
// mid-run on an engine IndexError with the lane queued beside it
// (cold rerun: green in 73s), and two journey rows red on the busy
// engine from the other side. One GPU, one consumer at a time: e2e
// (the heavy resident loads) drains FIRST, then a cold-card handoff
// restarts the engine, then the browser lane runs; each tier's own
// lease + ledger row keeps the report honest.
{
  const e2eRed = await tier("e2e", async () => {
    // THE VRAM-ADMISSION SEAT (2026-11-17, the successor to the
    // SERIAL-E2E LAW): the engine suites acquire the exclusive
    // engine seat inside tests/e2e/engine-gate.ts (activated by
    // vitest.e2e.config.ts's MELITE_E2E_SEAT env) — admission
    // judged on the card's ACTUAL free VRAM, with the estate's
    // free/restart doors as the pressure ladder. One engine, one
    // SEATED consumer: the storm that wedged three batteries (the
    // five-heavy-rows fetch-failed class at 4 workers) is
    // impossible while every engine suite rides the seat, and the
    // engine-CLEAN suites (compose-smoke, estate-smoke,
    // extension-upstream, lane-defaults, model-smoke) no longer
    // pay the serialization tax the blunt cap charged them. Two
    // workers: one seated engine lane + one engine-clean lane.
    const e2e = await spawnTee("pnpm", ["run", "test:e2e"], { shell, env: { ...process.env, DSH_E2E_MAX_WORKERS: "2" } });
    return { status: e2e.status === 0 ? 0 : 1, tail: e2e.out };
  });
  if (e2eRed === 1) {
    console.warn("NOTE: e2e tier red — the browser tier still runs (one run shows every error); the shared engine carries the e2e tier's residency into it.");
  }
  // THE COLD-CARD HANDOFF (2026-11-18): the e2e tier leaves the h3
  // film residency loaded (~15 GB — the estate never evicts), and
  // the browser lane's journeys press REAL runs on the same card:
  // the j/l poser preview and the c/e clip birth both red against a
  // 9.5 GB-free card the door refuses. One GPU, one consumer, each
  // consumer starting COLD — the same restart ritual the battery's
  // own pre-run performs by hand. Machine-local and guarded: only
  // when the engine answers at the dev host AND the user service
  // exists (keyless CI owns neither — its engine tiers self-skip).
  {
    const engineUp = await fetch("http://127.0.0.1:8188/system_stats", { signal: AbortSignal.timeout(4_000) }).then((r) => r.ok).catch(() => false);
    if (engineUp) {
      const restart = await spawnTee("systemctl", ["--user", "restart", "melite-comfyui.service"], { shell });
      if (restart.status === 0) {
        await new Promise((resolve) => setTimeout(resolve, 12_000));
        const cold = await fetch("http://127.0.0.1:8188/system_stats", { signal: AbortSignal.timeout(20_000) }).then((r) => r.ok).catch(() => false);
        console.warn(`HANDOFF: engine restarted cold for the browser tier (boot probe ${cold ? "ok" : "still settling — the lane's own boot grace covers it"})`);
      } else {
        console.warn("SKIP-LOUD: melite-comfyui.service absent — the browser tier runs on the WARM card the e2e tier left (journeys may refuse at the VRAM door)");
      }
    }
  }
  await tier("browser", async () => {
    // THE EXECUTABLE PROBE, NOT THE CLI PROBE (2026-11-19, the
    // rc.5 push-kill): `playwright --version` succeeding says
    // nothing — the rc.5 wave bumped the playwright pin, the
    // expected chromium build moved (1255), the box still carried
    // the old cache, and every browser journey died at 0ms with
    // "Executable doesn't exist" while the probe stayed green. CI
    // installs browsers as an explicit step on every runner; the
    // local seat must SELF-HEAL the same way: `playwright install
    // chromium` is a fast no-op when the build matches and seats
    // it when it does not. Install failure (offline box) stands
    // down LOUD — CI owns that window, and a deadlock-free gate
    // is the coverage-ratchet law.
    const install = await spawnTee("pnpm", ["--filter", "@melite-plugin/dsh-card-view", "exec", "playwright", "install", "chromium"], { shell });
    if (install.status !== 0) {
      console.warn("SKIP-LOUD: chromium not installable here (offline?) — the browser tier is unjudged on this box; CI installs browsers per-run and owns this window");
      return { status: 0 };
    }
    const browser = await spawnTee("pnpm", ["run", "test:web:browser"], { shell });
    return { status: browser.status === 0 ? 0 : 1, tail: browser.out };
  });
}

// THE ONE-RUN REPORT (the show-all law): every red tier, each with
// its own captured tail, in the order they were recorded — the
// complete error surface of this tree in one run, no ladder.
reportAndExit(redTiers.length > 0 ? 1 : 0);
