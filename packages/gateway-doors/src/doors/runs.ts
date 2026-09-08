// runs.ts — the P4 TS port of the runs-registry READ doors + the
// events stream door.
//
// Handlers (python/gateway.py names in parens; ROUTES mirror rows):
//   GET /v1/queue                 (_h_queue)        — JSON, stateless
//   GET /v1/flows/status/{run_id} (_h_flows_status) — JSON from sidecar
//   GET /v1/flows/runs            (_h_runs_list)    — JSON from disk scan
//   GET /v1/flows/runs/{run_id}   (_h_run_detail)   — JSON restore path
//   GET /v1/flows/events*         (_h_ws_fallback)  — non-upgrade 404 shape
//   WS  /v1/flows/events*         (_ws_starlette)   — the stream door
//
// STREAM-FRAMING DECISION (py cites — read fully, 2026-09-07):
//   py has NO SSE, NO chunked stream, NO heartbeat, NO cursor/replay.
//   The events arm is a NATIVE STARLETTE WEBSOCKET (gateway.py 2472:
//   "Native starlette WebSocket for /v1/flows/events/<run_id>";
//   main() 4514-4515 registers WSRoutes; the HTTP ROUTES rows 4082-4089
//   carry ws=True and their handler is _h_ws_fallback, which 404s any
//   non-Upgrade request 3005-3009). Frames are starlette
//   WebSocket.send_json payloads — json.dumps(data, separators=(",",":"),
//   ensure_ascii=False) (starlette 1.6.0 source): COMPACT, raw UTF-8,
//   NOT indent-2. wsFrameBytes() below reproduces that rule
//   (JSON.stringify is already compact-separator + raw-UTF-8 for the
//   JSON-representable domain; float-repr edge documented below).
//   Event names (the "type" field): "hello" (ALL_RUNS subscribe ack,
//   2533), "run" (hydrate 2544 + terminal broadcast 1413-1414 +
//   unknown-run 2542), "stage" (hydrate patches 2546-2553 — id +
//   status + truthy progress/activity, NEVER index — vs live
//   publishes 1536/1559/… which carry index + updates). No
//   heartbeat frames exist; a late joiner gets a SNAPSHOT hydrate,
//   never history — so there is NO cursor, NO Last-Event-ID, NO
//   replay: reconnect === fresh subscribe + fresh hydrate (the wall
//   pins exactly that).
//   The shell's hydrate reads the flowsRun registry (preview
//   starts + P5 boot-resurrected work): an OWNED id answers its run
//   frame (plus terminal stage patches, 2546-2553); anything else
//   answers {type:run,status:unknown} (2540-2542 — no sidecar
//   fallback; the restore path belongs to the status door). The
//   bare door answers hello (2533-2536).
//   ALL_RUNS ("*" bare door, 2530-2536) mirrors every run's frames
//   STAMPED with the run id (dict(event, run=run_id), 1167-1176).
//
// RUN RECORD SHAPES:
//   - status door: py's LIVE registry path (gw.runs, 2954-2982) is
//     the flowsRun registry (preview starts + P5 boot-resurrected
//     queued work, ctx.ts live-first); every answer HERE remains the
//     sidecar-restore shape py serves for any run it does not own
//     (sidecar_status, 2412-2470: verbatim sidecar + setdefault
//     run_id/stages/artifacts/error + queue_position 0 +
//     ?include_log tail). Key ORDER mirrors the setdefault sequence.
//   - runs list/detail: the editor_runs.py restore port (runs 483-653,
//     run_detail 656-806) via run_wire.py's frozen gate (RunRow 83-96,
//     RunsEnvelope 99-104): refused rows are SKIPPED (count keeps them
//     — the C contract), never served. The C-parity string surgery
//     (sidecar_str/num, _stages_span, prompt injection, json_quote) is
//     mirrored bug-for-bug (the ip+5 dead-sid, the error off-by-one,
//     the 24576 injection cap) — cites inline.
//   - the /v1/ledger journal door stays in assets.ts (hLedger); this
//     module reads the SAME state roots through the SHARED
//     defaultAssetRoots helper (no hardcodes, no drift).
//
// STATELESS DIVERGENCES (documented, never silent):
//   D1 no sweeps: py's read-time/boot sweeps REWRITE sidecars + append
//     run.swept ledger rows (2428-2451, boot_sweep 2378-2410). This
//     shell is a read door — it serves the swept REPORT bytes without
//     the write. First-read bodies are byte-identical; a second read
//     of the same stale sidecar diverges (py's file then carries the
//     "sweep" key). The wall reads each stale state exactly once.
//   D2 worker/pump: the TS shell starts no worker at boot (P5
//     resurrect registers queued work; the next start door's pump
//     drains the FIFO). Run-id sockets answer unknown for ids this
//     process never owned (exactly py's posture for an unowned run)
//     and hold; the bare door answers hello with the REGISTRY queue
//     (resurrected queued ids + active, usually empty), then holds
//     until the client closes or a live terminal frame lands (P6 bus
//     below).
//   D3 float literals: sidecar/stage numbers ride parseJson PyNum
//     literals (verbatim); WS frames built from live dicts cannot
//     preserve them (JSON number formatting) — same boundary class
//     as dumpsPy, pinned by vectors using ints. strtol'd row fields
//     (created_at/seed/durationSec) are JS numbers: exact below
//     2^53, approximate past it — fixtures stay small.
//   D4 NaN/Infinity sidecars/stages: py json.loads ACCEPTS them and
//     serves the literals; the strict TS parse instead falls back
//     (detail: the raw-string shape; status: the failed envelope,
//     still HTTP 200). Fixtures stay NaN-free — never walled.
//   D5 non-UTF8 sidecar bytes: py surrogateescape counts bytes as
//     chars in caps; the port decodes UTF-8 first (fixtures stay
//     valid UTF-8; boundary noted, never hit by the wall).
//   D6 raw control chars inside sidecar strings: py json.loads
//     rejects them (status: failed envelope; detail stages: raw-
//     string shape); the lenient TS parse accepts. Fixtures stay
//     valid-JSON.
//   D7 tie order: os.listdir/readdirSync order is arbitrary in BOTH
//     runtimes and the sort is stable, so created-ties order
//     nondeterministically on each side — the wall uses distinct
//     created_at per fixture (the source itself warns callers to
//     compare order-insensitively within tie groups).
//   D8 ?limit ints: int() underscores ("1_0"->10) mirrored;
//     CPython's unicode digits and big precision are not —
//     fixtures stay ASCII and small.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { Socket } from "node:net";
import {
  ASSET_URL_PREFIX,
  mediaVocab,
  PyNum,
} from "@melite/gateway-core";
import {
  dumpsPy,
  parseJson,
  pyReprString,
} from "./assets.ts";
import type { AssetResult } from "./assets.ts";
import type { AssetRoots } from "@melite/gateway-core";
import { queueSnapshot } from "./flowsRun.ts";
import { hydrateSnapshot } from "./flowsRun.ts";
import {
  handleFlowsStatus,
  parseIncludeLog,
} from "./flowsRun.ts";
import type { RunsService } from "./flowsRun.ts";
import type { Context, Plugin } from "@deepseek-ai/cordis";
import type { DispatchResult } from "@melite/gateway-core";
import type { GatewayRequest } from "@melite/gateway-core";
import { matchRoute, parseQuery } from "@melite/gateway-core";

// ── queue ──────────────────────────────────────────────────────────
// python/gateway.py _h_queue 2893-2907: queued=len(order), running=1/0,
// active=run_id/"", queued_ids=list(order). P5: the snapshot reads
// the flowsRun registry (boot-resurrected queued work + preview
// starts) — an empty registry serves the same empty bytes as before.
// Key order as py.

export function hQueue(svc?: RunsService | null): AssetResult {
  const snap = queueSnapshot(svc ?? undefined);
  return {
    status: 200,
    body: dumpsPy({
      queued: snap.queued,
      running: snap.running,
      active: snap.active,
      queued_ids: snap.queued_ids,
    }),
    contentType: "application/json",
    headers: {},
  };
}

// ── C-parity text surgery (infra/python/editor_runs.py 83-334) ───────────────

/** _strtol (editor_runs.py 96-102): optional space, optional sign,
 *  then digits; 0 when no digits lead. */
export function strtolPy(s: string): number {
  const m: RegExpMatchArray | null = /^[\s]*([+-]?\d+)/.exec(s);
  if (m === null || m[1] === undefined) return 0;
  return Number(m[1]);
}

/** sidecar_num (editor_runs.py 297-303): first `"key":`, strtol the
 *  tail, default when the key is absent. */
