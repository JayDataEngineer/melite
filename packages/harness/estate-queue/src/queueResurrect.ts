// queueResurrect.ts — resurrection planning + the py value folds it rides on (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
// ── resurrection (boot_resurrect 2338-2376) ───────────────────────

export interface ResurrectPlan {
  /** run_ids to re-queue, FIFO by created_at (order survives). */
  readonly order: string[];
  /** run_ids swept below (orphans / half-written). */
  readonly orphans: string[];
}

/** Python tuple(x or ()) for a NodeRow input_from (gateway.py 2320
 *  + flow_graph.py _refs_nonempty): falsy rides (); strings split to
 *  chars (tuple("ab") == ("a","b")); lists ride element-wise; dicts
 *  ride their keys (tuple({...})); numbers and true raise. Null is
 *  the raise road (the caller orphans the record). */
export function pyTupleItems(value: unknown): unknown[] | null {
  const src: unknown = value ? value : [];
  if (Array.isArray(src)) return [...src];
  if (typeof src === "string") return [...src];
  if (typeof src === "object" && src !== null) return Object.keys(src);
  return null;
}

/** Python dict(x or {}) for the row maps (gateway.py 2321-2323):
 *  falsy rides {}; plain dicts ride their entries; pair-lists ride
 *  dict(pairs) — each item a 2-length pair with a string key (a
 *  2-char string counts, exactly like dict(["ab"])); anything else
 *  raises. Null is the raise road. */
export function pyDictEntries(value: unknown): [string, unknown][] | null {
  const src: unknown = value ? value : {};
  if (Array.isArray(src)) {
    const out: [string, unknown][] = [];
    for (const item of src) {
      let pair: readonly unknown[] | null = null;
      if (Array.isArray(item) && item.length === 2) pair = item;
      else if (typeof item === "string" && item.length === 2) {
        pair = [...item];
      } else {
        return null;
      }
      const key: unknown = pair[0];
      if (typeof key !== "string") return null;
      out.push([key, pair[1]]);
    }
    return out;
  }
  if (typeof src === "object" && src !== null) {
    return Object.entries(src);
  }
  return null;
}

/** One graph row usable (FlowGraph/NodeRow constructible, gateway.py
 *  2316-2324 + flow_graph.py 50-152): id/type are non-empty strings
 *  (extra keys never reach _NR — the rebuild projects six fields,
 *  so extras ride along, never orphan); input_from rides
 *  pyTupleItems with every ref a non-blank string (_refs_nonempty
 *  strips); input_names/outputs ride pyDictEntries with string
 *  values (params takes Any); duplicate node ids refuse at the
 *  FlowGraph gate (_unique_ids). seen carries the gate across rows. */
export function nodeRowUsable(row: unknown, seen: Set<string>): boolean {
  if (typeof row !== "object" || row === null || Array.isArray(row)) {
    return false;
  }
  const rec = row as Record<string, unknown>;
  const id: unknown = rec["id"];
  const type: unknown = rec["type"];
  if (typeof id !== "string" || id === "") return false;
  if (typeof type !== "string" || type === "") return false;
  if (seen.has(id)) return false;
  const refs: unknown[] | null = pyTupleItems(rec["input_from"]);
  if (refs === null) return false;
  for (const ref of refs) {
    if (typeof ref !== "string" || ref.trim() === "") return false;
  }
  for (const key of ["input_names", "outputs"] as const) {
    const entries: [string, unknown][] | null = pyDictEntries(rec[key]);
    if (entries === null) return false;
    for (const entry of entries) {
      if (typeof entry[1] !== "string") return false;
    }
  }
  if (pyDictEntries(rec["params"]) === null) return false;
  seen.add(id);
  return true;
}

/** The durable graph check (doc.get("graph") or [] 2324): falsy
 *  (missing/None/False/0/"") rides the empty FlowGraph — zero nodes
 *  construct fine, so the record resurrects; a truthy non-list dies
 *  iterating (strings/dicts/numbers orphan); every row must be
 *  NodeRow-usable (extra keys ignored, mistypes orphan). */
export function graphRowsUsable(graph: unknown): boolean {
  const rows: unknown = graph ? graph : [];
  if (!Array.isArray(rows)) return false;
  const seen: Set<string> = new Set();
  for (const row of rows) {
    if (!nodeRowUsable(row, seen)) return false;
  }
  return true;
}

/** Python list(x or []) for stages/skipped (gateway.py 2331-2332):
 *  falsy rides []; strings split to chars (list("ab")); lists ride
 *  VERBATIM (mixed rows stay mixed — [7, "s", None] keeps 7 and
 *  None); dicts ride their keys (list({...})); numbers/bools raise
 *  TypeError in py — the rebuild sits OUTSIDE py's try (a raise
 *  skips the record at boot, never a guess). The throw is the
 *  raise road: plan + build agree on the skip, never throw out. */
