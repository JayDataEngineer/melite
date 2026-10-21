/**
 * card-labels.spec.ts — THE PROFESSIONAL-NAME LAW (operator
 * 2026-11-06): the zoomed-out tile and the zoomed-in drill face the
 * catalog's label for the stage's card ('Generate Image'), never
 * the card id ('image-gen' / title-cased 'Image Gen'). Arms: the
 * distillation resolves both faces through one stub resolver; no
 * resolver keeps today's id faces exactly; the user's own stage
 * title beats the catalog on both faces; groups never take a card
 * name; a card the catalog does not know keeps the id faces. The
 * mounted arms ride the real CardsTab (stubbed wire): the tile
 * faces the label and the zoomed drill + bar face it too; a
 * catalog that knows no label keeps the old faces (the name is
 * never a failure).
 */
// @vitest-environment happy-dom
import { afterEach, describe, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement as h } from 'react'
import { benchRow, CardsTab } from '../src/client/CardsTab'
import { SortableTile } from '../src/client/sortable-tile.tsx'
import type { CardRowLineTabRow } from '../src/client/bench-row.ts'
import type { CardsBenchValue } from '../src/client/cards-resource.ts'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote, schemaEnvelope } from '@melite/card-base/client'
import { resetCardFamiliesCache } from '@melite-plugin/melite-run-wire'
import { resetStageWrites } from '../src/client/draft.ts'

afterEach(() => {
  unbindEstateRemote()
  resetStageWrites()
  // the mounted arms share the wire's per-boot catalog cache — each
  // arm starts cold so the armed catalog (or its absence) is what
  // the faces resolve, never the previous arm's rows.
  resetCardFamiliesCache()
  cleanup()
  vi.unstubAllGlobals()
})

const stage = (over: Record<string, unknown> = {}) => ({
  id: 's1', card: 'image-gen', runStatus: 'done', params: {}, inputs: {},
  ...over,
})

const labels = (card: string): string | null =>
  card === 'image-gen' ? 'Generate Image' : null

describe('benchRow professional names', () => {
  test('an untitled stage faces the catalog label on both faces', () => {
    const row = benchRow(stage() as never, undefined, labels)
    expect(row.title).toBe('Generate Image')
    expect(row.kind).toBe('image-gen')
    expect(row.kindLabel).toBe('Generate Image')
  })

  test('no resolver: today\'s id faces, exactly', () => {
    const row = benchRow(stage() as never)
    expect(row.title).toBe('image-gen')
    expect(row.kindLabel).toBeNull()
  })

  test('the user\'s own title beats the catalog', () => {
    const row = benchRow(stage({ title: 'my cover art' }) as never, undefined, labels)
    expect(row.title).toBe('my cover art')
    expect(row.kindLabel).toBe('Generate Image')
  })

  test('a group never takes a card name', () => {
    const row = benchRow(stage({ card: 'group', children: [{}, {}] }) as never, undefined, labels)
    expect(row.kindLabel).toBeNull()
    expect(row.title).not.toBe('Generate Image')
  })

  test('a card the catalog does not know keeps the id faces', () => {
    const row = benchRow(stage({ card: 'mystery-card' }) as never, undefined, labels)
    expect(row.title).toBe('mystery-card')
    expect(row.kindLabel).toBeNull()
  })
})

/** the tile's kind face renders the resolved label (direct mount —
 *  the gate-r7b-tile harness shape, no wire). */
function mountTile(row: CardRowLineTabRow): void {
  const noop = (): void => {}
  render(h('ol', null, h(SortableTile, {
    row,
    entered: false,
    onOpen: noop,
    grouping: false,
    selected: false,
    onToggleSelect: noop,
    onAssetAttach: noop,
    dragging: false,
    dragOver: false,
    onReorderStart: noop,
    onReorderOver: noop,
    onReorderDrop: noop,
    onRun: noop,
    onStop: noop,
    onRemove: noop,
    activeRunId: null,
  })))
}

describe('the mounted tile kind face', () => {
  test('a labeled row faces the label, never the id', () => {
    mountTile(benchRow(stage() as never, undefined, labels))
    const face = document.querySelector('[data-kind="image-gen"]')
    expect(face).not.toBeNull()
    // the hook stays the id (CSS + tests key on it); the eye gets prose
    expect(within(face as HTMLElement).getByText('Generate Image')).toBeTruthy()
    expect(within(face as HTMLElement).queryByText('Image Gen')).toBeNull()
  })

  test('an unlabeled row keeps the title-cased id face', () => {
    mountTile(benchRow(stage() as never))
    const face = document.querySelector('[data-kind="image-gen"]')
    expect(within(face as HTMLElement).getByText('Image Gen')).toBeTruthy()
  })
})

