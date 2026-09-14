/**
 * add-stage.ts — the bench's mutation wire door callers (the tab's
 * add/remove/reorder/rewire/group/ungroup paths). Every verb is ONE
 * wireCall over the run-wire package's frame (the DRY law — the frame
 * lived here six times before the package existed); the remote's
 * signature is (sessionKey, doc) — the args frame carries BOTH named,
 * the doc carries the verb's own keys, and every doc rides expect_rev
 * (the CAS law: the caller chains the bench rev it rendered, so a
 * concurrent edit refuses instead of slicing wrong).
 */
import { wireCall } from '@melite-plugin/melite-run-wire'

/** The bench add-stage wire door caller (the tab's add-card path).
 *  The doc holds card/author/engine/params/expect_rev. */
export async function addStageWire(doc: Record<string, unknown>, sessionKey = 'main', signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await wireCall('bench/add-stage', { sessionKey, doc }, { signal, voice: 'bench/add-stage' })
}

/** The bench remove-stage wire door caller (the drill's Remove path).
 *  The doc holds stage/expect_rev. */
export async function removeStageWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await wireCall('bench/remove-stage', { sessionKey: 'main', doc }, { signal, voice: 'bench/remove-stage' })
}

/** The bench reorder wire door caller (the drag-reorder path). Doc:
 *  stage/to/expect_rev — `to` is the post-splice target index. */
export async function reorderStageWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await wireCall('bench/reorder', { sessionKey: 'main', doc }, { signal, voice: 'bench/reorder' })
}

/** The bench group wire door caller (the Group Cards sub-view):
 *  stages = 2+ ids (bench order applied server-side). */
export async function groupStagesWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await wireCall('bench/group', { sessionKey: 'main', doc }, { signal, voice: 'bench/group' })
}

/** The bench ungroup wire door caller: spill a compound's children. */
export async function ungroupStageWire(doc: Record<string, unknown>, signal?: AbortSignal): Promise<Record<string, unknown>> {
  return await wireCall('bench/ungroup', { sessionKey: 'main', doc }, { signal, voice: 'bench/ungroup' })
}
