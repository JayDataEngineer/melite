// assets.ts — the Phase-3 TS port of the 4 asset READ doors.
//
// Handlers (python/gateway.py names in parens; ROUTES mirror rows):
//   GET /v1/assets            (_h_assets_index) — JSON, dynamic
//   GET /v1/ledger            (_h_ledger)       — JSON, dynamic
//   GET /v1/assets/runs/*     (_h_asset)        — REAL byte serve
//   GET /v1/assets/inputs/*   (_h_asset_input)  — REAL byte serve
//
// The JSON doors are DYNAMIC (derived from the on-disk tree at read
// time), so unlike chrome.ts they cannot be static captures. They
// keep the captured-verbatim DISCIPLINE instead: each door returns
// pre-serialized exact bytes (dumpsPy below — py json.dumps(indent=2,
// ensure_ascii) rules: 2-space layout, every non-ASCII UTF-16 unit as
// lowercase \uXXXX, surrogate pairs as two escapes) and the
// dispatcher serves them untouched (parse+reserialize would drift).
//
// RANGE SEMANTICS (python/gateway.py _parse_range 3152-3183 + _h_asset
// 3186-3205, probed live 2026-09-07 — there is NO 416 anywhere in
// py; grep "416" over python/ is empty):
//   - bytes=a-b / bytes=a- / bytes=-suffix / BYTES= (case-insensitive
//     scheme) -> 206 + Content-Range "bytes lo-hi/size" + inclusive
//     slice; hi clamps to size-1; suffix clamps to (0, size-1) — an
//     oversize suffix still 206s the FULL body.
//   - malformed / multi-range (",") / hi<lo / lo>=size (unsatisfiable)
//     / empty -> the HONEST FULL-200 fallback (never a stranded seek;
//     _parse_range docstring: "or None = serve the FULL body 200").
//   - 200s still announce Accept-Ranges: bytes (players probe once).
//   - the inputs door (_h_asset_input 3208-3225) IGNORES Range
//     entirely — always the full 200 triple, no Accept-Ranges.
// REFUSAL SHAPES (probed on the HTTP wire, not just route()):
//   - runs traversal (any ".." substring, incl. %2e-decoded forms
//     that still contain it — note the door does NOT unquote, so
//     %2e%2e passes through as literal text) or missing file: the
//     404 is a JSON dict {"error":"not found"} (+R4.2 code); the 400
//     is serve_asset's RAW bytes b'{"error":"bad path"}' riding
//     _adapt's json.dumps(default=str) -> the wire JSON string
//     "b'{\"error\":\"bad path\"}'" (status 400, application/json).
//     bytesRepr() reproduces CPython bytes.__repr__ for that domain.
//   - inputs refusals are dicts with the DOUBLE-ENCODED text:
//     {"error": "{\"error\":\"...\"}"} (+R4.2 code).
//   - a directory target reads as an EMPTY 200 octet-stream (the C's
//     fopen-then-fread-fails behavior), not an error.
// ROOTS (QUEUE LANE LAW: no hardcoded paths — mirrors py resolution):
//   - runs root: MELITE_STATE_ROOT/output (py gateway.py 76-78:
//     STATE_ROOT from MELITE_STATE_ROOT else REPO/data/runs;
//     serve_asset joins server_root/"output"); test view reads
//     MELITE_STATE_ROOT/test-output via ?include_test=true
//     (TEST_OUT_ROOT, gateway.py 79-85).
//   - inputs root: <repo>/data/input (serve_input_asset takes REPO;
//     gateway.py 63 anchors REPO at the module file, NOT cwd).
//   - ledger file: <runs root>/_ledger.jsonl (LEDGER_PATH, 2180).
//   - media-kind ext sets: <repo>/packages/web/dsh/media-plugin/
//     media-kinds.json, read at request time (DATA — baking it would
//     teach a stale vocabulary). Code tables (content types, input
//     allowlist, mesh/doc exts) come from the GENERATED assetTables
//     module (capture_assets.py probes py — never hand-copied).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { mkdirSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CONTENT_TYPES,
  DOC_EXTS,
  INPUT_EXTS,
  MESH_EXTS,
} from "./assetTables.ts";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "../core/errors.ts";
import type { GatewayRequest } from "../ctx.ts";
import { matchRoute, parseQuery } from "../routeUtil.ts";
import { reconcileAssetsTier } from "../storage/store.ts";