export function pyListItems(value: unknown): unknown[] {
  const src: unknown = value ? value : [];
  if (Array.isArray(src)) return [...src];
  if (typeof src === "string") return [...src];
  if (typeof src === "object" && src !== null) {
    return Object.keys(src);
  }
  throw new Error("unlistable sidecar value");
}

/** Python truthiness for the artifacts filter (`if a`, gateway.py
 *  2333): None/False/0/0.0/""/[]/{} are falsy — everything else
 *  (incl. non-empty containers and NaN-free numbers) is truthy. */
export function pyTruthy(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (value === false || value === 0 || value === "") return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

/** One string in py repr() single-quote spelling (for container
 *  elements inside pyStr below): backslash/quote/controls escape,
 *  non-ASCII rides \uXXXX lowercase (ensure_ascii). */
function pySingleRepr(s: string): string {
  let out = "'";
  // UTF-16 units (never code points): astral chars escape as two
  // \uXXXX surrogates, exactly like ensure_ascii.
  for (let i = 0; i < s.length; i++) {
    const ch: string = s[i] as string;
    const code: number = s.charCodeAt(i);
    if (ch === "\\") out += "\\\\";
    else if (ch === "'") out += "\\'";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 32 || code === 127) {
      out += "\\x" + code.toString(16).padStart(2, "0");
    } else if (code > 126) {
      out += "\\u" + code.toString(16).padStart(4, "0");
    } else out += ch;
  }
  return out + "'";
}

/** Python str() (gateway.py 2333 artifacts): a TOP-level string
 *  rides verbatim; NESTED strings take repr (single quotes — exactly
 *  str() semantics: str([1, "a"]) is "[1, 'a']", never "[1, a]");
 *  True/False/None keep py spellings; numbers ride int-or-float
 *  (post-parse 1.0 reads 1 — the integral-float class, same as the
 *  journal; exponents ride JS spelling, an accepted edge);
 *  lists/dicts ride their py reprs ([1], {'k': 1} — quoted with
 *  pySingleRepr, NOT String()'s [object Object]). */
export function pyStr(value: unknown, nested: boolean = false): string {
  if (typeof value === "string") {
    return nested ? pySingleRepr(value) : value;
  }
  if (value === true) return "True";
  if (value === false) return "False";
  if (value === null || value === undefined) return "None";
  if (typeof value === "number") {
    // Unreachable from JSON sidecars (no union of inf/nan parses),
    // but exact when called directly: py spells inf/-inf/nan.
    if (Number.isNaN(value)) return "nan";
    if (value === Infinity) return "inf";
    if (value === -Infinity) return "-inf";
    if (Number.isInteger(value)) return String(value);
    const t: string = String(value);
    // (a non-integer String always carries . or e — the suffix is the
    // belt's contract for impossible spellings.)
    return t.includes(".") || t.includes("e")
      ? t
      : /* v8 ignore next */ t + ".0";
  }
  if (Array.isArray(value)) {
    return (
      "[" + value.map((e: unknown): string => pyStr(e, true)).join(", ") + "]"
    );
  }
  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(rec)
        .map(
          (k: string): string => pySingleRepr(k) + ": " + pyStr(rec[k], true),
        )
        .join(", ") +
      "}"
    );
  }
  return String(value);
}

/** Python [str(a) for a in (x or []) if a] (gateway.py 2333):
 *  strings split to chars, dicts to truthy keys, numbers/bools
 *  take the raise road (pyListItems throws — the caller skips). */
export function pyArtifactStrings(value: unknown): string[] {
  // NOTE: the explicit lambda (never .map(pyStr)) — map would leak
  // the element INDEX into pyStr's nested flag and quote every
  // top-level string past index 0.
  return pyListItems(value)
    .filter(pyTruthy)
    .map((a: unknown): string => pyStr(a));
}

/** Python float(x or 0.0) MINUS the raise (gateway.py 2338-2363
 *  candidate scan): numbers ride (non-finite never survives JSON);
 *  True rides 1; numeric strings parse (" 12 " trims, "inf" rides
 *  Infinity like py); everything else — garbage strings ("abc",
 *  "0x1"), lists, dicts — rides 0 and NEVER throws. Py RAISES on
 *  garbage (ValueError at candidate time kills the whole py boot —
 *  a known non-ported crash); the core boots where py cannot and
 *  orders such records first (created 0). */
export function coerceCreatedAt(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string") {
    const s: string = value.trim();
    if (s === "") return 0;
    // JS Number() parses "Infinity" but NOT "inf" (py takes
    // both); NaN rides 0 (py keeps nan, which poisons every
    // comparison — 0 is the honest boot order).
    const infNan: RegExpExecArray | null =
      /^([+-]?)(inf(inity)?|nan)$/i.exec(s);
    if (infNan !== null) {
      if (/nan/i.test(infNan[2] as string)) return 0;
      return (infNan[1] as string) === "-" ? -Infinity : Infinity;
    }
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) {
      return Number(s);
    }
    return 0;
  }
  return 0;
}

