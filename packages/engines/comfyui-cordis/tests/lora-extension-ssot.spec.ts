// lora-extension-ssot.spec.ts — THE ONE ALLOWLIST (lora audit F1,
// 2026-11-15): the user-rows file validator and the tray's directory
// scan judge the same file universe. Two literal copies drift under
// maintenance: the tray skips a file the rows door would seat, or the
// reverse, and the picker disagrees with the engine. The list is
// exported ONCE from userLoras.ts; this wall reds the moment a second
// literal array returns anywhere in the two seats.
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { LORA_EXTENSIONS } from '../src/userLoras.ts'

const source = (rel: string): string =>
  readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

describe('THE LORA ALLOWLIST HAS ONE HOME', () => {
  it('the exported list is the lawful universe', () => {
    expect(LORA_EXTENSIONS).toEqual(['.safetensors', '.ckpt', '.pt', '.bin', '.gguf'])
  })

  it('no second literal weight-extension array exists in either seat (the F1 dupe class)', () => {
    // the literal shape a duplicate takes: ['<dot>ext', ...] naming
    // at least the canonical two. Anchored on the dot so a label list
    // or a '.json' rows-file list never counts.
    const literal = /\[\s*['"]\.(?:safetensors|ckpt)['"][^\]]*\]/g
    const hits = ['../src/userLoras.ts', '../src/mods/trayLoras.ts']
      .map(rel => ({ rel, count: (source(rel).match(literal) ?? []).length }))
      .filter(h => h.count > 0)
    // exactly ONE home: the export's own initializer in userLoras
    expect(hits).toEqual([{ rel: '../src/userLoras.ts', count: 1 }])
  })

  it('the tray consumes the shared list (no private copy is even nameable)', () => {
    const tray = source('../src/mods/trayLoras.ts')
    expect(tray).toContain("import { LORA_EXTENSIONS")
    expect(tray).not.toContain('TRAY_EXTENSIONS')
  })
})
