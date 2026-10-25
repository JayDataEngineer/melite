import { CARD_PLANE_ENGINE } from '@melite/contracts/benchStage';
import { deadline, TimeoutReason } from '@deepseek-ai/dsh-timeout';
/** Narrow the seat-bound request to the canonical EstateCall the card
 * tool builders receive: the seats demand a caller signal (trySeats'
 * throwIfAborted), so a signalless call fails HERE with a named error
 * instead of deep inside the lane as a TypeError (2026-09-12). */
export function asEstateCall(request) {
    return (method, path, body, signal, timeoutMs) => {
        if (signal === undefined) {
            throw new Error(`estate call ${method} ${path} arrived without a caller signal (the seats require cancellation)`);
        }
        return request(method, path, body, signal, timeoutMs);
    };
}
/** The estate row's Context-merged seats, probed lazily off a host.
 *  OPTIONAL-dependency probes: ctx.get returns undefined when no
 *  provider is loaded (the tutorial's pattern) — a seatless lane
 *  then falls to the LOUD no-remote refusal. The getters re-probe per
 *  access: a seat that mounts/unmounts mid-call reads as such, never
 *  as a stale handle. */
function seatsOf(host) {
    return {
        get draftsRemote() { return host.get('draftsRemote'); },
        get benchRemote() { return host.get('benchRemote'); },
        get runs() { return host.get('runs'); },
        get disclose() { return host.get('disclose'); },
        get manage() { return host.get('manage'); },
        get skills() { return host.get('meliteSkills'); },
        get load() { return host.get('load'); },
        get queue() { return host.get('queue'); },
    };
}
/** Route one KV/runs lane to its seat; undefined = no seat / no match. */
async function trySeats(ctx, method, path, body, signal) {
    const seats = seatsOf(ctx);
    signal.throwIfAborted();
    if (method === 'GET' && path === '/v1/flows/drafts') {
        if (seats.draftsRemote === undefined)
            return undefined;
        return seats.draftsRemote.list(signal);
    }
    let m = /^\/v1\/flows\/drafts\/([^/?]+)$/.exec(path);
    if (method === 'GET' && m !== null) {
        if (seats.draftsRemote === undefined)
            return undefined;
        return seats.draftsRemote.get(decodeURIComponent(m[1]), signal);
    }
    // ── THE 1:1 FLOW PORT LANES (2026-09-11: the old editor's card
    // system rides the DSH plugin; these arms are its HTTP face) ──
    // The card COMPOSE (cardBirth.ts): the start body verbatim → a
    // bench-backed draft (the CARD BIRTH LAW: the start rides a
    // doc-backed draft_id). CAS law = the queue lane's own: read the
    // bench first, expect_rev rides, a fresh bench births.
    if (method === 'POST' && path === '/v1/flows/drafts') {
        return cardComposeLane(ctx, seats, body, signal);
    }
    // The STAGE wire PATCH (params edits + result persistence — the
    // 2022-08-22 wire PATCH + resultOutbox's result rows).
    m = /^\/v1\/flows\/drafts\/([^/?]+)\/stages\/([^/?]+)(?:\/result)?$/.exec(path);
    if (method === 'PATCH' && m !== null) {
        if (seats.draftsRemote === undefined)
            return undefined;
        if (body === undefined || typeof body !== 'object' || body === null) {
            throw new Error('draft stage patch needs a JSON body');
        }
        // expectRev NULL + signal in its own slot (the same seat law the
        // typed lane obeys — the drift that killed every attribution
        // stamp once lived on BOTH faces of this seam).
        return seats.draftsRemote.patch(decodeURIComponent(m[1]), decodeURIComponent(m[2]), body, null, signal);
    }
    if (method === 'POST' && path === '/v1/bench/ensure') {
        if (seats.benchRemote === undefined)
            return undefined;
        if (body === undefined || typeof body !== 'object' || body === null) {
            throw new Error('bench ensure needs a JSON body');
        }
        return seats.benchRemote.ensure(body, signal);
    }
    m = /^\/v1\/bench\/([^/?]+)$/.exec(path);
    if (method === 'GET' && m !== null) {
        if (seats.benchRemote === undefined)
            return undefined;
        return seats.benchRemote.get(decodeURIComponent(m[1]), signal);
    }
    // The bench's mutation arms (REBUILD-4): /v1/bench/:session/<verb>
    // routes to the matching seat method (the door's URL grammar is
    // the tools' lane grammar — the remote methods are 1:1 beneath).
    if (method === 'POST') {
        // "clear" (2026-10-10, the operator's demanded clear-all) — the
        // nuclear arm: every stage out, one log entry, undoable whole.
        const arm = /^\/v1\/bench\/([^/?]+)\/(patch|add_stage|add_stages|remove_stage|clear|rewire|undo)$/.exec(path);
        if (arm !== null) {
            if (seats.benchRemote === undefined)
                return undefined;
            if (body === undefined || typeof body !== 'object' || body === null) {
                throw new Error(`bench ${arm[2]} needs a JSON body`);
            }
            const session = decodeURIComponent(arm[1]);
            const doc = body;
            switch (arm[2]) {
                case 'patch': return seats.benchRemote.patch(session, doc, signal);
                case 'add_stage': return seats.benchRemote.addStage(session, doc, signal);
                case 'add_stages': return seats.benchRemote.addStages(session, doc, signal);
                case 'remove_stage': return seats.benchRemote.removeStage(session, doc, signal);
                case 'clear': return seats.benchRemote.clear(session, doc, signal);
                case 'rewire': return seats.benchRemote.rewire(session, doc, signal);
                case 'undo': return seats.benchRemote.undo(session, doc, signal);
                default: {
                    // CLOSED UNION, LOUD END (cordis-architecture F6, 2026-10-20):
                    // the regex group admits six arms and six arms only — a
                    // seventh added to the pattern without its seat here fails
                    // LOUD at the first call, never by falling through the
                    // match block unanswered.
                    /* v8 ignore next 2 -- the regex group admits exactly the six cased arms; no honest input reaches the throw (2026-10-20) */
                    const exhaustive = arm[2];
                    throw new Error(`bench arm ${String(exhaustive)} matched its pattern but has no seat`);
                }
            }
        }
    }
    // THE FLOW CONTRACTS (2026-10-04): GET /v1/flows answers every
    // registry flow with its declared stages/inputs/outputs/tool — the
    // machine-readable door a programmatic caller reads to learn what a
    // named flow takes. Placed BEFORE the runs lanes: every arm below
    // matches a trailing segment, so the exact path is free, and the
    // contract read precedes any submit (discover, then run).
    if (method === 'GET' && path === '/v1/flows') {
        if (seats.disclose === undefined)
            return undefined;
        return seats.disclose.contracts();
    }
    // The validate lane (REBUILD-8): the pure compile over the runs
    // seat — the door's arm order lives in the registry.
    if (method === 'POST' && path === '/v1/flows/validate') {
        if (seats.runs === undefined)
            return undefined;
        return seats.runs.validate(body, signal);
    }
    // The runs plane's lanes (REBUILD-6): the flowsRun door arms over
    // the registry seat — submit, live status (with the log tail on
    // ?include_log), stop receipt.
    if (method === 'POST' && path === '/v1/flows/start') {
        if (seats.runs === undefined)
            return undefined;
        return seats.runs.start(body, signal);
    }
    m = /^\/v1\/flows\/status\/([^/?]+)(?:\?([^/]*))?$/.exec(path);
    if (method === 'GET' && m !== null) {
        if (seats.runs === undefined)
            return undefined;
        // String.split always yields a [0] (even ''.split('&') is ['']),
        // so no ?? is needed — the null arm below is the no-query case only.
        const first = m[2] === undefined ? null : m[2].split('&')[0];
        const flagValue = first === null ? '' : first.split('=')[1] ?? '';
        const includeLog = ['1', 'true', 'yes'].includes(decodeURIComponent(flagValue).toLowerCase());
        return seats.runs.status(decodeURIComponent(m[1]), signal, includeLog);
    }
    m = /^\/v1\/flows\/stop\/([^/?]+)$/.exec(path);
    if (method === 'POST' && m !== null) {
        if (seats.runs === undefined)
            return undefined;
        return seats.runs.stop(decodeURIComponent(m[1]), signal);
    }
    m = /^\/v1\/flows\/runs(?:\/|$|\?)/.exec(path);
    if (method === 'GET' && m !== null && path !== '/v1/flows/runs/') {
        if (seats.runs === undefined)
            return undefined;
        // The RAW limit string rides (int() semantics: underscores
        // parse, junk refuses LOUD — the door's text, never NaN).
        const lim = /(?:^|[?&])limit=([^&]*)/.exec(path);
        return seats.runs.list(lim !== null ? decodeURIComponent(lim[1]) : '200', signal);
    }
    // The disclose lane (REBUILD-14): Melite discover over both
    // planes — the seat derives rows LIVE (the flows registry + the
    // primed card registry). The query string rides the door's own
    // params (lookup / q / tags).
    m = /^\/v1\/discover(?:\?([^/]*))?$/.exec(path);
    if (method === 'GET' && m !== null) {
        if (seats.disclose === undefined)
            return undefined;
        const qs = new URLSearchParams(m[1] ?? '');
        return seats.disclose.discover(qs.get('lookup') ?? 'all', qs.get('q') ?? '', qs.get('tags') ?? '');
    }
    // The manage lane (REBUILD-15): the management plane over the
    // seat — the body IS the door's {action, ...} doc; a refused
    // envelope throws manage/refused carrying it.
    if (method === 'POST' && path === '/v1/manage') {
        if (seats.manage === undefined)
            return undefined;
        return seats.manage.act(body, signal);
    }
    // The skills lanes (REBUILD-16): the index + the doc read over
    // the skills seat.
    if (method === 'GET' && path === '/v1/skills') {
        if (seats.skills === undefined)
            return undefined;
        return seats.skills.index();
    }
    m = /^\/v1\/skills\/([^/?]+)$/.exec(path);
    if (method === 'GET' && m !== null) {
        if (seats.skills === undefined)
            return undefined;
        return seats.skills.read(decodeURIComponent(m[1]), signal);
    }
    // The load lane (REBUILD-17): Melite load over the load seat —
    // the query string rides the door's own params (inference_type /
    // name).
    m = /^\/v1\/load(?:\?([^/]*))?$/.exec(path);
    if (method === 'GET' && m !== null) {
        if (seats.load === undefined)
            return undefined;
        const qs = new URLSearchParams(m[1] ?? '');
        return seats.load.load(qs.get('inference_type') ?? '', qs.get('name') ?? '');
    }
    // The ledger lane (REBUILD-19): the journal tail over the queue
    // seat — the door's parameter law rides (garbage limit -> 50,
    // never a 400). A SEATLESS queue reads as an EMPTY tail (the
    // journal is optional infra for web profiles; the gateway lane
    // fallback died 2026-09-10 and a hard refusal here surfaced as a
    // crash-toast over every seatless profile's card bench while the
    // mesh viewport itself kept rendering). A MOUNTED seat that
    // throws still propagates — only absence degrades.
    m = /^\/v1\/ledger(?:\?([^/]*))?$/.exec(path);
    if (method === 'GET' && m !== null) {
        if (seats.queue === undefined)
            return [];
        const qs = new URLSearchParams(m[1] ?? '');
        return seats.queue.ledger(qs.get('limit') ?? '50', qs.get('event') ?? '');
    }
    return undefined;
}
/** THE CARD COMPOSE LANE — the start body verbatim → a bench-backed
 *  draft (the CARD BIRTH LAW: the start rides a doc-backed draft_id).
 *  CAS law = the queue lane's own: read the bench first, expect_rev
 *  rides, a fresh bench births. ONE implementation served by BOTH
 *  faces (F-1, 2026-11-05): the URL router's POST /v1/flows/drafts
 *  arm and the typed Estate.cardCompose — the browser face keeps its
 *  grammar, the tool plane keeps the behavior, neither re-answers
 *  the CAS question. */
