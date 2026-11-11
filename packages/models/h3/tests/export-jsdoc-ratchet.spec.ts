// @contract models-export-jsdoc
// export-jsdoc-ratchet.spec.ts — THE EXPORT-JSDOC RATCHET WALL
// (AGENTS MD BASE: "Every module and export has concise JSDoc for its
// non-obvious contract; function-like exports include @param/@returns,
// as enforced by verify-export-jsdoc"). That gate lives in the harness
// reference tree; THIS wall is the estate-side judge that keeps the
// h3 family's src plane from regressing under it. The wall walks every
// .ts file under src/ (the tree, never a hand list) and counts each
// file's function-like exports — `export function` and `export const
// x = (...) =>` — whose JSDoc (the /** block closing within the 3
// lines above the export line) fails the contract: an @param line per
// parameter name (parsed from the signature) plus @returns.
//
// THE INVARIANT IT GUARDS: every function-like export of the h3 src
// plane states its contract — preconditions, postconditions, and the
// parameter/return obligations callers rely on — at the declaration
// the caller reads. Type-only exports, const rosters that are not
// function-like, and re-exports sit outside the judge.
//
// THE CENSUS IS A RATCHET (the anti-sniff-casts precedent): BASELINE
// seats each file's EXACT undocumented count — the adjudicated
// remainder. A file EXCEEDING its row reds (a new undocumented
// export); a file carrying undocumented exports with NO row reds the
// first time; and a file DROPPING below its row reds too, because
// both directions drift the seated census — an improvement must step
// the baseline DOWN in the same change, never leave it seated on a
// stale number.
//
// timelineContract.ts is seated at 0 (2026-11-10, the export-doc
// audit's primary face: every function-like export there now carries
// its @param/@returns); the other rows are the adjudicated remainder,
// one conscious step-down at a time.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, test } from "vitest";
import assert from "node:assert/strict";

const PKG = join(import.meta.dirname, "..");
const SRC = join(PKG, "src");

/** Every .ts file under src/, walked — never a hand list. */
const FILES: string[] = [];
{
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".ts")) FILES.push(p);
    }
  };
  walk(SRC);
  FILES.sort();
}

/** The adjudicated census (2026-11-10, the export-doc audit):
 *  package-relative file → its exact count of undocumented
 *  function-like exports. A file whose src carries an undocumented
 *  export and is ABSENT here is itself a red. */
const BASELINE: Record<string, number> = {
  "src/timelineContract.ts": 0,
  "src/actions.ts": 6,
  "src/chainEdit.ts": 1,
  "src/chainUpscale.ts": 1,
  "src/edit.ts": 1,
  "src/extend.ts": 1,
  "src/filmMix.ts": 4,
  "src/finalize.ts": 1,
  "src/refine.ts": 2,
  "src/repair.ts": 1,
  "src/reshoot.ts": 3,
  "src/schema.ts": 2,
  "src/secondPass.ts": 3,
  "src/swap.ts": 1,
  "src/windowSpec.ts": 1,
};

/** The parameter-list text: from the `(` that opens the list,
 *  depth-walked (across lines) to its matching `)`. */
function paramText(lines: string[], exportLine: number, openInLine: number): string {
  let depth = 1;
  let buf = "";
  for (let li = exportLine; li < lines.length && depth > 0; li++) {
    const start = li === exportLine ? openInLine + 1 : 0;
    for (let p = start; p < lines[li].length; p++) {
      const c = lines[li][p];
      if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) break;
      }
      buf += c;
    }
    buf += " ";
  }
  return buf;
}

/** Top-level comma split; each segment's leading identifier is the
 *  parameter name (a `...` rest folds in; a destructured `{...}`
 *  binding and `this` carry no single name and sit out). */
function paramNames(list: string): string[] {
  const segs: string[] = [];
  let depth = 0;
  let cur = "";
  for (const c of list) {
    if ("(<[{".includes(c)) { depth++; cur += c; }
    else if (")>]}".includes(c)) { depth--; cur += c; }
    else if (c === "," && depth === 0) { segs.push(cur); cur = ""; }
    else cur += c;
  }
  if (cur.trim() !== "") segs.push(cur);
  const names: string[] = [];
  for (const raw of segs) {
    const seg = raw.trim();
    if (seg.startsWith("{")) continue;
    const m = /^(\.\.\.)?\s*([A-Za-z_$][\w$]*)/.exec(seg);
    if (m && m[2] !== "this") names.push(m[2]);
  }
  return names;
}