export function sidecarNum(text: string, key: string, dflt: number): number {
  const needle: string = '"' + key + '":';
  const i: number = text.indexOf(needle);
  if (i < 0) return dflt;
  return strtolPy(text.slice(i + needle.length));
}

/** sidecar_str (editor_runs.py 271-295): BYTE-wise C parity — first
 *  `"key":`, skip spaces/tabs, expect `"`, decode \\n \\r \\t \"
 *  \\ (any other escape lands literally — \u stays "u"), stop at
 *  cap-1 BYTES. Operates on the UTF-8 bytes (D5). */
export function sidecarStr(raw: Uint8Array, key: string, cap: number): string {
  const pat: Uint8Array = Buffer.from('"' + key + '":', "utf8");
  let at: number = -1;
  outer: for (let i = 0; i + pat.length <= raw.length; i++) {
    for (let j = 0; j < pat.length; j++) {
      if (raw[i + j] !== pat[j]) continue outer;
    }
    at = i;
    break;
  }
  if (at < 0) return "";
  let p: number = at + pat.length;
  while (p < raw.length && (raw[p] === 0x20 || raw[p] === 0x09)) p++;
  if (p >= raw.length || raw[p] !== 0x22) return "";
  p++;
  const out: number[] = [];
  while (p < raw.length && raw[p] !== 0x22 && out.length + 1 < cap) {
    if (raw[p] === 0x5c && p + 1 < raw.length) {
      p++;
      const e: number = raw[p] as number;
      out.push(e === 0x6e ? 0x0a : e === 0x72 ? 0x0d : e === 0x74 ? 0x09 : e);
      p++;
    } else {
      out.push(raw[p] as number);
      p++;
    }
  }
  return Buffer.from(out).toString("utf8");
}

/** _sidecar_str_impl found-ness (editor_runs.py 271-295 core): only
 *  the runs-list status site reads it (editor_runs.py 566-567) — a
 *  present-but-empty "status" serves "" (the gate then skips the
 *  row), while an absent/non-string key serves "unknown". */
export function sidecarStrFound(
  raw: Uint8Array,
  key: string,
  cap: number,
): [boolean, string] {
  const pat: Uint8Array = Buffer.from('"' + key + '":', "utf8");
  let at: number = -1;
  outer: for (let i = 0; i + pat.length <= raw.length; i++) {
    for (let j = 0; j < pat.length; j++) {
      if (raw[i + j] !== pat[j]) continue outer;
    }
    at = i;
    break;
  }
  if (at < 0) return [false, ""];
  let p: number = at + pat.length;
  while (p < raw.length && (raw[p] === 0x20 || raw[p] === 0x09)) p++;
  if (p >= raw.length || raw[p] !== 0x22) return [false, ""];
  p++;
  const out: number[] = [];
  while (p < raw.length && raw[p] !== 0x22 && out.length + 1 < cap) {
    if (raw[p] === 0x5c && p + 1 < raw.length) {
      p++;
      const e: number = raw[p] as number;
      out.push(e === 0x6e ? 0x0a : e === 0x72 ? 0x0d : e === 0x74 ? 0x09 : e);
      p++;
    } else {
      out.push(raw[p] as number);
      p++;
    }
  }
  return [true, Buffer.from(out).toString("utf8")];
}

/** _stages_span (editor_runs.py 305-334): the verbatim [...] span
 *  after the first "stages" ([-depth count, NOT string-aware),
 *  capped to cap-1 chars; "[]" when no array opens. */
export function stagesSpan(text: string, cap: number = 24576): string {
  const sp: number = text.indexOf('"stages"');
  if (sp < 0) return "[]";
  const c: number = text.indexOf("[", sp);
  if (c < 0) return "[]";
  let depth = 0;
  let e: number = -1;
  for (let i = c; i < text.length; i++) {
    if (text[i] === "[") depth++;
    else if (text[i] === "]") {
      depth--;
      if (depth === 0) {
        e = i + 1;
        break;
      }
    }
  }
  if (e < 0) return "[]";
  return text.slice(c, e).slice(0, cap - 1);
}

/** json_quote (editor_runs.py 336-360): the C string quoter — escape
 *  " \ \n \r \t, DROP other controls, raw UTF-8 passthrough (NOT
 *  ensure_ascii — the injected params ride literal). */
export function jsonQuoteC(s: string): string {
  let out = '"';
  for (const ch of s) {
    const code: number = (ch as string).codePointAt(0) as number;
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\r") out += "\\r";
    else if (ch === "\t") out += "\\t";
    else if (code < 0x20) continue;
    else out += ch;
  }
  return out + '"';
}

/** py truthiness for parsed sidecar values (gateway.py's `or` /
 *  `if x.get(...)` sites): namely {} and [] are FALSY (truthy in
 *  JS — the stage-falsy wall vector), and parseJson numbers ride
 *  as PyNum (unwrapped for the zero check; NaN is truthy, as in
 *  py). Everything else matches JS. */
export function isTruthyPy(v: unknown): boolean {
  const u: unknown = v instanceof PyNum ? Number(v.literal) : v;
  if (u === undefined || u === null) return false;
  if (typeof u === "boolean") return u;
  if (typeof u === "number") return u === u ? u !== 0 : true;
  if (typeof u === "string") return u.length > 0;
  if (Array.isArray(u)) return u.length > 0;
  if (typeof u === "object") return Object.keys(u).length > 0;
  return true;
}

/** py str() for the log_tail interpolations (gateway.py 2903-2951
 *  call sites pass strings/ints/bools/None): strings ride,
 *  True/False/None spell py, ints exact. Parsed sidecar numbers
 *  arrive as PyNum — unwrapped to the literal (the progress
 *  "10/10" vector). Boundary (D3 class): non-integral floats
 *  (str(2.0)="2.0" vs String(2.0)="2") and exotic objects
 *  (str(dict) vs "[object Object]") — fixtures use
 *  strings/ints/bools only. */
function fmtStrPy(v: unknown): string {
  const u: unknown = v instanceof PyNum ? v.literal : v;
  if (typeof u === "string") return u;
  if (typeof u === "boolean") return u ? "True" : "False";
  if (u === null || u === undefined) return "None";
  if (typeof u === "number") {
    return String(u);
  }
  return String(u);
}

// ── media helpers (infra/python/editor_runs.py 238-270, 335-444) ─────────────

/** artifact_type (editor_runs.py 272-290): estate media vocab (DATA
 *  sets) first, then json->spec, txt/md/yaml->text, else file. The
 *  ext is the post-LAST-dot tail, lowered ("A." -> ""). */
export function artifactType(name: string, kindsPath: string): string {
  const kinds = mediaVocab(kindsPath);
  const dot: number = name.lastIndexOf(".");
  const ext: string =
    dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  if (kinds.image.includes(ext)) return "image";
  if (kinds.audio.includes(ext)) return "audio";
  if (kinds.video.includes(ext)) return "video";
  if (kinds.model.includes(ext)) return "model";
  if (ext === "json") return "spec";
  if (ext === "txt" || ext === "md" || ext === "yaml") return "text";
  return "file";
}

/** Byte-wise name order (editor_runs sorts on the surrogateescape
 *  bytes — for valid UTF-8, Buffer.compare on the re-encoded name
 *  is the same bytes; D5). */
