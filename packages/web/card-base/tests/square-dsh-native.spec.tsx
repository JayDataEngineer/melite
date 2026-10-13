// @vitest-environment happy-dom
/**
 * square-dsh-native.spec.tsx — THE DSH-NATIVE WALL (the operator's
 * bar, 2026-11-04: "we aren't 'DSH lawful', we are ALWAYS 'DSH
 * native' — proven with TESTS"). Conformance is not an argument in a
 * ledger; it is a fact this wall can lose. The input-square estate
 * (square.tsx, square-provider.tsx, wirePicker.tsx) claims DSH
 * nativeness on four facts, each with its own firing arm:
 *
 * 1. THE GLYPH IS THE PRIMITIVE'S OWN (runtime): the empty square's
 *    PLUS is IconPlusOutlineRegular from
 *    @deepseek-ai/dsh-client-ui-primitives — the wall renders the
 *    primitive directly and the square, and proves the svg artwork
 *    is byte-equal (viewBox + every path) — a hand-rolled glyph, a
 *    lucide import, or a copied path fails it.
 * 2. THE CHROME IS THE PACKAGE'S (source): Menu/Modal (and every
 *    other interactive primitive the trio renders) import from the
 *    DSH package specifier — a hand-rolled menu/modal in the trio is
 *    the degenerate form the scan refuses.
 * 3. THE STYLING IS MODULE CSS (source): square.tsx resolves styles
 *    only from './card.module.css' — the web-styling chrome law; and
 *    the held face's rule names theme tokens only (the chip-contrast
 *    law's class of defect: a literal fill is how the blank ✕
 *    returned).
 * 4. NO SECOND SEAT (source): no lucide-react, no cn(), no Tip in
 *    square.tsx — the file's own founding law ("no lucide/cn/tip"),
 *    unenforced until this wall.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render } from '@testing-library/react'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { IconPlusOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { InputSquare } from '../src/square.tsx'

afterEach(() => { cleanup() })

const SRC_DIR = join(import.meta.dirname, '..', 'src')
const TRIO = ['square.tsx', 'square-provider.tsx', 'wirePicker.tsx'] as const
const DSH_SPECIFIER = '@deepseek-ai/dsh-client-ui-primitives'

const sourceOf = (f: string): string => readFileSync(join(SRC_DIR, f), 'utf8')

/** The artwork signature of an svg: its viewBox plus every child
 * path's d — the bytes that identify the glyph, class-independent. */
const signatureOf = (svg: SVGSVGElement): string => {
  const viewBox = svg.getAttribute('viewBox') ?? ''
  const paths = Array.from(svg.querySelectorAll('path'), (p) => p.getAttribute('d') ?? '')
  return JSON.stringify({ viewBox, paths })
}

describe('the input-square estate is DSH NATIVE (facts, not arguments)', () => {
  it('FACT 1 (runtime + source): the empty square renders the DSH primitive\u2019s own PLUS — imported, not imitated', () => {
    const bare = render(h(IconPlusOutlineRegular, {})).container.querySelector('svg')
    expect(bare).not.toBeNull()
    const square = render(h(InputSquare, { label: 'x' })).container.querySelector('svg')
    expect(square).not.toBeNull()
    // runtime: the artwork is byte-equal (viewBox + every path)
    expect(signatureOf(square as SVGSVGElement)).toBe(signatureOf(bare as SVGSVGElement))
    // source twin: the glyph is an IMPORT of the primitive — a
    // byte-copied hand-rolled svg would pass the runtime arm alone,
    // which is imitation, not nativeness
    expect(sourceOf('square.tsx').includes(`import { IconPlusOutlineRegular } from '${DSH_SPECIFIER}'`)).toBe(true)
  })

  it('FACT 2 (source): the trio\u2019s interactive chrome imports the DSH primitives package — Menu/Modal never hand-rolled', () => {
    const provider = sourceOf('square-provider.tsx')
    expect(provider.includes(`from '${DSH_SPECIFIER}'`)).toBe(true)
    // the picker chrome specifically: the DSH Menu and the DSH Modal
    expect(/import\s*\{[^}]*\bMenu\b[^}]*\}\s*from\s*'@deepseek-ai\/dsh-client-ui-primitives'/.test(provider)).toBe(true)
    expect(/import\s*\{[^}]*\bModal\b[^}]*\}\s*from\s*'@deepseek-ai\/dsh-client-ui-primitives'/.test(provider)).toBe(true)
    // no hand-rolled dropdown/modal substrate in the trio (the
    // degenerate form: a <select> or a fixed div posing as a menu)
    for (const f of TRIO) {
      expect(sourceOf(f).includes('<select'), `${f} hand-rolls a select`).toBe(false)
    }
  })

  it('FACT 3 (source): square.tsx styles ONLY through the module CSS; the held face names theme tokens only', () => {
    const src = sourceOf('square.tsx')
    expect(src.includes(`from './card.module.css'`)).toBe(true)
    // no inline style prop on the square's own faces
    expect(src.includes('style:'), 'square.tsx carries an inline style').toBe(false)
    // the held face's rule: theme tokens only — a literal color fill
    // is the chip-contrast law's exact defect class
    const css = readFileSync(join(SRC_DIR, 'card.module.css'), 'utf8')
    const rule = css.slice(css.indexOf('.squareHeld {'), css.indexOf('}', css.indexOf('.squareHeld {')))
    expect(rule.length).toBeGreaterThan(0)
    expect(/#[0-9a-fA-F]{3,8}\b/.test(rule), '.squareHeld carries a literal color').toBe(false)
    expect(rule.includes('var(--dsw-alias-'), '.squareHeld names no theme token').toBe(true)
  })

  it('FACT 4 (source): no second seat — no lucide import, no cn(), no Tip in the one square', () => {
    const src = sourceOf('square.tsx')
    // the import form is the degenerate; the founding header's own
    // prose ("no lucide/cn/tip") is the law's documentation, legal.
    expect(/from\s+['"]lucide/.test(src), 'square.tsx imports lucide').toBe(false)
    expect(/(^|[^a-zA-Z])cn\(/.test(src), 'square.tsx calls cn()').toBe(false)
    expect(/\bTip\b/.test(src), 'square.tsx seats Tip').toBe(false)
  })
})