/** The JSDoc block whose closing delimiter sits within the 3 lines
 *  above the export line — null when none does. */
function docBlockAbove(lines: string[], exportLine: number): string | null {
  for (let k = exportLine - 1; k >= exportLine - 3 && k >= 0; k--) {
    if (!lines[k].trim().endsWith("*/")) continue;
    let s = k;
    while (s >= 0 && !lines[s].trim().startsWith("/**")) s--;
    return s < 0 ? null : lines.slice(s, k + 1).join("\n");
  }
  return null;
}

/** The names the block's @param lines declare (an optional `{type}`
 *  prefix and the one-line dash style both fold away). */
function documentedParamNames(block: string): Set<string> {
  const names = new Set<string>();
  for (const seg of block.split("@param").slice(1)) {
    const m = /^\s*\{[^}]*\}\s*([A-Za-z_$][\w$]*)/.exec(seg) ?? /^\s*([A-Za-z_$][\w$]*)/.exec(seg);
    if (m) names.add(m[1]);
  }
  return names;
}

/** A function-like export is documented when its adjacent JSDoc
 *  carries @returns and one @param per parsed parameter name. */
function isDocumentedExport(lines: string[], exportLine: number, names: string[]): boolean {
  const block = docBlockAbove(lines, exportLine);
  if (block === null || !block.includes("@returns")) return false;
  const documented = documentedParamNames(block);
  return names.every((n) => documented.has(n));
}

/** One file's undocumented function-like exports, named: `export
 *  function` (async/generator included) and function-like `export
 *  const x = (...) =>`. Type-only exports, rosters that are not
 *  function-like, and re-exports never match either shape. */
function undocumentedExports(path: string): Array<{ name: string; line: number }> {
  const lines = readFileSync(path, "utf8").split("\n");
  const missing: Array<{ name: string; line: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let name: string | null = null;
    let openInLine = -1;
    let names: string[] = [];
    const fn = /^(?:export\s+)(?:declare\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/.exec(line);
    const arrow = /^export\s+const\s+([A-Za-z_$][\w$]*)\s*(?::[^=\n]*)?=\s*(?:async\s*)?\(/.exec(line);
    if (fn) {
      name = fn[1];
      openInLine = line.indexOf("(", fn[0].length);
      if (openInLine < 0) continue;
      names = paramNames(paramText(lines, i, openInLine));
    } else if (arrow) {
      name = arrow[1];
      openInLine = arrow.index + arrow[0].length - 1; // the matched `(`
      names = paramNames(paramText(lines, i, openInLine));
    } else {
      continue;
    }
    if (!isDocumentedExport(lines, i, names)) missing.push({ name, line: i + 1 });
  }
  return missing;
}

describe("THE EXPORT-JSDOC RATCHET — every function-like export states its @param/@returns contract", () => {
  test("each src file's undocumented census equals its seated baseline exactly", () => {
    const failures: string[] = [];
    for (const file of FILES) {
      const rel = relative(PKG, file);
      const missing = undocumentedExports(file);
      const seated = BASELINE[rel];
      if (missing.length === 0) {
        if (seated !== undefined && seated !== 0) {
          failures.push(
            `${rel}: carries 0 undocumented function-like exports, but the baseline seats ${seated} — ` +
            "STEP THE BASELINE DOWN in the same change (an improvement that leaves the ratchet seated is drift)",
          );
        }
        continue;
      }
      const named = missing.map((m) => `  - ${m.name} @${m.line}`).join("\n");
      if (seated === undefined) {
        failures.push(
          `${rel}: ${missing.length} undocumented function-like export(s) with NO baseline row — ` +
          `document them (@param per parameter + @returns) or seat the file consciously:\n${named}`,
        );
      } else if (missing.length > seated) {
        failures.push(
          `${rel}: ${missing.length} undocumented function-like export(s) EXCEED the seated ${seated} — ` +
          `document the new ones (@param per parameter + @returns):\n${named}`,
        );
      } else if (missing.length < seated) {
        failures.push(
          `${rel}: ${missing.length} undocumented function-like export(s) dropped BELOW the seated ${seated} — ` +
          "STEP THE BASELINE DOWN in the same change (the improvement must move the ratchet)",
        );
      }
    }
    assert.strictEqual(
      failures.length, 0,
      `the export-jsdoc ratchet red:\n\n${failures.join("\n\n")}`,
    );
  });
});
