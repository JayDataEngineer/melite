import { RUN_MEDIA_PREFIX } from "@melite/contracts/benchStage";
// THE TERMINAL VOCABULARY IS THE CONTRACT'S (2026-10-13, the card-UI
// duplication audit): five seats spelled "is this run finished?" with
// their own sets, and they disagreed — one treated `unknown` as
// terminal and `error` as live, another the reverse, so a run in
// either word never stopped a poller on one plane. `@melite/contracts`
// stageView is the one owner (the estate's own RunStatus plus the two
// wire-only words: `error` is the run record's failure stamp, `unknown`
// is a schema value). These names stay so existing importers ride the
// same truth.
export { isTerminalStatus as isTerminalRun, TERMINAL_RUN_STATUSES, RUN_STATUS_WORDS } from '@melite/contracts/stageView';
import { RUN_STATUS_WORDS } from '@melite/contracts/stageView';
/** The ONE media-url rewrite (readRunStatus + the file-era list
 *  fallback share it): bare run-relative names ride the estate's
 *  media route (/melite-media/runs/<runId>/<rel>); urls that already
 *  carry a scheme or lead with / pass verbatim (never double-encoded). */
export function toRunMediaUrl(runId, url) {
    if (url === '')
        return '';
    if (!/^(https?:\/\/|\/)/.test(url)) {
        return RUN_MEDIA_PREFIX + '/' + encodeURIComponent(runId) + '/'
            + url.split('/').map((seg) => encodeURIComponent(seg)).join('/');
    }
    return url;
}
/** Normalize a runs/status doc: stage rows distilled, bare run-
 *  relative urls rewritten onto the estate's media route (absolute
 *  and leading-/ urls pass verbatim — the one rewrite, never two). */
export function readRunStatus(runId, doc) {
    const stages = Array.isArray(doc['stages'])
        ? doc['stages'].filter((s) => typeof s === 'object' && s !== null && typeof s['id'] === 'string')
        : [];
    for (const stage of stages) {
        if (typeof stage.url === 'string' && stage.url !== '') {
            stage.url = toRunMediaUrl(runId, stage.url);
        }
        if (typeof stage.error !== 'string' || stage.error === '') {
            delete stage.error;
        }
        // progress normalize (the tap fold): keep only well-formed
        // {value,max} pairs; anything else drops (terminal rows carry
        // none — the finisher deletes).
        const p = stage.progress;
        if (p === undefined ||
            typeof p !== 'object' ||
            typeof p.value !== 'number' ||
            typeof p.max !== 'number') {
            delete stage.progress;
        }
        if (typeof stage.activity !== 'string' || stage.activity === '') {
            delete stage.activity;
        }
    }
    // THE READ DOOR THROWS (schema-strictness fix 3, 2026-10-01): a
    // status word outside the fold's domain (RUN_STATUS_WORDS,
    // @melite/contracts/stageView) is corruption, not a state — the old
    // ':unknown' default handed garbage to the fold, which buried it as
    // a terminal. melite-card-view's run view wraps this and fails the
    // card visibly; card-base's fetchRunStatus lets it propagate as a
    // failed read.
    const status = doc['status'];
    if (typeof status !== 'string' || !RUN_STATUS_WORDS.has(status.toLowerCase())) {
        throw new Error(`runs/status ${runId}: run-level status ${JSON.stringify(status)} is outside the vocabulary`);
    }
    return {
        runId,
        status,
        draftId: typeof doc['draft_id'] === 'string' && doc['draft_id'] !== ''
            ? doc['draft_id']
            : null,
        stages,
        ...(typeof doc['error'] === 'string' && doc['error'] !== '' ? { error: doc['error'] } : {}),
    };
}
// ── the list-row url laws ─────────────────────────────────────────
/** The list row's served artifact url onto the media route. The
 *  list's currency DIFFERS from the status door's: runArtifacts
 *  serves urls already prefixed with the run dir
 *  (`<runId>/<rel>` — `url: runBase + "/" + cand.rel`), while live
 *  stage urls are bare rels (runRel strips the dir). So the list
 *  url rides under the route root directly — prepending the run id
 *  again would double it. Absolute and rooted urls pass verbatim. */
export function listArtifactMediaUrl(url) {
    if (url === '')
        return null;
    if (/^(https?:\/\/|\/)/.test(url))
        return url;
    return RUN_MEDIA_PREFIX + '/'
        + url.split('/').map((seg) => encodeURIComponent(seg)).join('/');
}
/** The list row's first media artifact url, rewritten onto the media
 *  route (the row's own currency is run-prefixed, like the
 *  thumbnail). Truncated markers carry no url and are skipped. */
