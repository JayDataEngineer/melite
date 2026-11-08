// melite_flow — Melite flow (the rework, 2026-09-09): the ONE
// execution verb. Takes a card or a flow tool call and executes it
// through the serial GPU queue — card_run + flow_run unified (their
// two paths survive inside, the draft ceremony does not surface).
// Drafts stay DOOR-level (CARD BIRTH LAW: card and bench starts ride
// a doc-backed draft_id — minted here, never argued; a MATERIALIZED
// flow press rides the bench draft it just landed, a card-less flow
// rides the door's own doc — the flow-doc exemption, see
// runTemplate).
//
// FOUR compositions, exactly one per call (the mode word stays one of
// the three the flow-mode-voice wall pins — a stage press rides 'bench'):
//   - {bench} — run THE shared bench exactly as it stands (what the
//     user's Run press runs: one sequential pass, card by card).
//   - {card, model, prompt?, params?} — a single card (the old
//     card_run path, composed inside: manifest gate + runnability
//     gate + defaults merge, then draft + {model} start).
//   - {stage} — ONE bench stage alone (W-8, 2026-11-05): the named
//     row's composition runs through the bench pass's own
//     compose/wire-resolution/attribution path, never its siblings.
//   - {flow, params?} — a NAMED template (the old flow_run path,
//     reworked 2026-11-14 by the flows-are-compositions law: a
//     card-stage flow MATERIALIZES onto the bench as its card rows
//     — ONE write, the same expansion the {flow} door composes —
//     and the run presses the flow door carrying the bench's
//     draft_id; a flow with no card seats (family actions, engine
//     verbs, skip_when) presses draft-less and lands its run row
//     alone). params are the OVERRIDE door onto the template's
//     stage params: a flat value rides the one stage whose card
//     admits the key ({upscale: 2} on image-upscale), {stage_id:
//     {…}} targets one stage — keys the stage's card does not
//     admit refuse loud, before any run.
// W-1 (2026-11-05) deleted the {stages, connects} ad-hoc hatch the
// 11-14 flows-are-compositions ruling kept — F3-13 proved it never
// was bench-isolated, and hand-built work now presses ONE seated bench
// row with {stage}; the estate flow_inline arm still serves
// single-stage bodies, it just has no tool caller.
// Returns {run_id} (card/bench and a materialized flow also
// carry draft_id); poll with run_status. One active run
// machine-wide. L4 test flag rides every mode. The draft_id rides
// the value AND the render's leading `card <draftId>` token — the
// chat tile handle (FlowCards parseCardsBlock), never an agent arg.
import { CARD_PLANE_ENGINE, RUN_MEDIA_PREFIX, benchDraftIdOf, canonicalRunMediaUrl, draftIdOf } from '@melite/contracts/benchStage';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { remoteErrorOf } from '@deepseek-ai/dsh-typert-protocol';
import { normalizeJsonArrayParams } from '@melite/estate-call/cardTool';
import { jsonClean } from "../json-clean.js";
import { unwrapItemArrays } from '@melite/comfyui-card-kit';
import { benchKeyOfExec } from "./melite-construct.js";
import { loadCardDefs } from '@melite/comfyui-cordis';
import { boardedMap, resolveSpecKeyForTool } from "../discovery.js";
import { isTerminalStatus, statusOf, statusOrPendingOf } from '@melite/contracts/stageView';
import { admitCrossRegimeJoin } from '@melite/models-h3';
import { CROSS_REGIME_BAG_KEYS } from '@melite/video-h3-timeline/card';
/** The row's model (the QUEUE LANE LAW, agent-side): the row's
 *  params may name `model` explicitly; otherwise the card id
 *  resolves through form-spec's OWN alias law (boarded[0] — the
 *  same truth /v1/form-spec serves and the UI's
 *  defaultFamilyForCard reads; ONE resolution, never re-derived).
 *  A card that boards NO family (rig, mask) returns '' — THE
 *  FAMILYLESS MARKER (stroke 3): the stage rides the draft arm and
 *  the registry composes it by its OWN card id, never an injected
 *  body.model (that injection's voice — "model 'rig' is not offered
 *  by card 'rig'" — the af-move commission's stop, 2026-10-09). An
 *  unknown card id rides the same arm; the registry door names the
 *  ghost in its own voice. */
async function modelForCard(card, params) {
    if (typeof params['model'] === 'string' && params['model'] !== '')
        return params['model'];
    const defs = await loadCardDefs();
    if ((defs.get(card)?.boarded ?? []).length === 0)
        return '';
    const res = resolveSpecKeyForTool(card, defs, boardedMap(defs));
    // res.model is undefined only for cards boarding nothing, and the
    // guard above already returned for those — the check keeps the
    // minted-model kill's type honest (no phantom seat, no phantom id).
    return res !== null && res.model !== undefined ? res.model : '';
}
/** F18 — the cross-regime join admission, pass-side seat: for an
 * h3-timeline stage carrying an armed mod bag whose kind declares a
 * plan tier (the served edit bag and the legacy aliases that
 * translate into it) with a stated resolution, answer the family's
 * own admission text (models/h3 chainEdit.ts — the engine's tier
 * math, cited) when the tier would render a different shape than
 * the doc's film regime (width/height knobs, the film path's own
 * defaults 1344×768); null otherwise (no armed bag, a shape-true
 * tier, or another card — the admission never speaks outside its
 * family). The roster is DERIVED from the card's own declaration
 * (CROSS_REGIME_BAG_KEYS — the back-end evasion audit B-1): the
 * pre-collapse hand list retired with the names it scanned. */
