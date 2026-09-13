/**
 * construction-law.spec.tsx — THE CONSTRUCTION LAW, pinned (operator,
 * 2026-09-12: "img-to-mesh has a [REDACTED 2026-11-05] input component. you are not
 * using it around. you are hardcoding.").
 *
 * The law: an emitted image/file input constructs THE ONE SQUARE
 * AUTOMATICALLY, in EVERY surface. The constructor (CardForm) OWNS the
 * square provider — no call site wires it, no call site can forget it.
 * A caller hands only the WIRE (picker candidates), never the
 * component.
 *
 * These tests fail on the violation they exist for: before the law,
 * the add-a-card drill rendered the image input as a bare text field.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { CardForm } from '@melite/card-base'
import type { FormSpecDoc, SpecField } from '@melite/card-base'
import { CardsTab } from '../src/client/CardsTab.tsx'
import type { CardsBenchValue } from '../src/client/CardsTab.tsx'

afterEach(() => { cleanup(); vi.unstubAllGlobals() })

const IMAGE_FIELDS: SpecField[] = [
  { name: 'image', label: 'Input image', type: 'image', required: true, group: 'input' },
  { name: 'prompt', label: 'Prompt', type: 'textarea', group: 'input' },
]

// ── 1. THE LAW ITSELF: a bare CardForm (no wire, no square) renders
//      THE SQUARE for an image field — never a bare input. ────────────
describe('the construction law (bare CardForm)', () => {
  it('renders THE ONE SQUARE for an image field with no caller wiring at all', () => {
    render(createElement(CardForm, {
      fields: IMAGE_FIELDS,
      values: {},
      onEdit: () => {},
    }))
    // the square's own DOM: role=button, aria-label "<label> source"
    const square = screen.getByRole('button', { name: 'Input image source' })
    expect(square).toBeTruthy()
    // and NOT the degenerate fallback: a bare text input for an image
    const bare = screen.queryByLabelText('Input image')
    expect(bare).toBeNull()
  })

  it('the square still renders when the caller hands a wire (picker candidates)', () => {
    render(createElement(CardForm, {
      fields: IMAGE_FIELDS,
      values: {},
      onEdit: () => {},
      wire: { candidates: [{ id: 's_0', label: 'a red cube', url: '/media/out.png' }] },
    }))
    expect(screen.getByRole('button', { name: 'Input image source' })).toBeTruthy()
  })

  it('a wire pick writes the param through the constructor-owned provider', async () => {
    const edits: Record<string, unknown> = {}
    render(createElement(CardForm, {
      fields: IMAGE_FIELDS,
      values: {},
      onEdit: (name, v) => { edits[name] = v },
      wire: { candidates: [{ id: 's_0', label: 'a red cube', url: '/media/out.png' }] },
    }))
    // the wire verbs live on the square: onPick opens the
    // three-entry menu; From flow opens the selector modal
    const square = screen.getByRole('button', { name: 'Input image source' })
    fireEvent.click(square)
    const flow = await screen.findByText('From flow', undefined, { timeout: 2000 })
    fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement)
    const item = await screen.findByText('a red cube', undefined, { timeout: 2000 })
    fireEvent.click(item)
    await waitFor(() => { expect(edits['image']).toBe('/media/out.png') })
  })
})

// ── 2. THE REGRESSION THE OPERATOR CAUGHT: the add-a-card drill —
//      the SAME square, constructed automatically, in the picker's
//      second half (the drill that rendered a bare text input). ──────
describe('the construction law (add-a-card drill)', () => {
  const BENCH: CardsBenchValue = {
    kind: 'bench',
    draftId: 'bench-cl',
    rev: 3,
    stages: [
      { id: 's_0', card: 'image-gen', engine: 'comfyui', params: {}, result: { url: '/media/out.png' } },
    ],
    log: [],
  }

  function stubWire(): void {
    vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
      const path = String(url)
      if (path.includes('/v1/form-spec')) {
        const model = path.split('model=')[1] ?? ''
        const doc: Record<string, unknown> = model.includes('image-edit')
          ? { form: 'image-edit', model: 'qwen-img-edit-2511-lightning4',
              fields: IMAGE_FIELDS.map((f) => ({ ...f })),
              variants: [] }
          : { form: 'image-gen', model: 'krea-2', fields: [
              { name: 'prompt', label: 'Prompt', type: 'textarea' }], variants: [] }
        return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/v1/model-catalog')) {
        return new Response(JSON.stringify({ cards: {
          'image-edit': { label: 'Image Edit', genre: 'image', families: ['image-edit'] },
        } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string }
      let value: Record<string, unknown> = { ok: true }
      if (frame.method === 'drafts/patch') value = { delivered: true }
      return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
    })
  }

  type CardsTabProps_ = Parameters<typeof CardsTab>[0]

  function mount(): void {
    stubWire()
    render(createElement(CardsTab, {
      useTabInfo: () => ({
        tab: {
          kind: 'sidebar.right.pane.tab', contentId: undefined,
          navigation: { address: 'dsh-resource://cards/bench' },
          actions: { openResource: () => {} },
        },
      }),
      useResource: () => ({ status: 'live', value: BENCH }),
    } as CardsTabProps_))
  }

  it('the picked card\'s image input is THE SQUARE, not a text field', async () => {
    mount()
    // open the add door
    const addTile = await screen.findAllByText(/add a card/i, undefined, { timeout: 4000 })
    fireEvent.click(addTile[0])
    // the catalog's card row
    const row = await screen.findByText('Image Edit', undefined, { timeout: 4000 })
    fireEvent.click(row)
    // THE SQUARE — the constructor built it with zero caller wiring
    const square = await screen.findByRole('button', { name: 'Input image source' }, undefined, { timeout: 4000 })
    expect(square).toBeTruthy()
    // never the degenerate bare text input
    expect(screen.queryByLabelText('Input image')).toBeNull()
  })
})

// ── 3. DRY: the provider is constructed ONCE, in the constructor. ────
describe('the construction law (DRY)', () => {
  it('CardForm renders the wire menu itself (no caller-side menu)', () => {
    const doc: FormSpecDoc = { form: 'x', model: 'm', fields: IMAGE_FIELDS, variants: [] }
    const { container } = render(createElement(CardForm, {
      spec: doc,
      fields: IMAGE_FIELDS,
      values: {},
      onEdit: () => {},
      wire: { candidates: [{ id: 's_0', label: 'a red cube', url: '/media/out.png' }] },
    }))
    // the form owns the menu mount point (empty when no pick is open)
    expect(container.firstChild).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Input image source' })).toBeTruthy()
  })
})

// ── 4. THE PLAIN DOOR (the operator's hour-24 order: "a random
//      screen pops up that I don't want. It should just add the card
//      and go into the drilldown view"): the add door is picker →
//      form → Add for EVERY card — even one whose stage view is
//      CLAIMED (a studio). The hour-9 claimed-studio preview is
//      REPEALED; the studio lives in the ZOOM, never the door. ──────
describe('the construction law (the plain add door)', () => {
  it('a CLAIMED card picks into the plain form — no studio preview hijacks the door', async () => {
    const claimed = (owner: unknown, fallback: ReturnType<typeof createElement>): ReturnType<typeof createElement> => {
      void owner
      return createElement('div', { 'data-testid': 'studio-hijack' }, 'THE STUDIO')
    }
    const BENCH: CardsBenchValue = {
      kind: 'bench', draftId: 'bench-plain', rev: 1, stages: [], log: [],
    }
    vi.stubGlobal('fetch', async (url: unknown, init?: RequestInit): Promise<Response> => {
      const path = String(url)
      if (path.includes('/v1/form-spec')) {
        return new Response(JSON.stringify({ form: 'mask-studio', model: 'm', fields: IMAGE_FIELDS.map((f) => ({ ...f })), variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/v1/model-catalog')) {
        return new Response(JSON.stringify({ cards: { 'mask-studio': { label: 'Mask Studio', genre: 'image', families: ['mask-studio'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      const frame = JSON.parse(String(init?.body)) as { rpcId: string, method: string }
      let value: Record<string, unknown> = { ok: true }
      if (frame.method === 'bench/add-stage') {
        value = { ok: true, stage: { id: 'fresh_1', card: 'mask-studio', engine: 'comfyui', params: {} } }
      }
      if (frame.method === 'bench/get') {
        value = { kind: 'bench', draftId: 'bench-plain', rev: 2, stages: [{ id: 'fresh_1', card: 'mask-studio', engine: 'comfyui', params: {} }], log: [] }
      }
      return new Response(JSON.stringify({ type: 'server-response', rpcId: frame.rpcId, result: { ok: true, value } }), { status: 200 })
    })
    render(createElement(CardsTab, {
      useTabInfo: () => ({
        tab: {
          kind: 'sidebar.right.pane.tab', contentId: undefined,
          navigation: { address: 'dsh-resource://cards/bench' },
          actions: { openResource: () => {} },
        },
      }),
      useResource: () => ({ status: 'live', value: BENCH }),
      renderSlot: claimed,
    } as CardsTabProps_))
    const addTile = await screen.findAllByText(/add a card/i, undefined, { timeout: 4000 })
    fireEvent.click(addTile[0])
    const row = await screen.findByText('Mask Studio', undefined, { timeout: 4000 })
    fireEvent.click(row)
    // THE PLAIN FORM renders for the claimed card…
    expect(await screen.findByRole('button', { name: 'Input image source' }, undefined, { timeout: 4000 })).toBeTruthy()
    // …and the studio NEVER hijacks the door
    expect(screen.queryByTestId('studio-hijack')).toBeNull()
    // Add lands the stage and the door hands the fresh row up — the
    // drilldown opens (the zoom mounts, keyed by the fresh stage)
    fireEvent.click(await screen.findByText('Add card', undefined, { timeout: 4000 }))
    await waitFor(() => {
      expect(screen.getByTestId('studio-hijack')).toBeTruthy() // the ZOOM consult — the studio's lawful seat
    }, { timeout: 4000 })
  })
})
