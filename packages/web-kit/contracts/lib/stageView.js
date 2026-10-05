function recordOf(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value
        : {};
}
function nonEmptyString(value) {
    return typeof value === 'string' && value !== '' ? value : '';
}
function stringsOf(value) {
    return Array.isArray(value)
        ? value.filter((entry) => typeof entry === 'string' && entry !== '')
        : [];
}
/** THE STATUS FOLD — the one owner of "what does this raw status word
 *  mean" (2026-10-13, the card-UI duplication audit: five seats folded
 *  the same words privately and disagreed — 'cached' rendered as `done`
 *  in one and a failure-looking `stopped` in another, and a stage the
 *  estate settles as 'completed' matched no branch at all in one of
 *  them). Every seat asks THIS. */
export function statusOf(value) {
    switch (value.toLowerCase()) {
        case 'done':
        case 'completed':
        case 'succeeded':
        // the FILE-ERA words a pre-lifecycle sidecar carries. The fold is
        // the ONE classifier, so it must know every word a seat can be
        // handed — collapsing a seat onto it while it was still missing
        // these is how 'success' silently became 'running' (the tile map
        // used to know them; the observer's tests caught the loss).
        case 'success':
            return 'done';
        case 'failed':
        case 'error':
            return 'error';
        // THE ESTATE'S OWN TERMINALS (the vocabulary audit, 2026-10-01):
        // 'stopped' is a member of RunStatus (estate-queue/src/
        // runsTypes.ts), 'interrupted' of the backend's RUN_STATUSES
        // (catalog/src/runStatusContract.ts) — both previously fell to the
        // default and folded to 'pending', so the fold's two halves
        // DISAGREED (isTerminalStatus('stopped') was true while
        // statusOf('stopped') said waiting). A deliberate or outside-force
        // end is its own terminal: not a success, not the run's own
        // failure. 'unknown' folds here too — terminal truth whose outcome
        // is unreadable.
        case 'stopped':
        case 'interrupted':
        case 'unknown':
            return 'stopped';
        // wind-down is live: the process is still ending
        case 'stopping':
            return 'running';
        case 'running':
        case 'live':
            return 'running';
        // the estate's queued-for-start stage word (runsStart stamps every
        // stage 'pending' at run creation) is LIVE — isLiveRunStatus says
        // so — so the fold agrees: it renders the waiting face ('queued'),
        // never the no-information home. Before this case the two halves
        // of the owner disagreed on the same word: the reconciler armed a
        // probe while the row showed never-ran (audit 185d8565's R1).
        case 'pending':
        case 'queued':
        // 'ready' is FlowStatus's "all stages have params, awaiting run"
        // (FlowTypes.ts) — the word the bench document stamps at birth
        // (estate/drafts/src/bench.ts). It is the waiting face, exactly
        // like 'pending'; it is a real word, not the dead sentinel the
        // bench-row comment once claimed.
        case 'ready':
            return 'queued';
        case 'stale':
            return 'stale';
        case 'cached':
            return 'cached';
        case 'skipped':
            return 'skipped';
        case 'reused':
            return 'reused';
        // ABSENCE is not a word: the EMPTY string is a seat saying "no
        // information", and the no-information home is the same face. It
        // is spelled as a case so the refusal below stays about UNKNOWN
        // WORDS — a whitespace-only string is a word-shaped value, not
        // absence, and refuses like any other stranger (the view-side
        // read below folds it for the seats that render).
        case '':
            return 'pending';
        // THE REFUSAL (operator decision 2026-10-12): a word outside the
        // vocabulary fails loud here, exactly as readRunStatus already
        // fails loud at the read door — the fold must never launder an
        // unrecognized word into 'pending' and render it as a stage that is
        // merely waiting. The message names the word and points at the one
        // vocabulary owner.
        default: {
            const known = [...RUN_STATUS_WORDS].join(', ');
            throw new Error(`statusOf: unknown run-status word ${JSON.stringify(value)} — the vocabulary is RUN_STATUS_WORDS (${known}); add the word to the fold and the set together, never fold garbage to 'pending'`);
        }
    }
}
/** THE TERMINAL JUDGEMENT — the other half of the same question ("is
 *  this run finished?"), which five seats also spelled privately with
 *  DISAGREEMENT: one set treated `unknown` as terminal and `error` as
 *  live, the other the reverse, so a run in either word never stopped
 *  a poller on one plane. The estate's own vocabulary is the node
 *  truth (`RunStatus = queued|running|completed|failed|stopped|
 *  stopping`, estate-queue/src/runsTypes.ts); `error` and `unknown`
 *  additionally ride the wire (melite-run-wire documents `error` as
 *  the run record's own failure stamp; runStatusContract lists
 *  `unknown` as a schema value), so both belong on the terminal side
 *  here. */