function crossRegimeAdmissionOf(card, params) {
    if (card !== 'h3-timeline')
        return null;
    const bag = CROSS_REGIME_BAG_KEYS
        .map((k) => params[k])
        .find((v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object' && v[0] !== null);
    if (bag === undefined)
        return null;
    const tier = typeof bag[0]['resolution'] === 'string' ? bag[0]['resolution'] : '';
    if (tier === '')
        return null;
    const width = typeof params['width'] === 'number' ? params['width'] : 1344;
    const height = typeof params['height'] === 'number' ? params['height'] : 768;
    return admitCrossRegimeJoin(width, height, tier);
}
const TIMEOUT_MS = 30_000;
const DRAFT_TIMEOUT_MS = 15_000;
/** THE OBSERVATION BUDGET (the commission wedge landing, 2026-10-03):
 *  the outcome observer polled WITHOUT a wall clock — a run whose
 *  claim never released (the queue's single-active lane) hung the
 *  tool for the life of the session (the film press wedged 95 min
 *  on a dead engine; the queue-side armor landed with this budget —
 *  runsRegistry.ts's pump catch). The budget bounds the
 *  OBSERVATION, never the run: expiry returns the waiting face
 *  ('queued' — a word the terminal arm can never produce), re-arms
 *  a background attribution link, and the caller reports a pending
 *  receipt (run_status owns re-waiting). Three times the wait
 *  family's WAIT_MAX_S=300 — above every legitimate render
 *  observed, short enough to free a wedged transcript. */
const OBSERVE_MAX_MS = 900_000;
/** THE STAMP-BACK TAKES (F3 D3-07, the 15 s bound's third burn —
 *  F2 D-07 → D3-05 → s_94): the terminal attribution PATCH takes
 *  this many swipes at the drafts door, each with its own fresh
 *  DRAFT_TIMEOUT_MS bound and a 1.2 s beat between takes. The burn
 *  was a TRANSIENT wedge (one PATCH outliving its bound while the
 *  estate itself stayed alive) — a single-take stamp turns a
 *  transient into a permanently invisible green run. Three takes
 *  span a wedged beat; only a door dead three times in a row is
 *  dead, and that final miss rides the run row
 *  (attribution: missed) instead. */
const STAMP_TAKES = 3;
/** POST /v1/flows/start — the verbatim-error pattern (the agent
 *  reads the gateway's refusal text, not a transport code). */
/** THE WIRE-BOOLEAN READ (attempt-035's provenance receipt,
 * 2026-09-24): the same corruptor that stringifies declared
 *  numerics can stringify the declared boolean — `test: "true"`
 *  failed `=== true` and diagnostic runs landed under output/ as
 *  test:false. Loose spellings read truthy; everything else stays
 *  false (never truthy-coerce junk like 1/"yes"). */
function wireBool(v) {
    return v === true || v === 'true';
}
/**
 * The pass row's artifact set — the media-spelled urls the observer
 * rewrote (lead first). A field that is not an array of non-empty
 * strings reads empty: the key was never served, never a cast.
 *
 * @param row - the pass row as persisted.
 * @returns the validated url set, lead first.
 */
function assetUrlsOf(row) {
    const urls = row['asset_urls'];
    return Array.isArray(urls) ? urls.filter((u) => typeof u === 'string' && u !== '') : [];
}
async function startRun(estate, body, signal) {
    let res;
    try {
        res = await estate.runsStart(body, signal, TIMEOUT_MS);
    }
    catch (e) {
        // Remote refusals carry their named error on the protocol's one
        // class (the RayGatewayError HTTP-era arm died with the seats).
        const re = remoteErrorOf(e);
        if (re !== null && re !== undefined) {
            return { error: re.message || 'queue refused the start' };
        }
        throw e;
    }
    // THE EMPTY-ERROR TRAP (run-status's twin, fixed with it 2026-09-24):
    // a start answer may carry `error: ""` on success — only a NON-EMPTY
    // error refuses.
    if (res && typeof res.error === 'string' && res.error !== '')
        return { error: res.error };
    return {
        run_id: typeof res.run_id === 'string' ? res.run_id : '',
        status: typeof res.status === 'string' ? res.status : 'queued',
    };
}
/** LOAD THE BENCH (the one-shared-state law — the bench rework,
 *  2026-09-10): every mode's composition lands on THE shared bench
 *  (draft doc bench-<key>) instead of minting a fresh draft per
 *  run. The user's cards tab streams the same bench; runs snapshot
 *  their composition in the run registry (CARD BIRTH LAW holds —
 *  the start still rides a doc-backed draft_id, now the bench's). */
async function loadBench(estate, body, signal) {
    // THE CAS READ-MODIFY-WRITE (the door's own law): under the host's
    // persistent storage the shared bench SURVIVES runs — a bare birth
    // ensure on an existing bench refuses bench/cas-conflict.
    // Read the row first; a live bench's rev rides as expect_rev, a
    // missing bench births (no expect_rev — the birth arm).
    // body.session is set by both internal call sites (runSingle /
    // runTemplate each pass the one-bench-law session —
    // execute's bench, the caller's conversation bench) — the cast
    // rides that call-site proof instead of a dead 'default' fallback
    // (2026-09-12).
    const session = body['session'];
    let expectRev;
    try {
        const cur = await estate.benchGet(session, signal, DRAFT_TIMEOUT_MS);
        if (cur !== null && typeof cur === 'object' && typeof cur['rev'] === 'number') {
            expectRev = cur['rev'];
        }
    }
    catch (e) {
        // bench/not-found = the birth arm (no expect_rev); anything else
        // is a real refusal and propagates.
        const re = remoteErrorOf(e);
        if (re === null || re === undefined || re.code !== 'bench/not-found')
            throw e;
    }
    const b = await estate.benchEnsure({
        ...body,
        // THE LANDING DECLARES ITSELF (the overwrite law, 2026-09-15):
        // a run landing replaces the shared bench by design (the
        // one-shared-state law) — so it passes overwrite: true up
        // front. The composing agent's melite_construct load gets no
        // such pass; it must confirm each wipe itself.
        overwrite: true,
        ...(expectRev !== undefined ? { expect_rev: expectRev } : {}),
    }, signal, DRAFT_TIMEOUT_MS);
    if (b && typeof b.error === 'string' && b.error)
        throw new Error(b.error);
    const id = b && b.draft_id;
    if (typeof id !== 'string' || id === '')
        throw new Error('bench ensure returned no draft_id');
    // THE PARSE EDGE: the id came off the ensure answer's wire body.
    return draftIdOf(id);
}
/** R-4's rev-confirm read (D3-04, 2026-11-05): ONE advisory re-read of
 *  the bench rev immediately before the press begins — a rev that
 *  moved between the snapshot read and the press means something is
 *  still landing (the burn: a press issued while the previous mint
 *  was still `landed_and_compiling` snapshotted before the new stage
 *  joined, and s_90 sat unrun with no warning anywhere in the press
 *  receipt). The warning is an ADMISSION, never a gate (the F18
 *  precedent): the press still runs on the snapshot it holds. A doc
 *  that serves no rev admits nothing (no false warning invented from
 *  absence).
 *
 * @param estate - the estate handle.
 * @param bench - the session bench key.
 * @param snapshotRev - the rev the pass's snapshot read served.
 * @param signal - the caller's abort signal.
 * @returns the landing-race warning text, or undefined when the rev stood still.
 */
async function revConfirmLanding(estate, bench, snapshotRev, signal) {
    try {
        const confirm = await estate.benchGet(bench, signal, 15_000);
        const fresh = typeof confirm['rev'] === 'number' ? confirm['rev'] : undefined;
        const snap = typeof snapshotRev === 'number' ? snapshotRev : undefined;
        // an unreadable rev on either side admits nothing (no false warning
        // invented from absence); a rev that STOOD STILL admits nothing —
        // the warning exists only for a rev that MOVED
        if (snap === undefined || fresh === snap)
            return undefined;
        return `bench rev moved between the snapshot read and this press (rev ${snap} → rev ${fresh}) — something may still be landing; if a stage you just minted is missing from the pressed census, re-press it`;
    }
    catch {
        // advisory read: a transport hiccup in the confirm never gates the
        // press (the pass still runs on the snapshot it holds) — no
        // warning is the honest face, never a swallowed refusal
        return undefined;
    }
}
/** BENCH (the AI-control pillar, 2026-09-12): the agent drives THE
 *  shared bench exactly like the user's Run press — ONE SEQUENTIAL
 *  PASS, agent-side, one card at a time through the serial queue.
 *  The flow_inline batch arm is DEAD here (the executor takes
 *  single-stage pre-composed graphs only — a multi-stage bench was
 *  an honest refusal, never a pass): each row runs through the
 *  {model: card-id} compose arm under the bench's own draft_id
 *  (resolveCardFamily resolves the card → family estate-side — the
 *  same truth /v1/form-spec serves), the run is observed to
 *  terminal on the run-wire cadence, and EVERY flip is written onto
 *  the bench row (runStatus + result {run_id, url}) through the
 *  bench patch door — the same attribution the tab's observer
 *  performs, so the user's tiles go live WHILE the agent drives.
 *  The pass law is Run All's law verbatim: bench order, skip spent
 *  rows with a reason, and — since F20's residual cure (2026-10-30) —
 *  a settled FAILURE or a THROWN start is recorded and the pass
 *  CONTINUES to the remaining stages; only a pre-run REFUSAL (a doc
 *  the door will not accept) stops the pass. W-2 (2026-11-05): a
 *  done row skips only while its recorded input_runs snapshot still
 *  names the run identities its wires resolve to now — an upstream
 *  that re-ran breaks the match and the row runs. */
async function runBench(estate, a, signal, only) {
    const empty = { mode: 'bench', target: benchDraftIdOf(a.bench), error: 'the bench is empty — construct stages first (melite_construct)' };
    let b;
    try {
        b = await estate.benchGet(a.bench, signal, 15_000);
    }
    catch (e) {
        // The bench remote classifies the empty bench as bench/not-found
        // (the HTTP 404 died with the door).
        if (remoteErrorOf(e)?.code === 'bench/not-found')
            return empty;
        throw e;
    }
    const rows = Array.isArray(b['stages'])
        ? b['stages'].filter((s) => typeof s === 'object' && s !== null && typeof s['id'] === 'string')
        : [];
    if (rows.length === 0)
        return empty;
    // THE PER-STAGE PRESS (W-8, 2026-11-05): `melite_flow {stage}` runs ONE
    // named bench stage's composition and nothing else — the pass skips
    // every sibling row below. An unknown id refuses HERE, naming the
    // bench's own ids and the add_stage cure — never a silent
    // whole-bench press, never an empty-id guess.
    if (only !== undefined && !rows.some((r) => r['id'] === only)) {
        return { mode: 'bench', target: benchDraftIdOf(a.bench), error: `the bench holds no stage "${only}" — its stages are ${rows.map((r) => String(r['id'])).join(', ')}; add it with melite_construct add_stage or press one of those` };
    }
    const draftId = typeof b['draft_id'] === 'string' ? draftIdOf(b['draft_id']) : benchDraftIdOf(a.bench);
    const target = `${benchDraftIdOf(a.bench)} @ rev ${String(b['rev'] ?? '?')}`;
    // THE FROZEN FACE'S HEAD (the stale-two-run audit, cure 1,
    // 2026-11-15): the bench's intent AT SETTLE rides the result so
    // presentationMeta persists it beside the pass rows — the replayed
    // card's head reads THIS, never the bench's present-tense intent a
    // later press rewrote.
    const intent = typeof b['intent'] === 'string' ? b['intent'] : '';
    // R-4 — THE PRESS CENSUS (D3-04, 2026-11-05): every press receipt
    // carries the stage ids this pass pressed and the snapshot rev the
    // press judged against — rows/rev already in hand at the snapshot
    // read, so the census is assembly, never a second read. The burn:
    // s_89 + s_90 were minted back-to-back and pressed together, the run
    // held only s_89, and no receipt anywhere said which stages the
    // press actually saw. The W-8 per-stage press rides the same return.
    const pressed = [];
    const pressCensus = () => ({
        pressed: [...pressed],
        rev: typeof b['rev'] === 'number' ? b['rev'] : null,
    });
    // R-4 — THE REV-CONFIRM (the landing-race admission): re-read the
    // bench rev immediately before the press. ONE read, BEFORE the pass
    // starts — the pass's own attribution stamps move the rev on every
    // settle, so a per-stage confirm would false-warn every settled
    // bench (the settle must not become mandatory). Fired, the warning
    // rides every pressed pass row beside the F18 admission seat.
    const landingWarning = await revConfirmLanding(estate, a.bench, b['rev'], signal);
    const pass = [];
    // THE PRESS KEEPS GOING (F20 residual, 2026-10-30): a stage that
    // settled FAILED is recorded here and the pass moves on — the run
    // press never abandons the remaining stages because an earlier one
    // burned. The final status still says 'stopped' and names the FIRST
    // failure, so no caller can read a pass with a failed stage as
    // clean.
    const failures = [];
    // THE PASS'S OWN MIRROR (W-2): the run ids THIS press minted, by
    // stage — a downstream row resolves its wires against the identity
    // the press actually produced, never the pre-press memory. Press-local
    // bookkeeping only: the doc copy in hand is never written (the estate
    // learns the id through the attribution's stamp door).
    const mintedRuns = new Map();
    // THE INPUT-RUNS SNAPSHOT (W-2, 2026-11-05, FRICTION_3 RG-P4-3): the
    // identity of every wired input AT PRESS TIME —
    // { <input name>: <upstream stage's result.run_id> } — read off the
    // bench doc already in hand (no extra estate call), with a stage
    // this pass re-ran answering its FRESH id. A static value is not a
    // wire and takes no seat in the dict; a wire whose upstream is
    // missing or has no result records the marker ''. `undefined`
    // answers for a row with NO wired inputs — a row outside the law
    // (nothing it consumes can go stale under it).
    const inputRunsOf = (row) => {
        const wires = row['inputs'] !== null && typeof row['inputs'] === 'object' && !Array.isArray(row['inputs'])
            ? row['inputs'] : {};
        const names = Object.keys(wires);
        if (names.length === 0)
            return undefined;
        const snapshot = {};
        for (const name of names) {
            const ref = wires[name];
            const upstreamId = ref !== null && typeof ref === 'object' && typeof ref['stage'] === 'string'
                ? String(ref['stage']) : '';
            if (upstreamId === '')
                continue;
            const minted = mintedRuns.get(upstreamId);
            if (minted !== undefined) {
                snapshot[name] = minted;
                continue;
            }
            const upstream = rows.find((r) => r['id'] === upstreamId);
            const res = upstream !== undefined && upstream['result'] !== null && typeof upstream['result'] === 'object' && !Array.isArray(upstream['result'])
                ? upstream['result'] : {};
            snapshot[name] = typeof res['run_id'] === 'string' ? res['run_id'] : '';
        }
        return snapshot;
    };
    for (const row of rows) {
        const stageId = row['id'];
        // THE PER-STAGE PRESS (W-8): the named row alone rides the
        // compose/wire-resolution/attribution path below — every sibling
        // is skipped before any read, so a half-written sibling can never
        // abort this press (F3-10) and the bench intent rides untouched.
        if (only !== undefined && stageId !== only)
            continue;
        const card = typeof row['card'] === 'string' && row['card'] !== '' ? row['card'] : '';
        // THE CACHE-HIT SKIP, folded (2026-10-01): the raw 'done' compare
        // re-ran every stage the estate settles 'completed' and every
        // cached/reused row.
        // The view-side read (2026-10-12): a draft row's runStatus is a
        // persisted word no door validated — era rows carry the card
        // plane's old 'unreachable' spelling (the transport escalation
        // now writes the health channel) — so the classifier's refusal
        // must not kill the tool call; an unreadable row is simply not
        // done and runs.
        // F11 — THE ARCHIVED SKIP (judged FIRST: archived outranks done —
        // a spent stage resting is the operator's own mark, the honest
        // voice names it even when the row also carries a done memory):
        // a spent stage marked archived runs nowhere on the pass (the
        // row stays for provenance; unarchive restores it to the run
        // set).
        if (row['archived'] === true) {
            pass.push({ stage: stageId, card, skipped: 'archived' });
            continue;
        }
        // W-2: resolve the row's wired inputs to the CURRENT upstream
        // identities before the skip test — the same resolution the skip
        // judge below compares against and the attribution stamps.
        const currentInputs = inputRunsOf(row);
        // The stale voice, set only when a done mark fails the snapshot
        // law and the row falls through to run (the operator reads why it
        // re-ran on the pass row).
        let staleVoice;
        {
            const folded = statusOrPendingOf(typeof row['runStatus'] === 'string' ? row['runStatus'] : '');
            if (folded === 'done' || folded === 'cached' || folded === 'reused') {
                // THE LAST-RUN GROUND (qa8 GAPS-12/F19, 2026-11-01): the done
                // mark REQUIRES a last run. The bench row's own result memory
                // (result.run_id — stamped by the same attribution that wrote
                // runStatus) is the evidence the prose claims below. A done
                // mark with no run behind it (a bare runStatus write — the
                // drafts/patch door admits runStatus without result) still
                // skips, but the pass row carries last_run: null so the
                // render reads honestly instead of claiming "unchanged since
                // its last run" for a row that never ran.
                const result = row['result'] !== null && typeof row['result'] === 'object' && !Array.isArray(row['result'])
                    ? row['result'] : null;
                const lastRun = result !== null && typeof result['run_id'] === 'string' && result['run_id'] !== ''
                    ? result['run_id'] : null;
                // THE INPUT-RUNS SNAPSHOT LAW (W-2, 2026-11-05, FRICTION_3
                // RG-P4-3): a done mark may SKIP only when the input_runs
                // snapshot it recorded still names the SAME run identities its
                // wired inputs resolve to now — deep equal over the same key
                // set (extra/missing keys = mismatch). The burn: s_0 image-gen
                // re-ran on a seed patch while wired s_1 upscale SKIPPED and
                // kept its artifact derived from the OLD s_0 image — the
                // runStatus-only skip never noticed the upstream identity
                // move. No snapshot at all on a row that HAS wired inputs is
                // STALE too (safe-on-stale: it re-runs once, stamps, and
                // skips from then on); a row with NO wired inputs keeps
                // skipping as today (nothing it consumes can move).
                const stamped = result !== null && result['input_runs'] !== null
                    && typeof result['input_runs'] === 'object' && !Array.isArray(result['input_runs'])
                    ? result['input_runs'] : null;
                if (currentInputs !== undefined) {
                    const currentKeys = Object.keys(currentInputs);
                    const matches = stamped !== null
                        && Object.keys(stamped).length === currentKeys.length
                        && currentKeys.every((k) => stamped[k] === currentInputs[k]);
                    if (!matches) {
                        staleVoice = stamped === null
                            ? 'input snapshot missing on the done mark — re-running to record what it consumed'
                            : 'input snapshot mismatch — a wired upstream re-ran since this row\u2019s last run; its artifact derived from the old output';
                    }
                    else {
                        pass.push({ stage: stageId, card, skipped: 'done', last_run: lastRun });
                        continue;
                    }
                }
                else {
                    pass.push({ stage: stageId, card, skipped: 'done', last_run: lastRun });
                    continue;
                }
            }
        }
        if (card === '') {
            // THE FOREIGN-ROW VOICE (the compose-plane cure, 2026-11-14): a
            // card-less row carrying ref_flow is a RETIRED flow template
            // marker — an older melite_flow press landed it before the
            // flows-are-compositions law; the bench write doors refuse the
            // shape now, but a doc the old door wrote still serves (the
            // read stays tolerant by the un-wedge line). The run rides the
            // {flow} start arm, never this pass, so "patch the stage" names
            // an impossible cure for a row with no card surface. The voice
            // names the row's origin and the removal path; a genuinely
            // card-less row keeps the patch voice.
            const refFlow = typeof row['ref_flow'] === 'string' && row['ref_flow'] !== '' ? row['ref_flow'] : '';
            if (refFlow !== '') {
                // THE RESTORE CURE (F60b, slice E): when the bench's own
                // history holds a non-reverted load entry (the serve
                // projection strips the inverse, but a load entry always
                // carries one — the undo verb answers for what it holds),
                // undo rewinds to the bench the press replaced — a stronger
                // cure than dropping the row, and the voice says so.
                const logRaw = b['log'];
                const logRows = Array.isArray(logRaw)
                    ? logRaw.filter((e) => typeof e === 'object' && e !== null)
                    : [];
                const undoCure = logRows.some((e) => e['kind'] === 'load' && e['reverted'] !== true)
                    ? ' — or melite_construct undo to restore the bench the retired press replaced'
                    : '';
                return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId,
                    ...(intent !== '' ? { intent } : {}),
                    ...(only !== undefined ? { stage: only } : {}),
                    error: `stage ${stageId} is the "${refFlow}" flow template reference (a retired melite_flow press landed it — the bench doors refuse the shape now; the flow runs through its own start door, not this bench pass); remove it with melite_construct remove_stage ${stageId} if the bench should run without the flow${undoCure}`, ...pressCensus(), pass };
            }
            return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId,
                ...(intent !== '' ? { intent } : {}),
                ...(only !== undefined ? { stage: only } : {}),
                error: `stage ${stageId} names no card — nothing to compose (melite_construct patch)`, ...pressCensus(), pass };
        }
        const params = row['params'] !== null && typeof row['params'] === 'object' && !Array.isArray(row['params'])
            ? row['params'] : {};
        // THE WIRE RESOLUTION LAW, agent-side (session 7a82's autopsy P1,
        // 2026-11-12 — the mirror of stage-run.ts:147, the UI's own law):
        // the bench's wiring law REQUIRES every wired input to carry a
        // matching $spell in params, but the {model:} door composes ONE
        // stage and resolves NOTHING — until now the bench pass sent the
        // spell verbatim and the door's spell gate refused in a circle
        // ("run the bench flow" is the call being refused; "replace with
        // a concrete value" names the wrong cure). THE WIRE MEANS ONE
        // THING: this input IS that stage's output. Running the stage
        // resolves the wire to the upstream's LAST RESULT — result.url,
        // the media-route currency — and sends the CONCRETE value, every
        // occurrence (bare, array, nested). An upstream with no output
        // STOPS THE PASS HERE, naming the wire — the same voice the UI's
        // press answers with, never a doomed run, never a silent drop.
        const wires = row['inputs'] !== null && typeof row['inputs'] === 'object' && !Array.isArray(row['inputs'])
            ? row['inputs'] : {};
        const wireNames = Object.keys(wires);
        let resolved = params;
        if (wireNames.length > 0) {
            resolved = { ...params };
            for (const name of wireNames) {
                const ref = wires[name];
                const isStageWire = typeof ref === 'object' && ref !== null
                    && typeof ref['stage'] === 'string';
                if (!isStageWire) {
                    return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId,
                        ...(intent !== '' ? { intent } : {}),
                        ...(only !== undefined ? { stage: only } : {}),
                        error: 'input ' + JSON.stringify(name) + ' is neither {stage, output} nor a resolvable binding — the bench pass maps only stage wires (got ' + JSON.stringify(ref ?? null) + ')', ...pressCensus(), pass };
                }
                const upstreamId = String(ref['stage']);
                const upstream = rows.find((r) => r['id'] === upstreamId);
                const res = upstream !== undefined && upstream['result'] !== null && typeof upstream['result'] === 'object' && !Array.isArray(upstream['result'])
                    ? upstream['result'] : {};
                const url = typeof res['url'] === 'string' && res['url'] !== '' ? res['url'] : '';
                if (url === '') {
                    return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId,
                        ...(intent !== '' ? { intent } : {}),
                        ...(only !== undefined ? { stage: only } : {}),
                        error: 'input ' + JSON.stringify(name) + ' is wired to stage ' + JSON.stringify(upstreamId)
                            + ' which has no output yet — run it first (or clear the wire). The bench pass resolves wires to the upstream\'s last result; it never drops them.', ...pressCensus(), pass };
                }
                const spell = '$' + name;
                const substitute = (v) => {
                    if (v === spell)
                        return url;
                    if (Array.isArray(v))
                        return v.map(substitute);
                    if (typeof v === 'object' && v !== null) {
                        const out = {};
                        for (const [k, x] of Object.entries(v))
                            out[k] = substitute(x);
                        return out;
                    }
                    return v;
                };
                for (const k of Object.keys(resolved))
                    resolved[k] = substitute(resolved[k]);
            }
        }
        const model = await modelForCard(card, resolved);
        // F18 — THE CROSS-REGIME JOIN ADMISSION (2026-11-12): the
        // h3-timeline family carries two resolution regimes — the film
        // path renders the doc's width/height (1344×768 by default),
        // the mod bags (replace/repair/extend) render a plan TIER the
        // engine resolves against the source's own shape (736p on a
        // film-shaped source = 1280×736 — the join F18 burned on). The
        // admission warns loud BEFORE the stage runs, naming both
        // regimes and the pin; it never refuses (the operator's call,
        // 2026-11-12: an admission, not a gate). The law itself lives
        // in the family (models/h3 chainEdit.ts — the engine's own tier
        // math, cited); this is the pass voice, the one face the
        // operator reads during a bench press.
        const regimeWarning = crossRegimeAdmissionOf(card, resolved);
        // R-4: one warning seat per row — the row's own admission (F18)
        // first, the landing race (D3-04) second; joined so neither voice
        // shadows the other.
        const rowWarning = regimeWarning !== null
            ? (landingWarning !== undefined ? regimeWarning + ' ' + landingWarning : regimeWarning)
            : landingWarning;
        // A familyless stage presses the DRAFT ARM alone (the same body
        // runSingle's wired path rides): the run door composes the bench's
        // stages — the familyless one by its own card id. A model key here
        // would select the card arm and hit the board check.
        // The spell-resolved params ride (THE WIRE RESOLUTION LAW above):
        // every $spell a wire resolves left as a concrete value; a spell
        // with NO wire still rides — the door's spell gate names it, the
        // one honest wall left for a genuinely unresolvable promise.
        // THE FAMILYLESS HALF RIDES THEM TOO (the ghost-run burn,
        // 2026-11-19): a familyless press {draft_id, bench_stage_id}
        // used to drop the resolved bag and ride the draft door's
        // WHOLE-BENCH compose — every sibling re-executed in one merged
        // run the bench could not see. The door now composes ONLY the
        // claimed row, and the claim arm resolves the row's wires from
        // THIS bag (there is no upstream stage in a single-stage run to
        // merge) — a spell the wires did not resolve refuses loud at the
        // door's unwired-spell gate.
        // F21 — THE PRESS ROW'S OWN KEY (2026-10-30): the run door persists
        // bench_stage_id onto the queue row and the sidecar maps it back,
        // but nothing wrote it, so every live press (run-c6bfa91defe7,
        // run-9dacc8612feb) omitted the key and the row's binding could
        // never resolve. The pass already knows the stage — it stamps it.
        // F20 residual, thrown half (2026-10-30): a stage that THROWS — a
        // transport death inside startRun/observeAndAttribute, a card
        // resolution failure — used to abort the whole tool call and take
        // `pass[]` with it, so the operator saw a stack and none of the
        // stages' outcomes. The same law as a settled failure now holds:
        // record it, name it at the end, keep pressing.
        // R-4: the census records the press ISSUED — the start is being
        // handed its body (a refused or thrown start is still a pressed
        // row: the receipt's `pressed` names every stage the pass reached
        // its start lane with).
        pressed.push(stageId);
        let started;
        try {
            started = await startRun(estate, model === ''
                ? { ...resolved, test: wireBool(a.test), draft_id: draftId, bench_stage_id: stageId }
                : { ...resolved, model, test: wireBool(a.test), draft_id: draftId, bench_stage_id: stageId }, signal);
        }
        catch (thrown) {
            const why = thrown instanceof Error ? thrown.message : String(thrown);
            pass.push({ stage: stageId, card, thrown: why });
            failures.push({ stage: stageId, card, status: 'threw', run_id: '' });
            continue;
        }
        if (typeof started['error'] === 'string') {
            return { mode: 'bench', target, draft_id: draftId, status: 'stopped', stoppedAt: stageId, ...(intent !== '' ? { intent } : {}), ...(only !== undefined ? { stage: only } : {}), ...pressCensus(), error: started['error'], pass };
        }
        const runId = started['run_id'];
        if (runId !== '')
            mintedRuns.set(stageId, runId);
        let outcome;
        try {
            outcome = await observeAndAttribute(estate, draftId, stageId, runId, signal, wireBool(a.test), OBSERVE_MAX_MS, 2, currentInputs);
        }
        catch (thrown) {
            const why = thrown instanceof Error ? thrown.message : String(thrown);
            pass.push({ stage: stageId, card, run_id: runId, thrown: why });
            failures.push({ stage: stageId, card, status: 'threw', run_id: runId });
            continue;
        }
        pass.push({ stage: stageId, card, run_id: runId, status: outcome.status,
            ...(staleVoice !== undefined ? { stale: staleVoice } : {}),
            ...(rowWarning !== undefined ? { warning: rowWarning } : {}),
            ...(outcome.url !== '' ? { url: outcome.url } : {}),
            ...(outcome.artifacts.length > 0 ? { artifacts: outcome.artifacts } : {}),
            ...(outcome.asset_urls.length > 0 ? { asset_urls: outcome.asset_urls } : {}),
            ...(outcome.host_paths.length > 0 ? { host_paths: outcome.host_paths } : {}),
            ...(outcome.stamp_note !== undefined ? { stamp_note: outcome.stamp_note } : {}),
            ...(outcome.attribution !== undefined ? { attribution: outcome.attribution } : {}) });
        if (outcome.status === 'queued') {
            // THE PENDING RECEIPT (the commission wedge, 2026-10-03): the
            // observation budget spent on a run that is still live — the
            // flow is NOT failed. The run continues on the queue, the
            // render prints `[pending] — poll with run_status`, and the
            // background attribution link still lands the terminal stamp
            // on the stage row when the run settles.
            return { mode: 'bench', target, draft_id: draftId, status: 'pending', stoppedAt: stageId, run_id: runId, ...(intent !== '' ? { intent } : {}), ...(only !== undefined ? { stage: only } : {}), ...pressCensus(), pass };
        }
        if (outcome.status !== 'done') {
            // THE PASS CONTINUES (F20 residual, 2026-10-30): a stage that
            // ran and FAILED is that stage's outcome — it must not cancel
            // the press's remaining stages (the round-4 burn: `run all`
            // stopped at the first failure and the later stages never got
            // their press). The failure is recorded in `pass` and named at
            // the END, so the operator sees every stage's outcome AND the
            // press finishes what it can. A pre-run REFUSAL above still
            // stops (the doc itself is wrong); only a settled non-done
            // status continues.
            failures.push({ stage: stageId, card, status: outcome.status, run_id: runId });
            continue;
        }
    }
    // THE RUN-ID VISIBILITY LAW (commissions 032/033, the transcript-016
    // half that never landed): the SUCCESS return carries the final
    // stage's run_id at the top level and every minted id in pass[] —
    // the render prints them. A maker that cannot see the id it just
    // paid for burns calls on ledger_tail to find it (032 and 033 both
    // did, twice each — the doc promised {run_id, draft_id} while the
    // value printed '?').
    const lastRun = (() => {
        for (let i = pass.length - 1; i >= 0; i--) {
            const rid = pass[i]['run_id'];
            if (typeof rid === 'string' && rid !== '')
                return rid;
        }
        return '';
    })();
    const lastHosts = (() => {
        const acc = [];
        for (const row of pass) {
            const hp = row['host_paths'];
            if (!Array.isArray(hp))
                continue;
            for (const h of hp) {
                if (typeof h === 'string' && h !== '' && !acc.includes(h))
                    acc.push(h);
            }
        }
        return acc;
    })();
    if (failures.length > 0) {
        const first = failures[0];
        return { mode: 'bench', target, draft_id: draftId, run_id: lastRun, status: 'stopped',
            stoppedAt: first.stage,
            ...(intent !== '' ? { intent } : {}),
            ...(only !== undefined ? { stage: only } : {}),
            error: `stage ${first.stage} (${first.card}) ` + (first.status === 'threw' ? 'threw (a transport or resolution error — read pass[] for the rest)' : `ended ${first.status}`) + (failures.length > 1 ? ` — ${failures.length} stages failed (the pass still pressed every stage; read pass[])` : ' (the pass still pressed the remaining stages)'),
            ...(lastHosts.length > 0 ? { host_paths: lastHosts } : {}), ...pressCensus(), pass };
    }
    return { mode: 'bench', target, draft_id: draftId, run_id: lastRun, status: 'done',
        ...(intent !== '' ? { intent } : {}),
        ...(only !== undefined ? { stage: only } : {}),
        ...(lastHosts.length > 0 ? { host_paths: lastHosts } : {}), ...pressCensus(), pass };
}
/** THE PER-STAGE PRESS (W-8, 2026-11-05): `melite_flow {stage}` runs ONE
 *  named bench stage's composition and nothing else — the same
 *  compose/wire-resolution/attribution path the bench pass rides
 *  (runBench's `only` filter), never its siblings. Sibling stages and
 *  the bench intent stay byte-identical; the receipt names the pressed
 *  row (`stage`). Mode stays 'bench': the per-stage press is the bench
 *  pass with a one-row filter, never a fifth composition. */
