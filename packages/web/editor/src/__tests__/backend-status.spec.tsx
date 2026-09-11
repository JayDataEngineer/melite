import { describe, it, expect, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { TooltipProvider } from '@melite/ui/tooltip'
import type { ReactElement } from 'react'

const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)
import { BackendStatus } from '../components/BackendStatus'
import * as api from '@melite/catalog'

// BackendStatus subscribes to the api client's liveness broadcast and
// renders null when healthy. The interesting behavior is the OFFLINE →
// badge transition and the DEGRADED → spinner transition, both driven
// by the module-level state inside lib/api.ts. We drive them by mocking
// the three exported accessors.

describe('BackendStatus', () => {
  it('renders nothing when the gateway is online', () => {
    vi.spyOn(api, 'getBackendState').mockReturnValue('online')
    vi.spyOn(api, 'onBackendState').mockReturnValue(() => {})
    const { container } = renderWithTooltip(<BackendStatus />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a "Reconnecting" pill with a spinner when degraded', () => {
    vi.spyOn(api, 'getBackendState').mockReturnValue('degraded')
    vi.spyOn(api, 'onBackendState').mockReturnValue(() => {})
    renderWithTooltip(<BackendStatus />)
    expect(screen.getByText('Reconnecting')).toBeTruthy()
    // The degraded state uses Loader2 with animate-spin (see COPY table).
    const svg = document.querySelector('.animate-spin')
    expect(svg).not.toBeNull()
  })

  it('renders a "Backend offline" pill when offline', () => {
    vi.spyOn(api, 'getBackendState').mockReturnValue('offline')
    vi.spyOn(api, 'onBackendState').mockReturnValue(() => {})
    renderWithTooltip(<BackendStatus />)
    expect(screen.getByText('Backend offline')).toBeTruthy()
    // The offline state uses AlertTriangle (no spin).
    expect(document.querySelector('.animate-spin')).toBeNull()
    // The explanatory tooltip now renders via the styled Tip — the pill
    // carries the message as its accessible name (aria-label).
    const pill = screen.getByText('Backend offline').closest('[aria-label]')
    expect(pill?.getAttribute('aria-label')).toMatch(/Gateway unreachable/)
  })

  it('re-renders when the backend state broadcast fires', () => {
    // Capture the listener registered by the component so the test can
    // drive a transition: online (null) → offline (badge).
    let listener: ((s: api.BackendState) => void) | null = null
    vi.spyOn(api, 'getBackendState').mockReturnValue('online')
    vi.spyOn(api, 'onBackendState').mockImplementation((cb) => {
      listener = cb
      return () => { listener = null }
    })
    const { container } = renderWithTooltip(<BackendStatus />)
    expect(container.firstChild).toBeNull()

    act(() => {
      listener?.('offline')
    })
    expect(screen.getByText('Backend offline')).toBeTruthy()
  })
})
