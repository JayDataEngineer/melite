/** forms-edge-meta.ts — the /v1/forms edge-meta session cache
 * (extracted from CardsTab.tsx hour 15: one seam, one file). */

import { fetchFormsTable } from '@melite/card-base/client'

/** The /v1/forms edge-meta cache (card id → declared input/output
 *  kinds) — ONE fetch per browser session; the picker's kind
 *  matching (THE EDGE LAW) reads it. A failed fetch leaves null and
 *  the picker falls to the unfiltered list (never blocks a pick). */
let formsEdgeMetaPromise: Promise<Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }>> | null = null
export function loadFormsEdgeMeta(): Promise<Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }>> {
  formsEdgeMetaPromise ??= fetchFormsTable().then((rows) => {
    const out: Record<string, { inputs?: Record<string, string>; outputs?: Record<string, string> }> = {}
    for (const [id, row] of Object.entries(rows)) out[id] = { inputs: row.inputs, outputs: row.outputs }
    return out
  }).catch((e: unknown) => {
    formsEdgeMetaPromise = null // retry on the next mount
    throw e
  })
  return formsEdgeMetaPromise
}

/** THE TEST RESET (the same seam the pick cell exports): the
 *  session cache is module state — a wall that needs the failed
 *  arm (or a fresh fetch) resets it between mounts. */
export function resetFormsEdgeMetaForTests(): void {
  formsEdgeMetaPromise = null
}
