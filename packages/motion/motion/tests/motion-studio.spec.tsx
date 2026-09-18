// @vitest-environment happy-dom
/**
 * motion studio I — loads + rail. Mounts the full MotionCardEditor
 * headless (PoseViewer3D's mount returns null without WebGL — the
 * chrome, rail, bar, and dialogs all still render); the SOMA skin and
 * motion NPZs are real parses of synthetic fixtures through the real
 * loaders (see tests/fixtures.ts). No module mocks.
 *
 * MOUNT PATTERN (2026-09-16): NO act() anywhere. The viewer carries an
 * infinite async render loop (altSamples `= []` default → unstable
 * [altSamples] dep → setAltDecoded([]) every pass) that keeps any
 * async-act drain open forever and hot-spins sync-act; outside act the
 * loop is invisible, waitFor polling finds settled content, and a plain
 * root.unmount() in afterEach kills the loop. "Not wrapped in act"
 * warnings are tolerated noise.
 */
import { fireEvent, getByRole, getByText, queryByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { CardStage } from '@melite/contracts'

import { MotionCardEditor } from '../src/ui/studio/component.tsx'
import { useToastStore } from '@melite/card-base/toast'
import { schemaEnvelope } from '@melite/card-base'
import { waitForText } from './harness.tsx'
import { SKIN_URL, MOTION_URL, skinResponse, motionResponse } from './fixtures.ts'

const mounted: Root[] = []

afterEach(() => {
  while (mounted.length > 0) mounted.pop()!.unmount()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  useToastStore.setState({ toasts: [] })
  localStorage.clear()
})

function mkStage(over: Record<string, unknown> = {}): CardStage {
  return {
    id: 'm1', title: 'Motion', kind: 'motion', service: 'kimodo_motion',
    params: {}, inputs: [], inputIndices: [], result: null,
    ...over,
  } as unknown as CardStage
}

/** Minimal valid-but-rigless GLB (empty scene) — the real GLTFLoader
 *  parses it, finds no 77-joint skinned mesh, and throws NotSomaxGlbError.
 *  Same family as the synthetic NPZ fixtures: real parser, fake bytes. */
function minimalGlbBytes(): ArrayBuffer {
  const json = new TextEncoder().encode('{"asset":{"version":"2.0"},"scene":0,"scenes":[{"nodes":[]}]}')
  const pad = (4 - (json.length % 4)) % 4
  const total = 12 + 8 + json.length + pad
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  dv.setUint32(12, json.length + pad, true)
  dv.setUint32(16, 0x4e4f534a, true)
  const bytes = new Uint8Array(buf)
  bytes.set(json, 20)
  bytes.fill(0x20, 20 + json.length)
  return buf
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Skin always serves; motion serves only when the stage has a result.
 *  Body/flow lanes opt in per test: bodies maps a URL substring to the
 *  served bytes ('glb' = the rigless mesh) or an HTTP status. */
function stubLoads(opts: {
  motionT?: number; motionStatus?: number; skinStatus?: number;
  bodies?: Record<string, 'glb' | number>;
  draftsStatus?: number; startStatus?: number; startRaw?: string; startEmptyBody?: boolean;
  flow?: 'completed' | 'completed-noglb' | 'failed' | 'slow' | number;
} = {}): void {
  let statusCalls = 0
  vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
    const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
    // RULE B: the kimodo form-spec door — the rail's SpecPanel fetches
    // the card family's served schema (the minimal envelope: the
    // generation/guidance/clock rows the panel seats).
    if (u.includes('/v1/form-spec')) {
      return new Response(JSON.stringify({
        form: 'motion',
        schema: schemaEnvelope({
          duration_sec: { type: 'number', meta: { description: 'Duration (s)', default: 5, min: 1, max: 30, step: 0.5 } },
          diffusion_steps: { type: 'number', meta: { description: 'Diffusion steps', default: 25, min: 10, max: 200, step: 1 } },
          num_samples: { type: 'number', meta: { description: 'Samples', default: 1, min: 1, max: 4, step: 1 } },
          num_transition_frames: { type: 'number', meta: { description: 'Transition frames', default: 10, min: 0, max: 60, step: 1 } },
          cfg_weight_a: { type: 'number', meta: { description: 'CFG weight A', default: 2.5, min: 0, max: 15, step: 0.5 } },
          cfg_weight_b: { type: 'number', meta: { description: 'CFG weight B', default: 5, min: 0, max: 15, step: 0.5 } },
          seed: { type: 'number', meta: { description: 'Seed', default: 42, step: 1 } },
        }),
        variants: [],
        inputs: [],
        features: { modifiers: [], variant_groups: {} },
      }), { headers: { 'content-type': 'application/json' } })
    }
    if (u.includes(SKIN_URL)) {
      if (opts.skinStatus) return new Response('bad', { status: opts.skinStatus })
      return skinResponse()
    }
    if (u.includes(MOTION_URL)) {
      if (opts.motionStatus) return new Response('bad', { status: opts.motionStatus })
      return motionResponse(opts.motionT ?? 4, 30)
    }
    // artifact/assetUrl scans may point at other .npz names — same bytes
    if (u.endsWith('.npz')) return motionResponse(opts.motionT ?? 4, 30)
    if (opts.bodies) {
      for (const [sub, kind] of Object.entries(opts.bodies)) {
        if (u.includes(sub)) {
          if (kind === 'glb') return new Response(minimalGlbBytes())
          return new Response('bad', { status: kind })
        }
      }
    }
    if (u.includes('/v1/flows/drafts')) {
      if (opts.draftsStatus) return new Response('bad', { status: opts.draftsStatus })
      return jsonResponse({ draftId: 'd1' })
    }
    if (u.includes('/v1/flows/start')) {
      if (opts.startStatus) return new Response(opts.startEmptyBody ? '' : 'bad', { status: opts.startStatus })
      if (opts.startRaw !== undefined) return new Response(opts.startRaw)
      return jsonResponse({ run_id: 'r1' })
    }
    if (u.includes('/v1/flows/status/')) {
      statusCalls += 1
      if (opts.flow === 'slow' && statusCalls === 1) {
        return jsonResponse({ run_id: 'r1', status: 'running', stages: [{ id: 's1', name: 'rig', index: 0, status: 'running' }] })
      }
      const flow = opts.flow === 'slow' ? 'completed' : (opts.flow ?? 'completed')
      if (typeof flow === 'number') return new Response('bad', { status: flow })
      if (flow === 'failed') {
        return jsonResponse({ run_id: 'r1', status: 'failed', stages: [], error: 'brick blew up' })
      }
      if (flow === 'completed-noglb') {
        return jsonResponse({
          run_id: 'r1', status: 'completed',
          stages: [{ id: 's1', name: 'rig', index: 0, status: 'done', url: 'https://host/rigged.png' }],
        })
      }
      return jsonResponse({
        run_id: 'r1', status: 'completed',
        stages: [{ id: 's1', name: 'rig', index: 0, status: 'done', url: 'https://host/rigged.glb' }],
      })
    }
    return new Response('nope', { status: 404 })
  })
  vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0) as never)
  vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id))
}

