/**
 * input-prep-client — the ANNY-style crop studio's wall (operator
 * 2026-11, defect 3: "the preview is where you have the image, you
 * can drag a box around to crop, then also parameters to upscale /
 * downscale optionally, letting you choose the model").
 *
 * WHAT THESE ARMS GUARD (each fires on its own path — the split-arm
 * lesson): the drag grammar writes the card's four crop params as
 * ONE atomic commit at release (never a patch storm per move); an
 * under-floor box NEVER commits (the blank-image law — a side below
 * MIN_DIM upscales to a blank, so the UI refuses to seat it); the
 * scale rail writes the card's scale params with the resample
 * vocabulary's OWN home as the oracle (models-input, never a
 * hand-copied list); the run verb PATCHES FIRST then starts (the
 * estate's patch-first law — the frame pill never runs past an
 * unflushed crop); the adapter registers the view under the card's
 * own key.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { createElement as h } from 'react'
import { InputPrepStudio, cropOf, isPreviewable } from '../src/ui/studio/component.tsx'
import { CropPreview, cropIsHonorable } from '../src/ui/studio/CropPreview.tsx'
import { apply, inject, name } from '../src/client/index.ts'
import { SCALE_METHODS, MIN_DIM } from '@melite/models-input'

const IMG = 'data:image/png;base64,iVBORw0KGgo='

function owner(row: Record<string, unknown>, over: Record<string, unknown> = {}) {
  return {
    stageId: 's_0',
    cardName: 'input-prep',
    row: { id: 's_0', card: 'input-prep', ...row },
    runStatus: '',
    onPatch: vi.fn(),
    onRun: vi.fn(),
    onStop: () => {},
    onRemove: () => {},
    onSurface: () => {},
    upstream: [],
    runId: null,
    ...over,
  } as never
}

const rectRestorers: Array<() => void> = []
afterEach(() => {
  cleanup()
  while (rectRestorers.length > 0) rectRestorers.pop()!()
})

/** Seat the preview: stub the <img>'s natural size (jsdom never
 * decodes), fire load, and pin the overlay's rect (1:1 with the
 * natural px — the drag math reads straight in image px). */
function seatPreview(naturalW: number, naturalH: number) {
  const img = screen.getByTestId('prep-crop-preview').querySelector('img') as HTMLImageElement
  expect(img).not.toBeNull()
  Object.defineProperty(img, 'naturalWidth', { configurable: true, value: naturalW })
  Object.defineProperty(img, 'naturalHeight', { configurable: true, value: naturalH })
  fireEvent.load(img)
  const overlay = screen.getByTestId('prep-crop-overlay') as HTMLDivElement
  const prev = overlay.getBoundingClientRect.bind(overlay)
  overlay.getBoundingClientRect = () =>
    ({ x: 0, y: 0, left: 0, top: 0, right: naturalW, bottom: naturalH, width: naturalW, height: naturalH, toJSON() {} } as DOMRect)
  rectRestorers.push(() => { overlay.getBoundingClientRect = prev })
  return overlay
}

function drag(el: Element, points: Array<[number, number]>) {
  const [down, ...moves] = points
  fireEvent.pointerDown(el, { pointerId: 1, clientX: down[0], clientY: down[1] })
  for (const [x, y] of moves) fireEvent.pointerMove(el, { pointerId: 1, clientX: x, clientY: y })
  fireEvent.pointerUp(el, { pointerId: 1 })
}