async function cardComposeLane(host, seats, body, signal) {
    if (seats.benchRemote === undefined) {
        seatlessRefusal(host, 'POST /v1/flows/drafts', BENCH_LANE.family, BENCH_LANE.probeNames);
    }
    if (body === undefined || typeof body !== 'object' || body === null) {
        throw new Error('card compose needs a JSON body');
    }
    const bag = body;
    const intentSrc = typeof bag['prompt'] === 'string' && bag['prompt'] !== ''
        ? bag['prompt']
        : typeof bag['intent'] === 'string' ? bag['intent'] : 'card';
    // NOTE (2026-09-25, the fabrication finding): intent stays the
    // IDENTITY key verbatim (the studio consult keys cardName off
    // it — never the prompt, never a label); the tool-mint
    // provenance rides bench_snapshot.bench_head instead (the
    // bench's own log head, stamped by runsStart).
    const intent = intentSrc.length > 80 ? intentSrc.slice(0, 77) + '…' : intentSrc;
    const params = { ...(bag['params'] ?? {}) };
    if (typeof bag['prompt'] === 'string' && bag['prompt'] !== '')
        params['prompt'] = bag['prompt'];
    const ensure = {
        session: 'default',
        intent,
        stages: [{ id: 's_0', engine: CARD_PLANE_ENGINE, params }],
        // THE TOOL-BENCH OWNERSHIP LAW (2026-09-22, the maker jam):
        // this lane is the SOLE writer of the 'default' scope — the
        // wholesale replace of our own prior one-shot mint IS the
        // owner-confirming overwrite the bench law (2026-09-15) wants
        // said out loud. Omitting it wedged every render tool behind
        // a bench/overwrite-required refusal no tool schema could
        // utter (the end-to-end agent test, live receipt seq 4-7).
        overwrite: true,
    };
    const bench = seats.benchRemote;
    const cur = await bench.get('default', signal);
    if (cur !== undefined && typeof cur['rev'] === 'number')
        ensure['expect_rev'] = cur['rev'];
    // CAS RETRY (one): a concurrent tool mint moved the rev between
    // our read and our ensure — re-read, retry once. The replace is
    // idempotent under ownership; any other refusal propagates loud.
    const conflict = (e) => typeof e?.code === 'string' &&
        e.code === 'bench/cas-conflict';
    let row;
    try {
        row = await bench.ensure(ensure, signal);
    }
    catch (first) {
        if (!conflict(first))
            throw first;
        const fresh = await bench.get('default', signal);
        if (fresh !== undefined && typeof fresh['rev'] === 'number')
            ensure['expect_rev'] = fresh['rev'];
        row = await bench.ensure(ensure, signal);
    }
    if (row === undefined || typeof row['draft_id'] !== 'string') {
        throw new Error('card compose returned no draft_id — refusing to start cardless');
    }
    return { draftId: row['draft_id'] };
}
export function seatFamilyForPath(path) {
    if (path.startsWith('/v1/flows/drafts') || path.startsWith('/v1/bench/')) {
        return { family: 'bench plane (draftsRemote/benchRemote seats)', probeNames: ['draftsRemote', 'benchRemote'] };
    }
    if (path.startsWith('/v1/flows/'))
        return { family: 'live-run registry (the runs seat)', probeNames: ['runs'] };
    // '/v1/bench/ensure' is the session-opener every chat client
    // hits first; the bare path is not walked (estateLane names full
    // lanes only) — route it to the bench family so the vocabulary
    // never answers 'unknown' for a documented door (the 2026-11-12
    // prober-families audit's F2: '/v1/flows' + '/v1/bench' exacts
    // went 'unknown' while real doors served them).
    if (path === "/v1/bench" || path === "/v1/bench/ensure") {
        return { family: 'bench plane (draftsRemote/benchRemote seats)', probeNames: ['draftsRemote', 'benchRemote'] };
    }
    if (path === "/v1/flows") {
        return { family: 'flow contracts (the disclose seat)', probeNames: ['disclose'] };
    }
    // '/v1/runs' is NOT a door (the runs list serves at GET
    // /v1/flows/runs) — but it is the URL every wedge-hunting prober
    // reaches for first, and 'unknown' sent the 2026-10-23 hunt down a
    // blind alley: answer the runs FAMILY and name the canonical door.
    if (path === '/v1/runs' || path.startsWith('/v1/runs/')) {
        return {
            family: RUNS_LANE.family,
            probeNames: [...RUNS_LANE.probeNames],
            notADoor: 'the list door is GET /v1/flows/runs',
        };
    }
    // Same class: the provisions plane's operations URL — name the
    // provisioning seat, never 'unknown'.
    if (path.startsWith('/v1/provision/')) {
        return {
            family: 'provisions seat (the provisioning service)',
            probeNames: ['provisioning'],
            // the router serves NO /v1/provision arm (verified 2026-11-12:
            // the only 'provision' mention in this file is this matcher) —
            // a not-a-door URL, not a seat portrait; the voice steers
            // without asserting an absence the live-seat probe may deny
            notADoor: 'the estate router serves no /v1/provision/* door — the provisioning service answers the queue plane, not this URL',
        };
    }
    if (path.startsWith('/v1/discover'))
        return { family: 'disclose', probeNames: ['disclose'] };
    if (path.startsWith('/v1/manage'))
        return { family: 'manage', probeNames: ['manage'] };
    if (path.startsWith('/v1/skills'))
        return { family: 'meliteSkills', probeNames: ['meliteSkills'] };
    if (path.startsWith('/v1/load'))
        return { family: 'load', probeNames: ['load'] };
    if (path.startsWith('/v1/ledger'))
        return { family: 'queue', probeNames: ['queue'] };
    return { family: 'unknown', probeNames: [] };
}
/** Build the tools' request: seats only, in-process. A lane with no
 *  seat for the path is a hard error — but the error must be an
 *  AGENT-USABLE refusal (F-8): name the family the path needs, the
 *  seats that ARE live, the pin that mounts the queue plane, and the
 *  chat-lane exit. The old voice ("the gateway lane fallback died
 *  2026-09-10 — migrate to a named Typert remote") read as a broken
 *  registry and sent an agent hunting doors for an hour. */
