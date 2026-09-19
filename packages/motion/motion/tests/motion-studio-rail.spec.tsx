// @vitest-environment happy-dom
/**
 * motion studio II — rail chrome (view + transport, the generic parameter form).
 * Split from motion-studio.spec.tsx: PURE MOVE, zero test-content
 * changes (sibling spec in the same tests/ dir, auto-discovered by
 * the vitest dom project). Shared setup lives in ./helpers.ts.
 *
 * MOUNT PATTERN (2026-09-16): NO act() anywhere — render outside
 * act, waitFor polling finds settled content, root.unmount() in
 * afterEach kills the viewer's async loop. 'Not wrapped in act'
 * warnings are tolerated noise.
 */
import { fireEvent, getByRole, getByText } from '@testing-library/dom'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { waitForText } from './harness.tsx'
import { MOTION_URL } from './fixtures.ts'
import { resetStudio, stubLoads, mountEditor } from './helpers.ts'

afterEach(() => resetStudio())

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
    // retry the press inside the wait: under full-gate load the keydown
    // can land before the transport handler arms (flake ledgered #16).
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Play (Space)"]')) {
        fireEvent.keyDown(document.body, { code: 'Space' })
        throw new Error('not paused yet')
      }
    }, { timeout: 20000 })
    await vi.waitFor(() => {
      if (!document.body.querySelector('[aria-label="Pause (Space)"]')) {
        fireEvent.keyDown(document.body, { code: 'Space' })
        throw new Error('not resumed yet')
      }
    }, { timeout: 20000 })
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
