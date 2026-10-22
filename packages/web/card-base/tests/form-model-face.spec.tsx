import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { createElement as h } from 'react'

import { CardForm } from '../src/form.tsx'
import type { FormSpecDoc } from '@melite/contracts/formSpec'

// THE MODEL FACE PARITY WALL (operator 2026-11-11: "when I deal
// with a single model in the card, the model in the drop down
// aligns [off] and not centered") — the single-model STATIC face
// must ride the same centering grammar as every interactive
// dropdown face. The interactive faces are DSH Buttons
// (ui-primitives Button.module.css .button: display:inline-flex;
// justify-content:center), so the static face centers by the SAME
// mechanism — never a one-off text-align that a cascade reorder
// can split from the Buttons it sits beside. Burn 5 (2026-11-10)
// walled this face's box model; this wall owns its alignment.

function doc(over: Record<string, unknown> = {}): FormSpecDoc {
  return {
    form: 'txt2img',
    model: 'krea-2',
    families: [{ id: 'krea-2', present: true }],
    schema: { uid: 0, refs: { 0: { type: 'object', dict: { prompt: 1 }, }, 1: { type: 'string', meta: { description: 'Prompt', required: true } } } },
    inputs: [],
    ...over,
  } as unknown as FormSpecDoc
}

function form(props: Partial<Parameters<typeof CardForm>[0]> = {}) {
  return render(h(CardForm, { spec: doc(), user: {}, onSet: (): void => {}, onPick: (): void => {}, ...props }))
}

const cssPath = join(import.meta.dirname, '../../../../packages/web/card-base/src/card.module.css')

afterEach(cleanup)

test('MODEL FACE: ONE family renders the stated static face; TWO families return the menu grammar', () => {
  form()
  const staticFace = screen.getByLabelText('Model') as HTMLElement
  expect(staticFace.getAttribute('data-model-static')).toBe('1')
  expect(staticFace.textContent).toBe('Krea 2')
  // the clamp span rides the face (the defect-2 suspenders: a flex
  // item with min-width:0 clamps under any cascade order)
  expect(staticFace.querySelector('span')?.textContent).toBe('Krea 2')
  cleanup()
  form({ spec: doc({ families: [{ id: 'krea-2', present: true }, { id: 'anima-x', present: true }] }) })
  expect(document.querySelector('[data-model-static]')).toBeNull()
  expect(screen.getByRole('button', { name: 'Model' })).not.toBeNull()
})

test('MODEL FACE: the static face centers by the Button grammar (display:flex + justify-content:center) — the same mechanism as every menu face', () => {
  form()
  const staticFace = screen.getByLabelText('Model') as HTMLElement
  expect(staticFace.getAttribute('data-model-static')).toBe('1')
  // THE RULE HALF (burn 5's shape — the module's own bytes): the
  // static rule must carry the trigger's centering, so a lone model
  // reads exactly like a picked one beside it
  const css = readFileSync(cssPath, 'utf8')
  const rule = css.match(/\.specSelectStatic \{[^}]*\}/g)?.[0]
  if (rule === undefined) throw new Error('the .specSelectStatic rule did not render')
  expect(rule).toContain('display: flex')
  expect(rule).toContain('justify-content: center')
})

test('MODEL FACE: the clamp span stays a flex item that can shrink (centering never resurrects the spill)', () => {
  // the centering cure makes .specSelectStatic a flex container —
  // the span's own min-width:0 + overflow:hidden is what keeps the
  // ellipsis honest inside it (defect 2). This arm pins that
  // interaction: both rules together, or red.
  form()
  const staticFace = screen.getByLabelText('Model') as HTMLElement
  expect(staticFace.querySelector('span')?.className).toMatch(/specSelectText/)
  const css = readFileSync(cssPath, 'utf8')
  const rule = css.match(/\.specSelectText \{[^}]*\}/g)?.[0]
  if (rule === undefined) throw new Error('the .specSelectText rule did not render')
  expect(rule).toContain('min-width: 0')
  expect(rule).toContain('overflow: hidden')
})