async function runStage(estate, a, signal) {
    return runBench(estate, { test: a.test, bench: a.bench }, signal, a.stage);
}
/** Signal-honoring sleep — the observer's poll cadence (the run-wire
 *  cadence, 1500ms). DECIDED per-plane (the dry-sweep's J5, recorded
 *  like the J13 variance): this spelling RESOLVES on abort because
 *  the observer's loop re-checks its deadline after every tick — a
 *  rejection here would surface as a failed observe, not a quiet
 *  exit; run-status.ts's sleepAbortable REJECTS for the mirror
 *  reason (its poll has no post-await check). No Context reaches a
 *  tool body, so ctx.timeout is not a seat for either; the kit's
 *  browser sleep (catalog/src/sleep.ts) is another plane's law. */
function sleepAbort(ms, signal) {
    return new Promise((resolve) => {
        const t = setTimeout(resolve, ms);
        signal.addEventListener('abort', () => { clearTimeout(t); resolve(); }, { once: true });
    });
}
/** THE HOST-PATH CANONICALIZER (session 90a0b920's F7, the
 * artifact-path archaeology burn: the agent read `/melite-media/...`
 * urls in flow results, tried them on the host, `ls: cannot access
 * '/melite-media/'`, and burned ~6 bash calls on find + a python
 * census over 1,834 runs to learn the estate's path dialects before
 * daring to touch a file). The media route is the BROWSER's channel;
 * the maker's shell never sees it. This mirrors run-status.ts's
 * canonical receipt law (023's self-critique #3) and adds the one
 * spelling that tool never meets: a full media url folds back to
 * its out-root form — `/melite-media/runs/<rid>/<rel>` is the
 * estate output tree served over HTTP, so it canonicalizes to
 * `output/<rid>/<rel>` (test runs root under test-output/ — the
 * flag rides the caller's run request, never the url). Absolute
 * non-media paths stay verbatim (run-status's law); bare relatives
 * stay bare (one home per fact: the UI face keeps the media url,
 * the agent face carries this). */