/** The durable-record check (_rebuild_run_from_record 2294-2336):
 *  sidecar parses + draft doc lives (CARD BIRTH LAW — the doc is
 *  the birth certificate; a record without one is an orphan, never
 *  a run) + _request.json parses + graph rows FlowGraph-usable
 *  (G1: missing/empty graphs resurrect; NodeRow mistypes orphan). */
export function durableRecordUsable(
  sidecarText: string,
  requestText: string,
  draftExists: boolean,
): boolean {
  let doc: unknown = null;
  try {
    doc = JSON.parse(sidecarText);
  } catch {
    return false;
  }
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    return false;
  }
  const rec = doc as Record<string, unknown>;
  const draftId: unknown = rec["draft_id"];
  if (typeof draftId !== "string" || draftId === "" || !draftExists) {
    return false;
  }
  // _request.json needs only to PARSE (2294-2336: Run is a
  // dataclass — no validation — so a list/str/num request rebuilds
  // fine; probed 2026-09-07. The .get crash lands later at
  // worker/serve time, never at resurrect — a dict-only check here
  // would orphan records py resurrects).
  try {
    JSON.parse(requestText);
  } catch {
    return false;
  }
  if (!graphRowsUsable(rec["graph"])) return false;
  // stages/skipped/artifacts listifiability: py's list()/iterate
  // sits OUTSIDE the rebuild try (TypeError on 5/True skips the
  // record at boot). The predicate agrees with the replay road
  // (the service's bootReconcile re-reads through the start door)
  // so plan order never admits a row the replay cannot carry.
  try {
    pyListItems(rec["stages"]);
    pyListItems(rec["skipped_stages"]);
    pyArtifactStrings(rec["artifacts"]);
  } catch {
    return false;
  }
  return true;
}

/** Plan the resurrect (fs reads + order; the caller appends +
 *  ledgers, or use bootResurrect below for the whole seam). */
export function planResurrect(
  stateRoot: string,
  readSidecar: (runId: string) => string | null = (runId: string): string | null => {
    try {
      return readFileSync(join(stateRoot, "output", runId, "_flow.json"), "utf8");
    } catch {
      return null;
    }
  },
  readRequest: (runId: string) => string | null = (runId: string): string | null => {
    try {
      return readFileSync(join(stateRoot, "output", runId, "_request.json"), "utf8");
    } catch {
      return null;
    }
  },
  draftExists: (draftId: string) => boolean = (): boolean => {
    // LOUD default (the drafts-door migration, 2026-09-09): the
    // legacy drafts/<id>.json probe is dead — the drafts domain
    // owns existence now. Callers pass their domain probe (the
    // queue lane fails loud, never silently drops to no drafts).
    throw new Error(
      "[gateway-ts] planResurrect needs the caller's draftExists probe (drafts domain)",
    );
  },
): ResurrectPlan {
  const outRoot: string = join(stateRoot, "output");
  let names: string[];
  try {
    names = readdirSync(outRoot);
  } catch {
    return { order: [], orphans: [] };
  }
  const candidates: { created: number; runId: string }[] = [];
  const orphans: string[] = [];
  for (const name of names.sort()) {
    if (!name.startsWith("run-")) continue;
    const text: string | null = readSidecar(name);
    if (text === null) continue;
    let doc: unknown = null;
    try {
      doc = JSON.parse(text);
    } catch {
      // ROW 28 (census): an unparseable sidecar is a HALF-WRITTEN
      // row — it belongs in orphans (the operator's reconcile
      // road), never dropped from both order and orphans. The old
      // bare continue made the run invisible to resurrection.
      orphans.push(name);
      continue;
    }
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      orphans.push(name);
      continue;
    }
    const rec = doc as Record<string, unknown>;
    if (rec["status"] !== "queued") continue;
    const createdNum: number = coerceCreatedAt(rec["created_at"]);
    const draftId: unknown = rec["draft_id"];
    const req: string | null = readRequest(name);
    const usable: boolean =
      req !== null &&
      durableRecordUsable(
        text,
        req,
        typeof draftId === "string" && draftId !== ""
          ? draftExists(draftId)
          : false,
      );
    if (!usable) {
      orphans.push(name);
      continue;
    }
    candidates.push({ created: createdNum, runId: name });
  }
  candidates.sort((a: { created: number }, b: { created: number }): number =>
    a.created - b.created,
  );
  return { order: candidates.map((c: { runId: string }): string => c.runId), orphans };
}

/** The state-root triple every boot seam takes (server.ts
 *  bootState passes defaultAssetRoots through; the canonical layout
 *  is runsRoot == stateRoot/output and ledgerPath ==
 *  runsRoot/_ledger.jsonl — the core derives both from stateRoot,
 *  so a non-canonical triple is honored for READS and canonical
 *  for WRITES, documented at the service's bootReconcile). */
export interface QueueRoots {
  readonly stateRoot: string;
  readonly runsRoot: string;
  readonly ledgerPath: string;
}

/** One rebuilt queued run — RETIRED (stroke 83): the hollow
 *  requeue road is deleted; the service's bootReconcile REPLAYS _request.json
 *  through the start door so revived rows carry REAL params. */
