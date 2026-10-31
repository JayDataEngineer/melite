/**
 * THE AGENT-RUN → TIMELINE-STRIP JOURNEY WALL (operator 2026-10-31:
 * "when the AI uses a mod to make a video in the video timeline,
 * the timeline card isn't updated visually").
 *
 * WHAT THIS OWNS: the DOCUMENT half of the journey — the exact
 * write sequence every agent-run carrier stamps onto the bench
 * stage, driven through the REAL drafts door (DraftsRemoteService
 * over a real json+domain storage stack, never a mocked patch
 * applier), read back through the REAL stage-view projection, and
 * harvested through the h3 strip's ONE owner (stageHistoryRows).
 * Every carrier's body is the LITERAL shape its source builds:
 *   - the agent's live stamp and terminal stamp — melite-flow's
 *     observeAndAttribute (packages/harness/melite-tools/src/
 *     tools/melite-flow.ts:802 live, :780 terminal);
 *   - the settle mirror's husk — settleMirrorPatches
 *     (packages/harness/estate-queue/src/runsRegistry.ts:3071),
 *     which can land FIRST when the agent session dies before the
 *     run settles (attribution-outlives-the-call is bounded).
 *
 * THE OTHER HALF (the LIVE half — an open studio following these
 * writes without a reload) lives in the browser lane:
 * packages/web/melite-card-view/e2e/. This wall pins the document
 * truth those arms ride; a browser arm cannot cure a carrier that
 * never writes, and this wall cannot cure a view that never
 * re-renders. The freeze the operator reported is live at exactly
 * one of the two — both now carry a judge.
 *
 * THE JOURNEY-LAW SEAT: the burn is felt at the strip (the studio
 * never shows the film); this wall judges at the doc hop (one
 * upstream of the felt hop) because that hop is where every
 * carrier's write converges — the mutation that kills an arm here
 * is a carrier whose write stops feeding the strip, which is the
 * freeze class itself.
 */
import { describe, expect, test } from 'vitest'
import {
  bootCtx,
  sig,
} from '../../../../packages/estate/drafts/tests/bench-helpers.ts'
import { ensureBench } from '../../../../packages/estate/drafts/src/bench.ts'
import { DraftsRemoteService } from '../../../../packages/estate/drafts/src/remote.ts'
import type { DraftsDomainSpec } from '../../../../packages/estate/drafts/src/spec.js'
import type { Domain } from '@deepseek-ai/dsh-storage-domain'
import { draftIdOf } from '@melite/contracts/benchStage'
import {
  isLiveRunStatus,
  projectStageView,
  type StageViewOwnerProps,
} from '../../../../packages/web-kit/contracts/src/stageView.ts'
import { stageHistoryRows } from '../../../../packages/video/h3-timeline/src/ui/studio/projection.ts'

/** The h3 window-film spelling the family actually lands (the
 * strip's window regex admits it; a foo.mp4 would test a different
 * law — genre filtering — than the one that burned). */
const FILM = 'h3_t4_w0_1_0_.mp4'
const RID = 'run-agent0x42'
const MEDIA_URL = `/melite-media/runs/${RID}/${FILM}`

/** The agent's TERMINAL body, verbatim shape from melite-flow's
 * settle stamp: url + the artifacts name map + the flat assetUrls
 * list, urls already rewritten to the media route. */
function agentTerminalResult(): Record<string, unknown> {
  return {
    run_id: RID,
    url: MEDIA_URL,
    artifacts: { [FILM]: MEDIA_URL },
    assetUrls: [MEDIA_URL],
  }
}

/** The settle mirror's husk, verbatim shape from
 * settleMirrorPatches: run_id + ONE media url, no artifacts map. */
function mirrorHuskResult(): Record<string, unknown> {
  return { run_id: RID, url: MEDIA_URL }
}

async function bootStage(): Promise<DraftsRemoteService> {
  const { ctx, domain } = await bootCtx()
  const svc = new DraftsRemoteService(ctx)
  await ensureBench(domain, { session: 'main', stages: [{ id: 's_0' }] })
  return svc
}

/** Read the stage row through the door, project it through the
 * REAL stage view (the same projection the studio's tenant props
 * ride), and hand the projected stage to the strip's one owner. */
