// @vitest-environment happy-dom
// atoms-spanned.spec.tsx — THE SEATED-FAMILY SPAN on the typed
// number face: when the seated family states an envelope and the
// field itself states no bounds, the spinner's HTML bounds ARE the
// envelope's span (the box never offers what the write would refuse
// at the lane's ceiling). A bounded field renders the mixed knob
// instead, so the typed face is the unbounded one's seat.
import assert from 'node:assert/strict'
import { cleanup, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, it, vi } from 'vitest'
import type { SpecField } from '../src/spec.ts'
import { SpecAtom } from '../src/form.tsx'

afterEach(cleanup)

const F = (over: Partial<SpecField>): SpecField => ({ name: 'x', label: 'X', type: 'number', ...over }) as SpecField

describe('SpecAtom number span', () => {
  it('clamps an unbounded typed number to the seated envelope on both ends', () => {
    render(h(SpecAtom, { f: F({}), value: 8, onEdit: vi.fn(), envelope: [0, 64] }))
    const box = screen.getByRole('spinbutton')
    assert.equal(box.getAttribute('min'), '0')
    assert.equal(box.getAttribute('max'), '64')
  })

  it('leaves the field own floor alone when no envelope is seated', () => {
    render(h(SpecAtom, { f: F({ min: 4 }), value: 8, onEdit: vi.fn() }))
    const box = screen.getByRole('spinbutton')
    assert.equal(box.getAttribute('min'), '4')
    assert.equal(box.getAttribute('max'), null)
  })
})
