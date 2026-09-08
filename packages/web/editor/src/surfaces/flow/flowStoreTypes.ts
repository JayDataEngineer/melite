// flowStoreTypes — the FlowState contract of the flow store
// (Cut 6 file-size pivot). Verbatim from the origin flowStore.ts.

import type { StageMutation, StageMutationResult, DocMutation, DocMutationResult } from "@melite/formats"

import type { FlowDoc, StageDescriptor, StudioTarget, BackendDraft } from "@melite/contracts"
import type { FlowRunStatus } from "@melite/catalog"
// ── Store type ────────────────────────────────────────────────────────────

export interface FlowState {
 /** The active flow document. null = no flow composed yet. */
 flow: FlowDoc | null
 /**
 * Which conversation this store currently shows. ONE store since
 * 2026-08-13 (the library name aliases it) — switching conversations
 * swaps BOTH the chat cards and the Library canvas to that thread's
 * flow (or clears them for a new chat). Snapshots persist per-thread
 * (`melite:flow:v2:agent:<threadId>`, flowThreadKeys.ts).
 */
 threadId: string | null
 /** When a stage is running, its ID — for UI spinners. null when idle. */
 runningStageId: string | null
 /** Abort controller for the in-flight execution. Not in React state. */
 _abort: AbortController | null

 /**
 * Studio-open event channel. WorkspaceLayout subscribes to
 * `studioOpenTrigger` and reads `pendingStudio` when it changes.
 * This is how a studio-link card asks the shell to switch tabs +
 * load context into the studio store.
 */
 studioOpenTrigger: number
 pendingStudio: { target: StudioTarget; context: Record<string, unknown> | undefined } | null