describe('the crop leaf (CropPreview)', () => {
  it('A DRAW COMMITS ATOMICALLY: one onChange at release, in image px, normalized', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: null, onChange }))
    const overlay = seatPreview(800, 600)
    drag(overlay, [[10, 20], [60, 90], [110, 170]])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ x: 10, y: 20, width: 100, height: 150 })
    // the box renders with its size badge (the operator's readback)
    expect(screen.getByTestId('prep-crop-box')).not.toBeNull()
    expect(screen.getByTestId('prep-crop-box').textContent).toContain('100×150')
  })

  it('A MIRROR DRAG NORMALIZES: dragging up-left seats the same box', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: null, onChange }))
    const overlay = seatPreview(800, 600)
    drag(overlay, [[110, 170], [10, 20]])
    expect(onChange).toHaveBeenCalledWith({ x: 10, y: 20, width: 100, height: 150 })
  })

  it('THE BLANK-IMAGE LAW AT THE UI: a draw under MIN_DIM never commits a box', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: null, onChange }))
    const overlay = seatPreview(800, 600)
    // a 4×4 box — below the engine's own 8px floor
    drag(overlay, [[10, 10], [14, 14]])
    expect(onChange).toHaveBeenCalledWith(null)
    expect(screen.queryByTestId('prep-crop-box')).toBeNull()
  })

  it('A CLICK ON EMPTY VEIL CLEARS (no drag = clear, not a 0×0 commit)', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: { x: 10, y: 20, width: 100, height: 150 }, onChange }))
    const overlay = seatPreview(800, 600)
    drag(overlay, [[500, 400]])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('PRESS INSIDE MOVES THE BOX (clamped to the image)', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: { x: 10, y: 20, width: 100, height: 150 }, onChange }))
    const overlay = seatPreview(800, 600)
    // press at (60, 90) — inside the box — and move by (+40, +30)
    drag(overlay, [[60, 90], [100, 120]])
    expect(onChange).toHaveBeenCalledWith({ x: 50, y: 50, width: 100, height: 150 })
  })

  it('THE SE HANDLE RESIZES (the pinned corner stays)', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: { x: 10, y: 20, width: 100, height: 150 }, onChange }))
    seatPreview(800, 600)
    const handle = screen.getByTestId('prep-crop-handle-se')
    drag(handle, [[110, 170], [210, 220]])
    expect(onChange).toHaveBeenCalledWith({ x: 10, y: 20, width: 200, height: 200 })
  })

  it('cropIsHonorable guards the engine floor (MIN_DIM from the family, not a copy)', () => {
    expect(cropIsHonorable({ x: 0, y: 0, width: MIN_DIM, height: MIN_DIM })).toBe(true)
    expect(cropIsHonorable({ x: 0, y: 0, width: MIN_DIM - 1, height: 100 })).toBe(false)
  })
})

describe('the studio (InputPrepStudio)', () => {
  it('DERIVES THE BOX FROM THE CARD PARAMS: crop_x/y/width/height seat the box', () => {
    render(h(InputPrepStudio, owner({ params: { source: IMG, crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150 } })))
    seatPreview(800, 600)
    expect(screen.getByTestId('prep-crop-box').textContent).toContain('100×150')
    expect(screen.getByTestId('prep-natural').textContent).toContain('crop 100×150 at 10,20')
  })

  it('THE DRAG COMMITS THE FOUR FLAT PARAMS: user state carries them (the run patch proves it)', () => {
    const onPatch = vi.fn()
    const onRun = vi.fn()
    const bindRun = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG } },
      { onPatch, onRun, bindRun },
    )))
    const overlay = seatPreview(800, 600)
    act(() => {
      drag(overlay, [[10, 20], [110, 170]])
    })
    // the local user layer holds the crop — the rail's clear button enables
    expect((screen.getByTestId('prep-clear-crop') as HTMLButtonElement).disabled).toBe(false)
    // RUN: the bound verb patches FIRST (the four crop keys), then runs
    expect(bindRun).toHaveBeenCalledTimes(1)
    const verb = bindRun.mock.calls[0][0] as () => void
    act(() => { verb() })
    expect(onPatch).toHaveBeenCalledTimes(1)
    expect(onPatch.mock.calls[0][0]).toMatchObject({
      source: IMG,
      crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150,
    })
    expect(onRun).toHaveBeenCalledTimes(1)
    // ORDER: the patch was called before the run (patch-first)
    expect(onPatch.mock.invocationCallOrder[0]).toBeLessThan(onRun.mock.invocationCallOrder[0])
  })

  it('CLEAR CROP SEATS THE -1 GRAMMAR (the card unset truth)', () => {
    const onPatch = vi.fn()
    const bindRun = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG, crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150 } },
      { onPatch, bindRun },
    )))
    seatPreview(800, 600)
    act(() => {
      fireEvent.click(screen.getByTestId('prep-clear-crop'))
    })
    const verb = bindRun.mock.calls[0][0] as () => void
    act(() => { verb() })
    expect(onPatch.mock.calls[0][0]).toMatchObject({
      crop_x: -1, crop_y: -1, crop_width: -1, crop_height: -1,
    })
  })

  it('THE SCALE RAIL WRITES THE CARD PARAMS: typing seats width, presets derive from the crop', () => {
    const onPatch = vi.fn()
    const bindRun = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG, crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150 } },
      { onPatch, bindRun },
    )))
    seatPreview(800, 600)
    act(() => {
      fireEvent.change(screen.getByTestId('prep-scale-scale_width'), { target: { value: '512' } })
    })
    // the ×2 preset multiplies the CROP box (100×150 → 200×300)
    act(() => {
      fireEvent.click(screen.getByTestId('prep-preset-2x'))
    })
    const verb = bindRun.mock.calls[0][0] as () => void
    act(() => { verb() })
    expect(onPatch.mock.calls[0][0]).toMatchObject({
      scale_width: 200, scale_height: 300,
    })
    // clear returns the -1 unset grammar
    act(() => {
      fireEvent.click(screen.getByTestId('prep-clear-scale'))
    })
    act(() => { verb2Of(bindRun)() })
    expect(onPatch.mock.calls[1][0]).toMatchObject({ scale_width: -1, scale_height: -1 })
  })

  it('THE MODEL CHOICE IS THE RESAMPLE VOCABULARY (its own home is the oracle)', () => {
    render(h(InputPrepStudio, owner({ params: { source: IMG } })))
    const select = screen.getByTestId('prep-scale-method') as HTMLSelectElement
    const offered = Array.from(select.options).map((o) => o.value)
    expect(offered).toEqual([...SCALE_METHODS])
    expect(offered).toContain('lanczos')
    expect(select.value).toBe('lanczos')
    act(() => {
      fireEvent.change(select, { target: { value: 'bicubic' } })
    })
    expect(select.value).toBe('bicubic')
  })

  it('A STAGED (non-browser) SOURCE SAYS SO — no broken preview frame', () => {
    render(h(InputPrepStudio, owner({ params: { source: 'staged_input.png' } })))
    expect(screen.getByTestId('prep-staged-note').textContent).toContain('staged_input.png')
    expect(screen.queryByTestId('prep-crop-preview')).toBeNull()
  })

  it('AN EMPTY SOURCE ASKS FOR ONE (the preview crops what the run stages)', () => {
    render(h(InputPrepStudio, owner({ params: {} })))
    expect(screen.getByTestId('prep-empty-note')).not.toBeNull()
  })

  it('AUDIO RESTAGE HAS NO CROP FACE (image-lane knobs stay image-lane)', () => {
    render(h(InputPrepStudio, owner({ params: { source: 'x.wav', media_type: 'audio' } })))
    expect(screen.getByTestId('prep-audio-note')).not.toBeNull()
    expect(screen.queryByTestId('prep-crop-preview')).toBeNull()
  })

  it('AUDIO RESTAGE SEATS NO TRANSFORM RAIL (the declared-surface mirror, image-3d wave-2: the rail rendered crop/scale knobs the declaration hides and compose silently dropped)', () => {
    render(h(InputPrepStudio, owner({ params: { source: 'x.wav', media_type: 'audio' } })))
    expect(screen.queryByTestId('prep-rail')).toBeNull()
    expect(screen.queryByTestId('prep-scale-scale_width')).toBeNull()
    // the image arm keeps the full rail
    render(h(InputPrepStudio, owner({ params: { source: 'x.png', media_type: 'image' } })))
    expect(screen.getByTestId('prep-rail')).not.toBeNull()
    expect(screen.getByTestId('prep-scale-scale_width')).not.toBeNull()
  })
})

