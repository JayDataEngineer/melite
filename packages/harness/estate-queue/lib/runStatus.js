// queue/runStatus.ts — the live-run status probe slot.
//
// STAGE 1 (DSH bundle split, 2026-09-08): reproduce/resume (queue
// arms) need the live-registry status owned by the runs door,
// but queue must not import doors (dsh service direction: leaves
// depend downward; availability flows upward). The door registers
// its probe at import (the setBusPublisher seam pattern); queue
// arms read the slot. Null probe = no live owner in this process.
let PROBE = null;
export function registerRunStatusProbe(fn) {
    PROBE = fn;
}
/** The row's live status, or null when this process owns no live
 *  row — mirrors `gw.runs.get(rid)` (the retired resume/reproduce
 *  doors). */
export function runStatus(runId) {
    if (PROBE === null)
        return null;
    return PROBE(runId);
}
//# sourceMappingURL=runStatus.js.map
