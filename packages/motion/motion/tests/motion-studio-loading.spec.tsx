// @vitest-environment happy-dom
/**
 * motion studio II — loads + run state (rest pose, run motion on stage).
 * Split from motion-studio.spec.tsx: PURE MOVE, zero test-content
 * changes (sibling spec in the same tests/ dir, auto-discovered by
 * the vitest dom project). Shared setup lives in ./helpers.ts.
 *
 * MOUNT PATTERN (2026-09-16): NO act() anywhere — render outside
 * act, waitFor polling finds settled content, root.unmount() in
 * afterEach kills the viewer's async loop. 'Not wrapped in act'
 * warnings are tolerated noise.
 */
import { fireEvent } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { useToastStore } from '@melite/card-base/toast'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, mounted, mkStage, stubLoads, mountEditor } from './helpers.ts'

afterEach(() => resetStudio())

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