export function makeEstateRequest(ctx) {
    // (the ledger's seam drift, cured 2026-10-10: the TYPE promised a
    // timeoutMs the implementation silently dropped — callers passed
    // 120_000 and the seat path could hang forever where the engine
    // path (its own AbortSignal.timeout) never would. The bound is now
    // RACED, not dropped: a seat call that outlives it rejects with a
    // named error, the same law the direct fetch lives under. Since
    // the dry-sweep's J8 the race rides dsh-timeout's deadline() (the
    // owned primitive) — timer-only: the caller's signal stays with
    // the seat work, which owns its own cancellation. The fused form
    // lost the doors wall (a caller that goes away must settle from
    // the WORK, never a fabricated refusal) and was rolled back.)
    return (method, path, body, execSignal, timeoutMs) => {
        const work = performEstateRequest(ctx, method, path, body, execSignal);
        return withEstateBound(work, `${method} ${path}`, timeoutMs);
    };
}
/** The wall-clock bound, RACED not dropped (the seam-drift cure,
 *  2026-10-10). deadline()'s signal aborts with a TimeoutReason at
 *  the bound; the translation keeps the pinned voice verbatim (J8:
 *  the race rides the owned primitive, the semantics stay RACED).
 *  The caller's signal is deliberately NOT fused — the seat work
 *  owns its own cancellation (doors.spec pins the caller-gone arm:
 *  the response settles from the WORK, never a fabricated refusal),
 *  so the race's only business is the bound. `sp` is the
 *  request's own spelling of the lane ('METHOD /v1/path') — the
 *  bound refusal names it so the agent sees WHICH call hung. */