function byteLess(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function fileSize(path: string): number {
  try {
    return statSync(path).size;
  } catch {
    return -1;
  }
}

interface MediaCand {
  readonly rel: string;
  readonly full: string;
}

/** _media_candidates (editor_runs.py 373-402): top-level files
 *  (non-underscore) then ONE level down (underscore + deeper dirs
 *  skipped), each tier byte-sorted. */
export function mediaCandidates(runDir: string): MediaCand[] {
  const cands: MediaCand[] = [];
  let names: string[];
  try {
    names = readdirSync(runDir);
  } catch {
    return [];
  }
  names.sort(byteLess);
  const subs: string[] = [];
  for (const name of names) {
    if (name.startsWith("_")) continue;
    const full: string = join(runDir, name);
    if (isDir(full)) subs.push(name);
    else cands.push({ rel: name, full });
  }
  subs.sort(byteLess);
  for (const sub of subs) {
    let inner: string[];
    try {
      inner = readdirSync(join(runDir, sub));
    } catch {
      continue;
    }
    inner.sort(byteLess);
    for (const name of inner) {
      if (name.startsWith("_")) continue;
      const full: string = join(runDir, sub, name);
      if (isDir(full)) continue;
      cands.push({ rel: sub + "/" + name, full });
    }
  }
  return cands;
}

/** run_artifacts (editor_runs.py 404-430): image/video/audio/model
 *  rows (image capped at _MAX_IMGS — counted but unlisted past it),
 *  everything else skipped; the {truncated,listed,total} marker when
 *  entries went unlisted. path keeps the "./output/<run>/" literal. */
export function runArtifacts(
  runDir: string,
  outDirLiteral: string,
  kindsPath: string,
): Record<string, unknown>[] {
  const kinds = mediaVocab(kindsPath);
  const maxImgs: number = kinds.maxListedImages;
  const runBase: string = (() => {
    const stripped: string = outDirLiteral.replace(/\/+$/, "");
    const slash: number = stripped.lastIndexOf("/");
    return slash >= 0 ? stripped.slice(slash + 1) : stripped;
  })();
  const arts: Record<string, unknown>[] = [];
  let mediaTotal = 0;
  let listed = 0;
  let imgs = 0;
  for (const cand of mediaCandidates(runDir)) {
    const base: string = cand.rel.includes("/")
      ? (cand.rel.slice(cand.rel.lastIndexOf("/") + 1) as string)
      : cand.rel;
    const t: string = artifactType(base, kindsPath);
    if (t === "image") {
      mediaTotal++;
      imgs++;
      if (imgs > maxImgs) continue;
    } else if (t === "video" || t === "audio" || t === "model") {
      mediaTotal++;
    } else {
      continue;
    }
    listed++;
    const size: number = fileSize(cand.full);
    arts.push({
      name: base,
      path: outDirLiteral + "/" + cand.rel,
      bytes: size,
      url: ASSET_URL_PREFIX + "/" + runBase + "/" + cand.rel,
      type: t,
      size,
    });
  }
  if (mediaTotal > listed) {
    arts.push({ truncated: true, listed, total: mediaTotal });
  }
  return arts;
}

/** _run_thumbnail (editor_runs.py 433-444): cached poster wins, else
 *  the first image candidate (same one-level rule, so nested-only
 *  runs still get a poster). */
export function runThumbnail(runDir: string, runId: string, kindsPath: string): string {
  try {
    statSync(join(runDir, "_poster.jpg"));
    return ASSET_URL_PREFIX + "/" + runId + "/_poster.jpg";
  } catch {
    /* no poster — fall through to first image */
  }
  for (const cand of mediaCandidates(runDir)) {
    const base: string = cand.rel.includes("/")
      ? (cand.rel.slice(cand.rel.lastIndexOf("/") + 1) as string)
      : cand.rel;
    if (artifactType(base, kindsPath) === "image") {
      return ASSET_URL_PREFIX + "/" + runId + "/" + cand.rel;
    }
  }
  return "";
}

/** _run_dir_has_media (editor_runs.py 307-333): the media-FIRST
 *  sort key — top-level names, then one level down. NOTE the
 *  absences: NO `_` skip (a lone `_poster.jpg` counts), NO inner
 *  isdir check (a nested DIR named x.mp4 counts) — probed live,
 *  mirrored exactly. Gallery sets only (svg/bmp classify but do
 *  not list — the media-kinds.json contract). */
export function runDirHasMedia(runDir: string, kindsPath: string): boolean {
  const kinds = mediaVocab(kindsPath);
  const has = (name: string): boolean => {
    const dot: number = name.lastIndexOf(".");
    const ext: string =
      dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
    return (
      kinds.galleryVideo.includes(ext) ||
      kinds.galleryImage.includes(ext) ||
      kinds.galleryAudio.includes(ext) ||
      kinds.galleryModel.includes(ext)
    );
  };
  let names: string[];
  try {
    names = readdirSync(runDir);
  } catch {
    return false;
  }
  for (const name of names) {
    if (has(name)) return true;
  }
  for (const name of names) {
    const sub: string = join(runDir, name);
    try {
      if (!isDir(sub)) continue;
      for (const inner of readdirSync(sub)) {
        if (has(inner)) return true;
      }
    } catch {
      continue;
    }
  }
  return false;
}

// ── the run_wire.py gate (RunRow 83-96 / RunsEnvelope 99-104) ─────
// A refused reconstruction is SKIPPED (RESILIENCE LAW) but stays in
// count (the C contract). Extra keys forbid; statuses outside the
// closed vocab (incl. "queued") refuse; a "model" artifact row
// refuses the whole run (ArtifactRow admits image/video/audio only).

const RUN_ID_RE: RegExp = /^run-[A-Za-z0-9_.@-]+$/;
const RUN_STATUS: ReadonlySet<string> = new Set([
  "running",
  "completed",
  "failed",
  "stopped",
  "success",
  "unknown",
]);
const ARTIFACT_TYPE: ReadonlySet<string> = new Set(["image", "video", "audio"]);

function isIntGe0(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && (v as number) >= 0;
}

function artifactRowOk(a: unknown): boolean {
  if (typeof a !== "object" || a === null || Array.isArray(a)) return false;
  const o = a as Record<string, unknown>;
  const keys: string[] = Object.keys(o);
  const isTrunc: boolean = "truncated" in o;
  if (isTrunc) {
    if (keys.length !== 3) return false;
    return (
      o["truncated"] === true && isIntGe0(o["listed"]) && isIntGe0(o["total"])
    );
  }
  if (keys.length !== 6) return false;
  return (
    typeof o["name"] === "string" &&
    (o["name"] as string).length >= 1 &&
    typeof o["path"] === "string" &&
    isIntGe0(o["bytes"]) &&
    typeof o["url"] === "string" &&
    typeof o["type"] === "string" &&
    ARTIFACT_TYPE.has(o["type"] as string) &&
    isIntGe0(o["size"])
  );
}

/** The RunRow gate — the row dict, or null when run_wire would
 *  refuse it (the caller logs LOUD and skips). Key order is the
 *  RunRow field order (pydantic model_dump order). */
export function runRowOrNull(
  row: {
    run_id: string;
    name: string;
    flow: string;
    status: string;
    created_at: number;
    prompt: string;
    seed: number;
    thumbnail: string;
    artifacts: Record<string, unknown>[];
    params: Record<string, unknown>;
    draft_id: string;
  },
): Record<string, unknown> | null {
  if (!RUN_ID_RE.test(row.run_id)) return null;
  if (!RUN_STATUS.has(row.status)) return null;
  if (!isIntGe0(row.created_at)) return null;
  if (typeof row.seed !== "number" || !Number.isInteger(row.seed)) return null;
  for (const a of row.artifacts) {
    if (!artifactRowOk(a)) return null;
  }
  return {
    run_id: row.run_id,
    name: row.name,
    flow: row.flow,
    status: row.status,
    created_at: row.created_at,
    prompt: row.prompt,
    seed: row.seed,
    thumbnail: row.thumbnail,
    artifacts: row.artifacts,
    params: row.params,
    draft_id: row.draft_id,
  };
}

// ── GET /v1/flows/runs (editor_runs.runs 483-653) ──────────────────
// server_root is STATE_ROOT (output/ + drafts/ hang under it);
// live_run_ids is () — the shell owns no registry (D2), so every
// "running" sidecar reads failed (the zombie rule, 587-593).

/** int(_raw) (gateway.py 3020-3023): surrounding whitespace
 *  stripped, one optional sign, ASCII digits with single internal
 *  underscores ("1_0" -> 10 — the wall pins it). null = ValueError
 *  -> the 400. Boundary: CPython also takes unicode digits and
 *  arbitrary precision; fixtures stay ASCII and small (D3 class). */
export function parseIntPy(s: string): number | null {
  const m: RegExpMatchArray | null =
    /^([+-]?)([0-9]+(?:_[0-9]+)*)$/.exec(s.trim());
  if (m === null || m[1] === undefined || m[2] === undefined) return null;
  return Number((m[1] as string) + (m[2] as string).replace(/_/g, ""));
}

/** parse_qs parity (urllib drops blank values): first non-blank
 *  value wins; the shared ctx parseQuery keeps blanks, so the
 *  filter lives here (gateway.py 3011-3034 + parse_qs default). */
export function firstQuery(
  qs: Record<string, string[]>,
  name: string,
  dflt: string,
): string {
  const vals: string[] | undefined = qs[name];
  if (vals === undefined) return dflt;
  for (const v of vals) {
    if (v !== "") return v;
  }
  return dflt;
}

export function hRunsList(
  qs: Record<string, string[]>,
  roots: AssetRoots,
): AssetResult {
  const raw: string = firstQuery(qs, "limit", "") || "200";
  const parsed: number | null = parseIntPy(raw);
  if (parsed === null) {
    return {
      status: 400,
      // The R4.2 code rides inline (asset-door precedent: dispatch
      // passes AssetResult bodies through unstamped).
      body: dumpsPy({
        error: "limit must be an integer (got " + pyReprString(raw) + ")",
        code: "invalid_request",
      }),
      contentType: "application/json",
      headers: {},
    };
  }
  const limit: number = Math.max(1, Math.min(500, parsed));
  const outputRoot: string = roots.runsRoot;
  const draftsRoot: string = join(roots.stateRoot, "drafts");
  let names: string[];
  try {
    names = readdirSync(outputRoot);
  } catch {
    names = [];
  }
  interface Ent {
    readonly dir: string;
    readonly created: number;
    readonly media: boolean;
  }
  const ents: Ent[] = [];
  for (const name of names) {
    if (ents.length >= 8192) break; // the C's 8192 collected cap
    if (!name.startsWith("run-")) continue;
    const runDir: string = join(outputRoot, name);
    let created = 0;
    let buf = "";
    try {
      buf = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 8191);
    } catch {
      buf = "";
    }
    if (buf) {
      // created_at (py sidecar) first, "created" (C fossil) fallback.
      created = sidecarNum(buf, "created", 0);
      const at: number = buf.indexOf('"created_at":');
      if (at >= 0) created = strtolPy(buf.slice(at + 13));
    }
    ents.push({
      dir: name,
      created,
      media: runDirHasMedia(runDir, roots.mediaKindsPath),
    });
  }
  const count: number = ents.length;
  ents.sort((a: Ent, b: Ent): number => {
    const am: number = a.media ? 0 : 1;
    const bm: number = b.media ? 0 : 1;
    if (am !== bm) return am - bm;
    return b.created - a.created; // newest-first; stable (C parity)
  });
  const rows: Record<string, unknown>[] = [];
  for (const ent of ents.slice(0, limit)) {
    const runDir: string = join(outputRoot, ent.dir);
    let buf: string | null = null;
    try {
      buf = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 8191);
    } catch {
      buf = null;
    }
    let status = "success";
    let pipeline = "";
    let prompt = "";
    let draft = "";
    let seed = -1;
    let created: number = ent.created;
    const rawBytes: Uint8Array = buf === null ? Buffer.alloc(0) : Buffer.from(buf, "utf8");
    if (buf !== null) {
      // found-ness matters (editor_runs.py 566-567): absent key ->
      // "unknown" (served); present-but-empty -> "" (gate-skipped).
      const [foundStatus, rawStatus]: [boolean, string] = sidecarStrFound(
        rawBytes,
        "status",
        16,
      );
      if (foundStatus) {
        status = rawStatus === "error" ? "failed" : rawStatus;
        // read-time zombie override (sweep=False: report only, D1).
        if (status === "running") status = "failed";
      } else {
        status = "unknown";
      }
      pipeline = sidecarStr(rawBytes, "pipeline", 64);
      prompt = sidecarStr(rawBytes, "prompt", 2048);
      draft = sidecarStr(rawBytes, "draft_id", 96);
      seed = sidecarNum(buf, "seed", -1);
      const at: number = buf.indexOf('"created_at":');
      if (at >= 0) created = strtolPy(buf.slice(at + 13));
    }
    if (pipeline.startsWith("_")) continue; // user-surface law
    if (draft) {
      try {
        statSync(join(draftsRoot, draft + ".json"));
      } catch {
        draft = "";
      }
    }
    const literal: string = "./output/" + ent.dir;
    const row = runRowOrNull({
      run_id: ent.dir,
      name: pipeline,
      flow: pipeline,
      status,
      created_at: created,
      prompt,
      seed,
      thumbnail: runThumbnail(runDir, ent.dir, roots.mediaKindsPath),
      artifacts: runArtifacts(runDir, literal, roots.mediaKindsPath),
      params: { seed },
      draft_id: draft,
    });
    if (row === null) continue; // RESILIENCE LAW: loud skip (below)
    rows.push(row);
  }
  return {
    status: 200,
    body: dumpsPy({ count, runs: rows }),
    contentType: "application/json",
    headers: {},
  };
}

