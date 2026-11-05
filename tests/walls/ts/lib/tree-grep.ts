// tree-grep.ts — the walls' node-native content scanner (class B R4,
// 2026-10-31: the census arms used to spawn `grep -rl … --include=…`
// inside silent try/catch blocks — a grep that failed (a missing
// binary, a PATH divergence) degraded the census to `[]` and the
// wall PASSED while judging nothing: a wall that can lie). This
// scanner reproduces the grep semantics the arms depended on and
// turns every failure loud:
//
//   - walk: recursive readdir over each root, symlinked entries NOT
//     descended (GNU grep -r only follows symlinks named on the
//     command line — pnpm's node_modules/<dep> links stay out, so
//     the walk scope is the real-file tree, byte-identical scope to
//     the grep it replaced);
//   - filter: extension `*.ts`/`*.tsx` (the `--include` set);
//   - match: literal substring over the raw bytes (`indexOf` on the
//     Buffer — grep -F semantics; every token these walls pass is
//     metachar-free, so regex mode and literal mode agree);
//   - output: `<root>/<relative path>` with duplicate roots skipped,
//     SORTED (the consumers are census arms that count and filter —
//     none is order-sensitive — and a sorted census cannot flap on
//     readdir order);
//   - errors: an unreadable root or file THROWS naming the path —
//     never a silent `[]`.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const INCLUDED = /\.(?:ts|tsx)$/u;

/** Every file under `roots` whose raw bytes carry `token`, sorted.
 *  @param token  literal needle (no regex — the callers pass
 *                identifiers).
 *  @param roots  directories to walk; blank entries are skipped (the
 *                family-coverage caller pre-filters empties). */
export function grepTree(token: string, roots: readonly string[]): string[] {
  if (token === "") throw new Error("grepTree: an empty token matches every file — the census would lie");
  const needle = Buffer.from(token, "utf8");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const root of roots) {
    if (root === "") continue;
    const abs = root.replace(/[/\\]+$/u, "");
    if (seen.has(abs)) continue;
    seen.add(abs);
    for (const rel of walk(abs)) {
      const bytes = readFileSync(join(abs, rel));
      if (bytes.includes(needle)) out.push(`${abs}/${rel}`);
    }
  }
  return out.sort();
}

/** Relative paths of every .ts/.tsx file under dir, symlinked
 *  entries never descended, sorted for a deterministic walk. */
function walk(dir: string, prefix = ""): string[] {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    throw new Error(`grepTree: root unreadable — the census refuses to degrade: ${String(e)}`);
  }
  const out: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const rel = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    else if (INCLUDED.test(entry.name)) out.push(rel);
  }
  return out.sort();
}