function canonicalHostPath(p, rid, test) {
    const media = RUN_MEDIA_PREFIX + '/';
    let value = p;
    if (value.startsWith(media))
        value = value.slice(media.length);
    if (value.startsWith('/'))
        return p;
    const bare = value.startsWith('./') ? value.slice(2) : value;
    // the legacy-double collapse (024's self-critique #2): rows served
    // before the run-dir-relative fix spell <rid>/<rid>/…
    const single = rid !== '' && bare.startsWith(rid + '/' + rid + '/')
        ? rid + bare.slice((rid + '/' + rid).length) : bare;
    const root = test ? 'test-output/' : 'output/';
    if (rid !== '' && (single === rid || single.startsWith(rid + '/'))) {
        return root + single;
    }
    // a bare run-relative name (the live row's gallery spelling) still
    // lives under the run's own directory — root it there (run-status
    // never meets this spelling; its rows arrive rid-prefixed).
    return single !== '' && rid !== '' ? root + rid + '/' + single : single;
}
/** THE OUTCOME OBSERVER, agent-side (observeRunOutcome's law, the
 *  attribution half): poll the run to terminal, writing every flip
 *  onto the stage row (runStatus + result) through the DRAFTS
 *  stage-patch door — `/v1/flows/drafts/<draftId>/stages/<stageId>`
 *  (THE SKIP-DONE HOLE, transcript-011's duplicate GPU runs, fixed
 *  2026-09-24: the old arm posted runStatus/result to the BENCH
 *  patch verb, whose law REFUSES run outcomes — "run outcomes ride
 *  the drafts/patch door" — so every agent-side attribution was
 *  refused and swallowed as bookkeeping; done marks never landed
 *  and the next bench pass re-ran completed stages. The UI's
 *  observer always used this door — that is why the user's Run All
 *  skipped and the agent's never did). Patches remain bookkeeping —
 *  a refusal is swallowed (the run's own outcome is the answer) —
 *  but the door is now the one the law names, so the swallow only
 *  ever sees transport, never a wired-in refusal. The url rides the
 *  estate's media route: run-RELATIVE names prefix
 *  /melite-media/runs/<runId>/, urls that carry a scheme or lead
 *  with / pass verbatim (the ONE rewrite — the run-wire law,
 *  mirrored). */
