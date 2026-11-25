// battery-leases.mjs — per-tier green leases for the pre-push battery
// (operator order 2026-11-17: "FIX THE PIPELINE NOW" — a 24h, 14-attempt
// release arc where every retry re-ran every earlier tier). Each
// expensive tier is keyed to a hash of the inputs it actually judges;
// an unchanged hash carries the tier's prior green forward, a changed
// hash re-fires, and a refusal resumes at the first dirty tier.
//
// THE SAFETY LAW: a lease may never mask a real regression. Every
// tier's input set is CONSERVATIVE — wider than its true surface, never
// narrower. Every tier also keys on the battery's own two scripts and
// the lockfile, so a battery rework or a dependency move invalidates
// all leases at once. A lease that cannot be read, parses wrong, or
// names an unknown tier is ABSENT — the tier fires. DSH_BATTERY_FORCE=1
// fires everything, always (the paranoia and CI door).
//
// The wall is tests/walls/ts/suites/battery-lease-law.spec.ts: hash
// sensitivity, the carry/fire decision table, corrupt-store fallback,
// and the disjointness of the three big tiers' spec trees (the case
// that burned: a browser-spec cure must not re-fire the GPU tier, and
// a GPU-row diet must not re-fire the browser tier).
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

/** Directories that are NEVER lease inputs. `.git` and `node_modules`
 *  are not the repo's bytes; `__pycache__`, `coverage`, `test-results`,
 *  `playwright-report` and `.venv` are what a test run, a coverage run
 *  or an install EMITS — hashing them would move every lease on every
 *  run. `lib` and `dist` are a package's BUILD OUTPUT only where the
 *  directory above them owns a package.json; a SOURCE folder named lib
 *  has no manifest above it and stays an input (2026-11-25: the
 *  name-only skip left tests/walls/ts/lib and scripts/lib unhashed
 *  under globs that named them). */
const NEVER_INPUT = new Set(["node_modules", ".git", "__pycache__", "coverage", "test-results", "playwright-report", ".venv"]);
const BUILD_OUTPUT = new Set(["lib", "dist"]);
const isSkippedDir = (name, dir) =>
  NEVER_INPUT.has(name) || (BUILD_OUTPUT.has(name) && existsSync(join(dir, "package.json")));

/** Minimal glob: `**` spans directories, `*` within one segment.
 * No brace/extglob — the table below uses only these two forms, and a
 * pattern the matcher cannot express should not compile into a silent
 * no-match (an unmatched glob with zero files hashes as zero files —
 * the wall asserts the big tiers' globs all match real trees). */
export function globMatch(pattern, relPath) {
  const patParts = pattern.split("/");
  const pathParts = relPath.split(sep);
  // seg(i, j): does patParts[i..] match pathParts[j..]?
  const seg = (i, j) => {
    if (i === patParts.length) return j === pathParts.length;
    const p = patParts[i];
    if (p === "**") {
      for (let k = j; k <= pathParts.length; k++) if (seg(i + 1, k)) return true;
      return false;
    }
    if (j >= pathParts.length) return false;
    if (!new RegExp("^" + p.split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("[^/]*") + "$").test(pathParts[j])) return false;
    return seg(i + 1, j + 1);
  };
  return seg(0, 0);
}

/** Every file under root matching any glob (deduped, repo-relative,
 * forward-slash). Directories walk recursively; a glob naming a file
 * directly matches itself. */
export function expandGlobs(root, globs) {
  const out = new Set();
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (isSkippedDir(e.name, dir)) continue;
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        const rel = relative(root, p).split(sep).join("/");
        if (globs.some((g) => globMatch(g, rel))) out.add(rel);
      }
    }
  };
  walk(root);
  return [...out].sort();
}

/** sha256 over (sorted relpath + content) of every matched file.
 * File set + contents both matter: a rename changes the set, an edit
 * changes a content slice — either moves the hash. */
function hashInputs(root, globs) {
  const files = expandGlobs(root, globs);
  const h = createHash("sha256");
  h.update(files.length + "\n");
  for (const rel of files) {
    h.update(rel + "\0");
    h.update(readFileSync(join(root, rel)));
  }
  return { hash: h.digest("hex"), files: files.length };
}

// PACKAGE CODE OUTSIDE src/ — the trees a package owns that tiers READ
// beside src/: its bins and scripts. Tests import them (the lane-pairing
// fence imports bin/infer-provision.mjs), the typecheck wall resolves
// their type twins, knip judges them as files. Every tier that hashes
// src/ hashes these too — one list, no per-tier asymmetry.
// (2026-11-25, CI 45492709450: a .d.mts beside the provisioner's
// own bin/ moved knip's answer and the typecheck wall's, every leased
// tier carried a stale green, and the push landed a red main.)
const PACKAGE_CODE = ["packages/**/bin/**", "packages/**/scripts/**"];