/** No-act mount: render outside act, wait for settled content via polling. */
function mountEditor(over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  const onSave = vi.fn()
  const stage = mkStage(over)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push(root)
  root.render(h(MotionCardEditor, { stage, onSave, ...props } as never))
  return { container, onSave, stage }
}

describe('no-run state (the rest pose)', () => {
  // FIRST: loadSomaSkin caches per worker session, so the failure case
  // must run before any successful skin load in this file (a rejection
  // clears the cache — later tests re-fetch fine).
  test('a dead skin surfaces an honest veil (and does not poison later loads)', async () => {
    // Three mounts, all before any successful load (the session cache
    // holds success afterwards, and a rejection clears it — so each
    // mount re-fetches the dead skin):
    //  1. no body — the mount effect's own skin catch;
    //  2. an unloadable body (generic fetch failure skips the convert)
    //     — the direct-fail fallback re-hits the dead skin;
    //  3. a bare body — the convert runs, the rigged fetch 404s, and the
    //     mannequin fallback re-hits the dead skin (the e3 arm).
    stubLoads({ skinStatus: 404, bodies: { 'bare.glb': 'glb' } })
    const down = () => {
      while (mounted.length > 0) mounted.pop()!.unmount()
      document.body.innerHTML = ''
    }
    mountEditor()
    await waitForText('Failed to fetch SOMA skin: 404')
    down()
    mountEditor({ params: { preview_glb: 'https://host/missing.glb' } })
    await waitForText('Failed to fetch SOMA skin: 404')
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no direct-fail toast yet')
    }, { timeout: 10000 })
    down()
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('Failed to fetch SOMA skin: 404')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no convert toast yet')
    }, { timeout: 20000 })
    // With the skin dead there is no rest pose either (effectiveNpz
    // null) — a keyframe lane explains the stage is not live. Only
    // reachable here: every later test has a cached live skin.
    const scroller = document.body.querySelector('[data-testid="motion-timeline-scroll"]') as HTMLElement
    const prevRect = scroller.getBoundingClientRect.bind(scroller)
    scroller.getBoundingClientRect = () => (
      { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 100, width: 800, height: 100, toJSON() {} } as DOMRect
    )
    try {
      fireEvent.doubleClick(
        document.body.querySelector('[data-lane="fullbody"]') as HTMLElement,
        { clientX: 4, button: 0 },
      )
    } finally {
      scroller.getBoundingClientRect = prevRect
    }
    await vi.waitFor(() => {
      const refused = useToastStore.getState().toasts.some((t) => t.message.includes('Motion still loading'))
      if (!refused) throw new Error('no loading toast yet')
    }, { timeout: 10000 })
  }, 40000)

  test('the stage stands on the neutral mannequin with honest empties', async () => {
    stubLoads()
    mountEditor()
    // the viewer fell back to bind pose (headless: no canvas, no crash)
    await waitForText('No motion yet')
    // rail honesty: scrubber + refine + export disarmed with hints
    expect(document.body.textContent).toContain('run the card')
    const play = document.body.querySelector('[aria-label="Play (Space)"]') as HTMLButtonElement
    expect(play.hasAttribute('disabled')).toBe(true)
  })
})

