// flowCards — the store → ONE card view-model adapter.
//
// presentational pieces) lives in ./FlowCard and knows nothing about any
// surface's store. This module maps a flow store's document into the
// CardStage view-model and builds the CardActions callbacks (run/re-run,
// edit-save, open-in-studio). Every surface that renders cards — the Library
// canvas (FlowCanvas) and the agent tab's inline cards
// (InlineFlowCards) — consumes this SAME adapter, but each passes its
// OWN store hook so the Library and Agent surfaces hold fully-isolated
import type { StoreApi, UseBoundStore } from "zustand"
import type { FlowDoc, FlowStage } from "@melite/contracts"
import type { FlowState } from "./flowStore"
import type { CardStage, CardActions } from "@melite/contracts"
import { familyGenre } from "@melite/catalog"

/** Either of the two flow stores (Library or Agent). */
type AnyFlowStore = UseBoundStore<StoreApi<FlowState>>

/**
 * Maps a flow store's document into the card kit's view-model. Surfaces
 * differ in how they feed cards, not how cards render — so this adapter's
 * only job is the mapping + the action callbacks. Callers pass their OWN
 * store hook (Library or Agent); the canvas and the chat each render from
 * their own state tree and never share a stage.
 */
export function useFlowCards(useStore: AnyFlowStore) {
 const flow = useStore((s) => s.flow)
 const runningStageId = useStore((s) => s.runningStageId)
 const executeStage = useStore((s) => s.executeStage)
 const reRunFrom = useStore((s) => s.reRunFrom)
 const updateStageParams = useStore((s) => s.updateStageParams)
 const applyStageMutation = useStore((s) => s.applyStageMutation)
 const openInStudio = useStore((s) => s.openInStudio)
 const reorderStage = useStore((s) => s.reorderStage)
 const reorderRange = useStore((s) => s.reorderRange)
 const setSlotInput = useStore((s) => s.setSlotInput)
 const setSaveToAssets = useStore((s) => s.setSaveToAssets)
 const groupStages = useStore((s) => s.groupStages)
 const ungroupStages = useStore((s) => s.ungroupStages)
 const runAll = useStore((s) => s.runAll)
 const clear = useStore((s) => s.clear)
 const cancelRun = useStore((s) => s.cancelRun)
 // The gate's own test: a stage stuck "running" (with or without a live
 // controller — a rehydrated phantom has runningStageId null). "queued"
 // (backend ONE-GPU queue) also counts — its run will start, so the card
 // must show in-flight semantics and the Cancel button.
 const hasRunningStage = flow?.stages.some(
   (s) => s.status === "running" || s.status === "queued",
 ) ?? false

 const stages: CardStage[] = (flow?.stages ?? []).map((s) => stageToCardStage(s, flow!))

 const actions: CardActions = {
 // Graph-backed (loaded YAML spec OR agent-composed typed flow): the
 // WHOLE graph is the unit of execution. A card Run/Re-run triggers
 // runAll — ONE start for the FULL graph. A typed graph is
 // atomic on the py gateway: no start_from / reuse_run_id /
 // stop_after / overrides exist on the flow doors (the C-era
 // sends were silent drops), so routing through executeStage
 // buys nothing — Run means the whole graph, one run_id,
 // cards == bricks. This also keeps the historical
 // "recreate flow only recreates one part of the flow" bug dead
 // (the single-step test mode that caused it is retired).
 // Compile path (user-authored cards): CARD PLAY RUNS THE CARD —
 // executeStage, regardless of done/stale/pending/error (2026-08-18:
 // "WHEN I ZOOM IN ON A CARD AND IT PLAY… IT SHOULD ONLY RUN WHAT IS
 // NECESSARY FOR THAT CARD! IT SHOULDN'T GO FORWARDS!!!"). The old
 // done/stale → reRunFrom cascaded: it marked the clicked card AND
 // EVERY DOWNSTREAM as pending and re-executed the lot — zoom + play
 // on a mid-pipe card silently re-ran the whole tail. executeStage
 // runs exactly the card; its DEPENDENCY AUTO-RUN covers the "what is
 // necessary" half (un-executed producers run first, done upstreams
 // feed via collectUpstreamResults); downstream stages are only MARKED
 // stale at completion (the stale flag) and wait for the user — never
 // an automatic forward pass. "Re-run the whole tail" remains a
 // deliberate act: the canvas header's Run button (reRunFrom from the
 // first stage / runAll).
 onRun: (id) => {
 if (flow?.flowName || flow?.inlineFlow) {
 runAll()
 return
 }
 executeStage(id)
 },
 // Tile-level stop (2026-08-13): the play button becomes stop while a card
 // is running. cancelRun is the whole-run action — only one stage runs at a
 // time inline, and a chain run is all-stages, so it IS "stop this card".
 onCancel: () => cancelRun(),
 onEditSave: (id, params, service, opts) => updateStageParams(id, params, service, opts),
 onRename: (id, title) => applyStageMutation(id, { kind: "rename", value: title }),
 onOpenInStudio: (id) => openInStudio(id),
 // Phase A/B wiring — the store's indexed per-slot setter. SlotGrid
 // clears params[slot] through onEditSave on the same action, so the
 // wired/manual mutual-exclusion lives in the UI contract, not here.
 onWireSlot: (id, slotKey, upstreamId, outputName) => setSlotInput(id, slotKey, upstreamId, outputName),
 // Save-to-assets toggle (2026-08-12): hide/unhide the card's output in
 // the left sidebar. The store immediately updates the hiddenRuns filter.
 onToggleSaveToAssets: (id, value) => setSaveToAssets(id, value),
 // Compound grouping (2026-08-12): wrap N selected stages into one
 // compound parent; dissolve one. The grid's floating "Group" bar + the
 // Ungroup affordance on ChainCardTile are the only callers.
 onGroupStages: (childIds, mode, title) => groupStages(childIds, mode, title),
 onUngroupStages: (parentId) => ungroupStages(parentId),

 }

 return { flow, stages, runningStageId, hasRunningStage, actions, reorderStage, reorderRange, runAll, reRunFrom, clear, cancelRun }
}

