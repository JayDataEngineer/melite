import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from '../components/ErrorBoundary'

// React's error boundaries only catch errors thrown during render/lifecycle,
// not in event handlers. We throw in a function component body so the
// boundary's getDerivedStateFromError fires.

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('kaboom in render')
  return <div>all good</div>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress React's noisy error log during intentional throws
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeTruthy()
  })

  it('renders the fallback UI with the error message when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something crashed')).toBeTruthy()
    expect(screen.getByText('kaboom in render')).toBeTruthy()
  })

  it('renders a Reload button', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    const btn = screen.getByRole('button', { name: /reload/i })
    expect(btn).toBeTruthy()
  })

  it('reloads the page when Reload is clicked', () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    })
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    )
    fireEvent.click(screen.getByRole('button', { name: /reload/i }))
    expect(reloadSpy).toHaveBeenCalledOnce()
  })
})