// ── GET /v1/flows/runs/{run_id} (editor_runs.run_detail 656-806) ───
// The RESTORE path only (the live-registry path needs g_runs[]).

export function hRunDetail(runId: string, roots: AssetRoots): AssetResult {
  const runDir: string = join(roots.runsRoot, runId);
  let sb: string;
  try {
    sb = readFileSync(join(runDir, "_flow.json"), "utf8").slice(0, 65535);
  } catch {
    return {
      status: 404,
      body: dumpsPy({ error: "unknown run_id", code: "invalid_request" }),
      contentType: "application/json",
      headers: {},
    };
  }
  const raw: Uint8Array = Buffer.from(sb, "utf8");
  // st (editor_runs.py 671-682): absent key reads "unknown" (NOT
  // failed — the restore path's honest default); the `"status"`
  // then-next-two-quotes scan with the <24 guard; success->
  // completed, error->failed, everything else rides.
  let st = "unknown";
  const qStatus: number = sb.indexOf('"status"');
  if (qStatus >= 0) {
    const c: number = sb.indexOf('"', qStatus + 8);
    if (c >= 0) {
      const e: number = sb.indexOf('"', c + 1);
      if (e >= 0 && e - c - 1 < 24) {
        st = sb.slice(c + 1, e);
        if (st === "success") st = "completed";
        else if (st === "error") st = "failed";
      }
    }
  }
  // ev (editor_runs.py 684-693): the needle is the 9-char
  // '"error":"' so c=qq+8 lands ON the value's opening quote and
  // e=find('"',c) is that same quote — ev is ALWAYS "". Mirrored
  // as the constant, not fixed.
  const ev = "";
  // created_at first, "created" fossil fallback.
  let created = 0;
  for (const ckey of ["created_at", "created"]) {
    const qq: number = sb.indexOf('"' + ckey + '"');
    if (qq >= 0) {
      const c: number = sb.indexOf(":", qq);
      if (c >= 0) created = strtolPy(sb.slice(c + 1));
      break;
    }
  }
  let dur = 0;
  {
    const qq: number = sb.indexOf('"durationSec"');
    if (qq >= 0) {
      const c: number = sb.indexOf(":", qq);
      if (c >= 0) dur = strtolPy(sb.slice(c + 1));
    }
  }
  const arts: Record<string, unknown>[] = runArtifacts(
    runDir,
    "./output/" + runId,
    roots.mediaKindsPath,
  );
  // stages: run-dir card.json wins over the sidecar; verbatim span,
  // never hand-composed.
  let src: string | null = null;
  try {
    src = readFileSync(join(runDir, "card.json"), "utf8").slice(0, 24575);
  } catch {
    src = sb;
  }
  let stages2: string = "[]";
  if (src !== null) stages2 = stagesSpan(src);
  const draftId: string = sidecarStr(raw, "draft_id", 96);
  // placeholder-prompt fix: per-stage params injection incl. the
  // 24576 cap that suppresses it on big cards. NOTE the ip+5
  // dead-sid (~763): '"id":"' is 6 chars so v lands ON the value's
  // opening quote and L stops at 0 — sid is ALWAYS "", pkey is
  // ALWAYS "prompt". Mirrored exactly, window branch included.
  const rprom: string = sidecarStr(raw, "prompt", 1024);
  let rseed = 0;
  {
    const qq: number = sb.indexOf('"seed"');
    if (qq >= 0) {
      const c: number = sb.indexOf(":", qq);
      if (c >= 0) rseed = strtolPy(sb.slice(c + 1));
    }
  }
  let reqbuf = "";
  try {
    reqbuf = readFileSync(join(runDir, "_request.json"), "utf8").slice(0, 65535);
  } catch {
    reqbuf = "";
  }
  let walk = 0;
  for (;;) {
    const ob: number = stages2.indexOf("{", walk);
    if (ob < 0) break;
    let cb: number = ob + 1;
    while (cb < stages2.length && stages2[cb] !== "}") cb++;
    if (cb >= stages2.length) break;
    let sid = "";
    const ip: number = stages2.indexOf('"id":"', ob);
    if (ip >= 0 && ip < cb) {
      const v: number = ip + 5;
      let L = 0;
      while (v + L < cb && stages2[v + L] !== '"' && L < 63) L++;
      sid = stages2.slice(v, v + L);
    }
    void sid; // always "" (ip+5, see above) — pkey stays "prompt".
    const pkey = "prompt";
    let spro = "";
    let have = false;
    if (reqbuf && reqbuf.includes('"' + pkey + '"')) {
      spro = sidecarStr(Buffer.from(reqbuf, "utf8"), pkey, 1024);
      have = spro !== "";
    }
    if (!have && rprom) {
      spro = rprom;
      have = true;
    }
    const pjson: string = have
      ? ',"params":{"prompt":' + jsonQuoteC(spro) + ',"seed":' + rseed + "}"
      : ',"params":{"seed":' + rseed + "}";
    if (stages2.length + pjson.length + 1 < 24576) {
      stages2 = stages2.slice(0, cb) + pjson + stages2.slice(cb);
      walk = cb + pjson.length + 1;
    } else {
      break;
    }
  }
  let stages: unknown;
  try {
    stages = parseJson(stages2); // PyNum literals ride verbatim (D3)
  } catch {
    stages = stages2; // the C would serve it raw
  }
  return {
    status: 200,
    body: dumpsPy({
      run_id: runId,
      status: st,
      state: st,
      error: ev,
      created,
      durationSec: dur,
      restored_from_sidecar: true,
      artifacts: arts,
      stages,
      draft_id: draftId,
    }),
    contentType: "application/json",
    headers: {},
  };
}

