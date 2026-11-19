#!/usr/bin/env node
// ship-lane.mjs — SHIP THE TREE TO THE OPERATOR'S LANE, AND PROVE IT.
//
// WHY THIS EXISTS (2026-10-10, the li-u receipt): the :3088 estate was
// restarted onto a tree whose bench door enforced the lane laws, and
// the door still admitted the operator's incident-A state. Five
// packages ship a COMPILED entry (main/exports -> lib/, not src/), the
// vitest suite resolves src, and the lane loaded a nine-day-old
// lib/remote.js. The served face_stamp reported the DISK head, so it
// said "current" the whole time.
//
// A restart is not a deployment here. THIS is the deployment:
//   1. build the five compiled packages
//   2. restart the lane
//   3. wait out the activation gate (and name a flapping row if it
//      never settles)
//   4. PROVE IT BY BEHAVIOUR — write the state the law refuses and
//      read the refusal. Never trust a stamp.
//
// Usage:
//   scripts/ship-lane.mjs                 # build + restart + verify (default lane)
//   scripts/ship-lane.mjs --no-build      # skip the builds, KEEP every gate
//                                       // (the audit's hole: --no-build used to
//                                       // skip the typecheck net AND the test tier
//                                       // with it — a "restart only" ship could
//                                       // leave port with red source. The gates
//                                       // are noEmit; they cost the same either
//                                       // way, and 35+ packages run from source
//                                       // the restart serves.)
//   scripts/ship-lane.mjs --unit dsh-web  # a different systemd unit
//   scripts/ship-lane.mjs --check         # verify only, change nothing
//   THE LANE PAIR IS FLAGS, NEVER ENV (no-env law, 2026-11-16):
//   --unit and --origin must name the sanctioned lane TOGETHER —
//   one alone (or a non-sanctioned pair) is refused; to move the
//   sanctioned lane itself, edit the two defaults in this file.
//
// THE NODE PORT (operator ruling, 2026-11-19: "THIS IS NPM AND
// PYTHON, NOT SHELL SCRIPT"): the lane playbook rides node, zero
// shell. Same flags, same exit codes, same stdout strings as the
// retired ship-lane.sh; every subprocess is an argv array (node,
// python3 is gone too — the client-bundle discovery reads the export
// map in-process), and the HTTP probes still ride curl's own cookie
// jar exactly as before (curl is a binary, not a shell script).
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, mkdtempSync, openSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// deployment env (.env is gitignored; .env.example documents every
// knob). The shell era SOURCED the file; the node era reads its flat
// KEY=VALUE dialect (the documented knobs) — quotes stripped, plain
// $VAR spelling expanded from the environment, `#` comments skipped.
function loadDotEnv(file) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim().replace(/^export\s+/, "");
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (_, name) => process.env[name] ?? "");
    }
    process.env[key] = value;
  }
}
loadDotEnv(join(REPO, ".env"));

// THE SANCTIONED PAIR (unit + origin bind as one lane — the check
// below refuses an override of either alone). Deployment-specific:
// edit these two defaults — never bake a private host into the
// tree. THE NO-ENV LAW (operator 2026-11-16, the promote-prod
// shape): the lane moves by FLAGS, never env — --unit/--origin
// name the sanctioned lane (the pair check refuses one alone, or a
// pair that is not the sanctioned one).
const SANCTIONED_UNIT = "dsh-melite-test.service";
const SANCTIONED_ORIGIN = "http://127.0.0.1:3088";
let UNIT = SANCTIONED_UNIT;
let ORIGIN = SANCTIONED_ORIGIN;

// the print helpers live ABOVE every use (the wall audit's M9
// behavioural fixture caught this live: the --unit refusal at the
// arg gate called bad() before its definition — bash printed
// "bad: command not found" where the FAIL line belonged, and the
// client-bundle discovery said say() the same way).
const say = (m) => console.log("\n\x1b[1m== " + m + "\x1b[0m");
const ok = (m) => console.log("   \x1b[32mok\x1b[0m   " + m);
const bad = (m) => console.log("   \x1b[31mFAIL\x1b[0m " + m);

/** `head -N file | sed 's/^/        /'` — the failure-report indent. */
function headIndented(file, n) {
  if (!existsSync(file)) return;
  const lines = readFileSync(file, "utf8").split("\n");
  // a trailing "" from the final newline never prints a ghost line
  for (const l of lines.slice(0, n)) console.log("        " + l);
}

/** `command -v x` — first executable on PATH. */
function which(bin) {
  for (const dir of (process.env.PATH ?? "").split(sep === "\\" ? ";" : ":")) {
    if (!dir) continue;
    const cand = join(dir, bin);
    try {
      const st = statSync(cand);
      if (st.isFile() && (st.mode & 0o111)) return cand;
    } catch { /* not there */ }
  }
  return "";
}

/** spawnSync that captures stdout (the $(...) shape). */
function sh(bin, args, opts = {}) {
  const r = spawnSync(bin, args, { encoding: "utf8", ...opts });
  return { code: r.status, out: (r.stdout ?? "").trim(), err: r.stderr ?? "" };
}

// THE NODE-HALF ROSTER IS DERIVED, NEVER HAND-LISTED (2026-10-13, the
// DSH-ship audit: "A hand list is exactly the list that rots"). A
// package belongs here iff the host imports it FROM lib/ — the rule is
// its own manifest: `main`, else `exports['.'].default`/`types`, must
// resolve into `./lib/`. Adding a compiled estate package is a manifest
// edit; the roster follows. (It reproduces the old four by hand.)
// EXPORTED (the node port's one-derivation law): the wall imports the
// ship's own function instead of lifting a node -e body out of a bash
// function — zero second implementations to drift.
export function deriveCompiled(root) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === "node_modules" || e.name === "lib" || e.name.startsWith(".")) continue;
      const p = join(dir, e.name);
      if (existsSync(join(p, "package.json"))) {
        let m = {};
        try { m = JSON.parse(readFileSync(join(p, "package.json"), "utf8")); } catch { /* unreadable manifest: not compiled */ }
        let entry = m.main;
        const dot = m.exports && m.exports["."];
        if (!entry && dot && typeof dot === "object") entry = dot.default || dot.types;
        if (!entry && typeof dot === "string") entry = dot;
        if (entry && entry.startsWith("./lib/")) out.push(p);
      }
      walk(p);
    }
  };
  walk(join(root, "packages"));
  return out.sort();
}

