#!/usr/bin/env node
// hook-final-newline.mjs — pre-commit checkpoint (the .editorconfig
// insert_final_newline rule, enforced where git cannot reach).
// Usage: node tools/hook-final-newline.mjs <staged files...>
import { readFileSync } from "node:fs";

const TEXTY = /\.(ts|tsx|mjs|cjs|js|jsx|json|yml|yaml|md|sh|css|html|svg|txt)$/;

// GENERATED OUTPUT IS NOT SOURCE (2026-10-10, the li-u receipt).
// Five packages compile to lib/ (their main/exports point there and
// the running estate loads them — dev_docs/deployment/build.md owns that
// law). tsc emits no trailing newline, so staging a rebuild tripped
// this hook on nineteen generated files and the commit could not
// land — an editor-side convention applied to a build artifact. The
// list is the five compiled packages, exactly.
const GENERATED = [
  "packages/estate/drafts/lib/",
  "packages/estate/manage/lib/",
  "packages/estate/media/lib/",
  "packages/estate/runs/lib/",
  "packages/vendor/typert-protocol/lib/",
];

let bad = [];
for (const f of process.argv.slice(2)) {
  if (!TEXTY.test(f)) continue;
  if (GENERATED.some((p) => f.startsWith(p))) continue;
  let b;
  try {
    b = readFileSync(f);
  } catch {
    continue; // deleted or binary — not this hook's case
  }
  if (b.length > 0 && b[b.length - 1] !== 0x0a) bad.push(f);
}
if (bad.length > 0) {
  console.error("missing final newline (editorconfig): " + bad.join(", "));
  process.exit(1);
}
