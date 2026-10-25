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
// SIX (2026-10-12): estate-queue's lib went committed at the qwen
// fold (e596f0921) — same class (tsc artifact, main/exports point
// at lib/, the running estate loads it), same exemption.
// WHOLESALE (tier-cures-audit item 2, 2026-11-06): the six-prefix
// list grew one build plane at a time while bd3c3754d landed 649
// stripped artifacts, 397 outside the exemption (comfyui-cordis
// 239, melite-tools 88, h3 22) — every tsc/tsdown package trips
// this hook on rebuild. The artifact plane is now declared
// WHOLESALE (any lib/ or dist/ segment): build output is not
// source, no matter which package emitted it. The authored plane's
// second seat is the walls census (file-hygiene-newline.spec.ts) —
// this hook judges the STAGED authored set, the census judges the
// TRACKED authored set, and the two share one artifact grammar.
const ARTIFACT = /(^|\/)lib\/|(^|\/)dist\//;


let bad = [];
for (const f of process.argv.slice(2)) {
  if (!TEXTY.test(f)) continue;
  if (ARTIFACT.test(f)) continue;
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
