import { parseSidecar } from "./queueSidecar.js";
// queueResurrect.ts — resurrection planning + strict JSON reads
// (boot tolerance for on-disk records; lenient arms deleted
// 2026-09-18 — JSON arrays/objects ride, nothing is re-interpreted).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
/** input_from refs for a NodeRow: arrays ride element-wise;
 *  falsy rides []; anything else is the raise road (the caller
 *  orphans the record). */
export function refList(value) {
    const src = value ? value : [];
    if (Array.isArray(src))
        return [...src];
    return null;
}
/** entries for the row maps: plain objects ride their entries;
 *  falsy rides {}; anything else is the raise road. */
export function recordEntries(value) {
    const src = value ? value : {};
    if (typeof src === "object" && src !== null && !Array.isArray(src)) {
        return Object.entries(src);
    }
    return null;
}
/** One graph row usable: id/type are non-empty strings;
 *  input_from rides refList with every ref a non-blank string;
 *  input_names/outputs ride recordEntries with string values;
 *  duplicate node ids refuse. seen carries the gate across rows. */
export function nodeRowUsable(row, seen) {
    if (typeof row !== "object" || row === null || Array.isArray(row)) {
        return false;
    }
    const rec = row;
    const id = rec["id"];
    const type = rec["type"];
    if (typeof id !== "string" || id === "")
        return false;
    if (typeof type !== "string" || type === "")
        return false;
    if (seen.has(id))
        return false;
    const refs = refList(rec["input_from"]);
    if (refs === null)
        return false;
    for (const ref of refs) {
        if (typeof ref !== "string" || ref.trim() === "")
            return false;
    }
    for (const key of ["input_names", "outputs"]) {
        const entries = recordEntries(rec[key]);
        if (entries === null)
            return false;
        for (const entry of entries) {
            if (typeof entry[1] !== "string")
                return false;
        }
    }
    if (recordEntries(rec["params"]) === null)
        return false;
    seen.add(id);
    return true;
}
/** The durable graph check (doc.get("graph") or [] 2324): falsy
 *  (missing/None/False/0/"") rides the empty FlowGraph — zero nodes
 *  construct fine, so the record resurrects; a truthy non-list dies
 *  iterating (strings/dicts/numbers orphan); every row must be
 *  NodeRow-usable (extra keys ignored, mistypes orphan). */
export function graphRowsUsable(graph) {
    const rows = graph ? graph : [];
    if (!Array.isArray(rows))
        return false;
    const seen = new Set();
    for (const row of rows) {
        if (!nodeRowUsable(row, seen))
            return false;
    }
    return true;
}
/** list coerce for stages/skipped: arrays ride; falsy rides [];
 *  anything else throws (the raise road: plan + build agree on the
 *  skip, never throw out). */
export function sidecarList(value) {
    const src = value ? value : [];
    if (Array.isArray(src))
        return [...src];
    throw new Error("unlistable sidecar value");
}
/** artifact names: non-empty strings ride; a mistyped entry takes
 *  the raise road (the caller orphans the record — the revived run
 *  never comes back short an artifact, unvoiced). Empty strings
 *  still filter: the writer's own harvest never emits them
 *  (runsExecute drops ""), so "" is absent, not a mistype. */
export function artifactStrings(value) {
    const names = [];
    for (const entry of sidecarList(value)) {
        if (entry === "")
            continue;
        if (typeof entry !== "string") {
            throw new Error("unlistable sidecar artifact entry");
        }
        names.push(entry);
    }
    return names;
}
/** created_at coerce: finite numbers ride; numeric strings parse;
 *  everything else rides 0 and never throws (boot order for
 *  records without a usable timestamp). */
export function coerceCreatedAt(value) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : 0;
    }
    if (typeof value === "string") {
        const s = value.trim();
        if (s === "")
            return 0;
        if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) {
            return Number(s);
        }
        return 0;
    }
    return 0;
}
/** The durable-record check:
 *  sidecar parses + draft doc lives (CARD BIRTH LAW — the doc is
 *  the birth certificate; a record without one is an orphan, never
 *  a run) + _request.json parses + graph rows FlowGraph-usable
 *  (G1: missing/empty graphs resurrect; NodeRow mistypes orphan). */
