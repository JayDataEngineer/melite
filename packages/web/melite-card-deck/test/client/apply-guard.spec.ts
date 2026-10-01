/**
 * claimDeckApply — the single-mount claim (module singleton): the
 * first apply wins, a duplicated client injection is a logged no-op,
 * and the owning fiber's unload releases the claim so a rebuilt
 * bundle can claim again.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadGuard(): Promise<typeof import('../../src/client/apply-guard.ts')> {
  return await import('../../src/client/apply-guard.ts')
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('claimDeckApply — the single-mount claim', () => {
  it('the first claim wins, the second is a logged no-op', async () => {
    const mod = await loadGuard()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(mod.claimDeckApply()).toBe(true)
    expect(mod.claimDeckApply()).toBe(false)
    expect(warn).toHaveBeenCalledOnce()
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/second mount skipped/)
    warn.mockRestore()
  })

  it('release frees the claim so a rebuilt bundle can claim again', async () => {
    const mod = await loadGuard()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(mod.claimDeckApply()).toBe(true)
    mod.releaseDeckApply()
    expect(mod.claimDeckApply()).toBe(true)
  })
})
