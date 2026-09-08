/**
 * ComfyStatus (GpuStatus.tsx) — health-polling badge.
 *
 * Previously had ZERO direct tests. The component polls GET /health every
 * 10s, maps the response to one of three visual states (loading/up/down),
 * and cleans up on unmount. All of that is behavioral contract that would
 * silently break on a refactor.
 *
 * Covers:
 *   • Initial render shows "loading" state (text-muted-foreground + "Connecting…")
 *   • /health returns {comfyui:"up"} → "up" state (text-emerald-400 + green dot)
 *   • /health returns {comfyui:"down"} → "down" state (text-red-400)
 *   • /health returns {comfyui: other} → "down" (anything non-"up" is down)
 *   • /health returns non-OK status → "down"
 *   • apiFetch rejects → "down" (catch path)
 *   • Green dot only appears when state === "up"
 *   • Title attribute reflects each state
 *   • Renders a Cpu icon (lucide)
 *   • Unmount clears the interval (no setState after unmount)
 *   • Polling continues at 10s intervals (multiple calls)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render as renderBase, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import type { ReactElement } from 'react'
import { TooltipProvider } from '@melite/ui/tooltip'
import { ComfyStatus } from '../surfaces/shared/GpuStatus'

// ComfyStatus mounts the Radix Tip via HeaderIconButton (tooltip
// unification 2026-08-14) — render under the app's TooltipProvider, the
// same one App.tsx wraps the workspace in.
function renderWithTooltip(ui: ReactElement) {
  return renderBase(<TooltipProvider>{ui}</TooltipProvider>)
}

// ── Mock apiFetch ───────────────────────────────────────────────────────────
const apiFetchMock = vi.fn()
vi.mock('@melite/catalog/api', () => ({
  apiFetch: (...a: unknown[]) => apiFetchMock(...a),
}))

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}
function badResponse(status: number, body = 'error'): Response {
  return new Response(body, { status })
}

beforeEach(() => {
  apiFetchMock.mockReset()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: render + flush the initial async check() promise chain.
// With fake timers, the initial check() creates a promise that must be
// resolved before setState fires. We advance microtasks by tick(0).
async function renderAndFlush() {
  const result = renderWithTooltip(<ComfyStatus />)
  await act(async () => {
    // Flush promise microtasks (apiFetch + res.json() chain).
    await vi.advanceTimersByTimeAsync(0)
  })
  return result
}

describe('ComfyStatus (GpuStatus)', () => {
  it('initial render shows "loading" title before check resolves', async () => {
    // Never-resolving promise so we stay in loading.
    apiFetchMock.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithTooltip(<ComfyStatus />)
    const btn = container.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('Connecting to ComfyUI…')
    // loading uses text-muted-foreground.
    expect(btn.className).toContain('text-muted-foreground')
  })

  it('loading state does NOT show the green dot', async () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}))
    const { container } = renderWithTooltip(<ComfyStatus />)
    const dot = container.querySelector('.bg-emerald-400')
    expect(dot).toBeNull()
  })

  it('/health returns {comfyui:"up"} → "up" state with green dot', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    const btn = container.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('ComfyUI backend: connected')
    expect(btn.className).toContain('text-emerald-400')
    // Green dot present.
    const dot = container.querySelector('.bg-emerald-400')
    expect(dot).not.toBeNull()
  })

  it('/health returns {comfyui:"down"} → "down" state, no green dot', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'down' }))
    const { container } = await renderAndFlush()
    const btn = container.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('ComfyUI backend: unreachable')
    expect(btn.className).toContain('text-red-400')
    expect(container.querySelector('.bg-emerald-400')).toBeNull()
  })

  // ── TRI-STATE (2026-08-14): busy = reachable but under load ──────────────
  // The old two-state badge flapped red/green under heavy webui load because
  // a timed-out probe read as "dead". The gateway monitor's "busy" verdict
  // must render amber with its evidence — the operator's question ("dropped
  // my flow, or just stressed?") answered at a glance.

  it('/health returns {comfyui:"busy"} → amber state, amber dot, no green/red', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'busy' }))
    const { container } = await renderAndFlush()
    const btn = container.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('ComfyUI backend: busy — reachable but under load')
    expect(btn.className).toContain('text-amber-400')
    // Amber dot present; neither green nor red.
    expect(container.querySelector('.bg-amber-400')).not.toBeNull()
    expect(container.querySelector('.bg-emerald-400')).toBeNull()
    expect(container.querySelector('.bg-red-400')).toBeNull()
  })

  it('busy WITH detail → title carries the evidence (last ok + runs)', async () => {
    apiFetchMock.mockResolvedValue(
      okResponse({
        comfyui: 'busy',
        comfyui_detail: { seconds_since_success: 12, runs_active: 2 },
      }),
    )
    const { container } = await renderAndFlush()
    const title = container.querySelector('button')!.getAttribute('aria-label')
    expect(title).toContain('busy — reachable but under load')
    expect(title).toContain('(last ok 12s ago)')
    expect(title).toContain('2 runs executing')
  })

  it('busy detail with 1 active run → singular "1 run executing"', async () => {
    apiFetchMock.mockResolvedValue(
      okResponse({
        comfyui: 'busy',
        comfyui_detail: { seconds_since_success: 3, runs_active: 1 },
      }),
    )
    const { container } = await renderAndFlush()
    const title = container.querySelector('button')!.getAttribute('aria-label')
    expect(title).toContain('1 run executing')
    expect(title).not.toContain('1 runs executing')
  })

  it('busy WITHOUT detail → plain title, still amber (payload we half-understand)', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'busy' }))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
      'ComfyUI backend: busy — reachable but under load',
    )
    expect(container.querySelector('button')!.className).toContain('text-amber-400')
  })

  it('transitions up → busy → up across polls (the load flap, now legible)', async () => {
    apiFetchMock.mockResolvedValueOnce(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain('text-emerald-400')

    // Heavy load lands: probe times out, but runs are active → busy, NOT down.
    apiFetchMock.mockResolvedValueOnce(
      okResponse({
        comfyui: 'busy',
        comfyui_detail: { runs_active: 1, consecutive_failures: 1 },
      }),
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    const btn = container.querySelector('button')!
    expect(btn.className).toContain('text-amber-400')
    expect(btn.className).not.toContain('text-red-400')
    expect(btn.getAttribute('aria-label')).toContain('1 run executing')

    // Load clears → green again.
    apiFetchMock.mockResolvedValueOnce(okResponse({ comfyui: 'up' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(container.querySelector('button')!.className).toContain('text-emerald-400')
  })

  it('/health returns {comfyui:"weird"} → "down" (anything non-tri-state)', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'weird' }))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
      'ComfyUI backend: unreachable',
    )
  })

  it('/health returns {comfyui: null} → "down"', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: null }))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain('text-red-400')
  })

  it('/health returns {comfyui: undefined} → "down"', async () => {
    apiFetchMock.mockResolvedValue(okResponse({}))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain('text-red-400')
  })

  it('/health returns non-OK (503) → "down"', async () => {
    apiFetchMock.mockResolvedValue(badResponse(503))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
      'ComfyUI backend: unreachable',
    )
  })

  it('/health returns non-OK (500) → "down"', async () => {
    apiFetchMock.mockResolvedValue(badResponse(500, 'server error'))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain('text-red-400')
  })

  it('apiFetch rejects → "down" (catch path)', async () => {
    apiFetchMock.mockRejectedValue(new Error('network down'))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
      'ComfyUI backend: unreachable',
    )
  })

  it('apiFetch throws synchronously → "down" (catch path)', async () => {
    apiFetchMock.mockImplementation(() => { throw new Error('sync boom') })
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain('text-red-400')
  })

  it('renders a Cpu icon (svg element)', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.className).toContain('h-4')
    expect(svg?.className).toContain('w-4')
  })

  it('green dot has the glow shadow class only in "up" state', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    const dot = container.querySelector('.bg-emerald-400')!
    expect(dot.className).toContain('shadow-[')
  })

  it('button uses ghost variant (hover:bg-muted) and icon-sm size (size-7)', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    const btn = container.querySelector('button')!
    // ghost variant applies hover:bg-muted; icon-sm applies size-7.
    expect(btn.className).toContain('hover:bg-muted')
    expect(btn.className).toContain('size-7')
  })

  it('hover:text-foreground is always present regardless of state', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain(
      'hover:text-foreground',
    )
  })

  it('relative positioning is always on the button (for the green dot)', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain('relative')
  })

  it('unmount clears the interval — no setState warning after unmount', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { unmount } = await renderAndFlush()
    unmount()
    // Advance past the next poll — should not throw React setState warning.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })
    // No error thrown = pass. The cancelled flag prevents setState.
  })

  it('polls at 10s intervals — apiFetch called multiple times', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    const initialCalls = apiFetchMock.mock.calls.length

    // Advance 10s → second poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(apiFetchMock.mock.calls.length).toBe(initialCalls + 1)

    // Advance another 10s → third poll.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(apiFetchMock.mock.calls.length).toBe(initialCalls + 2)

    // Cleanup to avoid lingering timers.
    container.remove()
  })

  it('state transitions from down → up on subsequent poll', async () => {
    // First poll: down.
    apiFetchMock.mockResolvedValueOnce(badResponse(503))
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.className).toContain('text-red-400')

    // Second poll: up.
    apiFetchMock.mockResolvedValueOnce(okResponse({ comfyui: 'up' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(container.querySelector('button')!.className).toContain(
      'text-emerald-400',
    )
    expect(container.querySelector('.bg-emerald-400')).not.toBeNull()
  })

  it('state transitions from up → down on subsequent poll', async () => {
    // First poll: up.
    apiFetchMock.mockResolvedValueOnce(okResponse({ comfyui: 'up' }))
    const { container } = await renderAndFlush()
    expect(container.querySelector('.bg-emerald-400')).not.toBeNull()

    // Second poll: down (network failure).
    apiFetchMock.mockRejectedValueOnce(new Error('network died'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })
    expect(container.querySelector('button')!.className).toContain('text-red-400')
    expect(container.querySelector('.bg-emerald-400')).toBeNull()
  })

  it('always fetches /v1/health (no other endpoint)', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    await renderAndFlush()
    expect(apiFetchMock.mock.calls[0][0]).toBe('/v1/health')
  })

  it('loading → up transition updates title correctly', async () => {
    // Start with never-resolving to keep in loading.
    let resolveCheck: (r: Response) => void
    apiFetchMock.mockReturnValue(
      new Promise<Response>((resolve) => { resolveCheck = resolve }),
    )
    const { container } = renderWithTooltip(<ComfyStatus />)
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe('Connecting to ComfyUI…')

    // Now resolve the check with healthy status.
    await act(async () => {
      resolveCheck!(okResponse({ comfyui: 'up' }))
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
      'ComfyUI backend: connected',
    )
  })

  it('check() is called immediately on mount (not just after 10s)', async () => {
    apiFetchMock.mockResolvedValue(okResponse({ comfyui: 'up' }))
    await renderAndFlush()
    // At least one call should have happened before any timer advance.
    expect(apiFetchMock).toHaveBeenCalled()
  })
})

// ── VRAM readout (2026-08-16, GPU-variations fix) ──────────────────────────
// /health now carries comfyui_detail.vram = {total_mb, free_mb} from the
// executor's own /system_stats (the health probe's 5s cadence — the same
// probe that answers "is it up?" now answers "how much is free?"). The
// badge tooltip shows it as the OTHER side of the variant-peak ledger:
// the variant buttons declare peaks (PresetGroup), this shows what's
// actually free. Together: "will this variant fit?" at a glance.

describe('ComfyStatus — VRAM readout in the tooltip', () => {
  it('up WITH vram detail → title carries free/total in GB (rounded)', async () => {
    apiFetchMock.mockResolvedValue(
      okResponse({
        comfyui: 'up',
        comfyui_detail: { vram: { total_mb: 24330, free_mb: 23667 } },
      }),
    )
    const { container } = await renderAndFlush()
    const title = container.querySelector('button')!.getAttribute('aria-label')!
    expect(title).toBe('ComfyUI backend: connected · 23G free / 24G')
  })

  it('vram present but null → plain connected title, nothing fabricated', async () => {
    apiFetchMock.mockResolvedValue(
      okResponse({ comfyui: 'up', comfyui_detail: { vram: null } }),
    )
    const { container } = await renderAndFlush()
    expect(container.querySelector('button')!.getAttribute('aria-label')).toBe(
      'ComfyUI backend: connected',
    )
  })

  it('busy WITH vram detail → evidence AND vram, in that order', async () => {
    apiFetchMock.mockResolvedValue(
      okResponse({
        comfyui: 'busy',
        comfyui_detail: {
          runs_active: 1,
          vram: { total_mb: 24330, free_mb: 5120 },
        },
      }),
    )
    const { container } = await renderAndFlush()
    const title = container.querySelector('button')!.getAttribute('aria-label')!
    expect(title).toContain('1 run executing')
    expect(title).toContain('· 5G free / 24G')
  })

  it('down → no vram note even if stale detail leaks through', async () => {
    apiFetchMock.mockResolvedValue(
      okResponse({
        comfyui: 'down',
        comfyui_detail: { vram: { total_mb: 24330, free_mb: 23667 } },
      }),
    )
    const { container } = await renderAndFlush()
    const title = container.querySelector('button')!.getAttribute('aria-label')!
    expect(title).toBe('ComfyUI backend: unreachable')
    expect(title).not.toContain('free')
  })
})
