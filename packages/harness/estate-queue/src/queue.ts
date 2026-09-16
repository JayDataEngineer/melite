// queue.ts — P5 queue-core port (the serial-GPU state machine).
//
// WHAT THIS PORTS (line-cited against python/gateway.py; Date 2026-09-07,
// Status: landed — wall tests/walls/suites/test_gateway_queue_parity.py):
//   - single-writer lock (R2, 2026-09-06): acquireLock/releaseLock +
//     the dead-pid steal ledgered server.lock_stolen (4405-4468),
//     the pid-0 probe (4469-4479), the REFUSING line main() prints
//     before any boot side effect (4474-4480).
//   - enqueue/dequeue ordering: Gateway.order append + the worker's
//     head-pop under the serial guard (1342, 1353-1360). PRIORITIES:
//     py has none — grep finds no "priority" anywhere in gateway.py
//     or flow.py; order.append + pop(0) is the whole discipline. A
//     `priority` body key is in neither RETIRED set, so py IGNORES
//     it (202, FIFO) — this core takes no priority anywhere and the
//     wall pins a priority-carrying body landing FIFO.
//   - the submit pre-registration refusal chain (submit 1179-1260 +
//     _strict_body 248-276 + resolve_request doors 279-335): envelope
//     order body -> test -> draft required/malformed/unknown ->
//     strict knobs/carry -> door ambiguity/exclusivity, every text
//     byte-identical (the R4.2 envelope: error verbatim + code +
//     loc/expected/got only when set, 114-155).
//   - stop/resume/reproduce refusals (stop 2040-2057, resume
//     1913-1987, reproduce 1989-2038) byte-identical.
//   - the worker's portable policy: 50 ms poll + serial-active guard
//     (1353-1360), the terminal mapping (stopped iff the stop flag
//     is set else completed/failed, "<Type>: <msg>" error,
//     1366-1371), the terminal broadcast frame (1413-1414), the
//     settled-row eviction (completed/failed past 500, oldest
//     created_at first, queued/running/stopped never touched,
//     1137-1151), the worker outliving failures (RESILIENCE LAW).
//   - R3.3 retry rows (1727-1780 + _note_stage_retry 1906-1911):
//     max_extra from the node row (retries 0..5, flow.py:194),
//     budget from timeout_s (the RUNNER's budget), stop NEVER
//     retries, every retry ledgered run.stage_retry + stamped
//     retries_used/retry_last_error. Range 0..5 enforced where the
//     row is built (flow.py) — the core reads it, like py.
//   - persistence/journal shapes: LEDGER_PATH output/_ledger.jsonl +
//     the append-only line `{"ts":%d,"event":"%s","data":%s}`
//     close-per-line that never throws (2241-2250), atomic_write
//     tmp+rename indent-2 (2472-2475), the sidecar document key
//     order + the json.dumps(error)[:20000]-when-set quirk
//     (sidecar 2124-2169), _request.json verbatim, boot_resurrect
//     FIFO-by-created_at + CARD-BIRTH orphan skip (2338-2376),
//     boot_sweep + the read-time sweep texts (2378-2470,
//     sweep_sidecar 2253-2291).
//   - the _rebuild_run_from_record value rules (2294-2336),
//     probed battery-complete 2026-09-07 (/tmp/probe_full2.py,
//     /tmp/probe_edge2.py, /tmp/probe_edge3.py): falsy graphs
//     rebuild rowless; NodeRow mistypes orphan (ints/bools for
//     id, non-string map values, blank refs, dup ids; expected/
//     card/retries/timeout_s/description/extras never reach _NR);
//     stages/skipped ride list(x or []) verbatim (strings to
//     chars, dicts to keys, 5/True raise-to-skip); artifacts ride
//     [str(a) for a if a] with py spellings; created_at rides
//     float(x or 0.0) with garbage coerced to 0 (py's candidate
//     float() kills the whole boot on garbage — non-ported by
//     design, the core boots where py cannot); _request.json needs
//     only to parse (Run is a plain dataclass).
//   - live-serve normalization: files keep literals in memory via
//     parseJson; PyNum.toJSON normalizes at every JSON.stringify
//     path (ROW 29 STAGE 2 — toPlainJson retired 2026-09-10, zero
//     callers, subsumed).
//   - the queue snapshot key order (queued/running/active/
//     queued_ids, _h_queue 2893-2900) + queue_position (index or 0,
//     _h_flows_status 2973-2975).
//
// WHAT STAYS PY-OWNED (documented gaps, never silent):
//   - engine execution (compose/transport) + the merged/per-stage
//     dispatch: the worker loop here takes an injected execute()
//     (mirrors py worker-vs-execute split); doors/flowsRun.ts keeps
//     its own pump until the doors migrate onto this core.
//   - cost_preview / recent / metrics rings (R4.3): observability,
//     not queue discipline — a later stroke.
//   - the WS bus (publish/subscribe frames): WS ports absolute last
//     per the ladder P6; the terminal-frame SHAPE is pinned here as
//     data (terminalFrame) so the bus port inherits it.
//
// SERIAL-GPU LAW: one active run per process (the active guard) and
// one writer process per state root (the lock file). The lock holds
// for the process lifetime (released pid-checked on clean shutdown);
// the worker is the only popper (single-writer under one loop).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import { randomBytes } from "node:crypto";
import type { Context } from "@deepseek-ai/cordis";
// Type-only edge to the Timer plugin: applies its Context
// augmentation (ctx.interval/ctx.timeout) with no runtime import,
// so the wall's bare node -e import of this module stays light.
import type { TimerService } from "@deepseek-ai/cordis-plugin-timer";
import {
  appendFileSync,
  mkdirSync,
  openSync,

  readFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  writeSync,
  closeSync,
} from "node:fs";
import { join } from "node:path";
import { pyReprStr, pyReprStrList } from "@melite/comfyui-cordis";
import { asciiEscape } from "./pyAscii.ts";

