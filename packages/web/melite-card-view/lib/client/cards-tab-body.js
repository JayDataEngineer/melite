/** cards-tab-body.tsx — CardsTab + the address law (extracted from
 * CardsTab.tsx hour 15; the tab body's own composition — the bench,
 * draft, and run views ride their own seam files). */
/**
 * The Cards tab body — the bench's user plane (plan §5: "the user
 * browses visually in the tab").
 *
 * Bench view (`dsh-resource://cards/bench`): the stage rows GROUPED BY
 * CARD (the categories — each card's stages under its own header with
 * a count), each row opening a DSH Modal drilldown (id/card/engine/
 * params — the chat tile's drilldown pattern, primitives Modal), the
 * revision trail's head, and the Run gesture — which projects the
 * stages onto the flow_inline wire and starts them under the bench's
 * own draft_id, EXACTLY what melite_flow's bench verb does (one
 * truth, two planes; the model's plane is per-call reads, never this
 * component's frames).
 *
 * Run view (`dsh-resource://cards/run/<runId>`): live status + stage
 * rows + artifacts, riding the resource provider's frames — plus the
 * way back: "Back to bench" navigates home, and "Restore to bench"
 * turns the card BACK INTO A FLOW (drafts/get on the run's draft_id
 * + per-stage bench/add-stage as the user, CAS-chained).
 *
 * ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 * the shell's navigation address is the SHELL's (guide clicks arrive
 * as the tab id's own address, not a cards address). An address that
 * does not parse as a cards address serves the BENCH — the tab never
 * sits on a resource no provider claims.
 *
 * The body is dispatched by the keyed `sidebar.right.pane.tab` seat
 * under the type's id; the address arrives through the standard
 * `useTabInfo` hook, the value through the standard `useResource`
 * hook. Local prop typings (the package's local-spelling pattern —
 * see index.ts) keep this package off sibling runtime imports.
 */
import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { RunRescue } from "./run-rescue.js";
import { terminalStageErrorOf } from "./run-rescue-core.js";
import { ToastViewport } from '@melite/card-base/client';
import { patchStageOutcome, patchStageParams } from "./draft.js";
import css from './card.module.css';
import { runCardStage, runBenchSequential } from "./stage-run.js";
import { CARDS_BENCH_ADDRESS, benchAddressOf, benchSessionKey, benchSessionOfAddress, fetchLatestRunForDraft, markCardsSurface, observeRunOutcome, parseCardsAddress, reconcileBenchRuns } from "./cards-resource.js";
import { stopRun } from '@melite/card-base/client';
import { statusOrPendingOf } from '@melite/contracts/stageView';
import { removeStageWire } from "./add-stage.js";
import { BenchView } from "./bench-view.js";
import { DraftView, RunView } from "./draft-run-views.js";
import { rejectionVoice } from "./rejection-voice.js";
/** ADDRESS LAW (the `loading sidebar://cards…` hang, dead 2026-09-11):
 *  the shell's navigation address is the SHELL's (guide clicks arrive
 *  as the tab id's own address, not a cards address). An address that
 *  does not parse as a cards address serves the BENCH — the tab never
 *  sits on a resource no provider claims. */
export function resolveCardsAddress(rawAddress) {
    return parseCardsAddress(rawAddress) !== null ? rawAddress : CARDS_BENCH_ADDRESS;
}
const verbClaim = (verb, text) => ({ text, kind: 'verb', verb, rowLanded: false });
const startClaim = (text) => ({ text, kind: 'start', rowLanded: true });
/** a verb's SUCCESS clears only its own claim — never a start
 *  claim, never another verb's (W6: an unrelated success eating an
 *  unanswered refusal is information loss) */