function withEstateBound(work, sp, timeoutMs) {
    if (timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0)
        return work;
    const bound = deadline(undefined, timeoutMs, 'ESTATE_TIMEOUT');
    const refused = new Promise((_, reject) => {
        bound.signal.addEventListener('abort', () => {
            const reason = bound.signal.reason;
            if (reason instanceof TimeoutReason) {
                reject(new Error(`estate request ${sp} outlived its ${String(timeoutMs)}ms bound`));
                return;
            }
            reject(reason instanceof Error ? reason : new Error('estate request cancelled'));
        }, { once: true });
    });
    return Promise.race([work, refused]).finally(() => { bound[Symbol.dispose](); });
}
/** The AGENT-USABLE no-seat refusal (F-8's voice) — ONE builder for
 *  both faces (F-1, 2026-11-05): name the family the lane needs, the
 *  seats that ARE live, the pin that mounts the queue plane, and the
 *  chat-lane exit. `sp` is the request's own spelling of the lane —
 *  the URL router passes 'METHOD /path' verbatim, the typed lanes
 *  pass their canonical spelling, and the text reads the same. */
function seatlessRefusal(host, sp, family, probeNames) {
    const live = [];
    for (const n of probeNames) {
        try {
            if (host.get(n) !== undefined)
                live.push(n);
        }
        catch {
            /* a throwing probe reads as absent — absence is the only story */
        }
    }
    const liveVoice = live.length > 0
        ? `Live seats here: ${live.join(', ')}.`
        : `No seat of that family is mounted on this lane (ABSENCE, not a broken registry; nothing crashed).`;
    throw new Error(`no seat on this lane serves ${sp} — the ${family} is not mounted. `
        + `${liveVoice} `
        + `The queue-plane seats mount when the estate state root is pinned (the profile config's stateRoot / repoRoot fields). `
        + `On a chat lane, compose via melite_construct onto the shared bench instead of the raw flow doors.`);
}
/** The NOT-A-DOOR refusal (2026-11-12, the prober-families
 *  audit's F4): the URL is not something this lane serves — the
 *  voice names the seat's family and steers to the canonical door
 *  WITHOUT the seatless voice's absence clause ("…is not mounted"):
 *  on a healthy lane the seat IS mounted and only the URL is wrong
 *  (the old voice told the operator a live seat was absent). The
 *  pin sentence rides only when the live-seat probe answers empty —
 *  that is the one case where down-seat is the honest story. */
