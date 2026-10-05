/** forms-edge-meta.ts — the /v1/forms edge-meta session cache
 * (extracted from CardsTab.tsx hour 15: one seam, one file). */
import { fetchFormsTable } from '@melite/card-base/client';
/** The /v1/forms edge-meta cache (card id → declared input/output
 *  kinds) — ONE fetch per browser session; the picker's kind
 *  matching (THE EDGE LAW) reads it. A failed fetch leaves null and
 *  the picker falls to the unfiltered list (never blocks a pick). */
let formsEdgeMetaPromise = null;
export function loadFormsEdgeMeta() {
    formsEdgeMetaPromise ??= fetchFormsTable().then((rows) => {
        const out = {};
        for (const [id, row] of Object.entries(rows))
            out[id] = { inputs: row.inputs, outputs: row.outputs };
        return out;
    }).catch((e) => {
        formsEdgeMetaPromise = null; // retry on the next mount
        throw e;
    });
    return formsEdgeMetaPromise;
}
/** THE TEST RESET (the same seam the pick cell exports): the
 *  session cache is module state — a wall that needs the failed
 *  arm (or a fresh fetch) resets it between mounts. */
export function resetFormsEdgeMetaForTests() {
    formsEdgeMetaPromise = null;
}
//# sourceMappingURL=forms-edge-meta.js.map