const clearVerb = (verb) => (claim) => claim !== null && claim.kind === 'verb' && claim.verb === verb ? null : claim;
export function CardsTab(props) {
    // THE SPOTLIGHT MARKER (stroke 42, the one-flow law): true while
    // THIS body is the mounted seat rendering the bench. The plugin's
    // bench watcher reads it to decide whether an agent-authored land
    // needs the reveal — a seat the user is already reading must not be
    // re-placed (their scroll/selection would reset for nothing).
    useEffect(() => {
        markCardsSurface(true);
        return () => { markCardsSurface(false); };
    }, []);
    // cards.stage.view dispatch (the ui-tool ToolCallTree call verbatim):
    // keyed by card name; unclaimed key renders the drill's own body.
    const renderStageView = (owner, fallback) => {
        if (props.renderSlot === undefined)
            return fallback;
        return (props.renderSlot('cards.stage.view', owner, { entryKey: owner.cardName, fallback }) ?? fallback);
    };
    // THE PREVIEW SEAM CONSULT (hour-9): keyed by media kind; the shared
    // card-base previews ride as the fallback — image gen rides the
    // defaults TODAY, a card claims its kind only to specialize. This is
    // the ONE consult site; the drill's RIGHT column renders it.
    const renderPreview = (owner, fallback) => {
        if (props.renderSlot === undefined)
            return fallback;
        return (props.renderSlot('cards.stage.preview', owner, { entryKey: owner.kind, fallback }) ?? fallback);
    };
    const info = typeof props.useTabInfo === 'function' ? props.useTabInfo() : undefined;
    const rawAddress = info?.tab.navigation.address ?? info?.tab.contentId ?? CARDS_BENCH_ADDRESS;
    // THE PER-CONVERSATION BINDING (stroke 44): the tab serves ITS
    // conversation's bench — the session prop wins (the law), the
    // address tail backs it (spotlight-opened tabs carry the key), and
    // 'main' serves unattributed seats. The bench record rides the
    // session-qualified address so two conversations' tabs never share
    // one stream; run/draft addresses pass through untouched.
    const benchKey = benchSessionKey(props.sessionId ?? benchSessionOfAddress(resolveCardsAddress(rawAddress)));
    const benchAddress = benchAddressOf(benchKey);
    const resolved = resolveCardsAddress(rawAddress);
    const parsed = parseCardsAddress(resolved);
    const address = parsed !== null && ('run' in parsed || 'draft' in parsed) ? resolved : benchAddress;
    const openResource = info?.tab.actions.openResource;
    const snapshot = typeof props.useResource === 'function' ? props.useResource(address) : undefined;
    const [running, setRunning] = useState(false);
    // The draft's last started run (in-session memory; on load the tab
    //  ADOPTS the estate's newest run for this draft via runs/list —
    //  the estate is the SSOT, the studio's poll survives reloads).
    const [lastRunId, setLastRunId] = useState(null);
    useEffect(() => {
        if (lastRunId !== null)
            return;
        if (snapshot?.value?.kind !== 'bench' && snapshot?.value?.kind !== 'draft')
            return;
        const draftId = snapshot.value.draftId;
        if (draftId === '')
            return;
        let alive = true;
        void fetchLatestRunForDraft(draftId).then((rid) => {
            if (alive && rid !== null)
                setLastRunId(rid);
        }).catch(() => { });
        return () => { alive = false; };
    }, [lastRunId, snapshot?.value]);
    const [localRunError, setLocalRunError] = useState(null);
    // THE ERROR-IS-NOT-A-LATCH LAW (operator 2026-10-10: "errors don't
    // go away when we have a successful gen"): localRunError speaks
    // for a start THIS tab attempted and never saw answered. It was
    // cleared only by the next verb press HERE — so a generation that
    // landed through ANY other hand (the agent's melite_flow, another
    // tab on the same bench, a headless commission) left the strip up
    // forever OVER the successful gen it already replaced. The bench
    // is the server's document (the no-stale-tab law, above): the
    // moment a stage row lands TERMINAL-DONE that this tab did not
    // watch go terminal before, the stale claim retires. The derived
    // half (terminalStageErrorOf below) still surfaces any row that
    // is failed NOW — the face stays honest in both directions, never
    // a latch.
    //
    // THE CLAIM'S KIND (the second audit's W6, 2026-10-11): the strip
    // also voices VERB refusals (patch/remove/cancel/stop/refresh) —
    // claims no row carries and the derived half can never re-derive.
    // An unrelated gen retiring one of those made information vanish
    // outright. Only START claims auto-retire on a foreign terminal
    // — and only when their row-patch LANDED (carryFailure's patch
    // can die; an unlanded refusal has no derived half to re-voice
    // it, so it must not auto-retire either). Verb claims clear only
    // when the SAME verb succeeds.
    const terminalSeen = useRef(null);
    useEffect(() => {
        const value = snapshot?.value;
        if (value === undefined || value.kind === 'run')
            return;
        const cur = new Map();
        for (const s of value.stages) {
            cur.set(s.id, typeof s.runStatus === 'string' ? s.runStatus : '');
        }
        const prev = terminalSeen.current;
        terminalSeen.current = cur;
        if (prev === null)
            return; // first frame: baseline, no claim to retire
        for (const [id, status] of cur) {
            // the fold's done family retires the claim — a stage the estate
            // settles 'completed' (or a cached/reused row) now lands too.
            // The view-side read: these are persisted bench words no door
            // validated ('unreachable' rides rows today) — an unreadable
            // word retires nothing and never throws the effect.
            if (statusOrPendingOf(status) === 'done' && statusOrPendingOf(prev.get(id) ?? '') !== 'done') {
                setLocalRunError((claim) => claim !== null && claim.kind === 'start' && claim.rowLanded ? null : claim);
                return;
            }
        }
    }, [snapshot?.value]);
    // THE DEPLOY HANDSHAKE (2026-09-23, the stale-tab root rot): probe
    // THERE IS NO STALE TAB (operator, 2026-10-10, in the operator's
    // own words: "THE TAB IS NEVER STALE, IT IS LITERALLY IMPOSSIBLE
    // FOR THE BENCH TO BE STALE. WHEN THE USER DOES SOMETHING TO IT,
    // IT UPDATES. WHEN THE AI DOES SOMETHING TO IT, IT UPDATES
    // EVERYTIME. THIS REGRESSION IS EXTREME.").
    //
    // The face this replaces was a FALSE ALARM with a false claim on
    // both sides. It compared this tab's baked stamp against the
    // lane's served stamp — but every client bundle appends the SAME
    // global assignment (`globalThis.__MELITE_BUILD_STAMP__=<hex>`,
    // appended by the shared build plugin), so whichever bundle
    // evaluated last owned the value: the tab compared ITSELF against
    // a sibling package's hash (live receipt: the tab reported
    // infer-gallery's cdf44c31 while the lane served melite-card-view's
    // 8c2dfa26) and rendered "edits made here may run old code" over
    // a bench that is, by construction, a live server document: every
    // edit — the user's or the agent's — lands through the doors and
    // the view re-reads it.
    //
    // So: no banner, no probe, no claim. The bench is the server's
    // document and this tab is a reader of it; nothing in this tab
    // asserts staleness ever again. The pipeline itself (build-side
    // stamp append + the /melite-media/card-build route) was deleted
    // 2026-10-12 — a stamp with no reader is cruft (handroll audit
    // 3.3); this tombstone keeps the false alarm's lesson.
    // THE OUTCOME WATCH (the attribution half): one controller per tab
    //  life — every stage run's observer rides it, unmount ends the
    //  watches (a completed patch is idempotent; an interrupted one is
    //  rewritten by the next run). THE BENCH IS NEVER TAKEN OVER (the
    //  two-month law): a started run stays a TILE — the observer writes
    //  'running' at start and the terminal status + result at settle,
    //  each patch bumps the refresh tick so the rail re-reads; every
    //  other card stays runnable while it goes.
    const outcomeAbort = useRef(null);
    const [benchTick, setBenchTick] = useState(0);
    useEffect(() => () => { outcomeAbort.current?.abort(); }, []);
    const touchBench = useCallback(() => { setBenchTick((t) => t + 1); }, []);
    // THE PHANTOM RECONCILE (2026-09-13): when a bench value lands, rows
    // stamped running/queued are probed ONCE per stage:run — dead runs
    // (the registry restarted under them) flip to their honest terminal,
    // live runs arm a tab-side observer so terminal always lands. The
    // armed set spans refreshes (one probe per run, ever); the controller
    // lives for the tab's lifetime (a refresh never kills a live probe).
    const reconcileArmed = useRef(new Set());
    const reconcileCtrl = useRef(null);
    if (reconcileCtrl.current === null)
        reconcileCtrl.current = new AbortController();
    useEffect(() => () => { reconcileCtrl.current?.abort(); }, []);
    const benchValue = snapshot?.value?.kind === 'bench' ? snapshot.value : null;
    useEffect(() => {
        if (benchValue === null)
            return;
        void reconcileBenchRuns(benchValue, {
            signal: reconcileCtrl.current?.signal,
            onTouched: touchBench,
            armed: reconcileArmed.current,
        });
    }, [benchValue, touchBench]);
    // THE TILE CHROME'S RUN MAP (2026-09-13): stageId → live runId —
    // armed when a run starts (the drill's Run, the tile's play, the
    // sequential pass), cleared when its observer settles terminal.
    // The stop button targets this; unknown-run rows (another session)
    // disable stop — reconcile heals their status instead.
    const [stageRuns, setStageRuns] = useState({});
    const clearStageRun = useCallback((stageId) => {
        setStageRuns((m) => { const n = { ...m }; delete n[stageId]; return n; });
    }, []);
    const onStarted = useCallback((runId, ran) => {
        setRunning(false);
        setLastRunId(runId);
        /* v8 ignore next 1 -- every run answer carries its started stage (probe 2026-09-19) */
        if (ran === undefined)
            return;
        setStageRuns((m) => ({ ...m, [ran.stageId]: runId }));
        if (outcomeAbort.current === null)
            outcomeAbort.current = new AbortController();
        void observeRunOutcome(ran.draftId, ran.stageId, runId, outcomeAbort.current.signal, touchBench)
            .then(() => { clearStageRun(ran.stageId); });
    }, [touchBench, clearStageRun]);
    // RUN ALL — the sequential pass (the old runAll law): one run per
    //  card in bench order, stop on failure; every tile flips through
    //  the SAME observer the drill's Run uses. Cancel stops the pass
    //  after the in-flight card's observer settles.
    const runAllAbort = useRef(null);
    /* v8 ignore next 4 -- BenchView is only ever mounted with kind bench (single-render law — probe 2026-09-19) */
    const onRun = useCallback(() => {
        if (snapshot?.value?.kind !== 'bench')
            return;
        // THE STALE-LIST FENCE (the audit's A4, 2026-09-23: the pass
        // composes the snapshot's stage LIST — per-stage params
        // self-heal via runCardStage's fresh read, but the list cannot).
        // A failed refresh voices cards-refresh-failed AND blocks the
        // pass: Run ALL never composes from last-good state.
        if (snapshot.status === 'failed') {
            setLocalRunError(verbClaim('refresh', 'refresh failed — showing the last good state, not composing from it ('
                + (snapshot.failure?.message ?? 'cards resource failed') + ')'));
            return;
        }
        setRunning(true);
        setLocalRunError(null);
        runAllAbort.current?.abort();
        const ctrl = new AbortController();
        runAllAbort.current = ctrl;
        void runBenchSequential(snapshot.value, {
            signal: ctrl.signal,
            onCardStarted: (runId) => { setLastRunId(runId); },
            onTouched: touchBench,
        }).then((res) => {
            setRunning(false);
            if (res.refused !== null)
                setLocalRunError(startClaim(res.refused));
        });
    }, [snapshot, touchBench]);
    // RE-RUN ONE STAGE (the drill's Run): the COMPOSING door — the
    // stage alone, its params patched into the bench BEFORE the run
    // reads it (the drill does the patch, this does the start), then
    // startCardRun over the run-wire package.
    const onRunStage = useCallback((stage) => {
        // THE NO-SILENT-REJECT LAW (stroke 25's law, applied to the run
        // start): a stale/unhydrated bench is a REJECTION WITH A FACE,
        // never a quiet return — the operator pressed Run and got
        // nothing.
        /* v8 ignore next 4 -- single-render law: BenchView mounts only with kind bench (probe 2026-09-19); the loud voice fences a shape the harness never produces */
        if (snapshot?.value?.kind !== 'bench') {
            setLocalRunError(startClaim('the bench is not ready to run from — reopen the Media Flow tab (snapshot kind: ' + String(snapshot?.value?.kind ?? 'none') + ')'));
            return;
        }
        setRunning(true);
        setLocalRunError(null);
        const draftId = snapshot.value.draftId;
        // The rev fences every row write below (stale revs rebase inside
        // the door — the revless-write cure, 2026-09-14). The guard above
        // proved the snapshot IS a bench, so the read needs no second
        // kind check — and it is taken HERE, where the narrowing holds,
        // because a closure re-reads the binding un-narrowed.
        const rev = snapshot.value.rev;
        const stageId = stage.id;
        // THE REFUSAL/FAILURE CARRY (operator 2026-09-14: the compose
        // refusal "needs to be in drill down card as well"): a refused —
        // or THROWN — start writes the row FAILED with the reason: the
        // tile AND the open drill's failure face read the same row, so
        // the why lands where the Run was pressed, not just the tab top.
        const carryFailure = (error) => {
            setRunning(false);
            setLocalRunError(startClaim(error));
            /* v8 ignore next 2 -- the outcome-patch tail rides the covered observe lane (probe 2026-09-19) */
            void patchStageOutcome(draftId, stageId, { runStatus: 'failed', result: { error } }, rev)
                .then(() => { touchBench(); })
                .catch(() => {
                // the row patch died: the derived half will never re-voice
                // this refusal — the claim must NOT auto-retire (W6)
                setLocalRunError((claim) => claim !== null && claim.kind === 'start' ? { ...claim, rowLanded: false } : claim);
            });
        };
        // THE RUN GATE LIVES IN runCardStage (the one-press/one-engine
        // law — the tile, the drill, the draft view, Run ALL, and the
        // rescue rerun all ride that one composing door, so the refusal
        // below covers every verb with no second gate to drift).
        void runCardStage(draftId, stage).then((res) => {
            if ('runId' in res)
                onStarted(res.runId, { draftId, stageId });
            else
                carryFailure(res.refused);
        }, (e) => {
            // a THROWN start (wire down, 500, read-back failure) is a
            // rejection too — the old code had NO catch here: the promise
            // died unhandled, running stuck, and the operator saw NOTHING
            carryFailure(rejectionVoice(e));
        });
    }, [snapshot, onStarted, touchBench]);
    // THE TILE CHROME'S STOP + REMOVE (the chat-input law's verbs):
    // stop rides the run-wire's cancel door for the row's live run;
    // remove rides the bench's CAS door (the drill's own verb, lifted
    // to the tile — the trash replaces the drill-only affordance).
    const onStopStage = useCallback((stage) => {
        const rid = stageRuns[stage.id];
        if (rid === undefined)
            return;
        void stopRun(rid)
            .then(() => { setLocalRunError(clearVerb('stop')); })
            .catch((e) => {
            setLocalRunError(verbClaim('stop', rejectionVoice(e)));
        });
    }, [stageRuns]);
    /* v8 ignore next 3 -- single-render law: the bench rows ride a bench-kind snapshot (probe 2026-09-19) */
    const onRemoveStage = useCallback((stage) => {
        if (snapshot?.value?.kind !== 'bench')
            return;
        void removeStageWire({ stage: stage.id, expect_rev: snapshot.value.rev }, snapshot.value.sessionKey)
            // the claim's own verb SUCCEEDING clears it (the W6 law's
            // other half — a remove that lands retires the remove refusal)
            .then(() => { setLocalRunError(clearVerb('remove')); touchBench(); })
            .catch((e) => {
            setLocalRunError(verbClaim('remove', rejectionVoice(e)));
        });
    }, [snapshot, touchBench]);
    // PARAMS PATCH for surface views (the slot's onPatch currency):
    // the same drafts/patch door the drill's own editor rides.
    /* v8 ignore next 2 -- single-render law: internal callers always satisfy the kind (probe 2026-09-19) */
    const onPatchParamsStage = useCallback((stage, patch) => {
        if (snapshot?.value?.kind !== 'bench' && snapshot?.value?.kind !== 'draft')
            return;
        // THE CAS FENCE RIDES EVERY AUTHOR (the parameter audit): the
        // surface-params patch joins the bench revision law — a bench
        // that moved under the write refuses loud (the snapshot's rev
        // is the expect; the observer refreshes the doc on the refusal).
        void patchStageParams(snapshot.value.draftId, stage.id, patch, snapshot.value.rev)
            .then(() => { setLocalRunError(clearVerb('patch')); touchBench(); })
            .catch((e) => {
            setLocalRunError(verbClaim('patch', rejectionVoice(e)));
            touchBench();
        });
    }, [snapshot, touchBench]);
    // DRAFT-STAGE RUN (the draft view's Run): the same composing door —
    // patch happens in the drill, this starts the stage's run and arms
    // the same outcome observer (the observer writes the draft's stage
    // outcome; the bench is never touched).
    /* v8 ignore next 3 -- the draft-stage editor only mounts on a draft-kind snapshot (probe 2026-09-19) */
    const onRunDraftStage = useCallback(() => {
        const value = snapshot?.value;
        if (value?.kind !== 'draft')
            return;
        const target = value.stages.find((s) => s.id === value.stageId);
        if (target === undefined)
            return;
        setRunning(true);
        setLocalRunError(null);
        // THE GATE LIVES IN runCardStage (the one-press/one-engine law —
        // the draft editor's Run rides the same composing door, so the
        // refusal (with its row carry below) covers it with no second
        // gate to drift).
        void runCardStage(value.draftId, target).then((res) => {
            if ('runId' in res)
                onStarted(res.runId, { draftId: value.draftId, stageId: target.id });
            else {
                setRunning(false);
                setLocalRunError(startClaim(res.refused));
                // THE REFUSAL CARRY (same law as the bench drill): the
                // refused draft-stage start lands on its row, so the open
                // drill's failure face reads the why.
                const draftId = value.draftId;
                const stageId = target.id;
                const error = res.refused;
                /* v8 ignore next 1 -- the enclosing callback already returned on non-draft (probe 2026-09-19) */
                const rev = value.kind === 'draft' ? value.rev : undefined;
                void patchStageOutcome(draftId, stageId, { runStatus: 'failed', result: { error } }, rev)
                    .catch(() => {
                    setLocalRunError((claim) => claim !== null && claim.kind === 'start' ? { ...claim, rowLanded: false } : claim);
                });
            }
        });
    }, [snapshot, onStarted]);
    // DRAFT-STAGE PATCH (the draft view's onPatch currency): the drafts
    // door directly — the same verb the drill's editor rides.
    /* v8 ignore next 2 -- the draft editor only mounts on a draft-kind snapshot (probe 2026-09-19) */
    const onPatchParamsDraft = useCallback((patch) => {
        const value = snapshot?.value;
        if (value?.kind !== 'draft')
            return;
        // THE CAS FENCE RIDES EVERY AUTHOR (the parameter audit): the
        // draft's own bench revision fences the write; a moved draft
        // refuses loud, never merges under the earlier author.
        void patchStageParams(value.draftId, value.stageId, patch, value.rev)
            .then(() => { setLocalRunError(clearVerb('patch')); })
            .catch((e) => {
            setLocalRunError(verbClaim('patch', rejectionVoice(e)));
        });
    }, [snapshot]);
    // CANCEL — runs/stop on the run in view (both the resource stream
    // face and the in-tab local run face); the run-wire package's verb.
    const onStop = useCallback((runId) => {
        void stopRun(runId)
            .then(() => { setLocalRunError(clearVerb('cancel')); })
            .catch((e) => {
            setLocalRunError(verbClaim('cancel', rejectionVoice(e)));
        });
    }, []);
    const onBack = useCallback(() => {
        if (openResource !== undefined)
            openResource(benchAddress);
    }, [openResource, benchAddress]);
    if (snapshot === undefined) {
        return h('p', { className: css.missing }, 'cards resource hook unavailable');
    }
    // THE SEAT SURVIVES THE REFRESH (the DSH client-resources
    // contract, packages/client/resources/README: `failed` arrives
    // WITH the last value beside the failure; `loading` means the
    // provider has not yielded YET — a held record never re-enters
    // it (the sidebar pins the tab's address for the tab's life; a
    // remount reads the latest value at once). The snapshot IS the
    // state — no client memory here (ledger #44: the heldValue ref
    // re-implemented the model's own failed-keeps-value law and is
    // deleted). The loading/failed faces stand only when NOTHING
    // was ever shown; a failed frame with a value renders the body
    // PLUS the loud error line (the silent-failure law holds — the
    // face never replaces the seat).
    const value = snapshot.value;
    const failedLine = snapshot.status === 'failed' && value !== undefined
        ? h('p', { className: css.failed, 'data-testid': 'cards-refresh-failed' }, snapshot.failure?.message ?? 'cards resource failed — showing the last good state')
        : null;
    if (value === undefined) {
        // A LIVE snapshot with no value is a broken provider (live
        // promises the latest ok frame's value) — voice it LOUD, never
        // a loading face that would hang forever claiming to wait.
        // THE STALE FACE rides EVERY arm (even loading/broken): a stale
        // tab is stale regardless of what it is failing to show.
        if (snapshot.status === 'live') {
            return h(Fragment, null, h('p', { className: css.failed }, 'cards resource gave no value'));
        }
        if (snapshot.status === 'failed') {
            return h(Fragment, null, h('p', { className: css.failed }, snapshot.failure?.message ?? 'cards resource failed'));
        }
        return h(Fragment, null, h('p', { className: css.loading }, 'loading ' + address + '…'));
    }
    const stageError = value.kind === 'run' ? null : terminalStageErrorOf(value.stages);
    const runError = localRunError !== null ? localRunError.text : stageError;
    return value.kind === 'bench'
        // Pure-DSH tab (2026-09-11): the bench renders the native BenchView
        // (tiles + drill + picker on the estate doors). The legacy 1:1
        // FlowCanvas branch was retired in Phase 2 (src/old/ deleted).
        ? h(Fragment, null, failedLine, runError !== null ? h('p', { className: css.runError }, runError) : null, 
        // THE RUN-GATE RESCUE (roadmap item 4): a rescueable miss —
        // a missing extension pack or model file — offers the
        // install through the manage seat right under the error
        // (names only; the DECL owns every URL server-side).
        runError !== null ? h(RunRescue, { error: runError, stages: value.stages, onRun }) : null, 
        // THE APP-SEAT TOAST VIEWPORT (the toast law): the cards
        // console is the always-alive surface — catalog/run-status
        // contract toasts render here when no studio is open. The
        // mount-claim law dedupes with the studio shell's viewport:
        // one renderer per document, whichever seat is live.
        h(ToastViewport), h(BenchView, {
            sessionKey: benchKey,
            bench: value,
            onRun,
            onRunStage,
            onStopStage,
            onRemoveStage,
            stageRuns,
            running,
            onPatchParams: onPatchParamsStage,
            renderStageView,
            renderPreview,
            runId: lastRunId,
            refreshTick: benchTick,
            startError: localRunError !== null ? localRunError.text : null,
        }))
        : value.kind === 'draft'
            ? h(Fragment, null, failedLine, runError !== null ? h('p', { className: css.runError }, runError) : null, runError !== null ? h(RunRescue, { error: runError, stages: value.stages, onRun: onRunDraftStage }) : null, h(DraftView, {
                value,
                running,
                onRun: onRunDraftStage,
                onStop: lastRunId !== null && onStop !== undefined ? () => { onStop(lastRunId); } : () => { },
                onBack: openResource !== undefined ? onBack : (() => { }),
                onPatchParams: onPatchParamsDraft,
                renderStageView,
                renderPreview,
                runId: lastRunId,
            }))
            : h(Fragment, null, failedLine, h(RunView, { run: value, sessionKey: benchKey, onBack: openResource !== undefined ? onBack : undefined, onRestored: onBack, onStop }));
}
//# sourceMappingURL=cards-tab-body.js.map