describe('rail (view + transport)', () => {
  function runResult() {
    return { result: { artifacts: { motion_npz: MOTION_URL } } }
  }

  async function mountedWithRun() {
    stubLoads()
    mountEditor(runResult())
    await waitForText('30 fps · 4f')
  }

  test('framing toggle flips the pressed face', async () => {
    await mountedWithRun()
    const upper = document.body.querySelector('[aria-label="Upper half framing"]') as HTMLButtonElement
    expect(upper.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(upper)
    await vi.waitFor(() => {
      if (upper.getAttribute('aria-pressed') !== 'true') throw new Error('upper not pressed yet')
    }, { timeout: 10000 })
    const full = document.body.querySelector('[aria-label="Full body framing"]') as HTMLButtonElement
    fireEvent.click(full)
    await vi.waitFor(() => {
      if (full.getAttribute('aria-pressed') !== 'true') throw new Error('full not pressed yet')
    }, { timeout: 10000 })
  })

  test('azimuth arrows step without crashing', async () => {
    await mountedWithRun()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Rotate view left (45°)' }))
    fireEvent.click(getByRole(document.body, 'button', { name: 'Rotate view right (45°)' }))
    expect(document.body.querySelector('[aria-label="Rotate view left (45°)"]')).toBeTruthy()
  })

  test('skeleton toggle swaps the eye icon', async () => {
    await mountedWithRun()
    const btn = getByText(document.body, 'Skeleton').closest('button') as HTMLButtonElement
    expect(btn.hasAttribute('disabled')).toBe(false)
    const before = document.body.innerHTML
    fireEvent.click(btn)
    await vi.waitFor(() => {
      if (document.body.innerHTML === before) throw new Error('icon not swapped yet')
    }, { timeout: 10000 })
  })

  test('in-place toggle re-hints the treadmill tip', async () => {
    await mountedWithRun()
    const before = document.body.innerHTML
    const btn = getByText(document.body, 'In-place').closest('button') as HTMLButtonElement
    fireEvent.click(btn)
    await vi.waitFor(() => {
      if (document.body.innerHTML === before) throw new Error('tip not re-hinted yet')
    }, { timeout: 10000 })
  })

  test('play button pauses and resumes', async () => {
    await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Pause (Space)"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
  })

  test('spacebar pauses and resumes', async () => {
    await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { code: 'Space' })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { code: 'Space' })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not resumed yet')
    }, { timeout: 10000 })
  })
})
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
    // park at frame 0, then click the frame-2 diamond to jump
    const ruler = document.body.querySelector('[data-testid="motion-timeline-ruler"]') as HTMLElement
    fireEvent.pointerDown(ruler, { clientX: 0, button: 0 })
    fireEvent.pointerUp(window, { clientX: 0 })
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-testid="motion-timeline-timecode"]')?.textContent !== '00:00:00') {
        throw new Error('not parked yet')
      }
    }, { timeout: 10000 })
    const diamond = document.body.querySelector('[data-kf]') as HTMLElement
    fireEvent.pointerDown(diamond, { clientX: 16, button: 0 })
    fireEvent.pointerUp(window, { clientX: 16 })
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-testid="motion-timeline-timecode"]')?.textContent !== '00:00:02') {
        throw new Error('seek did not land yet')
      }
    }, { timeout: 10000 })
  })

  test('ruler pointer-drag scrubs the playhead', async () => {
    await paused(await mountedWithRun())
    stubScrollerRect()
    const ruler = document.body.querySelector('[data-testid="motion-timeline-ruler"]') as HTMLElement
    fireEvent.pointerDown(ruler, { clientX: 16, button: 0 })
    fireEvent.pointerMove(window, { clientX: 16 })
    fireEvent.pointerUp(window, { clientX: 16 })
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-testid="motion-timeline-timecode"]')?.textContent !== '00:00:02') {
        throw new Error('scrub did not land yet')
      }
    }, { timeout: 10000 })
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
  test('prompt body drag slides the card', { timeout: 90000 }, async () => {
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
    }, { timeout: 90000 })
  })

  test('pulling the last edge past the end extends the timeline', async () => {
    const { onSave } = await mountedWithRun()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-prompt-clip]')) throw new Error('no seeded clip yet')
    }, { timeout: 10000 })
    const clips = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    const last = clips[clips.length - 1]
    const edge = last.querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge, { clientX: 30, button: 0 })
    fireEvent.pointerMove(window, { clientX: 130 })
    fireEvent.pointerUp(window, { clientX: 130 })
    // a second tail pull inside the toast window extends silently
    const clips2 = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    const last2 = clips2[clips2.length - 1]
    const edge2 = last2.querySelector('[data-prompt-edge="r"]') as HTMLElement
    fireEvent.pointerDown(edge2, { clientX: 130, button: 0 })
    fireEvent.pointerMove(window, { clientX: 230 })
    fireEvent.pointerUp(window, { clientX: 230 })
    await vi.waitFor(() => {
      const toasted = useToastStore.getState().toasts.some((t) => t.message.includes('Timeline extended to'))
      if (!toasted) throw new Error('no extend toast yet')
    }, { timeout: 10000 })
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

