#!/usr/bin/env node
// e2e-studio-lane.mjs — THE BROWSER-WALL CI SEAT (roadmap §9).
//
// The cookbook audit (ledger #49) proved the browser-plane wall
// unrunnable from a fresh checkout: the lane recipe (throwaway home,
// workspace seed, MELITE_STATE_ROOT pin) lived only in
// packages/web/melite-card-view/e2e/README.md. THIS script owns the
// recipe verbatim — one source of truth; the README points here.
//
// Law (the spec's own keyless gate): self-skips when it cannot own
// the lane — port busy or E2E_STUDIO_URL already exported (a host
// is up; the caller reuses it) — exit 0, never a fake red.
//
// FLAGS (the operator no-env law, 2026-11-16 — the promote-prod
// shape): --agent-route provider/model seats a real brain in the
// minted patch (the AI KEY/ROUTE seats below; unset = keyless, the
// CI law) · --credentials PATH is the refs file the brain's keys
// merge from (default ~/.dsh/.credentials.yaml) · --llm-rows PATH
// is the rows file the provider table splices from (default
// dev_docs/deployment/studio-lane-rows.yml); every other argument
// passes through to playwright verbatim. The lane-identity knobs
// (E2E_STUDIO_PORT/HOME/RUNS_ROOT/REQUIRE/URL/DECK) stay env —
// the CI/specs' test-lane switches (audit step (c)), not this
// launcher's knobs.
//
// Node port of the retired e2e-studio-lane.sh (operator law: npm + python only,
// zero shell scripts remain). The REPO_ROOT derivation rides
// import.meta.url instead of BASH_SOURCE: the spec's stub-PATH seat
// runs this script with NOTHING resolvable — dirname must never
// stand between the prereq gates and their verdict.

import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  accessSync,
  appendFileSync,
  chmodSync,
  closeSync,
  constants as fsConstants,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { checkLaneFreshness } from "./lib/lane-freshness.mjs";

class ExitError extends Error {
  /** @param {number} code */
  constructor(code) {
    super(`exit ${code}`);
    this.code = code;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readFileOr(p, fallback) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return fallback;
  }
}

// The mise/node PATH pin the supervisor carries — pinned HERE, not
// globally: a global pin would resolve dsh/pnpm even when the
// caller's PATH lacks them and defeat the skip laws below-fraction.
function pinnedPathEnv(extra = {}) {
  return {
    ...process.env,
    ...extra,
    PATH:
      `${os.homedir()}/.local/share/mise/installs/node/24.21.0/bin` +
      path.delimiter +
      `${os.homedir()}/.local/bin` +
      path.delimiter +
      (process.env.PATH ?? ""),
  };
}

// bash `command not found` → 127; signal death → 128+signo.
function exitCodeOf(r) {
  if (r.error) return 127;
  if (r.status !== null) return r.status;
  return 128 + (r.signal ? (os.constants.signals[r.signal] ?? 0) : 0);
}

function procAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e?.code === "EPERM"; // EPERM = exists, unpermitted
  }
}

// tail -N FILE (missing/empty file → "")
function logTail(file, n) {
  const lines = readFileOr(file, "").split("\n");
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  return lines.slice(-n).join("\n");
}

function logContains(file, needle) {
  return readFileOr(file, "").includes(needle);
}

// grep -n PATTERN FILE → [{n, line}, ...] (1-based)
function grepNumbered(file, pred) {
  return readFileOr(file, "")
    .split("\n")
    .map((line, i) => ({ n: i + 1, line }))
    .filter((e) => pred(e.line));
}

// grep -o PATTERN FILE | tail -1 → matched text or ""
function lastMatch(file, re) {
  const ms = [...readFileOr(file, "").matchAll(new RegExp(re.source, "g"))];
  return ms.length ? ms[ms.length - 1][0] : "";
}

// `command -v BIN` — resolvable executable file on PATH.
function resolveOnPath(bin) {
  if (bin.includes(path.sep)) return isFile(bin);
  const exts =
    process.platform === "win32"
      ? ["", ...(process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";")]
      : [""];
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      const p = path.join(dir, bin + ext);
      try {
        if (!statSync(p).isFile()) continue;
        accessSync(p, fsConstants.X_OK);
        return true;
      } catch {
        /* keep scanning */
      }
    }
  }
  return false;
}

// `[ -f ./.env ] && . ./.env` — deployment env loaded; existing env
// wins, quoted values unwrapped, `export` prefixes tolerated.
function loadDotEnv(file) {
  if (!isFile(file)) return;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return;
  }
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

// The lane's run-grammar block extractor — the awk splice verbatim:
// from `^- id: ROW$` up to (not including) the next distinct `- id:`.
function extractRow(rowsText, rowId) {
  const rowRe = new RegExp(`^- id: ${rowId}$`);
  const out = [];
  let f = false;
  for (const line of rowsText.split("\n")) {
    if (f && /^- id:/.test(line) && !rowRe.test(line)) break;
    if (f) out.push(line);
    else if (rowRe.test(line)) {
      f = true;
      out.push(line);
    }
  }
  return out;
}

