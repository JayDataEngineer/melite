// @vitest-environment happy-dom
/**
 * motion studio II — authoring (timeline prompts + keyframes, edit mode).
 * Split from the motion-studio suite: PURE MOVE, zero test-content
 * changes (sibling spec in the same tests/ dir, auto-discovered by
 * the vitest dom project). Shared setup lives in ./helpers.ts.
 *
 * MOUNT PATTERN (2026-09-16): NO act() anywhere — render outside
 * act, waitFor polling finds settled content, root.unmount() in
 * afterEach kills the viewer's async loop. 'Not wrapped in act'
 * warnings are tolerated noise.
 */
import { LOADED_WAIT } from '../../../../tests/helpers/loaded-wait.ts';
import { fireEvent, getByRole, getByText, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement as h } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionCardEditor } from '../src/ui/studio/component.tsx'
import { useToastStore } from '@melite/card-base/client'
import { schemaEnvelope } from '@melite/card-base/client'
import { runCompiledGeneration } from '@melite/catalog'
import { waitForText } from './harness.tsx'
import { SKIN_URL, MOTION_URL, skinResponse, motionResponse } from './fixtures.ts'
import { resetStudio, mounted, mkStage, stubLoads, mountEditor } from './helpers.ts'

afterEach(() => resetStudio())

