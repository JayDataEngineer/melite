/**
 * zoom.tsx — the zoom overlay, CSS-law port (2026-09-12).
 *
 * THE CONTRACT (the old tree's interaction, framer removed — DSH law:
 * DSH ships no framer; its own surfaces animate in CSS):
 * • the resting tile opens a FIXED inset-0 overlay (portal to body —
 *   the old file's own DSH placement rule; the embed frame is
 *   auto-height, absolute would cover only part of the view).
 * • The card enters compositor-only: a CSS scale+fade keyframe
 *   (zoomIn — transform/opacity, zero reflow, NO modal pop).
 * • While the settle holds the box shows a pure SKELETON; the real
 *   detail swaps in after ZOOM_SKELETON_MS.
 * • Close vectors: the Collapse (X) button and a backdrop click
 *   (target === currentTarget) call onClose directly; Escape belongs
 *   to DSH's useModalLayer, which also owns the focus lifetime and
 *   the layer stack (the dialog contract on the root is what it keys
 *   on).
 * • The overlay is the scroll container; the inner flex centers a
 *   card shorter than the area and scrolls one that is taller.
 */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModalLayer, IconLoadingOutlineRegular, IconPlayOutlineRegular, IconStopFillRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { fetchEnhanceRoutes, getCardLlm, setCardLlm } from '@melite/catalog';
import { isLiveRunStatus, statusOrPendingOf } from '@melite/contracts/stageView';
import css from './card.module.css';
/** How long the skeleton holds the box before the real detail swaps in. */
const ZOOM_SKELETON_MS = 500;
/** The zoomed card's bounded size — width caps at 760px, vh-bounded so
 * the ≈square card fits without page scroll (the old tree's number). */
const ZOOM_DETAIL_MAX_PX = 760;
/** The envelope's huge class (surface.size='huge'): the studio wants
 *  room — the card grows (the DECLARATION is estate truth). */
const ZOOM_HUGE_MAX_PX = 1160;
/** The card's width law, pure (the envelope lift's decision): the
 *  estate's surface.size='huge' grows the card for studio room. The
 *  viewport cap measures WIDTH (94vw, room for the pane's own edge) —
 *  a vh cap on width was a category error that clipped the right
 *  half of the params column on short viewports (2026-09-12). */
export function zoomWidthFor(surfaceSize) {
    const huge = surfaceSize === 'huge';
    return `min(${huge ? ZOOM_HUGE_MAX_PX : ZOOM_DETAIL_MAX_PX}px, 94vw)`;
}
/** THE FULL-PAGE LAW (2026-09-13, the operator's hour-7: "the modal
 *  is not taking up the full page like before"). A studio surface
 *  ('huge') IS the old system's full-page card: width AND height take
 *  the page (94vw/94vh — the pane keeps its edge, the shell breathes).
 *  Ordinary cards keep the bounded ≈square law verbatim. */
export function zoomSizeFor(surfaceSize) {
    if (surfaceSize !== 'huge')
        return { width: zoomWidthFor(surfaceSize), maxWidth: '100%' };
    return { width: 'min(94vw, 1720px)', maxWidth: '100%', height: '94vh', maxHeight: '94vh' };
}
/** The settle skeleton — an all-skeleton layout with no real content
 *  (the shimmer sweep is the old tree's loading face). */
