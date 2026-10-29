// real-contract.spec.tsx — THE GUI PARITY PIN (2026-10-10, the
// operator's order: "the contract must actually be fully fleshed
// out so it can serve as mocking for testing").
//
// THE MOCK IS THE CONTRACT: this spec doc is NOT hand-rolled — it
// is the welded fixture (tests/fixtures/image-edit-spec.json),
// machine-served by the REAL /v1/form-spec projector over the REAL
// image-edit declaration (see packages/harness/melite-tools/test/
// spec-fixture-weld.spec.ts — drift between declaration and
// fixture is CI failure). Every fact asserted here therefore pins
// the LIVE contract, not a test's copy of it: a declaration change
// that drops a fact fails the WELD; a client change that drops a
// fact fails HERE.
import { describe, expect, test } from 'vitest'
import { createElement, useState } from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import fixture21 from './fixtures/image-edit-spec.json'
import fixture2511 from './fixtures/image-edit-2511-spec.json'
import { assertFormSpecDoc, fieldsOf } from '@melite/card-base/client'
import {
  CardForm,
  modOwnedFields,
  type FormSpecDoc,
  type SpecValues,
} from '@melite/card-base/client'

// THE WELDED CONTRACTS, seated through the SAME boundary judgment
// the live fetch applies (audit #48's cure: the double cast is dead
// — a fixture that drifts from the served shape is REFUSED here,
// by the wire gate's own refusal, not seated by an `as unknown as`
// sidestep). Both boarded families ride the host's RE-SERVE LAW: a
// model pick refetches the family's own matrix, so the visibility
// grammar rides the SERVED doc, never a stale one.
const REAL21 = assertFormSpecDoc(fixture21, 'image-edit')
const REAL2511 = assertFormSpecDoc(fixture2511, 'image-edit-2511')

describe('the boundary judgment refuses what the cast used to seat', () => {
  test('a doc without a schema envelope is refused', () => {
    expect(() => assertFormSpecDoc({ fields: [] }, 'cast-only')).toThrow('form-spec: no schema envelope')
  })
  test('a foreign wtype is refused, named with its ref and the set home', () => {
    const liar = {
      schema: { uid: 1, refs: { n1: { meta: { extra: { wtype: 'switch' } } } } },
    }
    expect(() => assertFormSpecDoc(liar, 'cast-only')).toThrow(
      "schema ref n1: wtype 'switch' is not in WTYPE_SET",
    )
  })
})

