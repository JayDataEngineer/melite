// ledgerTail.ts — the journal tail, RE-HOMED (REBUILD-19,
// 2026-09-10): the dead gateway's GET /v1/ledger arm (the
// doors/assets.ts _h_ledger, killed with the gateway app) ports
// verbatim as a pure over the state root — the queue seat's own
// journal (appendLedger writes it; this reads it back).
//
// The door's law rides EXACTLY (assets.ts 698-764): limit default
// 50, clamp 1..500, garbage -> 50 (NEVER a 400); event truncated
// to 64 chars, matched on the RAW line substring
// '"event":"<ev>'; the tail keeps the LAST N lines; unparseable
// lines count as matched but never as entries; output oldest ->
// newest within the tail; a missing journal reads empty.
//
// §23 CROSS-ROOTS (2026-09-23): tailLedgerAcross merges every
// manifest root's journal into ONE timeline (ts-ordered, own root
// first on ties) and names the searched roots — a two-roots box
// answers "what happened" across both processes, not just the
// tree the seat happens to own.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const parseLimit = (rawLimit) => {
    if (/^\s*[+-]?\d+\s*$/.test(rawLimit)) {
        return Math.max(1, Math.min(500, Number(rawLimit.trim())));
    }
    return 50;
};
/** Per-file scan (the door's law, intact): every line matched on
 *  the RAW substring, unparseables counted, a missing journal
 *  reading empty. */
const matchedLines = (ledgerPath, ev) => {
    const needle = '"event":"' + ev;
    const lines = [];
    let matched = 0;
    try {
        const text = readFileSync(ledgerPath, "utf8");
        // File iteration (`for line in f`): a trailing newline is NOT
        // a phantom line, but a real blank line mid-file IS iterated
        // (matched, then parse-skipped below).
        const split = text.split("\n");
        if (split.length > 0 && split[split.length - 1] === "" && text.endsWith("\n")) {
            split.pop();
        }
        for (const line of split) {
            if (ev !== "" && !line.includes(needle))
                continue;
            matched++;
            lines.push(line);
        }
    }
    catch {
        // Missing journal reads empty (OSError -> pass).
    }
    return { lines, matched };
};
/** The entry ts (seconds) for the merge sort; 0 when absent —
 * malformed rows sort oldest, and they parse-skip at the end
 * anyway (never entries). */
const lineTs = (line) => {
    const at = line.indexOf('"ts":');
    if (at < 0)
        return 0;
    const rest = line.slice(at + 5);
    const m = rest.match(/^\s*(-?\d+)/);
    return m === null ? 0 : Number(m[1]);
};
const parseTail = (lines) => {
    const out = [];
    for (const e of lines) {
        try {
            out.push(JSON.parse(e));
        }
        catch {
            continue;
        }
    }
    return out;
};
/** The per-file tail (the door's law, byte-pinned by the REBUILD-19
 *  wall): every matched line, last-N window kept, unparseables
 *  occupy slots (they parse-skip at the end, never entries). */
const fileTail = (ledgerPath, ev, limit) => {
    const { lines, matched } = matchedLines(ledgerPath, ev);
    const tail = [];
    for (const line of lines) {
        tail.push(line);
        if (tail.length > limit)
            tail.shift();
    }
    return { tail, matched };
};
export function tailLedger(ledgerPath, rawLimit, rawEvent) {
    const limit = parseLimit(rawLimit);
    const ev = rawEvent.slice(0, 64);
    const { tail, matched } = fileTail(ledgerPath, ev, limit);
    const out = parseTail(tail);
    return { entries: out, shown: out.length, matched };
}
/** §23 CROSS-ROOTS: every root's journal, one merged timeline. The
 *  per-file law rides VERBATIM first (match + last-N window per
 *  root — an unparseable line still occupies its slot); the
 *  per-file TAILS then merge by ts (stable — a tie keeps manifest
 *  order, own root first) and the last N merged serve. matched
 *  counts every root's matches. The answer names the searched
 *  roots. A single root degenerates to tailLedger exactly. */
export function tailLedgerAcross(roots, rawLimit, rawEvent) {
    const limit = parseLimit(rawLimit);
    const ev = rawEvent.slice(0, 64);
    const merged = [];
    let matched = 0;
    for (const root of roots) {
        const { tail, matched: m } = fileTail(join(root, "output", "_ledger.jsonl"), ev, limit);
        matched += m;
        for (const line of tail)
            merged.push({ line, ts: lineTs(line) });
    }
    merged.sort((a, b) => a.ts - b.ts);
    const tail = merged
        .slice(Math.max(0, merged.length - limit))
        .map((e) => e.line);
    const out = parseTail(tail);
    return { entries: out, shown: out.length, matched, searched: roots };
}
//# sourceMappingURL=ledgerTail.js.map