export function listRowMediaUrl(row) {
    const arts = Array.isArray(row['artifacts']) ? row['artifacts'] : [];
    for (const a of arts) {
        if (typeof a !== 'object' || a === null)
            continue;
        const url = a['url'];
        if (typeof url === 'string') {
            const media = listArtifactMediaUrl(url);
            if (media !== null)
                return media;
        }
    }
    return null;
}
// ── the catalog door (the ONE /v1/model-catalog reader + cache) ───
/** The wire dial (audit X-E1, the card-base wire's law): every fetch
 *  rides a socket with a bound — a caller signal ANDed with the dial,
 *  never a bare socket. Reads are small same-origin JSON. */
const READ_DIAL_MS = 20_000;
/** The caller's signal ANDed with the dial — either side lifting the
 *  fetch aborts it (the provisioning seam's own shape). */
function dialed(signal, dialMs) {
    const dial = AbortSignal.timeout(dialMs);
    return signal === undefined ? dial : AbortSignal.any([signal, dial]);
}
/** Read the same-origin /v1/model-catalog door. Non-200 → named throw
 *  (the door's own error text when present); a 200 whose body does
 *  not parse to an object is a served-plane misconfiguration and
 *  refuses loud too (never a silent empty table). */
async function catalogGet(signal) {
    const res = await fetch('/v1/model-catalog', { signal: dialed(signal, READ_DIAL_MS) });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        const err = typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined;
        throw new Error(typeof err === 'string' ? err : '/v1/model-catalog: HTTP ' + String(res.status));
    }
    if (typeof body !== 'object' || body === null)
        throw new Error('/v1/model-catalog: unreadable body');
    return body;
}
let cardCatalogRowsCache = null;
let cardCatalogRowsInflight = null;
/** The catalog's cards section, read ONCE per session (the ONE door +
 *  cache law, nativity audit 2026-11-05 D6 — card-base's
 *  fetchCardCatalog projection rides THIS reader; there is no second
 *  GET of the door anywhere). Each row is the served JSON verbatim;
 *  projections narrow their own fields. Cached per session (the
 *  catalog is static per boot; one door round trip, every consumer
 *  shares it; concurrent cold starts share the one in-flight read).
 * @param signal - caller cancellation, ANDed with the read dial.
 * @returns the cards section: card id → its served row. */
export async function fetchCardCatalogRows(signal) {
    if (cardCatalogRowsCache !== null)
        return cardCatalogRowsCache;
    cardCatalogRowsInflight ??= (async () => {
        const body = await catalogGet(signal);
        const raw = body['cards'];
        const out = {};
        if (typeof raw === 'object' && raw !== null) {
            for (const [id, row] of Object.entries(raw)) {
                if (typeof row !== 'object' || row === null)
                    continue;
                out[id] = row;
            }
        }
        return out;
    })();
    try {
        cardCatalogRowsCache = await cardCatalogRowsInflight;
        return cardCatalogRowsCache;
    }
    finally {
        cardCatalogRowsInflight = null;
    }
}
/** Drop the catalog cache (tests isolate; a long-lived surface could
 *  refresh after a models re-scan). */
export function resetCardFamiliesCache() {
    cardCatalogRowsCache = null;
    cardCatalogRowsInflight = null;
}
/** The family currency (the {model:} door's model ids — the cards
 *  section's projection): card id → its boarded families, first = the
 *  DEFAULT family (form-spec's card-id alias law: boarded[0]). The
 *  runs door resolves NEITHER card ids nor aliases — callers hand the
 *  start verb the family from HERE. Rides the one reader + cache
 *  above. */
export async function fetchCardFamilies(signal) {
    const rows = await fetchCardCatalogRows(signal);
    const out = {};
    for (const [id, row] of Object.entries(rows)) {
        const fams = row['families'];
        out[id] = Array.isArray(fams) ? fams.filter((x) => typeof x === 'string') : [id];
    }
    return out;
}
/** Resolve a card's DEFAULT family (boarded[0]); the card id itself
 *  when the catalog names none (mask-studio-style self-services). */
export async function defaultFamilyForCard(cardId, signal) {
    const families = await fetchCardFamilies(signal);
    return families[cardId]?.[0] ?? cardId;
}
//# sourceMappingURL=index.js.map
