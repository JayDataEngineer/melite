// runsTypes.ts — the live-run record + the pure tail helpers,
// re-homed VERBATIM from the dead flowsRun door (gateway kill,
// REBUILD-6). Types + pure functions only: no Context, no I/O
// beyond the settle persist (best-effort by the door's own law).
//
// DIVERGENCE-BY-ORDER (the kill): the door stamped stage url/gallery
// with ASSET_URL_PREFIX + "/v1/assets/runs/<run>/<rel>" — an HTTP
// face that died with the app. The remote reports the run-RELATIVE
// artifact name instead (no prefix, no port). The web callers
// (mask-studio/gallery) migrate when their stroke lands; the
// artifacts[] rows keep the engine's paths.
import { join } from "node:path";
import { appendLedger, writeJsonAtomic, sidecarDoc, sidecarStageOf, variantOfBodies, } from "./queue.js";
/** The run-status vocabulary as a runtime set — the type's twin, for
 *  durable-boundary reads that judge an on-disk row's status (the
 *  type alone cannot answer "is this sidecar's status one of
 *  ours"). */
export const RUN_STATUSES = new Set([
    "queued",
    "running",
    "completed",
    "failed",
    "stopped",
    "stopping",
]);
/** The engine's path relative to the run dir (runRel, door-verbatim). */
export function runRel(run, art) {
    if (art === run.dir)
        return basenameSafe(art);
    const prefix = run.dir + "/";
    if (art.startsWith(prefix))
        return art.slice(prefix.length);
    const base = basenameSafe(art);
    return base === "" || base === "." ? basenameSafe(art) : base;
}
function basenameSafe(p) {
    const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"));
    return i < 0 ? p : p.slice(i + 1);
}
function errName(err) {
    if (err instanceof Error && typeof err.name === "string" && err.name !== "") {
        return err.name;
    }
    return "Error";
}
/** "<Type>: <msg>" — the worker's terminal error text. */
export function errText(err) {
    const msg = err instanceof Error ? err.message : String(err);
    return errName(err) + ": " + msg;
}
/** The settle persist (the R3 durable-queue mirror of registration,
 *  door-verbatim): the terminal status rewrites the run's
 *  _flow.json sidecar (the restart authority) and appends the
 *  terminal ledger row. Best-effort by law — a persist failure
 *  never unmakes the run's truth in memory. */
