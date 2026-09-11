// flowAuthorSlice — startFlow / addStage / removeStage /
// reorderStage / reorderRange / groupStages / ungroupStages / setSlotInput /
// setSaveToAssets (Cut 6 file-size pivot). Method bodies verbatim from the
// origin flowStore.ts create call; the slice factory is the only seam.

import type { StoreApi } from "zustand"
import type { FlowState } from "./flowStoreTypes"
import { normalizeSlotParams, padInputs, stageSlots, canWireSlot } from "@melite/catalog"
import { familyGenre, formOf } from "@melite/catalog"
import { useToastStore } from "@melite/ui"
import { useHiddenRuns } from "../library/hiddenRuns"
import { enqueueStagePatch } from "./resultOutbox"
import type { FlowStage, FlowStatus, FlowStageStatus } from "@melite/contracts"
import { Provenance } from "@melite/contracts"
import { newFlowId, newStageId } from "./flowStoreHelpers"

type AuthorSlice = Pick<FlowState, "startFlow" | "addStage" | "removeStage" | "reorderStage" | "reorderRange" | "groupStages" | "ungroupStages" | "setSlotInput" | "setSaveToAssets">

export const createAuthorSlice = (
 set: StoreApi<FlowState>["setState"],
 get: () => FlowState,
): AuthorSlice => ({
 // ── USER AUTHORING (the card canvas) ─────────────────────────────────
 startFlow: (intent) => {
 // Don't blow away a running flow (same invariant as buildFlow).
 const current = get().flow
 const hasRunning = current && current.stages.some((s) => s.status === "running")
 if (hasRunning) {
 useToastStore.getState().addToast("info", "Flow is executing — wait for it to finish or press Cancel before starting a new one.")
 return
 }
 get()._abort?.abort()
 set({
 flow: {
 id: newFlowId(),
 intent: intent ?? "Untitled flow",
 stages: [],
 status: "draft",
 createdAt: Date.now(),
 completedAt: null,
 },
 runningStageId: null,
 _abort: null,
 })
 },

 addStage: async (descriptor) => {
 let flow = get().flow
 // No flow yet — start one named after this card.
 if (!flow) {
 flow = {
 id: newFlowId(),
 intent: descriptor.title,
 stages: [],
 status: "draft" as FlowStatus,
 createdAt: Date.now(),
 completedAt: null,
 }
 }
 const stage: FlowStage = {
 id: newStageId(),
 title: descriptor.title,
 subtitle: descriptor.subtitle,
 kind: descriptor.kind,
 service: descriptor.service,
 // Form-aware fold (2026-08-09): descriptor.service is the model
 // route → the form resolves the per-form alias table (edit cards
 // fold input_artifact → image1, never the phantom input_image).
 params: normalizeSlotParams({ ...descriptor.params }, formOf(descriptor.service), descriptor.service),
 // Default: NO inputs. The user wires explicitly via setStageInput so
 // we never inject an upstream asset the user didn't ask for.
 inputs: [],
 result: null,
 status: "pending" as FlowStageStatus,
 error: null,
 cacheKey: null,
 flowName: descriptor.flowName,
 studio: descriptor.studio,
 studioContext: descriptor.studioContext,
 // The user authored this via the UI (ServicePicker / capability tile).
 provenance: Provenance.user,
 }
 const stages = [...flow.stages, stage]
 // Status guard (2026-08-22 "adding cards mid-run"): appending while a pass
 // executes must NOT demote an active status — the Run/Cancel signal and the
 // chain onTick both read it. Running/queued stay; anything else goes stale
 // (the append invalidates cached downstream anyway).
 const ACTIVE: FlowStatus[] = ["running", "queued"]
 const status: FlowStatus =
   flow.status === "draft" ? "draft"
   : ACTIVE.includes(flow.status) ? flow.status
   : "stale"
 set({ flow: { ...flow, stages, status } })
 await get()._recomputeKeys()
 },

 removeStage: (stageId) => {
 const { flow } = get()
 if (!flow) return
 // Drop the stage + strip it from every other stage's inputs. Strips to
 // "" HOLES (per-slot invariant — inputs[i] ↔ stageSlots[i]) — never
 // reindex, or slot wiring would silently shift to another slot.
 //
 // Compound (2026-08-12): also strip the id from any compound parent's
 // childIds — a deleted member must not leave a stale reference (the
 // projection drops missing ids, but the data stays honest). If a
 // compound parent itself is removed, its children go on rendering as
 // free tiles (the parent only ever OWNED the grouping, not the
 // children's existence).
 const stages = flow.stages
 .filter((s) => s.id !== stageId)
 .map((s) => ({
 ...s,
 inputs: s.inputs.map((id) => (id === stageId ? "" : id)),
 ...(s.compound
 ? { compound: { ...s.compound, childIds: s.compound.childIds.filter((id) => id !== stageId) } }
 : {}),
 }))
 .filter((s) => !(s.kind === "compound" && (!s.compound || s.compound.childIds.length === 0)))
 const status: FlowStatus = stages.length === 0 ? "draft" : "stale"
 set({ flow: { ...flow, stages, status } })
 void get()._recomputeKeys()
 },

 reorderStage: (fromId, toId) => {
 const { flow } = get()
 if (!flow) return
 // arrayMove semantics (the dnd-kit drop contract): remove `fromId`,
 // then insert at `toId`'s post-removal index. Ids + inputs are left
 // untouched — wiring is by id, only the execution order changes.
 const stages = [...flow.stages]
 const from = stages.findIndex((s) => s.id === fromId)
 const to = stages.findIndex((s) => s.id === toId)
 if (from < 0 || to < 0 || from === to) return
 const [moved] = stages.splice(from, 1)
 stages.splice(to, 0, moved)
 // Order = execution order (runAll's composer branch iterates the array)
 // — a reordered canvas runs differently, so prior run results no longer
 // correspond. Same rule as removeStage: the flow goes stale.
 const status: FlowStatus = stages.length === 0 ? "draft" : "stale"
 set({ flow: { ...flow, stages, status } })
 void get()._recomputeKeys()
 },

 // 2026-08-12 (multi-edit condensation): same arrayMove contract as
 // reorderStage, generalized to a contiguous BLOCK — a collapsed chain of
 // consecutive same-family cards drags as one tile, and the grid maps
 // segment drags to this. The block is removed as a unit, then inserted
 // at `toId`'s post-removal index. Unknown ids or a missing anchor → no-op.
 reorderRange: (fromIds, toId) => {
 const { flow } = get()
 if (!flow) return
 const stages = [...flow.stages]
 const block = fromIds
   .map((id) => stages.find((s) => s.id === id))
   .filter((s): s is FlowStage => Boolean(s))
 if (block.length === 0 || block.length !== fromIds.length) return
 const blockSet = new Set(fromIds)
 const rest = stages.filter((s) => !blockSet.has(s.id))
 const to = rest.findIndex((s) => s.id === toId)
 if (to < 0) return
 rest.splice(to, 0, ...block)
 const status: FlowStatus = rest.length === 0 ? "draft" : "stale"
 set({ flow: { ...flow, stages: rest, status } })
 void get()._recomputeKeys()
 },

 // groupStages (2026-08-12 formalization) — wrap N existing stages into a
 // compound parent. The ONE authoring primitive for "card holds other
 // cards": the UI's "group selection" affordance + the agent's explicit
 // grouping path both land here. The parent is inserted at the FIRST
 // member's array position; members stay in place (the projection skips
 // them inside the parent's segment). Re-grouping members that already
 // belong to another compound re-parents them (the old parent's childIds
 // are pruned; an emptied parent is dropped).
 groupStages: (childIds, mode = "fanout", title) => {
 const { flow } = get()
 if (!flow || childIds.length < 2) return null
 // Validate every id exists; dedupe preserving order.
 const seen = new Set<string>()
 const ordered = childIds.filter((id) => {
 if (seen.has(id)) return false
 seen.add(id)
 return flow.stages.some((s) => s.id === id)
 })
 if (ordered.length < 2) return null

 // Build the parent. Its array position = the first member's position so
 // the segment renders where the user expects.
  const parentId = newStageId()
 const parent: FlowStage = {
 id: parentId,
 title: title ?? `${ordered.length} cards`,
 kind: "compound",
 service: "",
 params: {},
 inputs: [],
 result: null,
 status: "pending" as FlowStageStatus,
 error: null,
 cacheKey: null,
 compound: { mode, childIds: ordered },
 provenance: Provenance.user,
 }

 // Re-parent: prune these ids from any OTHER compound parent (a member
 // belongs to exactly one group). Drop parents that fall below 2 children
 // — a 1-child compound is degenerate (groupStages requires ≥ 2, so a
 // sub-2-child parent can only arise from this pruning path).
 const childSet = new Set(ordered)
 const next = flow.stages
 .map((s) => {
 if (!s.compound) return s
 const pruned = s.compound.childIds.filter((id) => !childSet.has(id))
 if (pruned.length === s.compound.childIds.length) return s
 if (pruned.length < 2) return null // degenerate → drop
 return { ...s, compound: { ...s.compound, childIds: pruned } }
 })
 .filter((s): s is FlowStage => s !== null)

 // Insert the parent at the first member's original position (in the
 // pruned array, so the index is stable against prior removals).
 const insertIdx = Math.max(0, next.findIndex((s) => s.id === ordered[0]))
 next.splice(insertIdx, 0, parent)

 const status: FlowStatus = next.length === 0 ? "draft" : "stale"
 set({ flow: { ...flow, stages: next, status } })
 void get()._recomputeKeys()
 return parentId
 },

 ungroupStages: (parentId) => {
 const { flow } = get()
 if (!flow) return false
 const parent = flow.stages.find((s) => s.id === parentId)
 if (!parent || parent.kind !== "compound") return false
 // Drop the parent; children stay where they are (they were never
 // nested — only referenced by id).
 const stages = flow.stages.filter((s) => s.id !== parentId)
 const status: FlowStatus = stages.length === 0 ? "draft" : "stale"
 set({ flow: { ...flow, stages, status } })
 void get()._recomputeKeys()
 return true
 },

 setSlotInput: async (stageId, slotKey, upstreamStageId, outputName) => {
 const { flow } = get()
 if (!flow) return
 // ── Type guard (2026-08-12): reject wires where the upstream's output
 // kind is incompatible with the slot's expected kind. canWireSlot is
 // permissive for unknowns (returns true when either side is "any") —
 // only a DECLARED mismatch (e.g. audio→input_glb) is blocked. The
 // backend's validate_flow_input_types is the second line of
 // defense; this is the UI gate that stops the wrong wire before the
 // request reaches the server.
 if (upstreamStageId) {
 const upstream = flow.stages.find((s) => s.id === upstreamStageId)
 if (upstream) {
 const genre = familyGenre(upstream.service)
 if (!canWireSlot(genre, slotKey)) {
 console.warn(
 `[setSlotInput] rejected: upstream "${upstream.service}" ` +
 `(genre=${genre ?? "?"}) is incompatible with slot ` +
 `"${slotKey}" — wire blocked by the slot-type guard.`,
 )
 return
 }
 }
 }
 const stages = flow.stages.map((s) => {
 if (s.id !== stageId) return s
 // Resolve the slot key → its index in the stage's declared slot
 // list. Unknown slot (not in params) = no-op — never guess.
 const slots = stageSlots(s.params, formOf(s.service), s.service)
 const idx = slots.indexOf(slotKey as (typeof slots)[number])
 if (idx === -1) return s
 const inputs = padInputs(s.inputs, slots)
 inputs[idx] = upstreamStageId ?? ""
 // Parallel output-name array: which named output to consume from
 // inputs[idx]. null = primary (assetUrls[0]). Mask → lanpaint_mask is
 // the first instance; the picker sends the name the user selected.
 const inputOutputs = padInputs(s.inputOutputs ?? [], slots).map((v) => v ?? null)
 inputOutputs[idx] = outputName ?? null
 return { ...s, inputs, inputOutputs }
 })
 set({ flow: { ...flow, stages, status: "stale" as FlowStatus } })
 await get()._recomputeKeys()
 // SERVER PERSIST (2026-08-22 "I can't chain from previous output"):
 // wires lived ONLY in the client store + localStorage mirror — the
 // agent/backend never saw them, so a rehydrate (history restore, new
 // tab, agent rebuild) resurrected the draft UNWIRED. The same durable
 // outbox that carries run results now carries the wire arrays too.
 const wired = get().flow?.stages.find((s) => s.id === stageId)
 if (wired) {
  enqueueStagePatch(flow.id, stageId, {
   inputs: wired.inputs,
   inputOutputs: (wired.inputOutputs ?? wired.inputs.map((): null => null)) as (string | null)[],
  })
 }
 },

 // setSaveToAssets (2026-08-12) — flip the per-stage saveToAssets flag.
 // false = hide this card's output from the left sidebar. The hiddenRuns
 // store is updated IMMEDIATELY for the stage's current runId (so the
 // sidebar filters it out / reveals it at once); future runs consult the
 // flag at completion (see executeStage's saveToAssets===false branch).
 setSaveToAssets: (stageId, value) => {
 const { flow } = get()
 if (!flow) return
 const stage = flow.stages.find((s) => s.id === stageId)
 if (!stage) return
 const runId = String(stage.result?.metadata?.runId ?? stage.result?.metadata?.id ?? "")
 if (runId) {
 if (value === false) useHiddenRuns.getState().hideRun(runId)
 else useHiddenRuns.getState().unhideRun(runId)
 }
 set({
 flow: {
 ...flow,
 stages: flow.stages.map((s) =>
 s.id === stageId ? { ...s, saveToAssets: value } : s,
 ),
 status: flow.status === "draft" ? "draft" : "stale",
 },
 })
 },

})