/** The artifact-serving URL prefix — owned by python/editor_runs
 *  (ASSET_URL_PREFIX); stamped here for the rel slice, one
 *  constant, no restated coordinates. */
export const ASSET_URL_PREFIX: string = "/v1/assets/runs";

/** The input-preview URL prefix (python/gateway.py _h_asset_input). */
export const INPUT_URL_PREFIX: string = "/v1/assets/inputs";

/** Error-body content type (python/editor_runs._ERR_JSON). */
export const ERR_JSON: string = "application/json";

/** Resolved filesystem roots for the doors (see header). */
export interface AssetRoots {
  readonly stateRoot: string;
  readonly runsRoot: string;
  readonly testRunsRoot: string;
  readonly inputsRoot: string;
  readonly ledgerPath: string;
  readonly mediaKindsPath: string;
}

/** Mirror py's root resolution: MELITE_STATE_ROOT env else
 *  REPO/data/runs, REPO file-anchored (gateway.py 63, 76-78). */
export function defaultAssetRoots(): AssetRoots {
  const here: string = dirname(fileURLToPath(import.meta.url));
  const repo: string = resolve(here, "..", "..", "..", "..");
  const state: string =
    process.env["MELITE_STATE_ROOT"] ?? join(repo, "data", "runs");
  const runs: string = join(state, "output");
  return {
    stateRoot: state,
    runsRoot: runs,
    testRunsRoot: join(state, "test-output"),
    inputsRoot: join(repo, "data", "input"),
    ledgerPath: join(runs, "_ledger.jsonl"),
    mediaKindsPath: join(
      repo,
      "packages",
      "web",
      "dsh",
      "media-plugin",
      "media-kinds.json",
    ),
  };
}

/** The dispatcher answer for asset doors: status + exact wire bytes
 *  (string = UTF-8 JSON/text, Uint8Array = raw media bytes) +
 *  content type + extra headers (content-range / accept-ranges). */
export interface AssetResult {
  readonly status: number;
  readonly body: string | Uint8Array;
  readonly contentType: string;
  readonly headers: Record<string, string>;
}

// ---------------------------------------------------------------------------
// py-exact JSON: dumpsPy (json.dumps indent=2, ensure_ascii) +
// parseJson (ledger re-parse that keeps number literals verbatim).
// ---------------------------------------------------------------------------

/** Python str() of a JSON scalar for sidecar coercions
 *  (str(True)="True"; ints exact; integral floats keep ".0"). */
function pyStr(v: unknown): string {
  if (typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "True" : "False";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("bad sidecar number");
    return Number.isInteger(v) ? String(v) : String(v) + (String(v).includes("e") || String(v).includes(".") ? "" : ".0");
  }
  return String(v);
}

/** Python int(x or 0) for sidecar created_at (bool->0/1, float
 *  truncates, numeric strings parse, anything else raises — the
 *  raise surfaces as the door's 500 exactly as py's would). */
function pyInt(v: unknown): number {
  if (!v) return 0;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new Error("bad sidecar number");
    return Math.trunc(v);
  }
  if (typeof v === "string") {
    const t: string = v.trim();
    if (/^[+-]?\d+$/.test(t)) return Number(t);
    throw new Error("bad sidecar number");
  }
  throw new Error("bad sidecar number");
}

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

/** CPython bytes.__repr__ for ASCII-heavy payloads (the runs-door
 *  400 body b'{"error":"bad path"}' rides _adapt's
 *  json.dumps(default=str) as exactly this text). Non-printables
 *  escape \t \n \r \\ or \xNN; the wrapper is ' unless the payload
 *  holds ' but no ". */
export function bytesRepr(raw: Uint8Array): string {
  let inner: string = "";
  let hasSingle = false;
  let hasDouble = false;
  for (const b of raw) {
    if (b === 0x27) hasSingle = true;
    if (b === 0x22) hasDouble = true;
  }
  const q: string = hasSingle && !hasDouble ? '"' : "'";
  for (const b of raw) {
    if (b === 0x5c) inner += "\\\\";
    else if (b === 0x09) inner += "\\t";
    else if (b === 0x0a) inner += "\\n";
    else if (b === 0x0d) inner += "\\r";
    else if (b >= 0x20 && b < 0x7f) {
      const ch: string = String.fromCharCode(b);
      inner += ch === q ? "\\" + q : ch;
    } else inner += "\\x" + b.toString(16).padStart(2, "0");
  }
  return "b" + q + inner + q;
}

