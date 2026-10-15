/**
 * estate-remote.ts — THE ONE ESTATE LANE (stroke 81; the shared
 * home, stroke 81b).
 *
 * This module lives in card-base (not the card-view plugin) because
 * the bind is a PAGE singleton: every browser estate read — the
 * bench surface AND sibling studio clients (img-to-mesh's artifact
 * poll) — rides the namespaces card-view's apply mounted. A second
 * copy in a second package would be a second singleton: bound in
 * one, unread in the other. Shared base, one bind, no drift.
 *
 * Every browser-side estate verb rides the mounted Typert namespaces
 * (bench / drafts / runs / media) — the generated remote clients the
 * typert pipeline emits, mounted through ctx.remote.$mount by this
 * plugin's apply. The hand-written envelope lane (melite-run-wire's
 * wireCall minting its own rpcIds) is DEAD for estate verbs: the
 * api-gateway law reserves transport, RPC ids, response envelopes,
 * and cancellation to the Connection, and the sanctioned client face
 * is the mounted namespace.
 *
 * THE BIND SEAM: apply() captures the four namespaces under a child
 * fiber that declares the dotted injects (the 2026-09-15 inject fix —
 * a nested service is reachable only from a fiber that injects it,
 * and a static inject on the mounting plugin would deadlock against
 * its own $mount). Tests bind honest fakes through the same function
 * — no module mocks, no envelope stubs.
 *
 * THE UNWRAP LAW: generated methods resolve RemoteResult — carrier
 * failures already folded into the error branch; a domain refusal
 * throws EstateRefusedError carrying the estate's message VERBATIM
 * (the door's own law — the client never paraphrases a refusal; the
 * CAS dance keys on the estate's words).
 */
import type { ClientRemote } from '@deepseek-ai/dsh-api-gateway/client';
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
/** The bench namespace (bench/get, add-stage, remove-stage, reorder,
 * group, ungroup, patch, rewire, undo, ensure, subscribe). */
export type BenchNamespace = ClientRemote['bench'];
/** The drafts namespace (drafts/get, list, patch). */
export type DraftsNamespace = ClientRemote['drafts'];
/** The runs namespace (runs/start, status, stop, list, validate). */
export type RunsNamespace = ClientRemote['runs'];
/** The media namespace (media/list). */
export type MediaNamespace = ClientRemote['media'];
/** The manage namespace (manage/act — the management plane's one
 * door; the deck's assets tab and the card chrome's manage verbs
 * ride it). Bound by the mounter; OPTIONAL at the four-namespace
 * bind (studios that never manage keep their inject lists) and loud
 * through manageRemote() when absent. */
export type ManageNamespace = ClientRemote['manage'];
/** The estate's domain refusal ({ok:false} answers): the message
 * rides verbatim; the class separates DOMAIN verdicts from transport
 * failures so policy code (the gone-verdict, the poll, the CAS
 * rebase) can discriminate. */
export declare class EstateRefusedError extends Error {
    /** The door's stable refusal code when the failure carried one
     *  (the RemoteError discriminator; policy code matches this,
     *  never message text). */
    readonly code?: string;
    /** The failure's structured details when it carried some (the
     *  RemoteError details row — the lane_input_missing popup keys
     *  its download action on these fields, 2026-10-22). */
    readonly details?: Record<string, unknown>;
    constructor(message: string, code?: string, details?: Record<string, unknown>);
}
/** The four mounted namespaces, as apply() captures them and tests
 * bind them. */
export interface EstateNamespaces {
    bench: BenchNamespace;
    drafts: DraftsNamespace;
    runs: RunsNamespace;
    media: MediaNamespace;
    manage?: ManageNamespace;
}
/** Capture the namespaces (the mounter's direct bind — or a test's
 *  honest fake). Idempotent; the last bind wins. */
export declare function bindEstateRemote(namespaces: EstateNamespaces): void;
/** Drop the bind (tests isolate between cases; also disarms the lazy
 *  source so the next case starts from the honest unbound state). */
export declare function unbindEstateRemote(): void;
/** Arm the lazy bind (the studio bundles' order-proof wake): the
 *  factory captures a plain getter reading the namespaces through
 *  the inject-free reflect seam (ctx.get — cordis' own type doc:
 *  "Read a service from the store without the inject requirement").
 *  No cordis fiber, no inject list, no epoch — a getter cannot be
 *  parked dormant, refused by a proxy, or poisoned into a parent
 *  fiber's inject set (the four receipts that killed every fiber
 *  binder). The FIRST verb pulls it (estateRemote, below); if the
 *  namespaces still do not exist the loud refusal below speaks. */
export declare function armEstateRemoteLazyBind(source: () => Partial<EstateNamespaces>): void;
/** The bound namespaces — LOUD when unbound, and the LAZY BIND'S
 *  MOUTH: the first verb after the mounts land pulls the armed
 *  getter once (order-proof — by first use, the mounter has long
 *  booted); a verb before the mounts (or on a host without the
 *  estate plugin) meets the loud wiring refusal, never a hang and
 *  never a silent fallback. */
export declare function estateRemote(): EstateNamespaces;
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
export declare function bindEstateRemoteFromRemote(remote: Partial<EstateNamespaces>): EstateNamespaces;
/** The manage namespace — LOUD when the mounter did not bind it (a
 *  caller that manages on a host without the manage contribution
 *  meets the wiring refusal, never a silent fallback to a
 *  hand-rolled lane). */
export declare function manageRemote(): ManageNamespace;
/** Await one namespace method's RemoteResult and unwrap it: the
 *  value on ok, the estate's refusal text (verbatim) on the error
 *  branch. Accepts the promise directly so call sites stay one
 *  expression. */
export declare function unwrapRemote<T>(result: RemoteResult<T> | Promise<RemoteResult<T>>, voice: string): Promise<T>;
/** The door's stable CAS refusal code (bench verbs, bench ensure,
 *  drafts/patch — every voice that means "the bench moved under
 *  you; re-read and re-apply"). */
export declare const CAS_CONFLICT_CODE = "bench/cas-conflict";
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
export declare function isCasConflict(error: unknown): boolean;
/** Refusal discrimination for policy code (the CAS rebase, the
 * gone-verdict, the poll's file-era arms). */
export declare function isEstateRefusal(error: unknown): error is EstateRefusedError;
/** The registry's duplicate-service verdict stem — the stable part of
 *  the ONLY face cordis gives a second provide(): a bare Error (no
 *  .code) whose message is `service "<name>" has been registered at
 *  <fiber>` (vendor/cordis/src/reflect.ts:290, the npm build's
 *  node_modules/@deepseek-ai/cordis/lib/index.js:813 — verified
 *  verbatim, the nativity audit 2026-11-05 D7). The message IS the
 *  protocol face here, so the estate's law ("discrimination is always
 *  by code, never by message text") lands as THE ONE NAMED PREDICATE
 *  HOME: this stem is spelled exactly once, every collision seat asks
 *  the predicate by name, and the walled test fires the real cordis
 *  throw through it. Never inline the template at a seat.
 * @param error - the caught rejection.
 * @param service - the provide() name the seat owns.
 * @returns true when the error is cordis's duplicate-service verdict for that name. */
export declare function isDuplicateServiceSeat(error: unknown, service: string): boolean;
//# sourceMappingURL=estate-remote.d.ts.map
