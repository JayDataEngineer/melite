/**
 * runs-policy.ts — the run verbs over THE ONE LANE (stroke 81; the
 * shared home, stroke 81b — beside estate-remote, for the same
 * singleton reason: sibling studio clients poll runs here).
 *
 * The run-wire package's policy laws, moved verbatim onto the
 * mounted runs namespace: status/list/start/stop are typed calls
 * through ctx.remote (the generated client — the Connection owns
 * transport, RPC ids, envelopes, cancellation; the hand-written
 * envelope lane is dead). Refusals resolve as RemoteResult error
 * branches and throw EstateRefusedError carrying the estate's
 * message verbatim (WireRefusedError's discrimination role — the
 * gone-verdict, the poll's file-era arms key on the CLASS, not the
 * words). The PURE laws (readRunStatus's normalize, toRunMediaUrl's
 * one rewrite, the terminal vocabulary, the list-row url law) stay
 * in the run-wire package — their ONE definition; only the
 * transport moved.
 */
import { isTerminalRun, listRowMediaUrl, readRunStatus, } from '@melite-plugin/melite-run-wire';
import { isEstateRefusal, estateRemote, unwrapRemote, } from "./estate-remote.js";
/** One runs/status read (normalized once — readRunStatus's law). */
export async function fetchRunStatus(runId, signal) {
    const doc = await unwrapRemote(estateRemote().runs.status(runId, signal), 'runs/status');
    return readRunStatus(runId, doc);
}
/** The runs/list rows as loose records (the restore port's own
 *  shape — run_id, draft_id, created_at, status, artifacts). */
async function listRunRows(signal) {
    const row = await unwrapRemote(estateRemote().runs.list('500', signal), 'runs/list');
    const runs = Array.isArray(row['runs']) ? row['runs'] : [];
    return runs.filter((r) => typeof r === 'object' && r !== null);
}
/** One runs/list row by run_id (the file-era face — runs/status only
 *  knows live runs; the list is the completed runs' SSOT). */
export async function fetchListRow(runId, signal) {
    for (const r of await listRunRows(signal)) {
        const rid = r['run_id'] ?? r['id'];
        if (typeof rid === 'string' && rid !== '' && rid === runId)
            return r;
    }
    return null;
}
/** THE SINGLE-STAGE FALLBACK: a one-stage run's only stage IS the
 *  asked stage — the {model:} door names its stage by the card's
 *  declared skeleton ('img-to-mesh'), not the bench row id ('s_1')
 *  the caller holds; matching ids first keeps multi-stage runs
 *  exact while single-stage card runs answer under any label.
 *  File-era arm: a REFUSED status (the run is not in the live
 *  map) falls back to the runs/list row's first artifact —
 *  completed runs answer here, not at the status door.
 *  Transport errors rethrow (the caller decides retry); a live
 *  answer with no url yet is null (the poll loop keeps going). */
export async function fetchRunStageUrl(runId, stageId, signal) {
    let value;
    try {
        value = await fetchRunStatus(runId, signal);
    }
    catch (e) {
        if (e instanceof Error && e.name === 'EstateRefusedError') {
            const listed = await fetchListRow(runId, signal).catch(() => null);
            return listed !== null ? listRowMediaUrl(listed) : null;
        }
        throw e;
    }
    const row = value.stages.find((s) => s.id === stageId)
        ?? (value.stages.length === 1 ? value.stages[0] : undefined);
    return row !== undefined && typeof row.url === 'string' && row.url !== '' ? row.url : null;
}
/** A run's terminal read (stops poll loops). */
export async function fetchRunTerminal(runId, signal) {
    return isTerminalRun((await fetchRunStatus(runId, signal)).status);
}
/** THE GONE-VERDICT (2026-09-13 phantom-running incident): for a run
 *  the live registry no longer knows (an estate restart wiped the
 *  in-memory map). The file-era law: a refused id may still answer
 *  from runs/list (the completed runs' SSOT); absent from both, the
 *  run is GONE — nothing will ever write its terminal, so the caller
 *  stamps 'stopped'. Transport errors rethrow (not a verdict — the
 *  caller retries or leaves the row alone). */
export async function probeRunGone(runId, signal) {
    try {
        await fetchRunStatus(runId, signal);
        return 'live';
    }
    catch (e) {
        if (!(e instanceof Error && e.name === 'EstateRefusedError'))
            throw e;
        const listed = await fetchListRow(runId, signal).catch(() => null);
        if (listed === null)
            return 'gone';
        const status = listed['status'];
        // A listed row with no status field is UNKNOWN, never 'completed'
        // (2026-10-01, the vocabulary audit): the old fabrication reported
        // success for a run whose outcome was simply unreadable — the same
        // sentinel class the 'unknown' demotion below closed. 'unknown' is
        // terminal and folds to 'stopped': an honest warning, not a lie.
        return typeof status === 'string' && status !== '' ? status : 'unknown';
    }
}
/** The draft's newest run (runs/list adoption — the reload-proof
 *  bridge: the estate is the SSOT, never the client's memory).
 *  NOTE the list's ordering: media-bearing runs first, then
 *  newest-first — scan the wide tail, newest by created_at. */