/** A JSON number parsed from the ledger with its LITERAL text kept
 *  (py re-formats numbers on re-dump — e.g. file "1.00" wires as
 *  "1.0" — but JS String() cannot reproduce repr() for all doubles
 *  (1e16, 1e-05 thresholds), so verbatim is the exact shape whenever
 *  the journal holds canonical literals, which ledger() always
 *  writes: ts ints + json.dumps(data) canonical floats). */
export class PyNum {
  readonly literal: string;
  constructor(literal: string) {
    this.literal = literal;
  }
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

/** Escape one string exactly as py json ensure_ascii does (every
 *  non-ASCII UTF-16 unit -> lowercase \uXXXX; the ASCII controls +
 *  quote/backslash ride JSON.stringify, which already matches py:
 *  \" \\ \b \f \n \r \t + \u00XX lowercase). */
function quotePy(s: string): string {
  const raw: string = JSON.stringify(s) ?? "null";
  return raw.replace(
    /[^\x00-\x7F]/g,
    (ch: string): string =>
      "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"),
  );
}

/** json.dumps(payload, indent=2, ensure_ascii, default=str): 2-space
 *  layout (JSON.stringify-identical separators) + ensure_ascii
 *  strings + PyNum literals verbatim + integer numbers exact. */
export function dumpsPy(payload: unknown, indent: number = 2): string {
  const pad = (n: number): string => " ".repeat(n);
  const write = (v: unknown, depth: number): string => {
    if (v === null) return "null";
    if (v === true) return "true";
    if (v === false) return "false";
    if (typeof v === "string") return quotePy(v);
    if (typeof v === "number") {
      if (!Number.isFinite(v)) return "null";
      if (Number.isInteger(v)) return String(v);
      const t: string = String(v);
      return t.includes(".") || t.includes("e") ? t : t + ".0";
    }
    if (v instanceof PyNum) return v.literal;
    if (Array.isArray(v)) {
      if (v.length === 0) return "[]";
      const parts: string[] = v.map(
        (e: unknown): string =>
          pad((depth + 1) * indent) +
          (e === undefined ? "null" : write(e, depth + 1)),
      );
      return "[\n" + parts.join(",\n") + "\n" + pad(depth * indent) + "]";
    }
    if (typeof v === "object") {
      const keys: string[] = Object.keys(v as Record<string, unknown>).filter(
        (k: string): boolean =>
          (v as Record<string, unknown>)[k] !== undefined,
      );
      if (keys.length === 0) return "{}";
      const parts: string[] = keys.map(
        (k: string): string =>
          pad((depth + 1) * indent) +
          quotePy(k) +
          ": " +
          write((v as Record<string, unknown>)[k], depth + 1),
      );
      return "{\n" + parts.join(",\n") + "\n" + pad(depth * indent) + "}";
    }
    return quotePy(pyStr(v));
  };
  return write(payload, 0);
}

// ---------------------------------------------------------------------------
// Shared bits: content types, kind vocab, range parse.
// ---------------------------------------------------------------------------

/** ext (after the LAST dot, lowercased) -> wire content-type
 *  (python/editor_runs.content_type_of — table GENERATED, never
 *  hand-copied; unknown exts -> application/octet-stream). */
