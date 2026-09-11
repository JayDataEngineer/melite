// flowStore — TWO fully-isolated flow document stores (2026-08-07
// reversal of the prior unification). The Library canvas and the Agent tab
// unambiguous: "The STATE of Library and the Agent ARE TWO SEPARATE THINGS,
// we should have NO LEAKS." A Library-built flow must NEVER render in
// the Agent tab (and vice versa); the prior single shared store did both,
// which is why the Agent page showed "a thousand cards everywhere" — it
// was rendering the Library's flow.
//
// The store LOGIC is identical across both instances (same cache-
// invalidation engine, same run protocol, same status machine) — this file
// is a factory, called twice. The split is at the INSTANCE level: two
// separate `create()` calls produce two independent state trees.
//
// ARCHITECTURE:
// Stage descriptors (from the agent's build_flow tool OR the user's
// capability tiles) materialize into a FlowDoc with stable IDs,
// computed cacheKeys, and a status machine.
//
// Stages execute via EXISTING backends — NO NEW COMPUTE ENGINE:
// • "generation" stages → POST /v1/flows/start, flat shape (compile
// {model, params} → 1-step doc → run_id → poll /status). Every catalog
// form compiles (compile.py _FORM_CONFIGS); a non-ok start throws.
// • "chain" stages → POST /v1/flows/start, YAML-spec shape
// • "studio-link" stages → don't execute; wait for double-click
//
// CACHING (the user's "re-run with cache" requirement):
// Each stage's cacheKey = hash(service + params + upstream cacheKeys).
// On re-run:
// • cacheKey unchanged → mark "cached", skip execution, reuse result
// • params edited → cacheKey changes → re-execute that stage
// • downstream stages → their cacheKeys change too (they hash the
// upstream's cacheKey) → automatic staleness
// This mirrors ComfyUI's server-side prompt-hash caching, but at the
// flow level and client-side — so re-run is instant when nothing
// changed, and only the changed subtree re-executes when something did.
//
// NO STATEMENT FOOTGUN:
// All derived arrays (e.g. stagesByStatus) are computed in components via
// useMemo over the raw stages array — NEVER inside a selector. See the
// drawer-render.test.tsx StrictMode regression guard.

import { create } from "zustand"
import type { FlowState } from "./flowStoreTypes"
import { createRunSlice } from "./flowRunSlice"
import { createExecuteSlice } from "./flowExecuteSlice"
import { createAuthorSlice } from "./flowAuthorSlice"
import { createPersistSlice } from "./flowPersistSlice"

// Cut 6 file-size pivot: every top-level helper/type moved to sibling
// modules (flowStoreHelpers / flowStoreRevive / flowStoreTypes)
// and the action methods to the four slice factories — re-exported here so
// the public surface is unchanged.
export * from "./flowStoreHelpers"
export * from "./flowStoreRevive"
export * from "./flowStoreTypes"
export type { FlowState } from "./flowStoreTypes"

/// The store factory — called TWICE (Library + Agent) so the two surfaces
/// hold fully-independent state. NO LEAKS: a stage added on the Library
/// canvas never appears in the Agent chat, and an agent-built flow
/// never renders on the Library canvas.
export function createFlowStore() {
 return create<FlowState>((set, get) => ({
 flow: null,
 threadId: null,
 runningStageId: null,
 _abort: null,
 studioOpenTrigger: 0,
 pendingStudio: null,

 ...createRunSlice(set, get),
 ...createExecuteSlice(set, get),
 ...createAuthorSlice(set, get),
 ...createPersistSlice(set, get),
 }))
}

// ── ONE store, two view names (2026-08-13) ──────────────────────────────
// The 2026-08-07 "NO LEAKS" split — separate instances for the Library
// canvas and the Agent chat — is GONE. ONE_SURFACE made the Library tab a
// view of the same flow estate, and the directive ("Can we have one
// store? Why have two?") unified them: the canvas and the chat cards
// render the SAME doc, thread-keyed per conversation. useLibraryFlowStore
// is a compatibility ALIAS of the single instance — every importer keeps
// working while the semantics unify.
export const useAgentFlowStore = createFlowStore()
export const useLibraryFlowStore = useAgentFlowStore

// ── Test hook ────────────────────────────────────────────────────────────
// Exposed on window so LIVE Playwright tests can drive the store directly
// when the LLM agent is flaky. The chat path is always attempted first in
// the tests; this is the deterministic fallback that proves the end-to-end
// edit/generate flow produces REAL outputs. Without this hook, a flaky
// assistant turn (the DSH-lane chat sometimes drops tool calls) would
// block the entire proof chain. BOTH names exposed — they ARE the same
// instance since 2026-08-13; the deterministic test hook drives the agent
// surface (where chat-driven builds land) and the library canvas reads
// the same doc.
declare global {
 interface Window {
 __flowStore?: typeof useAgentFlowStore
 __libraryFlowStore?: typeof useLibraryFlowStore
 }
}
if (typeof window !== "undefined") {
 // Back-compat: __flowStore keeps pointing at the agent instance —
 // the deterministic test hook composes flows via the agent's
 // build_flow path; __libraryFlowStore is the same store.
 window.__flowStore = useAgentFlowStore
 window.__libraryFlowStore = useLibraryFlowStore
}