export async function fetchLatestRunForDraft(draftId, signal) {
    let newest = null;
    for (const r of await listRunRows(signal)) {
        const rid = r['run_id'] ?? r['id'];
        const did = r['draft_id'];
        if (typeof rid !== 'string' || rid === '' || did !== draftId)
            continue;
        const created = r['created_at'];
        const at = typeof created === 'number' ? created : 0;
        if (newest === null || at > newest.created)
            newest = { rid, created: at };
    }
    return newest !== null ? newest.rid : null;
}
/** runs/stop — the cancel door (the registry seat's flag +
 *  interrupt). Refusals throw the estate's text. */
export async function stopRun(runId, signal) {
    await unwrapRemote(estateRemote().runs.stop(runId, signal), 'runs/stop');
}
/** The shared start core — ONE envelope walk for both doors (the
 *  registry demands draft_id + an explicit test boolean; the flow
 *  body needs its id — the bench runs under its own draft_id). */
async function startRun(doc, signal) {
    try {
        const row = await unwrapRemote(estateRemote().runs.start(doc, signal), 'runs/start');
        const runId = row['run_id'];
        if (typeof runId === 'string' && runId !== '')
            return { runId };
        return { refused: 'run refused: no run_id in the answer' };
    }
    catch (e) {
        return { refused: e instanceof Error ? e.message : 'run request failed' };
    }
}
/** Start ONE card through the composing door (the bench drill's
 *  Run, a studio's Run — every single-card gesture rides this). */
export async function startCardRun(input, signal) {
    return await startRun({
        // knobs ride TOP-LEVEL (the door's convention — see the interface
        // law above); none of them collides with the envelope keys.
        ...input.params,
        model: input.model,
        draft_id: input.draftId,
        test: input.test ?? false,
    }, signal);
}
/** Start pre-composed stages through the flow door (whole-bench Run —
 *  honest refusal when the stages carry no workflow or the bench is
 *  multi-stage: the single-stage policy is the estate's). */
export async function startFlowInlineRun(input, signal) {
    return await startRun({
        flow_inline: { id: input.flowId, stages: input.stages },
        draft_id: input.draftId,
        test: input.test ?? false,
    }, signal);
}
/** THE ARTIFACT POLL (the old pollFlowRun law, moved verbatim onto
 *  the mounted runs namespace — stroke 81 dropped it by accident and
 *  the img-to-mesh studio's import caught the hole): the run is the
 *  SSOT — check the stage's url immediately, then on the cadence
 *  until it lands (onUrl once, resolve), the run settles without
 *  one (resolve silent — the caller's empty state is honest), or
 *  signal aborts.
 *
 *  THE TWO ERROR CLASSES settle differently:
 *  - TRANSPORT failures (the wire is down) are swallowed: the next
 *    poll may recover.
 *  - REFUSALS (EstateRefusedError — the estate answered) on
 *    runs/status prove the run is NOT in the live map: nothing is
 *    executing for it. The file-era arm then consults the runs/list
 *    row ONCE and settles from it — its artifact url when it
 *    carries one, silent otherwise (file-era rows never update, so
 *    waiting would be the lie); no row at all settles silent the
 *    same way. A transport-failed list read keeps the poll alive
 *    (the answer may land next cadence). */
export async function pollRunStageUrl(runId, stageId, opts, signal) {
    const interval = opts.intervalMs ?? 1500;
    const sleep = (ms) => new Promise((resolve) => {
        const t = setTimeout(() => { signal?.removeEventListener('abort', onAbort); resolve('slept'); }, ms);
        const onAbort = () => { clearTimeout(t); resolve('abort'); };
        if (signal?.aborted === true) {
            onAbort();
            return;
        }
        signal?.addEventListener('abort', onAbort, { once: true });
    });
    while (signal?.aborted !== true) {
        let row;
        let readFailed = false;
        try {
            row = await fetchRunStatus(runId, signal);
        }
        catch (e) {
            if (isEstateRefusal(e)) {
                try {
                    const listed = await fetchListRow(runId, signal);
                    const url = listed !== null ? listRowMediaUrl(listed) : null;
                    if (url !== null)
                        opts.onUrl(url);
                    return; // settled — the url fired, or silence is the honest face
                }
                catch (listErr) {
                    if (isEstateRefusal(listErr))
                        return; // the list refuses: no such row — silent
                    // the list read died on TRANSPORT: the answer may land
                    // next cadence, so the poll stays alive (fall through)
                }
            }
            // THE READ FAILED, NOT THE RUN (2026-10-13): this used to
            // smuggle the failure through the run-status vocabulary as
            // 'unknown', which the ONE terminal set spells as terminal —
            // so unifying the set turned "the answer may land next
            // cadence" into "give up", and a transport blip swallowed the
            // url. The sentinel is now structural: the row is empty AND
            // the read is marked failed, so the terminal judgement (which
            // owns the run vocabulary) is simply not asked.
            row = { runId, status: 'unknown', draftId: null, stages: [] };
            readFailed = true; // next poll may recover
        }
        const stage = row.stages.find((s) => s.id === stageId)
            ?? (row.stages.length === 1 ? row.stages[0] : undefined);
        if (stage !== undefined && typeof stage.url === 'string' && stage.url !== '') {
            opts.onUrl(stage.url);
            return;
        }
        // A failed READ never settles the poll (the answer may land next
        // cadence); only a real status does.
        if (!readFailed && isTerminalRun(row.status))
            return;
        const woke = await sleep(interval);
        if (woke === 'abort')
            return;
    }
}
//# sourceMappingURL=runs-policy.js.map
