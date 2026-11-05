// lora-accept-ssot.spec.ts — THE OS-DIALOG ALLOWLIST HAS ONE SPELLING
// (lora audit F2, 2026-11-15). The two upload seats each hand-spelled
// `.safetensors,.ckpt,.pt,.bin,.gguf` as their file-dialog accept
// value, and the Manager sidebar's field label prose-spelled the list
// a third time. The cure derives every spelling from
// @melite/contracts/loraExtensions (LORA_ACCEPT / LORA_EXTENSIONS —
// the tier-agnostic home of the F1 initializer). This census reds when
// any seat re-spells the list: a hand-spelled accept drifts from the
// rows-file validator the moment a format joins or leaves the SSOT.
//
// TOGGLE: put the literal back on either seat → arms 1–2 red; derive
// the copy from a string literal again → arm 3 reds.
import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

const source = (rel: string): string => readFileSync(join(ROOT, rel), 'utf8')

/** The hand-spelled accept value, as any seat writes it (prop or JSX
 *  attribute, any quote style). */
const HAND_ACCEPT = /accept\s*[:=]\s*["'`]\.safetensors/

/** A string literal naming three or more of the SSOT extensions — the
 *  prose re-spelling class (a label like "LoRA file (.safetensors,
 *  .ckpt, .pt, …)"). */
const PROSE_LIST = /["'`][^"'`]*\.safetensors[^"'`]*\.ckpt[^"'`]*\.pt[^"'`]*["'`]/

describe('THE LORA ACCEPT ALLOWLIST IS DERIVED, NEVER HAND-SPELLED', () => {
  it('the card-base upload seat imports LORA_ACCEPT and spells no accept literal', () => {
    const src = source('packages/web/card-base/src/mods.tsx')
    expect(src, 'the seat imports the SSOT accept value').toContain("from '@melite/contracts/loraExtensions'")
    expect(src.match(HAND_ACCEPT), 'the OS-dialog accept is the import, not a literal').toBeNull()
  })

  it('the Manager sidebar upload seat imports LORA_ACCEPT and spells no accept literal', () => {
    const src = source('packages/web/melite-card-deck/src/client/lora-section.tsx')
    expect(src, 'the seat imports the SSOT accept value').toContain("from '@melite/contracts/loraExtensions'")
    expect(src.match(HAND_ACCEPT), 'the OS-dialog accept is the import, not a literal').toBeNull()
  })

  it('the sidebar copy derives its extension list from the SSOT (no prose re-spelling)', () => {
    const src = source('packages/web/melite-card-deck/src/assetsCopy.ts')
    expect(src, 'the copy dictionary consumes the SSOT list').toContain('LORA_EXTENSIONS')
    expect(src.match(PROSE_LIST), 'no copy literal re-spells the extension list').toBeNull()
  })

  it('the extension array has exactly ONE initializer on the tree (the F1 home)', () => {
    // walk every package src tree (tests excluded — the walls pin the
    // universe verbatim by design); the initializer shape is the F1
    // wall's own pattern.
    const literal = /\[\s*['"]\.(?:safetensors|ckpt)['"][^\]]*\]/g
    const hits: Array<{ rel: string, count: number }> = []
    const walkSrc = (dir: string): void => {
      for (const e of readdirSync(dir)) {
        if (e === 'node_modules') continue // vendored seats carry no SSOT initializer
        const p = join(dir, e)
        let isDir = false
        try { isDir = statSync(p).isDirectory() } catch { continue /* dangling link */ }
        if (isDir) { walkSrc(p); continue }
        if (!e.endsWith('.ts') && !e.endsWith('.tsx')) continue
        const n = (readFileSync(p, 'utf8').match(literal) ?? []).length
        if (n > 0) hits.push({ rel: p.slice(ROOT.length + 1), count: n })
      }
    }
    const walkPkgs = (base: string): void => {
      for (const e of readdirSync(base)) {
        const srcDir = join(base, e, 'src')
        try { readdirSync(srcDir); } catch { continue /* no src tree here */ }
        walkSrc(srcDir)
      }
    }
    walkPkgs(join(ROOT, 'packages/models'))
    walkPkgs(join(ROOT, 'packages/engines'))
    walkPkgs(join(ROOT, 'packages/web'))
    walkPkgs(join(ROOT, 'packages/web-kit'))
    expect(hits, 'one initializer only: packages/web-kit/contracts/src/loraExtensions.ts')
      .toEqual([{ rel: join('packages', 'web-kit', 'contracts', 'src', 'loraExtensions.ts'), count: 1 }])
  })
})