// ── GET /v1/flows/status/{run_id} (gateway.sidecar_status 2412+) ───
// Stateless: the sidecar-restore shape only (the live-registry path
// needs gw.runs). Stale running/queued sidecars serve the swept
// REPORT without the write (D1).

function isPlainObj(v: unknown): v is Record<string, unknown> {
  // PyNum is typeof "object" but NOT a py dict — a scalar sidecar
  // (5, 1.0) must throw toward the 500 exactly like py's .get on
  // an int (probed: status 500 both sides), never ride as a row.
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    !(v instanceof PyNum)
  );
}

/** The swept report for a stale running/queued sidecar (read-time
 *  sweep 2424-2451, report only — D1). Mutates the parsed obj in
 *  place exactly as py does (status/error assignment, then the
 *  setdefaults below). */
function applyStaleReport(obj: Record<string, unknown>): void {
  const queued: boolean = obj["status"] === "queued";
  obj["status"] = "failed";
  obj["error"] = queued
    ? "run was still queued when the gateway vanished (never executed) — resubmit"
    : "zombie swept at read time";
}

/** _run_log_tail (gateway.py 2903-2951): the drilldown console
 *  lines, last 80 — SYNTHESIZED from real state, never fabricated.
 *  Format traps, all mirrored: the head reads str(status or "?");
 *  the stage name is name-or-id-or-"stage" (the "stage" KEY plays no
 *  role — it does in the WS hydrate patch, a different door); the
 *  stage error rides INSIDE the same element (the [-80:] tail counts
 *  elements, not lines); artifacts is ONE comma-joined line, absent
 *  when empty. Truthy-but-malformed stages/artifacts iterate-or-
 *  throw exactly as py's for-loops do (strings iterate chars, dicts
 *  iterate keys, numbers throw toward the 500). */
export function runLogTail(stored: Record<string, unknown>): string {
  const lines: string[] = [];
  // str(obj.get("status") or "?") — py truthiness throughout here
  // (isTruthyPy: {} and [] are falsy).
  const statusRaw: unknown = stored["status"];
  const status: unknown = isTruthyPy(statusRaw) ? statusRaw : "?";
  let head: string = "run: " + fmtStrPy(status);
  if (status === "queued") {
    // isinstance(qp, int) and qp > 0 — bool IS int in py (%d of
    // True reads 1); parsed ints ride PyNum.
    const qp: unknown = stored["queue_position"];
    let qpInt: number | null = null;
    if (typeof qp === "boolean") qpInt = qp ? 1 : 0;
    else if (typeof qp === "number" && Number.isInteger(qp)) qpInt = qp;
    else if (qp instanceof PyNum && /^-?\d+$/.test(qp.literal)) {
      qpInt = Number(qp.literal);
    }
    if (qpInt !== null && qpInt > 0) {
      head += " (queue position " + String(qpInt) + ")";
    }
  }
  const err: unknown = stored["error"];
  if (isTruthyPy(err)) head += " — " + fmtStrPy(err).slice(0, 300);
  lines.push(head);
  const stages: unknown = stored["stages"] || [];
  // Truthy-but-malformed stages iterate-or-throw exactly as py's
  // for-loop does: strings iterate chars, dicts iterate keys,
  // numbers/bools throw toward the 500.
  const rows: unknown[] = Array.isArray(stages)
    ? stages
    : typeof stages === "string"
      ? [...stages]
      : isPlainObj(stages)
        ? Object.keys(stages)
        : [...(stages as unknown as Iterable<unknown>)];
  for (const s of rows) {
    if (!isPlainObj(s)) continue;
    const st = s as Record<string, unknown>;
    const sname: unknown = st["name"];
    const sid: unknown = st["id"];
    const name: string = fmtStrPy(
      isTruthyPy(sname) ? sname : isTruthyPy(sid) ? sid : "stage",
    );
    const sstatus: unknown = st["status"];
    let line: string =
      name + ": " + fmtStrPy(isTruthyPy(sstatus) ? sstatus : "?");
    const p: unknown = st["progress"];
    if (isPlainObj(p) && isTruthyPy(p["max"])) {
      line += " — " + fmtStrPy(p["value"]) + "/" + fmtStrPy(p["max"]);
    }
    const a: unknown = st["activity"];
    if (isPlainObj(a)) {
      const phase: unknown = a["phase"];
      const ph: string = fmtStrPy(isTruthyPy(phase) ? phase : "");
      const msg: unknown = a["message"];
      const nc: unknown = a["node_class"];
      const tail: unknown = isTruthyPy(msg) ? msg : nc;
      line += " [" + ph + (isTruthyPy(tail) ? ": " + fmtStrPy(tail) : "") + "]";
    }
    const se: unknown = st["error"];
    if (isTruthyPy(se)) line += "\n  error: " + fmtStrPy(se).slice(0, 300);
    lines.push(line);
  }
  const arts: unknown = stored["artifacts"];
  if (isTruthyPy(arts)) {
    // arts[:6] on a string iterates its first 6 chars; on any other
    // non-array it throws toward the 500 — the slice below does both.
    const seq: unknown[] =
      typeof arts === "string"
        ? (arts as string).slice(0, 6).split("")
        : [...((arts as unknown[]).slice(0, 6))];
    const names: string[] = [];
    for (const a of seq) {
      let v: unknown;
      if (isPlainObj(a)) {
        const u: unknown = a["url"];
        const n: unknown = a["name"];
        const us: string | null = typeof u === "string" ? u : null;
        const ns: string | null = typeof n === "string" ? n : null;
        v = us || ns;
      } else {
        v = a;
      }
      const picked: unknown = isTruthyPy(v) ? v : "";
      const base: string = fmtStrPy(picked).split("/").pop() as string;
      if (base) names.push(base);
    }
    if (names.length > 0) lines.push("artifacts: " + names.join(", "));
  }
  return lines.slice(-80).join("\n");
}

/** sidecar_status without the sweep write (D1): the restored record
 *  for a run this process never owned. null = unknown run_id. */
