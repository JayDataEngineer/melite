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
    0: { type: 'object', dict: { refs: 1, clips: 2, takes: 3, mods: 4 } },
    1: { type: 'array', meta: { description: 'Refs', extra: { wtype: 'image_list', max_stack: 2 }, tooltip: 'the look' } },
    2: { type: 'array', meta: { description: 'Clips', extra: { wtype: 'image_list', media: 'video', max_stack: 3 } } },
    3: { type: 'array', meta: { description: 'Takes', extra: { wtype: 'image_list', media: 'audio' } } },
    4: { type: 'array', meta: { description: 'Mods', extra: { wtype: 'image_list', media: 'mod', max_stack: 8 }, tooltip: 'packs → models/refmods/. Pack-documented limits, never silent: attributes can still mix; strength blends, it never replaces outright; voice transfer does not work reliably.' } },
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
  const onPick = vi.fn()
  const rendered = render(h(CardForm, {
    spec: doc(), user: {}, onSet, onUnset, onPick, ...props,
  }))
  return { onSet, onUnset, onPick, ...rendered }
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
  } as unknown as Parameters<typeof bindEstateRemote>[0]) // the wall binds only the namespaces it touches; unused arms throw loud (the leaf's bind law)
}

test('STACKS: the head names the list ABOVE the row — the additive-bag grammar (#37)', () => {
  form({ user: { refs: ['https://host/a.png'] } })
  const rail = document.querySelector('[data-input-rail]')
  if (rail === null) throw new Error('stacks claim the rail')
  const stack = rail.querySelector('[data-input-stack="refs"]')
  if (stack === null) throw new Error('the refs stack seats')
  // THE HEAD rides above (title + the count hint) — NEVER an inline
  // caption crammed beside the first square (the #37 defect)
  const head = stack.querySelector('[data-stack-head="refs"]')
  if (head === null) throw new Error('the stack head seats above the row')
  expect(stack.firstElementChild).toBe(head)
  expect(head.textContent).toContain('Refs')
  expect(head.textContent).toContain('1 / 2')
  expect(stack.querySelector('[data-stack-label]')).toBeNull()
  // the cells carry the INDEX only (the head named the list); the
  // full seat name rides aria
  const box = stack.querySelector('[role="button"]')
  expect(box?.getAttribute('aria-label')).toBe('Refs 1 source')
  expect(stack.querySelector('[data-stack-add="refs"]')).not.toBeNull()
})

test('STACKS: an empty stack seats its head + the add-cell (the next slot, waiting)', () => {
  form()
  const rail = document.querySelector('[data-input-rail]')
  if (rail === null) throw new Error('stacks claim the rail')
  const stack = rail.querySelector('[data-input-stack="refs"]')
  if (stack === null) throw new Error('the refs stack seats')
  expect(stack.getAttribute('data-stack-count')).toBe('0')
  expect(stack.querySelector('[data-stack-head="refs"]')?.textContent).toContain('0 / 2')
  expect(stack.querySelector('[data-stack-add="refs"]')).not.toBeNull()
})