describe('background + body slot (drops / picks / wire)', () => {
  const MIME = 'application/tech-noir-asset'

  function assetTransfer(url: string | null, raw?: string) {
    return {
      types: [MIME],
      getData: () => (raw !== undefined ? raw : JSON.stringify({ url })),
      files: [],
    }
  }

  function slotSquare(): HTMLElement {
    return document.body.querySelector('[data-motion-body] [data-slot-square]') as HTMLElement
  }

  /** Drop target INSIDE the stage frame (rail + transport live in
   *  separate panes — drops on them never reach the frame's onDrop).
   *  The export rect renders only in-stage, so open it on a run. */
  async function stageTarget(): Promise<HTMLElement> {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    return document.body.querySelector('[data-export-rect]') as HTMLElement
  }

  async function mountedNoRun(params: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
    stubLoads()
    const m = mountEditor({ params }, props)
    await waitForText('No motion yet')
    return m
  }

  test('stage drop of a GLB attaches the preview body', async () => {
    const target = await stageTarget()
    // drop on a live in-stage child — the event bubbles to the frame's onDrop
    fireEvent.drop(target, {
      dataTransfer: assetTransfer('https://host/dropped.glb'),
    })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no body fallback toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('stage drop of an image sets the background, clear removes it', async () => {
    stubLoads()
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    const target = await (async () => {
      fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
      await vi.waitFor(() => {
        if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
      }, { timeout: 10000 })
      return document.body.querySelector('[data-export-rect]') as HTMLElement
    })()
    fireEvent.drop(target, {
      dataTransfer: assetTransfer('https://host/bg.png'),
    })
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) => (p as Record<string, unknown>).motion_bg_image === 'https://host/bg.png')
      if (!call) throw new Error('bg not persisted yet')
    }, { timeout: 10000 })
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Clear')) throw new Error('no clear yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Clear').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) => (p as Record<string, unknown>).motion_bg_image === '')
      if (!call) throw new Error('bg not cleared yet')
    }, { timeout: 10000 })
  })

  test('stage drop with a malformed payload falls through silently', async () => {
    const target = await stageTarget()
    const before = useToastStore.getState().toasts.length
    fireEvent.drop(target, {
      dataTransfer: assetTransfer(null, 'not-json{'),
    })
    await new Promise((r) => setTimeout(r, 800))
    await new Promise((r) => setTimeout(r, 800))
    // silent: no new toasts, no body/bg writes from this mount
    expect(useToastStore.getState().toasts.length).toBe(before)
  })

  test('background hydrates from params', async () => {
    await mountedNoRun({ motion_bg_image: 'https://host/bg.png' })
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Clear')) throw new Error('no hydrated clear yet')
    }, { timeout: 10000 })
  })

  test('cancelled bg pick is a no-op', async () => {
    const { onSave } = await mountedNoRun()
    const input = document.body.querySelector('input[accept="image/*"]') as HTMLInputElement
    fireEvent.change(input)
    await new Promise((r) => setTimeout(r, 500))
    const touched = onSave.mock.calls.some(([p]) => 'motion_bg_image' in (p as Record<string, unknown>))
    expect(touched).toBe(false)
  })

  test('slot asset-drop of a GLB attaches, detach clears', { timeout: 90000 }, async () => {
    await mountedNoRun()
    fireEvent.drop(slotSquare(), { dataTransfer: assetTransfer('https://host/slot.glb') })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Detach"]')) throw new Error('no detach yet')
      // stroke 83: the GLB drop path stalls past 10s under full-suite parallel load (the fetch rides the shared dom loop); 30s still tripped under the 2026-09-17 full gate — 90s keeps the evidence point load-robust
    }, { timeout: 90000 })
    fireEvent.click(document.body.querySelector('[aria-label="Detach"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelector('[aria-label="Detach"]')) throw new Error('detach did not clear yet')
    }, { timeout: 10000 })
  })

  test('slot asset-drop of a non-GLB refuses', async () => {
    await mountedNoRun()
    fireEvent.drop(slotSquare(), { dataTransfer: assetTransfer('https://host/bg.png') })
    await vi.waitFor(() => {
      const refused = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body must be a .glb'))
      if (!refused) throw new Error('no refusal toast yet')
    }, { timeout: 10000 })
  })

  test('slot pick of a GLB reads the file and attaches', async () => {
    await mountedNoRun()
    const input = document.body.querySelector('[data-motion-body] [data-slot-input]') as HTMLInputElement
    const file = new File(['glb-bytes'], 'body.glb', { type: 'model/gltf-binary' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no attach fallback toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('bg file pick reads and persists', async () => {
    const { onSave } = await mountedNoRun()
    const input = document.body.querySelector('input[accept="image/*"]') as HTMLInputElement
    const file = new File(['png-bytes'], 'bg.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) =>
        typeof (p as Record<string, unknown>).motion_bg_image === 'string' &&
        ((p as Record<string, unknown>).motion_bg_image as string).startsWith('data:'))
      if (!call) throw new Error('bg file not persisted yet')
    }, { timeout: 10000 })
  })

  test('slot pick of a non-GLB refuses without reading', async () => {
    await mountedNoRun()
    const input = document.body.querySelector('[data-motion-body] [data-slot-input]') as HTMLInputElement
    const file = new File(['x'], 'body.png', { type: 'image/png' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await vi.waitFor(() => {
      const refused = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body must be a .glb'))
      if (!refused) throw new Error('no refusal toast yet')
    }, { timeout: 10000 })
  })

  function up1(result: unknown = null) {
    return { id: 'up1', title: 'Up One', kind: 'x', service: 's', params: {}, inputs: [], inputIndices: [], result }
  }

  /** Stage-level mount (inputs live beside params, not inside them). */
  async function mountedWired(wireInputs: string[], params: Record<string, unknown>, props: Record<string, unknown>) {
    stubLoads()
    const m = mountEditor({ params, inputs: wireInputs }, props)
    await waitForText('No motion yet')
    return m
  }

  test('wire button opens the picker, pick wires the slot', async () => {
    const onWireSlot = vi.fn()
    const { onSave } = await mountedNoRun(
      { preview_glb: 'https://host/old.glb' },
      { onWireSlot, upstreams: [up1()] },
    )
    fireEvent.click(document.body.querySelector('[data-motion-body-wire]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-wire-option]')) throw new Error('no picker yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[data-wire-option]') as HTMLButtonElement)
    expect(onWireSlot).toHaveBeenCalledWith('preview_glb', 'up1', null)
    expect(onSave).toHaveBeenCalledWith({ preview_glb: null })
  })

  test('picker close shuts it without wiring', async () => {
    const onWireSlot = vi.fn()
    await mountedNoRun(
      { preview_glb: 'https://host/old.glb' },
      { onWireSlot, upstreams: [up1()] },
    )
    fireEvent.click(document.body.querySelector('[data-motion-body-wire]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Close wire picker"]')) throw new Error('no picker yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Close wire picker"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-wire-option]')) throw new Error('picker still open')
    }, { timeout: 10000 })
    expect(onWireSlot).not.toHaveBeenCalled()
  })

  test('wired slot badges the upstream and waits for its run', async () => {
    await mountedWired(['up1'], { preview_glb: null }, { onWireSlot: vi.fn(), upstreams: [up1()] })
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('waiting for upstream')) throw new Error('no waiting metric yet')
    }, { timeout: 10000 })
  })

  test('wired slot resolves the upstream GLB, falls back loud on fetch loss', async () => {
    await mountedWired(
      ['up1'],
      { preview_glb: null },
      { onWireSlot: vi.fn(), upstreams: [up1({ artifacts: { rig: 'https://host/up.glb' }, assetUrls: [] })] },
    )
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no wired fallback toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('wired detach unwires the slot', { timeout: 90000 }, async () => {
    const onWireSlot = vi.fn()
    const { onSave } = await mountedWired(
      ['up1'],
      { preview_glb: null },
      { onWireSlot, upstreams: [up1({ artifacts: { rig: 'https://host/up.glb' }, assetUrls: [] })] },
    )
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Detach"]')) throw new Error('no detach yet')
      // stroke 83: the GLB drop path stalls past 10s under full-suite parallel load (the fetch rides the shared dom loop); 30s still tripped under the 2026-09-17 full gate — 90s keeps the evidence point load-robust
    }, { timeout: 90000 })
    fireEvent.click(document.body.querySelector('[aria-label="Detach"]') as HTMLButtonElement)
    expect(onWireSlot).toHaveBeenCalledWith('preview_glb', null, null)
    expect(onSave.mock.calls.some(([p]) => (p as Record<string, unknown>).preview_glb === null)).toBe(true)
  })

  test('picker unwire drops the wire', async () => {
    const onWireSlot = vi.fn()
    await mountedWired(
      ['up1'], { preview_glb: null }, { onWireSlot, upstreams: [up1()] },
    )
    fireEvent.click(document.body.querySelector('[data-motion-body-wire]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-wire-option]')) throw new Error('no picker yet')
    }, { timeout: 10000 })
    const unwire = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.includes('Unwire'))
    expect(unwire).toBeTruthy()
    fireEvent.click(unwire as HTMLButtonElement)
    expect(onWireSlot).toHaveBeenCalledWith('preview_glb', null, null)
  })
})

