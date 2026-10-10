// queueSweep.ts — sidecar sweeps (pure patch + boot fs half) (split from queue.ts 2026-09-18;
// pure move, zero logic changes — the queue.ts barrel re-exports
// every symbol, so the public surface is byte-identical).
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendLedger, writeJsonAtomic } from "./queueLock.js";
/** Patch a stale sidecar (pure half of sweep_sidecar): every
 *  running/queued status — top-level AND per-stage (any depth) —
 *  becomes failed. Idempotent (an already-swept file has no active
 *  statuses left → touched false, no write). A run still QUEUED
 *  never executed: its sweep note + error say so (queuedWhy)
 *  instead of implying a crash mid-run. */
export function sweepSidecar(doc, why, queuedWhy = "") {
    const wasQueued = doc["status"] === "queued";
    let touched = false;
    const patch = (o) => {
        if (Array.isArray(o)) {
            for (const v of o)
                patch(v);
            return;
        }
        if (typeof o === "object" && o !== null) {
            const rec = o;
            if (rec["status"] === "running" || rec["status"] === "queued") {
                rec["status"] = "failed";
                touched = true;
            }
            else if (rec["status"] === "stopping") {
                // a stopping run at sweep time: the stop was requested and
                // the dead host IS the stop landing — 'stopped' is the
                // honest terminal, never 'failed' (the caller asked for
                // this; §5's producer-side live sets, 2026-10-12).
                rec["status"] = "stopped";
                touched = true;
            }
            for (const v of Object.values(rec))
                patch(v);
        }
    };
    patch(doc);
    if (!touched)
        return { touched: false, wasQueued, doc };
    const note = wasQueued && queuedWhy !== "" ? queuedWhy : why;
    doc["sweep"] = note;
    if (wasQueued && queuedWhy !== "")
        doc["error"] = queuedWhy;
    return { touched: true, wasQueued, doc };
}
/** Boot-sweep notes (boot_sweep 2402-2409). */
export const BOOT_SWEEP_WHY = "host restarted (boot sweep): stale active sidecar from a dead process";
export const BOOT_SWEEP_QUEUED_WHY = "host restarted before the run started (never executed) — resubmit";
/** Read-time sweep notes + response errors (sidecar_status
 *  2428-2451): the ledger state is ALWAYS "failed" (even for a
 *  queued zombie — the error TEXT carries the never-executed
 *  honesty), error "zombie swept at read time" mid-run. */
export const READ_SWEEP_WHY = "read-time sweep: stale running sidecar, no live registry entry";
export const READ_SWEEP_QUEUED_WHY = "run was still queued when the gateway vanished (never executed) — resubmit";
export const READ_SWEEP_RUNNING_ERROR = "zombie swept at read time";
/** Boot-time zombie sweep (boot_sweep 2378-2410, fs half): every
 *  sidecar still claiming running/queued belongs to a DEAD process
 *  — EXCEPT liveRunIds (boot_resurrect just re-queued those; their
 *  queued sidecar is resurrected work, not a zombie). Swept BEFORE
 *  traffic, so the ledger never shows phantom actives. Returns the
 *  swept run ids in sorted order. */
export async function bootSweep(stateRoot, liveRunIds = [], nowS = Math.floor(Date.now() / 1000)) {
    const swept = [];
    const live = new Set(liveRunIds);
    const outRoot = join(stateRoot, "output");
    let names;
    try {
        names = readdirSync(outRoot);
    }
    catch {
        return swept;
    }
    for (const name of names.sort()) {
        if (!name.startsWith("run-"))
            continue;
        if (live.has(name))
            continue;
        let pre = {};
        try {
            pre = JSON.parse(readFileSync(join(outRoot, name, "_flow.json"), "utf8"));
            if (typeof pre !== "object" || pre === null || Array.isArray(pre)) {
                pre = {};
            }
        }
        catch {
            pre = {};
        }
        const wasQueued = pre["status"] === "queued";
        const path = join(outRoot, name, "_flow.json");
        let current = null;
        try {
            current = JSON.parse(readFileSync(path, "utf8"));
        }
        catch (e) {
            // ROW 28 (2026-09-10, census): an unreadable _flow.json must
            // not vanish from the sweep silently — the QUEUE LANE LAW
            // wants every boot disposition ledgered so the operator can
            // reconcile (the old bare continue left an unaudited row).
            appendLedger(stateRoot, "run.swept", { run_id: name, state: "unreadable", error: `boot sweep: _flow.json parse failed: ${e instanceof Error ? e.message : /* v8 ignore next -- JSON.parse throws Errors: the String fallback never fires (2026-09-12) */ String(e)}` }, nowS);
            continue;
        }
        if (typeof current !== "object" || current === null || Array.isArray(current)) {
            appendLedger(stateRoot, "run.swept", { run_id: name, state: "unreadable", error: "boot sweep: _flow.json is not an object" }, nowS);
            continue;
        }
        const res = sweepSidecar(current, BOOT_SWEEP_WHY, wasQueued ? BOOT_SWEEP_QUEUED_WHY : "");
        if (!res.touched)
            continue;
        await writeJsonAtomic(path, res.doc);
        appendLedger(stateRoot, "run.swept", { run_id: name, state: wasQueued ? "queued_lost" : "failed", error: "boot sweep" }, nowS);
        swept.push(name);
    }
    return swept;
}
//# sourceMappingURL=queueSweep.js.map