describe('timeline (prompts + keyframes)', () => {
  // Geometry unlock: the bar null-guards every gesture on zero-size
  // rects (happy-dom has no layout). Stub the TIMELINE SCROLLER's rect
  // only (own property — the viewer's zero-size early-null stays, so no
  // WebGL path wakes; a global prototype stub starves the timers). Not a
  // module mock — a DOM-environment stub in the canvas-stub family.
  const rectRestorers: Array<() => void> = []
  function stubScrollerRect() {
    const el = document.body.querySelector('[data-testid="motion-timeline-scroll"]') as HTMLElement
    const prev = el.getBoundingClientRect.bind(el)
    el.getBoundingClientRect = () => (
      { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 100, width: 800, height: 100, toJSON() {} } as DOMRect
    )
    rectRestorers.push(() => { el.getBoundingClientRect = prev })
  }
  afterEach(() => { while (rectRestorers.length > 0) rectRestorers.pop()!() })

  async function mountedWithRun(params: Record<string, unknown> = {}, motionT = 4) {
    stubLoads({ motionT })
    const m = mountEditor(
      { result: { artifacts: { motion_npz: MOTION_URL } }, params },
      {},
    )
    await waitForText(`30 fps · ${motionT}f`)
    return m
  }

  async function paused(m: { onSave: ReturnType<typeof vi.fn> }) {
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Pause (Space)"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
    return m
  }

  function kfFixture() {
    return {
      keyframes: [{ uuid: 'k1', track_id: 'fullbody', frame: 2 }],
      fullbody: [{ frame: 2, jp: 'AAAA', jr: 'AAAA' }],
    }
  }

  test('STAGE-SCOPED UNDO (CURE-5): a snapshot captured on stage A never restores onto stage B', async () => {
    // THE LESION (motion-journey wave-2): the undo stacks lived in
    // refs with no stage scope — capture on A, switch stages, undo
    // restored A's prompts/keyframes/payloads onto B's doc. The
    // cure resets both stacks on stage.id change DURING RENDER (the
    // useMotionDoc law); this arm is its firing proof.
    stubLoads({ motionT: 4 })
    const onSaveA = vi.fn()
    const stageA = mkStage({ id: 'm1', params: {} })
    const stageB = mkStage({ id: 'm2', params: {} })
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    mounted.push(root)
    const editorFor = (st: typeof stageA, save: ReturnType<typeof vi.fn>) =>
      h(MotionCardEditor, { stage: { ...st, result: { artifacts: { motion_npz: MOTION_URL } } }, onSave: save, runCompiledGeneration } as never)
    root.render(editorFor(stageA, onSaveA))
    await waitForText('30 fps · 4f')
    await paused({ onSave: onSaveA })
    // capture on A: pin one keyframe (a pushUndo gesture) — the
    // working pin test's own gesture shape
    stubScrollerRect()
    const lane = document.body.querySelector('[data-lane="fullbody"]') as HTMLElement
    fireEvent.doubleClick(lane, { clientX: 4, button: 0 })
    await vi.waitFor(() => {
      const call = onSaveA.mock.calls.find(([prm]) => (prm as Record<string, unknown>).motion_constraints)
      if (!call) throw new Error('no A pin yet')
    }, { timeout: LOADED_WAIT() * 0.5 })
    // settle A's persists before the switch (the pin writes twice:
    // the keyframe, then the constraints follow-up)
    await new Promise((r) => setTimeout(r, 400))
    // switch stages on the SAME editor instance
    const onSaveB = vi.fn()
    root.render(editorFor(stageB, onSaveB))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-testid="motion-timeline-scroll"]')) throw new Error('B not mounted')
    }, { timeout: 10000 })
    // Ctrl+Z on B: the A-era stack must be EMPTY — a no-op, never A's restore
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    await new Promise((r) => setTimeout(r, 250))
    // undo on stage B writes nothing — the A-era stack was cleared on the switch
    expect(onSaveB.mock.calls.length).toBe(0)
  })

  test('lane double-click pins a keyframe and persists it', async () => {
    const { onSave } = await mountedWithRun()
    stubScrollerRect()
    const lane = document.body.querySelector('[data-lane="fullbody"]') as HTMLElement
    fireEvent.doubleClick(lane, { clientX: 4, button: 0 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no diamond yet')
    }, { timeout: 10000 })
    const aria = document.body.querySelector('[data-kf]')?.getAttribute('aria-label') ?? ''
    expect(aria).toMatch(/^Full-Body keyframe at frame \d+$/)
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) => (p as Record<string, unknown>).motion_constraints)
      if (!call) throw new Error('constraints not persisted yet')
      expect(typeof (call[0] as Record<string, unknown>).motion_constraints).toBe('string')
    }, { timeout: 10000 })
  })

  test('double-clicking an occupied (lane, frame) seat updates it — never a second dot (the wire seat law)', async () => {
    const { onSave } = await mountedWithRun()
    stubScrollerRect()
    const lane = document.body.querySelector('[data-lane="fullbody"]') as HTMLElement
    fireEvent.doubleClick(lane, { clientX: 4, button: 0 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no diamond yet')
    }, { timeout: 10000 })
    fireEvent.doubleClick(lane, { clientX: 4, button: 0 })
    await new Promise((r) => setTimeout(r, 150))
    // the wire identifies a keyframe by (track_id, frame): the second add
    // on the same seat updates the seated payload instead of emitting a
    // dot re-hydration would collapse — and since the re-snapshot at the
    // same frame carries the SAME pose, the no-op law states nothing.
    expect(document.body.querySelectorAll('[data-kf]').length).toBe(1)
    expect(onSave.mock.calls.filter(([p]) => (p as Record<string, unknown>).motion_constraints)).toHaveLength(1)
  })

  test('keyframe drag moves the diamond', async () => {
    await mountedWithRun()
    stubScrollerRect()
    const lane = document.body.querySelector('[data-lane="fullbody"]') as HTMLElement
    fireEvent.doubleClick(lane, { clientX: 4, button: 0 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no diamond yet')
    }, { timeout: 10000 })
    const before = document.body.querySelector('[data-kf]')?.getAttribute('aria-label')
    const diamond = document.body.querySelector('[data-kf]') as HTMLElement
    fireEvent.pointerDown(diamond, { clientX: 4, button: 0 })
    fireEvent.pointerMove(window, { clientX: 16 })
    fireEvent.pointerMove(window, { clientX: 24 })
    fireEvent.pointerUp(window, { clientX: 24 })
    await vi.waitFor(() => {
      const after = document.body.querySelector('[data-kf]')?.getAttribute('aria-label')
      if (after === before) throw new Error('not moved yet')
    }, { timeout: 10000 })
    // a second gesture inside the undo window clears the pending reset
    const diamond2 = document.body.querySelector('[data-kf]') as HTMLElement
    fireEvent.pointerDown(diamond2, { clientX: 24, button: 0 })
    fireEvent.pointerMove(window, { clientX: 28 })
    fireEvent.pointerUp(window, { clientX: 28 })
    // a different-key gesture (prompt edge) clears the pending timeout
    const edge = document.body.querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge, { clientX: 40, button: 0 })
    fireEvent.pointerMove(window, { clientX: 36 })
    fireEvent.pointerUp(window, { clientX: 36 })
    // let the drag-gesture undo window lapse (the 300ms reset arm)
    await new Promise((r) => setTimeout(r, 450))
  })

  test('dragging a stamped keyframe syncs its payload', async () => {
    await mountedWithRun()
    stubScrollerRect()
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Stamp')) throw new Error('not in edit yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Stamp').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no stamped kf yet')
    }, { timeout: 10000 })
    const before = document.body.querySelector('[data-kf]')?.getAttribute('aria-label')
    const diamond = document.body.querySelector('[data-kf]') as HTMLElement
    fireEvent.pointerDown(diamond, { clientX: 4, button: 0 })
    fireEvent.pointerMove(window, { clientX: 24 })
    fireEvent.pointerUp(window, { clientX: 24 })
    await vi.waitFor(() => {
      const after = document.body.querySelector('[data-kf]')?.getAttribute('aria-label')
      if (after === before) throw new Error('stamped kf did not move yet')
    }, { timeout: 10000 })
  })

  test('dragging one of two keyframes leaves the other', async () => {
    await mountedWithRun({
      motion_constraints: {
        keyframes: [
          { uuid: 'k1', track_id: 'fullbody', frame: 1 },
          { uuid: 'k2', track_id: 'fullbody', frame: 3 },
        ],
        fullbody: [
          { frame: 1, jp: 'AAAA', jr: 'AAAA' },
          { frame: 3, jp: 'AAAA', jr: 'AAAA' },
        ],
      },
    })
    stubScrollerRect()
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-kf]').length !== 2) throw new Error('no pair yet')
    }, { timeout: 10000 })
    const before = document.body.querySelector('[data-kf="k2"]')?.getAttribute('aria-label')
    const diamond = document.body.querySelector('[data-kf="k1"]') as HTMLElement
    fireEvent.pointerDown(diamond, { clientX: 4, button: 0 })
    fireEvent.pointerMove(window, { clientX: 16 })
    fireEvent.pointerUp(window, { clientX: 16 })
    await vi.waitFor(() => {
      const k1 = document.body.querySelector('[data-kf="k1"]')?.getAttribute('aria-label')
      const k2 = document.body.querySelector('[data-kf="k2"]')?.getAttribute('aria-label')
      if (k1 === 'Full-Body keyframe at frame 1') throw new Error('k1 did not move yet')
      if (k2 !== before) throw new Error('k2 moved too')
    }, { timeout: 10000 })
  }, 20000)

  test('keyframe click seeks the playhead', async () => {
    await paused(await mountedWithRun())
    stubScrollerRect()
    const lane = document.body.querySelector('[data-lane="fullbody"]') as HTMLElement
    fireEvent.doubleClick(lane, { clientX: 16, button: 0 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no diamond yet')
    }, { timeout: 10000 })
    // park at frame 0, then click the frame-2 diamond to jump.
    // (2026-11 scrub cure) the park rides the playhead CAP — the
    // ruler body is not a scrub surface anymore; and the cap's press
    // seeks nothing, so the MOVE is the gesture (a grab never jumps).
    const cap = document.body.querySelector('[data-testid="motion-timeline-playhead-cap"]') as HTMLElement
    fireEvent.pointerDown(cap, { clientX: 0, button: 0 })
    fireEvent.pointerMove(window, { clientX: 0 })
    fireEvent.pointerUp(window, { clientX: 0 })
    await vi.waitFor(() => {
      const left = (document.body.querySelector('[data-testid="motion-timeline-playhead"]') as HTMLElement | null)?.style.left
      if (left !== '0px') throw new Error(`not parked yet (left ${left ?? '??'})`)
    }, { timeout: 10000 })
    const diamond = document.body.querySelector('[data-kf]') as HTMLElement
    fireEvent.pointerDown(diamond, { clientX: 16, button: 0 })
    fireEvent.pointerUp(window, { clientX: 16 })
    // SCALE DERIVATION: this suite's stubScrollerRect pins the strip
    // at 800px → the bar's fit gives effPpf = 10; clientX 16 rounds to
    // frame 2 → playhead left = 2 × 10 = '20px' (the old '00:00:02'
    // expectation was the same frame read through the deleted chip).
    await vi.waitFor(() => {
      const left = (document.body.querySelector('[data-testid="motion-timeline-playhead"]') as HTMLElement | null)?.style.left
      if (left !== '20px') throw new Error(`seek did not land yet (left ${left ?? '??'})`)
    }, { timeout: 10000 })
  })

  // THE SCRUB SEAT (operator 2026-11: "MAKE SURE IT ONLY SCRUBS WHEN
  // THE MOUSE IS OVER THE WHITE CIRCLE AT THE TOP, AND NOT WHEN IT IS
  // IN THE MIDDLE"): the cap owns the gesture, the ruler body never
  // does, and the cap's own press never jumps — the move is the seek.
  test('the playhead cap drags the playhead; the ruler body never scrubs', async () => {
    await paused(await mountedWithRun())
    stubScrollerRect()
    const left = () =>
      (document.body.querySelector('[data-testid="motion-timeline-playhead"]') as HTMLElement | null)?.style.left ?? '??'
    const cap = document.body.querySelector('[data-testid="motion-timeline-playhead-cap"]') as HTMLElement
    // THE GRAB NEVER JUMPS: press alone (even a press-and-release)
    // leaves the playhead exactly where it was
    fireEvent.pointerDown(cap, { clientX: 0, button: 0 })
    fireEvent.pointerUp(window, { clientX: 0 })
    if (left() !== '0px') throw new Error(`the grab jumped to ${left()}`)
    // the drag proper: cap press + move seeks absolutely
    fireEvent.pointerDown(cap, { clientX: 0, button: 0 })
    fireEvent.pointerMove(window, { clientX: 16 })
    fireEvent.pointerUp(window, { clientX: 16 })
    // SCALE DERIVATION: this suite's stubScrollerRect pins the strip
    // at 800px → the bar's fit gives effPpf = 10; clientX 16 rounds to
    // frame 2 → playhead left = 2 × 10 = '20px' (the old '00:00:02'
    // expectation was the same frame read through the deleted chip).
    await vi.waitFor(() => {
      if (left() !== '20px') {
        throw new Error('scrub did not land yet')
      }
    }, { timeout: 10000 })
    // THE RULER BODY IS DEAD: the same press+move on the bar's middle
    // moves nothing (the defect was scrubbing from here)
    const ruler = document.body.querySelector('[data-testid="motion-timeline-ruler"]') as HTMLElement
    fireEvent.pointerDown(ruler, { clientX: 64, button: 0 })
    fireEvent.pointerMove(window, { clientX: 64 })
    fireEvent.pointerUp(window, { clientX: 64 })
    await new Promise((r) => setTimeout(r, 50))
    if (left() !== '20px') throw new Error(`the ruler body scrubbed to ${left()}`)
  })

  test('a ruler single-click moves NOTHING (the cap-only playhead law, operator 2026-10-29 told 10+ times)', async () => {
    // F-2's ruler-click seek is DEAD by direct operator order: the
    // playhead moves ONLY by dragging the cap circle. The oracle is
    // the playhead's own left px (the sticky timecode chip is gone
    // with the seek — it read the bar's fps axis and could lie).
    await paused(await mountedWithRun())
    stubScrollerRect()
    const left = () =>
      (document.body.querySelector('[data-testid="motion-timeline-playhead"]') as HTMLElement | null)?.style.left ?? '??'
    // park at frame 0 via the CAP (the one gesture that lives)
    const cap = document.body.querySelector('[data-testid="motion-timeline-playhead-cap"]') as HTMLElement
    fireEvent.pointerDown(cap, { clientX: 0, button: 0 })
    fireEvent.pointerMove(window, { clientX: 0 })
    fireEvent.pointerUp(window, { clientX: 0 })
    await vi.waitFor(() => {
      if (left() !== '0px') throw new Error(`not parked yet (left ${left()})`)
    }, { timeout: 10000 })
    // a single click on the ruler moves NOTHING
    fireEvent.click(document.body.querySelector('[data-testid="motion-timeline-ruler"]') as HTMLElement, { clientX: 16 })
    await new Promise((r) => setTimeout(r, 50))
    if (left() !== '0px') throw new Error(`the ruler click moved the playhead (left ${left()})`)
  })

  test('prompt double-click edits and commits text', async () => {
    await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    fireEvent.doubleClick(document.body.querySelector('[data-prompt-clip]') as HTMLElement, { button: 0 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip] input')) throw new Error('no editor yet')
    }, { timeout: 10000 })
    const input = document.body.querySelector('[data-prompt-clip] input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'walks forward' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await waitForText('walks forward')
  })

  test('hydrated keyframes render diamonds and delete removes them', async () => {
    await mountedWithRun({ motion_constraints: kfFixture() })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf="k1"]')) throw new Error('no diamond yet')
    }, { timeout: 10000 })
    const del = document.body.querySelector('[aria-label="Delete Full-Body keyframe at frame 2"]') as HTMLButtonElement
    expect(del).toBeTruthy()
    fireEvent.click(del)
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-kf="k1"]')) throw new Error('diamond still there')
    }, { timeout: 10000 })
  })

  test('add prompt card splits the seeded card', async () => {
    await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    const before = document.body.querySelectorAll('[data-prompt-clip]').length
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length <= before) throw new Error('no split yet')
    }, { timeout: 10000 })
  })

  test('prompt delete removes a card', async () => {
    await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Delete this prompt card"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-prompt-clip]')) throw new Error('clip still there')
    }, { timeout: 10000 })
    // stroke 77: two 10s waitFor windows under full-tree parallelism
    // exceed the 5s default TEST timeout (the waits are already
    // hardened; the test's own clock must cover them).
  }, 30000)

  test('prompt right-edge drag shrinks the card', async () => {
    // T=60 so a one-frame trim changes real durations (at T=4 the
    // persist guard swallows sub-frame rounding — same payload).
    // Two segments so the resize persists a real motion_prompts payload.
    const { onSave } = await mountedWithRun({}, 60)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    // two segments so the resize persists a real motion_prompts payload
    // (the serializer drops empty-text cards — type into both first).
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
    const clips0 = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    for (const [i, c] of clips0.entries()) {
      fireEvent.doubleClick(c, { button: 0 })
      await vi.waitFor(() => {
        if (!c.querySelector('input')) throw new Error('no editor yet')
      }, { timeout: 10000 })
      const input = c.querySelector('input') as HTMLInputElement
      fireEvent.change(input, { target: { value: `card ${i}` } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    await waitForText('card 1')
    onSave.mockClear()
    const clips = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    const edge = clips[clips.length - 1].querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge, { clientX: 30, button: 0 })
    fireEvent.pointerMove(window, { clientX: 20 })
    fireEvent.pointerUp(window, { clientX: 20 })
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) => typeof (p as Record<string, unknown>).motion_prompts === 'string')
      if (!call) throw new Error('resize not persisted yet')
    }, { timeout: 10000 })
  })

  // NOTE (2026-09-17, h3 mod-plane stroke): the gesture is REAL
  // (instrumented: before "0px" → after "10px", async commit) — the
  // historical flake was the parenthesization bug below (every
  // { timeout } in this file rode the await expression, so waitFor
  // lived at its 1s default) plus full-suite load stalls; repaired
  // with real waits. A strict in-test RETRY is NOT viable: paired
  // down/up re-fires read as double-clicks and flip the clip into
  // edit mode, killing later gestures.
  test('prompt body drag slides the card', { timeout: LOADED_WAIT() * 3 }, async () => {
    await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    const clip = document.body.querySelector('[data-prompt-clip]') as HTMLElement
    const before = clip.style.left
    fireEvent.pointerDown(clip, { clientX: 10, button: 0 })
    fireEvent.pointerMove(window, { clientX: 20 })
    fireEvent.pointerUp(window, { clientX: 20 })
    // same load-stall class as the GLB drop below (stroke 83): the
    // drag commit rides the shared dom loop and stalled past 30s
    // under the 2026-09-17 full gate — 90s keeps it load-robust
    await vi.waitFor(() => {
      const after = (document.body.querySelector('[data-prompt-clip]') as HTMLElement).style.left
      if (after === before) throw new Error('left did not move yet')
    }, { timeout: LOADED_WAIT() * 3 })
  })

  // THE RESCALE GUARD (hour 15 flake root-cause): the envelope settle
  // (npz T landing after the default duration's T) re-fired the seed
  // effect's rescale branch and REWROTE authored frames — round(1 * 4/150)
  // snapped a dragged card back to frame 0 after the drag committed. The
  // effect's own doc comment promises "only re-seed when the user hasn't
  // authored anything"; this pins that law against a LATE settle.
  test('a late envelope settle never erases an authored drag (the rescale guard)', { timeout: LOADED_WAIT() * 4 / 3 }, async () => {
    stubLoads() // the standard door stubs (drafts, requestIdleCallback, …)
    let releaseNpz!: () => void
    const npzGate = new Promise<void>((res) => { releaseNpz = res })
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
      if (u.includes('/v1/form-spec')) {
        return new Response(JSON.stringify({
          form: 'motion',
          schema: schemaEnvelope({
            duration_sec: { type: 'number', meta: { description: 'Duration (s)', default: 5, min: 1, max: 30, step: 0.5 } },
            seed: { type: 'number', meta: { description: 'Seed', default: 42, step: 1 } },
          }),
          variants: [], inputs: [], features: { modifiers: [], variant_groups: {} },
        }), { headers: { 'content-type': 'application/json' } })
      }
      if (u.includes(SKIN_URL)) return skinResponse()
      if (u.includes(MOTION_URL)) {
        await npzGate
        return motionResponse(4, 30)
      }
      if (u.endsWith('.npz')) return motionResponse(4, 30)
      return new Response('{}', { headers: { 'content-type': 'application/json' } })
    })
    const stage = mkStage()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    mounted.push(root)
    const render = (res: unknown) =>
      root.render(h(MotionCardEditor, {
        stage: mkStage(res as Record<string, unknown> | undefined),
        onSave: vi.fn(),
        runCompiledGeneration,
      } as never))
    render({ result: { artifacts: { motion_npz: MOTION_URL } } })
    // the doc sits at the DEFAULT duration (150 frames); the card spans it
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    const clip = document.body.querySelector('[data-prompt-clip]') as HTMLElement
    fireEvent.pointerDown(clip, { clientX: 10, button: 0 })
    fireEvent.pointerMove(window, { clientX: 20 })
    fireEvent.pointerUp(window, { clientX: 20 })
    await vi.waitFor(() => {
      if (clip.style.left === '0px' || clip.style.left === '') throw new Error('drag did not land')
    }, { timeout: 10000 })
    // THE LATE SETTLE: the npz's T=4 arrives AFTER authoring
    releaseNpz()
    await vi.waitFor(() => {
      if (!document.body.textContent!.includes('30 fps · 4f')) throw new Error('npz not settled yet')
    }, { timeout: 10000 })
    await new Promise((r) => setTimeout(r, 150))
    const after = document.body.querySelector('[data-prompt-clip]') as HTMLElement
    // GUARDED: the authored start (frame 1) survives — px > 0 at any fit.
    // UNGUARDED (the bug): rescale snaps start back to round(1*4/150) = 0.
    expect(after.style.left).not.toBe('0px')
  })

  test('pulling the last edge past the end extends the timeline', { timeout: LOADED_WAIT() * 1.5 }, async () => {
    const { onSave } = await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    const clips = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    const last = clips[clips.length - 1]
    const edge = last.querySelector('[data-prompt-edge="r"]') as HTMLElement
    // (2026-11-06, wave 32) the pull spans 1000px: the extend law is
    // `endF + dx/effPpf > T1`, and effPpf is pinned from a measured
    // boxW race (fit at mount). A 100px pull only cleared T1 at some
    // pinned scales — under the full pool the arm red-flaked for three
    // straight gates while every smaller pool stayed green. The user
    // gesture "pull past the end" is a pull that clears the envelope
    // at ANY scale: 1000px > MAX_PPF × envelope-gap by construction.
    fireEvent.pointerDown(edge, { clientX: 30, button: 0 })
    fireEvent.pointerMove(window, { clientX: 1030 })
    fireEvent.pointerUp(window, { clientX: 1030 })
    // (2026-11-06, the pool-load receipt) judge the toast RIGHT AFTER
    // the pull that fires it: polling after the second drag let the
    // first toast's TTL expire under the full pool (deterministic
    // 'no extend toast yet' at 6G while standalone stayed green).
    await vi.waitFor(() => {
      const toasted = useToastStore.getState().toasts.some((t) => t.message.includes('Timeline extended to'))
      if (!toasted) {
        // THE LOST-PULL CURE (2026-11-06, gates B+C receipts): under the
        // full pool the single dispatched trio can land on a node the
        // mount has since replaced — the store never changes and no
        // budget fixes a lost event (this arm red at 30s twice with the
        // wave-2 budget cure already in place). A failed check RE-PULLS
        // the current tree's last edge: a delivered pull toasts
        // synchronously (the store set sits inside the handler), so at
        // most one extend toast ever exists and the count assertion
        // below stays exact; the component's 1s toast throttle covers a
        // re-delivered pull.
        const clipsN = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
        const edgeN = clipsN[clipsN.length - 1]?.querySelector('[data-prompt-edge="r"]') as HTMLElement | null
        if (edgeN) {
          fireEvent.pointerDown(edgeN, { clientX: 30, button: 0 })
          fireEvent.pointerMove(window, { clientX: 1030 })
          fireEvent.pointerUp(window, { clientX: 1030 })
        }
        throw new Error('no extend toast yet')
      }
    }, { timeout: LOADED_WAIT() })
    // THE FLAKE CURE (flake-slowness-wave2 class 5, 2026-11-06): a
    // 10s real-timer rAF-poll budget on this arm reds under gate
    // load (gate22: the typecheck lane's concurrent tsc passes now
    // share the host) — the sibling drill arms carry the same cure.
    // 30s budget, 45s per-test.
    // a second tail pull inside the toast window extends silently —
    // still exactly ONE extend toast after both pulls
    const clips2 = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    const last2 = clips2[clips2.length - 1]
    const edge2 = last2.querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge2, { clientX: 1030, button: 0 })
    fireEvent.pointerMove(window, { clientX: 2030 })
    fireEvent.pointerUp(window, { clientX: 2030 })
    const extendToasts = useToastStore.getState().toasts.filter((t) => t.message.includes('Timeline extended to'))
    expect(extendToasts.length).toBe(1)
    expect(onSave.mock.calls.some(([p]) => (p as Record<string, unknown>).duration_sec !== undefined)).toBe(true)
  })

  test('ctrl+z undoes a split, ctrl+shift+z redoes it', async () => {
    await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 1) throw new Error('no undo yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true })
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no redo yet')
    }, { timeout: 10000 })
  })
})

