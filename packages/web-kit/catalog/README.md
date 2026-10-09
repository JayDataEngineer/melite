---
description: The served-truth reader of the web estate — resilient transport, catalog and run-status contracts, and the stores that hold their verdicts.
kind: package-library
---

# catalog

`@melite/catalog` is the wire client the editor app and every browser plugin share: the resilient fetch transport, the declarative contracts over the served catalog and the status channel, and the zustand-shaped store binding. Its law: a malformed catalog can never silently vanish into an empty sidebar — violations are state the UI renders.

## Contract

The package root re-exports the modules below; each is also a declared subpath. The manifest also declares the standard `./package.json` re-export.

- Transport — `./api` (`apiFetch` and `apiJson`: retry with backoff on 5xx and network errors, in-flight GET dedup, a three-state backend liveness signal on `onBackendState`, and the no-silent-swallows policy over every catch) and `./sleep` (the one delay).
- Contracts and stores — `./catalogContract` with `./catalogContractStore` (the catalog validator and its verdict-as-state store: `idle`, `loaded`, `violation`, `error`; a violated catalog is never cached and toasts fire once per outage), `./runStatusContract` with `./runStatusContractStore` (the same pattern over the status channel), `./cardBirth` (the draft-id card-birth law).
- Served truth — `./modelCatalog` (the catalog owner and selectors), `./FlowProtocol` (the one generation protocol: `POST /v1/flows/start`, then polling), `./familyParamContract` (every family's params JSON Schema in one fetch), `./familyProvenance` (the run-to-capability provenance join), `./serviceForms` (sidebar-key to form-tag lookups), `./tagMap` (the tag registry and forward index), `./waveform-peaks` (multi-resolution waveform peaks), `./enhance` (prompt enhancement over the DSH harness door `/melite-tools/enhance`, route list from `/melite-tools/catalog`), and `./clientStore` (the bound store over `@deepseek-ai/dsh-client-store`).

## Model Experience

### Request context and condition

#### What the model sees

Only the `./enhance` path: a card's prompt text and the enhance model preference reach the DSH harness door; the readers and stores contribute nothing.

#### Token effect

Conditional — token cost only when an enhance press fires its harness-door request.

#### KV Cache effect

Independent — each enhance request stands alone; every other path issues no model requests.

## Known Limitations and Deferred Work

- **The catalog is static per boot** — the selectors memoize the served truth; a models re-scan mid-session becomes visible only after a reload.
- **No keystore fallback for enhance** — the retired `/v1/llm` plane stays retired; an editor without the DSH host gets an honest error, not a degraded answer.
- **No `./invariant` companion** — the contracts validate served payloads at the load funnels they own; independent observations cannot diverge around a runtime assertion here.