// ── constants (py cites inline) ──────────────────────────────────

/** Lock file name under STATE_ROOT (acquire_lock 4416). */
export const LOCK_NAME: string = "gateway.lock";

/** Worker poll cadence (worker 1354: asyncio.sleep(0.05)). */

/** Registry bound (MAX_SETTLED_RUNS 2187: settled completed/failed
 *  rows past 500 leave; the sidecar stays SSOT). */
export const MAX_SETTLED_RUNS: number = 500;

/** Stage retries range (flow.py:194: retries 0..5). */
export const RETRIES_MAX: number = 5;

/** The stderr line main() prints before SystemExit(1) (4476-4480).
 *  NOTE the em-dash — byte-identical, the contention wall pins it. */
export function refuseStartLine(note: string): string {
  return (
    "[gateway] REFUSING TO START: " + note + " — one writer per state root"
  );
}

// ── roots (STATE_ROOT/OUT_ROOT/TEST_OUT_ROOT, gateway.py 76-85) ───

/** State root — MELITE_STATE_ROOT else <repo>/data/runs. */
export function resolveStateRoot(repoRoot: string): string {
  const override: string = process.env["MELITE_STATE_ROOT"] ?? "";
  if (override !== "") return override;
  return join(repoRoot, "data", "runs");
}

/** Run-dir root — TEST_OUT_ROOT on test:true else OUT_ROOT (L3). */
export function outRootFor(stateRoot: string, testFlag: boolean): string {
  return join(stateRoot, testFlag ? "test-output" : "output");
}

/** Append-only journal path (LEDGER_PATH 2180: OUT_ROOT/_ledger). */
export function ledgerPathFor(stateRoot: string): string {
  return join(stateRoot, "output", "_ledger.jsonl");
}

/** Lock path (acquire_lock 4416: STATE_ROOT/gateway.lock). */
export function lockPathFor(stateRoot: string): string {
  return join(stateRoot, LOCK_NAME);
}

// ── single-writer lock (4405-4468) ───────────────────────────────

export interface LockResult {
  readonly ok: boolean;
  readonly note: string;
}

/** Signal-0 probe (py _pid_alive 4469-4479: ESRCH-dead false, EPERM
 *  still ALIVE — the whole point of the guard). */
export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (exc: unknown) {
    // (process.kill throws SystemErrors — always objects with .code.)
    const code: string = String((exc as { code?: unknown }).code);
    /* v8 ignore next -- signal-0 probing a foreign-owned pid refuses
       EPERM (alive): untestable in this fiber (no foreign pids here),
       kept as the guard's contract (2026-09-12) */
    if (code === "EPERM" || code === "EACCES") return true;
    return false;
  }
}

function writePidFile(lockPath: string, pid: number): boolean {
  let fd: number = -1;
  try {
    fd = openSync(lockPath, "wx", 0o644);
  } catch {
    return false;
  }
  try {
    writeSync(fd, String(pid));
  /* v8 ignore start -- a fresh lock-file write never fails in practice
     (disk-full class, unfaultable here): the abort never fires (2026-09-12) */
  } catch {
    try {
      closeSync(fd);
    } catch {
      /* gone */
    }
    return false;
  /* v8 ignore stop */
  }
  try {
    closeSync(fd);
  } catch {
    /* closed */
  }
  return true;
}

/** R2 single-writer (4405-4448): O_CREAT|O_EXCL acquire; on
 *  collision the holder pid decides — alive refuses loud (the
 *  caller exits before any boot side effect), dead-or-garbage
 *  steals (unlink + re-acquire, ledgered server.lock_stolen). */
export function acquireLock(
  stateRoot: string,
  pid: number = process.pid,
  nowS: number = Math.floor(Date.now() / 1000),
): LockResult {
  const lockPath: string = lockPathFor(stateRoot);
  mkdirSync(stateRoot, { recursive: true });
  if (writePidFile(lockPath, pid)) return { ok: true, note: "acquired" };
  let holder: string = "";
  try {
    holder = readFileSync(lockPath, "utf8").trim();
  } catch {
    holder = "";
  }
  let hpid: number = -1;
  const parsed: number = Number(holder);
  if (holder !== "" && Number.isInteger(parsed)) hpid = parsed;
  if (hpid > 0 && isPidAlive(hpid)) {
    return { ok: false, note: "gateway.lock held by live pid " + hpid };
  }
  try {
    unlinkSync(lockPath);
  } catch {
    /* already gone */
  }
  appendLedger(stateRoot, "server.lock_stolen", { stale_pid: hpid }, nowS);
  if (writePidFile(lockPath, pid)) {
    return { ok: true, note: "stolen from dead pid " + hpid };
  }
  return { ok: false, note: "lock steal failed: " + lockPath };
}

/** PID-CHECKED release (release_lock 4450-4468): a boot that never
 *  owned the lock frees only its OWN, never the live holder's (the
 *  watcher-storm lesson — a blind unlink let each retry steal +
 *  boot-sweep LIVE runs). */
