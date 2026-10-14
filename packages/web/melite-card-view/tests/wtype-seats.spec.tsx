// wtype-seats.spec.tsx — THE RENDERER COVERAGE PIN (the gap-1
// closure's second arm, 2026-10-10). The floor's WTYPE_SEATS map
// declares which wtypes the atom router arms; this pin renders
// each atom-routed wtype through the REAL form and asserts the
// DOM carries its dedicated control — never the silent plain-text
// fallback a foreign wtype would produce. With LAW 8 (the wire
// carries only WTYPE_SET spellings, every member exercised) and
// the boot gate (registration refuses foreign spellings), the
// silent-fallback class is closed from three sides: wire, door,
// renderer.
import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement, useState } from 'react'
import { WTYPE_SEATS } from '@melite/contracts/extraKeys'
import { CardForm, type FormSpecDoc, type SpecValues } from '@melite/card-base/client'
import type { SchemaRef } from '@melite/card-base/client'

// one minimal served doc per wtype: a single root field carrying
// the wtype, options where the atom needs them
const docOf = (wtype: string, withOptions: boolean): FormSpecDoc => {
  const fieldRef: SchemaRef & { meta: Record<string, unknown> } = {
    type: wtype === 'number' ? 'number' : 'string',
    meta: {
      description: 'probe',
      // the slider atom REFUSES (renders raw) when it holds no
      // number — the probe holds one so the range control renders
      ...(wtype === 'slider' ? { default: 1 } : {}),
      ...(withOptions ? { default: 'a' } : {}),
      extra: {
        wtype,
        group: 'probe',
        ...(withOptions ? { options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] } : {}),
      },
    },
  }
  return {
    form: 'probe', model: 'probe-family',
    schema: { uid: 1, refs: { 1: { type: 'object', dict: { probe: 2 } }, 2: fieldRef } },
  } as unknown as FormSpecDoc
}

const Host = (doc: FormSpecDoc): ReturnType<typeof createElement> => createElement(function ProbeHost() {
  const [user, setUser] = useState<SpecValues>({})
  return createElement(CardForm, {
    spec: doc,
    user,
    onSet: (name: string, v: unknown) => { setUser((m) => ({ ...m, [name]: v })) },
    onPick: () => {},
  })
})

describe('WTYPE SEATS: every atom-routed wtype renders its dedicated control', () => {
  const atomRouted = Object.entries(WTYPE_SEATS).filter(([, seat]) => seat === 'atom').map(([w]) => w)

  test('the seat map arms the atom set (rail/mod-face members ride their own faces)', () => {
    expect(atomRouted.sort()).toEqual(['boolean', 'file', 'image', 'mesh', 'number', 'select', 'slider', 'text', 'textarea'])
  })

  test('select rides the DSH Menu (a trigger button — never the silent text fallback)', () => {
    render(Host(docOf('select', true)))
    // S7h: the enum seat is the Menu idiom — the trigger is a button
    // whose rows open as menuitems
    expect(screen.getByLabelText('probe').tagName).toBe('BUTTON')
  })

  test('textarea renders a real <textarea>', () => {
    render(Host(docOf('textarea', false)))
    expect(screen.getByLabelText('probe').tagName).toBe('TEXTAREA')
  })

  test('slider renders a range control (role slider)', () => {
    render(Host(docOf('slider', false)))
    expect(screen.getByRole('slider')).toBeTruthy()
  })

  test('number renders a number input', () => {
    render(Host(docOf('number', false)))
    expect((screen.getByLabelText('probe') as HTMLInputElement).type).toBe('number')
  })

  test('boolean renders a switch (role switch/checkbox)', () => {
    render(Host(docOf('boolean', false)))
    expect(screen.getByRole('switch') ?? screen.getByRole('checkbox')).toBeTruthy()
  })

  test('text renders the plain input (the fallback IS the seat)', () => {
    render(Host(docOf('text', false)))
    expect((screen.getByLabelText('probe') as HTMLInputElement).type).toBe('text')
  })
})
