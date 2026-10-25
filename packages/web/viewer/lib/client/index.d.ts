/**
 * `@melite/viewer` — client half: the default run-card toolview
 * claims, ONE line per composed card, each threaded with the live-run
 * source when the estate's runs namespace is mounted.
 *
 * This is the composition point that knows the run cards (the ui-tool
 * built-ins pattern: central default views). A card ships its own
 * client half only to OVERRIDE its view — a takeover of the same
 * keyed slot (the contract's replacement arm); all-defaults cards
 * ship none and land here.
 *
 * The gallery's live lane is the CALLING PLUGIN's remote door
 * (references/deepseek-harness/docs/cookbook/adding-a-remote-api.md):
 * this plugin declares `remote` in its inject and calls
 * `ctx.remote.runs.subscribe(...)` directly through the gateway's
 * `$stream` face — the same run frames the run view's resource serves
 * (1.8's law, one stream door for every run consumer). The runs
 * NAMESPACE rides cordis's inject-free reflect read (`ctx.get`),
 * not the dotted static inject: the viewer must keep claiming default
 * rows in compositions that never mount the estate (a blocked dotted
 * inject would kill the whole plugin, rows included), and a
 * composition without the namespace renders no gallery, not no row.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import type { ClientRemote } from '@deepseek-ai/dsh-api-gateway/client';
import type { RunFramesSource } from '@melite/viewer-base/runCard';
/** The runs namespace face (the declaration merge names the methods:
 * runs/subscribe in stream mode, runs/status unary). */
type RunsNamespace = ClientRemote['runs'];
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
export declare function viewerRunFrames(remote: ClientRemote, runs: RunsNamespace): RunFramesSource;
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
export {};
//# sourceMappingURL=index.d.ts.map