export function releaseLock(
  stateRoot: string,
  pid: number = process.pid,
): boolean {
  const lockPath: string = lockPathFor(stateRoot);
  let holder: string = "";
  try {
    holder = readFileSync(lockPath, "utf8").trim();
  } catch {
    return false;
  }
  if (holder !== String(pid)) return false;
  try {
    unlinkSync(lockPath);
  } catch {
    return false;
  }
  return true;
}

/** Pre-boot gate (main 4474-4480): acquire BEFORE any boot side
 *  effect — resurrection, sweep, worker, listen. A second writer
 *  exits here, loud, having touched nothing (but the steal ledger
 *  row, when it stole from the dead). */
export function bootGate(
  stateRoot: string,
  pid: number = process.pid,
): LockResult {
  return acquireLock(stateRoot, pid);
}

// ── journal + atomic write (2241-2250, 2472-2475) ────────────────
// asciiEscape lives in ./pyAscii.ts (ROW 29 STAGE 2 heritage: the
// one shared address for journal/sidecar/serve writers).

/** Journal data writer, ROW 29 STAGE 1 (2026-09-10, ledger): canonical
 *  JSON separators + ensure_ascii. The py spaced separators
 *  (json.dumps ", "/": ") are gone — py is dead, no reader needs
 *  them (JSONL readers parse; operators grep whitespace-tolerant);
 *  ensure_ascii STAYS (byte-safe journal for non-UTF-8-unaware
 *  tailers). STAGE 2: PyNum instances serialize NUMERIC here via
 *  toJSON (the latent {"literal"} object-ify is gone with it). */
export function dumpsLedgerData(data: Record<string, unknown>): string {
  // (data is a dict — JSON.stringify never yields undefined here.)
  return asciiEscape(JSON.stringify(data));
}

/** Append-only activity journal (ledger 2241-2250): one JSON object
 *  per line, close-per-line (durable), mkdir-parents, NEVER throws
 *  (the journal must never take the gateway down). Line shape:
 *  {"ts":%d,"event":"%s","data":%s} — compact envelope, spaced
 *  data (json.dumps(data or {}, default=str)). */
export function appendLedger(
  stateRoot: string,
  event: string,
  data: Record<string, unknown> | null = null,
  nowS: number = Math.floor(Date.now() / 1000),
): void {
  try {
    const outRoot: string = join(stateRoot, "output");
    mkdirSync(outRoot, { recursive: true });
    appendFileSync(
      join(outRoot, "_ledger.jsonl"),
      '{"ts":' +
        nowS +
        ',"event":' +
        JSON.stringify(event) +
        ',"data":' +
        dumpsLedgerData(data ?? {}) +
        "}\n",
      "utf8",
    );
  } catch {
    /* the journal must never take the gateway down */
  }
}

/** atomic_write (2472-2475): tmp + os.replace rename, indent-2.
 *  One JSON text class cannot round-trip: integral floats (py
 *  writes 100.0, JS writes 100 — same double, different spelling).
 *  The walls pin ints for byte legs; values always compare equal. */
export function atomicWriteJson(filePath: string, obj: unknown): void {
  const text: string = asciiEscape(JSON.stringify(obj, null, 2) ?? "null");
  writeFileSync(filePath + ".tmp", text, "utf8");
  renameSync(filePath + ".tmp", filePath);
}

// ── refusal envelope (R4.2: 114-155) ─────────────────────────────

export interface QueueRefusal {
  readonly status: number;
  readonly payload: Record<string, unknown>;
}

export function refusal(
  status: number,
  error: string,
  code: string,
  loc?: string,
  expected?: string,
  got?: string,
): QueueRefusal {
  const payload: Record<string, unknown> = { error, code };
  if (loc !== undefined) payload["loc"] = loc;
  if (expected !== undefined) payload["expected"] = expected;
  if (got !== undefined) payload["got"] = got;
  return { status, payload };
}

/** Python type(body).__name__ for the got fields. */
export function pyTypeName(v: unknown): string {
  if (v === null) return "NoneType";
  if (typeof v === "string") return "str";
  if (typeof v === "boolean") return "bool";
  if (typeof v === "number") return Number.isInteger(v) ? "int" : "float";
  if (Array.isArray(v)) return "list";
  if (typeof v === "object") return "dict";
  return "unknown";
}

/** Python %r for short scalars (the test-flag text). Objects take
 *  the str() road — bodies reaching here are scalars in practice. */
