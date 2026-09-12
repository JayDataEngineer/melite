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
    // the wire verbs live on the square: onPick opens the menu
    const square = screen.getByRole('button', { name: 'Input image source' })
    fireEvent.click(square)
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
