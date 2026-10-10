/**
 * add-stage.ts — the bench's mutation verb callers (the tab's
 * add/remove/reorder/group/ungroup paths). Every verb is ONE typed
 * call on the mounted bench namespace (stroke 81's one-lane law —
 * the generated client, never a hand-written envelope); the remote
 * signature is (sessionKey, doc) — sessionKey is a TYPED first
 * parameter, so a misaddressed bench is a type error, not a runtime
 * refusal. The doc carries the verb's own keys and every doc rides
 * expect_rev (the CAS law: the caller chains the bench rev it
 * rendered, so a concurrent edit refuses instead of slicing wrong).
 *
 * THE REBASE LAW (2026-09-15, the operator's stuck: "bench main
 * moved: rev is 429, caller held 35 — IT STUCK"): the bench is ONE
 * shared doc the agent writes too, so a tab-rendered rev can be
 * stale through no user fault. A door that refuses ONLY on CAS
 * answers itself: re-read the rev (from the SAME session the verb
 * addresses — the 2026-09-16 fix; the old arm hard-coded 'main' and
 * rebased non-main verbs against the wrong bench's rev), re-apply —
 * BOUNDED at 3 tries with a fresh rev between each (the once-law
 * died under a live second author, 2026-10-09). A conflict after
 * the budget, or any non-CAS refusal, throws loud (the named
 * truth, never a silent drop, never a blind write) — and the
 * view reloads on that final failure so the NEXT gesture composes
 * against fresh truth. The stuck is structurally impossible: a
 * moved bench costs one silent rebase, never a bricked tab.
 */
import { estateRemote, unwrapRemote, type BenchNamespace, isCasConflict } from '@melite/card-base/client'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'

// THE SESSIONKEY LAW (stroke 81, the operator's burn): no verb may
// default its session — a defaulted key is a latent misaddress (the
// stroke-80 class: a forgotten argument silently mutates the WRONG
// bench). Every caller THREADS the key of the bench it renders;
// the one 'main' spelling lives at the address-grammar root
// (benchSessionKey), never at a verb.

/** The bench verbs this module rides (the namespace's method names —
 * typed keys on the generated client, so a typo is a compile error). */
// 'clear' (2026-10-10, the operator's demanded clear-all) — the
// nuclear verb: every stage out, one rev, undo restores all.
// 'undo' (the walkable revision log, 2026-10-13) — the inverse
// walk: the server applies the log tail's inverses newest-first
// and appends ONE undo entry; the caller's expect_rev rides the
// same CAS law as every mutation.
type BenchVerb = 'add-stage' | 'remove-stage' | 'clear' | 'reorder' | 'group' | 'ungroup' | 'undo'

/** The bench's CURRENT rev for one session — the CAS handle for a
 *  re-apply. Returns undefined when the read fails (the re-apply is
 *  then skipped; the original refusal stands as the honest answer). */
async function benchRev(sessionKey: string, signal?: AbortSignal): Promise<number | undefined> {
  try {
    const row = await unwrapRemote(
      estateRemote().bench.get(sessionKey, signal),
      'bench/get',
    ) as unknown as { rev?: unknown }
    const rev = row.rev
    return typeof rev === 'number' ? rev : undefined
  } catch {
    return undefined
  }
}


/** One typed bench verb with the rebase dance: try the held rev; on
 *  the door's cas-conflict re-read the rev (the SAME session) and
 *  re-apply — bounded (3 tries, a fresh rev between each; the
 *  once-law died under a live second author, 2026-10-09). */
const BENCH_ATTEMPTS = 3
async function withRebase(
  verb: BenchVerb,
  doc: Record<string, unknown>,
  sessionKey: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const ns: BenchNamespace = estateRemote().bench
  const attempt = (expectRev: number): Promise<Record<string, unknown>> =>
    unwrapRemote(
      // the verb union's answers differ per verb (BenchStageRow,
      // BenchClearRow, …) — the caller reads the open record it
      // needs, the same open-record law the generated client's own
      // sugar rides (the cast is at the verb seam, not the rows).
      ns[verb](sessionKey, { ...doc, expect_rev: expectRev }, signal) as unknown as
        Promise<RemoteResult<Record<string, unknown>>>,
      'bench/' + verb,
    ).then((row) => row as unknown as Record<string, unknown>)
  const held = doc['expect_rev']
  if (typeof held !== 'number') throw new Error('bench/' + verb + ': no expect_rev to write against')
  let rev = held
  let last: unknown
  for (let i = 0; i < BENCH_ATTEMPTS; i++) {
    try {
      return await attempt(rev)
    } catch (e: unknown) {
      if (!isCasConflict(e)) throw e
      last = e
      const fresh = await benchRev(sessionKey, signal)
      if (fresh === undefined) throw e
      rev = fresh
    }
  }
  throw last
}

/** The bench add-stage verb caller (the tab's add-card path). The
 *  doc holds card/author/engine/params/expect_rev. */
export async function addStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('add-stage', doc, sessionKey, signal)
}

/** The bench remove-stage verb caller (the drill's Remove path). The
 *  doc holds stage/expect_rev; the session key addresses the doc the
 *  bar RENDERS (stroke 80 — 'main' hardcoding deleted against the
 *  wrong bench and refused 'stage not found'). */
export async function removeStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('remove-stage', doc, sessionKey, signal)
}

/** THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO CLEAR ALL"
 *  — and a bench with a stranded wire had no way out but the wire).
 *  The doc holds expect_rev only; the session key addresses the doc
 *  the bar RENDERS (same law as remove). */
export async function clearBenchWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('clear', doc, sessionKey, signal)
}

/** The bench reorder verb caller (the drag-reorder path). Doc:
 *  stage/to/expect_rev — `to` is the post-splice target index. */
export async function reorderStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('reorder', doc, sessionKey, signal)
}

/** The bench group verb caller (the Group Cards sub-view):
 *  stages = 2+ ids (bench order applied server-side). */
export async function groupStagesWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('group', doc, sessionKey, signal)
}

/** The bench ungroup verb caller: spill a compound's children. */
export async function ungroupStageWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('ungroup', doc, sessionKey, signal)
}

/** THE UNDO WIRE (the walkable revision log): revert the log
 *  tail's newest ACTION (or `n` of them — the doc's own key,
 *  server-defaulted to 1). One press, no author filter — the
 *  tab's reader undoes the last change to the ONE shared bench,
 *  whoever authored it; the server's own log walk skips
 *  already-reverted entries and never targets undo entries
 *  themselves (no ping-pong). Same CAS rebase dance: a bench the
 *  agent moved mid-press costs one silent re-read, never a
 *  bricked tab. The session key addresses the doc the bar
 *  RENDERS (stroke 80's law). */
export async function undoBenchWire(doc: Record<string, unknown>, sessionKey: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('undo', doc, sessionKey, signal)
}
