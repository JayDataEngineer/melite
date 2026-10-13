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
//     broadcast frame, the settled-row eviction (every TERMINAL
//     status — completed, failed, AND stopped (audit F-S11) — past
//     500, oldest created_at first; queued/running never touched),
//     the worker outliving failures (RESILIENCE LAW).
//   - R3.3 retry rows (DORMANT vocabulary, 2026-10-22 note): the
//     policy helpers (queueRetry.ts shouldRetry/noteStageRetry,
//     queueCore.ts settleRun, RETRIES_MAX) are ported + spec-pinned
//     but the worker has NO retry loop — runOne settles a failed
//     run terminal, once. `timeout_s` (the R3.3 budget source) is
//     refused on card stages (flowsRegistryRows.ts), so the core
//     reads no budget today. Wire the loop or delete the policy —
//     never quote it as live.
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

import type { Context } from "@deepseek-ai/cordis";
// Type-only edge to the Timer plugin: applies its Context
// augmentation (ctx.interval/ctx.timeout) with no runtime import,
// so the wall's bare node -e import of this module stays light.
import type { TimerService } from "@deepseek-ai/cordis-plugin-timer";

// ── seam re-exports (godfile split 2026-09-18: the bodies live in
// the sibling helper modules below — pure move, zero logic changes.
// This barrel keeps the public surface byte-identical: PUBLIC API
// NEVER MOVES — every symbol stays importable from this barrel,
// source plane queue.ts / emitted queue.js).
export * from "./queueLock.ts";
export * from "./queueSubmit.ts";
export * from "./queueLifecycle.ts";
export * from "./queueCore.ts";
export * from "./queueRetry.ts";
export * from "./queueSidecar.ts";
export * from "./queueSweep.ts";
export * from "./queueResurrect.ts";
