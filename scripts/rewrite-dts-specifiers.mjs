#!/usr/bin/env node
// rewrite-dts-specifiers.mjs — the declaration-emit gap the d.ts wall
// owns: `rewriteRelativeImportExtensions` rewrites .ts import paths to
// .js in emitted JAVASCRIPT only; TypeScript 5.7's declaration emit
// still writes `from "./x.ts"` into .d.ts. The tree's law (wall at
// tests/walls/ts/suites/gate-regressions.spec.ts, "no emitted d.ts
// names a relative .ts specifier") is the .js spelling — Node resolves
// the sibling .js the same build emits. cdad7baf8 cured this by hand;
// bd3c3754d's freshness sweep (bare tsc rebuilds) flipped every d.ts
// back and the wall ran red for three weeks. This script is the
// repeatable pass: run it after `pnpm run build` in any package.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SPEC = /(from\s*|import\(\s*)(["'])(\.\.?\/[^"']*?)\.ts(["'])/g;
let touched = 0;
let files = 0;

/** Walk one package's lib/ tree rewriting .ts specifiers to .js. */
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!name.endsWith('.d.ts')) continue;
    const before = readFileSync(full, 'utf8');
    const after = before.replace(SPEC, '$1$2$3.js$4');
    if (after !== before) {
      writeFileSync(full, after);
      touched += 1;
    }
    files += 1;
  }
}

const pkg = process.argv[2];
if (pkg === undefined) {
  console.error('usage: node scripts/rewrite-dts-specifiers.mjs <package-dir>');
  process.exit(1);
}
// The arg is a repo-relative package dir (the law: run from the
// repo root) or an absolute one — the ship lane passes relative,
// CI seats may pass absolute.
const lib = isAbsolute(pkg) ? join(pkg, 'lib') : join(ROOT, pkg, 'lib');
// A MISSING lib/ is a loud refusal, never a silent zero: the tool
// runs right after a build, so no lib means the build never
// happened — walking past it would green a pass over nothing
// (the same law as the ship lane's stamp verification).
if (!statSync(lib, { throwIfNoEntry: false })) {
  console.error(`rewrite-dts-specifiers: no lib/ under ${pkg} — build the package first`);
  process.exit(1);
}
walk(lib);
console.log(`${pkg}: ${files} d.ts walked, ${touched} rewritten (.ts → .js)`);