describe('coverage sweep (scans / convert errors / guards)', () => {
  async function mountedNoRun(params: Record<string, unknown> = {}) {
    stubLoads()
    const m = mountEditor({ params })
    await waitForText('No motion yet')
    return m
  }

  test('npz resolves via the artifacts scan', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { render: 'https://host/r.npz' } } })
    await waitForText('30 fps · 4f')
  })

  test('npz resolves via assetUrls', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: {}, assetUrls: ['https://host/a.npz'] } })
    await waitForText('30 fps · 4f')
  })

  test('no npz anywhere holds the rest pose', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: {}, assetUrls: [] } })
    await waitForText('No motion yet')
    expect(document.body.textContent).not.toContain('fps ·')
    expect((document.body.querySelector('[aria-label="Play (Space)"]') as HTMLButtonElement).disabled).toBe(true)
  })

  test('empty undo and redo stacks are silent no-ops', async () => {
    await mountedNoRun()
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true })
    fireEvent.keyDown(document.body, { key: 'z', ctrlKey: true, shiftKey: true })
    await new Promise((r) => setTimeout(r, 300))
    expect(document.body.querySelectorAll('[data-prompt-clip]').length).toBe(1)
  })

  test('meta-key undo and ctrl-Y redo travel the stack', async () => {
    await mountedNoRun()
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { key: 'z', metaKey: true })
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 1) throw new Error('no meta-undo yet')
    }, { timeout: 10000 })
    fireEvent.keyDown(document.body, { key: 'y', ctrlKey: true })
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no ctrl-Y redo yet')
    }, { timeout: 10000 })
  })

  test('prompts hydrate from a persisted multi-segment payload', async () => {
    await mountedNoRun({
      motion_prompts: JSON.stringify([
        { text: 'hello', duration_sec: 2 },
        { text: 'world', duration_sec: 3 },
      ]),
    })
    await waitForText('hello')
    await waitForText('world')
    expect(document.body.querySelectorAll('[data-prompt-clip]').length).toBe(2)
  })

  test('a single prompt param seeds the blank card text', async () => {
    await mountedNoRun({ prompt: 'solo take' })
    await waitForText('solo take')
  })

  test('retyping then splitting keeps three cards', async () => {
    await mountedNoRun()
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
    const clips = [...document.body.querySelectorAll('[data-prompt-clip]')] as HTMLElement[]
    for (const [i, c] of clips.entries()) {
      fireEvent.doubleClick(c, { button: 0 })
      await vi.waitFor(() => {
        if (!c.querySelector('input')) throw new Error('no editor yet')
      }, { timeout: 10000 })
      const input = c.querySelector('input') as HTMLInputElement
      fireEvent.change(input, { target: { value: `take ${i}` } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }
    await waitForText('take 1')
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 3) throw new Error('no third card yet')
    }, { timeout: 10000 })
  })

  test('double stamp updates the bound keyframe', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    // pin frame 0: the live-bind only writes while the stamped frame is current
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Pause (Space)"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Stamp')) throw new Error('not in edit yet')
    }, { timeout: 10000 })
    const stamp = () => getByText(document.body, 'Stamp').closest('button') as HTMLButtonElement
    fireEvent.click(stamp())
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no stamped kf yet')
    }, { timeout: 10000 })
    fireEvent.click(stamp())
    await vi.waitFor(() => {
      const updated = useToastStore.getState().toasts.some((t) => t.message.includes('Updated keyframe'))
      if (!updated) throw new Error('no update toast yet')
    }, { timeout: 10000 })
    // a further authoring op snapshots the non-empty payload map
    fireEvent.click(getByText(document.body, 'Add prompt card').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelectorAll('[data-prompt-clip]').length !== 2) throw new Error('no split yet')
    }, { timeout: 10000 })
  })

  test('a slow queue ticks before landing', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 'slow' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    // the rigged fetch 404s after the ticked run completes
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no slow-convert toast yet')
    }, { timeout: 25000 })
  }, 40000)

  test('a typed duration seeds the envelope', async () => {
    stubLoads()
    mountEditor({ params: { duration_sec: 7 } })
    await waitForText('No motion yet')
  })

  test('an artifact-less upstream harvests to nothing', async () => {
    stubLoads()
    mountEditor({ params: {} }, {
      upstreams: [{ id: 'g0', title: 'older', kind: 'image', service: 'x', params: {}, result: {} }],
    })
    await waitForText('No motion yet')
  })

  test('a self-led upstream list slices the past only', async () => {
    stubLoads()
    const self = { id: 'm1', title: 'Motion', kind: 'motion', service: 'x', params: {}, result: {} }
    const down = { id: 'd9', title: 'later', kind: 'image', service: 'x', params: {}, result: {} }
    mountEditor({ params: {} }, { upstreams: [self, down] })
    await waitForText('No motion yet')
  })

  test('a body-less refusal still fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500, startEmptyBody: true })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('queue refused: HTTP 500'))
      if (!failed) throw new Error('no empty-refusal toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('a kept refine re-enters from the payload', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Pause (Space)"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Stamp')) throw new Error('not in edit yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Stamp').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-kf]')) throw new Error('no stamped kf yet')
    }, { timeout: 10000 })
    fireEvent.click(getByText(document.body, 'Done').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Refine pose')) throw new Error('not out of edit yet')
    }, { timeout: 10000 })
    // re-entering at the same pinned frame reads the kept joints and the
    // bound payload back out
    fireEvent.click(getByText(document.body, 'Refine pose').closest('button') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (!queryByText(document.body, 'Stamp')) throw new Error('not back in edit yet')
    }, { timeout: 10000 })
  })

  test('a refused queue start fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('queue refused: HTTP 500'))
      if (!failed) throw new Error('no refused toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('a non-JSON queue answer fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startRaw: 'not-json{' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('non-JSON body'))
      if (!failed) throw new Error('no non-JSON toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('a run_id-less queue answer fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startRaw: '{}' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('no run_id'))
      if (!failed) throw new Error('no run_id toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('a refused draft compose fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, draftsStatus: 500 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('card compose refused'))
      if (!failed) throw new Error('no compose toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('a vanished run fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 404 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('is gone'))
      if (!failed) throw new Error('no gone toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('a rigless run result fails loud', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 'completed-noglb' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('produced no rigged GLB'))
      if (!failed) throw new Error('no noglb toast yet')
    }, { timeout: 20000 })
  }, 30000)



  test('stage file drops route by type', async () => {
    stubLoads()
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const target = document.body.querySelector('[data-export-rect]') as HTMLElement
    const glb = new File(['glb-bytes'], 'drop.glb', { type: 'model/gltf-binary' })
    fireEvent.drop(target, { dataTransfer: { types: ['Files'], getData: () => '', files: [glb] } })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no drop-body toast yet')
    }, { timeout: 20000 })
    const png = new File(['png-bytes'], 'drop.png', { type: 'image/png' })
    fireEvent.drop(target, { dataTransfer: { types: ['Files'], getData: () => '', files: [png] } })
    await vi.waitFor(() => {
      const call = onSave.mock.calls.find(([p]) =>
        typeof (p as Record<string, unknown>).motion_bg_image === 'string' &&
        ((p as Record<string, unknown>).motion_bg_image as string).startsWith('data:'))
      if (!call) throw new Error('drop bg not persisted yet')
    }, { timeout: 10000 })
  }, 30000)

  test('bg pick button arms the file input', async () => {
    const { onSave } = await mountedNoRun()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Background' }))
    await new Promise((r) => setTimeout(r, 300))
    const touched = onSave.mock.calls.some(([p]) => 'motion_bg_image' in (p as Record<string, unknown>))
    expect(touched).toBe(false)
  })

  test('stage drag-over and leave are silent', async () => {
    stubLoads()
    const { onSave } = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const target = document.body.querySelector('[data-export-rect]') as HTMLElement
    const dt = { types: ['application/tech-noir-asset'], getData: () => '', files: [] }
    fireEvent.dragOver(target, { dataTransfer: dt })
    fireEvent.dragLeave(target)
    await new Promise((r) => setTimeout(r, 300))
    const touched = onSave.mock.calls.some(([p]) =>
      'motion_bg_image' in (p as Record<string, unknown>) || 'preview_glb' in (p as Record<string, unknown>))
    expect(touched).toBe(false)
  })

  test('rect right-click never starts a drag', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const rect = document.body.querySelector('[data-export-rect]') as HTMLElement
    const before = `${rect.style.left}|${rect.style.top}|${rect.style.width}|${rect.style.height}`
    const proto = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
    }
    try {
      fireEvent.pointerDown(rect, { clientX: 400, clientY: 50, button: 2 })
      fireEvent.pointerMove(rect, { clientX: 460, clientY: 50 })
      fireEvent.pointerUp(rect, { clientX: 460, clientY: 50 })
      fireEvent.pointerMove(rect, { clientX: 500, clientY: 50 })
    } finally {
      Element.prototype.getBoundingClientRect = proto
    }
    await new Promise((r) => setTimeout(r, 500))
    const after = `${rect.style.left}|${rect.style.top}|${rect.style.width}|${rect.style.height}`
    expect(after).toBe(before)
  })

  test('other corners anchor their opposites', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
    }, { timeout: 10000 })
    const styleOf = () => {
      const r = document.body.querySelector('[data-export-rect]') as HTMLElement
      return `${r.style.left}|${r.style.top}|${r.style.width}|${r.style.height}`
    }
    const drag = (corner: string, fx: number, tx: number, fy: number, ty: number) => {
      const proto = Element.prototype.getBoundingClientRect
      Element.prototype.getBoundingClientRect = function () {
        return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
      }
      try {
        const el = document.body.querySelector(`[data-export-corner="${corner}"]`) as HTMLElement
        fireEvent.pointerDown(el, { clientX: fx, clientY: fy, button: 0 })
        fireEvent.pointerMove(el, { clientX: tx, clientY: ty })
        fireEvent.pointerUp(el, { clientX: tx, clientY: ty })
      } finally {
        Element.prototype.getBoundingClientRect = proto
      }
    }
    // inward per anchor: nw shrinks down-right, ne shrinks left-down
    // (growing hits the full-height cap and re-derives identically)
    const before = styleOf()
    drag('nw', 400, 440, 225, 250)
    await vi.waitFor(() => {
      if (styleOf() === before) throw new Error('nw did not move yet')
    }, { timeout: 10000 })
    const mid = styleOf()
    drag('ne', 400, 360, 225, 250)
    await vi.waitFor(() => {
      if (styleOf() === mid) throw new Error('ne did not move yet')
    }, { timeout: 10000 })
  })

  test('a tall output floors the corner math the other way', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
    const w = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
    fireEvent.change(w, { target: { value: '4096' } })
    await vi.waitFor(() => {
      const cur = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
      if (cur.value !== '4096') throw new Error('width not set yet')
    }, { timeout: 10000 })
    // retyping the settled value hits the same-value arm (no-op write)
    fireEvent.change(document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement, { target: { value: '4096' } })
    await new Promise((r) => setTimeout(r, 300))
    const styleOf = () => {
      const r = document.body.querySelector('[data-export-rect]') as HTMLElement
      return `${r.style.left}|${r.style.top}|${r.style.width}|${r.style.height}`
    }
    const before = styleOf()
    const proto = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
    }
    try {
      const el = document.body.querySelector('[data-export-corner="se"]') as HTMLElement
      fireEvent.pointerDown(el, { clientX: 400, clientY: 225, button: 0 })
      fireEvent.pointerMove(el, { clientX: 360, clientY: 200 })
      fireEvent.pointerUp(el, { clientX: 360, clientY: 200 })
    } finally {
      Element.prototype.getBoundingClientRect = proto
    }
    await vi.waitFor(() => {
      if (styleOf() === before) throw new Error('tall corner did not move yet')
    }, { timeout: 10000 })
  })

  test('slot file drops route by type', async () => {
    await mountedNoRun()
    const square = document.body.querySelector('[data-motion-body] [data-slot-square]') as HTMLElement
    const glb = new File(['glb-bytes'], 'square.glb', { type: 'model/gltf-binary' })
    fireEvent.drop(square, { dataTransfer: { types: ['Files'], getData: () => '', files: [glb] } })
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no square-body toast yet')
    }, { timeout: 20000 })
  })

  test('stage drag-over parades the drop veil', async () => {
    await mountedNoRun()
    const frame = document.body.querySelector('[data-slot="viewport-frame"]') as HTMLElement
    expect(frame).toBeTruthy()
    fireEvent.dragOver(frame, { dataTransfer: { types: ['text/plain'], getData: () => '' } })
    await new Promise((r) => setTimeout(r, 300))
    expect(queryByText(document.body, /Drop a GLB to set the preview body/)).toBeNull()
    fireEvent.dragOver(frame, { dataTransfer: { types: ['Files'], getData: () => '' } })
    await waitForText('Drop a GLB to set the preview body')
    fireEvent.dragLeave(frame)
    await vi.waitFor(() => {
      if (queryByText(document.body, /Drop a GLB to set the preview body/)) throw new Error('veil still there')
    }, { timeout: 10000 })
  }, 20000)

  test('existing preview urls ride into the dialog', async () => {
    stubLoads()
    mountEditor({
      result: {
        artifacts: { motion_npz: MOTION_URL },
        motionPreviews: [{ url: 'https://host/p.glb' }],
      },
    })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
  })

  test('a urlless preview list yields no dialog preview', async () => {
    stubLoads()
    mountEditor({
      result: {
        artifacts: { motion_npz: MOTION_URL },
        motionPreviews: [{ name: 'no-url-here' }],
      },
    })
    await waitForText('30 fps · 4f')
  })

  test('dialog close drops the curtain', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Close"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
    fireEvent.click(document.body.querySelector('[aria-label="Close"]') as HTMLButtonElement)
    await vi.waitFor(() => {
      if (document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('still open')
    }, { timeout: 10000 })
  })

  test('dialog frame slider seeks and pauses', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    // RULE B: the rail's SpecPanel now owns range inputs too (the
    // generic form's sliders) — the DIALOG's scrub slider is the one
    // inside the scrub row, never "first range in body".
    const scrubSel = '[class*="scrubRow"] input[type="range"]'
    await vi.waitFor(() => {
      if (!document.body.querySelector(scrubSel)) throw new Error('no slider yet')
    }, { timeout: 10000 })
    const range = document.body.querySelector(scrubSel) as HTMLInputElement
    fireEvent.change(range, { target: { value: '2' } })
    await vi.waitFor(() => {
      if (!document.body.textContent?.includes('00:00:02')) throw new Error('no seek yet')
    }, { timeout: 10000 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) throw new Error('not paused yet')
    }, { timeout: 10000 })
  })
})