function notADoorRefusal(host, sp, family, probeNames, notADoor) {
    const live = [];
    for (const n of probeNames) {
        try {
            if (host.get(n) !== undefined)
                live.push(n);
        }
        catch {
            /* a throwing probe reads as absent — absence is the only story */
        }
    }
    const liveVoice = live.length > 0
        ? `Live seats here: ${live.join(', ')}. If the canonical door answers 502, the seat is down — then the queue-plane seats mount when the estate state root is pinned (the profile config's stateRoot / repoRoot fields).`
        : `No seat of that family is mounted on this lane (not a registry fault; nothing crashed). The queue-plane seats mount when the estate state root is pinned (the profile config's stateRoot / repoRoot fields).`;
    throw new Error(`no door on this lane serves ${sp} — ${notADoor} (the ${family}). `
        + `${liveVoice} `
        + `On a chat lane, compose via melite_construct onto the shared bench instead of the raw flow doors.`);
}
async function performEstateRequest(ctx, method, path, body, execSignal) {
    const viaSeats = await trySeats(ctx, method, path, body, execSignal);
    if (viaSeats !== undefined)
        return viaSeats;
    const { family, probeNames, notADoor } = seatFamilyForPath(path);
    if (notADoor !== undefined)
        notADoorRefusal(ctx, `${method} ${path}`, family, probeNames, notADoor);
    seatlessRefusal(ctx, `${method} ${path}`, family, probeNames);
}
/** Per-lane seat-family facts — the refusal names the family and
 *  probes ONLY its own names (the eager-sweep hang, live proof
 *  2026-09-22). The same rows seatFamilyForPath answers for the
 *  router; spelled per lane because the lanes ARE the families. */
