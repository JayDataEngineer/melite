// @vitest-environment happy-dom
// @contract cards-menu-anchor-lane
// menu-anchor.spec.tsx — THE DETACHED-MENU ANCHOR LAW (the
// 2026-11-18 popup burn: the harness restart served a newer
// dsh-client-ui-primitives kernel to plugin bundles at runtime, and
// the source popup fell to the bottom of the card because the new
// Menu ignores the captured-rect prop and anchors its portaled list
// to `anchorRef.current` instead). Every owner-detached DSH Menu —
// a menu opened from an event whose trigger element lives elsewhere
// in the tree — must hand the kernel BOTH anchor seats: the LIVE
// element (new kernels) and the captured rect (pinned kernels).
// The Menu primitive is recorded (not rendered) so the wall judges
// the ANCHOR HANDOFF, the contract that burned, not the kernel's
// own CSS.
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { FormSpecDoc } from '../src/spec.ts'
import { menuAnchorProps } from '../src/menu-anchor.ts'

const menuCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>)
vi.mock('@deepseek-ai/dsh-client-ui-primitives', async (importOriginal) => {
  const orig = await importOriginal<Record<string, unknown>>()
  return {
    ...orig,
    Menu: (props: Record<string, unknown>) => { menuCalls.push(props); return null },
  }
})

import { CardForm } from '../src/form.tsx'

afterEach(cleanup)
afterEach(() => { menuCalls.length = 0 })

type Ref = { type: string; meta?: Record<string, unknown>; extra?: Record<string, unknown>; dict?: Record<string, number> }

/** A served doc with the two detached-menu doors this wall rides:
 *  the image source square on the rail, and one addable mod kind
 *  (the constructor's full walk — a bare doc renders no rail). */
function doc(over: Record<string, unknown> = {}): FormSpecDoc {
  const refs: Record<number, Ref> = {
    0: { type: 'object', dict: { prompt: 1, steps: 2, cfg: 3, turbo: 4, inherit: 5, notes: 6, img: 7, shots: 8 } },
    1: { type: 'string', meta: { description: 'Prompt', required: true, tooltip: 'be nice' } },
    2: { type: 'number', meta: { description: 'Steps', default: 0, step: 1 } },
    3: { type: 'number', meta: { description: 'Cfg', default: 5, step: 0.5 } },
    4: { type: 'boolean', meta: { description: 'Turbo', default: false } },
    5: { type: 'tri', meta: { description: 'Inherit' } },
    6: { type: 'string', meta: { description: 'Notes', extra: { wtype: 'textarea' } } },
    7: { type: 'string', meta: { description: 'Image', tooltip: 'drop here', extra: { wtype: 'image' } } },
    8: { type: 'array', meta: { description: 'Shots', extra: { wtype: 'image_list' } } },
  }
  return {
    form: 'txt2img',
    model: 'krea-2',
    schema: { uid: 0, refs },
    inputs: [{ name: 'img', kind: 'image' }],
    packs: [{ id: 'upscale', present: true }],
    ...over,
  } as unknown as FormSpecDoc
}

/** The addable-kind override for the add-tile door (a doc WITH
 *  modifiers seats the mod stack, so it rides per-arm, never as the
 *  default the square arm renders). */
const MODS = {
  features: {
    modifiers: [{
      param_key: 'shots', label: 'Shots', entry: 'field',
      kindFields: [{ name: 'strength', label: 'Strength', type: 'number', default: 0.8 }],
    }],
  },
}

/** THE SEAM'S OWN CONTRACT: the builder returns the full
 *  version-tolerant handoff — live element seat, captured rect
 *  seat, and the inert `anchor` ReactNode the pinned type
 *  requires. Any future detached-menu call site rides this seam or
 *  owns all three keys itself. */