export function isTerminalStatus(value) {
    return TERMINAL_RUN_STATUSES.has(value.toLowerCase());
}
/** The terminal word set, exported so a seat that needs to SHOW it
 *  (a poll's stop condition, a doc) reads the same list. Reconciled
 *  with the backend's RUN_STATUSES (catalog/src/runStatusContract.ts)
 *  2026-10-01: `interrupted` joined, and the file-era done words
 *  (`succeeded`, `success`) became terminal — a poller handed either
 *  previously ran to its ceiling. The card-plane words (done, cached,
 *  reused, skipped, stale) stay out: runs are never stamped with
 *  them; they describe artifacts, not run lifecycle. */
export const TERMINAL_RUN_STATUSES = new Set([
    'completed', 'failed', 'stopped', 'error', 'unknown',
    'interrupted', 'succeeded', 'success',
]);
/** THE LIVE JUDGEMENT — the third question seats spelled privately
 *  ({running,queued} in one file, {running,queued,pending} in another,
 *  both omitting the wire's `live` and the estate's `stopping`): is
 *  this word a run still in motion? LIVE words are the KNOWN live
 *  vocabulary only — an unrecognized word is NOT live (spinning on a
 *  word we cannot read is a fake state; every private set this
 *  replaces already excluded strangers). Pollers that must keep
 *  watching unknown words read !isTerminalStatus, not this. */
const LIVE_RUN_STATUSES = new Set([
    'running', 'live', 'stopping', 'queued', 'pending',
]);
export function isLiveRunStatus(value) {
    return !isTerminalStatus(value) && LIVE_RUN_STATUSES.has(value.toLowerCase());
}
/** The fold's whole input domain — every run-level word `statusOf` and
 * the terminal/live judgements branch on, in ONE list. Boundary readers
 * (readRunStatus) throw on words outside it: garbage must fail loud at
 * the read, never fold to 'pending' or pass through raw (the
 * schema-strictness audit's fix 3, 2026-10-01). Kept in lockstep with
 * statusOf's case list by the walls spec (a word in one and not the
 * other fails the test). */
export const RUN_STATUS_WORDS = new Set([
    'done', 'completed', 'succeeded', 'success',
    'failed', 'error',
    'stopped', 'interrupted', 'unknown',
    'stopping', 'running', 'live',
    'pending', 'queued', 'ready',
    'stale', 'cached', 'skipped', 'reused',
]);
/** THE VIEW-SIDE READ (the shared seam, 2026-10-12): a projection
 *  answers "what should this row show", and a word outside the
 *  vocabulary has no answer to show — it is the no-information home,
 *  not a crash. `statusOf` above stays the strict classifier (it
 *  refuses, because a caller asking it for a classification deserves
 *  the truth); every view seat reads through THIS so the membership
 *  law lives once instead of per seat. Absence ('') folds the same
 *  way, which is why it needs no case of its own downstream. */