function stageToCardStage(stage: FlowStage, flow: FlowDoc): CardStage {
 return {
 id: stage.id,
 title: stage.title,
 subtitle: stage.subtitle,
 kind: stage.kind,
 service: stage.service,
 // Genre from the model route — schema-declared per family in the
 // catalog YAML (genre:), driving the badge icon + video gating.
 genre: familyGenre(stage.service),
 params: stage.params,
 inputs: stage.inputs,
 // Resolve upstream stage ids → 0-based indices in THIS flow, so the
 // "← from 01" badge stays store-free (the card never touches the store).
 inputIndices: stage.inputs
 .map((id) => flow.stages.findIndex((s) => s.id === id))
 .filter((i) => i >= 0),
 result: stage.result
 ? {
 assetUrls: stage.result.assetUrls,
 artifacts: stage.result.artifacts,
 metadata: stage.result.metadata,
 durationSec: stage.result.durationSec,
 }
 : null,
 inputOutputs: stage.inputOutputs,
 status: stage.status,
 error: stage.error,
 // Live KSampler step progress → the per-card loading bar (2026-08-08).
 progress: stage.progress ?? null,
 // Live WS activity → the per-card activity line (2026-08-10).
 activity: stage.activity ?? null,
 // The agent-generated marker — pass through from the flow stage.
 provenance: stage.provenance,
 // the drilldown — the tile carries just the UpstreamBadge). SlotGrid
 // derives its own wired/attached state from stage.inputs + params,
 // and the tile's UpstreamBadge resolves indices from stage.inputs.
 meta: { studio: stage.studio },
 // Compound (2026-08-12 formalization): pass the subgraph block through
 // so the projection (subgraph.projectSubgraphs, wired via
 // segmentFlow) can collapse this card's children into one segment.
 // Non-compound stages never carry this field.
 compound: stage.compound,
 // Save-to-assets flag (2026-08-12) — false = the output is hidden from
 // the left sidebar. The tile + drilldown render the toggle's state from
 // this; the store's setSaveToAssets keeps it in sync.
 saveToAssets: stage.saveToAssets,
 }
}
