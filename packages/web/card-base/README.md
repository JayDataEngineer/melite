---
description: Dual-face base for the studio's card surfaces — the one browser row of shared atoms plus the form-spec emission contract.
kind: package-bundle
---

# card-base

`@melite/card-base` is the dual-face base every card studio stands on. The host half at the package root is a null composition marker; the browser half at `./client` is the ONE compiled graph row of the studio atoms; `./spec` carries the emission contract. Card packages emit; this package constructs the input components from the emission. A web profile mounts it through its bundle patch, and every card client consumes the atoms through the loader's module table instead of inlining a second copy.

## Contract

The manifest declares `dsh.bundle.patch: ./cordis.patch.yml`, which inserts the `card-base` module-table row. Three faces, one truth each:

- `.` — the host marker (`name`, `inject`, `apply`). Registers nothing node-side; the row import must stay node-safe (no tsx, no CSS).
- `./client` — the one compiled instance of the studio atoms (toast store, form construction, shell chrome), served as `@melite/card-base/client` from the loader's module table. Consumers externalize it through `dsh.client.external`; the row's `apply` wires the contract-toast seam (`setContractToastSink` to the toast store) once, synchronously at boot, before any event-time fire.
- `./spec` — the served form-spec shape and its pure projections: the layered-params resolver (`resolveValue`: schema defaults, then model defaults, then served stamps, then user) and the edge law (`inputs`/`outputs` rows), from which input components and picker candidates are constructed. Types and derivations only — no fetchers, no components.

The manifest also declares the standard `./package.json` re-export.

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input. Its fetchers call the estate remotes; nothing here addresses a model request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — the package contributes no content to model requests.

## Known Limitations and Deferred Work

- **The row must register on both planes** — the shell registers every boot row as a cordis plugin node-side and in the browser; a browser face without `apply` kills the whole client plugin graph behind an empty shell, so consumers externalize the row and no other patch may twin it.
- **No `./invariant` companion** — the atoms derive everything from estate remote responses and the served form-spec; no cross-package runtime claim exists for an assertion to check, so the installer is omitted per the package invariant rules.
- **One serializer, server-side** — `./spec` consumes the served schemastery JSON verbatim; a second client-side serializer would fork that source of truth and stays out of scope.