export function pyRepr(v: unknown): string {
  if (typeof v === "string") return pyReprStr(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (v === null || v === undefined) return "null";
  return String(v);
}

/** editor_runs.draft_id_ok (<=96, [A-Za-z0-9_-]; the TS doors carry
 *  their own copy — this core re-checks nothing, it BUILDS the
 *  refusal for a caller-computed verdict... no: the check is one
 *  regex, owned here so envelope validation is whole. Callers pass
 *  the raw draft_id; the malformed/unknown split needs the
 *  existence probe too — see validateSubmitEnvelope.)
 *
 * DEDUP (2026-09-10, ledger row 27): draftIdOk + the three vocab
 * sets below had parallel copies in gateway-core params.ts and
 * here — drift failed nowhere. The SSOT is core's params.ts
 * ("One list now" — its header already claimed it); queue re-exports
 * for barrel consumers. */
export { draftIdOk } from "@melite/estate-drafts";

// ── the submit pre-registration chain (1179-1260) ────────────────

// Vocab SSOT (ledger row 27, 2026-09-10): the retired-knob /
// carry-key / door-key sets live ONCE in ./vocab.ts;
// these re-exports keep the @melite/gateway-queue barrel stable.
export {
  RETIRED_RUNNER_KNOBS,
  RETIRED_CARRY_KEYS,
  DOOR_KEYS,
} from "./vocab.ts";
import {
  RETIRED_RUNNER_KNOBS,
  RETIRED_CARRY_KEYS,
  DOOR_KEYS,
} from "./vocab.ts";
import { draftIdOk } from "@melite/estate-drafts";

/** The strict-body gate (_strict_body 248-276). */
export function strictBodyCheck(
  body: Record<string, unknown>,
): QueueRefusal | null {
  const bad: string[] = Object.keys(body)
    .filter(
      (k: string): boolean =>
        RETIRED_RUNNER_KNOBS.includes(k) ||
        (k.startsWith("_") && !DOOR_KEYS.includes(k)),
    )
    .sort();
  if (bad.length > 0) {
    return refusal(
      400,
      "request body carries retired runner knob(s) " +
        pyReprStrList(bad) +
        " — the runner never reads these (silent-drop class); remove them",
      "invalid_request",
    );
  }
  const carry: string[] = Object.keys(body)
    .filter((k: string): boolean => RETIRED_CARRY_KEYS.includes(k))
    .sort();
  if (carry.length > 0) {
    return refusal(
      400,
      "request body carries retired pipe-carry key(s) " +
        pyReprStrList(carry) +
        " — the 2026-08-10 stowaway wire: no gateway ever " +
        "stashed it (flow_doc was never emitted). The revive " +
        "rail is the draft (draft_id) + the run registry; card " +
        "bodies carry params only",
      "invalid_request",
    );
  }
  return null;
}

/** Door-selection order (resolve_request 302: flow/flow_inline/
 *  model fixed order — ambiguity lists in DOOR order, not sorted). */
export const SUBMIT_DOORS: readonly string[] = [
  "flow",
  "flow_inline",
  "model",
];

/** The whole pre-registration chain in py order: non-object body
 *  (bad_envelope/body) -> non-bool test (bad_envelope/test) ->
 *  draft required (draft_required) -> malformed (draft_malformed)
 *  -> unknown doc (draft_unknown) -> strict knobs/carry ->
 *  ambiguity (verbatim) -> no-door. draftExists is the caller's
 *  `drafts/<id>.json is_file` probe (existence is I/O — the core
 *  owns the TEXT, the door owns the fs). Returns null when the
 *  envelope may proceed to graph resolution. */
export function validateSubmitEnvelope(
  doc: unknown,
  draftExists: (draftId: string) => boolean,
): QueueRefusal | null {
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    return refusal(
      400,
      "request body must be a JSON object",
      "bad_envelope",
      "body",
      "object",
      pyTypeName(doc),
    );
  }
  const body = doc as Record<string, unknown>;
  const testFlag: unknown = body["test"] ?? false;
  if (typeof testFlag !== "boolean") {
    return refusal(
      400,
      "test flag must be a boolean (got " +
        pyTypeName(testFlag) +
        " " +
        pyRepr(testFlag) +
        ")",
      "bad_envelope",
      "test",
      "boolean",
      pyTypeName(testFlag),
    );
  }
  const draftId: unknown = body["draft_id"];
  if (typeof draftId !== "string" || draftId === "") {
    return refusal(
      400,
      "draft_id is required — every run is born from an " +
        "action card (CARD BIRTH LAW); compose the card first: " +
        "POST /v1/flows/drafts, then start with its draft_id " +
        "(docs/cards/draft-door.md)",
      "draft_required",
      "draft_id",
      "doc-backed draft id",
      "absent",
    );
  }
  if (!draftIdOk(draftId)) {
    return refusal(
      400,
      "draft_id malformed (96 char cap, [A-Za-z0-9_-] only): " +
        pyReprStr(draftId),
      "draft_malformed",
      "draft_id",
      "[A-Za-z0-9_-]{1,96}",
      draftId.slice(0, 60),
    );
  }
  if (!draftExists(draftId)) {
    return refusal(
      400,
      "unknown draft_id " +
        pyReprStr(draftId) +
        " — no card doc at drafts/" +
        draftId +
        ".json; compose the card first: POST /v1/flows/drafts",
      "draft_unknown",
      "draft_id",
      "existing card doc",
      draftId.slice(0, 60),
    );
  }
  const strict: QueueRefusal | null = strictBodyCheck(body);
  if (strict !== null) return strict;
  const doors: string[] = SUBMIT_DOORS.filter((k: string): boolean =>
    Object.prototype.hasOwnProperty.call(body, k),
  );
  if (doors.length > 1) {
    return refusal(
      400,
      "ambiguous request: names " +
        pyReprStrList(doors) +
        " — provide exactly one of flow, flow_inline, model",
      "invalid_request",
    );
  }
  if (doors.length === 0) {
    return refusal(
      400,
      "no flow selected: provide flow, flow_inline or model",
      "invalid_request",
    );
  }
  return null;
}

// ── stop / resume / reproduce refusals ───────────────────────────

export type LifecycleState =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stopped"
  | "stopping";

/** stop, unknown run (Gateway.stop 2042-2045). */
export function refuseUnknownStop(runId: string): QueueRefusal {
  return refusal(
    400,
    "unknown run_id " + pyReprStr(runId),
    "run_unknown",
    "run_id",
  );
}

/** stop, settled run (2046-2047): 200 with error ONLY (no code —
 *  the dispatcher normalizes 4xx alone, and this is a 200). */
export function refuseTerminalStop(state: string): QueueRefusal {
  return {
    status: 200,
    payload: { error: "cannot stop run in state " + state },
  };
}