export async function observeAndAttribute(estate, draftId, stageId, runId, signal, test, budgetMs = OBSERVE_MAX_MS, rearms = 2, 
// W-2: the input-runs snapshot the RUNNING row resolved at press
// time (runBench only; the card/flow single-run callers pass none).
// Lands inside the terminal result dict so the row's next skip test
// can compare it against the upstream identities as they stand then.
inputRuns) {
    const deadline = Date.now() + budgetMs;
    let lastLive = '';
    // THE LOUD MISS (the no-feedback defect, 2026-10-22): the operator
    // watched an agent bench pass mint five runs while the cards tab
    // showed NOTHING — every stamp died at the seat seam and each
    // death was swallowed as "bookkeeping". A stamp that does not land
    // is a voice the user never hears, so the observation CARRIES the
    // miss (stamp_note) instead of eating it; the run's own outcome
    // still answers. The newest attempt owns the note: a later stamp
    // that LANDS clears it (the preview paints — the earlier miss is
    // history), a later miss overwrites it.
    let stampNote;
    const noteMiss = (phase, why) => {
        stampNote = `attribution ${phase}: ${why}`;
    };
    for (;;) {
        signal.throwIfAborted();
        let doc;
        try {
            doc = await estate.runsStatus(runId, false, signal, TIMEOUT_MS);
        }
        catch (e) {
            // a classified unknown-run is terminal (the poll's stop set
            // must match the stream's — runFinished's law); transport
            // hiccups retry on cadence.
            const re = remoteErrorOf(e);
            // folded like every other arm of this poller: unknown-outcome
            // is the 'stopped' CardStatus by the owner's contract
            if (re !== null && re !== undefined && re.code === 'runs/unknown-run')
                return { status: statusOf('unknown'), url: '', artifacts: [], asset_urls: [], host_paths: [] };
            await sleepAbort(1500, signal);
            continue;
        }
        const status = typeof doc['status'] === 'string' ? doc['status'] : 'unknown';
        if (isTerminalStatus(status)) {
            const stages = Array.isArray(doc['stages'])
                ? doc['stages'].filter((s) => typeof s === 'object' && s !== null) : [];
            const st = stages.find((s) => s['id'] === stageId)
                ?? (stages.length === 1 ? stages[0] : undefined);
            // THE MEDIA URL IS THE CONTRACT'S (2026-10-10, the records
            // audit's H2 — a LIVE second copy: this re-wrote the prefix and
            // passed a LEGACY `/v1/assets/runs` path through VERBATIM
            // because it begins with a slash, so a stored pre-law path
            // went to the browser dead. canonicalRunMediaUrl heals both
            // spellings to the live one, and the prefix is the contract's.
            const toMediaUrl = (value) => {
                if (value === '')
                    return '';
                const healed = canonicalRunMediaUrl(value);
                if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(healed))
                    return healed;
                const relative = healed.startsWith(`${runId}/`) ? healed.slice(runId.length + 1) : healed;
                return `${RUN_MEDIA_PREFIX}/${encodeURIComponent(runId)}/${relative.split('/').map(encodeURIComponent).join('/')}`;
            };
            const rawUrl = st !== undefined && typeof st['url'] === 'string' && st['url'] !== '' ? st['url'] : '';
            const url = toMediaUrl(rawUrl);
            // THE HOST FACE rides the raw spellings the browser rewrite
            // consumed (F7's law): the agent gets out-rooted paths its
            // shell can open, minted BEFORE any media prefix joins.
            const hostPaths = rawUrl !== '' ? [canonicalHostPath(rawUrl, runId, test)] : [];
            const arts = [];
            const rawArts = doc['artifacts'];
            if (Array.isArray(rawArts)) {
                for (const a of rawArts) {
                    const p = typeof a === 'string' ? a
                        : (typeof a?.['path'] === 'string' ? a['path'] : '');
                    if (p !== '')
                        arts.push(p);
                }
            }
            // THE GALLERY ROWS (queue 12's label law): each row carries its
            // file `name` (the media key) and may carry a display `label`
            // (the output_name mint at settle) — the artifacts map keys by
            // label-first, one law with cards-resource's builder.
            const galleryRows = [];
            const galleryNames = [];
            const gallery = st !== undefined && Array.isArray(st['gallery'])
                ? st['gallery'].flatMap((entry) => {
                    if (typeof entry !== 'object' || entry === null || Array.isArray(entry))
                        return [];
                    const name = entry.name;
                    if (typeof name !== 'string' || name === '')
                        return [];
                    const rawLabel = entry.label;
                    return typeof rawLabel === 'string' && rawLabel !== ''
                        ? [{ name, label: rawLabel }] : [{ name }];
                })
                : [];
            for (const g of gallery) {
                if (!galleryNames.includes(g.name)) {
                    galleryNames.push(g.name);
                    galleryRows.push(g);
                }
            }
            const names = [];
            for (const row of [...galleryRows, ...arts.map((a) => ({ name: a }))]) {
                if (!names.includes(row.name))
                    names.push(row.name);
            }
            for (const name of names) {
                const host = canonicalHostPath(name, runId, test);
                if (host !== '' && !hostPaths.includes(host))
                    hostPaths.push(host);
            }
            const result = { run_id: runId };
            if (url !== '')
                result['url'] = url;
            // W-2: the terminal stamp carries the press-time input snapshot —
            // the live patch above stays minimal, this is the evidence the
            // next skip test judges.
            if (inputRuns !== undefined)
                result['input_runs'] = inputRuns;
            const artifacts = {};
            const assetUrls = [];
            for (const name of names) {
                const mediaUrl = toMediaUrl(name);
                if (assetUrls.includes(mediaUrl))
                    continue;
                const g = galleryRows.find((row) => row.name === name);
                artifacts[g?.label ?? name] = mediaUrl;
                assetUrls.push(mediaUrl);
            }
            if (url !== '' && !assetUrls.includes(url))
                assetUrls.unshift(url);
            if (Object.keys(artifacts).length > 0)
                result['artifacts'] = artifacts;
            if (assetUrls.length > 0)
                result['assetUrls'] = assetUrls;
            // THE FOLD (2026-10-01): the old ternary translated ONLY
            // 'completed' and passed every other word verbatim, so cached,
            // reused, skipped, stale and live landed on bench rows as words
            // nothing translated. One fold classifies every word.
            const terminal = statusOf(status);
            // The stamp is BOOKKEEPING for the run but FEEDBACK for the
            // watching user (the cards tab adopts foreign runs off these
            // very rows) — a miss answers loud, never silence.
            // THE BOUNDED RETRY (F3 D3-07, the 15 s bound's third burn —
            // s_94: a green run whose stamp died when the drafts PATCH
            // outlived its bound ONCE): the terminal stamp takes up to
            // STAMP_TAKES swipes at the door, each with its own fresh
            // bound and a beat between — a wedged beat is transient, and
            // one dead take must not eat the tab's row. Only when EVERY
            // take dies does the miss voice ride (and the run row gets
            // its attribution: missed mark below).
            let landed = false;
            for (let take = 1; take <= STAMP_TAKES && !landed; take++) {
                try {
                    const ans = await estate.draftsStagePatch(draftId, stageId, { runStatus: terminal, result }, signal, DRAFT_TIMEOUT_MS);
                    if (ans !== null && typeof ans === 'object' && ans['delivered'] === false) {
                        noteMiss('refused', typeof ans['reason'] === 'string' && ans['reason'] !== '' ? ans['reason'] : 'not delivered');
                    }
                    else {
                        stampNote = undefined;
                        landed = true;
                        break;
                    }
                }
                catch (e) {
                    noteMiss('failed', e instanceof Error ? e.message : String(e));
                }
                if (take < STAMP_TAKES)
                    await sleepAbort(1200, signal);
            }
            if (!landed) {
                // THE RUN-ROW MARK (D3-07's second half): the stamp is dead
                // on the bench plane — carry the miss on the RUN row through
                // the runs plane instead, so run_status and every later
                // press receipt answer "completed — NOT shown on the tab"
                // instead of a bare done. Best-effort and SILENT by design:
                // the stamp_note above already voices the stamp's own miss
                // for this call, and the mark serves a different consumer
                // (the run row) — a dead mark door must not rewrite the
                // stamp's voice with a second failure's text.
                try {
                    await estate.runsAttribute(runId, 'missed', signal, TIMEOUT_MS);
                }
                catch {
                    /* the note already voices the miss; the mark was best-effort */
                }
            }
            // THE FOUR-TAKE FACE (the stale-two-run audit, cure 2,
            // 2026-11-15): the SET rides the outcome in the BROWSER
            // spelling — the same toMediaUrl rewrite the lead got, in the
            // stage gallery's own order (the lead first, the run door's
            // ordering law). The pass row's `artifacts` key stays the raw
            // wire spelling (its own wall pins it); `asset_urls` is the
            // chat face's set.
            return { status: terminal, url, artifacts: arts, asset_urls: assetUrls, host_paths: hostPaths,
                ...(stampNote !== undefined ? { stamp_note: stampNote } : {}),
                // THE FINAL-MISS MARK (D3-07): every stamp take died — the
                // run row carries attribution: missed (best-effort write
                // above) and the returned row mirrors it so the press
                // receipt and any caller can branch on the face.
                ...(!landed ? { attribution: 'missed' } : {}) };
        }
        // the queue-feedback stamp, classified by the fold (queued or
        // still-waiting stamps queued; 'live'/'stopping' stamp running).
        // The view-side read: this doc came over the wire without
        // readRunStatus's validation, and isTerminalStatus above passes an
        // unreadable word through as non-terminal — the poller keeps its
        // cadence on a word it cannot read, never dies on the throw.
        const foldedLive = statusOrPendingOf(status);
        const live = foldedLive === 'queued' || foldedLive === 'pending' ? 'queued' : 'running';
        if (live !== lastLive) {
            lastLive = live;
            try {
                await estate.draftsStagePatch(draftId, stageId, { runStatus: live, result: { run_id: runId } }, signal, DRAFT_TIMEOUT_MS);
            }
            catch (e) {
                // bookkeeping for the run, FEEDBACK for the watching user —
                // noted, superseded by whatever the terminal stamp does.
                noteMiss('live stamp failed', e instanceof Error ? e.message : String(e));
            }
        }
        if (Date.now() >= deadline) {
            // THE WAIT-EXPIRED RECEIPT (the commission wedge, 2026-10-03):
            // budget spent on a run that is still live — the observation
            // ends, the run does not. 'queued' is the fold's waiting face
            // and a word the terminal arm can never return, so the
            // callers branch on it cleanly. Attribution outlives the
            // observation: one background link with a fresh signal (the
            // attribution-outlives-the-call law — the fire-and-forget
            // arms' own shape) keeps stamping the stage row until the run
            // settles or the chain's re-arms run out (the queue-side
            // armor bounds the run itself).
            if (rearms > 0) {
                void observeAndAttribute(estate, draftId, stageId, runId, new AbortController().signal, test, budgetMs, rearms - 1, inputRuns).catch(String);
            }
            return { status: 'queued', url: '', artifacts: [], asset_urls: [], host_paths: [], ...(stampNote !== undefined ? { stamp_note: stampNote } : {}) };
        }
        await sleepAbort(1500, signal);
    }
}
/** W-5's strict-form comparator (F3-12, 2026-11-05): a key-sorted
 *  recursive JSON spelling, so params equality is independent of key
 *  order — a held row written by another call site still matches its
 *  identical twin. Both sides are normalized (the press normalizes at
 *  normalizeJsonArrayParams, the held row was normalized at ITS
 *  write), so the canonical spellings compare equal only for
 *  identical work.
 *
 * @param v - a JSON params value.
 * @returns the canonical spelling compared for twin equality.
 */
function canonJson(v) {
    if (Array.isArray(v))
        return '[' + v.map(canonJson).join(',') + ']';
    if (v !== null && typeof v === 'object') {
        const obj = v;
        return '{' + Object.keys(obj).sort().map((k) => JSON.stringify(k) + ':' + canonJson(obj[k])).join(',') + '}';
    }
    return JSON.stringify(v);
}
/** SINGLE (the old card_run path, composed inside): manifest gate
 *  + runnability gate + defaults merge, then draft + {model}. */