export function sidecarStatus(
  runId: string,
  roots: AssetRoots,
  includeLog: boolean,
): Record<string, unknown> | null {
  const path: string = join(roots.runsRoot, runId, "_flow.json");
  let text: string;
  try {
    const st = statSync(path);
    if (!st.isFile()) return null;
    text = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  let obj: unknown;
  try {
    obj = parseJson(text); // D4: syntax throw -> the failed envelope
  } catch {
    return {
      run_id: runId,
      status: "failed",
      error: "unparseable sidecar",
      stages: [],
      artifacts: [],
      queue_position: 0,
    };
  }
  if (!isPlainObj(obj)) throw new Error("unparseable sidecar");
  const rec = obj as Record<string, unknown>;
  const status: unknown = rec["status"];
  if (status === "running" || status === "queued") {
    applyStaleReport(rec); // report only — no sidecar rewrite (D1)
  }
  if (!("run_id" in rec)) rec["run_id"] = runId;
  if (!("stages" in rec)) rec["stages"] = [];
  if (!("artifacts" in rec)) rec["artifacts"] = [];
  if (!("error" in rec)) rec["error"] = "";
  rec["queue_position"] = 0;
  if (includeLog) rec["log_tail"] = runLogTail(rec);
  return rec;
}

export function hFlowsStatus(
  runId: string,
  qs: Record<string, string[]>,
  roots: AssetRoots,
): AssetResult {
  const incRaw: string = firstQuery(qs, "include_log", "").toLowerCase();
  const rec: Record<string, unknown> | null = sidecarStatus(
    runId,
    roots,
    incRaw === "1" || incRaw === "true" || incRaw === "yes",
  );
  if (rec === null) {
    return {
      status: 404,
      body: dumpsPy({ error: "unknown run_id", code: "invalid_request" }),
      contentType: "application/json",
      headers: {},
    };
  }
  return {
    status: 200,
    body: dumpsPy(rec),
    contentType: "application/json",
    headers: {},
  };
}

// ── the WS-fallback 404 (python/gateway.py _h_ws_fallback 3005-3009) ───
// NOTE the code: py's handler returns the dict WITHOUT a code and
// route()'s R4.2 normalization stamps invalid_request — NOT the
// no_such_route of a genuinely unmatched path. The port stamps the
// code inline (asset-door precedent: dispatch passes AssetResult
// bodies through unstamped).

export function wsFallback404(method: string, path: string): AssetResult {
  return {
    status: 404,
    body: dumpsPy({
      error: "no such route " + method + " " + path,
      code: "invalid_request",
    }),
    contentType: "application/json",
    headers: {},
  };
}

/** Door-registration seam: map a ROUTES handler name to its runs
 *  implementation, or null when the row is not a runs door. m is
 *  the regex match (group 1 = the run id for the detail arms). */
export function dispatchRuns(
  handler: string,
  method: string,
  path: string,
  m: RegExpExecArray | null,
  qs: Record<string, string[]>,
  roots: AssetRoots,
  svc?: RunsService | null,
): AssetResult | null {
  if (handler === "_h_queue") return hQueue(svc);
  if (handler === "_h_flows_status") {
    return hFlowsStatus(m !== null && m[1] !== undefined ? m[1] : "", qs, roots);
  }
  if (handler === "_h_runs_list") return hRunsList(qs, roots);
  if (handler === "_h_run_detail") {
    return hRunDetail(m !== null && m[1] !== undefined ? m[1] : "", roots);
  }
  if (handler === "_h_ws_fallback") return wsFallback404(method, path);
  return null;
}

// ── the events stream door: WS frames + upgrade ───────────────────
// python/gateway.py _ws_starlette 2472-2584. Frame bytes = starlette
// send_json = json.dumps(data, separators=(",",":"), ensure_ascii=
// False): compact + raw UTF-8. JSON.stringify already uses compact
// separators and emits raw UTF-8 for the JSON-representable domain
// (D3: non-integral floats may reformat — vectors use ints).

/** The compact frame serializer (starlette send_json rule). */
export function wsFrameBytes(frame: unknown): string {
  return JSON.stringify(frame);
}

/** {"type":"hello",...} for the ALL_RUNS bare door (2530-2536). */
export function helloFrame(
  queueDepth: number,
  queued: string[],
  active: string | null,
): Record<string, unknown> {
  return {
    type: "hello",
    channel: "*",
    queue_depth: queueDepth,
    queued,
    active,
  };
}

/** {"type":"run","status":...} — hydrate (2542-2544), the terminal
 *  broadcast (1413-1414), and the unknown-run answer (2542). */
export function runFrame(status: string): Record<string, unknown> {
  return { type: "run", status };
}

/** Per-stage HYDRATE patch (2546-2553): id + status always; the
 *  progress/activity extras ride only when TRUTHY (py `if
 *  st.get(...)`, not merely present — {} / 0 / "" omit). NOTE this
 *  is NOT the live publish shape (1536/1559/… carry index +
 *  updates): hydrate patches never carry index, while the worker's
 *  live stage frames (built at the runOne publish points in
 *  flowsRun.ts) always do. The builder exists so the wall unit-pins
 *  the hydrate shape byte-for-byte against py's construction. */
export function stageHydratePatch(stage: {
  id: string;
  status: unknown;
  progress?: unknown;
  activity?: unknown;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    type: "stage",
    stage: stage.id,
    status: stage.status,
  };
  if (isTruthyPy(stage.progress)) patch["progress"] = stage.progress;
  if (isTruthyPy(stage.activity)) patch["activity"] = stage.activity;
  return patch;
}

/** The ALL_RUNS stamp (1167-1176): dict(event, run=run_id) — the
 *  "run" key lands LAST, exactly as py's dict(event, run=...)
 *  constructor orders it. */
export function stampAllRuns(
  event: Record<string, unknown>,
  runId: string,
): Record<string, unknown> {
  return { ...event, run: runId };
}

export const WS_GUID: string = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

/** Sec-WebSocket-Accept (RFC 6455 section 1.3). */
export function wsAccept(key: string): string {
  return createHash("sha1").update(key + WS_GUID, "utf8").digest("base64");
}

/** Encode one server-to-client text frame (FIN + text, unmasked). */
export function wsEncodeText(payload: Uint8Array): Uint8Array {
  const n: number = payload.length;
  let header: Uint8Array;
  if (n < 126) {
    header = new Uint8Array([0x81, n]);
  } else if (n < 65536) {
    header = new Uint8Array([0x81, 126, (n >> 8) & 0xff, n & 0xff]);
  } else {
    header = new Uint8Array(10);
    header[0] = 0x81;
    header[1] = 127;
    const hi: number = Math.floor(n / 4294967296);
    const lo: number = n >>> 0;
    header = Uint8Array.from([
      0x81,
      127,
      (hi >> 24) & 0xff,
      (hi >> 16) & 0xff,
      (hi >> 8) & 0xff,
      hi & 0xff,
      (lo >> 24) & 0xff,
      (lo >> 16) & 0xff,
      (lo >> 8) & 0xff,
      lo & 0xff,
    ]);
  }
  const out: Uint8Array = new Uint8Array(header.length + n);
  out.set(header, 0);
  out.set(payload, header.length);
  return out;
}

/** Encode a close frame (default 1000, empty reason). */
export function wsEncodeClose(code: number = 1000): Uint8Array {
  return new Uint8Array([0x88, 0x02, (code >> 8) & 0xff, code & 0xff]);
}

/** Verbatim close echo (the _monitor_client/hold-loop posture — py
 *  echoes the client close payload byte-for-byte via starlette, so
 *  an empty client close echoes as 8800, never a fixed 1000). */
export function wsEncodeCloseEcho(payload: Uint8Array): Uint8Array {
  const n: number = payload.length;
  if (n < 126) {
    const out: Uint8Array = new Uint8Array(2 + n);
    out[0] = 0x88;
    out[1] = n;
    out.set(payload, 2);
    return out;
  }
  // Belt-and-braces (close payloads are <= 125 per RFC 6455 5.5).
  const out: Uint8Array = new Uint8Array(4 + n);
  out[0] = 0x88;
  out[1] = 126;
  out[2] = (n >> 8) & 0xff;
  out[3] = n & 0xff;
  out.set(payload, 4);
  return out;
}

export interface WsUpgradeOpts {
  readonly roots: AssetRoots;
  readonly authToken: string;
  /** Raw request target (path + "?query") for the ?token= read. */
  readonly target: string;
  /** Lowercased request headers. */
  readonly headers: Record<string, string>;
  readonly socket: Socket;
}

/** Parse run_id exactly as _ws_starlette 2496-2513: path form
 *  (/events/<id>) wins; the query form reads ?run_id= (?id=
 *  fallback); the bare door subscribes to ALL_RUNS ("*"). */
export function wsRunId(target: string, path: string): string | null {
  const prefix = "/v1/flows/events/";
  if (path.startsWith(prefix)) return path.slice(prefix.length);
  const q: string = target.includes("?")
    ? (target.split("?")[1] as string)
    : "";
  const vals: Record<string, string[]> = {};
  for (const pair of q.split("&")) {
    if (!pair) continue;
    const eq: number = pair.indexOf("=");
    const k: string = eq < 0 ? pair : pair.slice(0, eq);
    const v: string = eq < 0 ? "" : pair.slice(eq + 1);
    let dk: string;
    try {
      dk = decodeURIComponent(k.replace(/\+/g, " "));
    } catch {
      dk = k;
    }
    let dv: string;
    try {
      dv = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      dv = v;
    }
    if (vals[dk] === undefined) vals[dk] = [];
    (vals[dk] as string[]).push(dv);
  }
  const rid: string[] | undefined = vals["run_id"] ?? vals["id"];
  if (rid !== undefined && rid.length > 0 && (rid[0] as string) !== "") {
    return rid[0] as string;
  }
  if (path.replace(/\/+$/, "") === "/v1/flows/events") return "*";
  return null;
}

/** WS auth (gateway.py 2189-2240): token empty passes everything;
 *  token set demands the header Bearer OR ?token= (browsers cannot
 *  set WS headers). _adapt passes "" as the query token for HTTP —
 *  the query arm is WS-only. */
export function wsAuthOk(
  headers: Record<string, string>,
  target: string,
  authToken: string,
): boolean {
  if (!authToken) return true;
  const auth: string = headers["authorization"] ?? "";
  if (auth === "Bearer " + authToken) return true;
  const q: string = target.includes("?")
    ? (target.split("?")[1] as string)
    : "";
  for (const pair of q.split("&")) {
    if (!pair) continue;
    const eq: number = pair.indexOf("=");
    const k: string = eq < 0 ? pair : pair.slice(0, eq);
    if (k !== "token") continue;
    const v: string = eq < 0 ? "" : pair.slice(eq + 1);
    let dv: string;
    try {
      dv = decodeURIComponent(v.replace(/\+/g, " "));
    } catch {
      dv = v;
    }
    if (dv !== "" && dv === authToken) return true;
  }
  return false;
}

function wsSend(socket: Socket, data: Uint8Array): void {
  try {
    socket.write(data);
  } catch {
    /* client went away — the door outlives every client */
  }
}

// ── the live event bus (P6; py Gateway.subscribe/publish 1096-1177) ─
// run_id -> subscribed sockets. The worker (flowsRun runOne) publishes
// stage flips + the terminal run frame through the RunsService bus
// slot (ctx.runs.publishBus; this door registers deliverBusFrame into
// it); deliver() fans each frame to the run's sockets AND, stamped
// with the run id, to the ALL_RUNS ("*") estate feed (py 1164-1177:
// dict(event, run=run_id), the "run" key last). A terminal run frame
// closes every socket that received it (py's shared event loop
// 2573-2577 returns on the first terminal run frame — hydrate
// snapshots never close, only live terminal events do). Sockets also
// leave on client close / disconnect / protocol violation below, so
// no set outlives its socket (py's finally-unsubscribe 2584).

const wsSubs: Map<string, Set<Socket>> = new Map();

/** Terminal run statuses that release the subscriber (py 2573-2574 —
 *  "unknown" never publishes live; it rides the hydrate only, but the
 *  set is inherited whole for cite-fidelity). */
const TERMINAL_RUN: ReadonlySet<string> = new Set([
  "completed",
  "failed",
  "stopped",
  "unknown",
]);

function wsUnsubscribe(runId: string, socket: Socket): void {
  const set: Set<Socket> | undefined = wsSubs.get(runId);
  if (set === undefined) return;
  set.delete(socket);
  if (set.size === 0) wsSubs.delete(runId);
}

function wsCloseSub(
  set: Set<Socket>,
  key: string,
  socket: Socket,
): void {
  wsSend(socket, wsEncodeClose(1000));
  try {
    socket.end();
  } catch {
    /* gone */
  }
  set.delete(socket);
  if (set.size === 0) wsSubs.delete(key);
}

/** The worker-path deliver fn (registered into the RunsService bus
 *  slot in runsDoors.apply below): one live frame to its run's sockets
 *  plus the stamped mirror to the estate feed, then the terminal close. */
export function deliverBusFrame(
  runId: string,
  event: Record<string, unknown>,
): void {
  const terminal: boolean =
    event["type"] === "run" &&
    typeof event["status"] === "string" &&
    TERMINAL_RUN.has(event["status"] as string);
  const direct: Set<Socket> | undefined = wsSubs.get(runId);
  if (direct !== undefined && direct.size > 0) {
    const frame: Uint8Array = wsEncodeText(
      Buffer.from(wsFrameBytes(event), "utf8"),
    );
    for (const s of [...direct]) {
      wsSend(s, frame);
      if (terminal) wsCloseSub(direct, runId, s);
    }
  }
  // Nothing ever publishes run_id "*" (the worker publishes real run
  // ids), so the estate fan-out never double-sends to its own set —
  // the guard keeps that invariant explicit.
  if (runId === "*") return;
  const estate: Set<Socket> | undefined = wsSubs.get("*");
  if (estate !== undefined && estate.size > 0) {
    const frame: Uint8Array = wsEncodeText(
      Buffer.from(wsFrameBytes(stampAllRuns(event, runId)), "utf8"),
    );
    for (const s of [...estate]) {
      wsSend(s, frame);
      if (terminal) wsCloseSub(estate, "*", s);
    }
  }
}

// Fiber-owned (include stroke 2026-09-08): import-time
// registration hit cross-module TDZ under concurrent loader
// import; unload unregisters (a dead socket set never publishes).

/** The upgrade door: handshake, auth, registry hydrate, then hold
 *  for live bus frames until a terminal run frame closes the socket
 *  or the client goes away. The hydrate is REGISTRY-ONLY
 *  (2540-2553): preview starts + P5 resurrected work answer their
 *  run frame (terminal runs append the stage patches); every other
 *  id answers unknown — exactly a restarted py gateway's posture.
 *  There is deliberately NO sidecar fallback here (_ws_starlette
 *  has none; the restore path belongs to the status door). The
 *  bare door answers hello (2533-2536). Terminal hydrates do NOT
 *  close (only a LIVE terminal event 2573-2577 closes — never the
 *  hydrate) — the socket holds. */
export function handleWsUpgrade(opts: WsUpgradeOpts): void {
  const { authToken, target, headers, socket } = opts;
  void opts.roots; // the hydrate is registry-only — roots serve no
  // run-specific read here (kept on the interface for the seam).
  const key: string = headers["sec-websocket-key"] ?? "";
  if (!wsAuthOk(headers, target, authToken)) {
    // uvicorn turns the pre-accept close into `403 Forbidden`,
    // empty body (probed raw 2026-09-07).
    try {
      socket.write(
        "HTTP/1.1 403 Forbidden\r\nConnection: close\r\n" +
          "Content-Length: 0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n",
      );
    } catch {
      /* gone */
    }
    try {
      socket.destroy();
    } catch {
      /* gone */
    }
    return;
  }
  if (!key) {
    try {
      socket.destroy();
    } catch {
      /* gone */
    }
    return;
  }
  try {
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\n" +
        "Connection: Upgrade\r\nSec-WebSocket-Accept: " +
        wsAccept(key) +
        "\r\n\r\n",
    );
  } catch {
    return;
  }
  // normalizePath twin: target.split("?")[0].rstrip("/") or "/".
  // The upgrade seam receives the raw target — decode %XX here
  // (uvicorn decodes before _ws_starlette runs).
  const bare: string = target.split("?")[0] ?? "";
  const normed: string = bare.replace(/\/+$/, "") || "/";
  let decodedPath: string = normed;
  try {
    decodedPath = decodeURIComponent(normed);
  } catch {
    decodedPath = normed;
  }
  // The path-form prefix matches the DECODED path; the run id
  // keeps the decoded text (route()'s (.+) group is decoded).
  const prefix = "/v1/flows/events/";
  let runId: string | null;
  if (decodedPath.startsWith(prefix)) {
    runId = decodedPath.slice(prefix.length);
  } else {
    runId = wsRunId(target, decodedPath);
  }
  if (runId === null || runId === "") {
    wsSend(socket, wsEncodeClose(1000));
    try {
      socket.end();
    } catch {
      /* gone */
    }
    return;
  }
  // P6 live bus (py 2514: subscribe before the hydrate snapshot, so
  // no worker frame published mid-upgrade is missed — this block runs
  // synchronously from the 101 write, so no publish interleaves).
  // The "close" listener is py's finally-unsubscribe (2584): every
  // exit road (client close, EOF, terminal close below, protocol
  // violation) releases the socket. subId freezes the narrowed id
  // for the data/close closures (runId is a reassignable let).
  const subId: string = runId;
  let owned: Set<Socket> | undefined = wsSubs.get(subId);
  if (owned === undefined) {
    owned = new Set();
    wsSubs.set(subId, owned);
  }
  owned.add(socket);
  socket.on("close", (): void => {
    wsUnsubscribe(subId, socket);
  });
  // Registry reads on the upgrade path resolve via the documented
  // ACTIVE handle (no Context reaches the socket upgrade — main.ts
  // calls this directly). Door listeners on the ctx bus pass ctx.runs
  // explicitly instead.
  if (runId === "*") {
    // The ALL_RUNS hello (2530-2536) carries the LIVE queue —
    // resurrected queued ids ride here after a P5 boot.
    const snap = queueSnapshot();
    wsSend(
      socket,
      wsEncodeText(
        Buffer.from(
          wsFrameBytes(
            helloFrame(
              snap.queued,
              snap.queued_ids,
              snap.active === "" ? null : snap.active,
            ),
          ),
          "utf8",
        ),
      ),
    );
  } else {
    // Hydrate (2540-2553): an OWNED id (preview starts, P5
    // resurrected work) answers its run frame — plus per-stage
    // patches when terminal; anything else is the unknown-run
    // answer (a restarted py gateway says exactly this for every
    // id it never owned; the sidecar fallback belongs to the
    // status door, never here).
    const owned = hydrateSnapshot(runId);
    if (owned === undefined) {
      wsSend(
        socket,
        wsEncodeText(Buffer.from(wsFrameBytes(runFrame("unknown")), "utf8")),
      );
    } else {
      wsSend(
        socket,
        wsEncodeText(
          Buffer.from(wsFrameBytes(runFrame(owned.status)), "utf8"),
        ),
      );
      if (
        owned.status === "completed" ||
        owned.status === "failed" ||
        owned.status === "stopped"
      ) {
        for (const st of owned.stages) {
          if (!isPlainObj(st)) continue;
          const rec = st as Record<string, unknown>;
          const sid: unknown = rec["id"];
          if (typeof sid !== "string") continue;
          wsSend(
            socket,
            wsEncodeText(
              Buffer.from(
                wsFrameBytes(
                  stageHydratePatch({
                    id: sid,
                    status: rec["status"],
                    progress: rec["progress"],
                    activity: rec["activity"],
                  }),
                ),
                "utf8",
              ),
            ),
          );
        }
      }
    }
  }
  // hold: reassemble fragments, answer pings, ignore payloads (the
  // _monitor_client posture — only the disconnect matters), echo
  // closes. Unmasked client frames violate RFC 6455 section 5.1:
  // close 1002.
  let stash: Uint8Array = Buffer.alloc(0);
  let frag: Uint8Array | null = null;
  socket.on("data", (chunk: Uint8Array): void => {
    let buf: Uint8Array = Buffer.concat([stash, Buffer.from(chunk)]);
    stash = Buffer.alloc(0);
    for (;;) {
      if (buf.length < 2) {
        stash = buf;
        return;
      }
      const b1: number = buf[0] as number;
      const b2: number = buf[1] as number;
      const fin: boolean = (b1 & 0x80) !== 0;
      const op: number = b1 & 0x0f;
      const masked: boolean = (b2 & 0x80) !== 0;
      let ln: number = b2 & 0x7f;
      let off = 2;
      if (ln === 126) {
        if (buf.length < 4) {
          stash = buf;
          return;
        }
        ln = ((buf[2] as number) << 8) | (buf[3] as number);
        off = 4;
      } else if (ln === 127) {
        if (buf.length < 10) {
          stash = buf;
          return;
        }
        const hi: number =
          ((buf[2] as number) * 16777216 +
            (buf[3] as number) * 65536 +
            (buf[4] as number) * 256 +
            (buf[5] as number)) *
          4294967296;
        const lo: number =
          (buf[6] as number) * 16777216 +
          (buf[7] as number) * 65536 +
          (buf[8] as number) * 256 +
          (buf[9] as number);
        ln = hi + lo;
        off = 10;
      }
      if (buf.length < off + (masked ? 4 : 0) + ln) {
        stash = buf;
        return;
      }
      if (!masked) {
        wsSend(socket, wsEncodeClose(1002));
        wsUnsubscribe(subId, socket);
        try {
          socket.end();
        } catch {
          /* gone */
        }
        return;
      }
      const mask: Uint8Array = buf.slice(off, off + 4);
      const payload: Uint8Array = buf.slice(off + 4, off + 4 + ln);
      for (let i = 0; i < payload.length; i++) {
        payload[i] = (payload[i] as number) ^ (mask[i % 4] as number);
      }
      buf = buf.slice(off + 4 + ln);
      if (op === 0x8) {
        // Close-echo posture: the client payload echoes VERBATIM
        // (empty stays 8800) — never a fixed 1000.
        wsSend(socket, wsEncodeCloseEcho(payload));
        wsUnsubscribe(subId, socket);
        try {
          socket.end();
        } catch {
          /* gone */
        }
        return;
      } else if (op === 0x9) {
        const size: number = payload.length < 126 ? payload.length : 126;
        const pong: Uint8Array = new Uint8Array(size + 2);
        pong[0] = 0x8a;
        pong[1] = size;
        pong.set(payload.slice(0, size), 2);
        wsSend(socket, pong);
      } else if (op === 0xa) {
        /* pong — nothing to do */
      } else if (op === 0x1 || op === 0x2) {
        frag = fin ? null : payload;
      } else if (op === 0x0) {
        const joined: Uint8Array = Buffer.concat([
          frag ?? Buffer.alloc(0),
          payload,
        ]);
        frag = fin ? null : joined;
      }
      if (buf.length === 0) return;
    }
  });
  socket.on("error", (): void => {
    /* client went away */
  });
}