/** resume, live run (resume 1919-1925). */
export function refuseLiveResume(
  runId: string,
  liveStatus: string,
): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " is still " + liveStatus + " — stop it before resuming",
    "run_live",
    "run_id",
    "failed|stopped",
    liveStatus,
  );
}

/** resume/reproduce, no durable record (1930-1932 / 2011-2014). */
export function refuseNoDurableRecord(runId: string): QueueRefusal {
  return refusal(
    400,
    "no durable record for run " + pyReprStr(runId),
    "run_unknown",
    "run_id",
  );
}

/** resume, completed run (1936-1939). */
export function refuseCompletedResume(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " completed — nothing to resume",
    "run_completed",
    "run_id",
    "failed|stopped",
    "completed",
  );
}

/** resume, neither failed nor stopped (1940-1946). */
export function refuseUnresumable(runId: string, status: string): QueueRefusal {
  const got: string = status === "" ? "unknown" : status;
  return refusal(
    400,
    "run " + runId + " is " + pyReprStr(got) + " — resume needs failed or stopped",
    "run_not_resumable",
    "run_id",
    "failed|stopped",
    got,
  );
}

/** resume, draft gone or half-written (1949-1953). */
export function refuseUnusableRecord(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " +
      runId +
      " record is unusable (draft doc gone or half-written) — resubmit instead",
    "run_record_unusable",
    "run_id",
  );
}

/** reproduce, live run (2002-2007). */
export function refuseLiveReproduce(
  runId: string,
  liveStatus: string,
): QueueRefusal {
  return refusal(
    400,
    "run " +
      runId +
      " is still " +
      liveStatus +
      " — wait for it to settle or stop it first",
    "run_live",
    "run_id",
    "completed|failed|stopped",
    liveStatus,
  );
}

/** reproduce, cardless legacy row (2015-2020). */
export function refuseCardlessReplay(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " +
      runId +
      " is a cardless legacy row (no draft_id) — compose a fresh card to replay it",
    "run_cardless",
    "draft_id",
    "doc-backed draft id",
    "absent",
  );
}

/** reproduce, request body missing (2024-2029). */
export function refuseMissingRequest(runId: string): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " has no recorded request body — cannot replay",
    "run_record_unusable",
    "run_id",
  );
}

/** reproduce, request non-object (2030-2034). */
export function refuseNonObjectRequest(
  runId: string,
  gotType: string,
): QueueRefusal {
  return refusal(
    400,
    "run " + runId + " recorded a non-object request body",
    "run_record_unusable",
    "run_id",
    "object",
    gotType,
  );
}

// ── the registry (Gateway.__init__ 1066-1071 + serial law) ───────

export interface QueueRunRow {
  runId: string;
  status: LifecycleState;
  /** Terminal failure text ("<Type>: <msg>") — "" until failed. */
  error: string;
  createdAt: number;
  draftId: string;
  testFlag: boolean;
  stopFlag: boolean;
}

/** The serial-GPU registry: runs + submission-order list + the one
 *  active run. The worker is the only popper (single-writer under
 *  one loop); submission order is append order (strict FIFO — no
 *  priority lane exists, see the header). */
export class QueueCore {
  readonly runs: Map<string, QueueRunRow> = new Map();
  readonly order: string[] = [];
  activeId: string | null = null;
  readonly bootAt: number = Date.now() / 1000;

  /** Registration tail (submit 1341-1342): the run row joins the
   *  registry, its id appends the order list. Returns the queue
   *  position (append index). */
  enqueue(run: QueueRunRow): number {
    this.runs.set(run.runId, run);
    this.order.push(run.runId);
    return this.order.length - 1;
  }

  /** The worker's claim (worker 1356-1360): while active is set the
   *  next pop BLOCKS (one GPU run machine-wide); else the head
   *  leaves the order list and becomes active. Null = idle. A ghost
   *  id at the head (row swept mid-queue — resurrect, bootSweep) is
   *  SKIPPED, not treated as idle: returning null on a consumed
   *  ghost made the pump read a NON-empty queue as idle and strand
   *  every run behind the ghost until a later kick (audit R8,
   *  stroke 82). */
  tryDequeue(): QueueRunRow | null {
    if (this.activeId !== null) return null;
    while (this.order.length > 0) {
      const runId = this.order.shift() as string;
      const run: QueueRunRow | undefined = this.runs.get(runId);
      if (run === undefined) continue;
      run.status = "running";
      this.activeId = runId;
      return run;
    }
    return null;
  }

  /** Release the active claim (worker finally: active null). */
  releaseActive(): void {
    this.activeId = null;
  }

  /** Terminal mapping (worker 1366-1371): stopped iff the stop flag
   *  is set, else completed on success / failed on exception with
   *  the "<Type>: <msg>" error. Returns the settled status. */
  settleRun(run: QueueRunRow, failureText: string | null): LifecycleState {
    if (run.stopFlag) {
      run.status = "stopped";
      return run.status;
    }
    if (failureText === null) {
      run.status = "completed";
      return run.status;
    }
    run.status = "failed";
    run.error = failureText;
    return run.status;
  }

  /** queue_position (status door 2973-2975): order index, else 0
   *  (active/finished runs read 0). */
  queuePosition(runId: string): number {
    const i: number = this.order.indexOf(runId);
    return i < 0 ? 0 : i;
  }

