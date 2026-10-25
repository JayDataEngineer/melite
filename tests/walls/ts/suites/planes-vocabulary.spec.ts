/**
 * planes-vocabulary — THE CANON OWNS THE CLIENT SPELLING
 * (walls-meta-wave2 §2c "25 remainder", 2026-11-06): debt 25 wired
 * the four-plane canon's ENGINE seat (validateDecl → planeRefusals)
 * but the client seats kept hand-copying the group literals — a
 * canon rename would drift silently past every suite. The client
 * seats (card-base spec.ts — the form's axis law; melite-tools
 * discovery.ts — the harness serving door) now IMPORT CATEGORIES
 * from @melite/contracts/planes; this wall pins that state.
 *
 * Arm 1 — THE IMPORT SEAT: both client seats import the canon's
 *   CATEGORIES (the src-orphan law's own standard: a vocabulary
 *   module nobody imports is prose).
 * Arm 2 — THE HAND-COPY BAN: zero bare canon literals ('Recipe',
 *   'Variant', 'Quant') in those seats — a returned hand copy is
 *   the silent-drift class this row refuses.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../../../..')
const SEATS = [
  'packages/web/card-base/src/spec.ts',
  'packages/harness/melite-tools/src/discovery.ts',
]
const CANON_LITERALS = /(['"])(Recipe|Variant|Quant)\1/

describe('the planes canon owns the client spelling (debt 25 remainder)', () => {
  it('both client seats import CATEGORIES from the canon (the import-seat law)', () => {
    for (const seat of SEATS) {
      const src = readFileSync(join(ROOT, seat), 'utf8')
      expect(src, `${seat} must import the canon`).toMatch(/import \{ CATEGORIES \} from '@melite\/contracts\/planes'/)
      expect(src, `${seat} must CONSUME the import`).toMatch(/CATEGORIES\.(recipe|variant|quant)/)
    }
  })

  it('no bare canon literals ride the client seats (the hand-copy ban — silent drift dies here)', () => {
    for (const seat of SEATS) {
      const src = readFileSync(join(ROOT, seat), 'utf8')
      const bad: string[] = []
      for (const line of src.split('\n')) {
        if (CANON_LITERALS.test(line)) bad.push(line.trim())
      }
      expect(bad, `${seat}: hand-copied canon literals (import CATEGORIES — one vocabulary):\n${bad.join('\n')}`).toEqual([])
    }
  })
})
