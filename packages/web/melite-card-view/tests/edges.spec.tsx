/**
 * edges.spec.tsx — THE EDGE LAW's client proof (operator order,
 * 2026-09-12: "whenever a card emits via the package system, it
 * needs to have 'input' 'required=True', or 'output', so the edges
 * are defined"): the square provider's picker narrows PER FIELD —
 * only rows whose card DECLARES an output of the field's input-edge
 * kind serve in the menu. The base constructs the narrowing; the
 * emission defines the edges.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, useRef } from 'react'
import { afterEach, expect, test, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { schemaEnvelope, CardForm as SpecForm, useSquareProvider, type FormSpecDoc, type SpecValues } from '@melite/card-base/client'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// the drill-side narrowing the CardsTab builds from the emission:
// spec.inputs (declared edge kinds) × the forms-table's declared
// outputs — exactly the candidatesFor the drill passes the provider.
// THE LIST-SEAT LAW (2026-09-26, the operator's rework: "reference
// images and input images are the same thing"): an image_list edge
// (reference_images) is an INPUT seat that ACCUMULATES image
// producers — the singular kind serves the list seat, nothing else.
function edgeNarrow(
  spec: { inputs: Array<{ name: string; kind: string }> },
  edgeMeta: Record<string, { outputs?: Record<string, string> }>,
  rows: Array<{ id: string; card: string; label: string; url: string }>,
): (f: { name: string }) => Array<{ id: string; label: string; url: string }> {
  return (f) => {
    const edge = spec.inputs.find((e) => e.name === f.name)
    if (edge === undefined) return rows.map(({ id, label, url }) => ({ id, label, url }))
    // THE GENERALIZED LIST-SEAT LAW (2026-10-09): every `_list`
    // seat accepts its singular kind — the production mirror.
    const accepts = (out: string): boolean =>
      out === edge.kind || out + '_list' === edge.kind
    return rows
      .filter((r) => {
        const outs = edgeMeta[r.card]?.outputs
        return outs !== undefined && Object.values(outs).some(accepts)
      })
      .map(({ id, label, url }) => ({ id, label, url }))
  }
}

test('THE EDGE LAW: the picker offers only kind-matching outputs — a text-output row never serves an image edge', async () => {
  const user = userEvent.setup()
  let hostEdit = vi.fn<(name: string, v: unknown) => void>()
  // the emission: input_image declares an IMAGE edge; input_text
  // declares a TEXT edge (both required — True emits)
  const spec = {
    inputs: [
      { name: 'input_image', kind: 'image', required: true },
      { name: 'notes', kind: 'text' },
    ],
  }
  // the forms table's declared outputs: img declares image, tts
  // declares audio (a PNG-url row from a TEXT-output card is the
  // corruption the law kills — url shapes NEVER decide, the
  // DECLARATION does)
  const edgeMeta = {
    'image-gen': { outputs: { default: 'image' } },
    'tts': { outputs: { default: 'audio' } },
  }
  const rows = [
    { id: 's_img', card: 'image-gen', label: 'image-gen', url: '/melite-media/runs/r8/img/gen_00001_.png' },
    { id: 's_tts', card: 'tts', label: 'tts', url: '/melite-media/runs/r9/tts/out_00001_.wav' },
  ]
  const candidatesFor = edgeNarrow(spec, edgeMeta, rows)
  function Host(): ReturnType<typeof createElement> {
    const editRef = useRef<typeof hostEdit | null>(null)
    if (editRef.current === null) editRef.current = vi.fn<(name: string, v: unknown) => void>()
    hostEdit = editRef.current
    const { square, wireMenu } = useSquareProvider(editRef.current, {
      candidates: rows.map(({ id, label, url }) => ({ id, label, url })),
      candidatesFor,
    })
    const doc: FormSpecDoc = {
      form: 'edges-fixture',
      inputs: spec.inputs as FormSpecDoc['inputs'],
      schema: schemaEnvelope({
        input_image: { type: 'string', meta: { description: 'Input image', extra: { wtype: 'image' } } },
        notes: { type: 'string', meta: { description: 'Notes', extra: { wtype: 'textarea' } } },
      }),
    }
    return createElement('div', null,
      wireMenu,
      createElement(SpecForm, { spec: doc, user: {}, onSet: editRef.current, onPick: () => {}, square }),
    )
  }
  render(createElement(Host))
  await user.click(screen.getByRole('button', { name: /Input image source/ }))
  // the three-entry menu → From flow → the selector modal's rows
  const flow = await screen.findByText('From flow', {}, { timeout: 2000 })
  fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  const imgRow = await screen.findByText('image-gen', {}, { timeout: 2000 })
  expect(imgRow.closest('[data-testid="source-pick-row"]')).toBeTruthy()
  // THE LAW: the tts row (audio-declared output) NEVER serves the
  // image edge — not because of its url, because of its declaration
  await waitFor(() => {
    const rows = [...document.querySelectorAll('[data-testid="source-pick-row"]')]
    expect(rows.some((el) => (el.textContent ?? '').includes('tts'))).toBe(false)
    expect(rows.some((el) => (el.textContent ?? '').includes('image-gen'))).toBe(true)
  })
  // the narrowing does not eat the law-abiding pick
  fireEvent.click(screen.getByText('image-gen'))
  await waitFor(() => {
    expect(hostEdit).toHaveBeenCalledWith('input_image', '/melite-media/runs/r8/img/gen_00001_.png')
  })
})

test('THE EDGE LAW: a field with no declared edge falls to the full list (the picker never blocks)', async () => {
  const user = userEvent.setup()
  const spec = { inputs: [] }
  const edgeMeta = { 'image-gen': { outputs: { default: 'image' } } }
  const rows = [
    { id: 's_img', card: 'image-gen', label: 'image-gen', url: '/melite-media/runs/r8/img/gen_00001_.png' },
  ]
  const candidatesFor = edgeNarrow(spec, edgeMeta, rows)
  function Host(): ReturnType<typeof createElement> {
    const { square, wireMenu } = useSquareProvider(vi.fn(), {
      candidates: rows.map(({ id, label, url }) => ({ id, label, url })),
      candidatesFor,
    })
    const doc: FormSpecDoc = {
      form: 'edges-fixture-2',
      inputs: spec.inputs as FormSpecDoc['inputs'],
      schema: schemaEnvelope({
        extra: { type: 'string', meta: { description: 'Extra', extra: { wtype: 'image' } } },
      }),
    }
    return createElement('div', null,
      wireMenu,
      createElement(SpecForm, { spec: doc, user: {}, onSet: () => {}, onPick: () => {}, square }),
    )
  }
  render(createElement(Host))
  await user.click(screen.getByRole('button', { name: /Extra source/ }))
  const flow = await screen.findByText('From flow', {}, { timeout: 2000 })
  fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  const row = await screen.findByText('image-gen', {}, { timeout: 2000 })
  expect(row.closest('[data-testid="source-pick-row"]')).toBeTruthy()
})

test('THE LIST-SEAT LAW: the reference stack IS an input — its cells narrow by the owning edge and APPEND the pick (2026-09-26)', async () => {
  const user = userEvent.setup()
  let hostEdit = vi.fn<(name: string, v: unknown) => void>()
  // the emission: image1 declares the IMAGE anchor edge;
  // reference_images declares the IMAGE_LIST edge (the reworked
  // image-edit signature — references are IN the input category)
  const spec = {
    inputs: [
      { name: 'image1', kind: 'image', required: true },
      { name: 'reference_images', kind: 'image_list' },
    ],
  }
  const edgeMeta = {
    'image-gen': { outputs: { default: 'image' } },
    'h3-timeline': { outputs: { default: 'video' } },
  }
  const rows = [
    { id: 's_img', card: 'image-gen', label: 'image-gen', url: '/melite-media/runs/r8/img/gen_00001_.png' },
    { id: 's_vid', card: 'h3-timeline', label: 'h3-timeline', url: '/melite-media/runs/r9/h3/h3_t4_film_00001_.mp4' },
  ]
  const candidatesFor = edgeNarrow(spec, edgeMeta, rows)
  function Host(): ReturnType<typeof createElement> {
    const editRef = useRef<typeof hostEdit | null>(null)
    if (editRef.current === null) editRef.current = vi.fn<(name: string, v: unknown) => void>()
    hostEdit = editRef.current
    const { square, wireMenu } = useSquareProvider(editRef.current, {
      candidates: rows.map(({ id, label, url }) => ({ id, label, url })),
      candidatesFor,
    })
    const doc: FormSpecDoc = {
      form: 'edges-list-fixture',
      inputs: spec.inputs as FormSpecDoc['inputs'],
      schema: schemaEnvelope({
        image1: { type: 'string', meta: { description: 'Image 1', extra: { wtype: 'image' } } },
        reference_images: { type: 'array', meta: { description: 'Reference Images', extra: { wtype: 'image_list', max_stack: 15 } } },
      }),
    }
    return createElement('div', null,
      wireMenu,
      createElement(SpecForm, { spec: doc, user: {}, onSet: editRef.current, onPick: () => {}, square, wire: { candidates: rows.map(({ id, label, url }) => ({ id, label, url })), candidatesFor } }),
    )
  }
  render(createElement(Host))
  // the stack's ADD cell (the empty stack renders the add-cell)
  await user.click(screen.getByRole('button', { name: /Add Reference Images/ }))
  const flow = await screen.findByText('From flow', {}, { timeout: 2000 })
  fireEvent.click(flow.closest('[role="menuitem"], [role="option"], li') as HTMLElement)
  // THE LIST-SEAT LAW: the image producer SERVES the image_list
  // seat; the video producer NEVER does (its declaration, not its
  // url — the old unfiltered stack cell offered it)
  await waitFor(() => {
    const rows = [...document.querySelectorAll('[data-testid="source-pick-row"]')]
    expect(rows.some((el) => (el.textContent ?? '').includes('image-gen'))).toBe(true)
    expect(rows.some((el) => (el.textContent ?? '').includes('h3-timeline'))).toBe(false)
  })
  // the pick APPENDS to the list — an input is an input, single or
  // stack; the write lands as the array, never a bare string
  fireEvent.click(screen.getByText('image-gen'))
  await waitFor(() => {
    expect(hostEdit).toHaveBeenCalledWith('reference_images', ['/melite-media/runs/r8/img/gen_00001_.png'])
  })
})

test('THE GENERALIZED LIST LAW: video_list accepts the film stage, audio_list the music stage — the wrong singular never serves (2026-10-09)', () => {
  // the naming-law census: h3's ref_videos/ref_audios declare
  // video_list/audio_list — the picker must offer the PRODUCERS of
  // those singular kinds (a film feeds a motion guide, a music
  // stage feeds a sound reference) and still refuse the wrong
  // genre (an image is not a motion guide).
  const spec = {
    inputs: [
      { name: 'ref_videos', kind: 'video_list' },
      { name: 'ref_audios', kind: 'audio_list' },
    ],
  }
  const edgeMeta = {
    'image-gen': { outputs: { default: 'image' } },
    'h3-timeline': { outputs: { default: 'video' } },
    'music': { outputs: { default: 'audio' } },
  }
  const rows = [
    { id: 's_img', card: 'image-gen', label: 'image-gen', url: '/melite-media/runs/r8/img/gen_00001_.png' },
    { id: 's_vid', card: 'h3-timeline', label: 'h3-timeline', url: '/melite-media/runs/r9/h3/h3_t4_film_00001_.mp4' },
    { id: 's_aud', card: 'music', label: 'music', url: '/melite-media/runs/r10/music/music_00001_.flac' },
  ]
  const candidatesFor = edgeNarrow(spec, edgeMeta, rows)
  const names = (f: { name: string }): string[] => candidatesFor(f).map((c) => c.label)
  expect(names({ name: 'ref_videos' })).toEqual(['h3-timeline'])
  expect(names({ name: 'ref_audios' })).toEqual(['music'])
  // the undeclared field keeps the raw list (the legacy arm)
  expect(names({ name: 'unknown' })).toEqual(['image-gen', 'h3-timeline', 'music'])
})