describe('export framing (dialog + stage rectangle)', () => {
  async function mountedWithRun() {
    stubLoads()
    const m = mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    return m
  }

  async function exportOpened() {
    await mountedWithRun()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-export-rect]')) throw new Error('no rect yet')
      // the dialog's size labels are aria-only, never text
      if (!document.body.querySelector('[aria-label="Output width (pixels)"]')) throw new Error('no dialog yet')
    }, { timeout: 10000 })
  }

  function rectStyle(): string {
    const r = document.body.querySelector('[data-export-rect]') as HTMLElement
    return `${r.style.left}|${r.style.top}|${r.style.width}|${r.style.height}`
  }

  /** Sync-scoped rect stub: install → dispatch → restore with no awaits
   *  between, so the block is atomic (no viewer pass can interleave). */
  function dragRect(target: HTMLElement, fromX: number, toX: number, fromY = 50, toY = 50) {
    const proto = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function () {
      return { x: 0, y: 0, left: 0, top: 0, right: 800, bottom: 450, width: 800, height: 450, toJSON() {} } as DOMRect
    }
    try {
      fireEvent.pointerDown(target, { clientX: fromX, clientY: fromY, button: 0 })
      fireEvent.pointerMove(target, { clientX: toX, clientY: toY })
      fireEvent.pointerUp(target, { clientX: toX, clientY: toY })
    } finally {
      Element.prototype.getBoundingClientRect = proto
    }
  }

  test('typed outputs clamp to 8..4096', async () => {
    await exportOpened()
    const w = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
    fireEvent.change(w, { target: { value: '5000' } })
    await vi.waitFor(() => {
      const cur = document.body.querySelector('[aria-label="Output width (pixels)"]') as HTMLInputElement
      if (cur.value !== '4096') throw new Error('width not clamped yet')
    }, { timeout: 10000 })
    const hh = document.body.querySelector('[aria-label="Output height (pixels)"]') as HTMLInputElement
    fireEvent.change(hh, { target: { value: '1' } })
    await vi.waitFor(() => {
      const cur = document.body.querySelector('[aria-label="Output height (pixels)"]') as HTMLInputElement
      if (cur.value !== '8') throw new Error('height not clamped yet')
    }, { timeout: 10000 })
  })

  test('frame presets refit the rectangle', async () => {
    await exportOpened()
    const before = rectStyle()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Reset frame' }))
    await vi.waitFor(() => {
      if (rectStyle() === before) throw new Error('reset did not refit yet')
    }, { timeout: 10000 })
    const mid = rectStyle()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Whole stage' }))
    await vi.waitFor(() => {
      if (rectStyle() === mid) throw new Error('whole did not refit yet')
    }, { timeout: 10000 })
  })

  test('rect body drag moves the frame', async () => {
    await exportOpened()
    const before = rectStyle()
    dragRect(document.body.querySelector('[data-export-rect]') as HTMLElement, 400, 460)
    await vi.waitFor(() => {
      if (rectStyle() === before) throw new Error('rect did not move yet')
    }, { timeout: 10000 })
    // a zero-delta drag hits the same-coords arm (no-op write)
    dragRect(document.body.querySelector('[data-export-rect]') as HTMLElement, 400, 400)
    await new Promise((r) => setTimeout(r, 300))
  })

  test('rect corner drag resizes aspect-locked', async () => {
    await exportOpened()
    const before = rectStyle()
    // inward: the refit rect already spans full height, so only a
    // shrink changes both axes (growth re-derives identically)
    dragRect(document.body.querySelector('[data-export-corner="se"]') as HTMLElement, 400, 360, 225, 200)
    await vi.waitFor(() => {
      if (rectStyle() === before) throw new Error('rect did not resize yet')
    }, { timeout: 10000 })
  })

  test('export toggles the panel shut', async () => {
    await exportOpened()
    fireEvent.click(getByRole(document.body, 'button', { name: 'Export' }))
    await vi.waitFor(() => {
      if (document.body.querySelector('[data-export-rect]')) throw new Error('rect still there')
    }, { timeout: 10000 })
  })
})

