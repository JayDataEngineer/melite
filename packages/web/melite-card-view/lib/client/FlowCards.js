import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * The melite_flow toolview — THE ACTION CARDS, rendered NATIVE in the
 * DSH React tree (2026-09-10 Phase 1: the iframe died).
 *
 * Keyed into the shipped `tool.call.toolview` seat for the wire tool
 * name `melite_flow`. NOT an iframe, NOT a bridge: the cards are React
 * components IN the host document —
 *   (a) THEME — inherited. The cards sit in DSH's tree, so every
 *       --dsw-alias-* token applies directly; the embed-bridge token
 *       copy is gone with the frame (the deck canvas keeps its own
 *       until Phase 2).
 *   (b) HEIGHT — gone as a problem. In-tree flow lays out natively;
 *       no polling, no scrollHeight reads.
 *   (c) DRILLDOWN — the ui-primitives Modal (body portal, Escape/
 *       mask close, aria-modal): the split detail — params left,
 *       outputs right — per the operator's directive 2026-09-10
 *       ("our cards go inside the dsh modal for the split drill
 *       down and drill up"). No zoom-promotion machine; DSH's own
 *       overlay machinery is the only layer.
 *
 * The wire is the editor's wire, same-origin via the card-deck host's
 * /v1 proxy (draft.ts owns every fetch). The user reviews the rows,
 * edits params in the drilldown, and presses Run ON THE CARD — the run
 * door (runs/start over the wire frame) is a user gesture, never the model's.
 *
 * WATERFALL LEDGER (operator law 2026-09-10: ride DSH 1:1 → minimize
 * our code → DOCUMENT what can't be ridden; each entry is for review):
 *   (a-1) RIDEN 1:1 — Button, Input, Pill, StateDot, Modal from the
 *         INSTALLED @deepseek-ai/dsh-client-ui-primitives rc.8 (Pill
 *         replaced hand-rolled capsule badges; Modal replaced the zoom
 *         machine). The css module is LAYOUT ONLY, every color an
 *         inherited --dsw-alias-* token — the ui-model-selection idiom.
 *   (c-4) rc.8 SURFACE GAP: the reference catalog also ships Tag and
 *         Switch; installed rc.8 does NOT. Pill is the shipped capsule
 *         for both (static span, no onClick = read-only badge; with
 *         onClick = the boolean toggle). REVIEW at the next rc bump:
 *         swap to Tag/Switch when installed.
 *   (c-1) NO ATOM: the card ROW (a list row that opens a Modal).
 *         DisclosureRow is inline expansion — a different interaction;
 *         no shipped atom covers row→modal. Hand-rolled, layout-only.
 *   (a-2) THE LIVE RUN, post-kill: the gateway-era events WS died
 *         with the gateway app (nothing serves it, by design); the
 *         run tail rides the run resource's frames (runs/subscribe
 *         over the reconnecting RemoteStream — the entry hands the
 *         carrier down, cards-resource.ts's bindRunFramesRemote).
 *         The run press seeds the tail; the interval poll is gone.
 *   (c-3) NO CLIENT: the draft/run remote layer (draft.ts). No DSH
 *         package wraps the estate's remotes as a browser client; the
 *         thin wire caller (client-request frame, api-gateway.md) is
 *         the sanctioned shape for plugins outside the web kernel.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import css from './card.module.css';
import { Pill, StateDot } from '@deepseek-ai/dsh-client-ui-primitives';
import { CardDrill } from "./card-drill.js";
import { cardsDraftStageAddress, subscribeRunFrames } from "./cards-resource.js";
import { STATUS_DOT } from "./bench-row.js";
import { cardRows, fetchDraft, paramFields, patchStageParams, refuseForUnlandedWrite, runFinished, startDraft, } from "./draft.js";
import { rejectionVoice } from "./rejection-voice.js";
/** Parse the melite_flow / card-tool call: the draft id + the model
 *  header. NATIVE CHANNEL FIRST: a settled result carries the tool's
 *  persisted presentationMeta (ToolResultNode.meta) with {draft_id} —
 *  every card tool emits it; the handle is read from meta, never
 *  parsed out of prose. The render-text token ('card <draftId>') is
 *  the LEGACY fallback: sessions logged before a tool grew its
 *  projector still hydrate through the parse rule. */
export function parseCardsBlock(block) {
    const settled = block.kind === 'tool-result';
    const argsRaw = settled ? (block.call?.argsRaw ?? '') : (block.argsRaw ?? '');
    let model = null;
    let malformedArgs = false;
    if (argsRaw !== '') {
        try {
            const args = JSON.parse(argsRaw);
            if (typeof args['model'] === 'string' && args['model'] !== '')
                model = args['model'];
        }
        catch {
            // L10 (the fallback audit): malformed args used to render
            // header-less — indistinguishable from a model-less call. The
            // flag carries the defect to the header, which badges it
            // visibly; the render still never throws.
            malformedArgs = true;
        }
    }
    let draftId = null;
    if (settled && block.isError !== true) {
        // 1. NATIVE: the persisted presentationMeta payload.
        const meta = block.meta;
        if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
            const id = meta['draft_id'];
            if (typeof id === 'string' && id !== '')
                draftId = id;
        }
        // 2. LEGACY: the render token (pre-projector logs; the rule this
        //    view parsed for years — the token after 'card ' or 'draft ').
        if (draftId === null && Array.isArray(block.content)) {
            for (const part of block.content) {
                if (part === null || typeof part !== 'object')
                    continue;
                const text = part.text;
                if (typeof text !== 'string')
                    continue;
                const atCard = text.indexOf('card ');
                const atIdx = atCard >= 0 ? atCard : text.indexOf('draft ');
                if (atIdx < 0)
                    continue;
                const rest = text.slice(atIdx + (atCard >= 0 ? 5 : 6));
                const end = rest.indexOf(' ');
                const tok = end < 0 ? rest : rest.slice(0, end);
                if ((tok.startsWith('draft-') || tok.startsWith('p_')) && tok.length > 2) {
                    draftId = tok;
                    break;
                }
            }
        }
    }
    return { draftId, model, malformedArgs, settled, isError: block.isError === true };
}
/** Draft doc + live run status (all doors in draft.ts; the live tail
 *  rides the run resource's frames — cards-resource.ts). */
function useDraft(draftId) {
    const [doc, setDoc] = useState(null);
    const [live, setLive] = useState(null);
    const [liveRunId, setLiveRunId] = useState(null);
    const [error, setError] = useState(null);
    const [tick, setTick] = useState(0);
    const refresh = useCallback(() => { setTick((t) => t + 1); }, []);
    /** Seed the live tail from the run press's own answer — the started
     *  run id is the only honest seed (the draft doc carries none). */
    const startedRun = useCallback((runId) => {
        setLive(null);
        setLiveRunId(runId);
    }, []);
    // PER-DRAFT RESET: the live tail and its doc die with the draft —
    // a refresh (tick) re-reads the doc but never kills a seeded tail
    // (the drill can close and reopen mid-run; the tail survives).
    useEffect(() => {
        if (draftId === null)
            return;
        setDoc(null);
        setLive(null);
        setLiveRunId(null);
        setError(null);
    }, [draftId]);
    // Hydrate the doc (one GET per draftId or manual refresh; never a storm).
    useEffect(() => {
        if (draftId === null)
            return;
        let alive = true;
        fetchDraft(draftId)
            .then((d) => { if (alive)
            setDoc(d); })
            .catch((e) => { if (alive)
            setError(rejectionVoice(e)); });
        return () => { alive = false; };
    }, [draftId, tick]);
    // THE LIVE RUN — the run tail rides the run resource's frames
    // (runs/subscribe over the reconnecting RemoteStream, the run view's
    // own carrier; handroll row 1.8's consumer tail CLOSED here — the
    // interval poll is gone). A failure frame changes nothing: the
    // stream's supervisor owns the retry, and the last live doc stays
    // (the poll's own silent-transient law). A terminal status ends the
    // tail and refreshes the draft doc (the runs seat stamps a fresh
    // createdAt on write-back); the tail ending without one keeps the
    // last live doc — the card's face never freezes pretending.
    useEffect(() => {
        if (liveRunId === null)
            return;
        const controller = new AbortController();
        let alive = true;
        void (async () => {
            for await (const frame of subscribeRunFrames(liveRunId, controller.signal)) {
                if (!alive)
                    return;
                if (!frame.ok)
                    continue;
                setLive({ run_id: frame.value.runId, status: frame.value.status, stages: frame.value.stages });
                if (runFinished(frame.value.status)) {
                    // the runs seat stamps a fresh createdAt on write-back; refetch
                    setTick((t) => t + 1);
                    return;
                }
            }
        })();
        return () => { alive = false; controller.abort(); };
    }, [liveRunId]);
    return { doc, live, error, refresh, startedRun };
}
/** The chat-listed card row: kind tag, title, service, status dot, prompt.
 *  THE CLICK opens the AUTHORING SURFACE in the Cards tab (the old
 *  embed's law — timeline, video preview, per-gen splits, global
 *  audio) when the shell face is installed; without a shell (unit
 *  tests, headless harnesses) it falls back to the in-card drill. */
function CardRowLine({ row, onOpen }) {
    // ONE MAP, BOTH PLANES (2026-10-01): the dot is bench-row's
    // STATUS_DOT over the folded CardStatus — the inline five-word map
    // is gone, so the chat tile and the bench tile can no longer
    // disagree. pending (never ran or unrecognized) shows no dot at all,
    // never a fake state.
    const dot = STATUS_DOT[row.status];
    return (_jsxs("button", { type: "button", className: css.row, onClick: onOpen, "data-stage": row.stageId, "data-status": row.status, children: [row.thumbUrl !== null
                ? _jsx("img", { className: css.thumb, src: row.thumbUrl, alt: row.title, loading: "lazy" })
                : _jsx(Pill, { children: row.kind }), _jsx("span", { className: css.rowTitle, children: row.title }), row.service !== null && _jsx(Pill, { children: row.service }), dot !== null && _jsx(StateDot, { state: dot }), row.prompt !== null && _jsx("span", { className: css.prompt, children: row.prompt })] }));
}
/** One melite_flow call as the REAL action cards (native React, in-tree). */
export function FlowCards({ block, openSurface, openMedia }) {
    const parsed = useMemo(() => parseCardsBlock(block), [block]);
    const { doc, live, error, refresh, startedRun } = useDraft(parsed.draftId);
    const [openStage, setOpenStage] = useState(null);
    // A settled, successful call whose result predates the draft contract
    // (render text without a draft token) is a LEGACY block — it can never
    // mount cards. Never show it an eternal "composing…" (2026-08-22
    // "GETS STUCK: composing" verdict); render the inert superseded note.
    const legacy = parsed.settled && !parsed.isError && parsed.draftId === null;
    if (legacy) {
        return (_jsx("div", { className: css.card, "data-dsh-part": "melite-flow-card", "data-legacy": "1", children: _jsxs("div", { className: css.head, children: [_jsx(Pill, { children: "melite" }), _jsx("span", { className: css.model, children: parsed.model ?? 'flow' }), _jsx("span", { className: css.state, "data-state": "legacy", children: "cards \u00B7 earlier draft" })] }) }));
    }
    if (parsed.draftId === null) {
        return (_jsx("div", { className: css.card, "data-dsh-part": "melite-flow-card", children: _jsx("div", { className: css.load, children: parsed.isError ? 'draft failed' : 'composing…' }) }));
    }
    const rows = doc !== null ? cardRows(doc, live) : [];
    const openRow = rows.find((r) => r.stageId === openStage) ?? null;
    const openParams = doc?.stages.find((s) => s.id === openStage)?.params ?? {};
    return (_jsxs("div", { className: css.card, "data-dsh-part": "melite-flow-card", "data-draft-id": parsed.draftId, children: [_jsxs("div", { className: css.head, children: [_jsx("span", { className: css.badge, children: "melite" }), _jsx("span", { className: css.model, children: doc?.intent ?? parsed.model ?? 'flow' }), parsed.malformedArgs && _jsx("span", { className: css.state, "data-state": "error", children: "args unparseable \u2014 corrupted call record" }), error !== null && _jsxs("span", { className: css.state, "data-state": "error", role: "button", tabIndex: 0, onClick: refresh, onKeyDown: refresh, children: [error, " \u00B7 retry"] }), openMedia !== undefined && _jsx("button", { type: "button", className: css.media, onClick: () => { openMedia(); }, children: "open media" })] }), doc === null && error === null && _jsx("div", { className: css.load, children: "cards\u2026" }), rows.map((row) => (_jsx(CardRowLine, { row: row, onOpen: () => {
                    // THE OLD LAW: the chat card opens the authoring surface —
                    // the studio (or the generic zoom card for studio-less
                    // cards) in the shell's Cards tab, addressed to THIS stage.
                    // No shell face → the in-card drill (the degraded path,
                    // never a throw).
                    const address = parsed.draftId === null ? null : cardsDraftStageAddress(parsed.draftId, row.stageId);
                    if (address === null || openSurface?.(address) !== true) {
                        setOpenStage(row.stageId);
                    }
                } }, row.stageId))), openRow !== null && (_jsx(CardDrill, { title: 'Card ' + openRow.title, fields: paramFields(openParams), thumbUrl: openRow.thumbUrl ?? null, running: false, onRun: async (patch) => {
                    // The shared-state law: the patch lands in the domain
                    // BEFORE the run reads it — the card runs what the user
                    // SEES. A patch failure names itself and stops the run.
                    // THE RUN GATE (the one-press/one-engine law, audit
                    // 2026-09-23: this tile awaited its OWN patch but never
                    // consulted the ledger — any other in-flight or failed
                    // write for the stage ran past it). A refusal throws
                    // into the drill's runError face, same as a patch
                    // failure — never silent, never a run.
                    const draftId = parsed.draftId;
                    if (draftId === null)
                        throw new Error('draft id gone');
                    if (patch !== null)
                        await patchStageParams(draftId, openRow.stageId, patch);
                    const gate = await refuseForUnlandedWrite(draftId, openRow.stageId);
                    if (gate !== null)
                        throw new Error(gate);
                    startedRun(await startDraft(draftId));
                    setOpenStage(null);
                    refresh();
                }, onClose: () => { setOpenStage(null); refresh(); } }))] }));
}
//# sourceMappingURL=FlowCards.js.map
