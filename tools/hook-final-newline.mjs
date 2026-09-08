#!/usr/bin/env node
// hook-final-newline.mjs — pre-commit checkpoint (the .editorconfig
// insert_final_newline rule, enforced where git cannot reach).
// Usage: node tools/hook-final-newline.mjs <staged files...>
import { readFileSync } from "node:fs";

const TEXTY = /\.(ts|tsx|mjs|cjs|js|jsx|json|yml|yaml|md|sh|css|html|svg|txt)$/;

let bad = [];
for (const f of process.argv.slice(2)) {
  if (!TEXTY.test(f)) continue;
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
