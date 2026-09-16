/**
 * claimGalleryApply — the single-application claim (module singleton):
 * a duplicated client injection is a no-op (first application wins),
 * and the owning fiber's unload releases the claim so a rebuilt
 * bundle can claim again.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadGuard(): Promise<typeof import('../src/client/apply-guard.ts')> {
  return await import('../src/client/apply-guard.ts')
}

afterEach(() => {
  vi.resetModules()
})

describe('claimGalleryApply — the single-application claim', () => {
  it('the first claim wins, the second is a no-op', async () => {
    const mod = await loadGuard()
    expect(mod.claimGalleryApply()).toBe(true)
    expect(mod.claimGalleryApply()).toBe(false)
  })

  it('release frees the claim so a rebuilt bundle can claim again', async () => {
    const mod = await loadGuard()
    expect(mod.claimGalleryApply()).toBe(true)
    mod.releaseGalleryApply()
    expect(mod.claimGalleryApply()).toBe(true)
  })
})
