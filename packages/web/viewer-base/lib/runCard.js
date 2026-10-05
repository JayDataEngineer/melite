import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * runCard.ts — the DEFAULT run-card view: one settled model-card call
 * (a call that returned {model, run_id, ...} for a gateway run)
 * rendered from the durable slice plus the run's artifacts.
 *
 * EVERY run card gets this row WITHOUT shipping any view code: the
 * composition (@melite/viewer's client half) claims the card's tool
 * name with `claimRunCardToolview` — the ui-tool built-ins pattern
 * (central default views; a card's own client half is a takeover, the
 * keyed slot's replacement arm). A card ships a client half only when
 * it has a specific override; all-defaults cards ship none.
 *
 * The row model is replay-stable exactly like ui-skill's SkillRow:
 * derived ONLY from the frozen call block — args for the prompt, the
 * card's presentationMeta projection on the settled node (the same
 * payload presentResult reads host-side; see image-gen's tool.ts) for
 * model/run/error. The gallery is the one live arm: it rides the run
 * resource's frames (runs/subscribe over the gateway's stream face),
 * handed down by the composition as the `runFrames` prop — the row
 * itself stays runtime-dep-free and presentational, deriving from
 * props only (the web-card law: raw events and persisted metadata,
 * never a fetch of its own). No source (a composition without the
 * estate's runs namespace) renders no gallery; the retired poll's
 * same-origin door answers 502 `estate_killed` by design since
 * 2026-09-10, so its answers were always the gone badge.
 */
import { useEffect, useState } from 'react';
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { listArtifactMediaUrl } from '@melite-plugin/melite-run-wire';
/** Derive the row model from the durable slice alone (replay-safe). */
export function runCardModel(props) {
    const { block } = props;
    const settled = 'kind' in block;
    // 0.1.7's PreparingToolCall carries no argsRaw (a head alone); only
    // the dispatched StartedToolCall does — narrow by the field itself.
    const argsRaw = (settled ? block.call?.argsRaw : 'argsRaw' in block ? block.argsRaw : undefined) ?? '';
    let prompt = null;
    try {
        const parsed = JSON.parse(argsRaw);
        if (typeof parsed.prompt === 'string')
            prompt = parsed.prompt;
    }
    catch { /* truncated streaming prefix — the settled meta carries the facts */ }
    const meta = (settled ? block.meta : undefined) ?? {};
    const state = !settled
        ? 'running'
        : typeof meta.error === 'string' && meta.error !== ''
            ? 'refused'
            : block.error?.code === 'interrupted'
                ? 'stopped'
                : block.isError ? 'error' : 'ok';
    const textParts = [];
    if (settled) {
        for (const item of block.content) {
            textParts.push(item.type === 'text' ? item.text : JSON.stringify(item));
        }
    }
    return {
        state,
        model: typeof meta.model === 'string' && meta.model !== '' ? meta.model : null,
        runId: typeof meta.run_id === 'string' && meta.run_id !== '' ? meta.run_id : null,
        prompt,
        headline: textParts.join('\n') || null,
    };
}
/** Ride the composition's run frames for the gallery arm. No source
 * (a composition without the estate's runs namespace) is no arm: the
 * state stays empty and the row renders its durable model alone. An
 * ended source keeps the last frame standing (the terminal row is the
 * source's own last yield). */
export function useRunGallery(runId, source) {
    const [state, setState] = useState({ status: null, artifacts: [] });
    useEffect(() => {
        if (runId === null || source === undefined)
            return;
        const controller = new AbortController();
        let stopped = false;
        void (async () => {
            try {
                for await (const frame of source(runId, controller.signal)) {
                    if (stopped)
                        return;
                    setState({ status: frame.status, artifacts: frame.artifacts });
                }
            }
            catch (error) {
                // the source's law is to end, never throw; if it ever does,
                // the last gallery state stands — the durable model is the
                // row's truth, and a rejected async body must not go unhandled
                console.error('[melite/viewer-base] run gallery tail failed:', error);
            }
        })();
        return () => {
            stopped = true;
            controller.abort();
        };
    }, [runId, source]);
    return state;
}
// The pinned primitives vocabulary (0.1.0-rc.7) has no neutral 'idle'
// (repo HEAD adds it); an interrupted call is user-attention, not an
// error — amber, and the badge word states the arm.
const DOT = {
    running: 'ongoing',
    ok: 'done',
    refused: 'warning',
    error: 'error',
    stopped: 'warning',
};
export function RunCardRow(props) {
    const { runFrames, ...view } = props;
    const model = runCardModel(view);
    const gallery = useRunGallery(model.state === 'running' ? null : model.runId, runFrames);
    const badge = gallery.status ?? model.state;
    return (_jsxs("div", { "data-melite-run-card": true, style: {
            border: '1px solid rgba(128,128,128,0.35)',
            borderRadius: 8, padding: 10, fontSize: 13, lineHeight: 1.5,
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(StateDot, { state: DOT[model.state] }), _jsxs("strong", { style: { flex: 1 }, children: [props.toolName, model.model !== null ? ` [${model.model}]` : '', model.runId !== null ? ` \u2192 ${model.runId}` : ''] }), _jsx("span", { style: { opacity: 0.7, fontSize: 12 }, children: badge })] }), model.prompt !== null && (_jsx("div", { style: { opacity: 0.75, marginTop: 6 }, children: model.prompt })), model.state === 'refused' && model.headline !== null && (_jsx("div", { style: { marginTop: 6, whiteSpace: 'pre-wrap' }, children: model.headline })), model.runId !== null && gallery.artifacts.length > 0 && (_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }, children: gallery.artifacts.flatMap((name) => {
                    // the one media rewrite (melite-run-wire): registry names
                    // `<runId>/<rel>` ride the estate's media route; absolute
                    // and rooted urls pass verbatim; an empty name is no image
                    const url = listArtifactMediaUrl(name);
                    return url === null ? [] : [(_jsx("img", { src: url, alt: name, loading: "lazy", style: { width: 128, height: 128, objectFit: 'cover', borderRadius: 6, display: 'block' } }, name))];
                }) }))] }));
}
/**
 * Claim `tool.call.toolview` for one run card's wire tool name, with
 * the default row — the ui-skill registration shape (the
 * declaration-aware `slots.inject`, reconciling + disposal included).
 * `runFrames` (the composition's live-run source) rides the
 * registered component's props; absent, the row registers bare and
 * renders its durable model alone. Returns nothing; the claim lives
 * and dies with `ctx`.
 *
 * @param ctx the claiming composition's client ctx
 * @param toolName the card's wire tool name (the keyed slot's key)
 * @param label the effect's name (the composition's own line)
 * @param runFrames the live-run source the composition holds, if any
 */
export function claimRunCardToolview(ctx, toolName, label, runFrames) {
    const Row = runFrames === undefined ? RunCardRow
        : (props) => _jsx(RunCardRow, { ...props, runFrames: runFrames });
    ctx.effect(() => ctx.slots.inject('tool.call.toolview', () => ctx.slots.register({ name: 'tool.call.toolview', key: toolName }, Row)), label);
}
//# sourceMappingURL=runCard.js.map
