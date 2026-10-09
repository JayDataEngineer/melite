---
description: The drafts and bench Typert remote owner — draft docs in a storage domain plus the shared bench mutation surface, mounted as host Cordis services.
kind: package-library
---

# @melite/estate-drafts

`@melite/estate-drafts` owns the composer's draft docs and the shared bench.
It mounts the drafts storage-domain seat, `DraftsRemoteService`, and
`BenchRemoteService` on the host fiber; the host's typert gateway claims the
endpoints through its discovery walk, and the storage facility arrives via
the host's storageDomain seat (lazy open on first call). The estate bundle
mounts it before the runs registry, whose submit gate re-uses this package's
draft-id law.

## Contract

- Storage: table `docs` keyed by draft id (`DRAFT_ID_RE`: 1..96 chars of
  `[A-Za-z0-9_-]`, path-safe — the SSOT the queue re-exports).
  Schema-failing records are backed up and skipped; the global slot holds
  the one-time legacy-import marker.
- Draft docs: six contract keys (`draft_id`, `status`, `createdAt`,
  `completedAt`, `intent`, `stages`) plus caller extras verbatim — the serve
  read is deliberately loose; the write doors are strict.
- Bench: `ensure`, `get`, `patch`, `add-stage`, `remove-stage`, `reorder`,
  `group`, `rewire`, `undo`, `clear`, keyed by the caller's session key,
  with change notification through the bench change seam.
- Failures are the protocol's ONE RemoteError with `draft/*` and `bench/*`
  codes declared next to their throws.
- Declared exports: `.` (plugin + services), `./types` (shared row types),
  `./typert` (generated host-face declaration), `./remote` (generated
  browser client), `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **Bench access is session-key scoped** — a caller outside the editor's
  session model must carry the session key itself; there is no cross-session
  bench view.
- **The loose serve read is deliberate** — extras ride back unvalidated; a
  writer bug can land extras the read will not catch.
