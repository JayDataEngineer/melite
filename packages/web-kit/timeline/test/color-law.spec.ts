/**
 * color-law.spec.ts — THE COLOR LAW WALL (2026-09-13, operator):
 * the timeline substrate and the h3 studio ride the DSH design
 * system. Every color is a --dsw-alias-* token or a color-mix() over
 * one. NO literal palette (hex/rgb/hsl), NO var() fallback args —
 * the shell's tokens ARE the values; a fallback re-opens the bespoke
 * palette through the back door ("renders identically outside a DSH
 * shell" was the degenerate law this wall buries). Font-stack
 * fallbacks are not colors and pass.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'

const here = dirname(fileURLToPath(import.meta.url))

/** The guarded set: the shared timeline substrate (css + tsx) and the
 *  h3 studio skin — every consumer of the bar inherits the law. */
const GUARDED: Array<{ file: string, why: string }> = [
  { file: join(here, '../timeline/timeline.module.css'), why: 'the shared timeline skin' },
  { file: join(here, '../timeline/MotionTimelineBar.tsx'), why: 'the shared timeline component' },
  { file: join(here, '../../../video/h3-timeline/src/ui/studio/studio.module.css'), why: 'the h3 studio skin' },
]

/** Strip comments — the law governs declarations, not prose. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

test('no literal colors anywhere in the guarded set (hex, rgb(), hsl())', () => {
  for (const { file, why } of GUARDED) {
    const src = stripComments(readFileSync(file, 'utf8'))
    const literals = src.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d|hsla?\(\s*\d/g) ?? []
    expect(literals, why + ' — raw palette found: ' + literals.slice(0, 5).join(', ')).toEqual([])
  }
})

test('no color fallback args inside var() (the token IS the value)', () => {
  for (const { file, why } of GUARDED) {
    const src = stripComments(readFileSync(file, 'utf8'))
    // var(--dsw-…, #fff) / var(--dsw-…, rgba(...)) — a color literal as
    // the fallback argument. Font stacks (ui-monospace, …) pass.
    const fallbacks = src.match(/var\(--[\w-]+,\s*(?:#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d|hsla?\(\s*\d|inherit|transparent)\)/g) ?? []
    expect(fallbacks, why + ' — fallback colors found: ' + fallbacks.slice(0, 5).join(', ')).toEqual([])
  }
})

test('the tokens are actually ridden (dsw aliases present, not vacuously clean)', () => {
  for (const { file, why } of GUARDED) {
    const src = readFileSync(file, 'utf8')
    const uses = src.match(/--dsw-alias-[\w-]+/g) ?? []
    expect(uses.length, why + ' — no dsw token uses').toBeGreaterThan(5)
  }
})