test('THE SEAM: menuAnchorProps hands over element, rect, and inert anchor', () => {
  const el = document.createElement('span')
  document.body.append(el) // rc.5 law: the kernel's MutationObserver dismisses any menu whose anchor element is not isConnected — the live seat is only honest for a connected element
  const rect = new DOMRect(11, 22, 140, 96)
  const ref = { current: el } as { current: HTMLElement | null }
  const props = menuAnchorProps(ref, rect)
  expect(props.anchor).toBeNull()
  expect(props.anchorRef).toBe(ref)
  expect(props.anchorRef.current).toBe(el)
  expect(props.anchorPoint).toBeUndefined()
  expect(props.getAnchorRect()).toBe(rect)
  el.remove()
  // the disconnected arm (rc.5): no anchorRef may ride — the kernel
  // would watch the dead element and dismiss the list — so the seam
  // parks a 0×0 anchorPoint at the captured rect's lower-left corner
  const detached = menuAnchorProps(ref, rect)
  expect(detached.anchorRef).toBeUndefined()
  expect(detached.anchorPoint).toEqual({ x: 11, y: 118 })
  expect(detached.getAnchorRect()).toBe(rect)
})

/** THE SOURCE SQUARE DOOR (the operator's exact burn hop): clicking
 *  the input square opens the source Menu with the SQUARE'S OWN
 *  element in anchorRef (the new kernel's seat) and the rect
 *  measured from that element at pick time (the pinned kernel's
 *  seat). Red when either seat is dropped — the popup regresses to
 *  the bottom of the card. */
test('SOURCE SQUARE: the opened Menu anchors to the clicked square (element + rect)', () => {
  const rect = new DOMRect(11, 22, 140, 96)
  render(h(CardForm, { spec: doc(), user: {}, onSet: () => {}, onUnset: () => {}, onPick: () => {} }))
  const square = screen.getByRole('button', { name: 'Image source' }) as HTMLElement
  square.getBoundingClientRect = () => rect
  menuCalls.length = 0
  fireEvent.click(square)
  const opened = menuCalls.find((p) => p.open === true)
  if (opened === undefined) throw new Error('no Menu opened from the source square')
  expect(opened.portal).toBe(true)
  expect(opened.anchor).toBeNull()
  // THE LIVE ELEMENT SEAT — the newer kernel's only anchor. Dropping
  // it is the burn (menu anchored to the empty wrapper at the bottom
  // of the card).
  const ref = opened.anchorRef as { current: HTMLElement | null } | undefined
  if (ref === undefined) throw new Error('Menu opened with no anchorRef — detached menus must hand the live element')
  expect(ref.current).toBe(square)
  // THE CAPTURED RECT SEAT — the pinned kernel's portal placement.
  const got = (opened.getAnchorRect as () => DOMRect)()
  expect([got.x, got.y, got.width, got.height]).toEqual([11, 22, 140, 96])
})

/** THE ADD-TILE DOOR (the same burn class, second seat): the mods
 *  kind picker is the other owner-detached Menu — it must carry the
 *  same two seats, anchored to the add tile itself. */
test('ADD TILE: the mod-kind Menu anchors to the add tile (element + rect)', () => {
  const rect = new DOMRect(31, 42, 64, 64)
  render(h(CardForm, { spec: doc(MODS), user: {}, onSet: () => {}, onUnset: () => {}, onPick: () => {} }))
  const add = document.querySelector('[data-subcard-add="mod"]') as HTMLElement | null
  if (add === null) throw new Error('no add tile rendered')
  add.getBoundingClientRect = () => rect
  menuCalls.length = 0
  fireEvent.click(add)
  const opened = menuCalls.find((p) => p.open === true)
  if (opened === undefined) throw new Error('no Menu opened from the add tile')
  expect(opened.portal).toBe(true)
  expect(opened.anchor).toBeNull()
  const ref = opened.anchorRef as { current: HTMLElement | null } | undefined
  if (ref === undefined) throw new Error('Menu opened with no anchorRef — detached menus must hand the live element')
  expect(ref.current).toBe(add)
  const got = (opened.getAnchorRect as () => DOMRect)()
  expect([got.x, got.y, got.width, got.height]).toEqual([31, 42, 64, 64])
})