export function statusOrPendingOf(value) {
    return RUN_STATUS_WORDS.has(value.toLowerCase()) ? statusOf(value) : 'pending';
}
function galleryOf(value) {
    if (!Array.isArray(value))
        return undefined;
    const gallery = value.flatMap((entry) => {
        const row = recordOf(entry);
        const name = nonEmptyString(row['name']);
        const url = nonEmptyString(row['url']);
        return name !== '' && url !== '' ? [{ name, url }] : [];
    });
    return gallery.length > 0 ? gallery : undefined;
}
function previewsOf(value) {
    if (!Array.isArray(value))
        return undefined;
    const previews = value.flatMap((entry) => {
        const row = recordOf(entry);
        const label = nonEmptyString(row['label']);
        const artifact = nonEmptyString(row['artifact']);
        const url = row['url'] === null || typeof row['url'] === 'string'
            ? row['url']
            : null;
        return label !== '' && artifact !== '' ? [{ label, url, artifact }] : [];
    });
    return previews.length > 0 ? previews : undefined;
}
export function cardResultFromRecord(value) {
    const result = recordOf(value);
    const artifacts = {};
    for (const [name, url] of Object.entries(recordOf(result['artifacts']))) {
        const clean = nonEmptyString(url);
        if (clean !== '')
            artifacts[name] = clean;
    }
    const assetUrls = stringsOf(result['assetUrls']);
    const metadata = recordOf(result['metadata']);
    if (Object.keys(artifacts).length === 0 && assetUrls.length === 0)
        return null;
    return {
        artifacts,
        assetUrls,
        metadata,
        ...(typeof result['durationSec'] === 'number' ? { durationSec: result['durationSec'] } : {}),
        ...(galleryOf(result['gallery']) === undefined ? {} : { gallery: galleryOf(result['gallery']) }),
        ...(previewsOf(result['motionPreviews']) === undefined ? {} : { motionPreviews: previewsOf(result['motionPreviews']) }),
    };
}
function inputBindingsOf(value) {
    const bindings = [];
    for (const [slot, raw] of Object.entries(recordOf(value))) {
        const ref = recordOf(raw);
        const stage = nonEmptyString(ref['stage']);
        if (stage !== '') {
            const output = nonEmptyString(ref['output']);
            bindings.push({
                slot,
                source: output === '' ? { stage } : { stage, output },
            });
        }
        else if (typeof ref['initial'] === 'string') {
            bindings.push({ slot, source: { initial: true } });
        }
    }
    return bindings;
}
export function projectStageView(owner, options = {}) {
    const row = owner.row;
    const resolved = recordOf(row['resolved']);
    const rowParams = recordOf(row['params']);
    const params = owner.effective?.params ?? rowParams;
    const card = nonEmptyString(row['card']) || owner.cardName;
    const kind = options.kind ?? (card || 'stage');
    const service = options.service ?? (nonEmptyString(row['service']) || kind);
    const model = nonEmptyString(owner.effective?.model)
        || nonEmptyString(resolved['model'])
        || nonEmptyString(row['model'])
        || nonEmptyString(params['model'])
        || service;
    const inputSlots = (owner.effective?.inputSlots ?? []).filter((slot) => typeof slot === 'string' && slot !== '');
    const inputBindings = inputBindingsOf(row['inputs']);
    const inputs = inputBindings.flatMap((binding) => 'stage' in binding.source ? [binding.source.stage] : []);
    const inputOutputs = inputBindings.map((binding) => 'stage' in binding.source ? binding.source.output ?? null : null);
    const priorStageIds = owner.priorStageIds ?? owner.upstream.map((stage) => stage.id);
    const inputIndices = inputs.map((id) => priorStageIds.indexOf(id));
    const result = cardResultFromRecord(row['result']);
    const harvested = options.result === undefined ? result : options.result(row, result);
    const resultRecord = recordOf(row['result']);
    const metadata = recordOf(harvested?.metadata);
    const error = nonEmptyString(row['error'])
        || nonEmptyString(resultRecord['error'])
        || nonEmptyString(metadata['error']);
    const runId = owner.runId
        || nonEmptyString(row['runId'])
        || nonEmptyString(resultRecord['runId'])
        || nonEmptyString(resultRecord['run_id'])
        || nonEmptyString(metadata['runId'])
        || null;
    const tags = Array.isArray(row['tags'])
        ? row['tags'].filter((tag) => tag === 'ai_generated')
        : undefined;
    return {
        id: owner.stageId,
        title: nonEmptyString(row['title']) || card || owner.stageId,
        kind,
        service,
        model,
        ...(options.genre === undefined ? {} : { genre: options.genre }),
        ...(tags === undefined ? {} : { tags }),
        params,
        ...(inputSlots.length === 0 ? {} : { inputSlots }),
        ...(inputBindings.length === 0 ? {} : { inputBindings }),
        inputs,
        ...(inputOutputs.length === 0 ? {} : { inputOutputs }),
        inputIndices,
        result: harvested,
        ...(Array.isArray(row['history']) ? { history: row['history'] } : {}),
        status: statusOrPendingOf(owner.runStatus),
        ...(error === '' ? {} : { error }),
        runId,
        ...(typeof row['saveToAssets'] === 'boolean' ? { saveToAssets: row['saveToAssets'] } : {}),
    };
}
export function projectUpstreamStages(owner, options = {}) {
    return owner.upstream.map((upstream) => ({
        id: upstream.id,
        title: upstream.title,
        kind: options.kind ?? 'image',
        service: options.service ?? '',
        genre: options.genre ?? 'image',
        params: {},
        inputs: [],
        inputIndices: [],
        result: {
            artifacts: upstream.title === '' ? {} : { [upstream.title]: upstream.url },
            assetUrls: upstream.url === '' ? [] : [upstream.url],
            metadata: {},
        },
        status: 'done',
    }));
}
//# sourceMappingURL=stageView.js.map
