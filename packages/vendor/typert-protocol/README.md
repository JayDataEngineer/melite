---
description: Vendored copy of the DSH Typert protocol package, kept under packages/ so the Typert generator recognizes this workspace's Remote protocols.
kind: package-library
---

# @deepseek-ai/dsh-typert-protocol

Vendored verbatim from `references/deepseek-harness` (packages/typert/protocol/src), version 0.2.0-rc.1. The DSH Typert generator's identity law recognizes `@Remote` decorators only when the protocol declaration files sit inside a registered workspace package under `packages/` — so this copy exists for GENERATION, and only for generation: no pnpm override points at it and no runtime consumer imports it (runtime resolves the registry copy under node_modules; the typert-artifact-law wall pins the vendor version against the resolved version). This is a vendor pack: one honest paragraph per file face, and `src/` is never edited here — upgrades re-vendor from the reference (copy, do not invent).

## Contract

- `.` — the decorator and runtime-contract face: `@Remote` decorators backed by versioned, frozen descriptors (`RemoteMethodDescriptorV1`), `isTypertRemoteSegment` (the RPC endpoint segment grammar), `RemoteError`/`remoteErrorOf`, the `TYPERT_OWNED_VALUE` marker trio, `isRemoteJsonValue`/`isRemoteUplinkItem` guards, and the Gateway binding types.
- `./types` — compiler-independent protocol types shared by business packages, generated Remote artifacts, the Host Gateway, and the Client API: `TypertLookup`, `TypertContext`, `TypertRemoteMap`, and the `RemoteErrorDetailsMap` codes (`gateway/bad-request`, `gateway/cancelled`, `gateway/internal`).
- `./remote-info` — the lazy assembly of generated Remote definitions: `createTypertRemoteInfo(spec, zod)` wraps compiler-produced method facts with caller-supplied Zod, building its descriptor/method index on first access and caching named-input parsers and JSON Schema projections only when requested — no runtime imports, no registration or transport effects.
- `./src/*` — the vendored sources, exported verbatim for the generator's module resolution.
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

Never — the package participates in protocol generation and typing, not in any request path.

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **Generation face only** — a runtime import of this package would silently diverge from the registry copy; the artifact-law wall is the guard.
- **Do not edit src** — fixes go upstream in the reference tree, then re-vendor; a local edit breaks the verbatim pin.
