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
import { readFileSync, readdirSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";

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
      if (e.name === "node_modules" || e.name === ".git" || e.name === "lib" || e.name === "dist") continue;
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

// THE TIER INPUT TABLE — one home for what each tier judges. This is
// the load-bearing table: conservative by construction (wide sets),
// and every set carries the battery's own scripts + the lockfile via
// the resolver below, never by repetition here.
export const TIER_INPUTS = {
  tsc: ["packages/**/src/**", "packages/**/tsconfig*.json", "packages/**/package.json", "pnpm-workspace.yaml"],
  build: ["packages/**/src/**", "packages/**/package.json", "package.json", "tools/build-plane.mjs", "scripts/*.mjs"],
  walls: ["tests/walls/**", "packages/**/tests/**", "packages/**/src/**", "vitest*.ts", "vitest*.mts", "packages/**/vitest*.ts"],
  expected: ["tests/expected/**", "packages/**/src/**", "packages/**/tests/**", "vitest.expected.config.ts"],
  bench: ["tests/bench/**", "packages/**/src/**", "packages/**/tests/**", "vitest.bench.config.ts"],
  snapshot: ["tests/snapshot/**", "packages/**/src/**", "packages/**/tests/**", "vitest.snapshot.config.ts"],
  web: ["packages/web/**/src/**", "packages/web/**/tests/**", "vitest.web.config.ts"],
  pytest: ["tests/**/*.py", "vendor/**/*.py", "packages/**/*.py"],
  knip: ["knip.jsonc", "tools/knip-budget.mjs", "packages/**/src/**", "packages/**/package.json"],
  coverage: ["scripts/coverage-baseline.ts", "tools/coverage-ratchet.mjs", "packages/**/src/**", "packages/**/tests/**", "vitest*.ts"],
  e2e: ["tests/e2e/**", "vitest.e2e.config.ts", "packages/**/src/**", "packages/engines/**/*.yaml"],
  browser: ["packages/web/melite-card-view/e2e/**", "packages/web/**/src/**", "packages/web/melite-card-view/playwright*.ts", "scripts/e2e-studio-lane.sh", "packages/web/melite-card-view/package.json"],
};

/** The self-input law: the battery's own logic + the lockfile key every
 * tier. A rework of either invalidates every lease at once — a battery
 * bug must never ride a stale green. */
export function tierGlobs(tierId) {
  const base = TIER_INPUTS[tierId];
  if (base === undefined) throw new Error("battery-leases: unknown tier " + tierId);
  return [...new Set([...base, "tools/hook-full-battery.mjs", "tools/battery-leases.mjs", "pnpm-lock.yaml"])];
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
