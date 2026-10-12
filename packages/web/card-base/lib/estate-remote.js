/** The estate's domain refusal ({ok:false} answers): the message
 * rides verbatim; the class separates DOMAIN verdicts from transport
 * failures so policy code (the gone-verdict, the poll, the CAS
 * rebase) can discriminate. */
export class EstateRefusedError extends Error {
    /** The door's stable refusal code when the failure carried one
     *  (the RemoteError discriminator; policy code matches this,
     *  never message text). */
    code;
    /** The failure's structured details when it carried some (the
     *  RemoteError details row — the lane_input_missing popup keys
     *  its download action on these fields, 2026-10-22). */
    details;
    constructor(message, code, details) {
        super(message);
        this.name = 'EstateRefusedError';
        this.code = code;
        if (details !== undefined)
            this.details = details;
    }
}
let bound;
/** The armed lazy source (see armEstateRemoteLazyBind): the studio
 *  bind's order-proof wake, plain JS — no cordis fiber. */
let lazySource;
/** Capture the namespaces (the mounter's direct bind — or a test's
 *  honest fake). Idempotent; the last bind wins. */
export function bindEstateRemote(namespaces) {
    bound = namespaces;
}
/** Drop the bind (tests isolate between cases; also disarms the lazy
 *  source so the next case starts from the honest unbound state). */
export function unbindEstateRemote() {
    bound = undefined;
    lazySource = undefined;
}
/** Arm the lazy bind (the studio bundles' order-proof wake): the
 *  factory captures a plain getter reading the namespaces through
 *  the inject-free reflect seam (ctx.get — cordis' own type doc:
 *  "Read a service from the store without the inject requirement").
 *  No cordis fiber, no inject list, no epoch — a getter cannot be
 *  parked dormant, refused by a proxy, or poisoned into a parent
 *  fiber's inject set (the four receipts that killed every fiber
 *  binder). The FIRST verb pulls it (estateRemote, below); if the
 *  namespaces still do not exist the loud refusal below speaks. */
export function armEstateRemoteLazyBind(source) {
    lazySource = source;
}
/** The bound namespaces — LOUD when unbound, and the LAZY BIND'S
 *  MOUTH: the first verb after the mounts land pulls the armed
 *  getter once (order-proof — by first use, the mounter has long
 *  booted); a verb before the mounts (or on a host without the
 *  estate plugin) meets the loud wiring refusal, never a hang and
 *  never a silent fallback. */
export function estateRemote() {
    if (bound === undefined && lazySource !== undefined) {
        try {
            bindEstateRemoteFromRemote(lazySource());
        }
        catch (wiringError) {
            // wiringError: the mounts were still absent at verb time —
            // falling through to the loud refusal below IS the handling
            // (the getter stays armed; a later verb retries)
            // the namespaces were still absent at verb time — fall through
            // to the loud refusal below (the getter stays armed; a later
            // verb retries against a booted mounter)
        }
    }
    if (bound === undefined) {
        throw new Error('estate remote not mounted — the verbs ride ctx.remote (the TYPERT_REMOTE contributions must mount before any call)');
    }
    return bound;
}
/** THE BIND SEAM, HARNESS-SHAPED (2026-09-29, the fourth lane
 *  receipt): the client-bundle preset inlines card-base into every
 *  consumer bundle, so this module's `bound` singleton exists PER
 *  BUNDLE — the from-media outage's second layer. Every attempt to
 *  bind through a RUNTIME child fiber died on cordis' own machinery
 *  (dotted-only injects: the proxy refuses `child.remote`; parent-
 *  only: the fiber starts INACTIVE; both: the runner's own inspect
 *  sync breaks). The harness never binds this way. Its consumers —
 *  product-analytics, ui-settings, ui-model-selection — declare
 *  STATIC plugin injects with BOTH levels (`['remote',
 *  'remote.productAnalytics']`), the loader waits for the mounted
 *  namespaces before their apply runs, and they read
 *  `ctx.remote.<namespace>` directly. That is this bind:
 *
 *  - a CONSUMING studio declares `export const inject = ['slots',
 *    'remote', 'remote.bench', 'remote.drafts', 'remote.runs',
 *    'remote.media']` on its client entry — the loader guarantees
 *    the namespaces exist when its apply runs;
 *  - the MOUNTER (card-view) injects only the parent 'remote' (the
 *    dotted names on the mounter would wait on its own $mount — the
 *    2026-09-15 deadlock) and binds directly after its mounts;
 *  - both call THIS function, the one spelling of the bind, loud on
 *    any absent namespace (a mis-injected entry is a wiring bug,
 *    never a silent hole).
 *
 *  THE WALL pins every studio entry's inject list; the singleton
 *  throw stays the runtime guard. */
