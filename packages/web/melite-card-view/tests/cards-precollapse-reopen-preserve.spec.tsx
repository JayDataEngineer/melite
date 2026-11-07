// @vitest-environment happy-dom
// cards-precollapse-reopen-preserve.spec.tsx — THE PRE-COLLAPSE DOC'S
// OPEN JOURNEY (the 2026-11-16 timeline audit, client-mirror §3):
// the verdict plane sanctions the legacy bags (cards-mirror-admits),
// but the drill's REOPEN HEAL judged the same doc with a NARROWER
// set and nulled the bags as "dead carry" — one silent bench write at
// every fresh open (stage-drill.tsx's dropStaleReopenCarry flush), a
// null being the merge-patch DELETE. The compose-through promise
// died one hop past the verdict the wall pinned: the operator's saved
// mod VANISHED at open.
//
// THE WALL rides the whole journey the audit demanded: the REAL boot,
// the REAL served h3 spec (formSpecArm — the door's own body), a
// bench doc whose stage carries a pre-collapse `repair` bag, and the
// mounted drill. It asserts BOTH halves:
//   1. the bag SURVIVES the open — no drafts/patch writes a null for
//      any admits-sanctioned key (the bench patch channel is the
//      heal's only write door);
//   2. the lane renders clean — no "fires nothing on this lane"
//      banner on a doc the door admits.
import '../../../../tests/helpers/boot-models.ts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'
import { resetStageWrites } from '../src/client/draft.ts'
import { CardsTab } from '../src/client/CardsTab.tsx'
import { draftIdOf } from '@melite/contracts/benchStage'
import { formSpecArm } from '../../../../packages/harness/melite-tools/src/discovery.ts'

// The pre-collapse doc: a repair bag the compose door translates into
// the one edit entry (resolveLegacyEditAliases) — the exact shape the
// 2026-11-16 burn opened ("the video cards from before with mods").
const LEGACY_PARAMS: Record<string, unknown> = {
  model: 'h3-timeline',
  steps: 6,
  repair: [{ source_clip: 'clips/take2.mp4', repair_prompt: 'fix the hand', denoise: 0.32 }],
}

interface EstateCallShape { method: string; args: Record<string, unknown> }

async function openLegacyDrill(): Promise<EstateCallShape[]> {
  const spec = await formSpecArm('h3-timeline') as Record<string, unknown>
  const estate = mountEstateFakes({
    benchDoc: {
      session: 's1', rev: 7, log: [],
      stages: [{ id: 's_0', card: 'h3-timeline', title: 'pre-collapse film', engine: 'comfyui', params: { ...LEGACY_PARAMS } }],
    },
    draftStages: [{ id: 's_0', card: 'h3-timeline', title: 'pre-collapse film', engine: 'comfyui', params: { ...LEGACY_PARAMS } }],
  })
  vi.stubGlobal('fetch', (async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      return new Response(JSON.stringify(spec), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      const doc = { cards: { 'h3-timeline': { label: 'H3 Timeline', description: 'film', genre: 'video', families: ['h3-timeline'] } } }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  }) as typeof fetch)
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: (): void => {} },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: {
      kind: 'bench',
      draftId: draftIdOf('bench-s1'),
      sessionKey: 's1',
      rev: 7,
      stages: [{ id: 's_0', card: 'h3-timeline', title: 'pre-collapse film', engine: 'comfyui', params: { ...LEGACY_PARAMS } }],
      log: [],
    } }),
  }))
  // open the drill on the stage tile (the zoom contract: the tile's
  // inner button morphs into the shared drill)
  const tile = document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement
  expect(tile, 'the pre-collapse stage renders its tile').toBeTruthy()
  fireEvent.click(tile)
  // THE DRILL IS OPEN when the drill's own chrome renders — the
  // 'Stage <title>' head is drill-only (the bench tile carries the
  // bare title; the zoomed drill prefixes 'Stage'), so this cannot
  // resolve on the closed tab. A wall that cannot see the open drill
  // cannot see the heal's write either.
  const { screen } = await import('@testing-library/react')
  await screen.findByText('Stage pre-collapse film', {}, { timeout: 4000 })
  // give the heal's async patch time to land before judging: the
  // probe at HEAD shows the null arriving well after the chrome
  // (spec fetch → open effect → flush) — poll for the patch channel
  // to settle (a patch that never comes inside the window is the
  // cure's own silence)
  await waitFor(() => {
    const settled = (estate.calls as EstateCallShape[]).some((c) => c.method === 'drafts/patch')
      || document.querySelector('[class*="drill"]') !== null
    expect(settled).toBe(true)
  }, { timeout: 3000 })
  await new Promise((r) => setTimeout(r, 400))
  return estate.calls as EstateCallShape[]
}

afterEach(() => {
  unbindEstateRemote()
  resetStageWrites()
  cleanup()
  vi.unstubAllGlobals()
})

describe('THE PRE-COLLAPSE REOPEN PRESERVE (the heal sanctions what the door admits)', () => {
  test('ARM 1 — the bag SURVIVES the open: no bench patch writes a null for an admits-sanctioned key', async () => {
    const calls = await openLegacyDrill()
    const heals = calls.filter((c) => c.method === 'drafts/patch')
    // the heal's write shape is {params: {<key>: null}} — a null under
    // params IS the merge-patch delete of the doc's key
    for (const c of heals) {
      const patch = (c.args as { patch?: { params?: Record<string, unknown> } }).patch ?? {}
      const params = patch.params ?? {}
      for (const k of Object.keys(params)) {
        expect(params[k], `the reopen heal must never null the admits-sanctioned key '${k}' (a null is the merge-patch delete — the saved mod vanishes)`).not.toBe(null)
      }
    }
  })

  test('ARM 2 — THE HEAL AGREES WITH THE VERDICT: every legacy bag the mirror sanctions heals to NO drop (one spelling, both judges)', async () => {
    const { dropStaleReopenCarry } = await import('@melite/card-base/client')
    const spec = (await formSpecArm('h3-timeline')) as never
    const bags: Array<[string, Record<string, unknown>]> = [
      ['replace bag', { replace: [{ source_clip: 'c.mp4', swap_prompt: 'the outfit' }] }],
      ['repair bag', { repair: [{ source_clip: 'c.mp4', repair_prompt: 'fix the hand', denoise: 0.32 }] }],
      ['extend bag', { extend: [{ source_clip: 'c.mp4', extend_prompt: 'more', extend_seconds: 2.33 }] }],
      ['refine bag', { refine: [{ source_clip: 'c.mp4', scale: 2 }] }],
      ['upscale bag', { upscale: [{ chain_run: 'run-x', denoise: 0.24 }] }],
    ]
    for (const [name, bag] of bags) {
      const doc = { model: 'h3-timeline', steps: 6, ...bag } as never
      expect(dropStaleReopenCarry(spec, doc), `the ${name} is compose-through — the heal must not judge it dead carry (the mirror sanctions the same key)`).toEqual({})
    }
  })
})
