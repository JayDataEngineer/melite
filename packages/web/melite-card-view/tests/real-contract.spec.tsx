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
import { fieldsOf } from '@melite/card-base/spec'
import {
  SpecForm,
  modOwnedFields,
  type FormSpecDoc,
  type SpecValues,
} from '../src/client/spec-form.tsx'

// THE WELDED CONTRACTS, seated as the form's spec docs (both
// boarded families — the host's RE-SERVE LAW: a model pick
// refetches the family's own matrix, so the visibility grammar
// rides the SERVED doc, never a stale one)
const REAL21 = fixture21 as unknown as FormSpecDoc
const REAL2511 = fixture2511 as unknown as FormSpecDoc

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
    // width/height ride the resolution group; THE GUARD IS DEAD
    // (fix shape 2): the family scoping rides the DECL params
    // surface (spec.lanes), never a card-authored visible_when —
    // a guard here would be a second declaration drifting beside
    // the first.
    const width = byName.get('width')
    expect(width!.visible_when).toBeUndefined()
    expect(width!.group).toBe('resolution')
    // the DECL surfaces serve: 2.1 owns the resolution pair,
    // 2511's surface excludes it (source-resolution lane).
    expect(REAL21.lanes?.base).toContain('width')
    expect(REAL21.lanes?.base).toContain('height')
    expect(REAL21.lanes?.bounds?.width).toEqual({ min: 256, max: 1536 })
    // the 2511 doc is the sibling fixture (seated above)
    expect(REAL2511.lanes?.base?.includes('width')).toBe(false)
    expect(REAL2511.lanes?.base?.includes('use_stock_nodes')).toBe(true)
  })

  test('SpecForm renders the real contract: the input stack seats; width/height follow the model grammar', async () => {
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
      return createElement(SpecForm, {
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
    // THE VISIBILITY GRAMMAR (real envelope, real interpreter): on
    // the 2.1 family width/height seat (the resolution group rides
    // its submenu tab, stroke 89); the pick re-serves the 2511 doc
    // and they vanish (2511 edits at source resolution).
    fireEvent.click(screen.getByRole('tab', { name: 'Resolution' }))
    expect((screen.getByLabelText('Width') as HTMLInputElement).value).toBe('1024')
    expect(screen.getByLabelText('Model')).toBeTruthy()
    act(() => { setHost!({ spec: REAL2511, user: { model: 'qwen-img-edit-2511', prompt: 'a cat' } }) })
    expect(screen.queryByLabelText('Width')).toBeNull()
    expect(screen.queryByLabelText('Height')).toBeNull()
    // the 2511 doc's own axes serve (the re-serve carried)
    expect((screen.getByLabelText('Model') as HTMLSelectElement).value).toBe('qwen-img-edit-2511')
  })

  test('THE MOD LAW on the real contract: the mask pack owns input_mask — never flat, the Modifiers section carries it', () => {
    // the pure projection: the real absorbed mask pack owns its names
    const owned = modOwnedFields(REAL21)
    expect(owned.has('input_mask')).toBe(true)
    expect(owned.has('mask_mode')).toBe(true)
    // the rendered form: no flat Region Mask row; the section rides
    render(createElement(SpecForm, {
      spec: REAL21,
      user: { model: 'qwen-img-edit-21', prompt: 'a cat' },
      onSet: () => {},
      onPick: () => {},
    }))
    expect(screen.queryByLabelText('Region Mask')).toBeNull()
    expect(screen.getByText('Modifiers')).toBeTruthy()
  })
})