export function bindEstateRemoteFromRemote(remote) {
    const { bench, drafts, runs, media, manage } = remote;
    if (bench === undefined || drafts === undefined || runs === undefined || media === undefined) {
        throw new Error('estate remote not mounted — the verbs ride ctx.remote (the TYPERT_REMOTE contributions must mount before any call)');
    }
    const namespaces = { bench, drafts, runs, media, ...(manage === undefined ? {} : { manage }) };
    bindEstateRemote(namespaces);
    return namespaces;
}
/** The manage namespace — LOUD when the mounter did not bind it (a
 *  caller that manages on a host without the manage contribution
 *  meets the wiring refusal, never a silent fallback to a
 *  hand-rolled lane). */
export function manageRemote() {
    const ns = estateRemote().manage;
    if (ns === undefined) {
        throw new Error('manage remote not mounted — the manage verbs ride ctx.remote (the manage contribution must mount before any call)');
    }
    return ns;
}
/** Await one namespace method's RemoteResult and unwrap it: the
 *  value on ok, the estate's refusal text (verbatim) on the error
 *  branch. Accepts the promise directly so call sites stay one
 *  expression. */
export async function unwrapRemote(result, voice) {
    const settled = await result;
    // The literal-comparison guard + destructure: TS 6's truthiness
    // narrowing on this generic union drops the member face at
    // property access (settled.error fails while the residual type
    // is the error branch) — the explicit === true spelling narrows
    // cleanly.
    if (settled.ok === true)
        return settled.value;
    const { error } = settled;
    const failure = error;
    const message = typeof failure === 'object' && failure !== null
        && typeof failure.message === 'string'
        && failure.message !== ''
        ? failure.message : voice + ': refused';
    const code = typeof failure === 'object' && failure !== null
        && typeof failure.code === 'string'
        ? failure.code : undefined;
    // The structured details ride beside the code (the wire-chain
    // envelope): read only a plain object, never an array.
    const rawDetails = typeof failure === 'object' && failure !== null
        ? failure.details : undefined;
    const details = typeof rawDetails === 'object' && rawDetails !== null && !Array.isArray(rawDetails)
        ? rawDetails : undefined;
    throw new EstateRefusedError(message, code, details);
}
/** The door's stable CAS refusal code (bench verbs, bench ensure,
 *  drafts/patch — every voice that means "the bench moved under
 *  you; re-read and re-apply"). */
export const CAS_CONFLICT_CODE = 'bench/cas-conflict';
/** True when the throw is the door's CAS verdict (stale or missing
 *  expect_rev) — the ONLY refusal a rebase-and-retry may answer. Any
 *  other refusal (admission, unknown stage, store failure) throws
 *  through untouched: retrying those would be a fallback.
 *
 *  THE CODE IS THE VOICE (2026-10-12): the protocol's own law is
 *  "discrimination is always by code, never by instanceof" — and
 *  never by message text. Two dead-matcher incidents (2026-09-15,
 *  2026-10-09) were substring law: each new door phrasing
 *  ('bench main moved: rev is…', 'bench moved under the patch…')
 *  slipped past the arms and the rebase went dead in production.
 *  unwrapRemote forwards the RemoteError code, and every CAS
 *  refusal carries bench/cas-conflict, so this matches the one
 *  stable truth. */
export function isCasConflict(error) {
    return error instanceof EstateRefusedError && error.code === CAS_CONFLICT_CODE;
}
/** Refusal discrimination for policy code (the CAS rebase, the
 * gone-verdict, the poll's file-era arms). */
export function isEstateRefusal(error) {
    return error instanceof EstateRefusedError;
}
//# sourceMappingURL=estate-remote.js.map