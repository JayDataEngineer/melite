// @vitest-environment happy-dom
// mods-v2v-face.spec.tsx — THE V2V WINDOWS FACE SEAM (queue 11
// reopened, the operator's correction 2026-11-08: "NO WINDOWS IN THE
// FORM!" — the video2video form CARRIES the windows). This wall owns
// the SEAM in card-base: a kind declaring `leaf_face: 'v2v-windows'`
// embeds the host-delivered face INSIDE the leaf popup (above the
// field stack, the paint/bbox/orbit law), feeds it the row's own
// calls + fps, and commits its next calls array through the ENVELOPE
// channel (onEdit + onPatch on 'calls' — raw, no field coercion). A
// host that delivers no face DEGRADES: no stage node, the kind's own
// fields hold (graceful, never a crash). The h3 package's own wall
// (studio-v2v-form-face.spec.tsx) rides the REAL component through
// the REAL studio door; this wall judges the generic seam alone.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { createElement as h, useState } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import type { ModifierKind } from '../src/spec.ts'
import type { V2vWindowsFaceProps } from '@melite/contracts'
import { ModifiersSection } from '../src/mods.tsx'

afterEach(cleanup)

const EDIT = {
  kind: 'edit', label: 'Video edit', param_key: 'edit', cardinality: 'list', max_stack: 1,
  leaf_face: 'v2v-windows',
  fields: [
    { name: 'edit_prompt', label: 'Edit prompt', type: 'text', default: '' },
    { name: 'denoise', label: 'Denoise', type: 'number', default: 0.32, min: 0.05, max: 1, step: 0.01 },
  ],
} as unknown as ModifierKind

/** THE HOST STUB (the seam judge's probe): renders its own marker
 *  node, echoes the value it received, and commits a fixed next
 *  array when its one verb is pressed — the wall reads what crossed
 *  the seam, not what the real face does. */
function HostStub(props: V2vWindowsFaceProps) {
  const [got] = useState(props)
  return h('div', { 'data-host-stub': 'v2v' },
    h('span', { 'data-stub-value': 'calls' }, JSON.stringify(got.value.calls)),
    h('span', { 'data-stub-value': 'fps' }, String(got.value.fps)),
    h('button', {
      'data-stub-verb': 'split',
      onClick: () => { props.onChange([{ start_frame: 0, end_frame: 56 }, { start_frame: 56, end_frame: 107 }]) },
    }, 'split'))
}

function openLeafViaPicker(kindLabel: string): void {
  const add = document.querySelector('[data-subcard-add="mod"]') as HTMLElement
  expect(add, 'the plus box renders').toBeTruthy()
  fireEvent.click(add)
  fireEvent.click(screen.getByText(kindLabel))
}

/** the open leaf's dialog ELEMENT (scope for raw node queries). */
function dlg(): HTMLElement {
  return screen.getByRole('dialog')
}

test('THE SEAM — a v2v-windows leaf embeds the host face above the fields and commits its next calls array through the envelope (onEdit + onPatch)', () => {
  const onEdit = vi.fn()
  const onPatch = vi.fn()
  render(h(ModifiersSection, {
    kinds: [EDIT],
    values: {
      calls: [{ text: 'a', start_frame: 0, end_frame: 107 }],
      fps: 24,
    },
    onEdit, onPatch, v2vFace: HostStub,
  }))
  openLeafViaPicker('Video edit')
  // THE EMBED (the operator's correction): the face renders INSIDE
  // the leaf modal, seated in the v2v stage
  const stub = dlg().querySelector('[data-host-stub="v2v"]')
  expect(stub, 'the host face embeds inside the leaf modal').toBeTruthy()
  const stage = dlg().querySelector('[data-leaf-stage="v2v"]')
  expect(stage, 'the leaf seats the face in its own v2v stage').toBeTruthy()
  // THE VALUE (one truth, two views): the face receives the ROW's
  // own calls + fps — the same windows the timeline strip draws
  expect(dlg().querySelector('[data-stub-value="calls"]')?.textContent,
    'the face receives the row calls').toBe('[{"text":"a","start_frame":0,"end_frame":107}]')
  expect(dlg().querySelector('[data-stub-value="fps"]')?.textContent,
    'the face receives the row fps').toBe('24')
  // THE FIELDS HOLD (the additive law): the kind's own grammar still
  // renders beside the embedded face
  expect(within(dlg()).getByLabelText('Edit prompt', { selector: 'input' })).toBeTruthy()
  // THE COMMIT (the envelope channel): the face's next array lands
  // RAW on 'calls' through BOTH verbs
  fireEvent.click(dlg().querySelector('[data-stub-verb="split"]') as HTMLElement)
  const NEXT = [{ start_frame: 0, end_frame: 56 }, { start_frame: 56, end_frame: 107 }]
  expect(onEdit).toHaveBeenCalledWith('calls', NEXT)
  expect(onPatch).toHaveBeenCalledWith({ calls: NEXT })
})

test('THE DEGRADE — a host that delivers no face keeps the leaf whole: no stage node, no embed, the kind fields hold (graceful, never a crash)', () => {
  render(h(ModifiersSection, {
    kinds: [EDIT],
    values: { calls: [{ text: 'a', start_frame: 0, end_frame: 107 }], fps: 24 },
    onEdit: vi.fn(),
  }))
  openLeafViaPicker('Video edit')
  expect(document.querySelector('[data-host-stub="v2v"]'), 'no face renders without a host').toBeNull()
  expect(document.querySelector('[data-leaf-stage]'), 'no v2v stage seats without a host').toBeNull()
  expect(within(dlg()).getByLabelText('Edit prompt', { selector: 'input' })).toBeTruthy()
  expect(within(dlg()).getByLabelText('Denoise', { selector: 'input[type="number"]' })).toBeTruthy()
})
