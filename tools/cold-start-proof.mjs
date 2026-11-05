#!/usr/bin/env node
// cold-start-proof.mjs — THE PROVABLE COLD-START LANE (the
// every-push face): the consumer journey from NOTHING, proven in a
// naked docker container, plus the estate arms against a scratch
// cold-start world. One command:
//
//   node tools/cold-start-proof.mjs
//
// Two legs, one receipt, exit nonzero on any fail:
//
//   CONTAINER LEG (steps run INSIDE a naked node:22 container via
//   this same file's --inner mode — no pnpm store, no dsh home, no
//   git config, nothing but the image and a read-only repo mount):
//     A  container-home-fresh   a fresh DSH_HOME, provably empty
//     B  container-seat-official  the official seat command —
//        `dsh plugin --profile coldstart add <remote>` — against a
//        LEAN git remote staged INSIDE the container from the six
//        seat files only (package.json, pnpm-lock.yaml,
//        pnpm-workspace.yaml, cordis.patch.yml,
//        tools/render-seat-patch.mjs, LICENSE): the lean seat is
//        proven, not the whole repo. CI seats the github: remote
//        instead (--remote github:JayDataEngineer/melite#v0.2.1-alpha) —
//        the same command, the public channel.
//     C  container-compose-estate  `dsh --profile coldstart
//        --dump-config` composes the estate: the melite bundle
//        layer lands and carries the melite-tools, melite-estate,
//        and family-krea-2 rows.
//
//   ESTATE LEG (spawned as tests/coldstart/cold-start-proof.spec.ts
//   under vitest.coldstart.config.ts — the scratch cold-start world:
//   pinned core, Manager seed, empty model tree, ephemeral-port
//   engine; no weight ever downloads):
//     D  the engine doors: Manager answers, the git-url door and
//        the model-queue door are OPEN at the pinned flags
//        (security_level=normal-, allow_git_url_install=true,
//        loopback listen) — probed the way managerRail.ts speaks
//        them, without installing anything (each probe rides the
//        route's refusal ORDER: the security predicate runs before
//        the body parse, so a malformed body answers the door's
//        400, never the 403 security word).
//     E  the load payload discloses the image-gen card's boarded
//        weights with every hint honestly ABSENT on the cold tree
//        (true-to-decl presence surface).
//     F  the acquire door PLANS the krea-2 rows — names, folders,
//        urls, sha256s, exact byte sizes through the estate's own
//        declaration port; never a download.
//
// Modes:
//   node tools/cold-start-proof.mjs                full proof (both legs)
//   node tools/cold-start-proof.mjs --container-only  the CI face
//   node tools/cold-start-proof.mjs --engine-only     the estate face
//   node tools/cold-start-proof.mjs --inner           (inside the
//        container only — the driver mounts the repo read-only and
//        runs this file under the image's own node)
//
// Flags:
//   --remote <spec>   the seat remote (default: file:///proof/seat,
//                     staged in-container from the repo mount; CI
//                     passes github:JayDataEngineer/melite#v0.2.1-alpha)
//   --image <image>   the container image (default node:22-bookworm-slim)
//   --dsh-cli <ver>   the @deepseek-ai/dsh CLI version the container
//                     installs globally (default 0.2.1-rc.5)
//   --receipt <path>  also write the JSON receipt there
//
// Machine as found (the release-rehearsal law): the container leg
// leaves NOTHING on this box (the DSH_HOME lives in the container's
// ephemeral layer; --rm erases the rest); the estate leg rides the
// coldstart tier's own scratch tree under data/runtime/coldstart-*.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(join(fileURLToPath(import.meta.url), "..", ".."));
// THE SEAT FILES (the lean remote's exact contents — a seat built
// from anything more is the whole repo wearing a seat's name):
const SEAT_FILES = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "cordis.patch.yml",
  "tools/render-seat-patch.mjs",
  "LICENSE",
];