export async function settlePersist(run, stateRoot) {
    // THE EXPORT-NAME STAMP (023's self-critique #4/#6): a
    // design/export lane's voice_name rides the submitted body — lift
    // THE EXPORT-NAME STAMP (023's self-critique #4/#6, re-stated
    // under the named-presence refinement, operator 2026-10-22: the
    // Design mod's popup states the save name; unstated runs mint
    // it): a stated voice_name wins here; the mint-named file lifts
    // below. The params loop also keeps pre-refinement runs replayed
    // through this settle honest (their snapshots carry whatever the
    // door admitted at their time; a replay must not lose its
    // receipt).
    let exportName;
    const bodies = [...run.params];
    const snap = run.cardSnapshot;
    if (snap !== undefined && snap !== null && typeof snap === "object")
        bodies.push(snap.params);
    for (const p of bodies) {
        if (p === null || typeof p !== "object" || Array.isArray(p))
            continue;
        const v = p["voice_name"];
        if (typeof v === "string" && v.trim() !== "") {
            exportName = v.trim();
            run.exportName = exportName;
            break;
        }
    }
    // THE VARIANT STAMP (commission 033's self-critique #5): the
    // lane rides the same bodies as the export name (run.params
    // first, the card snapshot's exact submitted body as fallback —
    // the compose may consume card keys into engine-shaped params).
    // Stamped on the row (registration may already hold it; settle
    // re-lifts with the registration stamp as fallback — the row in
    // memory is the truth either way).
    const variant = variantOfBodies(bodies) ?? run.variant;
    if (variant !== undefined)
        run.variant = variant;
    // THE EXPORT-PATH STAMP: lift the engine-reported mint path off
    // the stage result_outputs (set at execute time from the history
    // ui — qvoicePathsOf). Stamped only when the engine actually
    // minted one (a load lane mints nothing).
    let exportPath;
    for (const st of run.stages) {
        const ro = st["result_outputs"];
        if (ro === null || typeof ro !== "object" || Array.isArray(ro))
            continue;
        const v = ro["qvoice_path"];
        if (typeof v === "string" && v.trim() !== "") {
            exportPath = v.trim();
            run.exportPath = exportPath;
            break;
        }
    }
    // THE MINT NAMES ITSELF (the qvoice boolean law, operator
    // 2026-10-22): with no typed name riding, the receipt's name is
    // the minted file's stem (voice-<runId>.qvoice → voice-<runId>).
    if (exportName === undefined && exportPath !== undefined) {
        const base = exportPath.split("/").pop() ?? "";
        const stem = base.endsWith(".qvoice") ? base.slice(0, -".qvoice".length) : base;
        if (stem !== "") {
            exportName = stem;
            run.exportName = exportName;
        }
    }
    // THE LOUDNESS + FRESHNESS STAMPS (2026-09-26): lift the meter's
    // reading and the voice-mint receipt off the stage result_outputs
    // — same law as the export path (the engine's harvest carries
    // them; the run row serves them). First coherent pair wins.
    for (const st of run.stages) {
        const ro = st["result_outputs"];
        if (ro === null || typeof ro !== "object" || Array.isArray(ro))
            continue;
        const rec = ro;
        if (run.loudness === undefined) {
            const loud = rec["loudness"];
            if (loud !== null && typeof loud === "object" && !Array.isArray(loud)) {
                const l = loud["loudness_lufs"];
                const pk = loud["peak_db"];
                if (typeof l === "number" && Number.isFinite(l) && typeof pk === "number" && Number.isFinite(pk)) {
                    run.loudness = { loudness_lufs: l, peak_db: pk };
                }
            }
        }
        if (run.voiceFreshness === undefined) {
            const fresh = rec["voice_freshness"];
            if (fresh !== null && typeof fresh === "object" && !Array.isArray(fresh)) {
                const reused = fresh["reused_existing"];
                const file = fresh["voice_file"];
                if (typeof reused === "boolean" && typeof file === "string" && file.trim() !== "") {
                    run.voiceFreshness = { reused_existing: reused, voice_file: file.trim() };
                }
            }
        }
    }
    try {
        await writeJsonAtomic(join(run.dir, "_flow.json"), sidecarDoc({
            ...sidecarFacesOf(run),
            exportName,
            exportPath,
            variant,
            loudness: run.loudness,
            voiceFreshness: run.voiceFreshness,
            replaySuspect: run.replaySuspect,
        }));
    }
    catch {
        /* the sidecar must never take the settle down */
    }
    try {
        appendLedger(stateRoot, "run." + run.status, {
            run_id: run.runId,
            error: run.error,
            // THE VARIANT RIDES THE TERMINAL ROW TOO (033 #5): the
            // queued row named it at birth; the terminal row names it at
            // rest — one grep tells design from performing, state to state.
            ...(variant !== undefined ? { variant } : {}),
            // THE REPLAY VERDICT RIDES IT TOO (D11): one grep tells a
            // replayed film from an executed one, state to state.
            ...(run.replaySuspect === true ? { replay_suspect: true } : {}),
        });
        /* v8 ignore next -- unreachable: appendLedger self-swallows I/O
           faults by law, and settle's payload is two strings (the dumps
           never throws), so this catch has no honest trigger (2026-09-12) */
    }
    catch {
        /* nor the ledger row */
    }
}
/** The row's own sidecar faces — the base every sidecar writer
 *  shares. The settle rewrite adds the lifted stamps (export name,
 *  path, variant, loudness, freshness — read off COMPLETED
 *  outputs); the claim write has nothing lifted yet and carries
 *  exactly these. */