// The seed's portable relative `link:` targets are SEED-DEPTH-correct:
// resolve each where the seed lives, stamp the absolute target into
// the copy, then refuse dead links before pnpm sees them.
function rewriteSeedLinks(home, seed) {
  const pkg = path.join(home, "package.json");
  const doc = JSON.parse(readFileSync(pkg, "utf8"));
  const deps = {};
  for (const [name, ref] of Object.entries(doc.dependencies ?? {})) {
    if (
      typeof ref === "string" &&
      ref.startsWith("link:") &&
      !path.isAbsolute(ref.slice(5))
    ) {
      deps[name] = "link:" + path.normalize(path.join(seed, ref.slice(5)));
    } else {
      deps[name] = ref;
    }
  }
  doc.dependencies = deps;
  writeFileSync(pkg, JSON.stringify(doc, null, 2));
  const dead = Object.entries(deps)
    .filter(
      ([, r]) =>
        typeof r === "string" && r.startsWith("link:") && !existsSync(r.slice(5)),
    )
    .map(([n]) => n);
  if (dead.length) {
    console.error(
      `[e2e-studio-lane] seed rewrite left dead links [${dead
        .map((n) => `'${n}'`)
        .join(", ")}]`,
    );
    throw new ExitError(1);
  }
}

// D6 KEYLESS ROW-NAME WALL: a settings row carrying a provider table
// (`providers:` subtree) would silently hand this KEYLESS lane an LLM
// subject. Refuse the copy naming the row (names only — the guard
// reads keys, never values).
function refuseKeyedSettings(settingsText) {
  const keyed = [];
  for (const m of settingsText.matchAll(
    /^([A-Za-z0-9_-]+):\n(?:  .*\n)*?  providers:/gm,
  )) {
    if (!keyed.includes(m[1])) keyed.push(m[1]);
  }
  return keyed;
}

// Credential refs parser: the `refs:` block's `  NAME: value` rows.
function readRefs(text) {
  const refs = {};
  let inRefs = false;
  for (const line of text.split("\n")) {
    if (/^refs:\s*$/.test(line)) {
      inRefs = true;
      continue;
    }
    if (inRefs) {
      const m = line.match(/^  ([A-Za-z0-9_]+): (.+)$/);
      if (m) refs[m[1]] = m[2];
      else if (line && !line.startsWith("  ")) inRefs = false;
    }
  }
  return refs;
}

