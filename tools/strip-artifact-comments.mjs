#!/usr/bin/env node
/**
 * tools/strip-artifact-comments.mjs — publish-plane comment hygiene.
 *
 * Compiled output inherits the source plane's dated rationale comments
 * ("2026-09-10, the operator's law…", "the card audit's M1", "no longer…").
 * Those are development history, not artifact content: this tool removes
 * any comment in a shipped .js/.mjs/.css/.d.ts file that carries leakage
 * markers, and keeps every other comment (clean JSDoc API contracts stay).
 *
 * The scanner is string-aware: comment syntax inside string literals,
 * template literals, and regexes is never touched, so URLs and code
 * survive byte-identical.
 *
 * Usage:
 *   node tools/strip-artifact-comments.mjs <file>...   (in-place)
 *   node tools/strip-artifact-comments.mjs --check <file>...  (report only)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

/** Leakage markers: dates, audit codes, TODO-family, reasoning verbs. */
const LEAK = [
  /\b20[0-2]\d[-/](0?[1-9]|1[0-2])[-/](0?[1-9]|[12]\d|3[01])/, // dates: 2026-09-07, 2026/9/7
  /\b(ROW \d|li-[a-z]{1,3}\b|mint\d{1,2})/, // ledger/mint codes
  /\b(TODO|FIXME|HACK|XXX)\b/,
  /\bM\d{1,2}\b(?![\w-])/, // audit item codes (M1..M99)
  /\bG[1-5]\b(?![\w-])/, // gate codes
  /(moved OUT|no longer|used to|decision \d|\(decision|in review|later PR|this PR|the operator'?s law|the compact law|reseat)/i,
];

const isLeak = (text) => LEAK.some((re) => re.test(text));

/**
 * Remove `//`-line and `/*`-block comments whose text matches a leakage
 * marker. Strings ('', "") pass through verbatim; template literals copy
 * verbatim EXCEPT their `${ … }` interiors, which are code and may hold
 * comments — those interiors are scanned recursively. Regexes and
 * everything else pass untouched. Returns the rewritten text.
 */
export function stripLeakageComments(src) {
  const scan = (text) => {
    let out = "";
    let i = 0;
    const n = text.length;
    // last significant char + last identifier word, for regex-vs-division
    let prevChar = "";
    let prevWord = "";
    while (i < n) {
      const c = text[i];
      if (/\s/.test(c)) { out += c; i++; continue; }
      const wordStart = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(text.slice(i));
      if (wordStart) {
        prevWord = wordStart[0]; prevChar = prevWord.slice(-1);
        out += prevWord; i += prevWord.length;
        continue;
      }
      // plain string literals — copy verbatim (handles \-escapes)
      if (c === '"' || c === "'") {
        const quote = c;
        out += c; prevChar = quote === '"' ? '"' : "'";
        i++;
        while (i < n) {
          if (text[i] === "\\") { out += text[i] + (text[i + 1] ?? ""); i += 2; continue; }
          out += text[i];
          if (text[i] === quote) { i++; break; }
          i++;
        }
        prevWord = "";
        continue;
      }
      // template literal — verbatim except ${ } interiors are rescanned
      if (c === "`") {
        out += c;
        i++;
        while (i < n) {
          if (text[i] === "\\") {
            out += text[i] + (text[i + 1] ?? "");
            i += 2;
            continue;
          }
          if (text[i] === "$" && text[i + 1] === "{") {
            // find the matching close brace, respecting nesting and strings
            let depth = 1;
            let j = i + 2;
            while (j < n && depth > 0) {
              const ch = text[j];
              if (ch === '"' || ch === "'" || ch === "`") {
                const q = ch;
                j++;
                while (j < n) {
                  if (text[j] === "\\") {
                    j += 2;
                    continue;
                  }
                  if (text[j] === q) break;
                  j++;
                }
              } else if (ch === "{") depth++;
              else if (ch === "}") depth--;
              j++;
            }
            const inner = text.slice(i + 2, j - 1);
            out += "${" + scan(inner) + "}";
            i = j;
            continue;
          }
          out += text[i];
          if (text[i] === "`") {
            i++;
            break;
          }
          i++;
        }
        continue;
      }
      // regex literal — copy verbatim when a `/` sits in expression
      // position (after an operator/`(`/`,`/start, or after keywords like
      // return); character classes may hold quotes and `/` without
      // closing the literal. Division position falls through untouched.
      if (c === "/" && text[i + 1] !== "/" && text[i + 1] !== "*") {
        const afterValue =
          prevChar === "" || prevChar === ")" || prevChar === "]" ||
          (prevChar !== "" && /[A-Za-z0-9_$."'`]/.test(prevChar));
        const keywordBefore =
          ["return", "typeof", "instanceof", "in", "of", "new", "delete",
           "void", "throw", "case", "do", "else", "yield", "await"].includes(prevWord);
        if (!afterValue || keywordBefore) {
          let j = i + 1;
          let inClass = false;
          while (j < n) {
            if (text[j] === "\\") { j += 2; continue; }
            if (inClass) { if (text[j] === "]") inClass = false; j++; continue; }
            if (text[j] === "[") { inClass = true; j++; continue; }
            if (text[j] === "/") break;
            if (text[j] === "\n") break; // unterminated — treat as not-a-literal
            j++;
          }
          if (j < n && text[j] === "/") {
            let k = j + 1;
            while (k < n && /[a-z]/.test(text[k])) k++;
            const body = text.slice(i, k);
            out += body; prevChar = body.slice(-1); prevWord = "";
            i = k;
            continue;
          }
        }
      }
      // line comment
      if (c === "/" && text[i + 1] === "/") {
        let j = i;
        while (j < n && text[j] !== "\n") j++;
        const body = text.slice(i, j);
        out += isLeak(body) ? "" : body;
        i = j;
        continue;
      }
      // block comment
      if (c === "/" && text[i + 1] === "*") {
        let j = i + 2;
        while (j < n && !(text[j] === "*" && text[j + 1] === "/")) j++;
        j = Math.min(j + 2, n);
        const body = text.slice(i, j);
        if (isLeak(body)) {
          out += body.includes("\n") ? "\n".repeat((body.match(/\n/g) || []).length) : "";
        } else {
          out += body;
        }
        i = j;
        continue;
      }
      out += c;
      prevChar = c;
      prevWord = "";
      i++;
    }
    return out;
  };
  return scan(src);
}

const invokedDirectly =
  import.meta.url === pathToFileURL(process.argv[1] ?? '').href
if (invokedDirectly) {
  const argv = process.argv.slice(2)
  const check = argv[0] === "--check"
  const files = (check ? argv.slice(1) : argv).filter((f) => /\.(js|mjs|cjs|css|d\.ts)$/.test(f))
  let changed = 0
  for (const f of files) {
    const raw = readFileSync(f, "utf8")
    const next = stripLeakageComments(raw)
    if (next !== raw) {
      changed++
      if (!check) {
        writeFileSync(f, next)
        console.error(`stripped: ${f}`)
      }
    }
  }
  console.log(`${check ? "would strip" : "stripped"} ${changed}/${files.length} files`)
}