function sidecarFacesOf(run) {
    return {
        runId: run.runId,
        status: run.status,
        error: run.error,
        stages: run.stages.map((st) => sidecarStageOf(st)),
        skippedStages: [...run.skippedStages],
        artifacts: [...run.artifacts],
        createdAt: run.createdAt,
        testFlag: run.testFlag,
        draftId: run.draftId,
        pipeline: run.pipeline,
        graph: run.graphRows,
        // THE SNAPSHOT CARRY (stroke 48 fix): every sidecar rewrite
        // re-renders the document from the row — the snapshots stamped
        // at registration ride along, never wiped.
        cardSnapshot: run.cardSnapshot,
        cardRecipe: run.cardRecipe,
        benchSnapshot: run.benchSnapshot,
        // F-6(b): the admission warnings ride every rewrite too (a disk
        // row keeps what the live row warned).
        warnings: run.warnings,
        // THE COMPOSE ECHO rides every rewrite too (a disk row keeps
        // what the engine received at start).
        composeEcho: run.composeEcho,
        // THE SERVED-GRAPH RECEIPT rides every rewrite too (a disk row
        // keeps the queue-time evidence — ordered beside the echo).
        graphReceipt: run.graphReceipt,
        // THE SOURCE ECHO rides every rewrite too (a disk row keeps the
        // files that created the run).
        sourceEcho: run.sourceEcho,
        // THE REPLAY VERDICT rides every rewrite too (D11 — a disk row
        // keeps what the executor's tap witnessed).
        replaySuspect: run.replaySuspect,
    };
}
/** The claim persist (the commission wedge landing, 2026-10-03):
 *  the pump rewrites the run's _flow.json the moment it CLAIMS the
 *  row. Registration writes 'queued', settle writes terminal, and a
 *  process death between the two left the sidecar saying 'queued'
 *  forever — the next boot REPLAYED a run that had already claimed
 *  (duplicate GPU spend) and a claimed-but-wedged row was
 *  indistinguishable on disk from a never-claimed one. The claim
 *  write closes the window: 'running' on disk means the process
 *  owned the claim, and the boot sweep (queueSweep.ts) owns its
 *  retirement. Best-effort by law, same as settlePersist — the
 *  in-memory row is the truth; a persist failure never blocks the
 *  claim. No ledger row: the ledger carries dispositions, and a
 *  claim is not one.
 * @param run the just-claimed row (tryDequeue already set status
 *  'running' in memory).
 * @returns when the write completed or self-swallowed its fault. */
export async function claimPersist(run) {
    try {
        await writeJsonAtomic(join(run.dir, "_flow.json"), sidecarDoc(sidecarFacesOf(run)));
    }
    catch {
        /* the sidecar must never take the claim down (settlePersist law) */
    }
}
/** The synthesized log tail (door-verbatim port: the retired
 *  oracle's status voice, synthesized from the live row). */
export function runLogTail(obj) {
    const lines = [];
    const status = String(obj.status ?? "?");
    const qp = obj.queue_position;
    let head = "run: " + status;
    if (status === "queued" && typeof qp === "number" && qp > 0) {
        head += " (queue position " + qp + ")";
    }
    if (obj.error)
        head += " — " + String(obj.error).slice(0, 300);
    lines.push(head);
    const stages = obj.stages;
    if (Array.isArray(stages)) {
        for (const st of stages) {
            if (typeof st !== "object" || st === null || Array.isArray(st))
                continue;
            const name = String(st["name"] ?? st["id"] ?? "stage");
            let line = name + ": " + String(st["status"] ?? "?");
            const p = st["progress"];
            if (typeof p === "object" && p !== null && !Array.isArray(p) &&
                p["max"]) {
                line +=
                    " — " +
                        String(p["value"]) +
                        "/" +
                        String(p["max"]);
            }
            const a = st["activity"];
            if (typeof a === "object" && a !== null && !Array.isArray(a)) {
                const rec = a;
                const ph = String(rec["phase"] ?? "");
                const msg = rec["message"] ?? rec["node_class"];
                line += " [" + ph + (msg ? ": " + String(msg) : "") + "]";
            }
            if (st["error"])
                line += "\n  error: " + String(st["error"]).slice(0, 300);
            lines.push(line);
        }
    }
    const arts = obj.artifacts;
    if (Array.isArray(arts) && arts.length > 0) {
        const names = [];
        for (const a of arts.slice(0, 6)) {
            const v = typeof a === "object" && a !== null && !Array.isArray(a)
                ? (a["url"] ??
                    a["name"])
                : a;
            const s = String(v ?? "").split("/").pop();
            if (s !== "")
                names.push(s);
        }
        if (names.length > 0)
            lines.push("artifacts: " + names.join(", "));
    }
    return lines.join("\n");
}
//# sourceMappingURL=runsTypes.js.map