  /** The queue snapshot (_h_queue 2893-2900): key order as py. */
  snapshot(): {
    queued: number;
    running: number;
    active: string;
    queued_ids: string[];
  } {
    return {
      queued: this.order.length,
      running: this.activeId !== null ? 1 : 0,
      active: this.activeId ?? "",
      queued_ids: [...this.order],
    };
  }

  /** Settled-row eviction (_evict_settled 1137-1151): settled ==
   *  completed|failed ONLY (stopped rows stay — a deliberate stop
   *  is a live receipt, not garbage); past 500 the oldest
   *  created_at leaves first. Returns evicted ids. */
  evictSettled(): string[] {
    const settled: QueueRunRow[] = [...this.runs.values()].filter(
      (r: QueueRunRow): boolean =>
        r.status === "completed" || r.status === "failed",
    );
    const excess: number = settled.length - MAX_SETTLED_RUNS;
    if (excess <= 0) return [];
    settled.sort((a: QueueRunRow, b: QueueRunRow): number =>
      a.createdAt - b.createdAt === 0
        ? (a.runId < b.runId ? -1 : 1)
        : a.createdAt - b.createdAt,
    );
    const evicted: string[] = [];
    for (const r of settled.slice(0, excess)) {
      this.runs.delete(r.runId);
      evicted.push(r.runId);
    }
    return evicted;
  }
}

/** run-<12hex>-<8hex> ids (submit 1267: uuid4 hex + time-ms low 32). */
export function newRunId(): string {
  const rand: string = randomBytes(6).toString("hex");
  const ts: string = ((Date.now() & 0xffffffff) >>> 0)
    .toString(16)
    .padStart(8, "0");
  return "run-" + rand + "-" + ts;
}

/** The terminal broadcast frame (worker 1413-1414): every
 *  subscriber gets the final status exactly once. Shape pinned
 *  here so the P6 bus port inherits it. */
export function terminalFrame(status: LifecycleState): Record<string, string> {
  return { type: "run", status };
}

// ── R3.3 retry policy (1727-1780, _note_stage_retry 1906-1911) ───

export interface RetryAsk {
  readonly attempt: number;
  readonly maxExtra: number;
  readonly stopSet: boolean;
}

export interface RetryNote {
  /** The stage-row stamp (retries_used + retry_last_error). */
  readonly stagePatch: { retries_used: number; retry_last_error: string };
  /** The durable row: ledger("run.stage_retry", ...). */
  readonly ledgerEvent: string;
  readonly ledgerData: {
    run_id: string;
    stage: string;
    attempt: number;
    error: string;
  };
  /** The live row: publish(run_id, stage/…/retry). Key order as py. */
  readonly busFrame: {
    type: string;
    stage: string;
    index: number;
    retry: number;
  };
}

/** Continue-or-raise (1753-1780): a failed attempt re-runs while
 *  attempts remain AND no stop landed; a deliberate STOP never
 *  retries (both the exception arm 1754 and the error-dict arm
 *  1775-1778 gate on the stop flag). */
export function shouldRetry(ask: RetryAsk): boolean {
  return ask.attempt < ask.maxExtra && !ask.stopSet;
}

/** One documented retry (1906-1911): sidecar row + events bus +
 *  ledger — never a silent re-run. */
export function noteStageRetry(
  runId: string,
  stageId: string,
  stageIndex: number,
  attempt: number,
  why: string,
): RetryNote {
  return {
    stagePatch: { retries_used: attempt, retry_last_error: why },
    ledgerEvent: "run.stage_retry",
    ledgerData: { run_id: runId, stage: stageId, attempt, error: why },
    busFrame: { type: "stage", stage: stageId, index: stageIndex, retry: attempt },
  };
}

// ── sidecar document (sidecar 2124-2169) ──────────────────────────

export interface GraphRow {
  readonly id: string;
  readonly type: string;
  readonly input_from: readonly string[];
  readonly input_names: Record<string, unknown>;
  readonly outputs: Record<string, unknown>;
  readonly params: Record<string, unknown>;
}

export interface SidecarStage {
  readonly id: string;
  readonly name: string;
  readonly index: number;
  readonly status: string;
  readonly outputs: Record<string, unknown>;
  readonly expected: Record<string, unknown>;
}

/** The sidecar document: KEY ORDER as py (run_id, status, error,
 *  stages, skipped_stages, artifacts, created_at, test, draft_id,
 *  pipeline, graph). error rides json.dumps(run.error)[:20000] when
 *  set (a JSON-quoted string — the writer quirk, mirrored, never
 *  "fixed"), else "". */
export function sidecarDoc(args: {
  runId: string;
  status: string;
  error: string;
  stages: SidecarStage[];
  skippedStages: string[];
  artifacts: string[];
  createdAt: number;
  testFlag: boolean;
  draftId: string;
  pipeline: string;
  graph: GraphRow[];
  /** THE SNAPSHOT KEYS (strokes 45/45d, carried stroke 48): the exact
   *  card + bench that ran. Absent when unstamped (inline runs) —
   *  the pinned py-parity prefix above never shifts. */
  cardSnapshot?: unknown;
  benchSnapshot?: unknown;
}): Record<string, unknown> {
  return {
    // IDENTITY KEYS FIRST (stroke 82): buildRunCard and the listRuns
    // scan slice(0, 8191) the sidecar — with stages/error/graph in
    // the prefix, any bulky payload pushed created_at/draft_id/
    // pipeline past the window and the row listed as a zombie
    // (empty pipeline, draft cleared, created 0). The scalars ride
    // ahead of every payload; a big error or graph can only
    // truncate what follows it.
    run_id: args.runId,
    status: args.status,
    created_at: args.createdAt,
    test: args.testFlag,
    draft_id: args.draftId,
    pipeline: args.pipeline,
    error:
      args.error !== "" ? JSON.stringify(args.error).slice(0, 20000) : "",
    stages: args.stages,
    skipped_stages: [...args.skippedStages],
    artifacts: [...args.artifacts],
    graph: args.graph,
    ...(args.cardSnapshot !== undefined ? { card_snapshot: args.cardSnapshot } : {}),
    ...(args.benchSnapshot !== undefined ? { bench_snapshot: args.benchSnapshot } : {}),
  };
}