describe('preview body (attach / convert / fall back)', () => {
  async function mountedWithBody(previewGlb: string, loadOpts: Record<string, never> = {}) {
    stubLoads({ bodies: { 'bare.glb': 'glb', 'rigged.glb': 404 }, ...loadOpts })
    const m = mountEditor({ params: { preview_glb: previewGlb } })
    await waitForText('No motion yet')
    return m
  }

  test('a rigless mesh rides the convert queue, fails loud, holds the mannequin', async () => {
    await mountedWithBody('https://host/bare.glb')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no convert-failure toast yet')
    }, { timeout: 20000 })
    // the notice names the dead rigged asset; the stage never empties
    await waitForText('previewing on the neutral mannequin')
    expect(document.body.textContent).toContain('No motion yet')
  }, 30000)

  test('a refused queue start surfaces the refusal', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, startStatus: 500 })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('SOMAX conversion failed'))
      if (!failed) throw new Error('no convert-failure toast yet')
    }, { timeout: 20000 })
    await waitForText('queue refused')
  }, 30000)

  test('a failed convert run surfaces the run error', async () => {
    stubLoads({ bodies: { 'bare.glb': 'glb' }, flow: 'failed' })
    mountEditor({ params: { preview_glb: 'https://host/bare.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const failed = useToastStore.getState().toasts.some((t) => t.message.includes('brick blew up'))
      if (!failed) throw new Error('no run-error toast yet')
    }, { timeout: 20000 })
  }, 30000)

  test('an unfetchable body falls back without touching the queue', async () => {
    const seen: string[] = []
    stubLoads({ bodies: { 'missing.glb': 404 } })
    const origFetch = globalThis.fetch
    vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
      seen.push(u)
      return (origFetch as typeof fetch)(input as RequestInfo, init)
    })
    mountEditor({ params: { preview_glb: 'https://host/missing.glb' } })
    await waitForText('No motion yet')
    await vi.waitFor(() => {
      const fell = useToastStore.getState().toasts.some((t) => t.message.includes('Preview body not loaded'))
      if (!fell) throw new Error('no fallback toast yet')
    }, { timeout: 20000 })
    expect(seen.some((u) => u.includes('/v1/flows/'))).toBe(false)
  }, 30000)
})
describe('run state (motion on stage)', () => {
  function runStage() {
    return mkStage({ result: { artifacts: { motion_npz: MOTION_URL } } })
  }

  test('a finished run arms transport with the fps chip', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('30 fps · 4f')
    const play = document.body.querySelector('[aria-label="Play (Space)"], [aria-label="Pause (Space)"]') as HTMLButtonElement | null
    expect(play).toBeTruthy()
    expect(play!.hasAttribute('disabled')).toBe(false)
  })

  test('playback auto-starts once the precompute lands', async () => {
    stubLoads()
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) throw new Error('not playing yet')
    }, { timeout: 10000 })
  })

  test('a dead motion asset surfaces an honest veil', async () => {
    stubLoads({ motionStatus: 500 })
    mountEditor({ result: { artifacts: { motion_npz: MOTION_URL } } })
    await waitForText('Failed to fetch motion asset: 500')
  })
})

