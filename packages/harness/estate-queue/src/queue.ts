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

import type { Context } from "@deepseek-ai/cordis";
// Type-only edge to the Timer plugin: applies its Context
// augmentation (ctx.interval/ctx.timeout) with no runtime import,
// so the wall's bare node -e import of this module stays light.
import type { TimerService } from "@deepseek-ai/cordis-plugin-timer";

// ── seam re-exports (godfile split 2026-09-18: the bodies live in
// the sibling helper modules below — pure move, zero logic changes.
// This barrel keeps the public surface byte-identical: PUBLIC API
// NEVER MOVES — every symbol stays importable from "./queue.ts").
export * from "./queueLock.ts";
export * from "./queueSubmit.ts";
export * from "./queueLifecycle.ts";
export * from "./queueCore.ts";
export * from "./queueRetry.ts";
export * from "./queueSidecar.ts";
export * from "./queueSweep.ts";
export * from "./queueResurrect.ts";