const BENCH_LANE = { family: 'bench plane (draftsRemote/benchRemote seats)', probeNames: ['draftsRemote', 'benchRemote'] };
const RUNS_LANE = { family: 'live-run registry (the runs seat)', probeNames: ['runs'] };
const DISCLOSE_LANE = { family: 'disclose', probeNames: ['disclose'] };
const MANAGE_LANE = { family: 'manage', probeNames: ['manage'] };
const SKILLS_LANE = { family: 'meliteSkills', probeNames: ['meliteSkills'] };
const LOAD_LANE = { family: 'load', probeNames: ['load'] };
const QUEUE_LANE = { family: 'queue', probeNames: ['queue'] };
/** One typed lane: abort check → seat probe → the seat call → the
 *  seatless fall-through (a served `undefined` refuses, the router's
 *  exact law) → the wall-clock bound. `sp` is the lane's canonical
 *  spelling for the refusal/bound voices. */
async function estateLane(ctx, sp, laneFacts, serve, signal, timeoutMs) {
    signal.throwIfAborted();
    const seats = seatsOf(ctx);
    const work = (async () => {
        const out = await Promise.resolve(serve(seats, signal));
        if (out === undefined)
            seatlessRefusal(ctx, sp, laneFacts.family, laneFacts.probeNames);
        return out;
    })();
    return withEstateBound(work, sp, timeoutMs);
}
/** The typed lanes (see Estate). Same seats, same refusals, same
 *  bounds as the URL router — no second answering of any lane law. */