export function contentTypeOf(name: string): string {
  const dot: number = name.lastIndexOf(".");
  const ext: string =
    dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

/** Media-kind ext sets from media-kinds.json (DATA — read at
 *  request time from the repo-anchored path). Cached per process;
 *  a missing file refuses LOUD (py crashes at import — never an
 *  empty sidebar downstream). */
let mediaKindsCache: {
  image: readonly string[];
  audio: readonly string[];
  video: readonly string[];
  model: readonly string[];
  galleryImage: readonly string[];
  galleryAudio: readonly string[];
  galleryVideo: readonly string[];
  galleryModel: readonly string[];
  maxListedImages: number;
} | null = null;

function mediaKinds(repoKindsPath: string): {
  image: readonly string[];
  audio: readonly string[];
  video: readonly string[];
  model: readonly string[];
} {
  return mediaVocab(repoKindsPath);
}

/** The runs-registry seam (P4): the gallery sets + door-tier policy
 *  python/editor_runs.py reads from the SAME media-kinds.json doc —
 *  _MEDIA_EXTS (run media sort) and _MAX_IMGS (the run_artifacts
 *  image cap + truncation marker). Same request-time read + loud
 *  refusal discipline as mediaKinds (one SSOT file, no restatement).
 *  doors/runs.ts owns the classifier/sort/cap use; this only
 *  exposes the DATA. */
export interface MediaVocab {
  readonly image: readonly string[];
  readonly audio: readonly string[];
  readonly video: readonly string[];
  readonly model: readonly string[];
  readonly galleryImage: readonly string[];
  readonly galleryAudio: readonly string[];
  readonly galleryVideo: readonly string[];
  readonly galleryModel: readonly string[];
  readonly maxListedImages: number;
}

export function mediaVocab(repoKindsPath: string): MediaVocab {
  if (mediaKindsCache === null) {
    const doc: unknown = JSON.parse(
      readFileSync(repoKindsPath, "utf8"),
    ) as unknown;
    const kinds: Record<string, { exts: string[]; gallery?: string[] }> = (
      doc as { kinds: Record<string, { exts: string[]; gallery?: string[] }> }
    ).kinds;
    const lower = (k: string): readonly string[] =>
      kinds[k]?.exts.map((e: string): string => e.toLowerCase()) ?? [];
    const lowerGallery = (k: string): readonly string[] =>
      (kinds[k]?.gallery ?? []).map((e: string): string =>
        e.toLowerCase());
    let maxImgs = 0;
    try {
      const raw: unknown = (doc as { policy?: { maxListedImages?: unknown } })
        .policy?.maxListedImages;
      if (typeof raw === "number" && Number.isFinite(raw)) {
        maxImgs = Math.floor(raw);
      }
    } catch {
      maxImgs = 0;
    }
    mediaKindsCache = {
      image: lower("image"),
      audio: lower("audio"),
      video: lower("video"),
      model: lower("model"),
      galleryImage: lowerGallery("image"),
      galleryAudio: lowerGallery("audio"),
      galleryVideo: lowerGallery("video"),
      galleryModel: lowerGallery("model"),
      maxListedImages: maxImgs,
    };
  }
  return mediaKindsCache;
}

/** filename -> AssetKind string (python/asset_ledger.kind_for: the estate
 *  media vocab first, then mesh/doc code sets, else "other"). */
export function kindFor(
  name: string,
  repoKindsPath: string,
): string {
  const kinds = mediaKinds(repoKindsPath);
  const dot: number = name.lastIndexOf(".");
  const ext: string =
    dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  // artifact_type(name): the estate media vocab (DATA sets), then
  // json->spec, txt/md/yaml->text, else file.
  let t: string;
  if (kinds.image.includes(ext)) t = "image";
  else if (kinds.audio.includes(ext)) t = "audio";
  else if (kinds.video.includes(ext)) t = "video";
  else if (kinds.model.includes(ext)) t = "model";
  else if (ext === "json") t = "spec";
  else if (ext === "txt" || ext === "md" || ext === "yaml") t = "text";
  else t = "file";
  // _KNOWN: image/video/audio ride; the rest consult the code sets.
  if (t === "image" || t === "video" || t === "audio") return t;
  if ((MESH_EXTS as readonly string[]).includes(ext)) return "model";
  if ((DOC_EXTS as readonly string[]).includes(ext)) return "document";
  return "other";
}

/** Parse one HTTP Range spec against a body of size N — mirrors
 *  python/gateway.py _parse_range EXACTLY (see header): (lo, hi)
 *  inclusive, or null = serve the FULL body 200. */
export function parseRange(
  spec: string,
  size: number,
): { lo: number; hi: number } | null {
  const s: string = (spec ?? "").trim();
  if (!s.toLowerCase().startsWith("bytes=") || s.includes(",")) return null;
  const rng: string = s.slice(s.indexOf("=") + 1).trim();
  if (!rng.includes("-")) return null;
  const dash: number = rng.indexOf("-");
  const loS: string = rng.slice(0, dash).trim();
  const hiS: string = rng.slice(dash + 1).trim();
  const intRe: RegExp = /^[+-]?\d+$/;
  if (loS === "") {
    if (!intRe.test(hiS)) return null;
    const n: number = Number(hiS);
    if (!Number.isSafeInteger(n) || n <= 0) return null;
    return { lo: Math.max(0, size - n), hi: size - 1 };
  }
  if (!intRe.test(loS)) return null;
  if (hiS !== "" && !intRe.test(hiS)) return null;
  const lo: number = Number(loS);
  const hi: number = hiS === "" ? size - 1 : Number(hiS);
  if (!Number.isSafeInteger(lo) || !Number.isSafeInteger(hi)) return null;
  if (lo < 0 || hi < lo) return null;
  if (lo >= size) return null;
  return { lo, hi: Math.min(hi, size - 1) };
}

// ---------------------------------------------------------------------------
// _h_asset — serve one artifact's bytes (+206 partials).
// ---------------------------------------------------------------------------

const BAD_PATH_RAW: Uint8Array = Buffer.from('{"error":"bad path"}', "utf8");

/** Read one artifact: mirrors python/editor_runs.serve_asset — empty rel
 *  or ANY ".." substring -> 400; directories -> empty 200
 *  octet-stream; missing -> 404; else the bytes + content type. */
function readAsset(
  runsRoot: string,
  rel: string,
): { code: 200 | 400 | 404; data: Uint8Array; ctype: string } {
  if (rel === "" || rel.includes("..")) {
    return { code: 400, data: BAD_PATH_RAW, ctype: ERR_JSON };
  }
  const full: string = join(runsRoot, rel);
  let st: { isDirectory(): boolean } | null = null;
  try {
    st = statSync(full);
  } catch {
    return {
      code: 404,
      data: Buffer.from('{"error":"artifact not found"}', "utf8"),
      ctype: ERR_JSON,
    };
  }
  if ((st as { isDirectory(): boolean }).isDirectory()) {
    return { code: 200, data: new Uint8Array(0), ctype: "application/octet-stream" };
  }
  try {
    const data: Uint8Array = new Uint8Array(readFileSync(full));
    return { code: 200, data, ctype: contentTypeOf(rel) };
  } catch {
    return {
      code: 404,
      data: Buffer.from('{"error":"artifact not found"}', "utf8"),
      ctype: ERR_JSON,
    };
  }
}

/** GET /v1/assets/runs/* — mirrors _h_asset + _adapt's RawTriple arm
 *  (headers ride beside content-type; starlette sets content-length
 *  — the TS server does the same from the byte length). */
export function hAsset(
  path: string,
  headers: Record<string, string>,
  roots: AssetRoots,
): AssetResult {
  const rel: string = path.slice((ASSET_URL_PREFIX + "/").length);
  const got = readAsset(roots.runsRoot, rel);
  if (got.code === 200) {
    const span = parseRange(headers["range"] ?? "", got.data.length);
    if (span !== null) {
      const slice: Uint8Array = got.data.slice(span.lo, span.hi + 1);
      return {
        status: 206,
        body: slice,
        contentType: got.ctype,
        headers: {
          "content-range":
            "bytes " + span.lo + "-" + span.hi + "/" + got.data.length,
          "accept-ranges": "bytes",
        },
      };
    }
    return {
      status: 200,
      body: got.data,
      contentType: got.ctype,
      headers: { "accept-ranges": "bytes" },
    };
  }
  if (got.code === 404) {
    return {
      status: 404,
      body: dumpsPy(normalize4xx(404, { error: "not found" })),
      contentType: ERR_JSON,
      headers: {},
    };
  }
  // 400: serve_asset's RAW bytes ride json.dumps(default=str) — the
  // wire JSON string of the CPython bytes repr (NOT a dict, so R4.2
  // adds no code — probed: `"b'{\"error\":\"bad path\"}'"`).
  return {
    status: 400,
    body: dumpsPy(bytesRepr(got.data)),
    contentType: ERR_JSON,
    headers: {},
  };
}

// ---------------------------------------------------------------------------
// _h_asset_input — stream one uploaded input image (NO range support).
// ---------------------------------------------------------------------------

/** Percent-decode WITHOUT '+'-folding (py urllib.parse.unquote —
 *  maximal %XX runs decode as UTF-8 with U+FFFD replacement,
 *  anything else stays literal, never a throw). The server applies
 *  this to the PATH part of the target (mirroring uvicorn, which
 *  decodes request.url.path before _adapt ever sees it); the inputs
 *  door applies it again to its name slice (a no-op for encoded
 *  names, exactly as py's unquote is after uvicorn's decode). */
export function unquotePy(s: string): string {
  return s.replace(
    /(?:%[0-9a-fA-F]{2})+/g,
    (m: string): string => {
      const bytes = new Uint8Array(m.length / 3);
      for (let i = 0; i < m.length; i += 3) {
        bytes[i / 3] = parseInt(m.slice(i + 1, i + 3), 16);
      }
      return new TextDecoder().decode(bytes);
    },
  );
}

/** GET /v1/assets/inputs/* — mirrors _h_asset_input + serve_input_asset:
 *  unquote, then flat images-only names (no / \ ..), ext allowlist,
 *  missing -> 404; refusals are DOUBLE-ENCODED dicts (+R4.2 code). */
export function hAssetInput(
  path: string,
  roots: AssetRoots,
): AssetResult {
  const name: string = unquotePy(path.slice((INPUT_URL_PREFIX + "/").length));
  const bad = (msg: string): AssetResult => ({
    status: 400,
    body: dumpsPy(
      normalize4xx(400, { error: '{"error":"' + msg + '"}' }),
    ),
    contentType: ERR_JSON,
    headers: {},
  });
  if (
    name === "" ||
    name.includes("/") ||
    name.includes("\\") ||
    name.includes("..")
  ) {
    return bad("bad path");
  }
  const dot: number = name.lastIndexOf(".");
  // splitext keeps the dot (".png") — the allowlist keys do too.
  const ext: string = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  const ctype: string | undefined = INPUT_EXTS[ext];
  if (ctype === undefined) return bad("inputs door serves png/jpeg/webp only");
  let data: Uint8Array;
  try {
    data = new Uint8Array(readFileSync(join(roots.inputsRoot, name)));
  } catch {
    return {
      status: 404,
      body: dumpsPy(normalize4xx(404, { error: "input not found" })),
      contentType: ERR_JSON,
      headers: {},
    };
  }
  // Directories read as files fail the read (py OSError -> 404);
  // stat them explicitly: a directory is "not found", not bytes.
  try {
    if (statSync(join(roots.inputsRoot, name)).isDirectory()) {
      return {
        status: 404,
        body: dumpsPy(normalize4xx(404, { error: "input not found" })),
        contentType: ERR_JSON,
        headers: {},
      };
    }
  } catch {
    // Stat raced the read away — the bytes already won; serve them.
  }
  return { status: 200, body: data, contentType: ctype, headers: {} };
}

// ---------------------------------------------------------------------------
// _h_assets_index — the cross-run delivery view (asset_ledger).
// ---------------------------------------------------------------------------

interface Sidecar {
  readonly model: unknown;
  readonly status: unknown;
  readonly createdAt: unknown;
  readonly test: unknown;
}

function readSidecar(runDir: string): Record<string, unknown> {
  try {
    const v: unknown = JSON.parse(
      readFileSync(join(runDir, "_flow.json"), "utf8"),
    );
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      return v as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function sha256File(full: string): string | null {
  try {
    const h = createHash("sha256");
    h.update(readFileSync(full));
    return h.digest("hex");
  } catch {
    return null;
  }
}

/** Disk truth -> typed rows (python/asset_ledger.scan_run): `_`-prefixed
 *  names skipped, non-files skipped, empty files skipped, rows carry
 *  name/run_id/kind/bytes/sha256/url. A NON-directory run path reads
 *  as an empty row set (listdir fails -> no names — mirrors py).
 *  Exported (not duplicated) for the storage seam: src/storage/store.ts
 *  converges the assets domain replica from these rows. */
export function scanRun(
  runsRoot: string,
  ent: string,
  kindsPath: string,
): {
  run_id: string;
  name: string;
  status: string;
  created_at: number;
  test: boolean;
  artifacts: Record<string, unknown>[];
} {
  const runDir: string = join(runsRoot, ent);
  const sc: Record<string, unknown> = readSidecar(runDir);
  let names: string[];
  try {
    names = readdirSync(runDir).sort();
  } catch {
    names = [];
  }
  const arts: Record<string, unknown>[] = [];
  for (const name of names) {
    if (name.startsWith("_")) continue;
    const full: string = join(runDir, name);
    let isFile = false;
    let size = 0;
    try {
      const st = statSync(full);
      isFile = st.isFile();
      size = st.size;
    } catch {
      continue;
    }
    if (!isFile || size <= 0) continue;
    const sha: string | null = sha256File(full);
    if (sha === null) continue;
    arts.push({
      name,
      run_id: ent,
      kind: kindFor(name, kindsPath),
      bytes: size,
      sha256: sha,
      url: ASSET_URL_PREFIX + "/" + ent + "/" + name,
    });
  }
  return {
    run_id: ent,
    name: pyStr(sc["model"] ?? ""),
    status: pyStr(sc["status"] ?? "unknown"),
    created_at: pyInt(sc["created_at"]),
    test: Boolean(sc["test"] ?? false),
    artifacts: arts,
  };
}

/** Append one journal line, best-effort (py gateway.ledger: mkdir -p,
 *  close-per-line, OSError swallowed — the journal never takes the
 *  gateway down). Line shape mirrors ledger() exactly (compact). */
function appendLedger(ledgerPath: string, event: string, dataJson: string): void {
  try {
    mkdirSync(dirname(ledgerPath), { recursive: true });
    appendFileSync(
      ledgerPath,
      '{"ts":' +
        Math.floor(Date.now() / 1000) +
        ',"event":' +
        JSON.stringify(event) +
        ',"data":' +
        dataJson +
        "}\n",
    );
  } catch {
    // The journal must never take the gateway down.
  }
}

/** R4.2 dispatcher normalization — local alias over the ctx.ts twin
 *  (kept HERE so this door module stays importable without the
 *  dispatcher; same rule: every 4xx object body leaves with a code). */
function normalize4xx(status: number, payload: unknown): unknown {
  if (
    typeof status === "number" &&
    status >= 400 &&
    status < 500 &&
    typeof payload === "object" &&
    payload !== null &&
    !Array.isArray(payload) &&
    !("code" in (payload as Record<string, unknown>))
  ) {
    (payload as Record<string, unknown>)["code"] = "invalid_request";
  }
  return payload;
}

/** GET /v1/assets — mirrors _h_assets_index + assets_index (L2
 *  test/prod barrier: test sidecars hidden unless include_test;
 *  ?limit garbage 400s with the %r text; NO clamp — the row cap is
 *  `runs.length >= limit` AFTER the push). */
export function hAssetsIndex(
  qs: Record<string, string[]>,
  roots: AssetRoots,
): AssetResult {
  const q = (name: string, def: string | null): string | null => {
    const vals: string[] | undefined = qs[name];
    if (vals === undefined || vals.length === 0) return def;
    return vals[0] ?? def;
  };
  const rawLimit: string = q("limit", "200") || "200";
  if (!/^\s*[+-]?\d+\s*$/.test(rawLimit)) {
    return {
      status: 400,
      body: dumpsPy(
        normalize4xx(400, {
          error: "limit must be an integer (got " + pyReprString(rawLimit) + ")",
        }),
      ),
      contentType: ERR_JSON,
      headers: {},
    };
  }
  const lim: number = Number(rawLimit.trim());
  const includeTest: boolean = ["1", "true", "yes"].includes(
    (q("include_test", "false") || "").toLowerCase(),
  );
  const root: string = includeTest ? roots.testRunsRoot : roots.runsRoot;
  const runFilter: string | null = q("run", null);
  const kindFilter: string | null = q("kind", null);
  const wantKind: string | null =
    kindFilter !== null &&
    ["image", "video", "audio", "model", "document", "other"].includes(kindFilter)
      ? kindFilter
      : null;
  // NOTE: an UNKNOWN kind is NO filter (AssetKind(kind) raises ->
  // want=None — asset_ledger 178-181), while kind="" is also no
  // filter (falsy). Both collapse to wantKind null here.
  if (includeTest) appendLedger(roots.ledgerPath, "assets.include_test", '{"limit":' + lim + "}");
  let entries: string[];
  try {
    entries = readdirSync(root).sort().reverse();
  } catch {
    entries = [];
  }
  const runs: Record<string, unknown>[] = [];
  let total = 0;
  for (const ent of entries) {
    if (!ent.startsWith("run-")) continue;
    if (runFilter !== null && runFilter !== "" && ent !== runFilter) continue;
    const idx = scanRun(root, ent, roots.mediaKindsPath);
    if (idx.test && !includeTest) continue;
    const arts =
      wantKind === null
        ? idx.artifacts
        : idx.artifacts.filter(
            (a: Record<string, unknown>): boolean => a["kind"] === wantKind,
          );
    total += arts.length;
    runs.push({
      run_id: idx.run_id,
      name: idx.name,
      status: idx.status,
      created_at: idx.created_at,
      test: idx.test,
      artifacts: arts,
    });
    if (runs.length >= lim) break;
  }
  return {
    status: 200,
    body: dumpsPy({ count: runs.length, artifacts: total, runs }),
    contentType: ERR_JSON,
    headers: {},
  };
}

// ---------------------------------------------------------------------------
// _h_ledger — tail the append-only journal (gateway.ledger_tail).
// ---------------------------------------------------------------------------

/** GET /v1/ledger?limit=N&event=prefix — mirrors ledger_tail
 *  EXACTLY: limit default 50, clamp 1..500, garbage -> 50 (NEVER a
 *  400); event truncated to 64 chars, matched on the RAW line
 *  substring '"event":"<ev>'; the tail keeps the LAST N lines;
 *  unparseable lines count as matched but never as entries; output
 *  oldest -> newest within the tail. */
export function hLedger(
  qs: Record<string, string[]>,
  roots: AssetRoots,
): AssetResult {
  const q = (name: string, def: string): string => {
    const vals: string[] | undefined = qs[name];
    if (vals === undefined || vals.length === 0) return def;
    return vals[0] ?? def;
  };
  const rawLimit: string = q("limit", "50");
  let limit: number;
  if (/^\s*[+-]?\d+\s*$/.test(rawLimit)) {
    limit = Math.max(1, Math.min(500, Number(rawLimit.trim())));
  } else {
    limit = 50;
  }
  const ev: string = (q("event", "") || "").slice(0, 64);
  const needle: string = '"event":"' + ev;
  const entries: string[] = [];
  let matched = 0;
  try {
    const text: string = readFileSync(roots.ledgerPath, "utf8");
    // File iteration (py `for line in f`): a trailing newline is NOT
    // a phantom line, but a real blank line mid-file IS iterated
    // (matched, then parse-skipped below).
    const lines: string[] = text.split("\n");
    if (lines.length > 0 && lines[lines.length - 1] === "" && text.endsWith("\n")) {
      lines.pop();
    }
    for (const line of lines) {
      if (ev !== "" && !line.includes(needle)) continue;
      matched++;
      entries.push(line);
      if (entries.length > limit) entries.shift();
    }
  } catch {
    // Missing journal reads empty (OSError -> pass).
  }
  const out: unknown[] = [];
  for (const e of entries) {
    try {
      out.push(parseJson(e));
    } catch {
      continue;
    }
  }
  return {
    status: 200,
    body: dumpsPy({ entries: out, shown: out.length, matched }),
    contentType: ERR_JSON,
    headers: {},
  };
}

/** Door-registration seam: map a ROUTES handler name to its asset
 *  implementation, or null when the row is not an asset door (the
 *  dispatcher falls through to the 404 shape). Query parsing rides
 *  the caller's parsed qs (same split/decode/accumulate contract). */
export function dispatchAssets(
  handler: string,
  path: string,
  qs: Record<string, string[]>,
  headers: Record<string, string>,
  roots: AssetRoots,
): AssetResult | null {
  if (handler === "_h_assets_index") return hAssetsIndex(qs, roots);
  if (handler === "_h_ledger") return hLedger(qs, roots);
  if (handler === "_h_asset") return hAsset(path, headers, roots);
  if (handler === "_h_asset_input") return hAssetInput(path, roots);
  return null;
}

/** The asset READ doors (_h_assets_index/_h_ledger/_h_asset/
 *  _h_asset_input) as a self-registering plugin: pre-serialized
 *  JSON bytes or raw media bytes over the request roots. Matches
 *  its own rows inside the listener (dispatchAssets answers asset
 *  rows and returns null for every other handler — gating on its
 *  answer alone preserves the old fall-through exactly).
 *
 *  INJECT (fork service-access contract): the listener reads
 *  ctx.storageDomain, and this fork's Context reads a service ONLY
 *  through inject ("cannot get property without inject" — the read
 *  throws otherwise, which the seam would swallow into a silent
 *  never-converge). storageDomain is provided by the storage-domain
 *  entry EARLIER in the manifest, so the inject cannot reorder this
 *  listener behind any later door (registration order is
 *  preserved).
 *
 *  THE PERSISTENCE SEAM (DSH storage pilot, src/storage/): after the
 *  index bytes are computed, the listener converges the assets domain
 *  replica (best-effort, awaited — steady state is a pure in-memory
 *  diff, so the wire neither waits on writes nor changes through
 *  them). Byte doors and the ledger door converge nothing (files are
 *  their truth; the ledger journal stays file-owned this stroke). */
export const assetsDoors: Plugin = {
  name: "gateway-assets",
  inject: ["storageDomain"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      async (req: GatewayRequest): Promise<DispatchResult | undefined> => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null) return undefined;
        const asset: DispatchResult | null = dispatchAssets(
          hit.row.handler,
          req.path,
          parseQuery(req.target),
          req.headers,
          req.roots,
        );
        if (asset !== null) {
          if (hit.row.handler === "_h_assets_index") {
            await reconcileAssetsTier(ctx, req.roots);
          }
          return asset;
        }
        return undefined;
      },
    );
  },
};
