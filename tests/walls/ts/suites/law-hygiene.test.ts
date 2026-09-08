// law-hygiene.test.ts — law-text hygiene for TypeScript sources.
//
// Successor of the tests/walls/suites/test_law_hygiene.py idea
// (condemned — read-only spec, never edited), pointed at the ported
// world: the deleted estate modules (RIP c0aa2187 — manage, flow,
// editor_forms/runs, plugins, melite_cards/models, stage_params,
// flow_graph, form_wire, run_wire, artifact_refs, asset_ledger,
// card_requires, estate_config, plus the purged action_cards
// card.py/model.py plane) must have NO LIVE references in TS sources.
//
// LIVE means: followed at runtime or build time — static/dynamic
// imports, require(), spawn argv (`-m <stem>`), sys.path inserts, and
// infra/python path joins in code. Two carve-outs, both load-bearing:
//   - the base-env VENDOR binary (infra/python/.venv/bin/*): third-party
//     engine/manager packages are kept by the RIP stroke, never estate
//     code — code lines naming a .venv/bin target pass;
//   - the vendor cm_cli module (`-m cm_cli`): ComfyUI-Manager's OWN cli,
//     their API per the manage door contract — never an estate module.
//
// NOT live (and therefore passing): provenance comments — line-cited
// behavioral origins ("twin of", "mirrors", "transcribed 1:1") and
// dead-marked history ("is dead", "is deleted", "was deleted",
// "deleted under"). A comment that TEACHES authority is different: any
// SSOT/authoritative claim naming a dead path fails — UNLESS the same
// claim dead-marks it (the narrow exemption below), which is provenance,
// not authority (LAW TEXT HYGIENE: dead paths in authority voice teach
// dead shapes with extra authority).
//
// Scope: packages/*/src + apps/*/src (.ts/.tsx, node_modules excluded).
// tests/, docs/, and vendored/third-party trees are out of scope.
//
// Run: node --experimental-strip-types --test tests/walls/ts/suites/law-hygiene.test.ts
// (or the whole plane: node tests/walls/ts/run.mjs)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { REPO_ROOT } from "../helpers/boot.ts";
import { stripComments } from "../helpers/scan.ts";

/** Deleted estate module stems (RIP c0aa2187 + the card.py/model.py purge). */
const DEAD_STEMS: readonly string[] = [
  "manage",
  "flow",
  "editor_forms",
  "editor_runs",
  "estate_config",
  "flow_graph",
  "form_wire",
  "run_wire",
  "stage_params",
  "artifact_refs",
  "asset_ledger",
  "card_requires",
  "melite_cards",
  "melite_models",
  "plugins",
];

const SCAN_ROOTS: readonly string[] = ["packages", "apps"];

function tsFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name.startsWith(".")) continue;
      const p: string = join(dir, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else if (st.isFile() && (name.endsWith(".ts") || name.endsWith(".tsx"))) out.push(p);
    }
  };
  for (const root of SCAN_ROOTS) walk(join(REPO_ROOT, root));
  return out.sort();
}

/** A from/require/import target is estate-shaped when it names a dead
 *  stem WITHOUT a TS-relative prefix (./...) and WITHOUT a TS/JS
 *  suffix — "./manage.ts" is the new door, "manage" / "manage.py" /
 *  "infra/python/..." is the dead module. */
function estateTarget(target: string): string | null {
  if (target.startsWith("./") || target.startsWith("../")) return null;
  if (/\.(ts|tsx|js|mjs|cjs)$/.test(target)) return null;
  for (const stem of DEAD_STEMS) {
    // Bare stems are word-matched, but "flow" and "plugins" are too
    // generic to match bare — they only count as infra/python paths.
    if ((stem === "flow" || stem === "plugins") && !target.includes("infra/python") && !target.includes("python/")) {
      continue;
    }
    const hit: boolean =
      target === stem ||
      target.endsWith("/" + stem) ||
      target.endsWith("/" + stem + ".py") ||
      target === stem + ".py" ||
      target.includes("infra/python/" + stem) ||
      target.includes("python/" + stem);
    if (hit) return stem;
  }
  return null;
}

function liveHits(code: string): string[] {
  const hits: string[] = [];
  const fromRe: RegExp = /(?:from|require\()\s*["']([^"']+)["']/g;
  const dynRe: RegExp = /import\(\s*["']([^"']+)["']\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = fromRe.exec(code)) !== null) {
    const stem: string | null = estateTarget(m[1] as string);
    if (stem !== null) hits.push("import of dead estate module '" + stem + "' (" + (m[1] as string) + ")");
  }
  while ((m = dynRe.exec(code)) !== null) {
    const stem: string | null = estateTarget(m[1] as string);
    if (stem !== null) hits.push("dynamic import of dead estate module '" + stem + "' (" + (m[1] as string) + ")");
  }
  // spawn argv: "-m", "<stem>" (estate modules executed as programs).
  const spawnRe: RegExp = /["']-m["']\s*,\s*["']([A-Za-z_]+)["']/g;
  while ((m = spawnRe.exec(code)) !== null) {
    const mod: string = m[1] as string;
    if ((DEAD_STEMS as readonly string[]).includes(mod) && mod !== "flow" && mod !== "plugins") {
      hits.push("spawn -m of dead estate module '" + mod + "'");
    }
  }
  if (/\bmanage\.dispatch\b/.test(code)) hits.push("live manage.dispatch reference");
  if (/sys\.path/.test(code)) hits.push("sys.path manipulation (estate-python seam)");
  // infra/python joins in code — except the kept base-env vendor
  // binaries (infra/python/.venv/bin/*).
  for (const ln of code.split("\n")) {
    if (ln.includes("infra/python") && !ln.includes(".venv/bin/")) {
      hits.push("infra/python path in live code: " + ln.trim().slice(0, 120));
    }
  }
  return hits;
}

function authorityHits(fullText: string): string[] {
  const hits: string[] = [];
  const re: RegExp = /(SSOT is|SSOT:|is authoritative|authoritative source)([^\n]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(fullText)) !== null) {
    const tail: string = m[2] as string;
    if (!/python\/manage|infra\/python\//.test(tail)) continue;
    // Dead-marked in the same breath is provenance, not authority.
    if (/\bis (dead|deleted)\b|\bwas deleted\b|deleted under/.test(tail)) continue;
    hits.push("dead-authority claim: '" + (m[1] as string) + tail.trim().slice(0, 100) + "'");
  }
  return hits;
}

describe("law-text hygiene (TS sources)", () => {
  it("no live references to deleted estate modules", () => {
    const bad: string[] = [];
    for (const file of tsFiles()) {
      const text: string = readFileSync(file, "utf-8");
      const code: string = stripComments(text);
      for (const hit of liveHits(code)) {
        bad.push(file.slice(REPO_ROOT.length + 1) + ": " + hit);
      }
    }
    assert.deepEqual(bad, [], "live references to deleted estate modules:\n" + bad.join("\n"));
  });

  it("no SSOT/authoritative claims naming dead paths", () => {
    const bad: string[] = [];
    for (const file of tsFiles()) {
      const text: string = readFileSync(file, "utf-8");
      for (const hit of authorityHits(text)) {
        bad.push(file.slice(REPO_ROOT.length + 1) + ": " + hit);
      }
    }
    assert.deepEqual(bad, [], "dead-authority claims:\n" + bad.join("\n"));
  });
});