async function stripOf(svc: DraftsRemoteService): Promise<{
  row: Record<string, unknown>
  projected: ReturnType<typeof projectStageView>
  chips: ReturnType<typeof stageHistoryRows>
}> {
  const doc = await svc.get(draftIdOf('bench-main'), sig)
  const row = (doc['stages'] as Array<Record<string, unknown>>).find((s) => s['id'] === 's_0')!
  const owner: StageViewOwnerProps = {
    stageId: 's_0',
    cardName: 'h3-timeline',
    row,
    runStatus: typeof row['runStatus'] === 'string' ? row['runStatus'] : '',
    onPatch: () => {},
    onRun: () => {},
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    upstream: [],
    runId: null,
  }
  const projected = projectStageView(owner)
  return { row, projected, chips: stageHistoryRows(projected) }
}

describe('THE AGENT-RUN → TIMELINE-STRIP JOURNEY (the doc half of the 2026-10-31 freeze)', () => {
  test('A: the agent sequence lands a strip chip — live stamp, then the terminal body, through the real door', async () => {
    const svc = await bootStage()
    // the agent's LIVE stamp (observeAndAttribute:802): run_id only
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'running', result: { run_id: RID } }, 0, sig)
    // the agent's TERMINAL stamp (observeAndAttribute:780): the rich body
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'done', result: agentTerminalResult() }, 0, sig)

    const { row, projected, chips } = await stripOf(svc)
    expect(row['runStatus'], 'the row settles for the watching tab').toBe('done')
    expect(projected.history?.length, 'the projection carries the trail (stageView.ts:396)').toBe(1)
    expect(chips.length, 'the strip harvests ONE chip for the film').toBe(1)
    expect(chips[0]?.video, 'the chip links the run media url').toBe(MEDIA_URL)
    expect(chips[0]?.runId, 'the chip names the agent run').toBe(RID)
  })

  test('B: the mirror husk landing FIRST never blocks the rich face — one chip either way (the dead-agent arm)', async () => {
    const svc = await bootStage()
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'running', result: { run_id: RID } }, 0, sig)
    // the settle mirror lands the husk (the agent session died mid-run)
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'done', result: mirrorHuskResult() }, 0, sig)
    // the rich face lands after (a re-armed attribution, a live tab)
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'done', result: agentTerminalResult() }, 0, sig)

    const { chips } = await stripOf(svc)
    expect(chips.length, 'one run is one chip whatever spelling each carrier used').toBe(1)
    expect(chips[0]?.video).toBe(MEDIA_URL)
  })

  test('C: the live stamp alone reads LIVE to the tab reconcile and mints NO chip (W1 at the strip seam)', async () => {
    const svc = await bootStage()
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'running', result: { run_id: RID } }, 0, sig)

    const { row, chips } = await stripOf(svc)
    expect(isLiveRunStatus(String(row['runStatus'])),
      'the open tab\'s reconcile trigger (cards-resource.ts:935 reads this classifier) adopts the row').toBe(true)
    expect(chips, 'a mid-run face never archives — the operator never sees a running film in history').toEqual([])
  })

  test('D: THE FROZEN SIGNATURE — a row whose only carrier died reads live forever, and no doc-side law heals it', async () => {
    const svc = await bootStage()
    // the agent stamped live, then the session died before terminal;
    // the settle mirror mis-targeted (benchStageId absent on this
    // run) — the row is the operator's frozen tile, verbatim
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'running', result: { run_id: RID } }, 0, sig)

    const { row, chips } = await stripOf(svc)
    expect(isLiveRunStatus(String(row['runStatus'])),
      'with no terminal carrier the row stays live — THIS is the freeze; the browser-lane reconcile arms are the cure class').toBe(true)
    expect(chips).toEqual([])
    // and the honest contrast: a url-less terminal (a failed run)
    // settles the row and mints no chip — empty-but-done is honest,
    // empty-and-live is the freeze. The two faces must never fold.
    await svc.patch(draftIdOf('bench-main'), 's_0',
      { runStatus: 'failed', result: { run_id: RID, error: 'engine refused' } }, 0, sig)
    const settled = await stripOf(svc)
    expect(settled.row['runStatus']).toBe('failed')
    expect(isLiveRunStatus(String(settled.row['runStatus']))).toBe(false)
    expect(settled.chips).toEqual([])
  })
})