function flag(name, fallback) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith("--") ? fallback : v;
}

const MODE_INNER = process.argv.includes("--inner");
const MODE_CONTAINER_ONLY = process.argv.includes("--container-only");
const MODE_ENGINE_ONLY = process.argv.includes("--engine-only");
const REMOTE = flag("--remote", "file:///proof/seat");
const IMAGE = flag("--image", "node:22-bookworm-slim");
const DSH_CLI = flag("--dsh-cli", "0.2.1-rc.5");
const RECEIPT_PATH = flag("--receipt", "");

// ── the receipt ─────────────────────────────────────────────────
const steps = [];
const log = (...a) => console.log("[cold-start-proof]", ...a);
/** Records one step and prints its line. On FAIL the detail must
 *  carry the verbatim refusal text — a bare ok:false teaches
 *  nothing. */
function step(id, ok, detail) {
  steps.push({ id, ok, detail });
  log(`step ${ok ? "PASS" : "FAIL"} — ${id}: ${detail}`);
}

// ── the container inner journey (runs INSIDE the naked container,
//    under the image's own node) ─────────────────────────────────
// The repo rides /repo read-only; everything written lands in the
// container's own layer (DSH_HOME at /root/.dsh, the staged remote
// at /proof/seat) — nothing leaks to the host.
async function inner() {
  const dshHome = "/root/.dsh";

  // A — the fresh, provably empty DSH_HOME.
  mkdirSync(dshHome, { recursive: true });
  const entries = readdirSync(dshHome);
  step("container-home-fresh", entries.length === 0,
    entries.length === 0
      ? dshHome + " is fresh and empty (readdir: 0 entries)"
      : dshHome + " is not empty: " + JSON.stringify(entries));

  // B — stage the lean seat INSIDE the container, then the official
  // seat command against it. git needs a user for the commit; that
  // is container-local config, never a spell on the journey.
  const seat = "/proof/seat";
  spawnSync("rm", ["-rf", seat]);
  mkdirSync(seat, { recursive: true });
  for (const rel of SEAT_FILES) {
    const src = join("/repo", rel);
    if (!existsSync(src)) {
      step("container-seat-official", false, "the repo mount is missing the seat file " + rel);
      return finishInner();
    }
    mkdirSync(dirname(join(seat, rel)), { recursive: true });
    const copy = spawnSync("cp", [src, join(seat, rel)], { encoding: "utf8" });
    if (copy.status !== 0) {
      step("container-seat-official", false, "cp " + rel + " refused: " + String(copy.stderr));
      return finishInner();
    }
  }
  // THE LEAN CENSUS: the staged remote carries the seat files and
  // nothing else — this is what proves the seat, not the repo.
  const staged = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === ".git") continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else staged.push(full.slice(seat.length + 1));
    }
  };
  walk(seat);
  const lean = staged.sort().join(",") === [...SEAT_FILES].sort().join(",");
  if (!lean) {
    step("container-seat-official", false,
      "the staged remote is not the lean seat — carried: [" + staged.join(", ") + "]");
    return finishInner();
  }
  const git = (args) => {
    const r = spawnSync("git", args, { encoding: "utf8" });
    if (r.status !== 0) throw new Error("git " + args.join(" ") + " refused: " + String(r.stderr).trim());
  };
  try {
    git(["init", "--quiet", seat]);
    git(["-C", seat, "add", "-A"]);
    git(["-C", seat, "-c", "user.email=proof@melite.local", "-c", "user.name=proof", "commit", "--quiet", "-m", "lean seat"]);
  } catch (e) {
    step("container-seat-official", false, String(e.message));
    return finishInner();
  }
  const seatAdd = spawnSync("dsh", ["plugin", "--profile", "coldstart", "add", REMOTE],
    { encoding: "utf8", env: { ...process.env, DSH_HOME: dshHome }, timeout: 600_000 });
  const seatOut = (seatAdd.stdout ?? "") + (seatAdd.stderr ?? "");
  if (seatAdd.status !== 0) {
    step("container-seat-official", false,
      "dsh plugin add refused (exit " + String(seatAdd.status) + ") — verbatim tail:\n" + seatOut.split("\n").slice(-12).join("\n"));
    return finishInner();
  }
  if (!/\+\s*melite /.test(seatOut)) {
    step("container-seat-official", false,
      "the seat command exited 0 but the profile never landed the melite dependency — verbatim tail:\n" +
      seatOut.split("\n").slice(-12).join("\n"));
    return finishInner();
  }
  step("container-seat-official", true,
    "dsh plugin --profile coldstart add " + REMOTE + " — the melite seat landed (lean remote: " +
    SEAT_FILES.length + " files)");

  // C — the composed estate: the melite bundle layer with its rows.
  const dump = spawnSync("dsh", ["--profile", "coldstart", "--dump-config"],
    { encoding: "utf8", env: { ...process.env, DSH_HOME: dshHome }, timeout: 120_000 });
  const dumpText = dump.stdout ?? "";
  const has = (needle) => dumpText.includes(needle);
  const rows = [
    ["# == melite", "the melite bundle layer"],
    ["- id: melite-tools", "the melite-tools row"],
    ["- id: melite-estate", "the melite-estate row"],
    ["- id: family-krea-2", "the family-krea-2 row"],
    ["'@melite/models-krea-2'", "the @melite/models-krea-2 package"],
  ];
  const missing = rows.filter(([needle]) => !has(needle)).map(([, name]) => name);
  if (dump.status !== 0 || missing.length > 0) {
    step("container-compose-estate", false,
      "the composed profile is missing " + (missing.length > 0 ? missing.join(", ") : "a clean exit (status " + String(dump.status) + ")") +
      " — verbatim tail:\n" + (dumpText || String(dump.stderr)).split("\n").slice(-12).join("\n"));
    return finishInner();
  }
  step("container-compose-estate", true,
    "dsh --profile coldstart --dump-config composes the estate (" + dumpText.split("\n").length +
    " lines: melite bundle layer + melite-tools + melite-estate + family-krea-2)");

  return finishInner();
}