describe('edit mode (refine / stamp / repose / reset)', () => {
  async function mountedWithRun() {
    stubLoads()
    const m = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    return m
  }

  async function enteredEdit() {
    await mountedWithRun()
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Done')) throw new Error('not in edit yet')
    }, { timeout: 10000 })
  }

  test('refine enters, done keeps, reset discards', async () => {
    await enteredEdit()
    // entering edit pauses playback
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Done').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Reset pose')) throw new Error('no kept edit yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Reset pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (queryByText(document.body, 'Reset pose')) throw new Error('reset did not clear yet')
    }, { timeout: 10000 })
  })

  test('stamp writes the pose into the timeline', async () => {
    await enteredEdit()
    fireEvent.click(getByText(document.body, 'Stamp').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      const stamped = useToastStore.getState().toasts.some((t) => t.message.includes('Stamped authored pose'))
      if (!stamped) throw new Error('no stamp toast yet')
    }, { timeout: 10000 })
    expect(document.body.querySelector('[data-kf]')).toBeTruthy()
  })

  test('repose chains the edited pose', async () => {
    const { onSave } = await mountedWithRun()
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('button')) throw new Error('no buttons yet')
      getByRole(document.body, 'button', { name: 'Repose' })
    }, { timeout: 10000 })
    fireEvent.click(getByRole(document.body, 'button', { name: 'Repose' }))
    await vi.waitFor(() => {
      const reposed = useToastStore.getState().toasts.some((t) => t.message.includes('Reposed from edited pose'))
      if (!reposed) throw new Error('no repose toast yet')
    }, { timeout: 10000 })
    expect(onSave.mock.calls.some(([p]) => (p as Record<string, unknown>).prev_motion_artifact !== undefined)).toBe(true)
  })
})
