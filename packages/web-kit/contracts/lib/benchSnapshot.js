function isRecord(v) {
    return typeof v === 'object' && v !== null && !Array.isArray(v);
}
/** THE LOAD-CRITICAL ROW LAW (see the module doc). Returns the
 * row's problem, or null when the row loads. */
function rowProblem(row, at) {
    if (!isRecord(row))
        return `stages[${at}]: not an object`;
    const id = row['id'];
    if (typeof id !== 'string' || id === '')
        return `stages[${at}]: id must be a non-empty string`;
    const params = row['params'];
    if (params !== undefined && !isRecord(params))
        return `stages[${at}]: params must be an object`;
    const inputs = row['inputs'];
    if (inputs !== undefined && !isRecord(inputs))
        return `stages[${at}]: inputs must be an object`;
    const engine = row['engine'];
    if (engine !== undefined && typeof engine !== 'string')
        return `stages[${at}]: engine must be a string`;
    const card = row['card'];
    if (card !== undefined && typeof card !== 'string')
        return `stages[${at}]: card must be a string`;
    const children = row['children'];
    if (children !== undefined && !Array.isArray(children))
        return `stages[${at}]: children must be an array`;
    return null;
}
/** Judge a stage list exactly as the loader consumes it (the
 * wrapper below is its only public face). */
function parseBenchSnapshotStages(value) {
    if (!Array.isArray(value))
        return { ok: false, problems: ['stages: must be an array'] };
    const stages = [];
    const problems = [];
    for (let i = 0; i < value.length; i++) {
        const problem = rowProblem(value[i], i);
        if (problem !== null)
            problems.push(problem);
        else
            stages.push(value[i]);
    }
    if (problems.length > 0)
        return { ok: false, problems };
    return { ok: true, value: stages };
}
/** Judge a `bench_snapshot` body exactly as the loader consumes
 * it. A partial row set is NOT a pass — one bad row refuses the
 * whole snapshot (the loader posts the list whole; a silent
 * partial restore is the fabrication this contract exists to
 * kill). */
export function parseBenchSnapshot(value) {
    if (!isRecord(value))
        return { ok: false, problems: ['bench_snapshot: not an object'] };
    const stages = parseBenchSnapshotStages(value['stages']);
    if (!stages.ok) {
        return { ok: false, problems: stages.problems.map((p) => `bench_snapshot.${p}`) };
    }
    const intent = value['intent'];
    if (intent !== undefined && typeof intent !== 'string') {
        return { ok: false, problems: ['bench_snapshot.intent: must be a string'] };
    }
    const head = value['bench_head'];
    if (head !== undefined && !isRecord(head)) {
        return { ok: false, problems: ['bench_snapshot.bench_head: must be an object'] };
    }
    return {
        ok: true,
        value: {
            stages: stages.value,
            intent: typeof intent === 'string' ? intent : '',
            ...(head !== undefined ? { bench_head: head } : {}),
        },
    };
}
/** Judge a `card_snapshot` body exactly as the loader consumes it. */
export function parseCardSnapshot(value) {
    if (!isRecord(value))
        return { ok: false, problems: ['card_snapshot: not an object'] };
    const card = value['card'];
    if (typeof card !== 'string' || card === '') {
        return { ok: false, problems: ['card_snapshot.card: must be a non-empty string'] };
    }
    const params = value['params'];
    if (params !== undefined && !isRecord(params)) {
        return { ok: false, problems: ['card_snapshot.params: must be an object'] };
    }
    return { ok: true, value: { card, params: isRecord(params) ? params : {} } };
}
/** Run-output memory keys that NEVER ride a snapshot (the
 * cross-bench history leak, 2026-09-23 — live proof
 * bench-session-2bd2a61f). The wand re-stamps the ran card's
 * preview from the run's own artifacts; archived memory belongs to
 * the bench that earned it. */
// the strip's keys are the CONTRACT's (benchStage.ts) — one list, named
// once, for the writer here and every arm that strips a row
import { RESTORED_PROVENANCE_SPELLING } from "./benchStage.js";
import { RESTORE_STRIP_KEYS } from "./benchStage.js";
const RUN_MEMORY_KEYS = RESTORE_STRIP_KEYS;
/** THE SAVE LAW — contract a bench's stage rows into what may be
 * persisted as `bench_snapshot`. Never throws: an unloadable row
 * is dropped with a warning (the sidecar's warnings row carries
 * it), the loadable rest rides contracted. Idempotent:
 * save(save(x)) === save(x). */
export function saveBenchSnapshotStages(stages) {
    const out = [];
    const warnings = [];
    if (!Array.isArray(stages))
        return { stages: out, warnings };
    for (let i = 0; i < stages.length; i++) {
        const problem = rowProblem(stages[i], i);
        if (problem !== null) {
            warnings.push(`dropped unloadable stage (${problem})`);
            continue;
        }
        const src = { ...stages[i] };
        for (const key of RUN_MEMORY_KEYS)
            delete src[key];
        // THE SELF-NAMING MODEL STRIP (run-ffbabb558c8): a model naming
        // the row's own card is the era's family-less compose residue —
        // today's admission refuses it; provenance 'restored' lets the
        // repair law handle a model naming a REAL family.
        const params = src['params'];
        if (typeof src['card'] === 'string' && isRecord(params) && params['model'] === src['card']) {
            const cleaned = { ...params };
            delete cleaned['model'];
            src['params'] = cleaned;
        }
        src['provenance'] = RESTORED_PROVENANCE_SPELLING;
        out.push(src);
    }
    return { stages: out, warnings };
}
//# sourceMappingURL=benchSnapshot.js.map