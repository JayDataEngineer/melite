import { describe, it, expect } from 'vitest'
import { act, render } from '@testing-library/react'
import { App } from '../App'

describe('App', () => {
  it('renders without crashing', async () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
    // Should have the main layout element
    expect(container.querySelector('.flex.h-screen')).toBeTruthy()
    // Drain the boot chain's async logging before the worker tears the
    // environment down: App.init rejects offline and logs via console.error,
    // and a log landing on an already-closed rpc fails the WHOLE run as an
    // unhandled rejection (EnvironmentTeardownError) even with every test
    // green. One macrotask lets the queue empty while the env is alive.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  })
})