async function runSingle(estate, 
// hasCard gate (execute, the sole caller): card is a non-empty string
// and params always an object here — no empty fallbacks exist to cover
// (2026-09-12). model normalizes at the caller (missing → ''), so the
// !model guard below stays reachable ('' rides it — melite-load's
// `if (!name)` precedent).
a, signal) {
    const card = a.card;
    // THE MODEL DERIVE (the zero-friction audit, 2026-10-21): the card
    // arm refused without an explicit `model` while modelForCard — the
    // same card→family derivation the BENCH arm rides — sat one block
    // above unused. The operator's explicit family still wins; a card
    // that boards a family derives it (the QUEUE LANE LAW's own
    // resolver, never a minted id); only a card boarding NOTHING still
    // refuses, and the refusal now names where the family lives.
    let model = a.model;
    if (!model)
        model = await modelForCard(card, a.params);
    // THE NAMED-DOOR LAW (the F20 canon: a refusal naming a door must
    // have the door) + the qa8 F22 residual (2026-11-01: utility cards
    // board [] by design, and the family-explicit cure was a dead end
    // for them): the voice names BOTH working cures — the family pick
    // when the card boards one, and the bench stage path that runs a
    // familyless card today. The wall (doors-refusal-door-pin.spec.ts)
    // pins that every named door exists in the same toolset.
    if (!model)
        return { mode: 'card', target: card, error: 'model is required: this card boards no default family — name the family explicitly (melite_load lists the boarded families on the card); a card with no family runs as a bench stage instead (melite_construct add_stage composes it without a family)' };
    // THE CARD ARM OWNS THE COMPOSE (REBUILD-9): the runs registry's
    // start {model:} arm gates (manifest/runnability), overlays the
    // route-lens stamp (family defaults + variant resolver_defaults),
    // composes phase-1/phase-2 and registers — the tool passes the
    // USER bag and surfaces the arm's refusal voices (RemoteError →
    // {error}). The tool's caller names the family itself; the
    // /v1/card-tools + /v1/model-catalog faces serve NO model pick
    // for a model-less card (THE MINTED-MODEL KILL, 2026-10-12) and
    // never did compose — the card-id alias is admission's law
    // (PROOF-13), not a served pick.
    // execute always passes params: bag (an object) — spread of undefined
    // is {} anyway, so no fallback exists to cover (2026-09-12).
    const bag = { ...a.params };
    if (typeof a.prompt === 'string' && a.prompt !== '')
        bag["prompt"] = a.prompt;
    const defs = await loadCardDefs();
    const resolved = resolveSpecKeyForTool(card, defs, boardedMap(defs));
    // M7 (the fallback audit): an unknown card used to degrade to
    // `cardDef === undefined`, the tool still birthed a draft with the
    // bogus card id, and the refusal surfaced only at the run door —
    // the bench polluted with an uncomposable stage first. The law is
    // the tool's own comment above ("surfaces the arm's refusal
    // voices"): refuse HERE, before anything is written.
    if (resolved === null) {
        return { mode: 'card', target: card, error: `unknown card '${card}' — name a registered card or family (melite_discover lists them); nothing was written to the bench` };
    }
    const cardDef = defs.get(resolved.card);
    const normalizedBag = normalizeJsonArrayParams(bag, cardDef?.jsonArrayParams);
    // CARD BIRTH LAW (2026-09-13, the hour-6 form regression): a card
    // tool's draft is born with THE CARD ID AS ITS INTENT and one
    // stage. The bench normalization strips `card` from the stage row
    // (identity survives on the intent alone), and the studio consult
    // re-attaches cardName from the intent — so intent MUST be the
    // card id, never the prompt. The prompt-as-intent arm here is what
    // rendered the generic form for every prompt-carrying chat birth:
    // the consult keyed on "a quiet beach at dusk" and no studio
    // claimed it. The prompt rides bag.prompt (params), its display
    // home. (drafts/list shows the card id as the draft name — the
    // bench-default receipt's own shape.)
    /* v8 ignore next -- resolveSpecKey answered above; every real card
     * id and family alias is far under 80 chars, so the truncation arm
     * is defensive only (2026-10-13, the coverage-cure pass). */
    const intent = card.length > 80 ? card.slice(0, 77) + '…' : card;
    // F16 (2026-11-12): the stage the press writes must carry the
    // model the start rides — the bench the press LEAVES BEHIND has to
    // compile standalone (runsValidateStages' own voice was the burn:
    // "card 'tts' requires params.model" on the tts stage a press
    // minted without it). Pure-tool cards (requiresModel false) take
    // no stamp — a phantom model seat pollutes nothing.
    const stageParams = cardDef?.requiresModel !== false ? { ...normalizedBag, model } : normalizedBag;
    // F15 — THE MERGE LAW (2026-11-12, the friction report's burn: a
    // `card: tts` press WIPED a composed film/swap/track bench —
    // stages dropped, intent flipped). A single-card press on a bench
    // that already holds stages APPENDS through the bench's own
    // add_stage verb (server CAS, server-minted id — the same door
    // melite_construct's add_stage rides); stages and intent survive
    // verbatim. Only an empty or missing bench births the one-stage
    // draft (the CARD BIRTH LAW above keeps its intent seat there).
    // THE RUN RIDES THE SINGLE-CARD BODY in both arms — the ONE-PRESS
    // ONE-CARD LAW (operator 2026-10-26: "WHEN I RUN A CARD
    // INDEPENDENTLY, OTHER CARDS RUN TOO????????"): the pressed card
    // composes ONE stage, the bench compose stays the draft door's
    // alone. The 2026-10-10 wired-bench diversion (restage every
    // single-card press onto the whole-bench compose because the bench
    // had wires) was that cursed shape's client twin — superseded
    // here with the law that replaced it server-side.
    let existing = null;
    try {
        existing = await estate.benchGet(a.bench, signal, DRAFT_TIMEOUT_MS);
    }
    catch {
        // bench/not-found or unreachable: the birth arm below names it
        // (loadBench's own CAS read re-reads and its refusal surfaces).
        existing = null;
    }
    const heldStages = existing !== null && Array.isArray(existing['stages'])
        ? existing['stages'].filter((st) => typeof st === 'object' && st !== null)
        : [];
    let draftId;
    let stageId = 's_0';
    let rode;
    if (heldStages.length > 0 && existing !== null) {
        // W-5 — THE TWIN-CARD REFUSE GUARD (F3-12, operator ruling
        // 2026-11-05: "card press on a bench already holding that card →
        // REFUSE naming the row"; cure map bench-state Item 2 option (b),
        // the strict form): a held row of the SAME card with normalized
        // params/seed equality is the work this press is about to spend a
        // SECOND identical GPU run on (the burn: same seed 73020, same
        // params, pixel Δ 0.00 — billed twice, plus the s_1 mint onto the
        // shared bench). REFUSE before the append and before the start —
        // the minted-stage half dies with the append that never fires —
        // naming the row id, its last run, and the cure doors (press that
        // row, or patch its params to change the work). A DIFFERENT card,
        // or the same card with different params, falls through to the
        // F15 merge arm below (the merge law is bounded, not deleted).
        const twin = heldStages.find((st) => st['card'] === card && canonJson(st['params']) === canonJson(stageParams));
        if (twin !== undefined) {
            const twinId = String(twin['id']);
            const twinResult = twin['result'] !== null && typeof twin['result'] === 'object' && !Array.isArray(twin['result'])
                ? twin['result'] : null;
            const twinLastRun = twinResult !== null && typeof twinResult['run_id'] === 'string' && twinResult['run_id'] !== ''
                ? twinResult['run_id'] : null;
            return { mode: 'card', target: card, error: `the bench already holds this card as stage ${twinId} with the same params${twinLastRun !== null ? ` (last run ${twinLastRun})` : ' (never run)'} — pressing it again would spend a second identical GPU run (F3-12 double spend); nothing was appended and no run was started: press that row directly with melite_flow {stage:"${twinId}"}, or patch its params with melite_construct patch to change the work and run again` };
        }
        try {
            const appendOnce = (rev) => estate.benchVerb(a.bench, 'add_stage', {
                card,
                engine: CARD_PLANE_ENGINE,
                params: stageParams,
                ...(rev !== undefined && rev !== null ? { expect_rev: rev } : {}),
            }, signal, DRAFT_TIMEOUT_MS);
            let appended;
            try {
                appended = await appendOnce(existing['rev']);
            }
            catch (e) {
                // one bounded CAS rebase (postBenchVerb's law, the construct
                // twin): a race between the read and the append re-reads the
                // rev once — a second conflict is a real refusal.
                if (remoteErrorOf(e)?.code !== 'bench/cas-conflict')
                    throw e;
                const fresh = await estate.benchGet(a.bench, signal, DRAFT_TIMEOUT_MS);
                appended = await appendOnce(fresh['rev']);
            }
            if (typeof appended['error'] === 'string' && appended['error'] !== '') {
                return { mode: 'card', target: card, error: appended['error'] };
            }
            if (typeof appended['stage'] === 'string' && appended['stage'] !== '')
                stageId = appended['stage'];
            draftId = typeof existing['draft_id'] === 'string' && existing['draft_id'] !== ''
                ? draftIdOf(existing['draft_id'])
                : benchDraftIdOf(a.bench);
            rode = `merge-arm (bench held ${String(heldStages.length)} stage(s) — appended ${stageId}, nothing replaced)`;
        }
        catch (e) {
            return { mode: 'card', target: card, error: e instanceof Error ? e.message : String(e) };
        }
    }
    else {
        try {
            draftId = await loadBench(estate, {
                session: a.bench,
                intent,
                stages: [{
                        id: 's_0',
                        card,
                        engine: CARD_PLANE_ENGINE,
                        params: stageParams,
                    }],
            }, signal);
        }
        catch (e) {
            return { mode: 'card', target: card, error: e instanceof Error ? e.message : String(e) };
        }
    }
    const started = await startRun(estate, { ...normalizedBag, model, test: wireBool(a.test), draft_id: draftId }, signal);
    if (typeof started["error"] === "string")
        return { mode: 'card', target: card, ...(rode !== undefined ? { rode } : {}), ...started };
    const runId = started['run_id'];
    if (typeof runId === 'string' && runId !== '') {
        void observeAndAttribute(estate, draftId, stageId, runId, new AbortController().signal, wireBool(a.test)).catch(String);
    }
    return { mode: 'card', target: card, model, draft_id: draftId, ...(rode !== undefined ? { rode } : {}), ...started };
}
/** TEMPLATE (the old flow_run path): a {flow} press that MATERIALIZES
 *  the flow's cards onto the bench, then starts the run through the
 *  flow's own door. (The FLOWS-ARE-COMPOSITIONS law, operator
 *  2026-11-14: "WHEN YOU LOAD A FLOW, IT COMES OUT AS CARDS… THE
 *  BENCH OF CARDS REPRESENTS A FLOW" — slice A killed the ref_flow
 *  marker row, and slice C replaces the press it poisoned: a
 *  card-stage flow lands as its CARD rows (ONE bench write, the
 *  same expansion the {flow} door composes, undoable via the
 *  melite_construct undo the landing's history carries), and the
 *  run presses the flow door carrying the bench's draft_id — the
 *  envelope's CARD BIRTH law satisfied by a draft that EXISTS and
 *  shows the very cards being run. A flow whose stages hold no card
 *  seats (family actions, engine verbs, skip_when — the
 *  contradictions the audit named) keeps the draft-less face: the
 *  run row alone is the landing, and the start door's flow-doc
 *  exemption admits the press.) */