/** The flows status door (_h_flows_status) as a self-registering
 *  plugin: live-first → sidecar-second (py status() 2954-2981: live
 *  registry rows first, sidecar_status fallback, else unknown
 *  run_id) — a live miss falls through to the sidecar; only a
 *  sidecar miss returns the 404 unknown-run shape. Lives here (not
 *  flowsRun.ts) because the sidecar read is runs-owned and runs.ts
 *  already imports the flows side — the reverse edge would cycle.
 *  The live read rides ctx.runs. Matches its own row inside the
 *  listener — no central table. */
export const flowsStatusDoors: Plugin = {
  name: "gateway-flows-status",
  inject: ["gatewayError", "runs"],
  apply(ctx: Context): void {
    ctx.on(
      "gateway/request",
      (req: GatewayRequest): DispatchResult | undefined => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null || hit.row.handler !== "_h_flows_status") {
          return undefined;
        }
        const errors = ctx.gatewayError;
        const runId: string =
          hit.m !== null && hit.m[1] !== undefined
            ? String(hit.m[1])
            : "";
        // parse_qs parity (urllib drops blank values): first
        // NON-BLANK wins — ?include_log=&include_log=1 is ["1"] on
        // py, so [0] here (which keeps "") diverges. Same filter as
        // runs.ts firstQuery, inline (one call site).
        const includeLog: boolean = parseIncludeLog(
          (parseQuery(req.target)["include_log"] ?? []).find(
            (v: string): boolean => v !== "",
          ) ?? null,
        );
        const live: {
          status: number;
          payload: Record<string, unknown>;
        } = handleFlowsStatus(runId, includeLog, ctx.runs);
        if (live.status !== 404) {
          errors.normalize4xx(live.status, live.payload);
          return {
            status: live.status,
            body: errors.serializePy(live.payload),
            contentType: "application/json",
            headers: {},
          };
        }
        // Live miss: the sidecar second (py's order — a restarted
        // process serves runs it never owned from _flow.json).
        const stored: Record<string, unknown> | null = sidecarStatus(
          runId,
          req.roots,
          includeLog,
        );
        if (stored !== null) {
          // dumpsPy, NOT serializePy: the restored object carries
          // parseJson PyNum literals (verbatim sidecar numbers) and
          // only dumpsPy emits them (runs lane).
          return {
            status: 200,
            body: dumpsPy(stored),
            contentType: "application/json",
            headers: {},
          };
        }
        errors.normalize4xx(live.status, live.payload);
        return {
          status: live.status,
          body: errors.serializePy(live.payload),
          contentType: "application/json",
          headers: {},
        };
      },
    );
  },
};

