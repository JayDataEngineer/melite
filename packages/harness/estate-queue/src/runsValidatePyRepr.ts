// runsValidatePyRepr.ts — python repr/str mirrors split from runsValidate.ts
// (pure move, zero logic changes).
// ── python repr/str mirrors ─────────────────────────────────────
// ── python repr/str mirrors ─────────────────────────────────────
// pyReprStr: python repr() of a str — single quotes, backslash +
// quote + C0 escapes, \xXX for other non-printables; printable
// unicode rides verbatim (py semantics; UTF-16/astral divergence is
// documented — wall legs are ASCII).
export function pyReprStr(s: string): string {
  let out: string = "'";
  for (const ch of s) {
    const cp: number = (ch as string).codePointAt(0) as number; // for..of chars are never empty
    if (ch === "'") out += "\\'";
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (cp < 0x20 || (cp >= 0x7f && cp <= 0x9f)) {
      out += "\\x" + cp.toString(16).padStart(2, "0");
    } else out += ch;
  }
  return out + "'";
}

// pyReprJson: python str()/repr() of decoded JSON — None/True/False,
// ints verbatim, single-quoted strings, [...]
// lists, insertion-ordered {'k': v} dicts. Floats are best-effort
// (py str(1.0) is "1.0", JSON/JS says "1" — no wall leg floats).
export function pyReprJson(v: unknown): string {
  if (v === null || v === undefined) return "None";
  if (v === true) return "True";
  if (v === false) return "False";
  if (typeof v === "string") return pyReprStr(v);
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return "[" + v.map(pyReprJson).join(", ") + "]";
  if (typeof v === "object") {
    const parts: string[] = [];
    for (const k of Object.keys(v as Record<string, unknown>)) {
      parts.push(pyReprStr(k) + ": " + pyReprJson((v as Record<string, unknown>)[k]));
    }
    return "{" + parts.join(", ") + "}";
  }
  return String(v);
}

// The [...] of sorted strings py embeds in messages (repr(sorted)).
export function pyReprStrList(items: string[]): string {
  return "[" + [...items].sort().map(pyReprStr).join(", ") + "]";
}

// pyStr: python str() for the coerced scalars flow_from_body applies
// (str(id), str(engine), str(description), str(label)). True/False/
// None spellings matter; floats are best-effort (see pyReprJson).
export function pyStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (v === true) return "True";
  if (v === false) return "False";
  if (v === null || v === undefined) return "None";
  if (typeof v === "number") return String(v);
  return pyReprJson(v);
}

// pySetOfKeys: set(st) — dicts yield KEYS, lists/strings yield
// items/chars, anything else throws TypeError (the 500-class legs
// agree by status through the server catch, as py does through
// _adapt). Dict elements of a list are unhashable in py (500) but
// holdable in a JS Set — documented edge, no wall leg.
export function pySetOfKeys(v: unknown): Set<unknown> {
  if (typeof v === "string") return new Set([...v]);
  if (Array.isArray(v)) return new Set(v);
  if (typeof v === "object" && v !== null) return new Set(Object.keys(v));
  throw new TypeError("'" + typeof v + "' object is not iterable");
}