export function makeEstate(ctx) {
    const lane = (sp, facts, serve) => (signal, timeoutMs) => estateLane(ctx, sp, facts, serve, signal, timeoutMs);
    return {
        draftsList: lane('GET /v1/flows/drafts', BENCH_LANE, (s, signal) => s.draftsRemote === undefined ? undefined : s.draftsRemote.list(signal)),
        draftsGet: (draftId, signal, timeoutMs) => estateLane(ctx, `GET /v1/flows/drafts/${encodeURIComponent(draftId)}`, BENCH_LANE, (s) => s.draftsRemote === undefined ? undefined : s.draftsRemote.get(draftId, signal), signal, timeoutMs),
        draftsStagePatch: (draftId, stageId, patch, signal, timeoutMs) => estateLane(ctx, `PATCH /v1/flows/drafts/${encodeURIComponent(draftId)}/stages/${encodeURIComponent(stageId)}`, BENCH_LANE, 
        // expectRev NULL, signal in its own slot: the tool stamps
        // TELEMETRY (runStatus/result — the drafts door's telemetry
        // law never fences those keys), so no CAS rev is ever spent;
        // the signal must never ride expectRev's seat (the kill the
        // seat-signature wall guards).
        (s) => s.draftsRemote === undefined ? undefined : s.draftsRemote.patch(draftId, stageId, patch, null, signal), signal, timeoutMs),
        cardCompose: (body, signal, timeoutMs) => {
            signal.throwIfAborted();
            const work = cardComposeLane(ctx, seatsOf(ctx), body, signal);
            return withEstateBound(work, 'POST /v1/flows/drafts', timeoutMs);
        },
        benchGet: (session, signal, timeoutMs) => estateLane(ctx, `GET /v1/bench/${encodeURIComponent(session)}`, BENCH_LANE, (s) => s.benchRemote === undefined ? undefined : s.benchRemote.get(session, signal), signal, timeoutMs),
        benchEnsure: (doc, signal, timeoutMs) => estateLane(ctx, 'POST /v1/bench/ensure', BENCH_LANE, (s) => s.benchRemote === undefined ? undefined : s.benchRemote.ensure(doc, signal), signal, timeoutMs),
        benchVerb: (session, verb, doc, signal, timeoutMs) => estateLane(ctx, `POST /v1/bench/${encodeURIComponent(session)}/${verb}`, BENCH_LANE, (s) => {
            const bench = s.benchRemote;
            if (bench === undefined)
                return undefined;
            switch (verb) {
                case 'patch': return bench.patch(session, doc, signal);
                case 'add_stage': return bench.addStage(session, doc, signal);
                case 'add_stages': return bench.addStages(session, doc, signal);
                case 'remove_stage': return bench.removeStage(session, doc, signal);
                case 'clear': return bench.clear(session, doc, signal);
                case 'rewire': return bench.rewire(session, doc, signal);
                case 'undo': return bench.undo(session, doc, signal);
                default: {
                    // CLOSED UNION, LOUD END — same law as the router's arm.
                    /* v8 ignore next 2 -- BenchVerb admits exactly the six cased arms; no honest input reaches the throw */
                    const exhaustive = verb;
                    throw new Error(`bench arm ${String(exhaustive)} matched its pattern but has no seat`);
                }
            }
        }, signal, timeoutMs),
        runsValidate: (doc, signal, timeoutMs) => estateLane(ctx, 'POST /v1/flows/validate', RUNS_LANE, (s) => s.runs === undefined ? undefined : s.runs.validate(doc, signal), signal, timeoutMs),
        runsStart: (doc, signal, timeoutMs) => estateLane(ctx, 'POST /v1/flows/start', RUNS_LANE, (s) => s.runs === undefined ? undefined : s.runs.start(doc, signal), signal, timeoutMs),
        runsStatus: (runId, includeLog, signal, timeoutMs) => estateLane(ctx, `GET /v1/flows/status/${encodeURIComponent(runId)}`, RUNS_LANE, (s) => s.runs === undefined ? undefined : s.runs.status(runId, signal, includeLog), signal, timeoutMs),
        runsStop: (runId, signal, timeoutMs) => estateLane(ctx, `POST /v1/flows/stop/${encodeURIComponent(runId)}`, RUNS_LANE, (s) => s.runs === undefined ? undefined : s.runs.stop(runId, signal), signal, timeoutMs),
        runsList: (limit, signal, timeoutMs) => estateLane(ctx, `GET /v1/flows/runs?limit=${encodeURIComponent(limit)}`, RUNS_LANE, (s) => s.runs === undefined ? undefined : s.runs.list(limit, signal), signal, timeoutMs),
        discover: (lookup, q, tags, signal, timeoutMs) => estateLane(ctx, 'GET /v1/discover', DISCLOSE_LANE, (s) => s.disclose === undefined ? undefined : s.disclose.discover(lookup, q, tags), signal, timeoutMs),
        flowsContracts: lane('GET /v1/flows', DISCLOSE_LANE, (s) => s.disclose === undefined ? undefined : s.disclose.contracts()),
        manageAct: (doc, signal, timeoutMs) => estateLane(ctx, 'POST /v1/manage', MANAGE_LANE, (s) => s.manage === undefined ? undefined : s.manage.act(doc, signal), signal, timeoutMs),
        skillsIndex: lane('GET /v1/skills', SKILLS_LANE, (s) => s.skills === undefined ? undefined : s.skills.index()),
        skillRead: (id, signal, timeoutMs) => estateLane(ctx, `GET /v1/skills/${encodeURIComponent(id)}`, SKILLS_LANE, (s) => s.skills === undefined ? undefined : s.skills.read(id, signal), signal, timeoutMs),
        loadCard: (inferenceType, name, signal, timeoutMs) => estateLane(ctx, `GET /v1/load?inference_type=${encodeURIComponent(inferenceType)}&name=${encodeURIComponent(name)}`, LOAD_LANE, (s) => s.load === undefined ? undefined : s.load.load(inferenceType, name), signal, timeoutMs),
        ledgerTail: (limit, event, signal, timeoutMs) => estateLane(ctx, 'GET /v1/ledger', QUEUE_LANE, 
        // The designed degrade: a SEATLESS queue reads as an EMPTY
        // tail (optional infra — the crash-toast lesson); a mounted
        // seat's undefined still refuses (the fall-through law).
        (s) => s.queue === undefined ? [] : s.queue.ledger(limit, event), signal, timeoutMs),
    };
}
//# sourceMappingURL=estate.js.map