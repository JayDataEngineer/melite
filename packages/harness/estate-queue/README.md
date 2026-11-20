---
description: The estate's run core as Cordis services — serial queue, live-run registry, manage and flows seats, the skill plane, and the runs gate vocabulary.
kind: package-library
---

# @melite/estate-queue

`@melite/estate-queue` is the run-queue core of the estate: the serial-GPU
lock, journal, sidecars, boot sweep, the live-run registry the Typert
adapters delegate to, the manage seat, the flows seat, the bench picks, and
the skill plane the agent engine's spawn-injection reader rides. It calls
the engines seat to execute runs and the drafts seat for draft validation;
the estate bundle mounts it once per fiber (`inject: ["timer"]`), and the
runs-registry row mounts after queue, drafts, and card registry.

## Contract

- Seats mounted: `ctx.queue` (QueueService — lock, ledger, sidecars,
  bootSweep), `ctx.runs` (RunsRuntimeService — start/status/stop/list/
  validate, onRunChange), `ctx.manage` (ManageGatewayService), and
  `ctx.meliteFlows` (the flows seat, mounted first in the row).
- Config (declared schema, validated before apply — the 2026-11-20
  config-law cure): `{ repoRoot? }` for the default `data/runs`
  state root; `stateRoot?` (absolute) overrides it and wins over
  repoRoot; `stateRoots?` declares the cross-roots manifest extras,
  own root first (the retired `MELITE_STATE_ROOT`/`MELITE_STATE_ROOTS`
  env seams' config twins); `executeCeilMs?` is the one-run engine
  execution ceiling (`<= 0` disables — the hung-run fuse).
- The lifecycle latch (MP-R1) is instance state on the queue seat:
  the manage doors hold `ctx.queue.lifecycleLatch` across destructive
  vendor calls; the run press reads it and refuses with
  `runs/lifecycle-inflight` while a teardown is in flight.
- The submit vocabulary lives here: draft-id law (re-exported from
  estate-drafts), run gates, refusals, validation, ledger tail. The skill
  plane serves skills over the same storage melite_load reads.
- Declared exports: `.` (everything the row and its consumers import) and
  `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None directly — run state reaches a model only when a tool surface (for
example run-status or ledger-tail) projects this seat's rows into a tool
result, and the agent engine, not this package, inlines skill leaves into
briefs.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **One serial queue per fiber** — the lock is the fiber's; two fibers mean
  two queues with no cross-fiber ordering promise.
- **MELITE_STATE_ROOTS is colon-separated** — a root path containing a
  colon cannot be declared; relocate such a root instead.
