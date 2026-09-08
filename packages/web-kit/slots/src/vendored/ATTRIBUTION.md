# Vendored from DeepSeek Harness — ui-slots

- Upstream: https://github.com/deepseek-ai/deepseek-harness
  `packages/client/ui-slots` (src/index.ts — the SlotCore runtime +
  SlotMap declaration-merge pattern).
- Cloned at commit `141eb6f` (2026-08-19), adapted the same day.
- License: MIT, Copyright (c) 2026 DeepSeek — reproduced below. The notice
  must be preserved in copies or substantial portions of this software.

## Adaptation ledger

Kept (semantics preserved; wording of validation messages adapted only
where the surrounding feature was dropped):

- SlotMap declaration merging (seat vocabulary is extensible by any module).
- One `register(options, component)` call contributing a component AND
  declaring child seats: declaration = render authorization = runtime
  spec, one table.
- Load-time validation: undeclared seat, already-declared child (message
  names the first declarer), list `id` requirement, one occupant per cell
  at a priority (shadowing at distinct priorities; lowest renders).
- Ledger order: priority ascending; list refines equal priorities by
  `order`; ties keep registration order.
- Lifecycle: the disposer removes the contribution AND collapses every
  declared child seat recursively; stale disposers are no-ops; version
  counters stay monotonic across redeclarations (declaration epochs).
- Change propagation: synchronous version bumps, microtask-batched
  subscriber notifications (N same-tick mutations → one notification).
- The a-priori seeded 'root' seat.
- A JSON-safe `describe()` inspection tree (kept from upstream LiveSlotNode).

Dropped in this cut (add back from upstream when a consumer needs them —
each is separable):

- 'keyed' and 'chain' slot kinds (chain selectors, `renderSlotChain`).
- Store seats (`defineStore`, store handle types) — Melite surfaces own
  their zustand stores today.
- The locale namespace table (`LocaleNamespaceMap`, `Translate`).
- Session/data scopes (`scope: 'session' | 'session-maybe'`) and the
  four-share props composition (runtime/session/store/business shares) —
  this cut composes props from the outlet owner share only.
- Declaration `inject` factories and `ctx.slots.inject()` late-declaration
  following.
- `reportEntryError` / abdication (renderer error policy).

The renderer side is NOT vendored: upstream ui-renderer binds Cordis; this
repo's `./react.tsx` is the thin React 19 binding (`useSyncExternalStore`
over the core's version counters), written for Melite.

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