 // ── Actions ─────────────────────────────────────────────────────────
 /**
 * Hydrate the store from a backend flow DRAFT (2026-08-13: the
 * agent's build_flow now constructs SERVER-side — the browser is a
 * dumb renderer). The backend already resolved capabilities, folded
 * slot params, null-seeded inputs, and resolved inputIndices; this
 * action adopts the stages AS-IS and fills only render state
 * (result/status/error/cacheKey). The draft's id becomes the flow
 * id — one draft, one flow. Replaces any prior flow (same
 * executing guard + idempotency: hydrating the same draft twice is a
 * no-op).
 */
 hydrateDraft: (draft: BackendDraft) => Promise<{ ok: boolean; error?: string }>
 /**
 * MISSING-RESULT HEAL (2026-08-14) — for every stage of the current
 * flow that has NO result, ask the backend's rehydration-heal
 * endpoint to resolve one from the durable sources (draft PATCH result,
 * else the run registry via the pipe-carry). Heals threads whose output
 * previews were lost (quota-evicted snapshot, PATCH that never landed,
 * pre-feature threads) — the card flips to done WITH its image. Returns
 * the number of stages healed. Best-effort: a stage with no answer
 * anywhere stays exactly as it was (pending is honest).
 */
 _healStageResults: (draftId: string) => Promise<number>
 /** Update a stage's params (and optionally its service/model key).
 * Marks the stage + all downstream as "stale" when keys change.
 *
 * Returns { ok: false, error } if the stageId doesn't exist — the .map
 * below used to silently return unchanged stages on a bad stageId, making
 * stale-stageId bugs (agent rebuilt the flow, old stageIds gone)
 * invisible. Now every caller — agent tools, UI onEditSave, RPC client —
 * gets fail-loud validation at the store level. UI callers that ignore
 * the return value are unaffected (void-compatible). */
 updateStageParams: (stageId: string, params: Record<string, unknown>, service?: string, opts?: { userEdit?: boolean }) => Promise<{ ok: boolean; error?: string }>
 /**
 * Schema-enforced card mutation (rename, …) — the declarative gate from
 * lib/cardMutations. Pure cosmetic: NO staleness marking, NO cacheKey
 * recompute (title is not part of the key).
 */
 applyStageMutation: (stageId: string, mutation: StageMutation) => StageMutationResult
 /**
 * Schema-enforced FLOW-doc mutation (the flow rename, 2026-08-09)
 * — the doc-level sibling of applyStageMutation, same gate discipline.
 * Pure cosmetic: NO staleness marking, NO cacheKey recompute. In-memory +
 * wire: runs pick the name up via startChain; a reload
 * reverts to the authored name.
 */
 applyDocMutation: (mutation: DocMutation) => DocMutationResult
 /** Execute a single stage via the right backend. */
 executeStage: (stageId: string) => Promise<void>
 /** Execute the whole flow — all stages in dependency order. */
 runAll: (fromIndex?: number) => Promise<void>
 /**
 * Re-run from a specific stage. Upstream stages with unchanged cacheKeys
 * are marked "cached" (skipped, results reused). The target stage + all
 * downstream re-execute.
 */
 reRunFrom: (stageId: string) => Promise<void>
 /**
 * Request opening a studio-link stage in its studio. Emits the
 * `studioOpenTrigger` event so WorkspaceLayout can switch tabs + load
 * the context into the studio store. Returns the target studio or null.
 */
 openInStudio: (stageId: string) => "pose" | "director" | "body" | null
 /** WorkspaceLayout calls this after handling the studio-open request. */
 consumeStudioOpen: () => void
 /** Clear the flow. */
 clear: () => void
 /**
 * Cancel the in-flight run — the action behind the Cancel button the
 * gates actually promise ("wait for it to finish or press Cancel").
 * Three arms, all independent:
 *   1. POST /v1/flows/stop/{run_id} per live stage runId — the
 *      queue's stop door reaches into the render (the #1 reason a
 *      run never resolves is a wedged sampler).
 *   2. `_abort.abort()` — the awaited run fetch rejects AbortError →
 *      the run paths' catch marks stages pending (never a silent
 *      "done" lie).
 *   3. Coerce any remaining "running" stages to "pending" SYNCHRONOUSLY
 *      — covers a rehydrated phantom (a reloaded doc carries
 *      status:"running" with NO live run: the poll died with the page).
 *      Logged loudly; the AbortError catch's later write is idempotent.
 */
 cancelRun: () => void
 /**
 * The conversation this store now shows (AGENT store). Swaps `flow`
 * to that thread's persisted snapshot — or null for a fresh chat /
 * unknown thread. Also the ONLY mover between the legacy null-thread key
 * and a named thread key: a flow built on the unnamed default chat
 * belongs to the conversation the next auto-mirror names.
 *
 * callers: AutoThreadPersister's mirror + the boot canvas restore
 * (storePersistence). NO-OP when the thread is unchanged.
 */
 setFlowThread: (threadId: string | null) => void

