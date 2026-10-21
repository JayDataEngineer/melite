// @vitest-environment happy-dom
/**
 * cards.stage.view — the keyed stage-surface slot (the ui-tool
 * 'tool.call.toolview' law, mirrored). Pins BOTH arms of the contract:
 *
 *   registered key → the card plugin's view takes over the whole
 *   drill detail (pure function of the owner currency: stageId,
 *   cardName, frozen row, runStatus, the host verbs)
 *
 *   unclaimed key (or no renderSlot at all) → the generic form-spec
 *   card renders — the fallback IS the form, verbatim.
 */
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'
import { createElement } from 'react'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'

import { CardsTab } from '../src/client/CardsTab.tsx'
import { schemaEnvelope } from '@melite/card-base/client'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'
import type { StageViewOwnerProps } from '../src/client/types.ts'

const BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: 'bench-sv',
  sessionKey: 'sv',
  rev: 3,
  stages: [
    { id: 's_0', card: 'image-gen', engine: 'comfyui', params: { prompt: 'a red cube' } },
    { id: 's_1', card: 'tagger', engine: 'comfyui', params: {} },
  ],
  log: [],
}

function stubWire(): void {
  // THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
  // namespaces; fetch answers ONLY the /v1 discovery doors.
  mountEstateFakes()
  vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      const model = path.split('model=')[1] ?? ''
      const doc = model.includes('image-gen')
        ? { form: 'image-gen', schema: schemaEnvelope({
            prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
          }) }
        : { form: 'tagger', schema: schemaEnvelope({
            threshold: { type: 'number', meta: { description: 'Threshold', default: 0.5, step: 0.1 } },
          }) }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  })
}

function mount(renderSlot?: CardsTabProps_['renderSlot']): void {
  render(createElement(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: BENCH }),
    ...(renderSlot === undefined ? {} : { renderSlot }),
  }))
}

// local spelling of the prop (avoids importing the component type twice)
type CardsTabProps_ = Parameters<typeof CardsTab>[0]

function tileButton(): HTMLElement {
  const el = document.querySelectorAll('[role="button"][class*="tileInner"]')[0]
  if (el === undefined) throw new Error('tile button not found')
  return el as HTMLElement
}

afterEach(() => {
  cleanup()
  unbindEstateRemote()
  vi.unstubAllGlobals()
})

test('a registered key takes over the whole drill (owner currency rides)', async () => {
  stubWire()
  const seen: StageViewOwnerProps[] = []
  const user = userEvent.setup()
  // the slot system's dispatch, doubled: image-gen claimed, rest fall back
  const renderSlot = ((key: 'cards.stage.view', owner: StageViewOwnerProps, opts?: { fallback?: unknown }) => {
    if (owner.cardName === 'image-gen') {
      seen.push(owner)
      return createElement('div', { 'data-testid': 'studio-view' },
        'STUDIO ' + owner.cardName + ' stage ' + owner.stageId)
    }
    return (opts?.fallback ?? null) as ReturnType<typeof createElement>
  }) as CardsTabProps_['renderSlot']
  mount(renderSlot)
  await user.click(tileButton())
  // the skeleton settle applies to takeover views too (same morph)
  const view = await screen.findByTestId('studio-view', {}, { timeout: 4000 })
  expect(view.textContent).toContain('STUDIO image-gen stage s_0')
  // the generic form did NOT render alongside (takeover, not compose)
  expect(screen.queryByText('Threshold')).toBeNull()
  // the owner currency is the bench's frozen truth
  const current = seen[seen.length - 1]
  expect(current?.row['params']).toEqual({ prompt: 'a red cube' })
  expect(current?.effective?.model).toBe('image-gen')
  expect(current?.effective?.params).toEqual({ prompt: 'a red cube' })
  expect(current?.effective?.inputSlots).toEqual(expect.any(Array))
  expect(current?.priorStageIds).toEqual([])
  expect(current?.runStatus).toBe('')
  expect(typeof seen[0]?.onRun).toBe('function')
  expect(typeof seen[0]?.onPatch).toBe('function')
  expect(typeof seen[0]?.onWireSlot).toBe('function')
})

test('an unclaimed key renders the generic form-spec card (the fallback IS the form)', async () => {
  stubWire()
  const user = userEvent.setup()
  const renderSlot = ((_key: 'cards.stage.view', _owner: StageViewOwnerProps, opts?: { fallback?: unknown }) =>
    (opts?.fallback ?? null)) as CardsTabProps_['renderSlot']
  mount(renderSlot)
  // tile 2 is tagger — unclaimed by the double above
  const tiles = document.querySelectorAll('[role="button"][class*="tileInner"]')
  await user.click(tiles[1] as HTMLElement)
  expect(await screen.findByText('Threshold', {}, { timeout: 4000 })).toBeTruthy()
})

test('no renderSlot at all (legacy mounts): the form renders, nothing throws', async () => {
  stubWire()
  const user = userEvent.setup()
  mount()
  await user.click(tileButton())
  expect(await screen.findByText('Prompt', {}, { timeout: 4000 })).toBeTruthy()
})
