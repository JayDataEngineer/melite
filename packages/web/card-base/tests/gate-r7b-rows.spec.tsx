// @vitest-environment happy-dom
// gate-r7b-rows.spec.tsx — GATE R7B (rows.tsx OverlayKnob dark
// arms): the boolean on/off vocabulary in every ghost/tip/value
// seat, the enum/number/string fallback arms, and all three onEdit
// closures (fired through the real atoms; the non-string edges
// driven through the captured closure — SpecAtom only ever hands
// strings over the DOM). Mirrors form-atoms.spec.tsx's knob block.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

/** The props OverlayKnob hands its atom — captured through a
 *  passthrough mock (real atoms still render, so DOM firing stays
 *  honest; direct closure calls cover the non-string edges the DOM
 *  can never hand over). */
interface CapturedAtom {
  value?: unknown
  ghost?: unknown
  placeholder?: unknown
  onEdit?: (name: string, v: unknown) => void
}

const seen = vi.hoisted(() => ({ props: [] as CapturedAtom[] }))

vi.mock('../src/atoms.tsx', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../src/atoms.tsx')>()
  const Real = orig.SpecAtom
  return {
    ...orig,
    SpecAtom: (props: Parameters<typeof Real>[0]) => {
      seen.props.push({
        value: props.value,
        ghost: props.ghost,
        placeholder: props.placeholder,
        onEdit: props.onEdit,
      })
      return Real(props)
    },
  }
})

import { OverlayKnob } from '../src/rows.tsx'

afterEach(() => {
  cleanup()
  seen.props.length = 0
})

function lastProps(): CapturedAtom {
  const p = seen.props[seen.props.length - 1]
  if (p === undefined) throw new Error('no SpecAtom render captured')
  return p
}

// THE MENU SELECT (S7h): OverlayKnob's enum/boolean faces ride the
// DSH Menu — the trigger Button (aria-label = title-cased name)
// carries the current face; picks open it and click a menuitem row.
function triggerOf(container: HTMLElement, aria: string): HTMLElement {
  const btn = container.querySelector(`button[aria-label="${aria}"]`)
  if (btn === null) throw new Error(`no menu trigger rendered for ${aria}`)
  return btn as HTMLElement
}
function pickRowIdx(aria: string, idx: number): void {
  fireEvent.click(screen.getByLabelText(aria))
  fireEvent.click(screen.getAllByRole('menuitem')[idx]!)
}

function numberOf(container: HTMLElement): HTMLInputElement {
  const inp = container.querySelector('input[type="number"]')
  if (inp === null) throw new Error('no number input rendered')
  return inp as HTMLInputElement
}

function textOf(container: HTMLElement): HTMLInputElement {
  const inp = container.querySelector('input:not([type])') ?? container.querySelector('input')
  if (inp === null) throw new Error('no text input rendered')
  return inp as HTMLInputElement
}

describe('OverlayKnob: the boolean on/off vocabulary in every seat', () => {
  it('a true schema default ghosts + tips in on/off words (never true/false)', () => {
    const r = render(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean', default: true },
      value: undefined, onEdit: () => {},
    }))
    expect(lastProps().ghost).toBe('on')
    const trigger = triggerOf(r.container, 'Sharpen')
    expect(trigger.textContent).toBe('on')
    expect(trigger.title).toContain('composes on')
  })

  it('a foreign stamp ghosts verbatim — the custom face value rides, tipped as inherited', () => {
    const r = render(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean', default: false },
      value: undefined, base: 28, onEdit: () => {},
    }))
    // the stamp wins the face; neither 'true' nor 'false', so both
    // vocabularies fall through to the raw face value
    expect(lastProps().ghost).toBe('← 28')
    const trigger = triggerOf(r.container, 'Sharpen')
    expect(trigger.textContent).toBe('← 28')
    expect(trigger.title).toContain('inherits 28')
  })

  it('no stamp and no default: the honest inherit ghost', () => {
    const r = render(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean' },
      value: undefined, onEdit: () => {},
    }))
    expect(lastProps().ghost).toBe('inherit')
    expect(triggerOf(r.container, 'Sharpen').textContent).toBe('inherit')
  })

  it('held booleans bind the on/off vocabulary (true AND false)', () => {
    const r = render(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean', default: false },
      value: true, onEdit: () => {},
    }))
    expect(triggerOf(r.container, 'Sharpen').textContent).toBe('On')
    r.rerender(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean', default: false },
      value: false, onEdit: () => {},
    }))
    expect(triggerOf(r.container, 'Sharpen').textContent).toBe('Off')
  })

  it('the boolean write: picks stamp booleans, the ghost clears to unset', () => {
    const edits: unknown[] = []
    const r = render(h(OverlayKnob, {
      name: 'sharpen', field: { name: 'sharpen', label: 'Sharpen', type: 'boolean', default: false },
      value: undefined, onEdit: (v) => { edits.push(v) },
    }))
    // rows: [ghost 'off' (composed default), 'on', 'off'] — the
    // ghost and the off row share a face, picks ride indexes
    void r
    pickRowIdx('Sharpen', 1) // on
    pickRowIdx('Sharpen', 2) // off
    pickRowIdx('Sharpen', 0) // the ghost — unset
    expect(edits).toEqual([true, false, undefined])
    // the unset mark the DOM can never hand over (SpecAtom always
    // passes strings) still clears — the closure's own arm
    lastProps().onEdit?.('sharpen', undefined)
    expect(edits).toEqual([true, false, undefined, undefined])
  })
})

