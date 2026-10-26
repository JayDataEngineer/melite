/**
 * construction-law.spec.tsx — THE CONSTRUCTION LAW, pinned (operator,
 * 2026-09-12: "img-to-mesh has a broken input component. you are not
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
import { CardForm, schemaEnvelope } from '@melite/card-base/client'
import type { FormSpecDoc, SpecField } from '@melite/card-base/client'
import { mountEstateFakes } from './estate-harness.ts'
import { unbindEstateRemote } from '@melite/card-base/client'
import { CardsTab } from '../src/client/CardsTab.tsx'
import type { CardsBenchValue } from '../src/client/CardsTab.tsx'
import { draftIdOf } from '@melite/contracts/benchStage';

// The tab's props (mirrors the cards-stage-view.spec pattern) — the
// plain-door describe below mounts outside the drill describe's scope.
type CardsTabProps_ = Parameters<typeof CardsTab>[0]

afterEach(() => { cleanup(); unbindEstateRemote(); vi.unstubAllGlobals() })

// THE ENVELOPE FIXTURE (the parameter audit): tests build the
// served schema (serialized schemastery shape) — the flat field row
// is gone; fieldsOf derives. Same declaration facts, one walker.
const IMAGE_SPEC: FormSpecDoc = {
  form: 'construction-fixture',
  schema: schemaEnvelope({
    image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image', required: true, group: 'input' } } },
    prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea', group: 'input' } } },
  }),
}

// ── 1. THE LAW ITSELF: a bare CardForm (no wire, no square) renders
//      THE SQUARE for an image field — never a bare input. ────────────
describe('the construction law (bare CardForm)', () => {
  it('renders THE ONE SQUARE for an image field with no caller wiring at all', () => {
    render(createElement(CardForm, {
      spec: IMAGE_SPEC,
      user: {},
      onPick: () => {},
      onSet: () => {},
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
      spec: IMAGE_SPEC,
      user: {},
      onPick: () => {},
      onSet: () => {},
      wire: { candidates: [{ id: 's_0', label: 'a red cube', url: '/media/out.png' }] },
    }))
    expect(screen.getByRole('button', { name: 'Input image source' })).toBeTruthy()
  })

  it('a wire pick writes the param through the constructor-owned provider', async () => {
    const edits: Record<string, unknown> = {}
    render(createElement(CardForm, {
      spec: IMAGE_SPEC,
      user: {},
      onPick: () => {},
      onSet: (name: string, v: unknown) => { edits[name] = v },
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
    draftId: draftIdOf('bench-cl'),
    sessionKey: 'cl',
    rev: 3,
    stages: [
      { id: 's_0', card: 'image-gen', engine: 'comfyui', params: {}, result: { url: '/media/out.png' } },
    ],
    log: [],
  }

  function stubWire(): void {
    // THE ONE-FAKE LAW (stroke 81): the add lands through the bound
    // bench namespace (add-stage appends, bench/get diffs the fresh
    // row); fetch answers ONLY the /v1 discovery doors.
    mountEstateFakes({
      benchDoc: { kind: 'bench', draftId: 'bench-cl', rev: 3, stages: BENCH.stages.map((s) => ({ ...s })), log: [] },
    })
    vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
      const path = String(url)
      if (path.includes('/v1/form-spec')) {
        const model = path.split('model=')[1] ?? ''
        const doc: Record<string, unknown> = model.includes('image-edit')
          ? { form: 'image-edit', model: 'qwen-img-edit-2511-lightning4',
              schema: IMAGE_SPEC.schema, variants: [] }
          : { form: 'image-gen', model: 'krea-2', schema: schemaEnvelope({
              prompt: { type: 'string', meta: { description: 'Prompt', extra: { wtype: 'textarea' } } } }), variants: [] }
        return new Response(JSON.stringify(doc), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/v1/model-catalog')) {
        return new Response(JSON.stringify({ cards: {
          'image-edit': { label: 'Image Edit', genre: 'image', families: ['image-edit'] },
        } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      throw new Error('estate door on the fetch lane: ' + path)
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
      useResource: () => ({ status: 'live' as const, value: BENCH }),
    } as CardsTabProps_))
  }

  it('the picked card adds STRAIGHT into its drill — no preadd screen, and its image input is THE SQUARE', async () => {
    mount()
    // open the add door
    const addTile = await screen.findAllByText(/add a card/i, undefined, { timeout: 4000 })
    fireEvent.click(addTile[0])
    // the catalog's card row — one click adds (the preadd form
    // screen is gone: no Add button, no back row, ever). By role:
    // the titled family pill echoes the label, so text is ambiguous.
    const row = await screen.findByRole('button', { name: /Image Edit/ }, { timeout: 4000 })
    fireEvent.click(row)
    expect(screen.queryByText('Add card')).toBeNull()
    // the add lands and the drill opens on the fresh row — THE
    // SQUARE rides the drill's own form (the constructor built it
    // with zero caller wiring)
    const square = await screen.findByRole('button', { name: 'Input image source' }, { timeout: 6000 })
    expect(square).toBeTruthy()
    // never the degenerate bare text input
    expect(screen.queryByLabelText('Input image')).toBeNull()
  })
})

// ── 3. DRY: the provider is constructed ONCE, in the constructor. ────
describe('the construction law (DRY)', () => {
  it('CardForm renders the wire menu itself (no caller-side menu)', () => {
    const doc: FormSpecDoc = { form: 'x', model: 'm', schema: IMAGE_SPEC.schema, variants: [] }
    const { container } = render(createElement(CardForm, {
      spec: doc,
      user: {},
      onPick: () => {},
      onSet: () => {},
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
  it('a CLAIMED card picks STRAIGHT into its drill — no preadd screen, no studio hijack of the door', async () => {
    // the studio stub, typed as the slot it stands in for (it
    // ignores the dispatch args and answers the hijack div verbatim).
    const claimed: CardsTabProps_['renderSlot'] = (_key, _owner, _opts) => {
      void _key; void _owner; void _opts
      return createElement('div', { 'data-testid': 'studio-hijack' }, 'THE STUDIO')
    }
    const BENCH: CardsBenchValue = {
      kind: 'bench', draftId: draftIdOf('bench-plain'), rev: 1, stages: [], log: [],
      sessionKey: 'plain',
    }
    mountEstateFakes({
      benchDoc: { kind: 'bench', draftId: 'bench-plain', rev: 1, stages: [], log: [] },
    })
    vi.stubGlobal('fetch', async (url: unknown): Promise<Response> => {
      const path = String(url)
      if (path.includes('/v1/form-spec')) {
        return new Response(JSON.stringify({ form: 'mask-studio', model: 'm', schema: IMAGE_SPEC.schema, variants: [] }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      if (path.includes('/v1/model-catalog')) {
        return new Response(JSON.stringify({ cards: { 'mask-studio': { label: 'Mask Studio', genre: 'image', families: ['mask-studio'] } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      }
      throw new Error('estate door on the fetch lane: ' + path)
    })
    render(createElement(CardsTab, {
      useTabInfo: () => ({
        tab: {
          kind: 'sidebar.right.pane.tab', contentId: undefined,
          navigation: { address: 'dsh-resource://cards/bench' },
          actions: { openResource: () => {} },
        },
      }),
      useResource: () => ({ status: 'live' as const, value: BENCH }),
      renderSlot: claimed,
    } as CardsTabProps_))
    const addTile = await screen.findAllByText(/add a card/i, undefined, { timeout: 4000 })
    fireEvent.click(addTile[0])
    const row = await screen.findByRole('button', { name: /Mask Studio/ }, { timeout: 4000 })
    fireEvent.click(row)
    // the pick IS the add — no preadd screen between: no Add button,
    // no back row, only the busy face on the picked row…
    expect(screen.queryByText('Add card')).toBeNull()
    expect(await screen.findByText('adding…', undefined, { timeout: 4000 })).toBeTruthy()
    // …and the studio NEVER hijacks the door (it renders nothing
    // until its lawful seat: the zoom drilldown of the fresh row)
    expect(screen.queryByTestId('studio-hijack')).toBeNull()
    // the add lands and the drilldown opens (the zoom mounts, keyed
    // by the fresh stage) — the ZOOM consult is the studio's seat
    await waitFor(() => {
      expect(screen.getByTestId('studio-hijack')).toBeTruthy()
    }, { timeout: 6000 })
  })
})