// THE CLIENT BUNDLES (operator, 2026-10-10: the STALE TAB
// regression). The browser runs `lib/client.js` from these packages,
// served under a year-immutable URL — so a source edit in a web
// package reaches the operator ONLY when its bundle is rebuilt.
// The first cut of this playbook built the five server packages and
// restarted, and the operator's tab still ran yesterday's deck: a
// restart is not a deployment, and neither is a server-only build.
// (No stale-tab banner may announce it any more — the bench is live;
// these bundles are what make "live" mean current.)
// THE LIST IS DISCOVERED, NEVER ENUMERATED (the ship audit's hole 1,
// 2026-10-10): motion, h3-timeline and img-to-mesh each export
// "./client" → "./lib/client.js" and the browser fetches them exactly
// like the three web packages — but they were missing here, so a film
// UI edit shipped "green" while the operator ran yesterday's bytes.
// A hand list is exactly the list that rots: every package that
// declares a ./client export is built and stamped, and a package
// whose bundle DISAPPEARS fails the ship rather than skipping.
//
// THE DISCOVERY IS THE EXPORT MAP, NOT A NAME LIST: a package whose
// ./client export resolves to ./lib/client.js is a BUILT bundle the
// browser fetches — it must be built and stamped. A ./client export
// pointing at src (viewer) is hot-loaded and needs no build. Reading
// the export map is what keeps the list honest when a package is
// added, renamed, or retired. (The shell era spelled this in python3;
// the node port reads the same export map in-process — the operator's
// "npm and python, not shell" ruling does not mean importing a python
// to read package.json.)
// EXPORTED for the wall (one derivation, zero drift).
export function discoverClientBundles(root) {
  const out = [];
  const genres = readdirSync(join(root, "packages")).sort();
  for (const genre of genres) {
    const gdir = join(root, "packages", genre);
    let st;
    try { st = statSync(gdir); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const pkg of readdirSync(gdir).sort()) {
      const pdir = join(gdir, pkg);
      const manifest = join(pdir, "package.json");
      if (!existsSync(manifest)) continue;
      let data;
      try { data = JSON.parse(readFileSync(manifest, "utf8")); } catch { continue; }
      const client = (data.exports ?? {})["./client"];
      const target = typeof client === "object" && client !== null ? client.default : client;
      if (typeof target === "string" && (
        target.replace("./", "") === "lib/client.js"
        || target.replace("./", "") === "lib/client/index.js"
      )) {
        out.push(relative(root, pdir));
      }
    }
  }
  return out;
}

// Every tsconfig-bearing package dir under packages/, node_modules
// pruned — the typecheck nets' discovery (find -name tsconfig.json
// -printf '%h' | grep /packages/). EXPORTED for the wall's fixture
// arm: the F-M5 law (discovers real + nested, skips node_modules)
// is judged by RUNNING this, not by regexing a find command out of
// the script text.
export function discoverTsconfigDirs(root) {
  const found = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { throw new Error("unreadable " + dir); }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules") continue;
        walk(p);
      } else if (e.name === "tsconfig.json") {
        found.push(dirname(p));
      }
    }
  };
  walk(join(root, "packages"));
  const seen = new Set();
  const list = [];
  for (const d of found) {
    if (!d.includes(sep + "packages" + sep)) continue;
    if (seen.has(d)) continue;
    seen.add(d);
    list.push(d);
  }
  return list.sort();
}

/** Every .ts/.tsx file under <pkg>/src, spelled `src/<rel>` (the
 *  sha256sum line spelling — the src/ prefix is load-bearing). */
function srcFiles(pkgDir) {
  const out = [];
  const walk = (dir, rel) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const r = rel === "" ? e.name : rel + "/" + e.name;
      if (e.isDirectory()) walk(join(dir, e.name), r);
      else if (e.name.endsWith(".ts") || e.name.endsWith(".tsx")) out.push("src/" + r);
    }
  };
  walk(join(pkgDir, "src"), "");
  return out;
}

const sha256hex = (s) => createHash("sha256").update(s).digest("hex");

// THE CONTENT STAMP (2026-10-10, the lane audit's P0-3): a string
// receipt (grep a marker in the built lib) passes on ANY lib built
// since that string first existed — a --no-build ship went fully
// green while this tree's fixes sat unshipped on the lane. The stamp
// records the src hash each lib was BUILT FROM; every ship
// (--no-build included) recomputes and compares, and a mismatch
// refuses: the lane would run a stale build of this tree.
// LC_ALL=C: the sort order is the hash input, and a locale-collated
// sort (en_US.UTF-8 interfiles case differently than C) made the
// stamp a function of the builder's locale — the committed stamp
// never matched a CI recompute (tiers lib-drift, 2026-10-30). The
// byte order rides Buffer.compare, not locale collation.
// The line spelling is sha256sum's own: `<digest>  src/<rel>\n`
// (two spaces) — the whole corpus is hashed as one string, first 16
// hex chars of the outer digest.
export function stampSrc(repo, pkgRel) {
  const pkgDir = join(repo, pkgRel);
  const files = srcFiles(pkgDir).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  let corpus = "";
  for (const f of files) {
    let digest;
    try { digest = sha256hex(readFileSync(join(pkgDir, f))); } catch { continue; }
    corpus += digest + "  " + f + "\n";
  }
  return sha256hex(corpus).slice(0, 16);
}

function writeStamp(pkgRel) {
  try {
    writeFileSync(join(REPO, pkgRel, "lib", ".src-stamp"), stampSrc(REPO, pkgRel));
  } catch { /* a package with no lib/ fails at verify, not here */ }
}

function verifyStamps(compiled, clientBundles) {
  let failed = 0;
  for (const p of [...compiled, ...clientBundles]) {
    // A MISSING lib IS A FAILURE, NOT A SKIP (the ship audit's hole
    // E: `[ -d lib ] || continue` let a never-built or git-cleaned
    // package walk past the very gate that proves the lane runs this
    // tree). A package with no lib has no receipt to verify, and the
    // lane would resolve an absent build.
    if (!existsSync(join(REPO, p, "lib"))) {
      bad(p + " — no lib/ to verify; the lane would resolve an absent build — build it (re-run WITHOUT --no-build)");
      failed = 1;
      continue;
    }
    const want = stampSrc(REPO, p);
    let have = "none";
    try { have = readFileSync(join(REPO, p, "lib", ".src-stamp"), "utf8").trim(); } catch { /* none */ }
    if (want !== have) {
      bad(p + " — lib is STALE (built from src " + have + ", this tree is src " + want + "); the lane would run the old code — re-run WITHOUT --no-build");
      failed = 1;
    }
  }
  if (failed === 0) ok("content stamps green (every lib matches the src it was built from)");
  return failed;
}