// RULE B — THE FORM LAW (operator, 2026-09-18): all cards are forms.
// The studio claimed cards.stage.view and replaced the standard
// SpecForm, which left the schema's generation/guidance/clock params
// with NO surface. The rail now seats the SHARED SpecPanel over the
// served kimodo spec; the timeline stays the document seam writing
// the SAME declared keys.
describe('RULE B: the generic parameter form rides the rail', () => {
  test("the schema's params render through the shared SpecPanel — the served spec's rows at their wire names", async () => {
    stubLoads()
    mountEditor()
    // the panel's sections land with their chrome + rows
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-testid="mo-gen-panel"]')) throw new Error('no gen panel')
    }, { timeout: 10000 })
    expect(document.body.querySelector('[data-testid="mo-guide-panel"]')).toBeTruthy()
    expect(document.body.querySelector('[data-testid="mo-clock-panel"]')).toBeTruthy()
    // the rows are the SERVED spec's, at the wire names (labels are
    // the schema's own descriptions — never hand-rolled rows)
    expect(document.body.querySelector('[aria-label="Diffusion steps"]')).toBeTruthy()
    expect(document.body.querySelector('[aria-label="CFG weight A"]')).toBeTruthy()
    expect(document.body.querySelector('[aria-label="Seed"]')).toBeTruthy()
  })

  test('an edit writes the declared key through onSave — the override seam (one vocabulary with the timeline)', async () => {
    stubLoads()
    const { onSave } = mountEditor()
    await vi.waitFor(() => {
      if (!document.body.querySelector('[data-testid="mo-clock-panel"]')) throw new Error('no clock panel')
    }, { timeout: 10000 })
    const seed = document.body.querySelector('[aria-label="Seed"]') as HTMLInputElement
    fireEvent.change(seed, { target: { value: '777' } })
    await vi.waitFor(() => {
      const wrote = onSave.mock.calls.some((c) => c[0] && typeof c[0] === 'object' && 'seed' in (c[0] as Record<string, unknown>))
      if (!wrote) throw new Error('seed write never landed')
    }, { timeout: 10000 })
    const call = onSave.mock.calls.find((c) => c[0] && typeof c[0] === 'object' && 'seed' in (c[0] as Record<string, unknown>))!
    // THE STUDIO SEAM (2026-09-18): edits coerce at the SCHEMA
    // boundary (useResolvedForm's edit verb — the same law CardForm
    // rides; a numeric string rides as a number, one spelling)
    expect((call[0] as Record<string, unknown>).seed).toBe(777)
  })
})
