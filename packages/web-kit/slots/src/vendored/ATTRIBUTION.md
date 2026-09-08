# Vendored from DeepSeek Harness — ui-slots

- Upstream: https://github.com/deepseek-ai/deepseek-harness
  `packages/client/ui-slots` (src/index.ts — the SlotCore runtime +
  SlotMap declaration-merge pattern).
- Cloned at commit `141eb6f` (2026-08-19), adapted the same day.
- License: MIT, Copyright (c) 2026 DeepSeek — reproduced below. The notice
  must be preserved in copies or substantial portions of this software.

## Adaptation ledger

S1b consolidation (2026-09-08 — the audit's row-10 correction):
`createUiSlot` is no longer a parallel hand kernel. Each UiSlot is a
`chain` seat (`ui.<name>`) on `uiSlotSeam.ts`'s module SlotCore — the
claim's resolve-or-decline IS the chain selector (election = the walk),
precedence maps to priority negated (core sorts ascending, lowest
renders), the claim id rides `registrant` (dup + tier checks read the
ledger; `registered()` projects `precedence:id`). Walks return the
election's `matched` payload (components never enter the ledger — one
render-inert holder stands in). Seat identity is the slot name
(declaration-merging semantics). The STORE organs (version +
listeners) stay adapter-owned and synchronous — the core batches
subscriber notifications per microtask and the face pins sync
delivery. Faces unchanged: every consumer (cardBodySeam,
cardElementSeams, regionSeams, viewerSeams, pluginUi, shell surfaces)
rides the same UiSlot API on the same SlotCore backing.

S1 re-vendor (2026-09-08 — docs/design/client-cordis-audit-2026-09-08.md):
the dropped pieces with a consumer are now BACK, ported onto the
two-share cut (adapted, not a wholesale upstream swap — the estate's
RegisterOptions/SlotEntryView shapes and the editor's gate tests stand):

- 'keyed' and 'chain' slot kinds (chain selectors, priority-ordered
  election via `resolveChain`, chain/keyed dispatch in the outlet) —
  RE-VENDORED. First consumer: cardSeam kinds-as-chain-entries.
- Declaration `inject` factories and late-declaration following —
  RE-VENDORED as `injectSlot(core, name, callback)` (the ctx-free port
  of `ctx.slots.inject`: wait + collapse-dispose + redeclaration-rerun
  + caller-owned master disposer; bind it to a React-effect return or a
  fiber teardown the way the service binds it to ctx.effect).
- `reportEntryError` / abdication / `onEntryError` — RE-VENDORED
  (one-shot abdication, notification-first error policy).
- Declaration epochs + `subscribeDeclaration` (synchronous
  declare/collapse notifications) — RE-VENDORED (the inject wait seam).
- `isLive` staleness probe — RE-VENDORED.
- Renderer installation contract (`StaleAuthorizationError` /
  `SlotOwnershipError`, retained-view probe, chain/keyed dispatch) —
  ADOPTED in `./react.tsx`. The FULL ui-renderer machinery stays out:
  its host face reads the DSH host's sessions/workspaces services,
  which the standalone editor does not mount (cause recorded in the
  audit, row 2).

Still dropped (no consumer — add back from upstream when one needs
them; each is separable):

- Store seats (`defineStore`, store handle types) — Melite surfaces own
  their zustand stores (CLIENT-IDIOM per the audit; adopt seats only
  with a fiber-lifecycle cause, none identified).
- The locale namespace table (`LocaleNamespaceMap`, `Translate`).
- Session/data scopes (`scope: 'session' | 'session-maybe'`) and the
  four-share props composition (runtime/session/store/business shares) —
  this cut composes props from the outlet owner share only.

Kept (semantics preserved; wording of validation messages adapted only
where the surrounding feature was dropped):

- SlotMap declaration merging (seat vocabulary is extensible by any module).
- One `register(options, component)` call contributing a component AND
  declaring child seats: declaration = render authorization = runtime
  spec, one table.
- Load-time validation: undeclared seat, already-declared child (message
  names the first declarer), keyed `key` / list `id` / chain `select`
  requirements, one occupant per cell at a priority (shadowing at
  distinct priorities; lowest renders; chain skips shadowing — election
  consumes every entry).
- Ledger order: priority ascending; list refines equal priorities by
  `order`; ties keep registration order.
- Lifecycle: the disposer removes the contribution AND collapses every
  declared child seat recursively; stale disposers are no-ops; version
  counters stay monotonic across redeclarations (declaration epochs).
- Change propagation: synchronous version bumps, microtask-batched
  subscriber notifications (N same-tick mutations → one notification).
- The a-priori seeded 'root' seat.
- A JSON-safe `describe()` inspection tree (kept from upstream LiveSlotNode).

Still dropped as of S1 — see the ledger head for what came back and why
the remainder stays out (each is separable; the renderer note below stands):

- Store seats (`defineStore`, store handle types) — Melite surfaces own
  their zustand stores today.
- The locale namespace table (`LocaleNamespaceMap`, `Translate`).
- Session/data scopes (`scope: 'session' | 'session-maybe'`) and the
  four-share props composition (runtime/session/store/business shares) —
  this cut composes props from the outlet owner share only.

The full ui-renderer side is NOT vendored: upstream ui-renderer binds
Cordis host services (sessions/workspaces) the standalone editor does
not mount; this repo's `./react.tsx` is the contract-shaped React 19
binding (`useSyncExternalStore` over the core's version counters, plus
the adopted `StaleAuthorizationError` / `SlotOwnershipError` /
staleness-probe / chain/keyed dispatch contract), written for Melite.

## MIT License (upstream notice)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