async function runTemplate(estate, 
// hasFlow gate (execute, the sole caller): flow is a non-empty string
// and params always an object here — no fallbacks exist to cover
// (2026-09-12).
a, signal) {
    const flow = a.flow;
    /* v8 ignore next -- hasFlow gate proves non-empty flow (2026-09-12) */
    if (!flow)
        return { mode: 'flow', target: '', error: 'flow is required (a discovered flow name)' };
    const overrides = a.params;
    // THE MATERIALIZING READ (slice C): the load face serves the flow's
    // bench rows (flowBenchStages — the SAME expansion the {flow} start
    // door composes, so the bench shows the graph the door compiles).
    // A read refusal (unknown flow, an authoring throw) names itself
    // BEFORE any bench write or run press — no half-landing.
    let benchRows;
    // THE INITIALS SPLIT (N1, 2026-11-15 — the flow door's seed never
    // reached the sampler): the bundle's initials.validators own the
    // top-level seat names (prompt, photo, …) — everything else the
    // caller states is a card knob and rides nested under params, the
    // one spelling the named-flow door reads. The old splat spread
    // every knob top-level, where the door never looks: seed died
    // there while _request.json carried it like a promise, and both
    // stages minted fresh. Without the bundle's validator seat the
    // split cannot tell initials from knobs — legacy splat, and the
    // door's top-level-seed refusal names the fix instead of a
    // silent mint.
    let initialKeys;
    try {
        const bundle = await estate.loadCard('flow', flow, signal, DRAFT_TIMEOUT_MS);
        const rawRows = bundle['bench_stages'];
        if (Array.isArray(rawRows) && rawRows.length > 0) {
            benchRows = rawRows.filter((r) => typeof r === 'object' && r !== null && !Array.isArray(r));
        }
        const initials = bundle['initials'];
        if (initials !== undefined && initials !== null && typeof initials === 'object' && !Array.isArray(initials) &&
            initials.validators !== undefined && initials.validators !== null && typeof initials.validators === 'object' && !Array.isArray(initials.validators)) {
            initialKeys = new Set(Object.keys(initials.validators));
        }
    }
    catch (e) {
        const re = remoteErrorOf(e);
        return { mode: 'flow', target: flow, error: re !== null && re !== undefined && re.message !== '' ? re.message : (e instanceof Error ? e.message : String(e)) };
    }
    // ONE WRITE, THE WHOLE BENCH IS THE FLOW (the landing declares
    // itself — the one-shared-state law; the landing's history entry
    // carries the stages_before inverse, so melite_construct undo
    // restores what the flow replaced). The anti-ghost-bench ruling:
    // the press is visible as bench rows AND a run row.
    let draftId;
    if (benchRows !== undefined) {
        try {
            draftId = await loadBench(estate, {
                session: a.bench,
                intent: flow,
                stages: benchRows,
            }, signal);
        }
        catch (e) {
            return { mode: 'flow', target: flow, error: e instanceof Error ? e.message : String(e) };
        }
    }
    // THE SPLIT PRESS (N1's other half): initials stay top-level
    // (the initialValidators gate reads body keys), knobs ride nested
    // params (the overlay door's one spelling) — so params.seed pins
    // every stage the row's tool overlay names.
    const top = {};
    const knobs = {};
    if (initialKeys === undefined) {
        Object.assign(top, overrides);
    }
    else {
        for (const [k, v] of Object.entries(overrides)) {
            if (initialKeys.has(k))
                top[k] = v;
            else
                knobs[k] = v;
        }
    }
    const started = await startRun(estate, {
        ...top,
        ...(Object.keys(knobs).length > 0 ? { params: knobs } : {}),
        flow,
        test: wireBool(a.test),
        // the bench draft rides when the flow materialized (the CARD
        // BIRTH envelope + the run row's restore path: the wand
        // rebuilds the flow's cards); a card-less flow presses the
        // door's own doc (the flow-doc exemption) and lands its run row
        // alone.
        ...(draftId !== undefined ? { draft_id: draftId } : {}),
    }, signal);
    // a refused start carries the error and NO run_id — the prose
    // names the refusal, never a press that never registered. A
    // materialized bench SURVIVES the refusal: the cards stay visible
    // (the initial the door refused is fixable on the bench — or by
    // the next press), and undo remains the operator's cure.
    if (typeof started["error"] === 'string') {
        return {
            mode: 'flow', target: flow,
            ...(draftId !== undefined ? { draft_id: draftId } : {}),
            ...started,
        };
    }
    return {
        mode: 'flow', target: flow,
        ...(draftId !== undefined ? { draft_id: draftId } : {}),
        ...(benchRows !== undefined ? { materialized: benchRows.length } : {}),
        ...started,
    };
}
export function meliteFlow(estate) {
    // PRESENTATION SEAT (§7 P7, the tool-presentation wall — one
    // seat for the invalid face): the presenter rides defineTool
    // validation, and defineTool's soft gate OWNS invalid args
    // (invalid → undefined, never throw). The pre-purge re-attach over
    // that gate (a second, ungated seat rendering the generic card for
    // junk) is deleted — conversion invariance (presentCall output must
    // not change) now reads against the gated face. execute validation
    // (ToolArgsError/INVALID_ARGS) is unaffected.
    const presentCall = (args) => {
        // the gate owns the junk face (defineTool validation — null,
        // strings, and mistyped keys refuse there): args is a schema-valid
        // object here, every top-level key optional (§7 P7).
        const a = args;
        const target = typeof a.card === 'string' && a.card !== '' ? a.card
            : typeof a.flow === 'string' && a.flow !== '' ? a.flow
                : typeof a.stage === 'string' && a.stage !== '' ? `stage ${a.stage}`
                    : '?';
        return { card: 'generic', title: `Run ${target}`, kind: 'execute' };
    };
    // Ledger row 8 (2026-09-10): defineTool wraps the literal — the
    // registry gains schema compilation + input validation
    // (ToolArgsError/INVALID_ARGS) + timeoutMs enforcement this face
    // never had as a raw registration.
    const def = defineTool({
        name: 'melite_flow',
        description: 'Execute through the serial GPU queue — the ONE execution verb. Exactly one per call: bench (run THE shared '
            + 'bench exactly as it stands — what the user\'s Run press runs) | card (a card id + model — single '
            + 'generation) | flow (a NAMED template from melite_load) | stage (ONE bench stage id — runs that stage alone '
            + 'through the bench pass, siblings + intent untouched; hand-built work presses ONE seated row, never a '
            + 'hand-authored graph). Compositions '
            + 'LOAD the shared bench first (nothing mints fresh — one state, one log, one undo); every start rides the '
            + 'bench\'s doc-backed draft_id (CARD BIRTH LAW) — it rides the value as the chat tile handle, never an '
            + 'agent arg. Returns {run_id, draft_id}; poll with run_status. One active run machine-wide.',
        // ParameterSchemaSpec grammar: the map IS the implicit object root
        // (no type/properties wrapper) — every composition arm stays
        // optional because exactly-one cross-property exclusivity is not
        // expressible in this grammar (per-property annotations only);
        // execute owns that refusal.
        parameters: {
            bench: {
                type: 'boolean',
                description: 'BENCH mode: run THE shared bench exactly as it stands (what the user\'s Run press runs). A JSON boolean — true, never the string "true". Exclusive with card/flow/stage.',
            },
            stage: {
                type: 'string',
                description: 'PER-STAGE mode — the id of ONE stage on the shared bench (e.g. s_0); runs that stage alone through the same compose/wire-resolution/attribution path the bench pass uses, never its siblings. Exclusive with bench | card | flow.',
            },
            card: {
                type: 'string',
                description: 'SINGLE mode: the card id (discovered). Requires model alongside.',
            },
            model: {
                type: 'string',
                description: 'SINGLE mode: the family id, named explicitly (must own a card tool).',
            },
            flow: {
                type: 'string',
                description: 'TEMPLATE mode: the flow name exactly as loaded.',
            },
            prompt: {
                type: 'string',
                // THE CARD-MODE PROMPT SEAT (027's self-critique #2,
                // 2026-09-24): top-level prompt merges into the card body
                // where the card's admission rejects it (tts wants `text`
                // inside params) — state the seat so card mode never
                // reaches for this field.
                description: 'SINGLE mode ONLY: the generation prompt (wins over params.prompt). Card mode takes its text key (e.g. text) INSIDE params — top-level prompt on a card refuses as an unknown param.',
            },
            params: {
                type: 'object',
                additionalProperties: true,
                description: 'Overrides merged over the mode defaults (seed, knobs).',
            },
            test: {
                type: 'boolean',
                description: 'L4 barrier: true routes the run to test-output, hidden from production assets. Default false.',
            },
        },
        presentCall,
        output: {
            schema: {
                type: 'object',
                additionalProperties: true,
                properties: {
                    run_id: { type: 'string', description: 'The queue run id — poll with run_status(run_id). Absent on a pre-run refusal; PRESENT on a stopped-mid-flow refusal (a stage that ran and failed — render prints it after the error).' },
                    draft_id: { type: 'string', description: 'The minted card draft id — the chat tile handle (?meliteCards=). Absent on refusal.' },
                    status: { type: 'string', description: 'The bench outcome: done | pending | stopped | queued | running. pending = the observation budget spent on a still-live run (the run continues on the queue — re-wait with run_status(run_id)); absent on refusal.' },
                    mode: { type: 'string', description: 'Which composition ran (or was attempted): bench | card | flow. bench is the commonest success value — the shared-bench run returns mode:\'bench\' at every bench return site.', required: true },
                    target: { type: 'string', description: 'The card id, flow name, or bench draft id (echoed on refusal).', required: true },
                    error: { type: 'string', description: 'The refusal text — present exactly when the tool refused (render prints REFUSED).' },
                },
                // Ledger row 11 (2026-09-10): required is the fields EVERY
                // return shape carries — the refusal echoes mode/target
                // (comfy-manage's ok/action pattern); run_id/draft_id/status
                // are success-only and stay optional so the declared schema
                // never calls a careful refusal a schema failure.
            },
            render: (_args, value) => {
                const v = value;
                if (v && typeof v.error === 'string') {
                    // A stopped-mid-flow bench carries the failed stage's run_id
                    // ALONGSIDE the error (the loop return at the stop site).
                    // The maker must never have to glob output/ to find a run it
                    // already paid for (transcript-016: ten wasted calls hunting
                    // the id the tool held but did not print).
                    const ran = typeof v.run_id === 'string' && v.run_id !== '' ? ` — run ${v.run_id} (poll with run_status)` : '';
                    return [{ type: 'text', text: 'melite_flow REFUSED: ' + v.error + ran }];
                }
                // The render stays human/model-facing prose; the tile handle rides
                // presentationMeta (the persisted channel — see below). The leading
                // `card <draftId>` token is the LEGACY replay path only: sessions
                // logged before the meta channel keep hydrating through it.
                // THE PASS LIST rides the prose too (032/033: a maker that minted
                // three runs saw ONE '?' — every id it paid for prints here now).
                const pass = v.pass;
                const passRows = Array.isArray(pass)
                    ? pass.map((p) => '  · ' + String(p['stage'] ?? '?') + ' ' + String(p['card'] ?? '?')
                        + (typeof p['run_id'] === 'string' && p['run_id'] !== '' ? ' → ' + p['run_id'] : '')
                        // THE HONEST SKIP FACE (the warm-fire no-op lie): a
                        // skipped row printed [done] — indistinguishable from a
                        // minted run, and the agent hunted a run that never
                        // existed. The skip says WHAT it skipped and WHY.
                        // THE HONEST SKIP FACE (the warm-fire no-op lie): a
                        // skipped row printed [done] — indistinguishable from a
                        // minted run, and the agent hunted a run that never
                        // existed. The skip says WHAT it skipped and WHY.
                        + ' [' + (p['status'] === undefined && p['skipped'] !== undefined
                        ? 'skipped ' + String(p['skipped']) + (p['skipped'] === 'archived'
                            ? ' — spent stage resting; unarchive to run it again'
                            // THE LAST-RUN GROUND (qa8 GAPS-12/F19, 2026-11-01):
                            // "unchanged since its last run" names a run — it
                            // prints only when the pass row carries one
                            // (last_run, grounded at the skip site in the row's
                            // own result memory). A done mark with no run behind
                            // it reads skipped honestly, never unchanged.
                            : typeof p['last_run'] === 'string' && p['last_run'] !== ''
                                // W-9 (2026-11-05, RG-P4-1b — the patch-same-value
                                // drift): the old "patch params to re-run" taught
                                // any-patch-re-runs, but the estate keeps the done
                                // mark on a same-value patch (bench.ts:1376 clears
                                // runStatus only on a real canonical-spelling
                                // change). The teacher names the VALUE: only a
                                // param VALUE change (or a clear) re-arms the stage.
                                ? ' — unchanged since its last run; patch a param VALUE to re-run'
                                : ' — done on record but no last run behind it; patch params to force a run')
                        : String(p['status'] ?? p['skipped'] ?? '?')) + ']'
                        // THE LOUD MISS FACE (the no-feedback defect): a stamp
                        // that never landed means the watching user's cards tab
                        // paints NOTHING for this row — the maker must see that
                        // and say so, not report a run the user cannot find.
                        // D3-07: the face fires on the run-row mark too (the
                        // retry's final miss rides attribution — cross-call
                        // receipts still see it when the note aged out).
                        + (typeof p['stamp_note'] === 'string' && p['stamp_note'] !== ''
                            ? ' — STAMP MISSED (' + p['stamp_note'] + '): the user\u2019s cards tab will NOT show this run; re-stamp to show it'
                            : p['attribution'] === 'missed'
                                ? ' — STAMP MISSED (attribution marked missed on the run row): the user\u2019s cards tab will NOT show this run; re-stamp to show it'
                                : '')
                        // F18 — THE CROSS-REGIME JOIN ADMISSION face: a row that
                        // joined the film regime to a mismatched mod tier prints
                        // the admission in the row prose (the maker reads the
                        // render, not the payload — the same law the stamp-miss
                        // face obeys).
                        + (typeof p['warning'] === 'string' && p['warning'] !== ''
                            ? '\n    ⚠ ' + p['warning']
                            : '')
                        // W-2 — THE STALE FACE: a row that re-ran because its wired
                        // input's snapshot no longer matches prints why, beside the
                        // run it minted (the RG-P4-3 burn was invisible exactly
                        // here: the pass read "unchanged" while the source moved).
                        + (typeof p['stale'] === 'string' && p['stale'] !== ''
                            ? '\n    ↻ ' + p['stale']
                            : '')
                        + (typeof p['url'] === 'string' && p['url'] !== '' ? ' ' + p['url'] : '')
                        + (Array.isArray(p['host_paths']) && p['host_paths'].length > 0
                            ? ' (host: ' + p['host_paths'].join(', ') + ')' : '')).join('\n')
                    : '';
                const hostPaths = v.host_paths;
                return [{
                        type: 'text',
                        // THE FLOW PRESS'S DRAFT FACE (the flows-are-compositions
                        // law, slice C): a MATERIALIZED flow press carries the
                        // bench draft — the token leads and the chat tile
                        // hydrates from the very cards the run is pressing (the
                        // handle resolves: the bench holds them). A card-less
                        // flow (family action / engine verb) carries no draft and
                        // no token leads — the prose names the flow and its run
                        // directly (a fake token would feed the legacy tile
                        // parser a handle that resolves nowhere).
                        text: (typeof v.draft_id === 'string' && v.draft_id !== '' ? 'card ' + v.draft_id + ' · ' : '')
                            + 'flow ' + String(v.target ?? '?')
                            // the landing names itself: a materialized press says how
                            // many card rows it landed (the operator's anti-ghost-bench
                            // ruling — every press is visible on the bench AND the
                            // run lane).
                            + (typeof v.materialized === 'number'
                                ? ` (materialized ${v.materialized} cards on the bench)`
                                : '')
                            // no dangling arrow: an all-skipped bench mints nothing
                            // (run_id '') and the header says so — the id prints only
                            // when a run exists to poll.
                            + (typeof v.run_id === 'string' && v.run_id !== '' ? ' → ' + v.run_id : '')
                            + ' [' + String(v.status ?? 'queued') + '] — poll with run_status'
                            + (passRows !== '' ? '\n' + passRows : '')
                            // THE RUN CONTRACT'S HOST FACE (F7): every path the
                            // maker's shell can open, in run_status's resolving-root
                            // voice — the media urls above are the browser's
                            // channel, these are the filesystem's. An array can never
                            // be nullish, so no ?? fallback exists to cover.
                            + (Array.isArray(hostPaths) && hostPaths.length > 0
                                ? '\nartifacts on host (rooted at the estate output tree, not your cwd): '
                                    + hostPaths.join('\n  ')
                                : ''),
                    }];
            },
            // presentationMeta: the NATIVE tile channel — persisted verbatim on
            // tool/result; the client derives card props from it (the same path
            // every card tool rides: {draft_id, run_id, model?, status, error}).
            // Pure: live streaming AND session-log replay call it with the frozen
            // value alone. The agent never sees this payload.
            presentationMeta: (_args, value) => {
                const v = (value ?? {});
                return {
                    mode: String(v.mode ?? '?'),
                    target: String(v.target ?? '?'),
                    ...typeof v.model === 'string' && v.model !== '' ? { model: v.model } : {},
                    ...typeof v.draft_id === 'string' && v.draft_id !== '' ? { draft_id: v.draft_id } : {},
                    ...typeof v.run_id === 'string' && v.run_id !== '' ? { run_id: v.run_id } : {},
                    ...typeof v.status === 'string' && v.status !== '' ? { status: v.status } : {},
                    ...typeof v.error === 'string' && v.error !== '' ? { error: v.error } : {},
                    // THE PRESS'S OWN HEROES (the refresh-flood burn, 2026-11-19:
                    // a page refresh re-rendered the same settled artifacts in
                    // every historical chat card, repeating). The chat card's
                    // inline strip derives from THIS persisted array — the pass
                    // rows that minted a url — frozen at settle time. Before it,
                    // the card re-derived the strip from the present-time draft
                    // doc, so every historical card in a replayed transcript
                    // stamped the whole bench's CURRENT heroes under itself.
                    ...(Array.isArray(v.pass)
                        ? {
                            previews: v.pass
                                .filter((p) => typeof p['url'] === 'string' && p['url'] !== '')
                                .map((p) => {
                                // THE FOUR-TAKE FACE (the stale-two-run audit, cure 2,
                                // 2026-11-15): the row's own artifact SET rides — the
                                // media-spelled urls the observer rewrote (the lead
                                // first). The chat strip renders the whole set (the
                                // all-visible law); before this key it froze the LEAD
                                // url alone and the run's other takes never reached
                                // the thread.
                                const urls = assetUrlsOf(p);
                                return {
                                    stage: typeof p['stage'] === 'string' ? p['stage'] : '?',
                                    url: String(p['url']),
                                    status: typeof p['status'] === 'string' ? p['status'] : 'done',
                                    ...(urls.length > 0 ? { artifacts: urls } : {}),
                                };
                            }),
                            // THE DISCRIMINATOR (the stale-two-run audit, cure 1,
                            // 2026-11-15): the pass rows THEMSELVES freeze here —
                            // every stage of THAT call's press with its settle-time
                            // status, run id, lead url and artifact set. The replayed
                            // card renders THIS face and fires no drafts/get; the
                            // bench's present tense (its rows and its intent, both
                            // rewritten whole by every later press) never reaches a
                            // historical card again.
                            rows: v.pass.map((p) => {
                                const row = {
                                    stage: typeof p['stage'] === 'string' ? p['stage'] : '?',
                                    card: typeof p['card'] === 'string' ? p['card'] : '',
                                    // THE ROW'S OWN VERDICT: the settled outcome's word;
                                    // a skip and a throw are words too — the frozen face
                                    // shows what THAT call saw, never a fabricated state.
                                    status: typeof p['status'] === 'string' && p['status'] !== ''
                                        ? p['status']
                                        : p['skipped'] !== undefined
                                            ? 'skipped'
                                            : typeof p['thrown'] === 'string' && p['thrown'] !== '' ? 'error' : '',
                                };
                                if (typeof p['run_id'] === 'string' && p['run_id'] !== '')
                                    row['run_id'] = p['run_id'];
                                if (typeof p['url'] === 'string' && p['url'] !== '')
                                    row['url'] = p['url'];
                                const arts = assetUrlsOf(p);
                                if (arts.length > 0)
                                    row['artifacts'] = arts;
                                return row;
                            }),
                        }
                        : {}),
                    // THE FROZEN HEAD (cure 1): the settle-time intent rides
                    // beside the rows — the card's head reads THIS, never the
                    // bench's current intent under a historical card.
                    ...(typeof v.intent === 'string' && v.intent !== '' ? { intent: v.intent } : {}),
                };
            },
        },
        async execute(args, exec) {
            // defineTool input validation runs in the wrapper BEFORE the body
            // (invalid args throw ToolArgsError there) — args is always a
            // defined object here, so no nullish fallback exists to cover;
            // every composition arm stays optional (exactly-one is enforced
            // below, never the schema) (2026-09-12).
            // THE ARRAY WIRE GUARD (P2, ROADMAP §36.4 — commission 034's
            // forensic): free-form nested arrays corrupt on the wire
            // (`{item:[…]}` non-empty, `""` empty). The shape-based
            // unwrap rides EVERY param-bearing arg before composition —
            // the card seat (the kit's coerceWireArrays) fills the ""
            // arm for schema-declared arrays.
            // THE REBIND LAW (attempt-035's construct/flow freeze
            // receipt, 2026-09-24): the wire may deliver args FROZEN —
            // writing `a.params = …` threw `Cannot assign to read only
            // property 'params'` on every param-bearing mutation. The
            // guard NEVER writes to the caller's object: it walks a copy
            // and the body reads the new binding only.
            const a = { ...unwrapItemArrays(args) };
            const bag = (a.params && typeof a.params === 'object' && !Array.isArray(a.params))
                ? a.params : {};
            const test = wireBool(a.test);
            const hasBench = a.bench === true;
            const hasCard = typeof a.card === 'string' && a.card !== '';
            const hasFlow = typeof a.flow === 'string' && a.flow !== '';
            const hasStage = typeof a.stage === 'string' && a.stage !== '';
            const modes = [hasBench, hasCard, hasFlow, hasStage].filter(Boolean).length;
            // THE UNKNOWN-ARG VOICE (029's self-critique #1, 2026-09-24 +
            // W-1, 2026-11-05): a card param at FLOW top-level (qvoice_save
            // beside card) used to drop SILENTLY — the bag only spreads
            // known keys — and the maker paid a generic missing-params
            // refusal instead of the pointed one. Unknown top-level keys
            // refuse HERE, naming the seat (card params ride INSIDE
            // params) — and the deleted ad-hoc arms (stages, connects, id,
            // description) refuse HERE too, in tombstone words, BEFORE the
            // exactly-one gate (so a bare {stages:[...]} names its cure
            // instead of reading as nothing-selected).
            const KNOWN_FLOW_ARGS = ['bench', 'card', 'model', 'flow', 'prompt', 'params', 'test', 'stage'];
            const known = new Set(KNOWN_FLOW_ARGS);
            const stray = Object.keys(args).filter((k) => !known.has(k));
            if (stray.length > 0) {
                return jsonClean({ mode: 'flow', target: '', error: 'unknown melite_flow arg(s) ' + JSON.stringify(stray) + ' — ad-hoc stages are gone (W-1, 2026-11-05: a hand-built graph landed on the shared bench and replaced its stages); press ONE seated bench row with stage: "<bench stage id>"; card params (text, voice_name, qvoice, variant, …) ride INSIDE params, never top-level; top-level carries only bench | card (+model) | flow | stage (+params/prompt/test)' });
            }
            /* The two guards below carry mode/target: the declared
             * output.schema requires them, and a bare {error} here died at
             * the tool-call validation layer — the schema error ("missing
             * value.mode/target") reached the agent INSTEAD of the guard's
             * own voice (the af-move2 commission's "harness bug",
             * 2026-10-09 — three masked diagnostics in one run). mode
             * 'flow' + target '' name nothing-selected, the same voice the
             * hasFlow guard uses. */
            if (modes === 0) {
                return jsonClean({ mode: 'flow', target: '', error: 'one composition is required: bench (run what is there) | card (+model) | flow | stage (one bench stage alone)' });
            }
            if (modes > 1) {
                return jsonClean({ mode: 'flow', target: '', error: 'exactly one composition per call: bench | card | flow | stage — never combined' });
            }
            // THE ONE-BENCH LAW (§22, 2026-09-22): flow lands on the
            // CALLER's conversation bench (benchKeyOfExec — the agent's own
            // session), never the hardcoded main — construct binds the same
            // key, so the composed tiles and the executed pipeline are one
            // bench. Unattributed seats (no agent id) fall back to main,
            // exactly like construct's benchKeyOf fallback.
            const bench = benchKeyOfExec(exec);
            try {
                if (hasStage) {
                    return jsonClean(await runStage(estate, {
                        stage: a.stage, test, bench,
                    }, exec.signal));
                }
                if (hasBench) {
                    return jsonClean(await runBench(estate, { test, bench }, exec.signal));
                }
                if (hasFlow) {
                    return jsonClean(await runTemplate(estate, {
                        flow: a.flow, params: bag, test, bench,
                    }, exec.signal));
                }
                // the exactly-one gate above leaves only {card} here — the
                // three prior arms returned (exactly-one is enforced above,
                // never the schema; 2026-09-12).
                return jsonClean(await runSingle(estate, {
                    card: a.card,
                    model: typeof a.model === 'string' ? a.model : '',
                    prompt: typeof a.prompt === 'string' ? a.prompt : undefined,
                    params: bag, test, bench,
                }, exec.signal));
            }
            catch (e) {
                const re = remoteErrorOf(e);
                if (re !== null && re !== undefined) {
                    // Ledger row 11: the refusal echoes mode/target (the fields the
                    // schema requires of EVERY shape — comfy-manage's ok/action
                    // pattern) so a careful refusal never fails output validation.
                    // BENCH-ONLY (2026-09-12): the sole RemoteError escaping to this
                    // catch is runBench's bench GET — runSingle/runTemplate
                    // convert every remote refusal to an {error} value inside
                    // (loadBench try/catch, startRun's remote arm); non-remote
                    // errors rethrow below. The old flow/card mapping was dead
                    // here and mislabeled bench failures — the refusal rides
                    // bench's own mode/target (a real mislabel, fixed minimally).
                    return jsonClean({ error: re.message || 'remote refused', mode: 'bench', target: benchDraftIdOf(bench) });
                }
                throw e;
            }
        },
    });
    // (§7 P7: the presenter rides defineTool validation — no second,
    // ungated seat over the gate. The tool-presentation wall pins the
    // gated face.)
    return def;
}
//# sourceMappingURL=melite-flow.js.map
