#!/usr/bin/env node
// e2e-h3-gpu-lane.mjs — THE H3 ADVANCED GPU SEAT (the operator's
// 2026-10-27 order: "an advanced playwrite suite, and the scripts/
// way to provision… test the H3, advanced ways, on the gpu").
//
// The e2e-gpu-lane recipe VERBATIM (skip laws, REQUIRE mode, the
// engine cuda gate, the throwaway depth-anchored home, the tracked
// seed, the keyless settings law, the workspace pre-state, the
// runs-root pin, the post-verdicts) PLUS the H3's own gates:
//
//   - THE H3 PACK GATE: the engine must serve the h3 graph's own
//     node classes (/object_info/H3SLAAttention — a class only the
//     MiniMax H3 packs carry). A lane that boots against an engine
//     without the packs reds every run with a node-resolution
//     death; this gate refuses BEFORE the host boot, naming the
//     missing pack.
//   - THE H3 WEIGHTS GATE: every provision row in the h3 family
//     DECL (the EMITTED lib truth, never a re-parse of src) must
//     sit under the engine's weights tree at its DECLARED folder,
//     size-exact. THE FOLDER COMES FROM THE DECL ROW VERBATIM —
//     never a hardcoded folder list: the first cut of this gate's
//     census walked four hardcoded folders, ruled the
//     frame_interpolation film net MISSING, and fired a 151 GB
//     acquire for a file that was on disk, sha-exact, all along
//     (the e2e-h3-gpu-lane.spec.ts census arm walls that exact
//     bug shape). A miss prints the estate's OWN provision door —
//     the acquire_weight call, model h3 + the missing file — the
//     script never curls a weights URL itself: the DECL owns the
//     source, the gateway owns the fetch. --provision refuses LOUD
//     with the door command (the REQUIRE-mode shape) instead of
//     skipping, for the provision workflow.
//
// The specs own their own benches (the tour's history law,
// verbatim); this launcher seeds nothing.
//
// Skip laws (never a fake red — unless --require): port busy, no
// dsh, engine down, no cuda, h3 packs absent, h3 weights missing
// (or, with --provision, LOUD with the door).
//
// FLAGS (the operator no-env law, 2026-11-16 — the promote-prod
// shape): --weights-root PATH (the engine's weights tree, default
// $HOME/tools/comfyui/models) · --provision (a weights miss prints
// the provision door and refuses) · --require (every skip law
// fails loud instead of exit 0) · --dsh-bin BIN (default: dsh on
// PATH); every other argument passes through to playwright
// verbatim. The tier's own gates (E2E_H3_PORT, E2E_H3_ENGINE,
// E2E_H3_KEEP) stay env — the specs'/CI's test-lane switches
// (audit step (c)), not this launcher's knobs.
//
// Node port of the retired e2e-h3-gpu-lane.sh (operator law: npm + python only,
// zero shell scripts remain); REPO_ROOT rides import.meta.url
// instead of BASH_SOURCE, and the gates run in-process.