function finishInner() {
  const bad = steps.filter((s) => !s.ok);
  console.log("COLDPROOF-INNER-RECEIPT " + JSON.stringify({ ok: bad.length === 0, steps }));
  process.exit(bad.length === 0 ? 0 : 1);
}

// ── the host driver ─────────────────────────────────────────────
function dockerAvailable() {
  const r = spawnSync("docker", ["info", "--format", "{{.ServerVersion}}"], { encoding: "utf8", timeout: 30_000 });
  return r.status === 0
    ? null
    : "docker is not answering (exit " + String(r.status) + "): " + String(r.stderr ?? r.stdout).trim().slice(0, 200);
}

async function containerLeg() {
  const noDocker = dockerAvailable();
  if (noDocker !== null) {
    step("container-leg", false, noDocker);
    return;
  }
  // The repo rides /repo read-only; the inner journey writes only
  // inside the container (--rm erases the rest).
  const r = spawnSync("docker", [
    "run", "--rm", "-i",
    "-v", REPO + ":/repo:ro",
    IMAGE,
    "bash", "-c",
    "apt-get update -qq >/dev/null 2>&1 && apt-get install -y -qq git ca-certificates >/dev/null 2>&1 && " +
    "npm i -q -g @deepseek-ai/dsh@" + DSH_CLI + " pnpm@10.33.2 >/dev/null 2>&1 && " +
    "node /repo/tools/cold-start-proof.mjs --inner --remote \"" + REMOTE + "\"",
  ], { encoding: "utf8", timeout: 1_800_000, maxBuffer: 64 * 1024 * 1024 });
  const out = String(r.stdout ?? "");
  const marker = out.split("\n").find((l) => l.startsWith("COLDPROOF-INNER-RECEIPT "));
  if (r.status !== 0 || marker === undefined) {
    step("container-leg", false,
      "the container journey " + (marker === undefined ? "never produced its receipt" : "failed") +
      " (docker exit " + String(r.status) + ") — verbatim tail:\n" + out.split("\n").slice(-20).join("\n") +
      (r.stderr ? "\n[stderr]\n" + String(r.stderr).split("\n").slice(-8).join("\n") : ""));
    return;
  }
  const receipt = JSON.parse(marker.slice("COLDPROOF-INNER-RECEIPT ".length));
  for (const s of receipt.steps) step(s.id, s.ok, s.detail);
  if (!receipt.ok) step("container-leg", false, "the container journey reported a failed step (see above)");
}

