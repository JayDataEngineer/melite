// @vitest-environment happy-dom
// form-stacks.spec.tsx — THE PROGRESSIVE STACKS (the operator's law,
// 2026-09-20: "a generic 'input row for input squares'… adding one
// causes it to add another available slot one at a time", sharing the
// mods UI's own row mechanic). Declared image_list fields claim rail
// seats: one square per entry (array order IS apply order) plus the
// add-cell until the declared cap. A pick appends, a clear splices —
// never a phantom '' in the bag.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc } from '../src/spec.ts'
import type { SquareWire } from '../src/form.tsx'
import { bindEstateRemote, unbindEstateRemote } from '../src/estate-remote.ts'
import { fetchMediaLibrary } from '../src/media-library.ts'
import { CardForm } from '../src/form.tsx'

afterEach(() => { cleanup(); unbindEstateRemote() })

type Ref = { type: string; meta?: Record<string, unknown>; dict?: Record<string, number> }

/** A served doc with two stacks: an image stack capped at 2 and an
 *  uncapped video stack (the default-8 law). */
function doc(over: Record<string, unknown> = {}): FormSpecDoc {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { refs: 1, clips: 2, takes: 3 } },
    1: { type: 'array', meta: { description: 'Refs', extra: { wtype: 'image_list', max_stack: 2 }, tooltip: 'the look' } },
    2: { type: 'array', meta: { description: 'Clips', extra: { wtype: 'image_list', media: 'video', max_stack: 3 } } },
    3: { type: 'array', meta: { description: 'Takes', extra: { wtype: 'image_list', media: 'audio' } } },
  }
  return {
    form: 'stack-fixture',
    schema: { uid: 0, refs },
    ...over,
  } as unknown as FormSpecDoc
}

function form(props: Partial<Parameters<typeof CardForm>[0]> & { wire?: SquareWire } = {}) {
  const onSet = vi.fn()
  const onUnset = vi.fn()
  const rendered = render(h(CardForm, {
    spec: doc(), user: {}, onSet, onUnset, ...props,
  }))
  return { onSet, onUnset, ...rendered }
}

function bindMedia(items: Array<{ url: string; name: string }>): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error('unused namespace in this wall: ' + method) }
  bindEstateRemote({
    bench: { get: dead('bench/get'), 'add-stage': dead('bench/add-stage'), 'remove-stage': dead('bench/remove-stage') },
    drafts: { get: dead('drafts/get'), patch: dead('drafts/patch') },
    runs: {
      list: dead('runs/list'), start: dead('runs/start'), status: dead('runs/status'),
      stop: dead('runs/stop'), validate: dead('runs/validate'),
    },
    media: { list: async () => ({ ok: true, value: { items } }) },
  } as Parameters<typeof bindEstateRemote>[0])
}

test('STACKS: an empty stack seats its label + the add-cell (the next slot, waiting)', () => {
  form()
  const rail = document.querySelector('[data-input-rail]')
  if (rail === null) throw new Error('stacks claim the rail')
  const stack = rail.querySelector('[data-input-stack="refs"]')
  if (stack === null) throw new Error('the refs stack seats')
  expect(stack.getAttribute('data-stack-count')).toBe('0')
  expect(stack.querySelector('[data-stack-add="refs"]')).not.toBeNull()
})

test('STACKS: a pick on the add-cell APPENDS (adding one opens the next slot)', async () => {
  bindMedia([{ url: 'https://host/a.png', name: 'a' }])
  const { onSet } = form({ user: {}, wire: { loadMedia: fetchMediaLibrary } })
  fireEvent.click(screen.getByRole('button', { name: 'Add Refs source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
  const rows = await screen.findAllByTestId('source-pick-row')
  fireEvent.click(rows[0]!)
  expect(onSet).toHaveBeenCalledWith('refs', ['https://host/a.png'])
})

test('STACKS: entries render a cell each; a clear SPLICES (never a phantom empty)', () => {
  const { onSet } = form({ user: { refs: ['https://host/a.png', 'https://host/b.png'] } })
  const stack = document.querySelector('[data-input-stack="refs"]')
  expect(stack?.getAttribute('data-stack-count')).toBe('2')
  // the declaration tooltip rides every cell's title
  expect(stack?.querySelector('.specSlotCell, [class*="specSlotCell"]')?.getAttribute('title')).toBe('the look')
  fireEvent.click(screen.getByRole('button', { name: 'Detach Refs 1' }))
  expect(onSet).toHaveBeenCalledWith('refs', ['https://host/b.png'])
})

test('STACKS: a pick on a FILLED cell replaces in place (order is the apply order)', async () => {
  bindMedia([
    { url: 'https://host/a.png', name: 'a' },
    { url: 'https://host/z.png', name: 'z' },
  ])
  const { onSet } = form({
    user: { refs: ['https://host/a.png', 'https://host/b.png'] },
    wire: { loadMedia: fetchMediaLibrary },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Refs 1 source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
  const rows = await screen.findAllByTestId('source-pick-row')
  fireEvent.click(rows[1]!)
  expect(onSet).toHaveBeenCalledWith('refs', ['https://host/z.png', 'https://host/b.png'])
})

test('STACKS: at the cap the add-cell vanishes (the mods max_stack law, the rail face)', () => {
  form({ user: { refs: ['https://host/a.png', 'https://host/b.png'] } })
  const stack = document.querySelector('[data-input-stack="refs"]')
  expect(stack?.getAttribute('data-stack-count')).toBe('2')
  expect(stack?.querySelector('[data-stack-add="refs"]')).toBeNull()
  // below the cap it returns
  cleanup()
  form({ user: { refs: ['https://host/a.png'] } })
  expect(document.querySelector('[data-stack-add="refs"]')).not.toBeNull()
})

test('STACKS: media kinds ride the caption (video cells are the file face, never image picks)', () => {
  form({ user: { clips: ['https://host/v.mp4'] } })
  const stack = document.querySelector('[data-input-stack="clips"]')
  if (stack === null) throw new Error('the video stack seats')
  expect(stack.textContent).toContain('Clips 1 (video)')
  expect(stack.querySelector('[data-stack-add="clips"]')).not.toBeNull()
})

test('STACKS: the audio lane seats its own caption (the OS dialog filters audio/*, never the image triad)', () => {
  form({ user: { takes: ['https://host/t.wav'] } })
  const stack = document.querySelector('[data-input-stack="takes"]')
  if (stack === null) throw new Error('the audio stack seats')
  expect(stack.textContent).toContain('Takes 1 (audio)')
  expect(stack.querySelector('[data-stack-add="takes"]')).not.toBeNull()
})

test('STACKS: max_stack + media serve from the declaration extra (the walker reads them)', async () => {
  const mod = await import('../src/spec.ts')
  const fields = mod.fieldsOf(doc())
  const refs = fields.find((f) => f.name === 'refs')
  expect(refs?.type).toBe('image_list')
  expect(refs?.max_stack).toBe(2)
  expect(refs?.media).toBeUndefined()
  const clips = fields.find((f) => f.name === 'clips')
  expect(clips?.max_stack).toBe(3)
  expect(clips?.media).toBe('video')
})