/** find lib -type f \( -name '*.js' -o -name '*.d.ts' \), byte-sorted. */
function libJsFiles(pkgDir) {
  const out = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".js") || e.name.endsWith(".d.ts")) out.push(p);
    }
  };
  walk(join(pkgDir, "lib"));
  return out.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

// since the last shipped marker — src alone is not the signal (the
// 2026-10-10 incident: image-gen's committed lib predated its src —
// `boarded` lacked flux-klein — while the committed .src-stamp claimed
// current; a src-only hash saw "no change" and the ship polled the
// stale lane for its whole activation window). tsc emits
// deterministically, so a no-op rebuild is byte-identical and a
// UI-only ship still skips the restart; any real lib drift trips it.
function nodeLibHash(pkgRel) {
  const files = libJsFiles(join(REPO, pkgRel));
  // the .sh era piped `sort -z` bare — locale-collated (the same
  // disease stamp_src's 2026-10-30 comment names); Buffer.compare is
  // the LC_ALL=C order, so the marker is builder-locale-independent
  files.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  const digests = files.map((f) => sha256hex(readFileSync(f)));
  // awk '{print $1}': the bare digest lines, one newline each
  const corpus = digests.length ? digests.join("\n") + "\n" : "";
  return sha256hex(corpus).slice(0, 16);
}

function nodeSrcHash(compiled) {
  let corpus = "";
  for (const p of compiled) corpus += p + " " + stampSrc(REPO, p) + " " + nodeLibHash(p) + "\n";
  return sha256hex(corpus).slice(0, 16);
}

/** The DSH layout law's dual face: a solution-only root compiles
 *  nothing — a dual-face package is judged through its leaves. */
function facesOf(tsdir) {
  return existsSync(join(tsdir, "tsconfig.host.json"))
    ? ["tsconfig.host.json", "tsconfig.client.json"]
    : ["tsconfig.json"];
}

/** One `node $TSC --noEmit -p $face` with output tee'd to a log.
 *  ASYNC on purpose: the net runs at width 8 (one pool, one tsc per
 *  package) — a spawnSync worker would block the event loop and pay
 *  the full serial CPU the width-8 law retired (cruft row 8). */
function typecheckFace(tsdir, face, tsc, logPath) {
  return new Promise((resolveFace) => {
    let fd = null;
    try { fd = logPath ? openSync(logPath, "w") : null; } catch { fd = null; }
    const out = fd === null ? "ignore" : fd;
    const child = spawn(process.execPath, [tsc, "--noEmit", "-p", face], { cwd: tsdir, stdio: ["ignore", out, out] });
    child.on("error", () => { if (fd !== null) try { closeSync(fd); } catch { /* closed */ } resolveFace(false); });
    child.on("close", (code) => { if (fd !== null) try { closeSync(fd); } catch { /* closed */ } resolveFace(code === 0); });
  });
}

/** A fixed-width worker pool (the xargs -P 8 shape). */
async function pool(items, width, worker) {
  let next = 0;
  const n = Math.min(width, items.length);
  await Promise.all(Array.from({ length: n }, async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i]);
    }
  }));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** lane log candidates: the unit's own DSH_HOME first, then the two
 *  conventional homes, then the caller's DSH_HOME if any. */
function laneLogCandidates() {
  const out = [];
  const env = sh("systemctl", ["--user", "show", UNIT, "-p", "Environment", "--value"]).out;
  for (const m of env.match(/DSH_HOME=[^ ]*/g) ?? []) {
    out.push(m.slice(m.indexOf("=") + 1) + "/melite-test-3088.log");
  }
  out.push(join(process.env.HOME ?? "", ".dsh-dev/melite-test-3088.log"));
  out.push(join(process.env.HOME ?? "", ".dsh/melite-test-3088.log"));
  if (process.env.DSH_HOME) out.push(process.env.DSH_HOME.replace(/\/$/, "") + "/melite-test-3088.log");
  return out;
}

/** curl's %{http_code} ("" when curl itself could not run). */
function curlCode(args) {
  const r = spawnSync("curl", args, { encoding: "utf8" });
  return (r.stdout ?? "").trim();
}

