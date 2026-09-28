// hot-door-cold-boot.spec — THE COLD-BOOT LAW (the lane crash the
// first armed row taught, 2026-10-11): an insert row rides the
// profile PATCH, so it mounts at EVERY boot — including the cold
// one where the fiber can run BEFORE the estate bundle's card boot
// and theService() throws "card defs not booted". A sync-apply
// drop-in that touches the card plane crash-loops the lane
// (Restart=always turned one bad boot into five).
//
// THIS FILE IS ITS OWN PROOF ENVIRONMENT: the hot-door spec warms
// the module cache in its first arm, which would mask the cold
// path. Vitest isolates files in separate workers, so this file's
// FIRST act — mounting the drop-in with no prior loadCardDefs —
// reproduces the boot order exactly. Nothing here may prime the
// card plane before the mount.
import { describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'

vi.setConfig({ testTimeout: 240000 })

describe('THE COLD-BOOT LAW: an armed row mounts before the card boot', () => {
  it('g2-maker-door mounts on a COLD card plane without theService throwing (the crash-loop killer)', async () => {
    // NO loadCardDefs() before this import-and-mount — that absence
    // is the whole arm. The import itself is also part of the proof:
    // a module-cycle or bad edge dies here, not on the lane.
    const { apply } = await import('../hot/g2-maker-door.plugin.ts')
    const ctx = new Context()
    // the loader's shape: fresh fiber, apply awaited (async apply is
    // the contract the fix established — sync apply crashed here)
    await ctx.plugin({ name: 'cold-boot-wall', apply })
    try {
      const { theService } = await import('@melite/comfyui-cordis')
      // the mount completed: the card registered AFTER the awaited
      // boot, so the service is armed and the card is present
      expect(theService().cardIds().includes('hot-g2-door')).toBe(true)
    } finally {
      await ctx.fiber.dispose()
    }
    const { theService: svcAfter } = await import('@melite/comfyui-cordis')
    expect(svcAfter().cardIds().includes('hot-g2-door')).toBe(false)
  })
})
