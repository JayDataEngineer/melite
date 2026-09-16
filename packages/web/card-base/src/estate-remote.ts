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
import type { ClientRemote } from '@deepseek-ai/dsh-api-gateway/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
// The generated contributions' declaration merges (TypertRemoteMap
// gains bench/* + drafts/* + runs/* + media/*): with these, the
// ClientRemote namespace faces below are TYPED.
import type {} from '@melite/estate-drafts/remote'
import type {} from '@melite/estate-runs/remote'
import type {} from '@melite/estate-media/remote'

/** The bench namespace (bench/get, add-stage, remove-stage, reorder,
 * group, ungroup, patch, rewire, undo, ensure, subscribe). */
export type BenchNamespace = ClientRemote['bench']
/** The drafts namespace (drafts/get, list, patch). */
export type DraftsNamespace = ClientRemote['drafts']
/** The runs namespace (runs/start, status, stop, list, validate). */
export type RunsNamespace = ClientRemote['runs']
/** The media namespace (media/list). */
export type MediaNamespace = ClientRemote['media']

/** The estate's domain refusal ({ok:false} answers): the message
 * rides verbatim; the class separates DOMAIN verdicts from transport
 * failures so policy code (the gone-verdict, the poll, the CAS
 * rebase) can discriminate. */
export class EstateRefusedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EstateRefusedError'
  }
}

/** The four mounted namespaces, as apply() captures them and tests
 * bind them. */
export interface EstateNamespaces {
  bench: BenchNamespace
  drafts: DraftsNamespace
  runs: RunsNamespace
  media: MediaNamespace
}

let bound: EstateNamespaces | undefined

/** Capture the namespaces (apply()'s child fiber — or a test's honest
 * fake). Idempotent; the last bind wins. */
export function bindEstateRemote(namespaces: EstateNamespaces): void {
  bound = namespaces
}

/** Drop the bind (tests isolate between cases). */
export function unbindEstateRemote(): void {
  bound = undefined
}

/** The bound namespaces — LOUD when unbound: a verb call before the
 * mount (or after unload) is a wiring bug, never a silent fallback. */
export function estateRemote(): EstateNamespaces {
  if (bound === undefined) {
    throw new Error('estate remote not mounted — the verbs ride ctx.remote (the TYPERT_REMOTE contributions must mount before any call)')
  }
  return bound
}

/** Await one namespace method's RemoteResult and unwrap it: the
 *  value on ok, the estate's refusal text (verbatim) on the error
 *  branch. Accepts the promise directly so call sites stay one
 *  expression. */
export async function unwrapRemote<T>(
  result: RemoteResult<T> | Promise<RemoteResult<T>>,
  voice: string,
): Promise<T> {
  const settled = await result
  // The literal-comparison guard + destructure: TS 6's truthiness
  // narrowing on this generic union drops the member face at
  // property access (settled.error fails while the residual type
  // is the error branch) — the explicit === true spelling narrows
  // cleanly.
  if (settled.ok === true) return settled.value
  const { error } = settled
  const failure: unknown = error
  const message = typeof failure === 'object' && failure !== null
    && typeof (failure as { message?: unknown }).message === 'string'
    && (failure as { message: string }).message !== ''
    ? (failure as { message: string }).message : voice + ': refused'
  throw new EstateRefusedError(message)
}

/** Refusal discrimination for policy code (the CAS rebase, the
 * gone-verdict, the poll's file-era arms). */
export function isEstateRefusal(error: unknown): boolean {
  return error instanceof EstateRefusedError
}
