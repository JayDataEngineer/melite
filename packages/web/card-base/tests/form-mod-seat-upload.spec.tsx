// @vitest-environment happy-dom
// form-mod-seat-upload.spec.tsx — THE MOD SEAT'S CLOSED-UPLOAD WALL
// (the OWED 2026-11-05 bench note, S4's R6 class).
//
// THE LAW (the 2026-10-24 engine-side files law, seated 2026-11-05):
// a mod-media stack's file gesture REFUSES LOUD at the seat — packs
// are engine files (models/refmods/), never run artifacts the
// /v1/uploads door can mint. The provider's default upload door must
// NEVER arm for the mod seat (the door secretly arming was the OWED
// defect: a junk data-URL mirror, then wire.ts's generic media-gate
// throw AFTER the door had armed). The generic door stays armed for
// seats that own an upload door (image stacks) — the seat law is the
// mod seat's, not the provider's.
//
// Axes (LAW 4): ACCURACY — the arms judge the gesture's outcome (the
// refusal face + the untouched value seam + a silent uploads door),
// not a census literal. COVERAGE — both mod cells judge (the add-cell
// AND a filled entry), and the boundary arm proves a door-owning
// seat still arms the default door (the wall guards exactly the mod
// seat). ENFORCEMENT — toggling the seat's refusing onFile out reds
// the first arm on its own path (the §5 receipt lives in the lane
// report). DEPTH — the gesture rides the REAL menu → hidden input →
// provider onFile chain, the same door the operator's click walks.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc } from '../src/spec.ts'
import type { SquareWire } from '../src/form.tsx'
import { unbindEstateRemote } from '../src/estate-remote.ts'
import { chromeCopy } from '../src/locales/chromeCopy.ts'
import { CardForm } from '../src/form.tsx'

afterEach(() => { cleanup(); unbindEstateRemote(); vi.restoreAllMocks() })

/** The stacks fixture, narrowed to the two seats this wall judges:
 *  a door-owning image stack (refs) and the mod pack stack (mods). */
function doc(): FormSpecDoc {
  const refs: Record<string, unknown> = {
    0: { type: 'object', dict: { refs: 1, mods: 2 } },
    1: { type: 'array', meta: { description: 'Refs', extra: { wtype: 'image_list', max_stack: 2 } } },
    2: { type: 'array', meta: { description: 'Mods', extra: { wtype: 'image_list', media: 'mod', max_stack: 8 } } },
  }
  return { form: 'mod-seat-fixture', schema: { uid: 0, refs } } as unknown as FormSpecDoc
}

function form(props: Partial<Parameters<typeof CardForm>[0]> & { wire?: SquareWire } = {}) {
  const onSet = vi.fn()
  const rendered = render(h(CardForm, { spec: doc(), user: {}, onSet, onPick: vi.fn(), ...props }))
  return { onSet, ...rendered }
}

/** A recording uploads door: the default upload's ONLY network step
 *  is the POST /v1/uploads — a seen call means the door ARMED. */
function recordUploads(): { calls: string[]; restore(): void } {
  const calls: string[] = []
  const real = globalThis.fetch
  globalThis.fetch = (async (input: unknown) => {
    calls.push(String(input))
    throw new Error('the wall never serves the uploads door')
  }) as typeof fetch
  return { calls, restore: () => { globalThis.fetch = real } }
}

function fakeReader(): typeof FileReader {
  return class {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    readAsDataURL(): void {
      this.result = 'data:application/octet-stream;base64,QUJD'
      queueMicrotask(() => { this.onload?.() })
    }
  } as unknown as typeof FileReader
}

/** The REAL gesture: open the cell's square menu, take From file,
 *  answer the provider's hidden input. Returns the input. */
function gestureFromFile(cellSelector: string): HTMLInputElement {
  const cell = document.querySelector(cellSelector)
  if (cell === null) throw new Error('the seat cell must render: ' + cellSelector)
  const trigger = cell.querySelector('[role="button"]')
  if (trigger === null) throw new Error('the seat square must render')
  fireEvent.click(trigger)
  fireEvent.click(screen.getByRole('menuitem', { name: 'From file' }))
  const inp = cell.querySelector('input[type="file"]')
  if (inp === null) throw new Error('the provider file input must ride the cell')
  return inp as HTMLInputElement
}

function answerFile(inp: HTMLInputElement, file: File): void {
  Object.defineProperty(inp, 'files', { value: [file], configurable: true })
  fireEvent.change(inp)
}

test("THE MOD SEAT'S FILE GESTURE REFUSES LOUD — the default upload door never arms (the closed 2026-10-24 door)", async () => {
  const uploads = recordUploads()
  try {
    const { onSet } = form()
    const inp = gestureFromFile('[data-stack-add="mods"]')
    answerFile(inp, new File(['%MEL'], 'pack.safetensors', { type: '' }))
    // THE REFUSAL FACE: the seat's own words, role=alert, never a value
    const face = await waitFor(() => {
      const el = document.querySelector('[data-mod-refusal="mods"]')
      if (el === null) throw new Error('the mod seat owes its closed-door face')
      return el
    })
    expect(face.getAttribute('role')).toBe('alert')
    expect(face.textContent).toBe(chromeCopy.modUploadClosed({ name: 'pack.safetensors' }))
    // THE DEFAULT DOOR NEVER ARMED: no uploads POST, no provider
    // error face, and the value seam is untouched (a refusal is a
    // FACE, never a param value — the 2026-10-24 law).
    expect(uploads.calls.length).toBe(0)
    expect(document.querySelector('[data-slot-error]')).toBeNull()
    expect(onSet).not.toHaveBeenCalled()
  } finally {
    uploads.restore()
  }
})

test('A FILLED MOD CELL REFUSES THE SAME — both cells carry the seat law', async () => {
  const uploads = recordUploads()
  try {
    const { onSet } = form({ user: { mods: ['picked-from-engine.safetensors'] } })
    const inp = gestureFromFile('[data-input-stack="mods"] div[class*="specSlotCell"]:not([data-stack-add])')
    answerFile(inp, new File(['%MEL'], 'second.safetensors', { type: '' }))
    const face = await waitFor(() => {
      const el = document.querySelector('[data-mod-refusal="mods"]')
      if (el === null) throw new Error('the filled mod cell owes the closed-door face too')
      return el
    })
    expect(face.textContent).toBe(chromeCopy.modUploadClosed({ name: 'second.safetensors' }))
    expect(uploads.calls.length).toBe(0)
    expect(onSet).not.toHaveBeenCalled()
  } finally {
    uploads.restore()
  }
})

test('THE GENERIC DOOR STAYS ARMED FOR DOOR-OWNING SEATS — the wall guards exactly the mod seat', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const uploads = recordUploads()
  try {
    const { onSet } = form()
    const inp = gestureFromFile('[data-stack-add="refs"]')
    answerFile(inp, new File(['bits'], 'a.png', { type: 'image/png' }))
    // the default door ARMS (the uploads POST fires — the recorder
    // sees it even though this wall never serves it) and the mod
    // refusal face never renders for a door-owning seat.
    await waitFor(() => { expect(uploads.calls.some((c) => c.includes('/v1/uploads'))).toBe(true) })
    expect(document.querySelector('[data-mod-refusal="refs"]')).toBeNull()
    expect(onSet).not.toHaveBeenCalled() // the wall throws after the read — the door ARMED, the write never lies
  } finally {
    uploads.restore()
    globalThis.FileReader = RealReader
  }
})
