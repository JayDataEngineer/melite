// comfyui-format.ts — python-shaped stringification (error-text parity).
// (split from comfyui.ts 2026-09-18: pure move, zero logic changes).

import type { EngineJson } from "./comfyui-types.ts";

// ── python-shaped stringification (error-text parity) ──

/** Python repr() for short strings (single quotes + the escapes the
 *  wall's refusal texts exercise: backslash, quote, \n \r \t). */
export function pyReprStr(v: string): string {
  let out: string = "'";
  for (const ch of v) {
    if (ch === "\\") out += "\\\\";
    else if (ch === "'") out += "\\'";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else out += ch;
  }
  return out + "'";
}

/** Python str() for non-200 /prompt bodies and run-failure
 *  details: dicts/lists with single quotes, True/False/None. A
 *  TOP-level string rides verbatim (str(b) of a body); NESTED
 *  strings take repr (single quotes) — exactly str() semantics. */
export function pyStr(
  v: EngineJson | Buffer | null | undefined,
  top: boolean = true,
): string {
  if (v === null || v === undefined) return "None";
  if (typeof v === "string") return top ? v : pyReprStr(v);
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "True" : "False";
  if (Buffer.isBuffer(v)) return "b'" + v.toString("latin1") + "'";
  if (Array.isArray(v)) {
    return "[" + v.map((x: EngineJson): string => pyStr(x, false)).join(", ") + "]";
  }
  const parts: string[] = [];
  for (const [k, val] of Object.entries(v)) {
    parts.push(pyReprStr(k) + ": " + pyStr(val, false));
  }
  return "{" + parts.join(", ") + "}";
}

/** Python json.dumps(x)[:400] for the node_errors/detail shapes:
 *  the DEFAULT separators (", ", ": ") — JSON.stringify's compact
 *  form gains exactly one space after each structural comma/colon
 *  outside strings. ASCII payloads (what the stub serves) then
 *  agree byte-for-byte; non-ASCII would need ensure_ascii escapes
 *  (documented, unserved). */
export function pyDumps400(v: EngineJson): string {
  const emit = (x: EngineJson): string => {
    // JSON.stringify of a string (or an object key below) always
    // succeeds — no ?? '""' toll (uncoverable arms, 2026-09-12).
    if (typeof x === "string") return JSON.stringify(x);
    if (x === null) return "null";
    if (typeof x === "number" || typeof x === "boolean") return String(x);
    if (Array.isArray(x)) {
      return "[" + x.map(emit).join(", ") + "]";
    }
    const parts: string[] = [];
    for (const [k, val] of Object.entries(x)) {
      parts.push(JSON.stringify(k) + ": " + emit(val));
    }
    return "{" + parts.join(", ") + "}";
  };
  return emit(v).slice(0, 400);
}

/** Python "%.0f" (round-half-to-even) for the deadline texts. */
export function formatTimeout0f(v: number): string {
  const lo: number = Math.floor(v);
  const frac: number = v - lo;
  if (frac < 0.5) return String(lo);
  if (frac > 0.5) return String(lo + 1);
  return String(lo % 2 === 0 ? lo : lo + 1);
}

/** Python str() of a string list (the ambiguity/knob texts). */
export function pyReprStrList(v: string[]): string {
  return "[" + v.map(pyReprStr).join(", ") + "]";
}
