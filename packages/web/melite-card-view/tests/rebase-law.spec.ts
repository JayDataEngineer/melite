// rebase-law.spec.ts — THE STUCK CURE's own wall (2026-09-15).
// The operator's burn, verbatim: "bench main moved: rev is 429,
// caller held 35 — IT STUCK. IT NEVER SUPPOSED TO BE STUCK." A tab
// rendered rev 35; the agent moved the shared bench to 429; every
// door refused and nothing recovered. The law now: a CAS refusal
// re-reads the rev and re-applies ONCE — a moved bench costs one
// silent rebase, never a bricked tab. A second conflict or a
// non-CAS refusal throws loud (the named truth).
//
// THE ONE-LANE LAW (stroke 81): the verbs ride the mounted bench
// namespace through mountEstateFakes — no fetch stub answers an
// estate verb. CAS refusals queue in `refusals` (the door's own
// voice, matched by the client's CAS matcher); the re-read serves
// the CURRENT rev from benchDoc; transport deaths queue in `throws`.
import { describe, expect, test, afterEach, vi } from 'vitest'
import { unbindEstateRemote } from '@melite/card-base'
import { mountEstateFakes } from './estate-harness.ts'
import { addStageWire, removeStageWire } from '../src/client/add-stage.ts'

afterEach(() => { unbindEstateRemote(); vi.unstubAllGlobals() })

/** One live-lane round trip log: [method, expect_rev]. */
interface Seen { method: string; expectRev: number | undefined }
function seenCalls(calls: Array<{ method: string; args: Record<string, unknown> }>): Seen[] {
  return calls.map((c) => ({
    method: c.method,
    expectRev: typeof (c.args['doc'] as Record<string, unknown> | undefined)?.['expect_rev'] === 'number'
      ? ((c.args['doc'] as Record<string, unknown>)['expect_rev'] as number)
      : undefined,
  }))
}

describe('the rebase law (a moved bench costs one silent rebase, never a stuck tab)', () => {
  test('THE EXACT BURN: held 35 vs rev 429 — the door rebases once and lands', async () => {
    const fakes = mountEstateFakes({
      // attempt 1 with the held rev refuses (the door's own voice);
      // the re-read serves the fresh truth (rev 429).
      refusals: [{ method: 'bench/add-stage', message: 'bench main moved: rev is 429, caller held 35' }],
      benchDoc: { rev: 429, stages: [{ id: 's_0' }], log: [] },
    })
    try {
      const row = await addStageWire({ card: 'image-edit', expect_rev: 35 }, 'main')
      // MEANING ADAPTED (dead-transport shape): the old envelope
      // stub answered {rev: 430, stage: 's_9'}; the live lane mints
      // the row itself — the landed stage is the fresh object, not a
      // scripted id. The law pinned is the rebase sequence + landing.
      expect(row['stage']).toMatchObject({ id: 'fresh_1', card: 'image-edit' })
      expect(seenCalls(fakes.calls)).toEqual([
        { method: 'bench/add-stage', expectRev: 35 },
        { method: 'bench/get', expectRev: undefined },
        { method: 'bench/add-stage', expectRev: 429 },
      ])
    } finally {
      fakes.unmount()
    }
  })

  test('conflicts on EVERY attempt throw loud — bounded, never a blind write, never a loop', async () => {
    const fakes = mountEstateFakes({
      refusals: [
        { method: 'bench/remove-stage', message: 'bench main moved: rev is 430, caller held 429' },
        { method: 'bench/remove-stage', message: 'bench main moved: rev is 431, caller held 430' },
        { method: 'bench/remove-stage', message: 'bench main moved: rev is 431, caller held 430' },
      ],
      benchDoc: { rev: 430, stages: [{ id: 's_1' }], log: [] },
    })
    try {
      await expect(removeStageWire({ stage: 's_1', expect_rev: 429 }, 'main'))
        .rejects.toThrow(/rev is 431, caller held 430/)
    } finally {
      fakes.unmount()
    }
  })

  test("THE THIRD VOICE (2026-10-09): 'moved under the patch' rebases the bench verbs too — the arm lives on every matcher", async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: 'bench/remove-stage', message: 'bench moved under the patch (expect_rev 4, current 5) — re-read and re-apply' }],
      benchDoc: { rev: 5, stages: [{ id: 's_1' }], log: [] },
    })
    try {
      await removeStageWire({ stage: 's_1', expect_rev: 4 }, 'main')
      expect(seenCalls(fakes.calls)).toEqual([
        { method: 'bench/remove-stage', expectRev: 4 },
        { method: 'bench/get', expectRev: undefined },
        { method: 'bench/remove-stage', expectRev: 5 },
      ])
    } finally {
      fakes.unmount()
    }
  })

  test('a non-CAS refusal is the named truth — no rebase, no retry', async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: 'bench/add-stage', message: "input 'image' wires stage 'stage-1' — no such stage on the bench" }],
    })
    try {
      await expect(addStageWire({ card: 'image-edit', expect_rev: 7, inputs: { image: { stage: 'stage-1' } } }, 'main'))
        .rejects.toThrow(/no such stage on the bench/)
      expect(fakes.calls).toHaveLength(1)
    } finally {
      fakes.unmount()
    }
  })

  test('a dead re-read leaves the original refusal standing', async () => {
    const fakes = mountEstateFakes({
      refusals: [{ method: 'bench/remove-stage', message: 'bench main moved: rev is 429, caller held 35' }],
      throws: [{ method: 'bench/get', message: 'network gone' }],
    })
    try {
      await expect(removeStageWire({ stage: 's_1', expect_rev: 35 }, 'main'))
        .rejects.toThrow(/rev is 429, caller held 35/)
    } finally {
      fakes.unmount()
    }
  })
})
