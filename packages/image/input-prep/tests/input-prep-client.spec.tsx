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
 * hand-copied list); EVERY EDIT SCHEDULES its patch at edit time
 * through the slot's own door (the 2026-10-20 run-carry burn: the
 * pill's verb was a last-bind-wins race and the losing verb dropped
 * the pick — the bench tile's Run and the sidebar's draft lane
 * carried no studio verb at all, so an optimistic edit composed the
 * FROZEN row; the edit itself now schedules the write and every run
 * door sweeps it); the adapter registers the view under the card's
 * own key.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { createElement as h } from 'react'
import { InputPrepStudio, cropOf, isPreviewable } from '../src/ui/studio/component.tsx'
import { CropPreview, cropIsHonorable } from '../src/ui/studio/CropPreview.tsx'
import { apply, inject, name } from '../src/client/index.ts'
import { ASSET_DRAG_MIME } from '@melite/card-base/client'
import { SCALE_METHODS, SCALE_MODEL_OPTIONS, UPSCALE_MODELS, MIN_DIM } from '@melite/models-input'

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
  it('AUDIT F8: a source that fails to decode names itself — never a permanent broken frame', () => {
    render(h(CropPreview, { src: 'https://dead.example/host/gone.png', crop: null, onChange: vi.fn() }))
    const img = screen.getByTestId('prep-crop-preview').querySelector('img') as HTMLImageElement
    fireEvent.error(img)
    // the pane's own honesty law: the studio SAYS the source will
    // not load instead of rendering a silent broken frame — the note
    // names the unloadable source and no crop overlay mounts
    const note = screen.getByTestId('prep-load-error')
    expect(note.textContent).toContain('https://dead.example/host/gone.png')
    expect(screen.queryByTestId('prep-crop-overlay')).toBeNull()
  })

  it('THE PREVIEW SEAT IS THE IMAGE (the ANNY-studio pin): the <img> renders the stage media and the drag box rides OVER it', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: null, onChange }))
    seatPreview(800, 600)
    drag(screen.getByTestId('prep-crop-overlay'), [[10, 20], [110, 170]])
    expect(onChange).toHaveBeenCalledTimes(1)
    const wrap = screen.getByTestId('prep-crop-preview')
    const img = wrap.querySelector('img')
    expect(img?.getAttribute('src')).toBe(IMG)
    expect(wrap.contains(screen.getByTestId('prep-crop-box'))).toBe(true)
  })

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

  // THE 8-HANDLE MATRIX (image-3d wave-2 cure 2: only `se` ever
  // drove resizeRect — 7 of 8 handles carried no judge and the
  // branch floor sat at 76.38). Every handle drives the REAL
  // pointer seam; the table states the moving edges and the pinned
  // edges per handle, in image px on the 800x600 natural.
  it.each([
    ['nw', [5, 5], { x: 5, y: 5, width: 105, height: 165 }],
    ['ne', [300, 5], { x: 10, y: 5, width: 290, height: 165 }],
    ['se', [210, 220], { x: 10, y: 20, width: 200, height: 200 }],
    ['sw', [5, 220], { x: 5, y: 20, width: 105, height: 200 }],
    ['n', [60, 5], { x: 10, y: 5, width: 100, height: 165 }],
    ['e', [300, 170], { x: 10, y: 20, width: 290, height: 150 }],
    ['s', [60, 220], { x: 10, y: 20, width: 100, height: 200 }],
    ['w', [5, 170], { x: 5, y: 20, width: 105, height: 150 }],
  ])('THE %s HANDLE RESIZES (moving edge follows, opposite edge pinned)', (hd, to, want) => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: { x: 10, y: 20, width: 100, height: 150 }, onChange }))
    seatPreview(800, 600)
    drag(screen.getByTestId(`prep-crop-handle-${hd}`), [[110, 170], to as [number, number]])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(want)
  })

  it('THE E HANDLE CLAMPS AT THE IMAGE EDGE (resizeRect never leaves the natural)', () => {
    const onChange = vi.fn()
    render(h(CropPreview, { src: IMG, crop: { x: 10, y: 20, width: 100, height: 150 }, onChange }))
    seatPreview(800, 600)
    drag(screen.getByTestId('prep-crop-handle-e'), [[110, 170], [1200, 170]])
    expect(onChange).toHaveBeenCalledWith({ x: 10, y: 20, width: 790, height: 150 })
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
    // THE STAGE'S MEDIA: the preview <img> renders the row's source —
    // the drag box is drawn over THE image, never a separate abstract control.
    const img = screen.getByTestId('prep-crop-preview').querySelector('img')
    expect(img?.getAttribute('src')).toBe(IMG)
    expect(screen.getByTestId('prep-crop-box').textContent).toContain('100×150')
    expect(screen.getByTestId('prep-natural').textContent).toContain('crop 100×150 at 10,20')
  })

  it('THE PICK POPULATES THE PREVIEW (the operator burn 2026-11-09: dropping a source seats the right pane with NO row change, NO run press)', () => {
    render(h(InputPrepStudio, owner({ params: {} })))
    // the empty face first — the seat is unfilled, the pane says so
    expect(screen.getByTestId('prep-empty-note')).not.toBeNull()
    expect(screen.queryByTestId('prep-crop-preview')).toBeNull()
    // the asset drop — the media bar's own door (ASSET_DRAG_MIME),
    // riding the real square → provider → studio edit seam
    const square = document.querySelector('[data-slot-square]') as HTMLElement
    expect(square).not.toBeNull()
    act(() => {
      fireEvent.drop(square, {
        dataTransfer: {
          getData: (t: string) => t === ASSET_DRAG_MIME ? JSON.stringify({ url: IMG }) : '',
          files: [],
          types: [ASSET_DRAG_MIME],
        },
      })
    })
    // the picked source seats the preview pane AT ONCE — the empty
    // note is gone, the <img> renders the picked media
    expect(screen.queryByTestId('prep-empty-note')).toBeNull()
    const img = screen.getByTestId('prep-crop-preview').querySelector('img')
    expect(img?.getAttribute('src')).toBe(IMG)
  })

  it('THE DRAG COMMITS THE FOUR FLAT PARAMS AT RELEASE: the edit itself schedules the row write (no run press involved)', () => {
    const onPatch = vi.fn()
    const onRun = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG } },
      { onPatch, onRun },
    )))
    const overlay = seatPreview(800, 600)
    act(() => {
      drag(overlay, [[10, 20], [110, 170]])
    })
    // the local user layer holds the crop — the rail's clear button enables
    expect((screen.getByTestId('prep-clear-crop') as HTMLButtonElement).disabled).toBe(false)
    // THE SCHEDULE LAW (the 2026-10-20 run-carry burn): the drag's
    // atomic commit SCHEDULES the four crop keys through the slot's
    // own door AT RELEASE — every run door (pill, bench tile,
    // sidebar draft lane, agent press) sweeps the scheduled write
    // before it composes; no verb race can drop the pick
    expect(onPatch, 'the edit must schedule its patch at edit time — the frozen-row compose burn').toHaveBeenCalledTimes(1)
    expect(onPatch.mock.calls[0][0]).toMatchObject({
      crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150,
    })
    // an edit never starts a run by itself
    expect(onRun).not.toHaveBeenCalled()
  })

  it('AUDIT F9: a seeded retired key never re-asserts — an edit schedules ONLY its touched keys (the dormant-key law)', () => {
    const onPatch = vi.fn()
    const onRun = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG, retired_knob: 'stale-value' } },
      { onPatch, onRun },
    )))
    const overlay = seatPreview(800, 600)
    act(() => {
      drag(overlay, [[10, 20], [110, 170]])
    })
    // the retired key rides the frozen row (an old draft) but no edit
    // touches it — under the schedule law it must never reach the
    // admission gate, which would refuse it loud as unknown-param.
    // toEqual, not toMatchObject: extras are the finding.
    expect(onPatch, 'the edit must schedule its patch at edit time').toHaveBeenCalledTimes(1)
    expect(onPatch.mock.calls[0][0]).toEqual({
      crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150,
    })
    expect(onRun).not.toHaveBeenCalled()
  })

  it('THE PICK SCHEDULES THE ROW WRITE AT PICK TIME (the tile-door carry: no studio verb exists on that door — the schedule IS the carry)', () => {
    const onPatch = vi.fn()
    render(h(InputPrepStudio, owner({ params: {} }, { onPatch })))
    const square = document.querySelector('[data-slot-square]') as HTMLElement
    act(() => {
      fireEvent.drop(square, {
        dataTransfer: {
          getData: (t: string) => t === ASSET_DRAG_MIME ? JSON.stringify({ url: IMG }) : '',
          files: [],
          types: [ASSET_DRAG_MIME],
        },
      })
    })
    expect(onPatch, 'a dropped source must reach the row WITHOUT any run press — the bench tile Run composes the scheduled write').toHaveBeenCalledTimes(1)
    expect(onPatch.mock.calls[0][0]).toMatchObject({ source: IMG })
    // the preview populates at once (the optimistic layer owns display)
    expect(screen.queryByTestId('prep-empty-note')).toBeNull()
  })

  // AUDIT input-prep F2 (input-prep-total-verification-2026-10-20):
  // an audio pick was unseat-able as audio — no media_type verb
  // existed, so a .wav drop composed the IMAGE lane (LoadImage with
  // an audio filename) and died in engine dialect, or the pane
  // rendered the staged-IMAGE note for it. THE MEDIA-KIND LAW: the
  // pick's own shape seats the lane — an audio-shaped source seats
  // media_type:'audio' with the source, and the pane renders the
  // audio restage face, never a broken image arm.
  it('AUDIT F2: AN AUDIO PICK SEATS THE AUDIO LANE — the pick shape carries media_type and the pane follows', () => {
    const onPatch = vi.fn()
    render(h(InputPrepStudio, owner({ params: {} }, { onPatch })))
    const square = document.querySelector('[data-slot-square]') as HTMLElement
    act(() => {
      fireEvent.drop(square, {
        dataTransfer: {
          getData: (t: string) => t === ASSET_DRAG_MIME ? JSON.stringify({ url: 'https://media.example/voice-take.wav' }) : '',
          files: [],
          types: [ASSET_DRAG_MIME],
        },
      })
    })
    expect(onPatch, 'the pick schedules its row write like every edit').toHaveBeenCalledTimes(1)
    // an audio-shaped pick seats the audio lane with the source — the compose branch keys on media_type
    expect(onPatch.mock.calls[0][0]).toMatchObject({
      source: 'https://media.example/voice-take.wav',
      media_type: 'audio',
    })
    // the pane follows: the audio restage face, never a dead image arm
    expect(screen.getByTestId('prep-audio-note')).not.toBeNull()
    expect(screen.queryByTestId('prep-staged-note')).toBeNull()
    expect(screen.queryByTestId('prep-crop-preview')).toBeNull()

    // the counter: an IMAGE-shaped pick seats the image lane
    cleanup()
    const onImagePatch = vi.fn()
    render(h(InputPrepStudio, owner({ params: {} }, { onPatch: onImagePatch })))
    const imageSquare = document.querySelector('[data-slot-square]') as HTMLElement
    act(() => {
      fireEvent.drop(imageSquare, {
        dataTransfer: {
          getData: (t: string) => t === ASSET_DRAG_MIME ? JSON.stringify({ url: IMG }) : '',
          files: [],
          types: [ASSET_DRAG_MIME],
        },
      })
    })
    expect(onImagePatch.mock.calls[0][0]).toMatchObject({ source: IMG, media_type: 'image' })
    expect(screen.queryByTestId('prep-audio-note')).toBeNull()
  })

  // AUDIT input-prep F6.4: the rail's clamp `Math.max(1,
  // Math.round(Number(raw)))` seated Infinity for 1e999 — a value
  // that JSON-serializes to null at the door and composes garbage.
  // THE FINITE LAW: a non-finite keystroke seats the UNSET key,
  // never Infinity.
  it('AUDIT F6.4: a degenerate scale keystroke (1e999) seats unset, never Infinity', () => {
    const onPatch = vi.fn()
    render(h(InputPrepStudio, owner({ params: { source: IMG } }, { onPatch })))
    act(() => {
      fireEvent.change(screen.getByTestId('prep-scale-scale_width'), { target: { value: '1e999' } })
    })
    // Infinity JSON-serializes to null at the door — a non-finite keystroke seats the unset key
    expect(onPatch.mock.calls[0][0]).toMatchObject({ scale_width: -1 })
    expect(Number.isFinite(onPatch.mock.calls[0][0]['scale_width'])).toBe(true)
    expect((screen.getByTestId('prep-scale-scale_width') as HTMLInputElement).value).toBe('')
  })

  it('NO RUN VERB BINDS (single writer: the drill owns the frame pill — the last-bind-wins race is dead by construction)', () => {
    const bindRun = vi.fn()
    render(h(InputPrepStudio, owner({ params: { source: IMG } }, { bindRun })))
    expect(bindRun).not.toHaveBeenCalled()
  })

  it('THE RE-SEAT LAW: a row that moves while writes are UNSETTLED never wipes the operator\'s typing; a quiet row re-seats (audit F4)', () => {
    let unsettled = false
    const onPatch = vi.fn()
    const view = render(h(InputPrepStudio, owner(
      { params: { source: IMG } },
      { onPatch, hasUnsettledWrites: () => unsettled },
    )))
    seatPreview(800, 600)
    act(() => {
      drag(screen.getByTestId('prep-crop-overlay'), [[10, 20], [110, 170]])
    })
    expect(onPatch).toHaveBeenCalledTimes(1)
    // the echo arrives MID-WRITE (the bench re-rendered while our
    // patch is still in flight): the re-seat is withheld
    unsettled = true
    act(() => {
      view.rerender(h(InputPrepStudio, owner(
        { params: { source: IMG, crop_x: 99, crop_y: 99, crop_width: 9, crop_height: 9 } },
        { onPatch, hasUnsettledWrites: () => unsettled },
      )))
    })
    expect(screen.getByTestId('prep-crop-box').textContent).toContain('100×150')
    // the write settles, the row is quiet truth: the re-seat seats
    unsettled = false
    act(() => {
      view.rerender(h(InputPrepStudio, owner(
        { params: { source: IMG, crop_x: 99, crop_y: 99, crop_width: 9, crop_height: 9 } },
        { onPatch, hasUnsettledWrites: () => unsettled },
      )))
    })
    expect(screen.getByTestId('prep-crop-box').textContent).toContain('9×9')
  })

  it('THE ABSENT-PARAMS ROW NEVER WIPES (a row without params has ONE stable identity — audit F4)', () => {
    const onPatch = vi.fn()
    const rowA: Record<string, unknown> = { id: 's_0', card: 'input-prep' }
    const rowB: Record<string, unknown> = { id: 's_0', card: 'input-prep' }
    const view = render(h(InputPrepStudio, owner(rowA, { onPatch })))
    const square = document.querySelector('[data-slot-square]') as HTMLElement
    act(() => {
      fireEvent.drop(square, {
        dataTransfer: {
          getData: (t: string) => t === ASSET_DRAG_MIME ? JSON.stringify({ url: IMG }) : '',
          files: [],
          types: [ASSET_DRAG_MIME],
        },
      })
    })
    // a re-render hands a DIFFERENT row object that still carries no
    // params — the pick must survive (the render-derived {} loop)
    act(() => {
      view.rerender(h(InputPrepStudio, owner(rowB, { onPatch })))
    })
    const img = screen.getByTestId('prep-crop-preview').querySelector('img')
    expect(img?.getAttribute('src')).toBe(IMG)
  })

  it('CLEAR CROP SEATS THE -1 GRAMMAR (the card unset truth, scheduled at click)', () => {
    const onPatch = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG, crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150 } },
      { onPatch },
    )))
    seatPreview(800, 600)
    act(() => {
      fireEvent.click(screen.getByTestId('prep-clear-crop'))
    })
    expect(onPatch.mock.calls[0][0]).toMatchObject({
      crop_x: -1, crop_y: -1, crop_width: -1, crop_height: -1,
    })
  })

  it('THE SCALE RAIL WRITES THE CARD PARAMS: typing seats width, presets derive from the crop', () => {
    const onPatch = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG, crop_x: 10, crop_y: 20, crop_width: 100, crop_height: 150 } },
      { onPatch },
    )))
    seatPreview(800, 600)
    act(() => {
      fireEvent.change(screen.getByTestId('prep-scale-scale_width'), { target: { value: '512' } })
    })
    // the height input rides its own onChange (the width twin's
    // coverage never reaches it — the 94.33% gate18 red named it)
    act(() => {
      fireEvent.change(screen.getByTestId('prep-scale-scale_height'), { target: { value: '384' } })
    })
    // the ×2 preset multiplies the CROP box (100×150 → 200×300)
    act(() => {
      fireEvent.click(screen.getByTestId('prep-preset-2x'))
    })
    expect(onPatch.mock.calls[0][0]).toMatchObject({ scale_width: 512 })
    expect(onPatch.mock.calls[1][0]).toMatchObject({ scale_height: 384 })
    expect(onPatch.mock.calls[2][0]).toMatchObject({
      scale_width: 200, scale_height: 300,
    })
    // clear returns the -1 unset grammar
    act(() => {
      fireEvent.click(screen.getByTestId('prep-clear-scale'))
    })
    expect(onPatch.mock.calls[3][0]).toMatchObject({ scale_width: -1, scale_height: -1 })
  })

  it('THE MODEL CHOICE IS THE UPSCALE-MODEL VOCABULARY (its own home is the oracle; "" unstated leads)', () => {
    render(h(InputPrepStudio, owner({ params: { source: IMG } })))
    const select = screen.getByTestId('prep-scale-model') as HTMLSelectElement
    const offered = Array.from(select.options).map((o) => o.value)
    expect(offered).toEqual(['', ...UPSCALE_MODELS])
    expect(select.value).toBe('')
    act(() => {
      fireEvent.change(select, { target: { value: 'RealESRGAN_x4plus' } })
    })
    expect(select.value).toBe('RealESRGAN_x4plus')
    act(() => {
      fireEvent.change(select, { target: { value: '' } })
    })
    expect(select.value).toBe('')
  })

  it('THE RESAMPLE METHOD IS THE RESAMPLE VOCABULARY (its own home is the oracle)', () => {
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

  it('THE MODEL CHOICE RIDES THE SAVED DOC (each choice schedules its own write; the sentinel unstateds)', () => {
    const onPatch = vi.fn()
    render(h(InputPrepStudio, owner(
      { params: { source: IMG, scale_model: '4x-UltraSharp' } },
      { onPatch },
    )))
    act(() => {
      fireEvent.change(screen.getByTestId('prep-scale-model'), { target: { value: 'ESRGAN_x4' } })
    })
    expect(onPatch.mock.calls[0][0]).toMatchObject({ scale_model: 'ESRGAN_x4' })
    act(() => {
      fireEvent.change(screen.getByTestId('prep-scale-model'), { target: { value: '' } })
    })
    expect(onPatch.mock.calls[1][0]).toMatchObject({ scale_model: '' })
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
    expect(screen.queryByTestId('prep-scale-model')).toBeNull()
    // the image arm keeps the full rail, model choice included
    render(h(InputPrepStudio, owner({ params: { source: 'x.png', media_type: 'image' } })))
    expect(screen.getByTestId('prep-rail')).not.toBeNull()
    expect(screen.getByTestId('prep-scale-scale_width')).not.toBeNull()
    expect(screen.getByTestId('prep-scale-model')).not.toBeNull()
  })

  // THE CHROME LAW (operator 2026-11-09: params LEFT, preview RIGHT,
  // upload SEATED — "THAT IS HOW EVERY CARD WORKS" and "WHERE IS THE
  // IMAGE UPLOAD SPOT?") — the studio forked the shell (preview first,
  // rail second) and replaced the generic form without seating the
  // source square: two burns, one fork.
  describe('the chrome (the ANNY law: params LEFT, preview RIGHT, upload SEATED)', () => {
    it('PARAMS LEFT, PREVIEW RIGHT — the shared shell seats the rail BEFORE the preview pane (DOM order)', () => {
      render(h(InputPrepStudio, owner({ params: { source: IMG } })))
      const rail = screen.getByTestId('prep-rail')
      const preview = screen.getByTestId('prep-crop-preview')
      expect(rail.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    })

    it('THE UPLOAD SEAT CONSTRUCTS (the construction law — no magic to get an image in): the source square renders in the studio and mirrors the held param', () => {
      render(h(InputPrepStudio, owner({ params: { source: IMG } })))
      const seat = document.querySelector('[data-source-row="Source file"]')
      expect(seat).not.toBeNull()
      const thumb = seat?.querySelector('img') ?? null
      expect(thumb?.getAttribute('src')).toBe(IMG)
    })

    it('THE SOURCE SEAT SPEAKS ITS VERBS (the one square: From flow / From media / From file)', async () => {
      render(h(InputPrepStudio, owner({ params: {} })))
      const seat = document.querySelector('[data-source-row="Source file"]') as HTMLElement | null
      expect(seat).not.toBeNull()
      const square = seat!.querySelector('[data-slot-square]') as HTMLElement | null
      expect(square).not.toBeNull()
      await act(async () => { fireEvent.click(square!) })
      const rows = await screen.findAllByText(/from flow|from media|from file/i)
      expect(rows.length).toBeGreaterThanOrEqual(3)
    })
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