/** The door name the run started with (_pipeline_of 2111-2119:
 *  exactly one of flow | flow_inline | model — the sidecar's
 *  `pipeline` and the queued ledger row share this one truth). */
export function pipelineOf(request: {
  flow?: unknown;
  model?: unknown;
  flow_inline?: unknown;
}): string {
  if (typeof request.flow === "string" && request.flow !== "") {
    return request.flow;
  }
  if (typeof request.model === "string" && request.model !== "") {
    return request.model;
  }
  const inline = request.flow_inline as
    | { id?: unknown }
    | undefined;
  if (
    typeof inline === "object" &&
    inline !== null &&
    typeof inline.id === "string"
  ) {
    return inline.id;
  }
  return "";
}

// ── sweeps (sweep_sidecar 2253-2291, sidecar_status 2412-2470) ────

export interface SweepResult {
  readonly touched: boolean;
  readonly wasQueued: boolean;
  readonly doc: Record<string, unknown>;
}

/** Patch a stale sidecar (pure half of sweep_sidecar): every
 *  running/queued status — top-level AND per-stage (any depth) —
 *  becomes failed. Idempotent (an already-swept file has no active
 *  statuses left → touched false, no write). A run still QUEUED
 *  never executed: its sweep note + error say so (queuedWhy)
 *  instead of implying a crash mid-run. */
export function sweepSidecar(
  doc: Record<string, unknown>,
  why: string,
  queuedWhy: string = "",
): SweepResult {
  const wasQueued: boolean = doc["status"] === "queued";
  let touched: boolean = false;
  const patch = (o: unknown): void => {
    if (Array.isArray(o)) {
      for (const v of o) patch(v);
      return;
    }
    if (typeof o === "object" && o !== null) {
      const rec = o as Record<string, unknown>;
      if (rec["status"] === "running" || rec["status"] === "queued") {
        rec["status"] = "failed";
        touched = true;
      }
      for (const v of Object.values(rec)) patch(v);
    }
  };
  patch(doc);
  if (!touched) return { touched: false, wasQueued, doc };
  const note: string = wasQueued && queuedWhy !== "" ? queuedWhy : why;
  doc["sweep"] = note;
  if (wasQueued && queuedWhy !== "") doc["error"] = queuedWhy;
  return { touched: true, wasQueued, doc };
}

/** Boot-sweep notes (boot_sweep 2402-2409). */
export const BOOT_SWEEP_WHY: string =
  "host restarted (boot sweep): stale active sidecar from a dead process";
export const BOOT_SWEEP_QUEUED_WHY: string =
  "host restarted before the run started (never executed) — resubmit";

/** Read-time sweep notes + response errors (sidecar_status
 *  2428-2451): the ledger state is ALWAYS "failed" (even for a
 *  queued zombie — the error TEXT carries the never-executed
 *  honesty), error "zombie swept at read time" mid-run. */
export const READ_SWEEP_WHY: string =
  "read-time sweep: stale running sidecar, no live registry entry";
export const READ_SWEEP_QUEUED_WHY: string =
  "run was still queued when the gateway vanished (never executed) — resubmit";
export const READ_SWEEP_RUNNING_ERROR: string = "zombie swept at read time";

/** Boot-time zombie sweep (boot_sweep 2378-2410, fs half): every
 *  sidecar still claiming running/queued belongs to a DEAD process
 *  — EXCEPT liveRunIds (boot_resurrect just re-queued those; their
 *  queued sidecar is resurrected work, not a zombie). Swept BEFORE
 *  traffic, so the ledger never shows phantom actives. Returns the
 *  swept run ids in sorted order. */