async function engineLeg() {
  const spec = join(REPO, "tests", "coldstart", "cold-start-proof.spec.ts");
  if (!existsSync(spec)) {
    step("engine-leg", false, "the estate wall spec is missing: tests/coldstart/cold-start-proof.spec.ts");
    return;
  }
  // The ESTATE arms only: the container face is this driver's own
  // leg, so the spec's container arm (which would recurse here)
  // stays out via the name pattern.
  const r = spawnSync("pnpm", [
    "exec", "vitest", "run",
    "--config", "vitest.coldstart.config.ts",
    "tests/coldstart/cold-start-proof.spec.ts",
    "--testNamePattern", "the estate arms",
  ], { encoding: "utf8", cwd: REPO, timeout: 3_600_000, maxBuffer: 64 * 1024 * 1024 });
  const out = String(r.stdout ?? "");
  // The arms print PROOF lines (the rehearsal's receipt shape) —
  // surface them verbatim in this transcript.
  const proofLines = out.split("\n").filter((l) => l.includes("PROOF "));
  for (const line of proofLines) log(line.trim());
  const passed = out.match(/Tests\s+(\d+)\s+passed/);
  const failed = out.match(/Tests\s+.*?(\d+)\s+failed/);
  if (r.status !== 0 || (failed !== null && Number(failed[1]) > 0)) {
    step("engine-leg", false,
      "the estate arms red (vitest exit " + String(r.status) + ") — verbatim tail:\n" +
      out.split("\n").slice(-25).join("\n"));
    return;
  }
  const count = passed === null ? proofLines.length : Number(passed[1]);
  if (count < 3) {
    step("engine-leg", false,
      "the estate name pattern matched no arms (matched " + String(count) + ") — the selector is broken, not green");
    return;
  }
  step("engine-leg", true, "the estate arms held (" + String(count) + " arms green: engine doors, load disclosure, the krea-2 plan)");
}

async function main() {
  log("the provable cold-start lane — remote " + REMOTE + ", image " + IMAGE);
  const t0 = Date.now();
  if (!MODE_ENGINE_ONLY) await containerLeg();
  if (!MODE_CONTAINER_ONLY) await engineLeg();
  const bad = steps.filter((s) => !s.ok);
  const secs = Math.round((Date.now() - t0) / 1000);
  if (RECEIPT_PATH !== "") {
    mkdirSync(dirname(RECEIPT_PATH), { recursive: true });
    writeFileSync(RECEIPT_PATH, JSON.stringify({ remote: REMOTE, image: IMAGE, ok: bad.length === 0, steps }, null, 2) + "\n");
  }
  if (bad.length > 0) {
    console.log("cold-start proof: " + String(bad.length) + " step(s) FAILED in " + String(secs) + "s — " +
      bad.map((s) => s.id).join(", "));
    process.exit(1);
  }
  console.log("cold-start proof: EVERY STEP PASS in " + String(secs) + "s — the seat, the compose, the engine doors, the load disclosure, and the krea-2 plan all hold from nothing");
}

if (MODE_INNER) {
  await inner();
} else {
  await main();
}
