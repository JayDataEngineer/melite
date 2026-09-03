// pipelineSpecDrag — the pipeline-TEMPLATE drag contract (2026-08-25).
//
// A PipelinesSection row is DRAGGABLE alongside its click-to-load: the
// same "drag is the click's peer" law the capability tiles obey
// (capabilityCards.ts). The payload carries ONLY the spec's identity —
// {name, filename} — because a pipeline is not a resolved card; the drop
// target loads the WHOLE spec through loadPipelineSpec (describeChain →
// one action card per step), it never repurposes a single card.
//
// The MIME is deliberately distinct from the other two sidebar contracts
// so one drop target can tell all three apart:
//   application/tech-noir-capability → populate ONE card's identity
//   application/tech-noir-asset      → attach media to a slot / Ops card
//   application/tech-noir-pipeline   → load the spec as its action cards
export const PIPELINE_DRAG_MIME = "application/tech-noir-pipeline"

/** What a pipeline row writes to the drag data store. `filename` is the
 *  wire key (POST /v1/pipelines/yaml/detail); `name` rides along for
 *  drop-target toasts/diagnostics. */
export interface PipelineDropPayload {
  name: string
  filename: string
}

/** Serialize a pipeline row onto the drag data store. */
export function pipelineDragPayload(name: string, filename: string): string {
  return JSON.stringify({ name, filename } satisfies PipelineDropPayload)
}

/** Parse the pipeline MIME off a drop event. null = absent or malformed
 *  (the drop target falls through to the capability/asset/file paths). */
export function parsePipelineDrop(raw: string): PipelineDropPayload | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as Partial<PipelineDropPayload>
    if (typeof p.name === "string" && typeof p.filename === "string") {
      return { name: p.name, filename: p.filename }
    }
    return null
  } catch {
    return null
  }
}