export function durableRecordUsable(sidecarText, requestText, draftExists) {
    let doc = null;
    try {
        // THE SIDECAR'S READ CONTRACT (parseSidecar): this reader decides
        // whether a run may be RESURRECTED from its sidecar, so a doc
        // whose stages are not addressable rows must answer false — the
        // resurrect law's own precondition, not a downstream find().
        // the parse JUDGES the shape and returns the row VERBATIM
        doc = parseSidecar(JSON.parse(sidecarText))?.request ?? null;
    }
    catch {
        return false;
    }
    if (doc === null) {
        return false;
    }
    const rec = doc;
    const draftId = rec["draft_id"];
    if (typeof draftId !== "string" || draftId === "" || !draftExists) {
        return false;
    }
    // _request.json needs only to PARSE (no validation — a list/
    // str/num request rebuilds fine. A later lookup crash lands at
    // worker/serve time, never at resurrect — an object-only check
    // here would orphan records resurrect saves).
    try {
        JSON.parse(requestText);
    }
    catch {
        return false;
    }
    if (!graphRowsUsable(rec["graph"]))
        return false;
    // stages/skipped/artifacts listifiability: the list check
    // sits OUTSIDE the rebuild try (a non-array skips the
    // record at boot). The predicate agrees with the replay road
    // (the service's bootReconcile re-reads through the start door)
    // so plan order never admits a row the replay cannot carry.
    try {
        sidecarList(rec["stages"]);
        sidecarList(rec["skipped_stages"]);
        artifactStrings(rec["artifacts"]);
    }
    catch {
        return false;
    }
    return true;
}
/** Plan the resurrect (fs reads + order; the caller appends +
 *  ledgers, or use bootResurrect below for the whole seam). */
export function planResurrect(stateRoot, readSidecar = (runId) => {
    try {
        return readFileSync(join(stateRoot, "output", runId, "_flow.json"), "utf8");
    }
    catch {
        return null;
    }
}, readRequest = (runId) => {
    try {
        return readFileSync(join(stateRoot, "output", runId, "_request.json"), "utf8");
    }
    catch {
        return null;
    }
}, draftExists = () => {
    // LOUD default (the drafts-door migration, 2026-09-09): the
    // legacy drafts/<id>.json probe is dead — the drafts domain
    // owns existence now. Callers pass their domain probe (the
    // queue lane fails loud, never silently drops to no drafts).
    throw new Error("[gateway-ts] planResurrect needs the caller's draftExists probe (drafts domain)");
}) {
    const outRoot = join(stateRoot, "output");
    let names;
    try {
        names = readdirSync(outRoot);
    }
    catch {
        return { order: [], orphans: [] };
    }
    const candidates = [];
    const orphans = [];
    for (const name of names.sort()) {
        if (!name.startsWith("run-"))
            continue;
        const text = readSidecar(name);
        if (text === null)
            continue;
        let doc = null;
        try {
            doc = JSON.parse(text);
        }
        catch {
            // ROW 28 (census): an unparseable sidecar is a HALF-WRITTEN
            // row — it belongs in orphans (the operator's reconcile
            // road), never dropped from both order and orphans. The old
            // bare continue made the run invisible to resurrection.
            orphans.push(name);
            continue;
        }
        if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
            orphans.push(name);
            continue;
        }
        const rec = doc;
        if (rec["status"] !== "queued")
            continue;
        const createdNum = coerceCreatedAt(rec["created_at"]);
        const draftId = rec["draft_id"];
        const req = readRequest(name);
        const usable = req !== null &&
            durableRecordUsable(text, req, typeof draftId === "string" && draftId !== ""
                ? draftExists(draftId)
                : false);
        if (!usable) {
            orphans.push(name);
            continue;
        }
        // The durable/file brand door: the dir name IS the run id,
        // admitted only past the run- prefix, the sidecar parse and the
        // usable-request check above (the dsh-brand convention: the
        // cast lives at the validating boundary, never at consumers).
        candidates.push({ created: createdNum, runId: name });
    }
    candidates.sort((a, b) => a.created - b.created);
    return { order: candidates.map((c) => c.runId), orphans };
}
/** One rebuilt queued run — RETIRED (stroke 83): the hollow
 *  requeue road is deleted; the service's bootReconcile REPLAYS _request.json
 *  through the start door so revived rows carry REAL params. */
//# sourceMappingURL=queueResurrect.js.map