function ZoomSkeleton() {
    return h('div', { className: css.zoomSkeleton }, h('div', { className: css.skLine + ' ' + css.skWide }), h('div', { className: css.skLine }), h('div', { className: css.skLine }), h('div', { className: css.skBlock }), h('div', { className: css.skLine }), h('div', { className: css.skRow }, h('div', { className: css.skLine + ' ' + css.skShort }), h('div', { className: css.skLine + ' ' + css.skShort })));
}
/** One overlay mount (keyed per stage by the caller). */
// THE BUILD STAMP (the verification law, 2026-09-21): the operator
// decides in one glance whether the screen runs the bytes that hold
// the fix — UTC stamp, dim, right of the stage title.
const ZOOM_BUILD = 'build 09-20 18:47';
function ZoomMount(props) {
    const { stage, detail, onClose, ...rest } = props;
    const [ready, setReady] = useState(false);
    // THE REGISTERED GESTURE (the 1:1 law): whatever the detail body
    // bound wins; onRun is the fallback, never the bypass. A REF, NOT
    // STATE — React's lazy-state law CALLS any function handed to a
    // state setter (the verb would fire as an "updater" at bind time
    // and store undefined); the ref stores the verb untouched and the
    // pill reads it at click time.
    const boundRef = useRef(null);
    // THE ✦ SEAT (stroke 23): the detail's enhance verb lands beside
    // Run — state (not a ref) because the capsule's PRESENCE and busy
    // face render. The binder is STABLE (useCallback, []) so the
    // detail's bind effect fires once per mount, never a loop.
    const [enhanceVerb, setEnhanceVerb] = useState(null);
    const [enhancingBar, setEnhancingBar] = useState(false);
    const bindEnhanceStable = useCallback((v) => { setEnhanceVerb(() => v); }, []);
    const fireEnhance = () => {
        if (enhanceVerb === null || enhancingBar)
            return;
        setEnhancingBar(true);
        void Promise.resolve(enhanceVerb()).finally(() => { setEnhancingBar(false); });
    };
    // THE CARD LLM DROPDOWN (operator order: "the cards need a model
    // dropdown to select the models we want"): the ✦ verb's model
    // selector — the LIVE route list off the catalog door, the choice
    // persisted per browser (the ✦ rail reads it at call time; Auto =
    // the estate's preference chain server-side). Renders only when
    // routes answer (standalone mounts keep the verb, lose the pick).
    const [llmRoutes, setLlmRoutes] = useState(null);
    const [cardLlm, setCardLlmSel] = useState('');
    useEffect(() => {
        let alive = true;
        setCardLlmSel(getCardLlm() ?? '');
        void fetchEnhanceRoutes().then((routes) => {
            if (alive)
                setLlmRoutes(routes);
        });
        return () => { alive = false; };
    }, []);
    const pickLlm = (route) => {
        setCardLlm(route);
        setCardLlmSel(route);
    };
    // THE ENVELOPE LIFT: the detail reports the estate's surface.size;
    // the frame grows for 'huge' (the card listens, the view talks).
    const dialogRef = useRef(null);
    const [surfaceSize, setSurfaceSize] = useState(null);
    const onSurface = (size) => { setSurfaceSize(size === '' ? null : size); };
    // The settle gate: the skeleton holds until the timer passes.
    useEffect(() => {
        const t = window.setTimeout(() => { setReady(true); }, ZOOM_SKELETON_MS);
        return () => { window.clearTimeout(t); };
    }, [stage.id]);
    // THE MODAL OWNERSHIP (DSH useModalLayer): the overlay's Escape,
    // its focus lifetime and its place in the document's layer stack
    // are the primitive's — no local window keydown listener. ZoomMount
    // exists only while the overlay is shown (CardZoomOverlay renders it
    // through the body portal), so the layer is open for its whole life.
    useModalLayer(dialogRef, true, onClose);
    // THE FRAME GESTURE + THE WEBHOOK BAR (hour-26, the operator: the
    // play button rides the top bar; the comfyui progress webhooks
    // surface in a strip under it, like the old system). The frame
    // derives both from the row it already holds — the SAME currency
    // the drill read (the optimistic start flag OR the row's run
    // state; stage.result.progress {value,max} + activity; the failed
    // run's error text) — so every face (generic drill or studio
    // claim) gets ONE gesture seat at the top and ONE live strip,
    // never per-body duplicates.
    // the owner's live judgement (was a private set that never knew the
    // wire's 'live' nor the estate's 'stopping')
    const live = props.running
        || isLiveRunStatus(typeof stage.runStatus === 'string' ? stage.runStatus : '');
    const rec = typeof stage.result === 'object' && stage.result !== null ? stage.result : null;
    const prog = rec !== null && typeof rec['progress'] === 'object' && rec['progress'] !== null
        ? rec['progress'] : null;
    const act = rec !== null && typeof rec['activity'] === 'string' ? rec['activity'] : '';
    const pct = prog !== null && prog.max > 0 ? Math.floor((100 * prog.value) / prog.max) : null;
    // the owner's failed judgement (was a raw 'failed' compare — an
    // 'error'-worded run showed no refusal text here while the tile did).
    // The view-side read: the persisted row can carry a word no door
    // validated ('unreachable') — not failed, and no throw at the pane.
    const failedText = statusOrPendingOf(typeof stage.runStatus === 'string' ? stage.runStatus : '') === 'error'
        && typeof rec?.['error'] === 'string' ? rec['error'] : null;
    // THE START-ERROR OVERRIDE: a client-side start rejection (no row
    // write yet, or the row write itself failed) still owns the bar —
    // the freshest rejection wins
    const startError = typeof props.startError === 'string' && props.startError !== '' ? props.startError : null;
    return h('div', {
        ref: dialogRef,
        className: css.zoomOverlay,
        // THE DIALOG CONTRACT (the hand-roll row 2.7): the full-bleed
        // surface stays ours (the audit's own call — a 94vw CSS
        // scale-in card is not DSH's Modal), but the overlay now carries
        // the dialog semantics useModalLayer keys on, so Escape, the
        // focus lifetime and the layer stack belong to the primitive
        // instead of a local window keydown listener.
        role: 'dialog',
        'aria-modal': true,
        'aria-label': 'Stage ' + String(stage.title ?? stage.card ?? stage.id),
        // backdrop click closes (target === currentTarget so card clicks
        // don't bubble-close)
        onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); },
    }, h('div', { className: css.zoomScroll }, h('div', { className: css.zoomInner }, h('div', {
        className: css.zoomCard,
        style: zoomSizeFor(surfaceSize),
    }, h('div', { className: css.zoomBar }, h('span', { className: css.zoomTitle }, 'Stage ' + String(stage.title ?? stage.card ?? stage.id)), h('span', { className: css.zoomBuild, title: ZOOM_BUILD }, ZOOM_BUILD), 
    // THE RUN PILL (the one gesture seat, frame-owned): ghost
    // face, glyph + word, Stop mid-run — the drill/studio
    // bottom seats retired with it.
    // THE ✦ CAPSULE (stroke 23): beside Run, frame-rendered —
    // the detail bound the verb; the promise owns the busy face.
    // THE MODEL DROPDOWN rides its left edge (the ✦ verb's own
    // selector — one seat, the choice threads every enhance
    // press through the shared card-LLM preference).
    // THE KEYED BAR (the 2026-09-21 pull, mutation-proven:
    // enhanceVerb's promise resolves MID-RUN, this capsule
    // flips null→array-of-2, every POSITIONAL sibling after
    // it shifted and REMOUNTED — the seat, then the whole
    // preview body — and the scroll clamped 355→46 in the
    // dead frame. Children match by KEY, never by position;
    // the capsule occupies its two slots ALWAYS (null when
    // absent) so the list's shape never changes.
    enhanceVerb !== null
        ? [
            llmRoutes !== null
                ? h('select', {
                    key: 'llm',
                    className: css.drillLlm,
                    'aria-label': 'Enhance model', 'data-testid': 'drill-llm',
                    value: cardLlm,
                    onChange: (e) => { pickLlm(e.target.value); },
                }, h('option', { value: '' }, 'Auto'), ...llmRoutes.map((r) => h('option', { value: r, key: r }, r)))
                : null,
            h('button', {
                key: 'enhance',
                className: css.drillRunBtn, type: 'button',
                'aria-label': 'Agent Enhance', 'data-testid': 'drill-enhance',
                disabled: enhancingBar,
                onClick: fireEnhance,
            }, h('span', null, enhancingBar ? '✦ enhancing…' : '✦ Enhance')),
        ]
        : [null, null], live
        ? h('button', {
            key: 'run',
            className: css.drillRunBtn, type: 'button',
            'aria-label': 'Stop run', 'data-testid': 'drill-stop',
            onClick: () => { props.onStop(); },
        }, h(IconStopFillRegular, { size: 16 }), h('span', null, 'Stop'))
        : h('button', {
            key: 'run',
            className: css.drillRunBtn, type: 'button',
            'aria-label': 'Run stage', 'data-testid': 'drill-run',
            onClick: () => { (boundRef.current ?? props.onRun)(); },
        }, h(IconPlayOutlineRegular, { size: 16 }), h('span', null, 'Run')), 
    // THE CLOSE PILL (the operator's law: the ✕ rides the
    // SAME ghost-pill grammar as ✦ Enhance and Run — glyph +
    // word, one button row, no orphan icon seat).
    h('button', {
        key: 'close',
        className: css.drillRunBtn,
        type: 'button',
        'aria-label': 'Collapse card',
        onClick: onClose,
    }, h('span', null, '✕'), h('span', null, 'Close'))), 
    // THE GEOMETRY-INVARIANT STATUS SEAT (the 2026-09-21
    // seizure law, operator: "everytime this component
    // updates … it gets jerked up"): the row rides the drill
    // from open to close — live shows spinner + activity +
    // percent + meter, failed shows the reason (whole text —
    // the drill is where it is READ), idle/succeeded hold
    // the seat EMPTY. The old mount/unmount at every run
    // boundary removed 23px ABOVE the scroll area and dragged
    // the view up a hit at a time (measured: bodyY 123→100
    // with scrollTop 346→74 at terminal). Content churns
    // inside the reserved box; the box never moves.
    (live || failedText !== null || startError !== null)
        ? h('div', { key: 'status', className: css.zoomWebhook, role: 'status', 'data-testid': 'zoom-status' }, live
            ? h('span', { className: css.drillProgress, 'data-testid': 'drill-progress' }, h(IconLoadingOutlineRegular, { size: 14 }), h('span', null, [
                act !== '' ? act : 'running',
                pct !== null ? ' · ' + String(pct) + '%' : '',
            ].join('')), pct !== null
                ? h('span', { className: css.zoomMeter }, h('span', { className: css.zoomMeterFill, style: { width: pct + '%' } }))
                : null)
            : failedText !== null || startError !== null
                ? h('span', { className: css.runError, 'data-testid': 'drill-run-error' }, startError ?? failedText)
                : null)
        : null, 
    // THE BODY SEAT (the hour-7 height war): the detail sits in
    // a FLEXED, MIN-ZERO body — the studio's own height:100%
    // chain (studioRoot → .shell grid) needs a parent that GIVES
    // height; under a bare auto-height flex child the grid
    // collapsed to the rail's content height and the preview
    // + timeline sank below the fold. Ordinary cards are
    // unaffected: their zoomDetail scrolls inside.
    h('div', { key: 'body', className: css.zoomBody }, ready
        ? h(props.detail, { stage, bench: rest.bench, running: rest.running, onRun: rest.onRun, onStop: rest.onStop, onClose, onRemoved: rest.onRemoved, onPatchParams: rest.onPatchParams, renderStageView: rest.renderStageView, renderPreview: rest.renderPreview, onSurface, runId: rest.runId, bindRun: (r) => { boundRef.current = r; }, bindEnhance: bindEnhanceStable })
        : h(ZoomSkeleton))))));
}
/** CardZoomOverlay — portal to document.body, FIXED inset-0 (the old
 * tree's own DSH rule), keyed per stage. */
export function CardZoomOverlay(props) {
    const mounted = typeof document !== 'undefined';
    const tree = h(ZoomMount, { key: props.stage.id, ...props });
    return mounted ? createPortal(tree, document.body, 'zoom-portal') : tree;
}
//# sourceMappingURL=zoom.js.map