describe('OverlayKnob: enum + number fallback arms', () => {
  it('a held string binds verbatim; a held number binds stringified', () => {
    const r = render(h(OverlayKnob, {
      name: 'sampler', field: { name: 'sampler', label: 'Sampler', type: 'select', default: 'euler', options: ['euler', 'heun'] },
      value: 'heun', onEdit: () => {},
    }))
    expect(lastProps().value).toBe('heun')
    expect(triggerOf(r.container, 'Sampler').textContent).toBe('Heun')
    r.rerender(h(OverlayKnob, {
      name: 'sampler', field: { name: 'sampler', label: 'Sampler', type: 'select', default: 'euler', options: ['euler', 'heun'] },
      value: 42, onEdit: () => {},
    }))
    // non-string enum values still bind (stringified) — never a crash
    expect(lastProps().value).toBe('42')
  })

  it('the enum write: a pick stamps, the ghost clears to unset', () => {
    const edits: unknown[] = []
    const r = render(h(OverlayKnob, {
      name: 'sampler', field: { name: 'sampler', label: 'Sampler', type: 'select', default: 'euler', options: ['euler', 'heun'] },
      value: undefined, onEdit: (v) => { edits.push(v) },
    }))
    void r
    // rows: [ghost 'euler' (composed), 'Euler', 'Heun']
    pickRowIdx('Sampler', 2) // Heun
    pickRowIdx('Sampler', 0) // the ghost — unset
    expect(edits).toEqual(['heun', undefined])
  })

  it('an integer without its own step rides 1 (the declaration backstop)', () => {
    const r = render(h(OverlayKnob, {
      name: 'steps', field: { name: 'steps', label: 'Steps', type: 'integer', default: 12, min: 4, max: 30 },
      value: undefined, onEdit: () => {},
    }))
    expect(numberOf(r.container).getAttribute('step')).toBe('1')
  })

  it('a number with nothing composing placeholders inherit (never a bare box)', () => {
    const r = render(h(OverlayKnob, {
      name: 'cfg', field: { name: 'cfg', label: 'Cfg', type: 'number' },
      value: undefined, onEdit: () => {},
    }))
    expect(numberOf(r.container).placeholder).toBe('inherit')
  })

  it('the number write: numerics stamp, empties + refuse-to-parse clear to unset', () => {
    const edits: unknown[] = []
    const r = render(h(OverlayKnob, {
      name: 'steps', field: { name: 'steps', label: 'Steps', type: 'integer', default: 12 },
      value: undefined, onEdit: (v) => { edits.push(v) },
    }))
    const inp = numberOf(r.container)
    fireEvent.input(inp, { target: { value: '20' } })
    expect(edits).toEqual([20])
    // a non-finite claim clears (the closure's own arm — driven
    // directly so the value survives any DOM sanitizing)
    lastProps().onEdit?.('steps', '1e999')
    lastProps().onEdit?.('steps', 'abc')
    expect(edits).toEqual([20, undefined, undefined])
    // a non-string the DOM can never hand over also clears
    lastProps().onEdit?.('steps', 42)
    expect(edits).toEqual([20, undefined, undefined, undefined])
  })
})

describe('OverlayKnob: the string face (value, placeholder, write)', () => {
  it('a held string paints verbatim (never the placeholder)', () => {
    const r = render(h(OverlayKnob, { name: 'mystery', value: 'hi', onEdit: () => {} }))
    expect(textOf(r.container).value).toBe('hi')
  })

  it('a composing default placeholders the face (never a bare inherit)', () => {
    const r = render(h(OverlayKnob, {
      name: 'sampler', field: { name: 'sampler', label: 'Sampler', type: 'text', default: 'euler' },
      value: undefined, onEdit: () => {},
    }))
    expect(textOf(r.container).placeholder).toBe('euler')
  })

  it('the string write: prose stamps trimmed, blanks + foreign values clear to unset', () => {
    const edits: unknown[] = []
    const r = render(h(OverlayKnob, {
      name: 'sampler', field: { name: 'sampler', label: 'Sampler', type: 'text', default: 'euler' },
      value: undefined, onEdit: (v) => { edits.push(v) },
    }))
    const inp = textOf(r.container)
    fireEvent.change(inp, { target: { value: '  heun  ' } })
    fireEvent.change(inp, { target: { value: '   ' } })
    expect(edits).toEqual(['heun', undefined])
    // a non-string the DOM can never hand over clears as well
    lastProps().onEdit?.('sampler', 42)
    expect(edits).toEqual(['heun', undefined, undefined])
  })
})
