---
description: The Cordis provisioning capability for declared model and extension resources — plans, per-resource state, acquisition locks, Manager/provider adapters, verified artifact landing.
kind: package-library
---

# @melite/estate-provisioning

`@melite/estate-provisioning` is the Cordis capability for declared model and
extension resources. It owns plans, per-resource operation state, shared
acquisition locks, Manager/provider adapters, verified artifact landing, and
typed lifecycle ports. It does not own the browser, queue, or engine runtime.

## Service

Mount `provisioningProvider` with typed ports for declarations, artifact
storage, Manager, inspection, lifecycle, and operation persistence. The
provider registers `ctx.provisioning`; consumers inject or probe that seat
through the composition owner.

## Contract

The service exposes:

- `inspect(ref, signal?)`
- `plan(ref)`
- `ensure(ref, options?, signal?)`
- `activate(ref, options?, signal?)`
- `acquireExternal(request, options?, signal?)`
- `reconcile(ref?, signal?)`

`ensure` shares one in-flight operation per resource key. A result is
`active`, `restart_required`, `partial`, `failed`, `cancelled`, or `blocked`.
Partial multi-item work preserves per-item results and is never reported as
unqualified success.

`./contracts` is the shared vocabulary the adapters and readers import:
`ResourceRef` (model rows keyed by owner/variant/quant, extension rows by id),
the nine `PROVISION_STATES`, the `PROVISION_OUTCOMES`, the live-acquire set
(`acquiring`/`verifying`), the `ACQUIRE_PHASES` liveness words (`stream`,
`queue`, `verify`, `recheck`), and the durable-queue seat facts — the
`SeatHeartbeat` stamp and the ten-second `DURABLE_CLAIMER_FRESH_MS` window
that keeps a wanted download from queuing into a store no one will claim.

Declared exports: `.` (service + provider) and `./types` (the definition and
row types), `./contracts` (the shared ref/state/phase vocabulary),
`./package.json`.

## Resource boundaries

- Model plans retain the declared source, destination, digest, and size.
- The Manager provider owns the model-install queue and bounded HTTP calls.
- The verified writer confines paths, hashes temporary bytes, and records
  `declared-sha256` for declared rows. Explicit operator-confirmed external
  downloads may instead record `operator-unverified` when no digest is
  supplied.
- Extension providers preserve the declared registry/URL/ref and never
  silently substitute `latest`.
- External URL acquisition is an explicit operator-confirmed operation, not
  an automatic declared-resource path.
- Inspector and lifecycle ports determine whether installed extensions are
  active after a fresh engine check.

## Current composition

The service is mounted by the estate composition in
`packages/web/melite-estate/src/provisioning.ts` and consumed by the manage
seat, sidebar, model door, and the `comfy_manage` path. The CLI is an adapter
over the same declarations and service behavior; it is not a second
provisioning implementation.

The complete operator-facing result and action contract is in
[`../../../dev_docs/tools/comfy-manage.md`](../../../dev_docs/tools/comfy-manage.md).
The service design and migration record are in
[`../../../dev_docs/design/provisioning-service.md`](../../../dev_docs/design/provisioning-service.md).

## Verification

Package tests cover plans, state transitions, Manager success/refusal/
timeout, pinned refs, path confinement, cancellation, artifact integrity, and
operation persistence. Management, sidebar, tool, model-door, and CLI tests
verify that callers do not grow private downloaders or hash implementations.

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input; it lands verified
model and extension artifacts on disk and reports results to callers.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **Partial is honest, not healed** — failed subsets of multi-item work
  stay failed in the report; nothing retries them automatically.
- **Operator-confirmed downloads bypass declared digests** — with no digest
  supplied the row records `operator-unverified`; the trust decision is the
  operator's, recorded rather than enforced.