async function main() {
  // ---------------------------------------------------------------- args
  let DO_BUILD = 1;
  let CHECK_ONLY = 0;
  let unitOverride = 0;
  let originOverride = 0;
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--no-build") DO_BUILD = 0;
    else if (a === "--check") { CHECK_ONLY = 1; DO_BUILD = 0; }
    else if (a === "--unit") { UNIT = argv[++i] ?? ""; unitOverride = 1; }
    else if (a === "--origin") { ORIGIN = argv[++i] ?? ""; originOverride = 1; }
    else if (a === "-h" || a === "--help") {
      // the header comment block IS the help (lines 2-35 of this file)
      const self = readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n");
      for (const l of self.slice(1, 35)) console.log(l);
      process.exit(0);
    } else { process.stderr.write("unknown flag: " + a + "\n"); process.exit(2); }
  }

  // THE UNIT AND THE ORIGIN ARE ONE LANE (the ship audit's hole 3,
  // 2026-10-10): --unit restarts whatever it names and --origin probes
  // whatever it names, with nothing binding them — so a green ship
  // could restart unit A, prove origin B, and certify the wrong lane.
  // When EITHER is overridden, the script refuses the combination
  // unless BOTH name the sanctioned lane. (A second lane gets its own
  // playbook entry, not a flag soup.)
  if (unitOverride || originOverride) {
    if (UNIT !== SANCTIONED_UNIT || ORIGIN !== SANCTIONED_ORIGIN) {
      bad("--unit/--origin must name the sanctioned lane together (unit " + UNIT + ", origin " + ORIGIN + ")");
      console.log("        A ship that restarts one lane and proves another certifies nothing.");
      console.log("        Edit the defaults at the top of this script to move the lane.");
      process.exit(2);
    }
  }

  // ---------------------------------------------------------------- roster
  let COMPILED;
  try {
    COMPILED = deriveCompiled(REPO).map((p) => relative(REPO, p));
  } catch (e) {
    bad("no lib-entry package found — the node-half roster derivation returned nothing");
    process.exit(1);
  }
  if (COMPILED.length === 0) {
    bad("no lib-entry package found — the node-half roster derivation returned nothing");
    process.exit(1);
  }

  const CLIENT_BUNDLES = [
    // (2026-11-06) input-prep's crop-studio client face joined the
    // estate (the ANNY-style crop card, operator defect 3).
    "packages/image/input-prep",
    "packages/web/melite-card-view",
    "packages/web/melite-card-deck",
    "packages/web/infer-gallery",
    // (2026-11-12) media-preview's client face — the share door's
    // video/audio preview seat (the harness present toolcall's
    // channel).
    "packages/web/media-preview",
    // THE ONE-ROW LAW (operator order 2026-10-01): the card-base graph
    // row — the studio atoms compile ONCE here; every card client
    // requires it through the loader's module table.
    "packages/web/card-base",
    // THE ONE-ROW LAW FOR 3D (the multiple-copies cure, 2026-10-13):
    // the three graph row — three and its six addon modules compile
    // ONCE here; every 3D-touching client requires it through the
    // loader's module table.
    "packages/web/three-client",
  ];
  // Guard class of the typecheck nets (verifier b9cf8fc1 finding 1,
  // 2026-10-12): a discovery that dies on an unreadable packages/ tree
  // would hand the loop nothing and the hard-coded list would stand
  // silently as if discovered. Zero DISCOVERIES is a valid state (the
  // list is additive); a dead discovery is not — it exits loud. No
  // count assertion here on purpose.
  let discovered;
  try {
    discovered = discoverClientBundles(REPO);
  } catch {
    bad("the client-bundle discovery died (unreadable packages/ tree) — refusing to ship a silent fallback list");
    process.exit(1);
  }
  for (const cand of discovered) {
    if (!CLIENT_BUNDLES.includes(cand)) CLIENT_BUNDLES.push(cand);
  }
  say("the client bundles (discovered from the ./client exports): " + CLIENT_BUNDLES.join(" "));

  // ------------------------------------------------------- the gates
  // (THE AUDIT'S TWO HOLES, closed 2026-10-10: the builds used to run
  // FIRST, so a compiled package emitted its lib before any --noEmit
  // pass judged the tree — and with no noEmitOnError a red build still
  // emitted; and --no-build skipped the gates entirely, so a "restart
  // only" ship could leave port with red source. The gates now run
  // BEFORE the first emit, on EVERY ship, --no-build included.)
  // THE COMPILER IS DERIVED (tools/tsc-path.mjs) — the same helper the
  // repo tier (scripts/typecheck-tests.mjs) uses, so both seats judge
  // with ONE compiler. A literal store path dangles on the next
  // typescript bump; the helper follows the workspace's own resolution.
  const TSC = sh(process.execPath, [join(REPO, "tools", "tsc-path.mjs")]).out;
  if (!TSC) {
    bad("no tsc found (tools/tsc-path.mjs: no workspace link, no pnpm store copy, no PATH tsc)");
    process.exit(1);
  }

  // THE TYPECHECK NET (2026-10-10, the live ReferenceError): the lane
  // died mid-run on `assertWiringAtSubmit is not defined` — a call
  // whose import never landed, in a package that runs from SOURCE, so
  // no build step ever saw it. Every package with a tsconfig gets a
  // --noEmit pass, DISCOVERED dynamically (a named list is exactly the
  // list that rots — the five-package era is how thirty-five packages
  // went unheard). The COMPILED five are included too now (a full emit
  // subsumes noEmit, but the net runs before the builds and the build
  // order no longer carries the judgment).
  say("TYPECHECK every package (the ReferenceError class)");
  // The net runs at width 8 (cruft row 8, 2026-10-12): one pool over
  // the same dynamic discovery, one tsc --noEmit per package — the
  // serial loop paid the full serial CPU (minutes; the walls'
  // equivalent arm measured 30,578ms for 90 packages at this width).
  // Per-package logs land in a tmpdir; the reporting pass below stays
  // serial so failure output is byte-identical to the old loop's.
  // The discovery is GUARDED: a walk that dies on an unreadable
  // packages/ exits loud rather than handing the net nothing (the
  // pipeline-status law the find|grep pair carried).
  let tcDirs;
  try {
    tcDirs = discoverTsconfigDirs(REPO);
  } catch {
    bad("the typecheck discovery pipeline failed (unreadable packages/ tree or no tsconfig matched) — refusing to typecheck nothing");
    process.exit(1);
  }
  if (tcDirs.length === 0) {
    bad("the typecheck discovery pipeline failed (unreadable packages/ tree or no tsconfig matched) — refusing to typecheck nothing");
    process.exit(1);
  }
  const TCDIR = mkdtempSync(join(tmpdir(), "ship-tc."));
  try {
    await pool(tcDirs, 8, async (tsdir) => {
      const stem = join(TCDIR, tsdir.split("/").join("_"));
      let pass = true;
      for (const face of facesOf(tsdir)) {
        if (!(await typecheckFace(tsdir, face, TSC, stem + "." + face + ".log"))) pass = false;
      }
      if (pass) writeFileSync(stem + ".log.ok", "");
    });
    let TCFAIL = 0;
    const TCCOUNT = tcDirs.length;
    for (const tsdir of tcDirs) {
      const stemName = tsdir.split("/").join("_");
      const stem = join(TCDIR, stemName);
      if (!existsSync(stem + ".log.ok")) {
        bad(tsdir.replace(REPO + "/", "") + " — typecheck failed:");
        // glob order: stem.tsconfig.client.json.log < …host… < …tsconfig.json.log
        for (const face of [...facesOf(tsdir)].sort()) {
          const log = stem + "." + face + ".log";
          if (!existsSync(log) || statSync(log).size === 0) continue;
          console.log("        --- " + stemName + "." + face + ".log:");
          headIndented(log, 8);
        }
        TCFAIL = 1;
      }
    }
    if (TCCOUNT === 0) {
      bad("the typecheck net saw ZERO tsconfigs — the discovery fed it nothing; refusing to call that green");
      process.exit(1);
    }
    if (TCFAIL !== 0) {
      bad("the typecheck net is red — a missing import is invisible to every behavioural door");
      process.exit(1);
    }
    ok("typecheck net green (" + TCCOUNT + " tsconfigs seen)");
  } finally {
    rmSync(TCDIR, { recursive: true, force: true });
  }

  // THE TEST TIER (li-aq.3, the rules audit's HIGH-2): package
  // tsconfigs include src/** only — the SPEC files were typed by
  // nothing, and a spec importing a name a module never exported
  // (TS2724, live in 22 card-view files) was invisible to every wall.
  // One implementation, two callers: this script and the suite's
  // typecheck gate both run scripts/typecheck-tests.mjs (which now
  // carries the REPO TIER arm too — tools/ and the repo-level tests/).
  say("TYPECHECK the test tier + the repo tier (spec files are a plane; TS2724 is invisible to vitest)");
  const TCTIER_LOG = join(tmpdir(), "ship-tctier.log");
  const tier = spawnSync(process.execPath, ["scripts/typecheck-tests.mjs"], { cwd: REPO, encoding: "utf8" });
  writeFileSync(TCTIER_LOG, (tier.stdout ?? "") + (tier.stderr ?? ""));
  if (tier.status === 0) {
    const arms = (readFileSync(TCTIER_LOG, "utf8").match(/^✓/gm) ?? []).length;
    ok("test tier green (" + arms + " arms green)");
  } else {
    bad("the test tier is red — spec files typecheck against nothing:");
    headIndented(TCTIER_LOG, 14);
    process.exit(1);
  }

  // THE BUNDLE REPRO (cruft row 7, 2026-10-12): the committed lib/ of
  // melite-tools must rebuild byte-identical from a PRISTINE HEAD
  // worktree — the arm builds in its own git worktree (never this
  // live tree; the parallel-session law), so it certifies the COMMIT
  // the lane restarts onto, not the working tree's state. Before this
  // step the property had no automated caller: BUNDLE_REPRO was set
  // by nothing and the suite's single skipped test (the +1 in every
  // battery) was reachable only by a human typing the file's comment.
  // Cost: a hot store links in seconds; a cold one pays minutes once.
  // pnpm resolution mirrors the gate's own order (BUNDLE_REPRO_PNPM,
  // then npm_execpath, then PATH); this lane's pnpm lives outside PATH,
  // so the step names it explicitly the way TSC is named above.
  let PNPM_BIN = which("pnpm");
  if (!PNPM_BIN && existsSync(join(process.env.HOME ?? "", ".local/share/pnpm/pnpm"))) {
    PNPM_BIN = join(process.env.HOME, ".local/share/pnpm/pnpm");
  }
  if (!PNPM_BIN) {
    bad("no pnpm resolvable for the bundle repro (looked on PATH and at ~/.local/share/pnpm/pnpm)");
    process.exit(1);
  }
  say("BUNDLE REPRO (the committed bundle rebuilds byte-identical from pristine HEAD)");
  const REPRO_LOG = join(tmpdir(), "ship-bundle-repro.log");
  const repro = spawnSync(PNPM_BIN, ["exec", "vitest", "run", "packages/harness/melite-tools/test/bundle-repro.spec.ts"], {
    cwd: REPO, encoding: "utf8", env: { ...process.env, BUNDLE_REPRO: "1", BUNDLE_REPRO_PNPM: PNPM_BIN },
  });
  writeFileSync(REPRO_LOG, (repro.stdout ?? "") + (repro.stderr ?? ""));
  if (repro.status === 0) {
    ok("bundle repro green (committed lib/ == pristine HEAD rebuild)");
  } else {
    bad("the committed bundle does not rebuild from pristine HEAD:");
    headIndented(REPRO_LOG, 14);
    process.exit(1);
  }

  // ---------------------------------------------------------------- build
  if (DO_BUILD === 1) {
    say("BUILD the compiled-lib packages (a restart alone ships the OLD code)");
    for (const p of COMPILED) {
      const BUILD_LOG = join(tmpdir(), "ship-build.log");
      const built = spawnSync(process.execPath, [TSC, "-p", "tsconfig.json"], { cwd: join(REPO, p), encoding: "utf8" });
      writeFileSync(BUILD_LOG, (built.stdout ?? "") + (built.stderr ?? ""));
      if (built.status === 0) {
        // THE D.TS REWRITE PASS (wave 21's repeat wedge, wired
        // 2026-11-06): tsc's declaration emit still writes
        // `from "./x.ts"` while the JS emit writes .js — a bare-tsc
        // rebuild flips every d.ts back and the gate wall reds three
        // weeks later. The pass runs after EVERY emit, before the
        // stamp; a refusal fails the ship (never walk past a red).
        const dts = spawnSync(process.execPath, [join(REPO, "scripts", "rewrite-dts-specifiers.mjs"), p], { cwd: REPO, encoding: "utf8" });
        writeFileSync(join(tmpdir(), "ship-dts.log"), (dts.stdout ?? "") + (dts.stderr ?? ""));
        if (dts.status !== 0) {
          bad(p + " — the d.ts rewrite pass refused (no lib/ under it?):");
          headIndented(join(tmpdir(), "ship-dts.log"), 4);
          process.exit(1);
        }
        // THE TYPERT DOORS (the estate four): their generator owns lib
        // doors tsc never emits — the same regen the canonical build
        // runs for in-scope packages. A ship without it serves stale
        // typert doors whenever their inputs moved.
        if (existsSync(join(REPO, p, "scripts", "typert.mjs"))) {
          const typert = spawnSync(process.execPath, ["scripts/typert.mjs"], { cwd: join(REPO, p), encoding: "utf8" });
          writeFileSync(join(tmpdir(), "ship-typert.log"), (typert.stdout ?? "") + (typert.stderr ?? ""));
          if (typert.status !== 0) {
            bad(p + " — the typert regen refused:");
            headIndented(join(tmpdir(), "ship-typert.log"), 4);
            process.exit(1);
          }
        }
        // THE CANONICAL FINISH (the v0.2.3-rc.1 ship day): tsc's emit
        // is BARE — maps and text files land without the final newline
        // the file-end law requires, and the next commit reds the
        // freshness wall over damage a ship left sitting. The same two
        // passes the canonical build runs finish here: maps compact +
        // one trailing newline, lib text exactly one. Most COMPILED
        // packages run noEmit (nothing to finish — the passes no-op in
        // milliseconds); the emitting minority is the estate four.
        const libDir = join(REPO, p, "lib");
        const maps = [];
        const walkMaps = (dir) => {
          let entries;
          try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
          for (const e of entries) {
            const q = join(dir, e.name);
            if (e.isDirectory()) walkMaps(q);
            else if (e.name.endsWith(".map")) maps.push(relative(REPO, q));
          }
        };
        walkMaps(libDir);
        if (maps.length > 0) {
          const canon = spawnSync(process.execPath, ["scripts/canonicalize-sourcemaps.mjs", ...maps], { cwd: REPO, encoding: "utf8" });
          if (canon.status !== 0) {
            bad(p + " — the map canonicalization pass refused");
            process.exit(1);
          }
        }
        // the final-newline half of the canonical finish, in-process
        // (ensureFinalNewlines is build-plane's own pass — same call
        // the shell era made through a node --input-type=module -e)
        try {
          const plane = await import(pathToFileURL(join(REPO, "tools", "build-plane.mjs")).href);
          await plane.ensureFinalNewlines(join(REPO, p, "lib"));
        } catch {
          bad(p + " — the final-newline pass refused");
          process.exit(1);
        }
        writeStamp(p);
        ok(p);
      } else {
        bad(p + " — build failed (noEmitOnError: no lib was emitted):");
        headIndented(BUILD_LOG, 12);
        process.exit(1);
      }
    }
    // The receipt that matters: the lane seat must be IN the built door.
    const door = join(REPO, "packages/estate/drafts/lib/remote.js");
    if (existsSync(door) && readFileSync(door, "utf8").includes("bench/lane-refusal")) {
      ok("the built door carries the lane seat (bench/lane-refusal present)");
    } else {
      bad("the built door has NO lane seat — the source and the build disagree");
      process.exit(1);
    }
    // the browser's half — a MISSING package is a FAILURE, not a
    // skip (the ship audit's hole 1: `[ ! -d ] && continue` let a
    // renamed web package ship green with the browser 404ing)
    for (const p of CLIENT_BUNDLES) {
      if (!existsSync(join(REPO, p))) {
        bad(p + " — the declared client bundle does not exist; the browser would 404");
        process.exit(1);
      }
      const CLIENT_LOG = join(tmpdir(), "ship-client.log");
      const client = spawnSync(process.execPath, ["node_modules/tsdown/dist/run.mjs", "-c", "tsdown.config.ts"], { cwd: join(REPO, p), encoding: "utf8" });
      writeFileSync(CLIENT_LOG, (client.stdout ?? "") + (client.stderr ?? ""));
      if (client.status === 0) {
        writeStamp(p);
        ok(p + " client bundle");
      } else {
        bad(p + " client bundle — build failed:");
        headIndented(CLIENT_LOG, 12);
        process.exit(1);
      }
      // THE BUNDLE MUST EXIST AFTER THE BUILD (the audit's hole B:
      // a build that emits nothing still "succeeds" — the browser
      // would then fetch a stale or missing file under a new stamp)
      if (!existsSync(join(REPO, p, "lib", "client.js"))) {
        bad(p + " — the build emitted no lib/client.js; the browser has no bundle to fetch");
        process.exit(1);
      }
    }
    // the receipt the operator cares about: NO bundle the browser
    // fetches may carry a face we deleted. THE VOCABULARY IS DERIVED
    // (the li-ba stroke, 2026-10-11): the gate used to grep ONE
    // literal ("STALE TAB") on ONE bundle while the walls' own helper
    // spells the full five-pattern ban — four faces (cards-stale-build,
    // staleBuild, buildVerdict, the case-folded spelling) could ride
    // any OTHER bundle green. The helper is the ONE owner (a wall
    // tool, node-only — it never rides into a browser bundle); the
    // gate extracts its regex bodies and judges EVERY client bundle.
    const vocabPath = join(REPO, "tests/walls/helpers/stale-tab-vocabulary.ts");
    const bodies = [];
    for (const line of readFileSync(vocabPath, "utf8").split("\n")) {
      const m = line.match(/^  \/(.*)\/i?,$/);
      if (m) bodies.push(m[1]);
    }
    const STALE_RE = bodies.join("|");
    if (STALE_RE.split("|").length - 1 < 4) {
      bad("the stale-face extraction rotted (got '" + (STALE_RE || "<empty>") + "' from tests/walls/helpers/stale-tab-vocabulary.ts) — the gate would judge nothing");
      process.exit(1);
    }
    for (const p of CLIENT_BUNDLES) {
      let carries = false;
      try {
        carries = new RegExp(STALE_RE, "i").test(readFileSync(join(REPO, p, "lib", "client.js"), "utf8"));
      } catch { /* unreadable bundle: no match — the existence gates above own it */ }
      if (carries) {
        bad(p + "/lib/client.js still carries a removed stale-tab face (vocabulary: tests/walls/helpers/stale-tab-vocabulary.ts) — the browser would show it");
        process.exit(1);
      }
    }
    ok("no client bundle carries a removed face");
    // THE POST-EMIT NET (the ship audit's stale-.d.ts hole, 2026-10-10):
    // the typecheck above ran BEFORE the build, so every src-run
    // package judged its imports against the compiled packages' OLD
    // lib/*.d.ts — a renamed export in drafts went green, the build
    // emitted the rename, and the lane crashed at boot on a missing
    // import. The net re-runs AFTER the emit: now the .d.ts files are
    // this tree's, and a stale-shaped consumer is red.
    say("TYPECHECK AGAINST THE EMITTED LIBS (the pre-build net judged stale .d.ts files)");
    let POSTFAIL = 0;
    const POST_LOG = join(tmpdir(), "ship-posttc.log");
    for (const tsdir of tcDirs) {
      for (const face of facesOf(tsdir)) {
        if (!(await typecheckFace(tsdir, face, TSC, POST_LOG))) {
          bad(tsdir.replace(REPO + "/", "") + " [" + face + "] — red against the JUST-BUILT libs:");
          headIndented(POST_LOG, 8);
          POSTFAIL = 1;
        }
      }
    }
    if (POSTFAIL !== 0) {
      bad("the post-emit net is red — the build produced types the tree does not consume");
      process.exit(1);
    }
    ok("post-emit net green (every package typechecks against this build)");
  }
  // THE STAMP VERIFICATION RIDES EVERY SHIP (--no-build keeps every
  // gate — this one included): a green ship must prove the lane runs
  // THIS tree, behavior-only fixes and all.
  if (verifyStamps(COMPILED, CLIENT_BUNDLES) !== 0) process.exit(1);

  // ---------------------------------------------------------------- restart
  // THE RESTART IS FOR THE NODE HALF ONLY (2026-10-13, the DSH-ship
  // audit). DSH mounts `@deepseek-ai/dsh-client-hmr` on the lane: it
  // stat-polls every graph row's client bundle every 500ms and pushes
  // `rebuilt` frames over the /plugins/events SSE channel, so a rebuilt
  // client bundle reaches the operator's open tab with NO restart
  // (proved on the live lane: a `tsdown` run on infer-gallery emitted
  // `{"type":"rebuilt","id":"@melite-plugin/dsh-gallery"}`). Node half is
  // different — the running host imported and cached its modules at boot,
  // so a changed node-half package still needs the restart.
  const SHIPPED_MARKER = join(REPO, ".scratch/ship-node-half.stamp");
  let shippedBefore = "none";
  try { shippedBefore = readFileSync(SHIPPED_MARKER, "utf8").trim(); } catch { /* none yet */ }
  const nodeNow = nodeSrcHash(COMPILED);
  const nodeChanged = shippedBefore !== nodeNow;
  if (CHECK_ONLY === 0) {
    if (nodeChanged === true) {
      say("RESTART " + UNIT + " (the node half changed since the last ship)");
      const r = spawnSync("systemctl", ["--user", "restart", UNIT], { stdio: "inherit" });
      if (r.status !== 0) { bad("restart failed"); process.exit(1); }
      ok("restart issued");
    } else {
      ok("node half unchanged — no restart; dsh-client-hmr carries the rebuilt bundles to the browser (SSE rebuilt frames)");
    }
    mkdirSync(dirname(SHIPPED_MARKER), { recursive: true });
    writeFileSync(SHIPPED_MARKER, nodeNow);
  }

  // ------------------------------------------------------- operator session
  // THE /v1 FENCE (li-eo, 2026-10-16): the run plane is fenced with
  // DSH's own connection.requestRejection — the anonymous curl the
  // earlier ship relied on now answers 401 connection/unauthenticated.
  // The sanctioned non-browser path is the lane's own launch token
  // (connection/src/browser-auth.ts:241-258): GET /?token=<launch>
  // mints the authority-bound session cookie, and that cookie speaks
  // for the operator on every later request. The token is the lane's
  // own authentication input, printed to the operator's lane log at
  // boot — no second auth surface is invented here. The mint rides
  // INSIDE the activation wait: while the estate composes, even the
  // index answers with the not-yet voice, so an early one-shot mint
  // races the boot and fails 401. The lane log is DISCOVERED, never
  // assumed: $DSH_HOME names the caller's dsh home (a GUI-launched
  // ship inherits the GUI's), which may hold a STALE lane log whose
  // tokens died with an old process — so every candidate is tried by
  // MINTING, and only a 303 pins the session.
  const COOKIE_JAR = join(tmpdir(), "ship-cookies." + process.pid + ".txt");
  try {
    // -------------------------------------------------------------- wait
    say("WAIT for the activation gate (minting the operator session as it settles)");
    let settled = 0;
    const ENSURE_JSON = join(tmpdir(), "ship-ensure.json");
    outer:
    for (let i = 1; i <= 24; i++) {
      await sleep(10_000);
      const seen = new Set();
      for (const log of laneLogCandidates()) {
        if (seen.has(log)) continue;
        seen.add(log);
        if (!existsSync(log)) continue;
        let token = "";
        try {
          const hits = readFileSync(log, "utf8").match(/dsh web: http:\/\/\S*\?token=\S*/g) ?? [];
          if (hits.length > 0) token = hits[hits.length - 1].replace(/^.*\?token=/, "");
        } catch { continue; }
        if (!token) continue;
        const mint = curlCode(["-sk", "-m", "20", "-c", COOKIE_JAR, "-o", "/dev/null", "-w", "%{http_code}", ORIGIN + "/?token=" + token]);
        if (mint !== "303" && mint !== "200") continue;
        const code = curlCode(["-sk", "-m", "20", "-b", COOKIE_JAR, "-o", ENSURE_JSON, "-w", "%{http_code}",
          "-X", "POST", ORIGIN + "/v1/bench/ensure",
          "-H", "content-type: application/json", "-d", '{"session":"ship-lane-probe"}']);
        if (code === "200") {
          ok("operator session minted (from " + log + "); bench plane answered after ~" + (i * 10) + "s");
          settled = 1;
          break outer;
        }
        console.log("   ... " + String(i * 10).padStart(3) + "s: mint " + mint + ", ensure " + code + " (from " + log + ")");
        break;
      }
      if (settled === 1) break;
    }
    if (settled === 0) {
      bad("the bench plane never answered.");
      console.log("        The estate stays 'activating' when a row keeps re-applying.");
      console.log("        Read the lane log for the repeating row (the usual culprit is");
      console.log("        an MCP client row that flaps) — candidates, unit home first:");
      for (const c of laneLogCandidates()) console.log('          grep -vE "^\\$|Blender" ' + c);
      process.exit(1);
    }

    // ---------------------------------------------------------------- prove
    // BEHAVIOUR, NEVER A STAMP. Two refusals and one admission: the model
    // board, the lane law, and the cure.
    say("PROVE the lane runs this tree (behaviour, not face_stamp)");

    const PROBE_JSON = join(tmpdir(), "ship-probe.json");
    const post = (path, json) => curlCode(["-sk", "-m", "30", "-b", COOKIE_JAR, "-o", PROBE_JSON, "-w", "%{http_code}",
      "-X", "POST", ORIGIN + path, "-H", "content-type: application/json", "-d", json]);
    const probeBody = () => { try { return readFileSync(PROBE_JSON, "utf8"); } catch { return ""; } };

    // THE PROOF RIDES ITS OWN BENCH (the CAS lesson, 2026-11-11): the
    // probes used to post to /v1/bench/main/<verb> while reading the rev
    // the ensure minted for session "ship-lane-probe" — two different
    // benches. On a virgin lane the pair coincided (both rev 0) and the
    // proof passed; the first ship against a LIVED-IN lane answered
    // bench/cas-conflict (main sat at rev 47, the probe bench at 0) and
    // the red read like a doors failure. One bench for the whole proof:
    // the session the ensure created, at the rev $rev names — and the
    // operator's main bench is never written by a ship again (the old
    // probe stage landed ON the operator's bench and trusted a cleanup
    // remove to leave it as it was).
    const BENCH = "ship-lane-probe";
    let rev = 0;
    try { rev = JSON.parse(readFileSync(ENSURE_JSON, "utf8")).rev ?? 0; } catch { rev = 0; }

    // 1. the model board (the OLD law — proves the doors row answers at all)
    // FATAL (the ship audit's hole 2: this probe printed FAIL and the
    // script still printed SHIPPED — a fail-open model board shipped
    // green. A gate that cannot fail is a log line.)
    let code = post("/v1/bench/" + BENCH + "/add_stage",
      '{"card":"tts","params":{"model":"definitely-not-a-model","text":"x"},"expect_rev":' + rev + "}");
    if (code === "400" && probeBody().includes("bench/bad-model")) {
      ok("the model board refuses an unknown model");
    } else {
      bad("the model board did not refuse (HTTP " + code + ") — the doors row is wrong");
      process.exit(1);
    }

    // 1b. THE DECLARED LANE LAW RIDES THE LANE (the DECL audit's gap 1
    // closing in production). NOTE THE LAW MOVED TWICE: the write door
    // admits an unstated required word (the RUN seat is the strict
    // door), and the resolution span RETIRED (2026-11-08: the stated
    // pair sizes the render through the lane's own wiring — the shared
    // size law judges integers at every seat, never a DECL span; the
    // v0.2.3-rc.1 ship day caught this probe posting width:-50 into a
    // door that no longer bounds width). The write-time refusal that
    // still proves the DECL rows are LIVE is the VARIANT RAIL's
    // envelope: a stated steps outside the variant's declared envelope
    // (the turbo route is married to its steps) refuses HERE, through
    // the same door the agent crosses — a lane whose variant rows never
    // reached it would admit the burn and ship green.
    code = post("/v1/bench/" + BENCH + "/add_stage",
      '{"card":"image-edit","params":{"model":"qwen-img-edit-21","prompt":"make it night","image1":"x.png","steps":999},"expect_rev":' + rev + "}");
    if (code === "400" && probeBody().includes("route envelope")) {
      ok("the variant rail's declared envelope refuses an out-of-envelope steps at write time (the DECL rows are live)");
    } else {
      bad("the edit lane's DECL rows did not fire (HTTP " + code + ") — the lane is running an OLD build or the rows never reached it");
      process.exit(1);
    }

    // 2. the lane law (the NEW law — this is the one a stale build loses).
    // NOTE THE INCIDENT MOVED (the v0.2.3-rc.1 ship day): the old probe
    // posted design_prompt WITHOUT voice_name — that incident retired
    // when the customvoice surface was restated (design_prompt fires
    // nothing on this lane now; the surface is text, temperature, top_p,
    // top_k, speed, repetition_penalty, seed, voice, style_instruction).
    // The live lane law: a field OFF the variant's declared surface
    // refuses LOUD — a stale build serves the old surface and admits.
    code = post("/v1/bench/" + BENCH + "/add_stage",
      '{"card":"tts","params":{"model":"qwen3-tts","variant":"customvoice","text":"x","design_prompt":"a warm narrator"},"expect_rev":' + rev + "}");
    if (code === "400" && probeBody().includes("bench/lane-refusal")) {
      ok("the lane law refuses a field off the declared surface (incident A, restated)");
    } else {
      bad("THE LANE LAW DID NOT FIRE (HTTP " + code + ") — this lane is running an OLD build.");
      console.log("        For source-only changes: re-run WITHOUT --no-build.");
      console.log("        For a change in the five compiled packages, the rebuild step");
      console.log("        above is what carries it; check scripts/ship-lane.mjs's COMPILED list.");
      process.exit(1);
    }

    // 3. the cure lands (a door that refuses everything is not a working
    // door): drop the dead field and the plain state on the declared
    // surface admits.
    code = post("/v1/bench/" + BENCH + "/add_stage",
      '{"card":"tts","params":{"model":"qwen3-tts","variant":"customvoice","text":"x"},"expect_rev":' + rev + "}");
    if (code === "200") {
      let stage = "";
      try { stage = JSON.parse(probeBody()).stage ?? ""; } catch { stage = ""; }
      ok("the cured state lands (stage " + stage + ")");
      say("CLEAN UP the probe stage");
      const rev2 = post("/v1/bench/" + BENCH + "/remove_stage",
        '{"stage":"' + stage + '","expect_rev":' + (rev + 1) + "}");
      if (rev2 === "200") {
        ok("probe stage removed — the probe bench is as it was");
      } else {
        bad("could not remove the probe stage " + stage + " (HTTP " + rev2 + ") — remove it by hand");
      }
    } else {
      bad("the cured state was refused too (HTTP " + code + ") — the lane is over-refusing");
      process.exit(1);
    }

    // 4. the served surfaces carry the declaration (the form + the agent)
    // FATAL for the same reason as probe 1: a gateless form or a blind
    // agent face printed FAIL and the script still said SHIPPED. The
    // agent's PRIMARY face (the melite_load bundle) is checked here too —
    // that is the face the DECL audit found carrying no lanes at all.
    say("CHECK the served declaration");
    const getJson = (path, timeout) => {
      const r = spawnSync("curl", ["-sk", "-b", COOKIE_JAR, "-m", String(timeout), ORIGIN + path], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      return JSON.parse(r.stdout ?? "");
    };
    try {
      if ("lanes" in getJson("/v1/form-spec?model=qwen3-tts", 20)) {
        ok("/v1/form-spec serves the lanes block (the form gates from the DECL)");
      } else {
        bad("the form-spec has no lanes block — the form cannot gate");
        process.exit(1);
      }
    } catch {
      bad("the form-spec has no lanes block — the form cannot gate");
      process.exit(1);
    }
    try {
      if (getJson("/v1/card-tools", 20).some((r) => "lanes" in r)) {
        ok("/v1/card-tools carries the agent's lane contract");
      } else {
        bad("the card-tools manifest has no lanes — the agent composes blind");
        process.exit(1);
      }
    } catch {
      bad("the card-tools manifest has no lanes — the agent composes blind");
      process.exit(1);
    }
    try {
      const sig = getJson("/v1/load?name=tts&inference_type=card", 30).bundle.signature;
      if (sig && typeof sig === "object" && "lanes" in sig) {
        ok("/v1/load carries the lane contract (melite_load's primary face)");
      } else {
        bad("the load bundle signature has no lanes — the agent's main contract face says nothing");
        process.exit(1);
      }
    } catch {
      bad("the load bundle signature has no lanes — the agent's main contract face says nothing");
      process.exit(1);
    }

    say("SHIPPED");
    console.log("   lane:  " + ORIGIN);
    console.log("   unit:  " + UNIT);
    console.log("   proofs: model board refuses, the declared edit lane refuses, the lane");
    console.log("           law refuses, the cure lands, all three declaration surfaces serve.");
  } finally {
    try { rmSync(COOKIE_JAR, { force: true }); } catch { /* best effort */ }
  }
}

const invokedDirectly = process.argv[1]
  && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (invokedDirectly) {
  await main();
}