describe('THE REAL image-edit CONTRACT drives the real form', () => {
  test('fieldsOf derives the full declared surface off the real envelope (max_stack, wtype, zones, the one list)', () => {
    const fields = fieldsOf(REAL21)
    const byName = new Map(fields.map((f) => [f.name, f]))
    const images = byName.get('input_images')
    expect(images).toBeDefined()
    expect(images!.type).toBe('image_list')
    expect(images!.max_stack).toBe(16)
    expect(images!.zone).toBe('inputs')
    expect(images!.group).toBe('input')
    // the one-list's hidden aliases never render as fields
    expect(byName.has('image1')).toBe(false)
    expect(byName.has('reference_images')).toBe(false)
    // prompt carries the declared textarea face + required
    const prompt = byName.get('prompt')
    expect(prompt!.type).toBe('textarea')
    expect(prompt!.required).toBe(true)
    // width/height are SERVED BY THE SCHEMA (the resize order,
    // operator 2026-11-12): the deliverable pair rides the card's
    // own face visible under the match toggle (visible_when), while
    // no DECL lane surfaces them (the kit tail consumes the lawful
    // pair — the bench carve judges them with the shared size law,
    // never the surface). The old pin demanded their ABSENCE (the
    // latent law's empty-form burn: no lane took a size, so the
    // serve carried no geometry). The fixture weld refresh re-served
    // them; this pin holds the new truth: served, gated, unsurfaced.
    expect(byName.has('width')).toBe(true)
    expect(byName.has('height')).toBe(true)
    expect(byName.get('width')).toMatchObject({ group: 'resolution' })
    // the match toggle SURVIVES (it rides lanes.base — the card's
    // own display axis); the pair hangs under it.
    expect(byName.has('match_input_resolution')).toBe(true)
    // the DECL surfaces serve: 2.1's lane words keep the solver span
    // (the stated-size wall's own bound), and the pair rides the
    // surface as RUN params (the resize order, operator 2026-11-12:
    // surfaced, judged by the shared size law — the form renders
    // them under the toggle, the bench admits the lawful pair).
    expect(REAL21.lanes?.base).toContain('width')
    expect(REAL21.lanes?.base).toContain('height')
    expect(REAL21.lanes?.bounds?.width).toBeUndefined()
    expect(REAL21.lanes?.bounds).toEqual({ steps: { min: 1, max: 50 } })
    // the 2511 doc is the sibling fixture (seated above)
    expect(REAL2511.lanes?.base?.includes('width')).toBe(true)
    expect(REAL2511.lanes?.base?.includes('height')).toBe(true)
    expect(REAL2511.lanes?.base?.includes('use_stock_nodes')).toBe(true)
  })

  test('CardForm renders the real contract: the input stack seats; width/height follow the model grammar', async () => {
    // THE HOST'S RE-SERVE LAW (stage-drill: "a pick refetches the
    // family's own matrix — the axes re-filter LIVE"): the pick
    // swaps the SERVED doc, so this host does the same — spec for
    // spec, the live path's own mechanic.
    let setHost: ((s: { spec: FormSpecDoc; user: SpecValues }) => void) | null = null
    render(createElement(function Host() {
      const [state, setState] = useState<{ spec: FormSpecDoc; user: SpecValues }>({
        spec: REAL21,
        user: { model: 'qwen-img-edit-21', prompt: 'a cat' },
      })
      setHost = setState
      return createElement(CardForm, {
        spec: state.spec,
        user: state.user,
        onSet: (name: string, v: unknown) => {
          setState((m) => ({ ...m, user: { ...m.user, [name]: v } }))
        },
        onPick: () => {},
      })
    }))
    // the one list renders as the input stack — the real cap rides
    // (0 / 16 from the envelope's max_stack) with the real tooltip
    expect(await screen.findByText('Input Images')).toBeTruthy()
    expect(screen.getByText('0 / 16')).toBeTruthy()
    expect(screen.getByLabelText('Add Input Images source')).toBeTruthy()
    // THE DELIVERABLE RENDER (the resize order, operator
    // 2026-11-12): the resolution group seats the match toggle, and
    // flipping it OFF reveals the Width/Height pair the toggle owns —
    // the operator's verbatim burn ("WHEN I FLIP THE SWITCH ... THE
    // NUMBERS TO MODIFY DO NOT APPEAR"). The old arm pinned their
    // ABSENCE (the latent law: flipping revealed nothing). The pick
    // re-serves the 2511 doc and the input stack + model axis carry.
    fireEvent.click(screen.getByRole('tab', { name: 'Resolution' }))
    const match = screen.getByRole('switch', { name: 'Match Input Resolution' })
    expect(match.getAttribute('aria-checked')).toBe('true')
    expect(screen.queryByLabelText('Width')).toBeNull()
    expect(screen.queryByLabelText('Height')).toBeNull()
    fireEvent.click(match)
    expect(match.getAttribute('aria-checked')).toBe('false')
    expect(screen.getByLabelText('Width')).toBeTruthy()
    expect(screen.getByLabelText('Height')).toBeTruthy()
    expect(screen.getByLabelText('Model')).toBeTruthy()
    act(() => { setHost!({ spec: REAL2511, user: { model: 'qwen-img-edit-2511', prompt: 'a cat' } }) })
    expect(screen.queryByLabelText('Width')).toBeNull()
    expect(screen.queryByLabelText('Height')).toBeNull()
    // the 2511 doc's own axes serve (the re-serve carried)
    expect((screen.getByLabelText('Model') as HTMLElement).textContent).toContain('Qwen Image Edit 2511')
  })

  test('THE MOD LAW on the real contract: the mask pack owns input_mask — never flat, the Modifiers section carries it', () => {
    // the pure projection: the real absorbed mask pack owns its names
    const owned = modOwnedFields(REAL21)
    expect(owned.has('input_mask')).toBe(true)
    expect(owned.has('mask_mode')).toBe(true)
    // the rendered form: no flat Region Mask row; the section rides
    render(createElement(CardForm, {
      spec: REAL21,
      user: { model: 'qwen-img-edit-21', prompt: 'a cat' },
      onSet: () => {},
      onPick: () => {},
    }))

    expect(screen.queryByLabelText('Region Mask')).toBeNull()
    expect(screen.getByText('Modifiers')).toBeTruthy()
  })


  test('THE LORAS PACK on the real contract (T4): the pack owns its names, the Modifiers section renders LoRAs, the first-party Recipe row stamps it', () => {
    // T4 (tier-cures-audit 2026-11-06, verified still-open at HEAD):
    // the refresh began serving the loras pack, but ZERO arms named
    // it — a client regression dropping loras rendering for REAL
    // docs stayed green (the loras machinery was tested only against
    // hand-rolled docs). The mask pack's MOD-LAW twin, same law.
    const owned = modOwnedFields(REAL21)
    expect(owned.has('loras')).toBe(true)
    const pack = (REAL21.features?.modifiers ?? []).find((m) => m.param_key === 'loras')
    expect(pack?.label).toBe('LoRAs')
    expect((pack?.options ?? []).map((o) => o.value)).toContain('qwen21_consistency')
    // the rendered form: the Modifiers section CARRIES the LoRAs
    // pack on the real doc — the user layer rides the drift-lock
    // stamp's exact composed shape, and the tile renders from the
    // pack's own option row (label + first-party weight), never a
    // flat schema row, never a dropped pack
    render(createElement(CardForm, {
      spec: REAL21,
      user: { model: 'qwen-img-edit-21', prompt: 'a cat', loras: [{ id: 'qwen21_consistency' }] },
      onSet: () => {},
      onPick: () => {},
    }))
    expect(screen.getByText('Modifiers')).toBeTruthy()
    expect(screen.getByText('Consistency (drift lock)')).toBeTruthy()
    // the first-party Recipe row stamps the pack's pick — the
    // variant defaults carry the lora id the run composes
    const drift = ((REAL21 as { variants?: Array<{ id: string; group: string; defaults: Record<string, unknown> }> }).variants ?? [])
      .find((v) => v.id === 'drift-lock' && v.group === 'Recipe')
    expect(drift?.defaults).toEqual({ loras: [{ id: 'qwen21_consistency' }] })
  })
})