 // ── USER AUTHORING (the card canvas) ────────────────────────────────
 // The agent feeds buildFlow(); the USER feeds these. Same execution
 // machinery, same cache, same upstream-wiring — just an incremental
 // authoring path so the user can compose a flow card by card in the
 // canvas surface (the ComfyUI-subgraph model: add a card, fiddle, string
 // them together, run).
 /**
 * Start an empty draft flow. The user authors cards into it via
 * addStage. If a flow already exists and isn't running, this resets
 * it (explicit user intent — "New").
 */
 startFlow: (intent?: string) => void
 /**
 * Add a stage to the active flow (starting one if none exists).
 * Default inputs: NONE — the user wires cards explicitly via
 * setSlotInput. Avoids wrong param injection (music gen does not want
 * the prior image gen's output). Recomputes cacheKeys.
 */
 addStage: (descriptor: StageDescriptor) => Promise<void>
 /** Remove a stage + drop it from every other stage's inputs. */
 removeStage: (stageId: string) => void
 /**
 * Reorder the stage array — drag order = flow order. The canvas runs
 * `flow.stages` in ARRAY order (runAll's composer branch), so a
 * reorder changes what "run" executes and in what sequence. Stages keep
 * their ids + inputs (wiring is by id, not by position).
 */
 reorderStage: (fromId: string, toId: string) => void
 /**
 * Reorder a CONTIGUOUS BLOCK of stages as one unit (2026-08-12, the
 * multi-edit condensation: a collapsed chain of N consecutive edit_image
 * cards drags as one tile). arrayMove semantics generalized: remove the
 * block, then insert at `toId`'s post-removal index. Ids + inputs are
 * untouched — wiring is by id, only the execution order changes. Same
 * stale/recompute contract as reorderStage.
 */
 reorderRange: (fromIds: string[], toId: string) => void
 /**
 * Wrap N existing stages into a COMPOUND parent (2026-08-12 formalization).
 * The ONE first-class "card holds other cards" authoring primitive — the
 * UI's "group these cards" affordance and the agent's explicit-group path
 * both land here. Creates a compound parent (mode defaults to ``fanout`` —
 * view-grouped siblings), inserts it at the FIRST member's position, and
 * leaves the members in place (the projection skips them inside the
 * parent's segment). Idempotent: re-grouping members already in a compound
 * re-parents them. Returns the new parent's id (or null on a no-op).
 */
 groupStages: (childIds: string[], mode?: "fanout" | "flow" | "modifiers", title?: string) => string | null
 /**
 * Dissolve a compound parent — ungroup its children. The parent is removed
 * (children stay as free tiles in their current positions). No-op (returns
 * false) when ``parentId`` isn't a compound stage.
 */
 ungroupStages: (parentId: string) => boolean
 /**
 * Wire (or unwire) a stage's input SLOT to an upstream stage. slotKey is
 * one of the stage's declared input slots (stageSlots); pass null to
 * disconnect. Per-slot: slot i of the inputs array ↔ stageSlots[i], so
 * wiring slot 1 (e.g. last_frame) never touches slot 0 (first_frame).
 * outputName selects a NAMED output from the upstream (mask, detection, …)
 * when the upstream is multi-output; null/omitted = the primary
 * (assetUrls[0]). Recomputes cacheKeys so downstream cards go stale.
 */
 setSlotInput: (stageId: string, slotKey: string, upstreamStageId: string | null, outputName?: string | null) => Promise<void>
 /**
 * Toggle whether a stage's output appears in the left sidebar asset library
 * (2026-08-12). undefined / true = saved (default). false = the artifact
 * still persists on disk + renders on the card, but the sidebar filters it
 * out — intermediate generations don't clog the library. Immediately
 * hides/unhides the stage's current runId via the hiddenRuns store; future
 * runs consult the flag at completion time (see executeStage).
 */
 setSaveToAssets: (stageId: string, value: boolean) => void
 /**
 * Hydrate the canvas from a past run — "click a flow → it populates
 * the cards" (Library sidebar, task #74). The run protocol's stages ARE
 * the flow doc: each server stage {family_id, params, status, url,
 * gallery, secs, error, outputs, consumes} materializes into a card with
 * its result already attached (done/cached/reused stages carry their
 * artifact URLs). Card wiring follows the run's declared outputs/consumes
 * names — the SAME topology the runner executed, so the hydrated canvas
 * is a 1:1 of the run, not a flattened list. cacheKeys are computed like
 * buildFlow — editing a hydrated card goes stale, re-run re-executes
 * only the changed subtree.
 */
 loadRun: (intent: string, status: FlowRunStatus) => Promise<void>
 /**
 * Fetch a run's status and hydrate the canvas from it — the ONE "load a
 * past run" action (Library rail's Flows list, the media drawer's
 * "Open as cards", the AppSidebar recover action). Surfaces call this with
 * a run_id; the status fetch + intent fallback + loadRun live here so no
 * surface re-implements the flow (rule 4).
 */
 loadRunById: (runId: string, intent?: string) => Promise<void>
 /** Internal: hydrate a finished graph run onto the canvas cards. */
 _finishChainRun: (status: FlowRunStatus, runId: string, label: string) => Promise<void>
 /** Internal: recompute cacheKeys after a param change. */
 _recomputeKeys: () => Promise<void>
}

