#!/usr/bin/env node
// typecheck-tests.mjs — THE TEST-TIER TYPECHECK RUNNER (li-aq.2).
//
// The src-only net (tsc -p tsconfig.json per package) closed the
// live incident class — a missing import in SHIPPED source — but
// the rules audit's HIGH-2 held: package tsconfigs include src/**
// only, so the SPEC files (the estate's other half: 85 packages
// carry test dirs) were typed by nothing. A spec that imports a
// name a module never exported (TS2724, live in 22 card-view
// files at audit time) is invisible to every wall — runtime-clean
// only because `import type` erases.
//
// This script is ONE implementation with two callers: the wall
// (tests/walls/ts/suites/typecheck-gate.spec.ts) and the ship
// (scripts/ship-lane.sh). Per package it synthesizes a config that
// extends the package's own tsconfig and adds the test dirs, then
// runs tsc --noEmit. The synthesis is on the fly (nothing
// materialized to rot); the package's own compiler settings hold.
//
// Exit 1 red, package-by-package lines on stdout, summary last.

import { readdirSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tsc = join(root, "node_modules/.pnpm/typescript@5.7.3/node_modules/typescript/bin/tsc");

// DISCOVERY — same shape as the wall's src tier: every dir under
// packages/ (depth ≤ 2, node_modules never walked) holding a
// tsconfig.json. A named list is exactly the list that rots.
const dirs = [];
const walk = (d, depth) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "node_modules" || e.name === "lib") continue;
    const p = join(d, e.name);
    if (existsSync(join(p, "tsconfig.json"))) dirs.push(p);
    if (depth < 1) walk(p, depth + 1);
  }
};
walk(join(root, "packages"), 0);

/** The RESOLVED config, tsc's own reading (handles comments,
 *  extends chains, and URL strings in values — hand-rolled
 *  JSONC-stripping eats strings and lies). */
const flattenConfig = async (dir) => {
  try {
    const { stdout } = await execFileP(process.execPath, [tsc, "--showConfig", "-p", "tsconfig.json"], {
      cwd: dir, encoding: "utf8", timeout: 120_000, maxBuffer: 32 * 1024 * 1024,
    });
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(`showConfig failed in ${dir}: ${err.stderr ?? err.message}`);
  }
};

let failed = 0;
let checked = 0;
const pool = Number(process.env.TC_POOL ?? 8);
const queue = [...dirs];
const runOne = async (d) => {
  const tdirs = ["test", "tests"].filter((t) => existsSync(join(d, t)));
  if (tdirs.length === 0) return;
  checked++;
  const include = ["src/**/*.ts", "src/**/*.tsx"];
  for (const t of tdirs) include.push(`${t}/**/*.ts`, `${t}/**/*.tsx`);
  const cfg = join(d, `.tsconfig.test.${process.pid}.json`);
  // FLATTEN THE EXTENDS CHAIN and STRIP rootDir: `extends` cannot
  // un-set it, and any package-local rootDir TS6059s the foreign
  // sources specs legitimately import (repo tests/helpers, sibling
  // packages). The package's own config keeps its emit contract;
  // this tier never emits.
  const flat = await flattenConfig(d);
  // A COMPILED package (it EMITS to lib) keeps rootDir: "." for its
  // test tier. Its specs import its own package face (NodeNext
  // forbids extensionless relative paths, and `.ts` specifiers are
  // illegal beside a real emit), so resolving the package's own
  // export map needs a project root — without it tsc answers
  // TS2209 "the project root is ambiguous". A source-run package
  // still loses rootDir, or the foreign sources its specs import
  // TS6059.
  if (flat.compilerOptions.noEmit === false || typeof flat.compilerOptions.outDir === "string") {
    flat.compilerOptions.rootDir = ".";
  } else {
    delete flat.compilerOptions.rootDir;
  }
  flat.compilerOptions.noEmit = true;
  flat.include = include;
  writeFileSync(cfg, JSON.stringify(flat));
  // try/finally, not tail-rm: a killed or timed-out run must not
  // leave the synthesized config in the package dir (it once
  // leaked .tsconfig.test.<pid>.json for every worker to see).
  let proc;
  try {
    // 480s: the wall runs this INSIDE the full fleet, where CPU
    // contention tripled cold tsc times; a 240s cut marked loaded
    // runs red with no error lines (status null under SIGTERM).
    proc = await execFileP(process.execPath, [tsc, "--noEmit", "-p", cfg], {
      cwd: d, encoding: "utf8", timeout: 480_000, maxBuffer: 32 * 1024 * 1024,
    }).catch((err) => err); // execFile throws on nonzero exit; the judge reads it below
  } finally {
    rmSync(cfg, { force: true });
  }
  const status = proc instanceof Error ? (proc.code ?? null) : 0;
  const name = relative(root, d);
  if (status !== 0) {
    failed++;
    console.log(`✗ ${name}`);
    const out = proc instanceof Error ? `${proc.stdout ?? ""}${proc.stderr ?? ""}` : proc.stdout;
    const lines = out.split("\n").filter((l) => l.includes("error TS"));
    for (const l of lines.slice(0, 6)) console.log(`  ${l}`);
    if (lines.length > 6) console.log(`  … ${lines.length} errors`);
  } else {
    console.log(`✓ ${name}`);
  }
};
// bounded pool — same shape as the wall (one tsc per core, no fork bomb)
const workers = Array.from({ length: Math.min(pool, queue.length) }, async () => {
  for (;;) {
    const d = queue.shift();
    if (d === undefined) return;
    await runOne(d);
  }
});
await Promise.all(workers);

// THE REPO TIER (the audit's gate hole: tools/ and the repo-level
// tests/ — harness, helpers, e2e — were typed by NOTHING; its first
// sweep found six live defects, including comfyuiExecutor callers
// the reseat's ctx parameter made stale). One tracked config
// (tsconfig.repotier.json, root-relative, the same canonical-paths
// borrowing the walls plane uses), run after the package loop.
{
  const proc = await execFileP(process.execPath, [tsc, "--noEmit", "-p", "tsconfig.repotier.json"], {
    cwd: root, encoding: "utf8", timeout: 240_000, maxBuffer: 32 * 1024 * 1024,
  }).catch((err) => err);
  const status = proc instanceof Error ? (proc.code ?? null) : 0;
  if (status !== 0) {
    failed++;
    console.log("✗ repo tier (tools/ + tests/*.ts + tests/e2e)");
    const out = proc instanceof Error ? `${proc.stdout ?? ""}${proc.stderr ?? ""}` : proc.stdout;
    const lines = out.split("\n").filter((l) => l.includes("error TS"));
    for (const l of lines.slice(0, 6)) console.log(`  ${l}`);
    if (lines.length > 6) console.log(`  … ${lines.length} errors`);
  } else {
    console.log("✓ repo tier (tools/ + tests/*.ts + tests/e2e)");
  }
}
console.log(`test-tier: ${checked} packages with test dirs + the repo tier, ${failed} red`);
process.exit(failed > 0 ? 1 : 0);