// THE TIER INPUT TABLE — one home for what each tier judges. This is
// the load-bearing table: conservative by construction (wide sets),
// and every set carries the battery's own scripts + the lockfile via
// the resolver below, never by repetition here.
export const TIER_INPUTS = {
  tsc: ["packages/**/src/**", "packages/**/tsconfig*.json", "packages/**/package.json", "pnpm-workspace.yaml", ...PACKAGE_CODE],
  build: ["packages/**/src/**", "packages/**/package.json", "package.json", "tools/build-plane.mjs", "scripts/*.mjs", ...PACKAGE_CODE],
  walls: ["tests/walls/**", "packages/**/tests/**", "packages/**/src/**", "vitest*.ts", "vitest*.mts", "packages/**/vitest*.ts", ...PACKAGE_CODE],
  // THE PRE-PUSH NODE SEAT (push-pipeline rework, 2026-11-17): the
  // lefthook walls job once ran the node project un-leased on EVERY
  // push — the same suite the battery's walls tier owns, paid twice.
  // Its green now carries on its own lease, same inputs as walls.
  "walls-node": ["tests/walls/**", "packages/**/tests/**", "packages/**/src/**", "vitest*.ts", "vitest*.mts", "packages/**/vitest*.ts", ...PACKAGE_CODE],
  expected: ["tests/expected/**", "packages/**/src/**", "packages/**/tests/**", "vitest.expected.config.ts", ...PACKAGE_CODE],
  bench: ["tests/bench/**", "packages/**/src/**", "packages/**/tests/**", "vitest.bench.config.ts", ...PACKAGE_CODE],
  snapshot: ["tests/snapshot/**", "packages/**/src/**", "packages/**/tests/**", "vitest.snapshot.config.ts", ...PACKAGE_CODE],
  web: ["packages/web/**/src/**", "packages/web/**/tests/**", "vitest.web.config.ts", ...PACKAGE_CODE],
  pytest: ["tests/**/*.py", "vendor/**/*.py", "packages/**/*.py"],
  // knip judges every file of every workspace the root config admits
  // (pnpm-workspace.yaml minus its ignoreWorkspaces) plus the root
  // project's own code. The lease hashes that whole surface — build
  // output and generated dirs stay out by the walker's rule, so a
  // coverage summary never re-fires it. The 2026-11-25 row hashed
  // src/ alone: narrower than the judge, and it carried.
  knip: ["knip.jsonc", "tools/knip-budget.mjs", "packages/**", "vendor/cordis_plugins/**", "tests/**", "scripts/**", "tools/**", "infra/**"],
  coverage: ["scripts/coverage-baseline.ts", "tools/coverage-ratchet.mjs", "packages/**/src/**", "packages/**/tests/**", "vitest*.ts", ...PACKAGE_CODE],
  // THE JUDGED-SURFACE LAW (audit 2026-11-17): the e2e tier's config
  // also runs packages/*/*/tests/**/*.e2e.ts and tests/lane/** and
  // imports vitest.shared.ts — a lease that hashes none of them lets
  // an edit there ride a green carry. Wider never narrower.
  e2e: ["tests/e2e/**", "tests/lane/**", "packages/**/tests/**", "vitest.e2e.config.ts", "vitest.shared.ts", "packages/**/src/**", "packages/engines/**/*.yaml", ...PACKAGE_CODE],
  // The browser tier runs BOTH playwright legs (view + deck, root
  // package.json test:web:browser) and the lane script + its lib are
  // node now — all four trees hash here now.
  browser: ["packages/web/melite-card-view/e2e/**", "packages/web/melite-card-deck/e2e/**", "packages/web/**/src/**", "packages/web/melite-card-view/playwright*.ts", "packages/web/melite-card-deck/playwright*.ts", "scripts/e2e-studio-lane.mjs", "scripts/lib/*.mjs", "packages/web/melite-card-view/package.json", "packages/web/melite-card-deck/package.json"],
};

/** The self-input law: the battery's own logic + the lockfile key every
 * tier. A rework of either invalidates every lease at once — a battery
 * bug must never ride a stale green. The root's own control files ride
 * the same set (audit 2026-11-15 must-change: a root package.json
 * script swap, a tsconfig flip, or a workflow edit silently carried
 * stale greens for every tier — the battery's own wiring is now an
 * input to the battery). */
export function tierGlobs(tierId) {
  const base = TIER_INPUTS[tierId];
  if (base === undefined) throw new Error("battery-leases: unknown tier " + tierId);
  return [
    ...new Set([
      ...base,
      "tools/hook-full-battery.mjs",
      "tools/battery-leases.mjs",
      "pnpm-lock.yaml",
      "package.json",
      "tsconfig*.json",
      ".github/workflows/**",
    ]),
  ];
}

/** The carry decision. 'carry' ONLY on a green lease whose recorded
 * hash equals the live hash — everything else fires. */
export function carryDecision(lease, liveHash) {
  if (lease === null || typeof lease !== "object") return "fire";
  if (lease.status !== "green") return "fire";
  if (typeof lease.hash !== "string" || lease.hash !== liveHash) return "fire";
  return "carry";
}

/** Load the store; any parse/shape trouble answers {} (every tier
 * fires — the store is a cache, never a source of truth). */
export function loadLeases(path) {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch { return {}; }
}

export function saveLeases(path, leases) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(leases, null, 2) + "\n");
}

/** One tier's gate: hash its inputs, decide, and hand back the
 * decision + the lease to write on green. Pure — no spawning here. */
export function tierGate(root, leases, tierId) {
  const { hash, files } = hashInputs(root, tierGlobs(tierId));
  const decision = carryDecision(leases[tierId] ?? null, hash);
  return { tierId, hash, files, decision };
}

/** Scratch-tree helper for the wall: hash a fabricated tree. */
export function hashTree(root, globs) { return hashInputs(root, globs).hash; }

export function rmTree(path) { rmSync(path, { recursive: true, force: true }); }
