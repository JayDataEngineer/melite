// queue.ts — P5 queue-core port (the serial-GPU state machine).
//
// WHAT THIS SERVES; Date 2026-09-07,
// Status: landed:
//   - single-writer lock (R2, 2026-09-06): acquireLock/releaseLock +
//     the dead-pid steal ledgered server.lock_stolen, the pid-0
//     probe, the REFUSING line main() prints before any boot
//     side effect.
//   - enqueue/dequeue ordering: order append + the worker's
//     head-pop under the serial guard. PRIORITIES: none — append +
//     head-pop is the whole discipline. A `priority` body key is
//     ignored (FIFO) — this core takes no priority anywhere; a
//     priority-carrying body lands FIFO.
//   - the submit pre-registration refusal chain (submit +
//     strict-body + resolve-request doors): envelope order body ->
//     test -> draft required/malformed/unknown -> strict
//     knobs/carry -> door ambiguity/exclusivity, every text
//     byte-identical (the R4.2 envelope: error verbatim + code +
//     loc/expected/got only when set).
//   - stop/resume/reproduce refusals byte-identical.
//   - the worker's portable policy: 50 ms poll + serial-active
//     guard, the terminal mapping (stopped iff the stop flag is set
//     else completed/failed, "<Type>: <msg>" error), the terminal
//     broadcast frame, the settled-row eviction (completed/failed
//     past 500, oldest created_at first, queued/running/stopped
//     never touched), the worker outliving failures (RESILIENCE
//     LAW).
//   - R3.3 retry rows: max_extra from the node row (retries
//     0..5), budget from timeout_s (the run budget), stop NEVER
//     retries, every retry ledgered run.stage_retry + stamped
//     retries_used/retry_last_error. Range 0..5 enforced where the
//     row is built — the core reads it.
//   - persistence/journal shapes: LEDGER_PATH output/_ledger.jsonl +
//     the append-only line close-per-line that never throws,
//     atomic tmp+rename indent-2 writes, the sidecar document key
//     order + the capped JSON error (20000) when set, _request.json
//     verbatim, boot_resurrect FIFO-by-created_at + CARD-BIRTH
//     orphan skip, boot_sweep + the read-time sweep texts.
//   - the rebuild-from-record value rules (STRICT: arrays ride,
//     non-arrays skip; missing/empty graphs resurrect rowless;
//     NodeRow mistypes orphan; created_at garbage coerces to 0;
//     _request.json needs only to parse).
//   - live-serve normalization: files keep parsed values in memory.
//   - the queue snapshot key order (queued/running/active/
//     queued_ids) + queue_position (index or 0).
//
// WHAT STAYS ENGINE-OWNED (documented gaps, never silent):
//   - engine execution (compose/transport) + the merged/per-stage
//     dispatch: the worker loop here takes an injected execute()
//     (the worker-vs-execute split).
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
// ── seam re-exports (godfile split 2026-09-18: the bodies live in
// the sibling helper modules below — pure move, zero logic changes.
// This barrel keeps the public surface byte-identical: PUBLIC API
// NEVER MOVES — every symbol stays importable from "./queue.ts").
export * from "./queueLock.js";
export * from "./queueSubmit.js";
export * from "./queueLifecycle.js";
export * from "./queueCore.js";
export * from "./queueRetry.js";
export * from "./queueSidecar.js";
export * from "./queueSweep.js";
export * from "./queueResurrect.js";
//# sourceMappingURL=queue.js.map