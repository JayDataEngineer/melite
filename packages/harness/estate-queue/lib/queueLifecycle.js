// queueLifecycle.ts — the queue row's lifecycle state union (split
// from queue.ts 2026-09-18). The stop/resume/reproduce refusal
// constructors that once lived here were deleted (the wire-chain
// audit cure, 2026-10-18): zero call sites in src — the live doors
// throw RemoteError with their own runs/* codes directly — while
// carrying six envelope codes no table row owned, a latent
// unmapped-throw for the first future caller. Erasable-syntax TS
// only (node --experimental-strip-types): no enums, import type for
// types, .ts specifiers for relative imports.
export {};
//# sourceMappingURL=queueLifecycle.js.map
