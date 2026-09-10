// pyJson.ts — pyRepr + parseJson, RE-HOMED (REBUILD-16,
// 2026-09-10): ported verbatim from the dead gateway's
// doors/assets.ts:136-152 and :185-326 (killed with the gateway
// app) — the skills plane's fmt/pyReprScalar helpers ride them
// (PyNum literals live in ./pyValue.ts).
import { PyNum } from "./pyValue.ts";

/** Python repr() of a short string for the limit refusal
 *  ("got %r": 'abc'; quote rule mirrors CPython for the exercised
 *  domain — no quote, one quote kind, or both). */
export function pyReprString(s: string): string {
  const esc = (q: string): string =>
    s
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/[\x00-\x1f\x7f]/g, (ch: string): string => {
        const c: number = ch.charCodeAt(0);
        return "\\x" + c.toString(16).padStart(2, "0");
      })
      .split(q)
      .join("\\" + q);
  if (!s.includes("'")) return "'" + esc("'") + "'";
  if (!s.includes('"')) return '"' + esc('"') + '"';
  return "'" + esc("'") + "'";
}


/** Minimal JSON parser for ledger lines: objects/arrays/strings
 *  (full escape + \uXXXX incl. surrogate pairs)/numbers (kept as
 *  PyNum literals)/true/false/null. Throws on malformed input —
 *  the caller skips the line exactly as ledger_tail does. */
export function parseJson(text: string): unknown {
  let pos = 0;
  const fail = (): never => {
    throw new Error("bad json @" + pos);
  };
  const ws = (): void => {
    while (
      pos < text.length &&
      (text[pos] === " " ||
        text[pos] === "\t" ||
        text[pos] === "\n" ||
        text[pos] === "\r")
    )
      pos++;
  };
  const word = (w: string, v: unknown): unknown => {
    if (text.startsWith(w, pos)) {
      pos += w.length;
      return v;
    }
    return fail();
  };
  const str = (): string => {
    if (text[pos] !== '"') return fail();
    pos++;
    let out = "";
    while (pos < text.length) {
      const ch: string = text[pos] as string;
      if (ch === '"') {
        pos++;
        return out;
      }
      if (ch !== "\\") {
        out += ch;
        pos++;
        continue;
      }
      pos++;
      const e: string = text[pos] as string;
      if (e === undefined) return fail();
      if (e === "u") {
        const hex: string = text.slice(pos + 1, pos + 5);
        if (!/^[0-9a-fA-F]{4}$/.test(hex)) return fail();
        out += String.fromCharCode(parseInt(hex, 16));
        pos += 5;
        continue;
      }
      const simple: Record<string, string> = {
        '"': '"',
        "\\": "\\",
        "/": "/",
        b: "\b",
        f: "\f",
        n: "\n",
        r: "\r",
        t: "\t",
      };
      const rep: string | undefined = simple[e];
      if (rep === undefined) return fail();
      out += rep;
      pos++;
    }
    return fail();
  };
  const num = (): PyNum => {
    const m: RegExpExecArray | null =
      /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y.exec(text.slice(pos));
    // NOTE: the sliced sticky exec anchors at pos; an empty match is
    // impossible here (the char class demands a digit) — a null match
    // is the malformed-number refusal.
    if (m === null || m[0] === "") return fail();
    pos += m[0].length;
    return new PyNum(m[0]);
  };
  const val = (): unknown => {
    ws();
    const ch: string = text[pos] as string;
    if (ch === "{") return obj();
    if (ch === "[") return arr();
    if (ch === '"') return str();
    if (ch === "t") return word("true", true);
    if (ch === "f") return word("false", false);
    if (ch === "n") return word("null", null);
    if (ch === "-" || (ch >= "0" && ch <= "9")) return num();
    return fail();
  };
  const obj = (): Record<string, unknown> => {
    pos++; // {
    const out: Record<string, unknown> = {};
    ws();
    if (text[pos] === "}") {
      pos++;
      return out;
    }
    for (;;) {
      ws();
      const k: string = str();
      ws();
      if (text[pos] !== ":") return fail();
      pos++;
      out[k] = val();
      ws();
      const ch: string = text[pos] as string;
      if (ch === ",") {
        pos++;
        continue;
      }
      if (ch === "}") {
        pos++;
        return out;
      }
      return fail();
    }
  };
  const arr = (): unknown[] => {
    pos++; // [
    const out: unknown[] = [];
    ws();
    if (text[pos] === "]") {
      pos++;
      return out;
    }
    for (;;) {
      out.push(val());
      ws();
      const ch: string = text[pos] as string;
      if (ch === ",") {
        pos++;
        continue;
      }
      if (ch === "]") {
        pos++;
        return out;
      }
      return fail();
    }
  };
  const v: unknown = val();
  ws();
  if (pos !== text.length) return fail();
  return v;
}
