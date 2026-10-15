// @vitest-environment happy-dom
// form-mod-seat-upload.spec.tsx — THE MOD SEAT'S ANY-MEDIA UPLOAD WALL
// (the 2026-11-06 cure of the closed 2026-10-24 door).
//
// THE LAW (the operator, 2026-11-06): the mod seat takes ANY media
// kind — stills, videos, audio, packs — and THE SYSTEM HANDLES THE
// CONVERSION (compose wires the Create H3 RefMod node). Forcing
// operators to hand-place .safetensors packs was the regression
// (4f2342f46 → ce79f052a), not the law. The provider's default
// upload door ARMS for the mod seat exactly like the image seats —
// the closed-door refusal face (data-mod-refusal) is dead code and
// must never render.
//
// Axes (LAW 4): ACCURACY — the arms judge the gesture's outcome
// (the armed uploads door), not a census literal. COVERAGE — the
// add-cell AND a filled entry both judge, and the arm feeds a
// NON-image kind (a video) — any media boards, not just pictures.
// ENFORCEMENT — toggling the seat's open door shut (restoring a
// refusing onFile) reds the first arm on its own path. DEPTH — the
// gesture rides the REAL menu → hidden input → provider onFile
// chain, the same door the operator's click walks.
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc } from '../src/spec.ts'
import type { SquareWire } from '../src/form.tsx'
import { unbindEstateRemote } from '../src/estate-remote.ts'
import { CardForm } from '../src/form.tsx'

afterEach(() => { cleanup(); unbindEstateRemote(); vi.restoreAllMocks() })

/** The stacks fixture, narrowed to the two seats this wall judges:
 *  a door-owning image stack (refs) and the any-media mod stack (mods). */
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
      this.result = 'data:image/png;base64,QUJD'
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

test("THE MOD SEAT'S FILE GESTURE ARMS THE DEFAULT UPLOAD DOOR — ANY media boards (the 2026-11-06 open door)", async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const uploads = recordUploads()
  try {
    const { onSet } = form()
    const inp = gestureFromFile('[data-stack-add="mods"]')
    answerFile(inp, new File(['%MEL'], 'hero.png', { type: 'image/png' }))
    // THE DOOR ARMED: the uploads POST fires (the recorder sees it
    // even though this wall never serves it) and the closed-door
    // refusal face is DEAD — it must never render again.
    await waitFor(() => { expect(uploads.calls.some((c) => c.includes('/v1/uploads'))).toBe(true) })
    expect(document.querySelector('[data-mod-refusal="mods"]')).toBeNull()
    expect(onSet).not.toHaveBeenCalled() // the wall throws after the read — the door ARMED, the write never lies
  } finally {
    uploads.restore()
    globalThis.FileReader = RealReader
  }
})

test('A FILLED MOD CELL ARMS THE SAME DOOR — both cells carry the seat law, any media kind', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const uploads = recordUploads()
  try {
    const { onSet } = form({ user: { mods: ['picked-from-engine.safetensors'] } })
    const inp = gestureFromFile('[data-input-stack="mods"] div[class*="specSlotCell"]:not([data-stack-add])')
    // a VIDEO rides the same door — any media kind boards, never a
    // safetensors-only filter
    answerFile(inp, new File(['%MEL'], 'turn.mp4', { type: 'video/mp4' }))
    await waitFor(() => { expect(uploads.calls.some((c) => c.includes('/v1/uploads'))).toBe(true) })
    expect(document.querySelector('[data-mod-refusal="mods"]')).toBeNull()
    expect(onSet).not.toHaveBeenCalled()
  } finally {
    uploads.restore()
    globalThis.FileReader = RealReader
  }
})

test('THE IMAGE SEAT ARMS THE SAME DOOR — the wall guards the whole open-door plane', async () => {
  const RealReader = globalThis.FileReader
  globalThis.FileReader = fakeReader()
  const uploads = recordUploads()
  try {
    const { onSet } = form()
    const inp = gestureFromFile('[data-stack-add="refs"]')
    answerFile(inp, new File(['bits'], 'a.png', { type: 'image/png' }))
    await waitFor(() => { expect(uploads.calls.some((c) => c.includes('/v1/uploads'))).toBe(true) })
    expect(onSet).not.toHaveBeenCalled()
  } finally {
    uploads.restore()
    globalThis.FileReader = RealReader
  }
})
