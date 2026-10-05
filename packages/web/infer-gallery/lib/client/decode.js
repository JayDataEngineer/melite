const row = (v) => (Array.isArray(v) ? v : []);
export function decodeRuns(json) {
    const d = (json ?? {});
    /* ONE validation site (the estate collapse moved the deleted host
     * door's law here): a run without a string run_id is undedupeable
     * and unkeyable — DROPPED and counted loudly into the errors array
     * (the panel's existing error channel), never pushed as a partial,
     * never vanished silently. The route serves clean rows; this guards
     * the wire. */
    const errors = row(d.errors);
    const runs = [];
    let dropped = 0;
    for (const raw of row(d.runs)) {
        const r = (raw ?? {});
        if (typeof r.run_id !== 'string' || r.run_id === '') {
            dropped += 1;
            continue;
        }
        runs.push(r);
    }
    if (dropped > 0) {
        errors.push({ gateway: 'runs', message: 'dropped ' + String(dropped) + ' rows without run_id (unkeyable)' });
    }
    return { runs, errors };
}
export function decodeDrafts(json) {
    const d = (json ?? {});
    return {
        drafts: row(d.drafts),
        errors: row(d.errors),
    };
}
//# sourceMappingURL=decode.js.map
