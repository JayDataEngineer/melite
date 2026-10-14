import { RemoteStreamCarrierError } from '@deepseek-ai/dsh-api-gateway/client';
import { TERMINAL_RUN_STATUSES } from '@melite-plugin/melite-run-wire';
import { claimRunCardToolview } from '@melite/viewer-base/runCard';
import { TOOL_NAME as IMAGE_GEN } from '@melite/image-image-gen/wire';
/** The run cards this composition serves default views for. */
const RUN_CARDS = [
    { name: IMAGE_GEN, label: '@melite/viewer: image_gen run-card claim' },
];
// the terminal vocabulary — the runs seat's own words; a settled run
// ends the source (the stream's own law, one home with the run view)
const TERMINAL = new Set(TERMINAL_RUN_STATUSES);
/** Build the run-card gallery's live source: `runs/subscribe` through
 * the gateway's reconnecting RemoteStream, one frame per row that
 * moved — the run view's tail laws, held one-for-one where the
 * gallery has a face for them:
 *
 *  - NO FRAME SPAM: a frame yields only on row change (status or the
 *    artifacts' own bytes); the opening row is the baseline.
 *  - TERMINAL ROW: a settled run ends the source (the last frame
 *    stays as the gallery); the stream disposes.
 *  - ABORT: the holder's signal disposes the stream and ends the
 *    source clean.
 *  - CARRIER LOSS is voiceless for the gallery (the row's badge shows
 *    the last known status; the supervisor reconnects) — the run
 *    view's one-failure-frame voice is the view's own face, and a
 *    stream that ENDS in failure logs loud and ends, never throws:
 *    the last gallery state stands.
 *
 * @param remote the live remote face ($stream included)
 * @param runs the estate's runs namespace (runs/subscribe)
 * @returns the source the row's gallery arm consumes
 */
export function viewerRunFrames(remote, runs) {
    return (runId, signal) => (async function* frames() {
        const stream = remote.$stream({
            name: 'viewer run stream',
            // A generation END (mux drop, host restart) is CARRIER — retry
            // through the supervisor; the subscribe generator only ends on
            // abort, so an end before abort is always the carrier.
            open: (openSignal) => runs.subscribe(runId, openSignal),
            ended: (accepted) => new RemoteStreamCarrierError(accepted
                ? `viewer run stream ended after its first frame (${runId})`
                : `viewer run stream ended before its first frame (${runId})`),
        });
        const onAbort = () => { void stream.dispose(); };
        if (signal.aborted) {
            onAbort();
            return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
        const iterator = stream[Symbol.asyncIterator]();
        let first = true;
        let lastKey = '';
        try {
            for (;;) {
                const step = await iterator.next();
                if (step.done)
                    return;
                const item = step.value;
                if (first) {
                    // mark the opening baseline accepted — a later generation
                    // end classifies as after-snapshot (carrier, retry)
                    item.accept();
                    first = false;
                }
                const status = item.value['status'];
                if (typeof status !== 'string')
                    continue;
                const artifacts = Array.isArray(item.value['artifacts'])
                    ? item.value['artifacts'].filter((a) => typeof a === 'string' && a !== '')
                    : [];
                const key = status + '\n' + artifacts.join('\x00');
                if (key === lastKey)
                    continue;
                lastKey = key;
                yield { status, artifacts };
                if (TERMINAL.has(status))
                    return;
            }
        }
        catch (error) {
            // terminal supervisor failure: the gallery has no failure face,
            // so the tail ends with its last frame standing — logged loud,
            // never thrown into the row's render
            console.error('[melite/viewer] run gallery stream failed:', error);
            return;
        }
        finally {
            signal.removeEventListener('abort', onAbort);
            await stream.dispose();
        }
    })();
}
export const inject = ['slots', 'remote'];
export function apply(ctx) {
    // THE NAMESPACE READ (the mounter's own door, card-base's binder
    // shape): ctx.get reads a service from the store without the inject
    // requirement, so a composition that never mounted the estate gets
    // undefined here — no gallery arm — while the claims above still
    // land. A dotted static inject on this plugin would block its whole
    // load on a namespace that hosts without the estate never mount.
    let runs;
    try {
        runs = ctx.get('remote.runs');
    }
    catch (error) {
        console.error('[melite/viewer] runs namespace read failed:', error);
    }
    const runFrames = runs === undefined ? undefined : viewerRunFrames(ctx.remote, runs);
    for (const card of RUN_CARDS)
        claimRunCardToolview(ctx, card.name, card.label, runFrames);
}
//# sourceMappingURL=index.js.map