describe('the adapter (src/client/index.ts)', () => {
  it('REGISTERS THE VIEW UNDER THE CARD KEY (name/inject/apply)', () => {
    expect(name).toBe('inputPrepStudio')
    expect(inject).toEqual(['slots'])
    expect(typeof apply).toBe('function')
  })

  it('cropOf reads ONLY four seated numbers (the -1 grammar refuses partials)', () => {
    expect(cropOf({ crop_x: 1, crop_y: 2, crop_width: 3, crop_height: 4 }))
      .toEqual({ x: 1, y: 2, width: 3, height: 4 })
    expect(cropOf({ crop_x: 1, crop_y: 2, crop_width: -1, crop_height: 4 })).toBeNull()
    expect(cropOf({ crop_x: 1 })).toBeNull()
    expect(cropOf({ crop_x: 'a', crop_y: 2, crop_width: 3, crop_height: 4 })).toBeNull()
  })

  it('isPreviewable accepts browser-loadable sources only', () => {
    expect(isPreviewable('data:image/png;base64,x')).toBe(true)
    expect(isPreviewable('blob:http://x/y')).toBe(true)
    expect(isPreviewable('https://e/a.png')).toBe(true)
    expect(isPreviewable('/estate/a.png')).toBe(true)
    expect(isPreviewable('staged_input.png')).toBe(false)
    expect(isPreviewable('')).toBe(false)
  })
})

/** The second bindRun registration (state moved twice → two verbs;
 * the LATEST one is the live truth — the ref-dispatcher law). */
function verb2Of(bindRun: ReturnType<typeof vi.fn>): () => void {
  return bindRun.mock.calls[bindRun.mock.calls.length - 1][0] as () => void
}
