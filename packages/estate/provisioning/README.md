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
[`../../../docs/tools/comfy-manage.md`](../../../docs/tools/comfy-manage.md).
The service design and migration record are in
[`../../../docs/design/provisioning-service.md`](../../../docs/design/provisioning-service.md).

## Verification

Package tests cover plans, state transitions, Manager success/refusal/
timeout, pinned refs, path confinement, cancellation, artifact integrity, and
operation persistence. Management, sidebar, tool, model-door, and CLI tests
verify that callers do not grow private downloaders or hash implementations.
