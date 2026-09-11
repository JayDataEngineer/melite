// flowStoreRevive — chain-run result hydration (Cut 6 file-size
// pivot). The pipe-carry revive (reviveFromPipeDoc) died with the wire
// 2026-09-05: no gateway ever stashed pipe/stage_id, flow_doc was never
// emitted — the ONLY revive rail is the run registry's own records.
import { collectStageUrls, collectNamedArtifacts } from "@/rpc/editorClient"
import type { FlowRunStatus } from "@melite/catalog"
import type { FlowDoc, FlowStage } from "@melite/contracts"
import { serverStatusToCard, readSeedFromBrick, asArtifactSource } from "./flowStoreHelpers"

/**
 * Hydrate a chain run's per-step results onto a loaded spec's cards, by
 * index (the run protocol's stages ARE the spec's steps, in order).
 * Statuses + artifacts + errors only — params/wiring stay as loaded.
 */
export function hydrateChainResults(flow: FlowDoc, status: FlowRunStatus): FlowStage[] {
 const raw = status.stages ?? [] // FlowRunStage[] satisfies the loose protocol view structurally
 return flow.stages.map((s, i) => {
 const r = raw[i]
 if (!r) return s
 // Watchdog — same dead-run demotion as hydrateRunStages (2026-08-10):
 // "running" in a persisted chain-run protocol is a run that died
 // mid-flight, never a live one at hydrate time.
 const rawSt = serverStatusToCard(String(r.status ?? "pending"))
 const st = rawSt === "running" ? "pending" : rawSt
 const hasArtifacts = Boolean(r.url) || (Array.isArray(r.gallery) && r.gallery.length > 0)
 const hasResult = (st === "done" || st === "cached") && hasArtifacts
 return {
 ...s,
 status: st,
 error: st === "error"
 ? (typeof r.error === "string" && r.error ? r.error : "Step failed")
 : null,
 result: hasResult
 ? {
 assetUrls: collectStageUrls([asArtifactSource(r)]),
 artifacts: collectNamedArtifacts([asArtifactSource(r)]),
 metadata: {
 runId: String(status.run_id ?? ""),
 stageId: String(r.id ?? ""),
 // The actual seed this brick resolved (2026-08-13): the runner
 // stamps the concrete int onto brick.params.seed. Read defensively
 // — RunProtocolStage's generated core doesn't declare params, but
 // the runner always sends it. actualSeedFromStatus is per-run; for
 // per-brick granularity read the brick's own params below.
 actualSeed: readSeedFromBrick(r),
 },
 completedAt: Date.now(),
 durationSec: Number(r.secs ?? 0),
 }
 : s.result,
 }
 })
}


