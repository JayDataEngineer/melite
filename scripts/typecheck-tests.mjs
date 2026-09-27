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
import { spawnSync } from "node:child_process";

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
const flattenConfig = (dir) => {
  const proc = spawnSync(process.execPath, [tsc, "--showConfig", "-p", "tsconfig.json"], {
    cwd: dir, encoding: "utf8", timeout: 120_000,
  });
  if (proc.status !== 0) throw new Error(`showConfig failed in ${dir}: ${proc.stderr}`);
  return JSON.parse(proc.stdout);
};

let failed = 0;
let checked = 0;
const pool = Number(process.env.TC_POOL ?? 8);
const queue = [...dirs];
const runOne = (d) => {
  const tdirs = ["test", "tests"].filter((t) => existsSync(join(d, t)));
  if (tdirs.length === 0) return Promise.resolve();
  checked++;
  const include = ["src/**/*.ts", "src/**/*.tsx"];
  for (const t of tdirs) include.push(`${t}/**/*.ts`, `${t}/**/*.tsx`);
  const cfg = join(d, ".tsconfig.test.json");
  // FLATTEN THE EXTENDS CHAIN and STRIP rootDir: `extends` cannot
  // un-set it, and any package-local rootDir TS6059s the foreign
  // sources specs legitimately import (repo tests/helpers, sibling
  // packages). The package's own config keeps its emit contract;
  // this tier never emits.
  const flat = flattenConfig(d);
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
  const proc = spawnSync(process.execPath, [tsc, "--noEmit", "-p", ".tsconfig.test.json"], {
    cwd: d, encoding: "utf8", timeout: 240_000,
  });
  rmSync(cfg, { force: true });
  const name = relative(root, d);
  if (proc.status !== 0) {
    failed++;
    console.log(`✗ ${name}`);
    const lines = (proc.stdout + proc.stderr).split("\n").filter((l) => l.includes("error TS"));
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
console.log(`test-tier: ${checked} packages with test dirs, ${failed} red`);
process.exit(failed > 0 ? 1 : 0);