/** the zoomed faces ride the real CardsTab (the card-drill.spec
 *  wire shape: estate fakes + fetch answering only the discovery
 *  doors). The stage is UNTITLED — the faces must resolve the name
 *  themselves. */
const UNTITLED_BENCH: CardsBenchValue = {
  kind: 'bench',
  draftId: 'bench-s1',
  sessionKey: 's1',
  rev: 7,
  stages: [
    {
      id: 's_0',
      card: 'image-gen',
      engine: 'comfyui',
      params: { prompt: 'a red cube', steps: 8, turbo: false },
    },
  ],
  log: [],
}

function stubDiscovery(cards: Record<string, unknown>): void {
  mountEstateFakes({})
  const impl = async (url: unknown): Promise<Response> => {
    const path = String(url)
    if (path.includes('/v1/form-spec')) {
      const doc = {
        form: 'image-gen', genre: 'image', engine: 'comfyui',
        schema: schemaEnvelope({
          prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
        }),
      }
      return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    if (path.includes('/v1/model-catalog')) {
      return new Response(JSON.stringify({ cards }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    throw new Error('estate door on the fetch lane: ' + path)
  }
  vi.stubGlobal('fetch', impl)
}

function mountTab(): void {
  const noop = (): void => {}
  render(h(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: 'sidebar.right.pane.tab', contentId: undefined,
        navigation: { address: 'dsh-resource://cards/bench' },
        actions: { openResource: noop },
      },
    }),
    useResource: () => ({ status: 'live' as const, value: UNTITLED_BENCH }),
  }))
}

function tileButton(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]')
  if (el === null) throw new Error('tile button not found')
  return el as HTMLElement
}

describe('the mounted zoom faces', () => {
  test('tile, zoom bar and drill face the catalog label', async () => {
    stubDiscovery({ 'image-gen': { label: 'Generate Image', description: 'generate an image', genre: 'image', families: ['image-gen'] } })
    const user = userEvent.setup()
    mountTab()
    const tile = tileButton()
    // the catalog read lands after mount (the faces arrive on the
    // re-render — findAllBy waits for exactly that); BOTH faces
    // name the card (the kind face + the caption title)
    const hits = await within(tile).findAllByText('Generate Image', {}, { timeout: 5000 })
    expect(hits.length).toBe(2)
    expect(within(tile).queryByText('Image Gen')).toBeNull()
    expect(within(tile).queryByText('image-gen')).toBeNull()
    await user.click(tile)
    // the zoomed view's title faces the professional name (the bar
    // IS the zoomed card's title — the drill body is title-less by
    // design, params + preview only)…
    expect(await screen.findByText('Stage Generate Image', {}, { timeout: 5000 })).toBeTruthy()
    // …and no shorthand survives anywhere on the zoomed card, while
    // the drill itself is alive underneath (its fields render)
    const card = document.querySelector('div[class*="zoomCard"]')
    expect(card).not.toBeNull()
    expect(within(card as HTMLElement).queryByText('image-gen')).toBeNull()
    expect(within(card as HTMLElement).queryByText('Image Gen')).toBeNull()
    expect(await within(card as HTMLElement).findByText('Prompt', {}, { timeout: 5000 })).toBeTruthy()
  })

  test('a catalog that knows no label keeps the old faces', async () => {
    stubDiscovery({})
    const user = userEvent.setup()
    mountTab()
    const tile = tileButton()
    expect(within(tile).getByText('image-gen')).toBeTruthy()
    expect(within(tile).getByText('Image Gen')).toBeTruthy()
    await user.click(tile)
    expect(await screen.findByText('Stage image-gen', {}, { timeout: 5000 })).toBeTruthy()
  })

  test('a catalog that FAILS keeps the old faces (the name is never a failure)', async () => {
    // the read itself refuses while the tab is live — the hook's
    // catch resolves the empty map (no second voice, no throw), the
    // faces stay exactly today's, and the zoom still opens by id.
    mountEstateFakes({})
    vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
      const path = String(url)
      if (path.includes('/v1/form-spec')) {
        const doc = {
          form: 'image-gen', genre: 'image', engine: 'comfyui',
          schema: schemaEnvelope({
            prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } },
          }),
        }
        return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/v1/model-catalog')) throw new Error('catalog down')
      throw new Error('estate door on the fetch lane: ' + path)
    })
    const user = userEvent.setup()
    mountTab()
    const tile = tileButton()
    await user.click(tile)
    // everything after the click runs strictly after the refusal
    // landed (user-event flushes) — the zoom names the id face…
    expect(await screen.findByText('Stage image-gen', {}, { timeout: 5000 })).toBeTruthy()
    // …and the tile never blanked waiting for a name
    expect(within(tile).getByText('image-gen')).toBeTruthy()
    expect(within(tile).getByText('Image Gen')).toBeTruthy()
  })
})
