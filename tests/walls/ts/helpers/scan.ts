// helpers/scan.ts — sources-as-text primitives for the walls plane.
//
// The vocabulary + hygiene walls read SOURCES the way an auditor would:
// no imports of the scanned tree (the condemned test_manage_parity.py
// layer-audit pattern). Erasable syntax only (strip-types runtime).
import { readFileSync } from "node:fs";

/** Read a repo-relative source file as UTF-8 text. */
export function readSource(repoRoot: string, rel: string): string {
  return readFileSync(repoRoot + "/" + rel, "utf-8");
}

/** Slice the first block starting at the line containing startMarker
 *  up to (exclusive) the first line at/after it containing endMarker. */
export function blockOf(text: string, startMarker: string, endMarker: string): string {
  const lines: string[] = text.split("\n");
  const start: number = lines.findIndex((ln: string): boolean => ln.includes(startMarker));
  if (start < 0) throw new Error("block start not found: " + startMarker);
  const rest: string[] = lines.slice(start);
  const end: number = rest.findIndex((ln: string, i: number): boolean => i > 0 && ln.includes(endMarker));
  if (end < 0) throw new Error("block end not found: " + endMarker);
  return rest.slice(0, end + 1).join("\n");
}

/** All double- or single-quoted string literals in a block. */
export function stringLiterals(block: string): string[] {
  const out: string[] = [];
  const re: RegExp = /"([^"\n]*)"|'([^'\n]*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(block)) !== null) {
    out.push(m[1] !== undefined ? (m[1] as string) : (m[2] as string));
  }
  return out;
}

/** Set equality diff, for wall failure messages. */
export function diffSets(want: ReadonlySet<string>, got: ReadonlySet<string>): string {
  const missing: string[] = [...want].filter((v: string): boolean => !got.has(v)).sort();
  const extra: string[] = [...got].filter((v: string): boolean => !want.has(v)).sort();
  return "missing=" + JSON.stringify(missing) + " extra=" + JSON.stringify(extra);
}

/** Strip line (//) and block comments — the hygiene wall's code-shape
 *  rules run on this; string literals are kept (runner argv hides in
 *  strings, and that is exactly what the import/spawn rules hunt). */
export function stripComments(text: string): string {
  const noBlocks: string = text.replace(/\/\*[\s\S]*?\*\//g, "");
  return noBlocks
    .split("\n")
    .map((ln: string): string => {
      // Cut // comments, but keep :// inside string literals (URLs).
      let inS: string | null = null;
      for (let i = 0; i + 1 < ln.length; i++) {
        const c: string = ln[i] as string;
        if (inS !== null) {
          if (c === inS) inS = null;
        } else if (c === '"' || c === "'") {
          inS = c;
        } else if (c === "/" && ln[i + 1] === "/") {
          return ln.slice(0, i);
        }
      }
      return ln;
    })
    .join("\n");
}