import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  accessSync,
  closeSync,
  constants as fsConstants,
  copyFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
      `[e2e-h3-gpu-lane] seed rewrite left dead links [${dead
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

async function main() {
  // ── the skip laws (never a fake red — unless REQUIRED) ───────────
  // E2E_H3_PORT lets a co-running seat take another port (the studio
  // lane owns 3907, the gpu seat 3917; the H3 seat's default 3927).
  const PORT = process.env.E2E_H3_PORT || "3927";
  const HOME_DIR = "data/runtime/e2e-h3-home";
  const RUNS_ROOT = "/tmp/e2e-h3-runs";
  const COOKIES = "/tmp/e2e-h3-cookies.txt";
  const LOG = "/tmp/e2e-h3-lane.log";
  const ENGINE_URL =
    process.env.E2E_H3_ENGINE || process.env.E2E_GPU_ENGINE || "http://127.0.0.1:8188";

  // deployment env (.env is gitignored; .env.example documents every knob)
  loadDotEnv(".env"); // env-file loaded

  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  process.chdir(repoRoot);
  const CARD_VIEW_FILTER =
    process.env.CARD_VIEW_FILTER || "@melite-plugin/dsh-card-view";

  // ── flags (the no-env law) ────────────────────────────────────────
  // The engine's weights tree — the operator's real tree
  // (--weights-root, default $HOME/tools/comfyui/models). The lane
  // READS it (the weights gate); it never provisions or mutates it.
  let dshBin = "dsh";
  let weightsRoot = path.join(os.homedir(), "tools", "comfyui", "models");
  let provision = 0;
  let requireMode = 0;
  const laneArgs = [];
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const need = (msg) => {
      console.error(`e2e-h3-gpu-lane: ${msg}`);
      process.exit(1);
    };
    if (flag === "--weights-root") {
      const v = args[++i];
      if (v === undefined || v === "") need("--weights-root needs the engine weights tree");
      weightsRoot = v;
    } else if (flag === "--provision") {
      provision = 1;
    } else if (flag === "--require") {
      requireMode = 1;
    } else if (flag === "--dsh-bin") {
      const v = args[++i];
      if (v === undefined || v === "")
        need("--dsh-bin needs the dsh binary (a path or a PATH name)");
      dshBin = v;
    } else {
      laneArgs.push(flag);
    }
  }

  // THE TRACKED SEED IS THE SEAT'S ONLY SEED (the moss-404 law, the
  // gpu seat's own): the seed serves the h3 card
  // (@melite/video-h3-timeline + @melite/models-h3 ride the seed's
  // deps and bundles — the same seat the h3 suite drills).
  const TRACKED_SEED = "packages/web/melite-card-view/e2e/profile-seed";
  let SEED_DIR = TRACKED_SEED;

  // THE REQUIRE MODE: --require (or the provision workflow's --provision)
  // flips every skip law from exit-0 to a LOUD failure naming the
  // missing prerequisite — a self-skip can never green a CI seat again.
  // Local boots keep the skip laws (never a fake red).
  function skipOrFail(msg) {
    if (requireMode === 1 || provision === 1) {
      console.error(
        `[e2e-h3-gpu-lane] REQUIRED prerequisite missing: ${msg} (--require refuses the skip)`,
      );
      process.exit(1);
    }
    console.log(`[e2e-h3-gpu-lane] ${msg}; SKIP (exit 0)`);
    process.exit(0);
  }

  // ── the skip laws (never a fake red — unless REQUIRED) ───────────
  if (
    spawnSync("curl", ["-s", "-m", "2", "-o", os.devNull, `http://127.0.0.1:${PORT}/`])
      .status === 0
  ) {
    skipOrFail(`port ${PORT} busy — another host owns the lane`);
  }
  if (!resolveOnPath(dshBin)) {
    skipOrFail("no dsh binary on PATH (use --dsh-bin BIN)");
  }

  // LANE LAW (li-bu class): the binary must be the provisioned
  // runtime — >=0.2.0-rc.1, the repo's own pin.
  let dshVersion = "";
  try {
    const r = spawnSync(dshBin, ["--version"], { encoding: "utf8" });
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
        "e2e-h3-gpu-lane: cannot read a version from '$DSH_BIN' — boot only through the provision (dsh-provision apply.sh launch)",
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
        `e2e-h3-gpu-lane: $DSH_BIN is ${shown}, below the 0.2.0-rc.1 floor — boot only through the provision (dsh-provision apply.sh launch)`,
      );
      process.exit(1);
    }
  }

  if (isDir(TRACKED_SEED)) {
    SEED_DIR = TRACKED_SEED;
  } else {
    skipOrFail(`no profile seed (${TRACKED_SEED})`);
  }

  // ── THE ENGINE GATE (the GPU tier's own prerequisite) ─────────────
  let engineStats = "";
  try {
    const r = spawnSync("curl", ["-s", "-m", "5", `${ENGINE_URL}/system_stats`], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    engineStats = r.stdout ?? ""; // `|| true` — capture stdout regardless
  } catch {
    /* empty stats land in the skip below */
  }
  if (!engineStats) {
    skipOrFail(`engine at ${ENGINE_URL} unreachable (the H3 tier needs a live engine)`);
  }
  {
    let cuda = false;
    try {
      const d = JSON.parse(engineStats);
      const devices = d.devices || [];
      cuda = devices.some((dev) => dev?.type === "cuda");
    } catch {
      cuda = false;
    }
    if (!cuda) {
      skipOrFail(
        `engine at ${ENGINE_URL} holds no cuda device (the H3 tier needs real inference — check nvidia-smi)`,
      );
    }
  }

  // ── THE H3 PACK GATE (this seat's own) ────────────────────────────
  // The h3 graph composes H3SLAAttention and its kin — node classes
  // only the MiniMax H3 packs serve. A 404 here means every H3 run
  // would die at node resolution; refuse before the boot.
  let h3NodeProbe = "";
  try {
    const r = spawnSync(
      "curl",
      [
        "-s",
        "-m",
        "5",
        "-o",
        os.devNull,
        "-w",
        "%{http_code}",
        `${ENGINE_URL}/object_info/H3SLAAttention`,
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
    h3NodeProbe = (r.stdout ?? "").trim();
  } catch {
    /* empty probe lands in the skip below */
  }
  if (h3NodeProbe !== "200") {
    skipOrFail(
      `engine at ${ENGINE_URL} does not serve H3SLAAttention (probe HTTP ${h3NodeProbe} — the MiniMax H3 custom node packs are absent; install them into the engine's custom_nodes)`,
    );
  }

  // ── THE H3 WEIGHTS GATE (this seat's own; the provision door) ─────
  // Every provision row of the h3 family DECL — read from the
  // EMITTED lib truth (the built module the estate itself boards),
  // never a re-parse of src. Each row's folder is used VERBATIM (the
  // every-folder law above). A miss names the file and the estate's
  // own acquire door; --provision turns the miss LOUD.
  const h3DeclLib = path.join(repoRoot, "packages", "models", "h3", "lib", "index.js");
  if (!isFile(h3DeclLib)) {
    skipOrFail(`no emitted h3 DECL at ${h3DeclLib} (build @melite/models-h3 first)`);
  }
  if (!isDir(weightsRoot)) {
    skipOrFail(`no engine weights tree at ${weightsRoot} (use --weights-root PATH)`);
  }
  const provisionReport = path.join(
    mkdtempSync(path.join(os.tmpdir(), "e2e-h3-provision-")),
    "report.txt",
  );

  // THE GATE ITSELF (exit 1 + the report names every miss).
  const h3WeightsGate = async () => {
    try {
      // file URL, never a bare relative specifier: a bare specifier has
      // no resolution base here (ERR_MODULE_NOT_FOUND — the gate's own
      // first cut).
      const mod = await import(pathToFileURL(h3DeclLib).href);
      const decl = mod.DECL ?? mod.default?.DECL;
      if (!decl || !Array.isArray(decl.provisions)) {
        writeFileSync(
          provisionReport,
          `e2e-h3-gpu-lane: the emitted DECL at ${h3DeclLib} carries no provisions table\n`,
        );
        return false;
      }
      const missing = [];
      for (const row of decl.provisions) {
        // THE EVERY-FOLDER LAW: the folder comes from the DECL row
        // verbatim — never a hardcoded list. The gate's first cut
        // walked four hardcoded folders and misruled the
        // frame_interpolation film net; the census arm in
        // e2e-h3-gpu-lane.spec.ts walls this exact shape.
        const at = path.join(weightsRoot, row.folder, row.name);
        let actual = -1;
        try {
          actual = statSync(at).size;
        } catch {
          /* absent */
        }
        if (actual !== row.size_bytes) {
          missing.push(
            `${row.name}  (${(row.size_bytes / 1e9).toFixed(1)} GB, folder ${row.folder}) — ${
              actual < 0 ? "absent" : `size ${actual} ≠ DECL ${row.size_bytes}`
            }`,
          );
        }
      }
      if (missing.length > 0) {
        writeFileSync(
          provisionReport,
          missing.map((m) => `  MISSING ${m}`).join("\n") + "\n",
        );
        return false;
      }
      writeFileSync(
        provisionReport,
        `  h3 weights COMPLETE: ${decl.provisions.length} provision rows verified size-exact under ${weightsRoot}\n`,
      );
      return true;
    } catch {
      return false; // gate crash → nonzero → the refuse arm, empty report
    }
  };

  // THE REFUSAL/SKIP (the provision door).
  if (!(await h3WeightsGate())) {
    process.stderr.write(readFileSync(provisionReport, "utf8"));
    if (provision === 1) {
      console.error(
        "[e2e-h3-gpu-lane] --provision — the estate's own door for the missing weights:",
      );
      console.error("  comfy_manage acquire_weight  model h3  file <each missing name above>");
      console.error(
        "  (the DECL owns the fetch source; the gateway owns the fetch — this script never curls a weights URL)",
      );
    } else {
      console.error(
        `[e2e-h3-gpu-lane] h3 weights missing under ${weightsRoot} (the report above names each file + GB); --provision prints the provision door, --require refuses the skip`,
      );
    }
    skipOrFail(`h3 family weights incomplete under ${weightsRoot}`);
  }
  process.stdout.write(readFileSync(provisionReport));
  rmSync(provisionReport, { force: true });

  // ── teardown: host kill (process group) + home removal, ALWAYS ───
  let hostPgid = 0;
  const rmArtifacts = () => {
    rmSync(HOME_DIR, { recursive: true, force: true });
    rmSync(RUNS_ROOT, { recursive: true, force: true });
    rmSync(COOKIES, { force: true });
  };
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
    // E2E_H3_KEEP=1 — the debug door (the gpu seat's own): keep the
    // throwaway home, runs root and cookies for post-mortem.
    if (process.env.E2E_H3_KEEP === "1") {
      console.log(
        `[e2e-h3-gpu-lane] E2E_H3_KEEP=1 — keeping ${HOME_DIR} and ${RUNS_ROOT} for post-mortem`,
      );
      return;
    }
    rmArtifacts();
  };
  const fastCleanup = () => {
    if (hostPgid) {
      try {
        process.kill(-hostPgid, "SIGTERM");
      } catch {
        /* already gone */
      }
    }
    if (process.env.E2E_H3_KEEP !== "1") rmArtifacts();
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
    // ── the throwaway home (the gpu recipe verbatim) ───────────────
    rmSync(HOME_DIR, { recursive: true, force: true });
    rmSync(RUNS_ROOT, { recursive: true, force: true });
    mkdirSync(path.join(HOME_DIR, "profiles"), { recursive: true });
    mkdirSync(path.join(HOME_DIR, "storages"), { recursive: true });
    cpSync(SEED_DIR, path.join(HOME_DIR, "profiles", "e2e-h3"), {
      recursive: true,
    });

    const homeCopy = path.join(HOME_DIR, "profiles", "e2e-h3");
    if (!existsSync(path.join(homeCopy, "node_modules"))) {
      console.log(
        "[e2e-h3-gpu-lane] materializing the tracked seed's deps (rewrite + pnpm install)",
      );
      rewriteSeedLinks(homeCopy, path.join(repoRoot, TRACKED_SEED));
      const instLog = "/tmp/e2e-h3-seed-install.log";
      const fd = openSync(instLog, "w");
      const r = spawnSync("pnpm", ["install", "--no-frozen-lockfile"], {
        cwd: homeCopy,
        env: pinnedPathEnv(),
        stdio: ["ignore", fd, fd],
      });
      closeSync(fd);
      if (r.error || r.status !== 0) {
        console.log("[e2e-h3-gpu-lane] seed pnpm install failed:");
        const tail = logTail(instLog, 8);
        if (tail) console.log(tail);
        throw new ExitError(1);
      }
    }

    // settings.yaml — the KEYLESS law verbatim (D6 row-name wall): the
    // H3 door-tier lane carries no LLM subject.
    const liveSettings = path.join(os.homedir(), ".dsh", "settings.yaml");
    if (isFile(liveSettings)) {
      const keyed = refuseKeyedSettings(readFileSync(liveSettings, "utf8"));
      if (keyed.length) {
        console.error(
          "e2e-h3-gpu-lane: refusing to copy settings.yaml into the KEYLESS lane — " +
            "provider table row(s): " +
            keyed.join(", ") +
            "\n" +
            "(strip the row or pin a keyless settings file; deploy-path audit D6)",
        );
        throw new ExitError(1);
      }
      copyFileSync(liveSettings, path.join(HOME_DIR, "settings.yaml"));
    }

    // ── THE WORKSPACE PRE-STATE (seeded BEFORE boot) ───────────────
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

    // ── THE RUNS ROOT PIN (J12 law: the estate row's config) ───────
    const estatePatch = path.join(HOME_DIR, "estate-state.patch.yml");
    writeFileSync(
      estatePatch,
      `# minted by e2e-h3-gpu-lane (J12): the estate row's config names the
# lane's runs root — never an env seam. H3 GPU runs land on the
# THROWAWAY root, never the operator's tree.
- id: melite-estate
  config:
    stateRoot: "${RUNS_ROOT}"
`,
    );

    closeSync(openSync(LOG, "w"));

    // detached:true is the setsid seat — the child leads its own
    // process group, so the group kill targets -pid.
    const logFd = openSync(LOG, "a");
    const host = spawn(
      dshBin,
      [
        "--profile",
        "e2e-h3",
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

    // ── wait for the token ─────────────────────────────────────────
    let token = "";
    for (let i = 0; i < 120; i++) {
      token = lastMatch(
        LOG,
        new RegExp(`dsh web: http://127\\.0\\.0\\.1:${PORT}/\\?token=[A-Za-z0-9_-]*`),
      ).replace(/^.*token=/, "");
      if (token) break;
      if (!procAlive(hostPid)) {
        console.log("[e2e-h3-gpu-lane] host died at boot:");
        const tail = logTail(LOG, 5);
        if (tail) console.log(tail);
        throw new ExitError(1);
      }
      await sleep(1000);
    }
    if (!token) {
      console.log("[e2e-h3-gpu-lane] no token after 120s:");
      const tail = logTail(LOG, 5);
      if (tail) console.log(tail);
      throw new ExitError(1);
    }
    process.env.E2E_STUDIO_URL = `http://127.0.0.1:${PORT}/?token=${token}`;
    console.log(`[e2e-h3-gpu-lane] host up: ${process.env.E2E_STUDIO_URL}`);

    // ── the wall ───────────────────────────────────────────────────
    // E2E_H3=1 is the H3 tier's own gate (the specs skip without it);
    // E2E_RUNS_ROOT names the throwaway root (the ghost-wall contract).
    // The h3 config runs ONLY the h3 specs (playwright.h3.config.ts —
    // testMatch h3-*.spec.ts): the z-image/automotive tiers stay the
    // gpu seat's own, never re-run here.
    const playwrightExit = exitCodeOf(
      spawnSync(
        "pnpm",
        [
          "--filter",
          CARD_VIEW_FILTER,
          "exec",
          "playwright",
          "test",
          "-c",
          "playwright.h3.config.ts",
          ...laneArgs,
        ],
        {
          stdio: "inherit",
          env: pinnedPathEnv({ E2E_RUNS_ROOT: RUNS_ROOT, E2E_GPU: "1", E2E_H3: "1" }),
        },
      ),
    );

    // ── the host's own word (the gpu seat's post-verdicts) ─────────
    if (logContains(LOG, "Cannot find module")) {
      console.error("[e2e-h3-gpu-lane] host log carries a module-resolution failure:");
      for (const { n, line } of grepNumbered(LOG, (l) => l.includes("Cannot find module"))) {
        console.error(`${n}:${line}`);
      }
      throw new ExitError(1);
    }
    if (logContains(LOG, "did not activate")) {
      console.error(
        "[e2e-h3-gpu-lane] host boot carried activation failures (never benign):",
      );
      for (const { n, line } of grepNumbered(LOG, (l) =>
        /did not activate|failed to import/.test(l),
      )) {
        console.error(`${n}:${line}`);
      }
      throw new ExitError(1);
    }
    for (const sig of ["client bundle not found", "startup failed"]) {
      if (logContains(LOG, sig)) {
        console.error(
          `[e2e-h3-gpu-lane] host log carries '${sig}' (a serve-class boot death):`,
        );
        for (const { n, line } of grepNumbered(LOG, (l) => l.includes(sig))) {
          console.error(`${n}:${line}`);
        }
        throw new ExitError(1);
      }
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