export function bootSweep(
  stateRoot: string,
  liveRunIds: readonly string[] = [],
  nowS: number = Math.floor(Date.now() / 1000),
): string[] {
  const swept: string[] = [];
  const live: Set<string> = new Set(liveRunIds);
  const outRoot: string = join(stateRoot, "output");
  let names: string[];
  try {
    names = readdirSync(outRoot);
  } catch {
    return swept;
  }
  for (const name of names.sort()) {
    if (!name.startsWith("run-")) continue;
    if (live.has(name)) continue;
    let pre: Record<string, unknown> = {};
    try {
      pre = JSON.parse(readFileSync(join(outRoot, name, "_flow.json"), "utf8")) as Record<
        string,
        unknown
      >;
      if (typeof pre !== "object" || pre === null || Array.isArray(pre)) {
        pre = {};
      }
    } catch {
      pre = {};
    }
    const wasQueued: boolean = pre["status"] === "queued";
    const path: string = join(outRoot, name, "_flow.json");
    let current: unknown = null;
    try {
      current = JSON.parse(readFileSync(path, "utf8"));
    } catch (e) {
      // ROW 28 (2026-09-10, census): an unreadable _flow.json must
      // not vanish from the sweep silently — the QUEUE LANE LAW
      // wants every boot disposition ledgered so the operator can
      // reconcile (the old bare continue left an unaudited row).
      appendLedger(
        stateRoot,
        "run.swept",
        { run_id: name, state: "unreadable", error: `boot sweep: _flow.json parse failed: ${e instanceof Error ? e.message : /* v8 ignore next -- JSON.parse throws Errors: the String fallback never fires (2026-09-12) */ String(e)}` },
        nowS,
      );
      continue;
    }
    if (typeof current !== "object" || current === null || Array.isArray(current)) {
      appendLedger(
        stateRoot,
        "run.swept",
        { run_id: name, state: "unreadable", error: "boot sweep: _flow.json is not an object" },
        nowS,
      );
      continue;
    }
    const res: SweepResult = sweepSidecar(
      current as Record<string, unknown>,
      BOOT_SWEEP_WHY,
      wasQueued ? BOOT_SWEEP_QUEUED_WHY : "",
    );
    if (!res.touched) continue;
    atomicWriteJson(path, res.doc);
    appendLedger(
      stateRoot,
      "run.swept",
      { run_id: name, state: wasQueued ? "queued_lost" : "failed", error: "boot sweep" },
      nowS,
    );
    swept.push(name);
  }
  return swept;
}

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
  // record at boot). The predicate agrees with buildRebuiltRun
  // (which throws the same road) so plan order never admits a row
  // the build cannot carry.
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
 *  for WRITES, documented at bootQueue). */
export interface QueueRoots {
  readonly stateRoot: string;
  readonly runsRoot: string;
  readonly ledgerPath: string;
}

/** One rebuilt queued run (py _rebuild_run_from_record 2294-2336:
 *  stages/skipped ride list(doc.get(...) or []) VERBATIM (strings
 *  split to chars, dicts to keys, mixed rows stay mixed), artifacts
 *  ride [str(a) for a if a] with py spellings, error restarts ""
 *  — the registry seam, not the record, owns it). */
export interface RebuiltRun {
  readonly runId: string;
  readonly draftId: string;
  readonly stages: unknown[];
  readonly skippedStages: unknown[];
  readonly artifacts: string[];
}

/** Read one usable record back into registry shape (the plan
 *  already proved it usable — a TOCTOU read failure or a raise-road
 *  value here throws and the caller skips to the sweep, exactly the
 *  _rebuild raise road at boot). */
export function buildRebuiltRun(
  stateRoot: string,
  runId: string,
): RebuiltRun {
  const doc = JSON.parse(
    readFileSync(join(stateRoot, "output", runId, "_flow.json"), "utf8"),
  ) as Record<string, unknown>;
  return {
    runId,
    draftId: typeof doc["draft_id"] === "string" ? (doc["draft_id"] as string) : "",
    stages: pyListItems(doc["stages"]),
    skippedStages: pyListItems(doc["skipped_stages"]),
    artifacts: pyArtifactStrings(doc["artifacts"]),
  };
}

/** Resurrect half (boot_resurrect 2338-2376): every usable QUEUED
 *  record re-queues (same id, FIFO by created_at) + ledgers
 *  run.resurrected. NO sweep here — py's resurrect never sweeps;
 *  main() sweeps after (bootQueue below). Returns revived ids (==
 *  the live ids the sweep must shield). */
export function resurrectRuns(
  stateRoot: string,
  enqueue: (run: RebuiltRun) => void,
  draftExists: (draftId: string) => boolean,
  nowS: number = Math.floor(Date.now() / 1000),
): string[] {
  const plan: ResurrectPlan = planResurrect(
    stateRoot,
    undefined,
    undefined,
    draftExists,
  );
  const revived: string[] = [];
  for (const runId of plan.order) {
    try {
      const run: RebuiltRun = buildRebuiltRun(stateRoot, runId);
      enqueue(run);
      appendLedger(
        stateRoot,
        "run.resurrected",
        { run_id: runId, draft_id: run.draftId },
        nowS,
      );
      revived.push(runId);
    } catch {
      /* a half-written record sweeps below — LOUD there */
    }
  }
  return revived;
}

/** Whole boot (main 4481-4489): the LOCK is the caller's (bootGate
 *  BEFORE any side effect — the lock proves single-writer, never
 *  this function). Resurrect FIRST, sweep SECOND (4485-4486), then
 *  ledger server.boot {port, swept, resurrected, engine}. Writes
 *  land on the canonical layout (stateRoot/output/..., ==
 *  roots.ledgerPath for every caller — defaultAssetRoots). Never
 *  throws: a poisoned root boots unreconciled (the sweep/scan
 *  guards every read; the server.ts seam swallows the rest). */
export function bootQueue(
  roots: QueueRoots,
  enqueue: (run: RebuiltRun) => void,
  port: number,
  engine: string,
  nowS: number = Math.floor(Date.now() / 1000),
  draftExists: (draftId: string) => boolean = (): boolean => {
    // LOUD default (see planResurrect): callers without a domain
    // probe must fail loud, never silently orphan reviveable runs.
    throw new Error(
      "[gateway-ts] bootQueue needs the caller's draftExists probe (drafts domain)",
    );
  },
): { resurrected: number; swept: number; live: string[] } {
  const live: string[] = resurrectRuns(roots.stateRoot, enqueue, draftExists, nowS);
  const sweptIds: string[] = bootSweep(roots.stateRoot, live, nowS);
  appendLedger(
    roots.stateRoot,
    "server.boot",
    { port: port, swept: sweptIds.length, resurrected: live.length, engine: engine },
    nowS,
  );
  return { resurrected: live.length, swept: sweptIds.length, live };
}