test('STACKS: a pick on the add-cell APPENDS (adding one opens the next slot)', async () => {
  bindMedia([{ url: 'https://host/a.png', name: 'a' }])
  const { onSet } = form({ user: {}, wire: { candidates: [], loadMedia: fetchMediaLibrary } }) // no upstream stages in this wall — the rail is empty, the media lane is exercised
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
    // candidates ride the wire TOO (the studio fix, 2026-09-21): a
    // FILLED entry's From flow serves the surface's artifact rows —
    // the entries arm of the stack wire, not just the add-cell's
    wire: { loadMedia: fetchMediaLibrary, candidates: [{ id: 's1', label: 'image-gen', url: 'https://host/flow.png' }] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Refs 1 source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From media' }))
  const rows = await screen.findAllByTestId('source-pick-row')
  fireEvent.click(rows[1]!)
  expect(onSet).toHaveBeenCalledWith('refs', ['https://host/z.png', 'https://host/b.png'])
  // and the FLOW arm on the same filled cell: the candidate row
  // replaces in place through the entries' candidates spread
  cleanup()
  const again = form({
    user: { refs: ['https://host/a.png', 'https://host/b.png'] },
    wire: { loadMedia: fetchMediaLibrary, candidates: [{ id: 's1', label: 'image-gen', url: 'https://host/flow.png' }] },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Refs 1 source' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'From flow' }))
  const flowRows = await screen.findAllByTestId('source-pick-row')
  fireEvent.click(flowRows[0]!)
  expect(again.onSet).toHaveBeenCalledWith('refs', ['https://host/flow.png', 'https://host/b.png'])
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

test('STACKS: media kinds ride the head hint (video cells are the file face, never image picks)', () => {
  form({ user: { clips: ['https://host/v.mp4'] } })
  const stack = document.querySelector('[data-input-stack="clips"]')
  if (stack === null) throw new Error('the video stack seats')
  expect(stack.querySelector('[data-stack-head="clips"]')?.textContent).toContain('1 / 3 · video')
  expect(stack.querySelector('[data-stack-add="clips"]')).not.toBeNull()
})

test('STACKS: the audio lane seats its own head hint (the OS dialog filters audio/*, never the image triad)', () => {
  form({ user: { takes: ['https://host/t.wav'] } })
  const stack = document.querySelector('[data-input-stack="takes"]')
  if (stack === null) throw new Error('the audio stack seats')
  // THE CAP IS DECLARED, NEVER INVENTED (2026-10-11): `takes`
  // declares no max_stack — the counter renders the count with NO
  // denominator and NO invented 8; the add-cell stays (no declared
  // cap to vanish at)
  expect(stack.querySelector('[data-stack-head="takes"]')?.textContent).toContain('Takes1 · audio')
  expect(stack.querySelector('[data-stack-head="takes"]')?.textContent).not.toContain('/ 8')
  expect(stack.querySelector('[data-stack-add="takes"]')).not.toBeNull()
})

test('STACKS: a draft past the DECLARED cap renders the over-cap refusal inline (the lane cap narrow)', () => {
  // the operator's live bug: an 18-entry draft on a 3-cap lane —
  // the face must state what the compose door would refuse, under
  // the head, with the door's numbers
  form({ user: { refs: ['a.png', 'b.png', 'c.png'] } })
  let stack = document.querySelector('[data-input-stack="refs"]')
  if (stack === null) throw new Error('the stack seats')
  // refs declares max_stack 2 (the doc fixture): 3 stated is OVER
  expect(stack.getAttribute('data-stack-over')).toBe('2')
  expect(stack.textContent).toContain("3 stated, this lane admits 2 — remove 1")
  expect(stack.querySelector('[data-stack-add="refs"]')).toBeNull()
  // and the legal state (1 of 2) renders clean — no refusal row
  form({ user: { refs: ['a.png'] } })
  const mounts = document.querySelectorAll('[data-input-stack="refs"]')
  stack = mounts[mounts.length - 1]!
  expect(stack.getAttribute('data-stack-over')).toBeNull()
  expect(stack.textContent).not.toContain('this lane admits')
  expect(stack.querySelector('[data-stack-add="refs"]')).not.toBeNull()
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
  const mods = fields.find((f) => f.name === 'mods')
  expect(mods?.type).toBe('image_list')
  expect(mods?.max_stack).toBe(8)
  expect(mods?.media).toBe('mod')
})

test('STACKS: the mod lane seats the file face with the safetensors filter, and its quirks ride the head title (R1 UI leg)', () => {
  form({ user: { mods: ['vanellope_example.safetensors'] } })
  const stack = document.querySelector('[data-input-stack="mods"]')
  if (stack === null) throw new Error('the mod stack seats')
  expect(stack.querySelector('[data-stack-head="mods"]')?.textContent).toContain('1 / 8 · mod')
  expect(stack.querySelector('[data-stack-add="mods"]')).not.toBeNull()
  // the pack's documented limits surface as the seat's own
  // tooltip (title on the head), never silently
  const head = stack.querySelector('[data-stack-head="mods"]')
  expect(head?.getAttribute('title')).toContain('attributes can still mix')
  expect(head?.getAttribute('title')).toContain('never replaces outright')
  expect(head?.getAttribute('title')).toContain('voice transfer does not work reliably')
})
