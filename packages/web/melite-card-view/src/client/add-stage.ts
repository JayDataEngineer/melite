/**
 * add-stage.ts — the bench's mutation wire door callers (the tab's
 * add/remove/reorder/rewire/group/ungroup paths). Every verb is ONE
 * wireCall over the run-wire package's frame (the DRY law — the frame
 * lived here six times before the package existed); the remote's
 * signature is (sessionKey, doc) — the args frame carries BOTH named,
 * the doc carries the verb's own keys, and every doc rides expect_rev
 * (the CAS law: the caller chains the bench rev it rendered, so a
 * concurrent edit refuses instead of slicing wrong).
 *
 * THE REBASE LAW (2026-09-15, the operator's stuck: "bench main
 * moved: rev is 429, caller held 35 — IT STUCK"): the bench is ONE
 * shared doc the agent writes too, so a tab-rendered rev can be
 * stale through no user fault. A door that refuses ONLY on CAS
 * answers itself: re-read the rev, re-apply ONCE. A second conflict
 * or any non-CAS refusal throws loud (the named truth, never a
 * silent drop, never a blind write) — and the view reloads on that
 * final failure so the NEXT gesture composes against fresh truth.
 * The stuck is structurally impossible: a moved bench costs one
 * silent rebase, never a bricked tab.
 */
import { wireCall } from '@melite-plugin/melite-run-wire'

/** The bench's CURRENT rev — the CAS handle for a re-apply. Returns
 *  undefined when the read fails (the re-apply is then skipped; the
 *  original refusal stands as the honest answer). */
async function benchRev(signal?: AbortSignal): Promise<number | undefined> {
  try {
    const row = await wireCall('bench/get', { sessionKey: 'main' }, { signal })
    const rev = (row as { rev?: unknown }).rev
    return typeof rev === 'number' ? rev : undefined
  } catch {
    return undefined
  }
}

/** True when the throw is the door's CAS verdict (stale expect_rev).
 *  The server's own voice: "bench <session> moved: rev is N, caller
 *  held M" (bench.ts casCheck; the drafts store's older arm says
 *  "bench moved: rev is…"). THE MATCHER LAW (2026-09-15): match the
 *  REAL words — the first cut matched 'bench moved' against 'bench
 *  MAIN moved' and matched nothing; dead matchers make dead
 *  rebases, and dead rebases make stuck tabs. */
function isCasConflict(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('moved: rev is') || msg.includes('cas-conflict')
}

/** One door call with the rebase dance: try the held rev; on the
 *  door's cas-conflict re-read the rev and re-apply ONCE with it. */
async function withRebase(
  method: string,
  doc: Record<string, unknown>,
  sessionKey: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const attempt = (expectRev: number): Promise<Record<string, unknown>> =>
    wireCall(method, { sessionKey, doc: { ...doc, expect_rev: expectRev } }, { signal, voice: method })
  const held = doc['expect_rev']
  try {
    if (typeof held !== 'number') throw new Error(method + ': no expect_rev to write against')
    return await attempt(held)
  } catch (e: unknown) {
    if (!isCasConflict(e)) throw e
    const fresh = await benchRev(signal)
    if (fresh === undefined) throw e
    return await attempt(fresh)
  }
}

/** The bench add-stage wire door caller (the tab's add-card path).
 *  The doc holds card/author/engine/params/expect_rev. */
export async function addStageWire(doc: Record<string, unknown>, sessionKey = 'main', signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('bench/add-stage', doc, sessionKey, signal)
}

/** The bench remove-stage wire door caller (the drill's Remove path).
 *  The doc holds stage/expect_rev; the session key addresses the doc
 *  the bar RENDERS (stroke 80 — 'main' hardcoding deleted against
 *  the wrong bench and refused 'stage not found'). */
export async function removeStageWire(doc: Record<string, unknown>, sessionKey: string = 'main', signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('bench/remove-stage', doc, sessionKey, signal)
}

/** The bench reorder wire door caller (the drag-reorder path). Doc:
 *  stage/to/expect_rev — `to` is the post-splice target index. */
export async function reorderStageWire(doc: Record<string, unknown>, sessionKey: string = 'main', signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('bench/reorder', doc, sessionKey, signal)
}

/** The bench group wire door caller (the Group Cards sub-view):
 *  stages = 2+ ids (bench order applied server-side). */
export async function groupStagesWire(doc: Record<string, unknown>, sessionKey: string = 'main', signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('bench/group', doc, sessionKey, signal)
}

/** The bench ungroup wire door caller: spill a compound's children. */
export async function ungroupStageWire(doc: Record<string, unknown>, sessionKey: string = 'main', signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await withRebase('bench/ungroup', doc, sessionKey, signal)
}