async function main() {
  // THE LANE IDENTITY KNOBS (GOAL-2, 2026-10-24): a second lane can
  // boot BESIDE a standing host (the operator's GUI can own :3907 —
  // booting over it is never allowed, and its home/runs root are LIVE
  // state). Every path is per-lane: the port-suffixed /tmp artifacts
  // can never collide across lanes. Defaults are the historical single
  // lane, byte-identical when the knobs are unset.
  const PORT = process.env.E2E_STUDIO_PORT || "3907";
  const HOME_DIR = process.env.E2E_STUDIO_HOME || "data/runtime/e2e-studio-home";
  const RUNS_ROOT = process.env.E2E_STUDIO_RUNS_ROOT || "/tmp/e2e-studio-runs";
  const COOKIES = `/tmp/e2e-studio-cookies-${PORT}.txt`;
  const LOG = `/tmp/e2e-studio-lane-${PORT}.log`;

  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  process.chdir(repoRoot);

  // THE F1 FRESHNESS GATE (HMR audit 009, 2026-10-24): a lane serves
  // lib/ from the repo tree, so a package whose src drifted past its
  // built lib would have every lane receipt attest a product that is
  // not the tree (two receipted outages taught this class). The gate
  // rides the stamp's own recipe; the named cure is the rebuild.
  // Refusal happens BEFORE any boot — a stale lane never starts.
  const fresh = await checkLaneFreshness(repoRoot);
  if (!fresh.ok) {
    for (const offender of fresh.offenders) console.error("  " + offender);
    console.error(
      "[lane-freshness] cure: node tools/build-plane.mjs build <pkg> (or the whole tree), then re-drive.",
    );
    console.error(
      "[e2e-studio-lane] refusing to boot on stale lib planes (the F1 gate)",
    );
    process.exit(1);
  }

  // deployment env (.env is gitignored; .env.example documents every knob)
  loadDotEnv(".env"); // env-file loaded
  const DSH_BIN = process.env.DSH_BIN || "dsh";
  const CARD_VIEW_FILTER =
    process.env.CARD_VIEW_FILTER || "@melite-plugin/dsh-card-view";

  // ── flags (the no-env law) ────────────────────────────────────────
  let agentRoute = "";
  let credSrc = path.join(os.homedir(), ".dsh", ".credentials.yaml");
  let llmRows = path.join(repoRoot, "dev_docs", "deployment", "studio-lane-rows.yml");
  const laneArgs = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const need = (msg) => {
      console.error(`e2e-studio-lane: ${msg}`);
      process.exit(1);
    };
    if (flag === "--agent-route") {
      const v = args[++i];
      if (v === undefined || v === "") need("--agent-route needs provider/model");
      agentRoute = v;
    } else if (flag === "--credentials") {
      const v = args[++i];
      if (v === undefined || v === "") need("--credentials needs a refs file");
      credSrc = v;
    } else if (flag === "--llm-rows") {
      const v = args[++i];
      if (v === undefined || v === "") need("--llm-rows needs a rows file");
      llmRows = v;
    } else {
      laneArgs.push(flag);
    }
  }

  // THE TRACKED SEED IS THE SEAT'S ONLY SEED (2026-10-12, the moss-404
  // lesson): a live dev profile arms the G2 hot door through
  // cordis.patch.yml — its patch watcher can mount→dispose→remount that
  // row MID-RUN, and the every-card wall boards a card the estate then
  // un-serves under it (form-spec 404s land as page errors; the defs
  // refresh blanks neighbor axes). A wall seat asserts STABLE serving:
  // it boots the committed, seed-only profile — deterministic,
  // fresh-checkout-true. Operator pins ride settings.yaml (copied
  // separately below), never the profile.
  const TRACKED_SEED = "packages/web/melite-card-view/e2e/profile-seed";
  let SEED_DIR = "";
  if (isDir(TRACKED_SEED)) {
    SEED_DIR = TRACKED_SEED;
  } else {
    skipOrFail(`no profile seed (${TRACKED_SEED})`);
  }

  // THE REQUIRE MODE (the CI prerequisite law): E2E_STUDIO_REQUIRE=1
  // flips every skip law from exit-0 to a LOUD failure naming the
  // missing prerequisite — a self-skip can never green a CI seat
  // again. Local boots keep the skip laws (never a fake red).
  function skipOrFail(msg) {
    if (process.env.E2E_STUDIO_REQUIRE) {
      console.error(
        `[e2e-studio-lane] REQUIRED prerequisite missing: ${msg} (E2E_STUDIO_REQUIRE=1 refuses the skip)`,
      );
      process.exit(1);
    }
    console.log(`[e2e-studio-lane] ${msg}; SKIP (exit 0)`);
    process.exit(0);
  }

  // ── the skip laws (never a fake red — unless REQUIRED) ───────────
  if (process.env.E2E_STUDIO_URL) {
    console.log("[e2e-studio-lane] E2E_STUDIO_URL set — reusing the standing host");
    const r = spawnSync(
      "pnpm",
      ["--filter", CARD_VIEW_FILTER, "exec", "playwright", "test", ...laneArgs],
      { stdio: "inherit", env: pinnedPathEnv() },
    );
    process.exit(exitCodeOf(r));
  }
  if (
    spawnSync("curl", ["-s", "-m", "2", "-o", os.devNull, `http://127.0.0.1:${PORT}/`])
      .status === 0
  ) {
    skipOrFail(`port ${PORT} busy — another host owns the lane`);
  }
  if (!resolveOnPath(DSH_BIN)) {
    skipOrFail("no dsh binary on PATH (set DSH_BIN)");
  }

  // LANE LAW (li-bu class, the audit's F-8): whatever binary resolved
  // above MUST be the provisioned runtime — >=0.2.0-rc.1, the repo's own
  // pin (packages/harness/provisioner/package.json). A bare PATH dsh
  // below the floor is the banned class (the mise 0.1.5-rc.2 burn: a
  // shell whose typert registry refuses our codec shape, the bench
  // namespace never mounts, and every symptom lands far from the cause).
  // The sanctioned door for a lane is the sibling provisioner:
  //   ~/Documents/programs/active/dsh-provision/apply.sh launch --lane X
  let dshVersion = "";
  try {
    const r = spawnSync(DSH_BIN, ["--version"], { encoding: "utf8" });
    if (typeof r.stdout === "string" && r.stdout.length) {
      dshVersion = r.stdout.split("\n")[0];
    }
  } catch {
    /* `|| true` — an unreadable version lands in the gate below */
  }
  {
    const m = /(\d+)\.(\d+)\.(\d+)(?:-rc\.(\d+))?/.exec(dshVersion || "");
    if (!m) {
      console.error(
        "e2e-studio-lane: cannot read a version from '$DSH_BIN' — boot only through the provision (dsh-provision apply.sh launch)",
      );
      process.exit(1);
    }
    const maj = Number(m[1]);
    const min = Number(m[2]);
    const pat = Number(m[3]);
    const rc = m[4] === undefined ? null : Number(m[4]);
    const cur = [maj, min, pat, rc === null ? 10 ** 6 : rc];
    const floor = [0, 2, 0, 1];
    const below =
      cur[0] !== floor[0]
        ? cur[0] < floor[0]
        : cur[1] !== floor[1]
          ? cur[1] < floor[1]
          : cur[2] !== floor[2]
            ? cur[2] < floor[2]
            : cur[3] < floor[3];
    if (below) {
      const shown = `${maj}.${min}.${pat}` + (rc === null ? "" : `-rc.${rc}`);
      console.error(
        `e2e-studio-lane: $DSH_BIN is ${shown}, below the 0.2.0-rc.1 floor — boot only through the provision (dsh-provision apply.sh launch)`,
      );
      process.exit(1);
    }
  }

  // ── teardown: host kill (process group) + home removal, ALWAYS ───
  let hostPgid = 0;
  const cleanup = async () => {
    if (hostPgid) {
      try {
        process.kill(-hostPgid, "SIGTERM");
      } catch {
        /* already gone */
      }
      for (let i = 0; i < 20; i++) {
        const r = spawnSync("curl", [
          "-s",
          "-m",
          "1",
          "-o",
          os.devNull,
          `http://127.0.0.1:${PORT}/`,
        ]);
        if (!r.error && r.status === 0) {
          await sleep(1000);
          continue;
        }
        break;
      }
    }
    rmSync(HOME_DIR, { recursive: true, force: true });
    rmSync(RUNS_ROOT, { recursive: true, force: true });
    rmSync(COOKIES, { force: true });
  };
  const fastCleanup = () => {
    if (hostPgid) {
      try {
        process.kill(-hostPgid, "SIGTERM");
      } catch {
        /* already gone */
      }
    }
    rmSync(HOME_DIR, { recursive: true, force: true });
    rmSync(RUNS_ROOT, { recursive: true, force: true });
    rmSync(COOKIES, { force: true });
  };
  for (const [sig, num] of [
    ["SIGINT", 2],
    ["SIGTERM", 15],
  ]) {
    process.on(sig, () => {
      fastCleanup();
      process.exit(128 + num);
    });
  }

  try {
    // ── the throwaway home (README recipe verbatim) ────────────────
    // Depth-anchored beside the real one: the profile's node_modules
    // symlinks are RELATIVE to the repo layout.
    rmSync(HOME_DIR, { recursive: true, force: true });
    rmSync(RUNS_ROOT, { recursive: true, force: true });
    mkdirSync(path.join(HOME_DIR, "profiles"), { recursive: true });
    mkdirSync(path.join(HOME_DIR, "storages"), { recursive: true });
    cpSync(SEED_DIR, path.join(HOME_DIR, "profiles", "e2e-studio"), {
      recursive: true,
    });

    const homeCopy = path.join(HOME_DIR, "profiles", "e2e-studio");
    // THE SEED'S MATERIAL DEPS: the tracked seed ships NO node_modules
    // and PORTABLE relative link: paths — correct at the seed's depth,
    // WRONG at the throwaway home's depth (the runtime profile's links
    // are absolute for exactly this reason). The boot rewrites the copy's
    // links to machine-absolute (repo-rooted) BEFORE installing: the seed
    // on disk stays portable, the throwaway home is machine-local, and
    // pnpm materializes the node_modules the bundles resolve through.
    if (!existsSync(path.join(homeCopy, "node_modules"))) {
      console.log(
        "[e2e-studio-lane] materializing the tracked seed's deps (rewrite + pnpm install)",
      );
      rewriteSeedLinks(homeCopy, path.join(repoRoot, TRACKED_SEED));
      const instLog = `/tmp/e2e-studio-seed-install-${PORT}.log`;
      const fd = openSync(instLog, "w");
      const r = spawnSync("pnpm", ["install", "--no-frozen-lockfile"], {
        cwd: homeCopy,
        env: pinnedPathEnv(),
        stdio: ["ignore", fd, fd],
      });
      closeSync(fd);
      if (r.error || r.status !== 0) {
        console.log("[e2e-studio-lane] seed pnpm install failed:");
        const tail = logTail(instLog, 8);
        if (tail) console.log(tail);
        throw new ExitError(1);
      }
    }

    // settings.yaml is the OPERATOR's per-machine provider plane —
    // untracked by law (secrets never cross homes). The lane is KEYLESS
    // (browser-plane walls, no LLM subject); copy the live home's file
    // when present, boot without it otherwise. (Single-setup law
    // 2026-10-18: the repo-local fossil home this copied from is gone —
    // the only source is the operator's live home.)
    // D6 KEYLESS ROW-NAME WALL (deploy-path audit, 2026-10-20): a
    // settings row carrying a provider table (`providers:` subtree —
    // the shape `llm-pi-ai` rode in the Sep-30 fossil) would silently
    // hand this KEYLESS lane an LLM subject. Refuse the copy naming the
    // row (names only — the guard reads keys, never values); the
    // operator strips the provider table or pins a keyless file.
    const liveSettings = path.join(os.homedir(), ".dsh", "settings.yaml");
    if (isFile(liveSettings)) {
      const keyed = refuseKeyedSettings(readFileSync(liveSettings, "utf8"));
      if (keyed.length) {
        console.error(
          "e2e-studio-lane: refusing to copy settings.yaml into the KEYLESS lane — " +
            "provider table row(s): " +
            keyed.join(", ") +
            "\n" +
            "(strip the row or pin a keyless settings file; deploy-path audit D6)",
        );
        throw new ExitError(1);
      }
      copyFileSync(liveSettings, path.join(HOME_DIR, "settings.yaml"));
    }

    // THE AI KEY SEAT (GOAL-2, 2026-10-24): the keyless law above holds
    // UNLESS the operator names a brain (--agent-route provider/model
    // — the route shape the melite-test lane's estate row seats).
    // Then the machine's credential refs — the same store ~/.dsh-dev
    // symlinks at $HOME/.dsh/.credentials.yaml — merge into the
    // throwaway home so the brain's apiKeyEnv resolves. Machine-local
    // only: values never enter the repo, any log, or CI (the gate is
    // the operator's own flag; unset = the keyless default untouched).
    if (agentRoute) {
      const credDst = path.join(HOME_DIR, ".credentials.yaml");
      let srcRefs;
      try {
        srcRefs = readRefs(readFileSync(credSrc, "utf8"));
      } catch (e) {
        console.error(`e2e-studio-lane: credential source unreadable: ${e?.message ?? e}`);
        throw new ExitError(1);
      }
      if (Object.keys(srcRefs).length === 0) {
        console.error(
          "e2e-studio-lane: no refs: block in the credential source — " +
            "refusing to seat a brain with no key",
        );
        throw new ExitError(1);
      }
      const dstText = isFile(credDst) ? readFileSync(credDst, "utf8") : "";
      const merged = { ...readRefs(dstText), ...srcRefs };
      const lines = ["version: 1", "refs:"];
      for (const [k, v] of Object.entries(merged)) lines.push(`  ${k}: ${v}`);
      const records = dstText.match(/^records:[\s\S]*$/m);
      if (records) lines.push(records[0].replace(/\s+$/, ""));
      writeFileSync(credDst, lines.join("\n") + "\n");
      // owner-only mode or the credentials loader refuses the store at
      // boot (assertOwnerOnly: "readable beyond its owner")
      chmodSync(credDst, 0o600);
      console.log(
        `[e2e-studio-lane] AI key seat: ${Object.keys(srcRefs).length} credential ref(s) merged (values never logged)`,
      );
    }

    // THE WORKSPACE PRE-STATE (seeded BEFORE boot — a host with no
    // workspace serves only the chooser hero). Schema-valid row naming
    // THIS repo; ISO stamps because the domain schema refuses the rest.
    {
      const row = randomUUID();
      const ts = "2026-09-21T00:00:00.000Z";
      const wsPath = path.join(HOME_DIR, "storages", "workspace.json");
      const wsDoc = {
        unit: { name: "workspace", version: 2 },
        global: { initialized: true, workspaceIds: [row], archivedSessionIds: [] },
        tables: {
          workspaces: {
            [row]: {
              path: "__REPO_ROOT__",
              title: "inference.cpp",
              sessionIds: [],
              createdAt: ts,
              updatedAt: ts,
            },
          },
        },
      };
      writeFileSync(
        wsPath,
        JSON.stringify(wsDoc).replaceAll(
          "__REPO_ROOT__",
          process.cwd().split(path.sep).join("/"),
        ),
      );
    }

    // THE RUNS ROOT PIN is not optional: QueueService refuses to boot
    // without a named root (the cwd-guess ban, stroke 45c). J12 retired
    // the MELITE_STATE_ROOT env seam — the pin rides the estate row's
    // config through a minted --patch overlay.
    const estatePatch = path.join(HOME_DIR, "estate-state.patch.yml");
    writeFileSync(
      estatePatch,
      `# minted by e2e-studio-lane (J12): the estate row's config names the
# lane's runs root — never an env seam.
- id: melite-estate
  config:
    stateRoot: "${RUNS_ROOT}"
`,
    );

    // THE AI ROUTE SEAT (GOAL-2, 2026-10-24): when the operator names a
    // brain, the estate row's config carries agentRoute (the same field
    // the melite-test lane seats — packages/web/melite-estate/src/
    // index.ts melite-engine-agent-row) AND the llm provider table rides
    // the SAME patch: the llm-pi-ai row spliced VERBATIM from the
    // operator's rows file (one copy, !!js tags untouched — the same
    // splice law as infer-provision --profile-rows; never re-serialize).
    // Unset = the minted patch stays keyless and brainless: CI law.
    if (agentRoute) {
      appendFileSync(estatePatch, `    agentRoute: "${agentRoute}"\n`);
      if (!isFile(llmRows)) {
        console.log(
          `[e2e-studio-lane] --agent-route set but llm rows file missing: ${llmRows}`,
        );
        throw new ExitError(1);
      }
      // TWO rows: the provider table (llm-pi-ai) AND the shell's default
      // chat route (agent-default-model → zai/glm-5.3-flash). Without the
      // default-route row the mint's own model turn falls back to
      // deepseek-official and dies keyless ("This turn failed") — the
      // e2e wall: bench tour mint arms proved it, 2026-10-24.
      for (const rowId of ["llm-pi-ai", "agent-default-model"]) {
        let rowsText;
        try {
          rowsText = readFileSync(llmRows, "utf8");
        } catch {
          console.log(
            `[e2e-studio-lane] row extraction failed for ${rowId} from ${llmRows}`,
          );
          throw new ExitError(1);
        }
        const block = extractRow(rowsText, rowId);
        if (block.length) appendFileSync(estatePatch, block.join("\n") + "\n");
        if (
          !new RegExp(`^- id: ${rowId}$`, "m").test(readFileSync(estatePatch, "utf8"))
        ) {
          console.log(
            `[e2e-studio-lane] no ${rowId} row found in ${llmRows} — the brain would seat starved`,
          );
          throw new ExitError(1);
        }
      }
      // THE MINT'S EFFORT SEAT (2026-10-24, the exploration race): the
      // mint turn's CONTENT is irrelevant (it births the conversation and
      // names the bench key — adjudicated across drives 6-11), but a
      // high-effort commission-brain answers the mint with minutes of
      // repo exploration whose rerenders race every downstream spec
      // (and, before the read-only seat, edited the worktree). Low
      // effort answers the mint in seconds; the walls judge faces the
      // mint never touches. The operator's own lanes keep their row.
      {
        let n = 0;
        const rewritten = readFileSync(estatePatch, "utf8").replace(
          /(- id: agent-default-model\n(?:  .*\n)*?    reasoningEffort:) high/g,
          (m0, p1) => {
            n += 1;
            return p1 + " low";
          },
        );
        if (n !== 1) {
          console.log(
            `[e2e-studio-lane] agent-default-model effort rewrite failed (matches: ${n})`,
          );
          throw new ExitError(1);
        }
        writeFileSync(estatePatch, rewritten);
      }
      console.log(
        `[e2e-studio-lane] AI route seat: agentRoute=${agentRoute} + llm-pi-ai provider table + agent-default-model @ low effort (operator-sanctioned AI drive; the mint births, it never explores)`,
      );
    }

    closeSync(openSync(LOG, "w"));

    // --patch rides BEFORE the app passthrough flags (--host/--port/
    // --no-open): after the first unknown option, commander hands the
    // rest to the app, whose parser rejects the launcher's --patch.
    // detached:true is the setsid seat — the child leads its own
    // process group, so the group kill targets -pid.
    const logFd = openSync(LOG, "a");
    const host = spawn(
      DSH_BIN,
      [
        "--profile",
        "e2e-studio",
        "--patch",
        estatePatch,
        "--host",
        "127.0.0.1",
        "--port",
        String(PORT),
        "--no-open",
      ],
      {
        detached: true,
        stdio: ["ignore", logFd, logFd],
        env: { ...process.env, DSH_HOME: HOME_DIR },
      },
    );
    host.unref();
    const hostPid = host.pid;
    hostPgid = hostPid;

    // ── wait for the token (the shell URL the spec drives) ─────────
    let token = "";
    for (let i = 0; i < 120; i++) {
      token = lastMatch(
        LOG,
        new RegExp(`dsh web: http://127\\.0\\.0\\.1:${PORT}/\\?token=[A-Za-z0-9_-]*`),
      ).replace(/^.*token=/, "");
      if (token) break;
      if (!procAlive(hostPid)) {
        console.log("[e2e-studio-lane] host died at boot:");
        const tail = logTail(LOG, 5);
        if (tail) console.log(tail);
        throw new ExitError(1);
      }
      await sleep(1000);
    }
    if (!token) {
      console.log("[e2e-studio-lane] no token after 120s:");
      const tail = logTail(LOG, 5);
      if (tail) console.log(tail);
      throw new ExitError(1);
    }
    process.env.E2E_STUDIO_URL = `http://127.0.0.1:${PORT}/?token=${token}`;
    console.log(`[e2e-studio-lane] host up: ${process.env.E2E_STUDIO_URL}`);

    // ── the AI seat assert (never let the specs hang on a dead brain) ─
    // The estate row seats the agent engine during boot; by token time
    // the verdict is in the lane log. A brain that never seats is a
    // FAIL-LOUD here — a 7-minute per-spec timeout rack is not a drive.
    if (agentRoute) {
      let brainOk = false;
      for (let i = 0; i < 30; i++) {
        if (logContains(LOG, "engine 'agent' seated: brain")) {
          brainOk = true;
          break;
        }
        if (!procAlive(hostPid)) break;
        await sleep(1000);
      }
      if (!brainOk) {
        console.log(
          "[e2e-studio-lane] AI seat FAILED — no brain seat line in the lane log:",
        );
        const tail = logTail(LOG, 8);
        if (tail) console.log(tail);
        throw new ExitError(1); // the EXIT cleanup kills the host group
      }
      console.log(
        `[e2e-studio-lane] AI seat verified: ${lastMatch(
          LOG,
          /engine 'agent' seated: brain [^ ]*/,
        )}`,
      );
    }

    // ── seed the bench over the host's own /api wire ──────────────────
    // 'main' is LAWFUL here (the §8.3 reader law, audit 2026-10-31): the
    // studio lane is a genuinely unattributed seat — no DSH conversation
    // exists on it, so the headless fallback applies and the tab watches
    // main. Never re-point this to a session- key: the lane has no
    // generation to inherit from.
    const curlOrExit = (...argv) => {
      const r = spawnSync(argv[0], argv.slice(1), { stdio: "ignore" });
      if (r.error || r.status !== 0) throw new ExitError(exitCodeOf(r));
    };
    curlOrExit("curl", "-sL", "-c", COOKIES, process.env.E2E_STUDIO_URL, "-o", os.devNull);
    curlOrExit(
      "curl",
      "-s",
      "-b",
      COOKIES,
      "-X",
      "POST",
      `http://127.0.0.1:${PORT}/api/bench/ensure`,
      "-H",
      "content-type: application/json",
      "-d",
      '{"type":"client-request","rpcId":"seed","method":"bench/ensure","payload":{"args":{"doc":{"session":"main"}}}}',
      "-o",
      os.devNull,
    );
    curlOrExit(
      "curl",
      "-s",
      "-b",
      COOKIES,
      "-X",
      "POST",
      `http://127.0.0.1:${PORT}/api/bench/add-stage`,
      "-H",
      "content-type: application/json",
      "-d",
      '{"type":"client-request","rpcId":"seed","method":"bench/add-stage","payload":{"args":{"sessionKey":"main","doc":{"card":"h3-timeline","author":"user","expect_rev":0}}}}',
      "-o",
      os.devNull,
    );

    // ── seed the runs library: one image run ───────────────────────────
    // The media walls (restore-preview, from-media's pick branch) drive
    // the gallery's real gestures and need a run whose tile paints an
    // <img> preview — the runs seat lists the state root's output/ tree
    // on demand, so the seed is a plain run dir: run-<hex>-<word> (the
    // RUN_ID_RE grammar — a loose name 400s on the artifact route), a
    // servable media leaf, and the _flow.json sidecar the row builder
    // byte-scans (pipeline must not start with _ — the user-surface law).
    const seedRun = path.join(RUNS_ROOT, "output", "run-3ca7-laneseed");
    mkdirSync(seedRun, { recursive: true });

    // THE SEED PREVIEW (tiers fresh-clone red, 2026-10-30): the preview
    // was the AI-gated overflow hunt's screenshot (rail-overflow.png —
    // written by rail-overflow.spec.ts, itself skipped without
    // MELITE_E2E_AI=1, and never committed), so the unconditional cp died
    // on every keyless clone before a single spec ran. The tile only
    // needs a servable <img> — prefer the fresh AI screenshot when the
    // keyed lane produced one, else the TRACKED static fallback
    // (e2e/assets/laneseed-preview.png, 99 bytes, content-agnostic by
    // design: no spec pixel-compares the seed tile). Both absent is a
    // broken checkout, and fails loud.
    let seedPng = path.join(repoRoot, "packages/web/melite-card-view/e2e/rail-overflow.png");
    if (!isFile(seedPng)) {
      seedPng = path.join(
        repoRoot,
        "packages/web/melite-card-view/e2e/assets/laneseed-preview.png",
      );
    }
    if (!isFile(seedPng)) {
      console.error(
        "[e2e-studio-lane] no seed preview (neither the AI screenshot nor the tracked fallback exists)",
      );
      throw new ExitError(1);
    }
    copyFileSync(seedPng, path.join(seedRun, "preview.png"));
    writeFileSync(
      path.join(seedRun, "_flow.json"),
      `{"pipeline":"image-gen","status":"success","created_at":${Date.now()},"prompt":"the lane seed image run","seed":7}\n`,
    );

    // ── the wall ──────────────────────────────────────────────────────
    // E2E_RUNS_ROOT names the scratch runs root for the lane THIS script
    // booted (the ghost wall plants + removes run dirs to prove no
    // phantom tiles — it refuses to guess the root, and a manual run
    // against any other lane leaves the variable unset so the plant
    // tests skip instead of touching a real tree).
    let playwrightExit = exitCodeOf(
      spawnSync(
        "pnpm",
        ["--filter", CARD_VIEW_FILTER, "exec", "playwright", "test", ...laneArgs],
        { stdio: "inherit", env: pinnedPathEnv({ E2E_RUNS_ROOT: RUNS_ROOT }) },
      ),
    );

    // ── the host's own word (2026-10-13, the stale-lib wedge): a green
    // playwright run can ride a host that silently skipped a capability
    // — the lane booted green while card-plane cross-validation died at
    // a "Cannot find module" skip in the host log (a stale committed lib
    // whose emitted JS carried a .ts specifier). A module-resolution
    // failure in the host log is never benign; the lane refuses it.
    if (logContains(LOG, "Cannot find module")) {
      console.error("[e2e-studio-lane] host log carries a module-resolution failure:");
      for (const { n, line } of grepNumbered(LOG, (l) => l.includes("Cannot find module"))) {
        console.error(`${n}:${line}`);
      }
      throw new ExitError(1);
    }

    // THE BOOT-DIAGNOSTIC CLASS (2026-10-13, the 3-entry boot): a boot
    // can half-fail on OPTIONAL entries — dsh-app-boot warns "N entries
    // did not activate" / "<id> (<name>): failed to import" and still
    // serves. The run that taught this: three host entries dead (estate,
    // tools, tools-doors) → the catalog API answered empty → thirteen
    // specs starved into 5.5-minute timeouts for 1.1h of noise. A host
    // whose boot carried ANY activation failure never owns the lane; the
    // refusal names the dead entries and stops before playwright.
    if (logContains(LOG, "did not activate")) {
      console.error(
        "[e2e-studio-lane] host boot carried activation failures (never benign — the wall starves on a half-dead host):",
      );
      for (const { n, line } of grepNumbered(LOG, (l) =>
        /did not activate|failed to import/.test(l),
      )) {
        console.error(`${n}:${line}`);
      }
      throw new ExitError(1);
    }

    // THE SERVE-CLASS REFUSALS (the render-vs-boot audit, 2026-10-18):
    // both signatures below are boot deaths the host can still SERVE
    // behind — `client bundle not found` (a row the loader cannot
    // satisfy) and `startup failed` (dsh's own exit-1 verdict on
    // required plugins that never activated). A host carrying either
    // never owns the lane.
    for (const sig of ["client bundle not found", "startup failed"]) {
      if (logContains(LOG, sig)) {
        console.error(
          `[e2e-studio-lane] host log carries '${sig}' (a serve-class boot death):`,
        );
        for (const { n, line } of grepNumbered(LOG, (l) => l.includes(sig))) {
          console.error(`${n}:${line}`);
        }
        throw new ExitError(1);
      }
    }

    // ── the deck leg (E2E_STUDIO_DECK=1, the battery's browser tier,
    // 2026-11-17): the deck's own e2e suite rides the SAME lane host —
    // the tracked seed seats @melite-plugin/dsh-card-deck alongside
    // card-view, so the deck UI answers on this very port. Before this
    // leg existed, test:web:browser chained the deck suite AFTER this
    // script exited — cleanup() had already killed the host, the suite
    // starved on an unset SWEEP_LANE_URL (page.goto('') resolved
    // against the dead 127.0.0.1:3909 baseURL), and 14 specs red with
    // needs-SWEEP_LANE_URL / ERR_CONNECTION_REFUSED on every battery.
    // The leg runs INSIDE the lane's lifetime; SWEEP_LANE_URL is the
    // host's own token URL. Its exit code folds into the tier verdict —
    // a red deck leg reds the run (the show-all law; no swallowing).
    // The two E2E_DECK_URL specs (comfy-manager, estate-lane-sidebar)
    // self-skip lawfully: they tour the LIVE deck estate host
    // (dsh-deck.service — machine infrastructure, never booted here).
    // THE SET-U LAW (run 44498457238, 2026-11-19): CI's studio step runs
    // `E2E_STUDIO_REQUIRE=1 pnpm run test:e2e:studio` — no deck flag. The
    // suite had already passed (9 passed | 33 skipped) when this test
    // killed the whole job: `E2E_STUDIO_DECK: unbound variable` under
    // `set -u`. The script's own idiom is `${VAR:-}` at every optional
    // seat (see E2E_STUDIO_URL above); the deck leg forgot it. Off is the
    // honest default — the leg is the battery's browser tier's to ask for.
    if (process.env.E2E_STUDIO_DECK) {
      const deckExit = exitCodeOf(
        spawnSync(
          "pnpm",
          ["--filter", "@melite-plugin/dsh-card-deck", "exec", "playwright", "test"],
          {
            stdio: "inherit",
            env: pinnedPathEnv({ SWEEP_LANE_URL: process.env.E2E_STUDIO_URL }),
          },
        ),
      );
      if (deckExit !== 0) playwrightExit = deckExit;
    }
    return playwrightExit;
  } finally {
    await cleanup();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    if (!(err instanceof ExitError)) {
      console.error(err?.stack ?? String(err));
    }
    process.exit(err instanceof ExitError ? err.code : 1);
  },
);
