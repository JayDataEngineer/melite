---
description: The runs Typert remote — thin start/status/stop/list/validate adapters delegating to the live-run registry seat owned by estate-queue.
kind: package-library
---

# @melite/estate-runs

`@melite/estate-runs` serves the runs protocol to remote clients. Each
adapter extends TypertRemoteService and delegates to the `runs` seat — the
live-run registry, serial pump, start chain, and RemoteError codes live
decorator-free in `@melite/estate-queue`'s RunsRegistryService. It calls
nothing itself; the estate bundle mounts it after the runs-registry row.
The package builds with tsc because decorators are not erasable syntax.

## Contract

- Endpoints: `start`, `status` (optional log tail), `stop`, `list`
  (limit-parsed), `validate`, plus the run-row change subscription for push
  surfaces.
- The adapters add nothing: they never catch or wrap; failures arrive as
  the protocol's ONE RemoteError with the queue's `runs/*` codes.
- The seat boundary is structural: no imports of the queue package's
  sources into this build graph; the wall pins the delegation end-to-end.
- Declared exports: `.` (adapters + plugin row), `./types` (`RunStartDoc`,
  `RunRow`), `./typert` (generated host-face declaration), `./remote`
  (generated browser client), `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **The seat face is structural** — the adapters see the registry's
  adapter-facing slice only; a new registry verb needs an explicit face
  update here to become reachable.
- **Log tails are pull-only** — run-log content rides the status call's
  optional tail; there is no streaming log face.
