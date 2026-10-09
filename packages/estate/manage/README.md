---
description: The management Typert remote — one act endpoint adapting the browser protocol onto the manage seat owned by estate-queue.
kind: package-library
---

# @melite/estate-manage

`@melite/estate-manage` is the thin adapter that serves the management plane
to remote clients. It extends TypertRemoteService with a single `act`
endpoint and delegates to the `manage` seat — the business (status, logs,
snapshots, provisioning, refusal envelopes) lives decorator-free in
`@melite/estate-queue`'s ManageService. It calls nothing itself; the estate
bundle mounts it after the seat. The package builds with tsc because
decorators are not erasable syntax.

## Contract

- One endpoint: `manage/act` — the action rides the `ManageActDoc`; the seat
  dispatches and returns the `ManageEnvelopeRow`.
- The adapter adds nothing: it never catches or wraps; failures arrive as
  the protocol's ONE RemoteError (`manage/refused` carries the envelope in
  its details).
- The seat boundary is structural: this package must not import the queue
  package's sources into its build graph; the wall pins the delegation
  end-to-end.
- Declared exports: `.` (service + plugin row), `./types` (doc and envelope
  types), `./typert` (generated host-face declaration), `./remote`
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

- **One endpoint, no granular faces** — every management action rides the
  single act doc; client tooling cannot address a narrower surface.
- **The seat face is structural** — the adapter sees only the `act` slice; a
  seat method added later needs an explicit face update here to become
  reachable.