/** The runs-lane read doors (queue snapshot, run history, one run,
 *  and the non-upgrade WS fallback) as a self-registering plugin:
 *  AssetResult bodies ride pre-serialized (dumpsPy at the door, 4xx
 *  codes inline) — passed through untouched. The queue snapshot reads
 *  through ctx.runs; the live-bus deliver fn registers into the
 *  service (fiber-owned: unload unregisters). Matches its own rows
 *  inside the listener — no central table. */
export const runsDoors: Plugin = {
  name: "gateway-runs",
  inject: ["runs"],
  apply(ctx: Context): () => void {
    const svc: RunsService = ctx.runs;
    svc.setBusPublisher(deliverBusFrame);
    ctx.on(
      "gateway/request",
      (req: GatewayRequest): DispatchResult | undefined => {
        const hit = matchRoute(req.method, req.path);
        if (hit === null) return undefined;
        if (hit.row.handler === "_h_queue") {
          return hQueue(ctx.runs);
        }
        if (hit.row.handler === "_h_runs_list") {
          return hRunsList(parseQuery(req.target), req.roots);
        }
        if (hit.row.handler === "_h_run_detail") {
          const runId: string =
            hit.m !== null && hit.m[1] !== undefined
              ? String(hit.m[1])
              : "";
          return hRunDetail(runId, req.roots);
        }
        if (hit.row.handler === "_h_ws_fallback") {
          return wsFallback404(req.method, req.path);
        }
        return undefined;
      },
    );
    return (): void => {
      svc.setBusPublisher(null);
    };
  },
};
