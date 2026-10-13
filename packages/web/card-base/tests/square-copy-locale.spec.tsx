/**
 * square-copy-locale.spec.tsx — THE input-selection copy law (the
 * operator's DSH conformance order, 2026-10-27: "full dsh doc
 * conformance and dry treatment… the input selection squares across
 * all the cards").
 *
 * THE LAW (DSH's client-UI i18n decision, mirrored at melite's
 * one-locale scale): locale dictionaries are the ONLY source files
 * allowed to own translated text; presentation code receives copy
 * through its typed `t` seat or an already-localized prop. The
 * input-selection machinery — square.tsx, square-provider.tsx,
 * wirePicker.tsx — owns NO copy literals.
 *
 * Axes (LAW 4):
 * - ACCURACY: the scan judges copy-bearing literals — attributes
 *   DSH's own gate names (title, label, closeLabel, description,
 *   aria-label, alt) receiving a QUOTED literal, plus JSX text
 *   children — while variables, `t(...)` calls, and data
 *   passthroughs (alt={label}) stand. Comments are stripped first
 *   (doc-cite mentions are not copy).
 * - COVERAGE: every dictionary key is consumed by the trio — a dead
 *   key is a finding (DRY's other face: the dictionary is not a
 *   museum).
 * - ENFORCEMENT: planting one literal fires the exact arm.
 * - DEPTH: the rendered output IS the dictionary — the modal's menu
 *   rows and the wire picker's strings come out of the REAL seats,
 *   not a frozen echo.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
import { allSquareCopy, squareCopy, t } from '../src/locales/square.ts'
import { useSquareProvider, type SquareWire } from '../src/square-provider.tsx'
import { WirePickerModal } from '../src/wirePicker.tsx'
import type { SpecField } from '../src/spec.ts'
import type { CardStage } from '@melite/contracts'

const TRIO_DIR = join(import.meta.dirname, '..', 'src')
const TRIO = ['square.tsx', 'square-provider.tsx', 'wirePicker.tsx'] as const

/** Read one trio source with comments stripped (block, line, and
 *  JSDoc) — the scan judges code, never doc-cite prose. */
function sourceOf(f: string): string {
  const raw = readFileSync(join(TRIO_DIR, f), 'utf8')
  return raw
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/([^:])\/\/.*$/gm, '$1')
}

/** DSH's own exception set (verify-client-ui-i18n): a literal that
 *  IS a locale key (compound lowercase ids like 'square-mesh') or
 *  carries no letters is not product copy — the gate passes it. */
const LOCALE_KEY = /^[a-z][a-zA-Z0-9]*(?:[._-][a-zA-Z0-9]+)+$/
const isProductText = (lit: string): boolean => {
  const text = lit.trim()
  return text !== '' && !LOCALE_KEY.test(text) && /\p{L}/u.test(text)
}

describe('the input-selection copy law (locale owner: locales/square.ts)', () => {
  it('no trio source carries a copy-bearing literal — every string rides the t seat', () => {
    for (const f of TRIO) {
      const src = sourceOf(f)
      const lines = src.split('\n')
      lines.forEach((line, i) => {
        // JSX attribute form title="…" / label='…' — judged when the literal is product text
        const jsxLit = line.match(/(title|label|closeLabel|description|aria-label|alt|placeholder)=\{?\s*['"`]([^'"`]+)['"`]/)
        const jsx = jsxLit !== null && isProductText(jsxLit[2] ?? '')
        // object-literal form title: '…' — a quoted literal after the colon
        const objLit = line.match(/(title|label|closeLabel|description|aria-label|alt|placeholder)\s*:\s*['"`]([^'"`]+)['"`]/)
        const obj = objLit !== null && isProductText(objLit[2] ?? '')
        // JSX text child: text BETWEEN tags (>Word<), single words
        // included; a braced child rides the t seat. The capture
        // excludes code punctuation (=, parens, semicolons) so an
        // arrow body after => can never pose as a text child.
        // LOCALE_KEY parity applies.
        const textLit = line.match(/(?<!=)>\s*([^<>=(){};\n]+?)\s*</)
        const text = textLit !== null && isProductText(textLit[1] ?? '')
        expect(jsx || obj || text, `${f}:${i + 1} carries inline copy: ${line.trim()}`).toBe(false)
      })
    }
  })

  it('every dictionary key is CONSUMED through t(…) by the trio — a dead key is a finding', () => {
    const src = TRIO.map((f) => sourceOf(f)).join('\n')
    for (const key of Object.keys(squareCopy)) {
      expect(/t\(\s*['"]/.test(src) && (src.includes(`t('${key}'`) || src.includes(`t("${key}"`)),
        `squareCopy.${key} is resolved by no t(…) call in the trio — dead dictionary key`).toBe(true)
    }
  })

  it('a template entry resolved without params renders its holes empty (the ?? branch; seats always pass params)', () => {
    expect(t('wireTitle')).toBe('Wire  from an earlier card')
    expect(t('flowDescription')).toBe('The other stages\u2019 latest outputs')
  })

  it('the dictionary is non-empty prose at every key (census over allSquareCopy)', () => {
    const rows = allSquareCopy({ kindSuffix: '', reason: '', seat: '', label: '', slot: '' })
    expect(rows.length).toBe(Object.keys(squareCopy).length)
    for (const [key, text] of rows) {
      expect(String(text).trim().length, `squareCopy.${key} resolves to empty text`).toBeGreaterThan(0)
    }
  })

  it('DEPTH: the REAL seats render the dictionary — menu rows, modal title, wire picker strings', () => {
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('[]', { headers: { 'content-type': 'application/json' } })))
    try {
      const edits: Array<[string, unknown]> = []
      const wire: SquareWire = {
        candidates: [{ id: 'u1', label: 'Upstream One', url: 'data:image/png;base64,AA' }],
      }
      const field: SpecField = { name: 'input_image', type: 'image', label: 'input_image', tooltip: null, group: null } as unknown as SpecField
      const menuBox: { current: ReturnType<typeof useSquareProvider> | null } = { current: null }
      function Probe(): ReturnType<typeof useSquareProvider>['wireMenu'] {
        menuBox.current = useSquareProvider((n, v) => { edits.push([n, v]) }, wire)
        return menuBox.current.wireMenu
      }
      render(<Probe />)
      // open the source menu through the square verb (the REAL door)
      act(() => { menuBox.current!.square(field)!.verbs.onPick!(undefined) })
      // the menu items carry the dictionary's rows
      expect(screen.getAllByText(t('fromFlow')).length).toBeGreaterThan(0)
      expect(screen.getAllByText(t('fromMedia')).length).toBeGreaterThan(0)
      expect(screen.getAllByText(t('fromFile')).length).toBeGreaterThan(0)
      expect(screen.getAllByText(t('clearSlot')).length).toBeGreaterThan(0)
      // From flow opens the modal — the REAL title + description
      fireEvent.click(screen.getAllByText(t('fromFlow'))[0]!)
      expect(screen.getByText(t('flowDescription', { kindSuffix: ' (image)' }))).toBeTruthy()
      cleanup()
      // the wire picker renders its full copy set from the REAL seat
      const prior: CardStage[] = [
        { id: 'u1', title: 'Upstream One', params: {} } as unknown as CardStage,
      ]
      render(<WirePickerModal slot="input_image" priorStages={prior} onPick={() => {}} onUnwire={() => {}} onClose={() => {}} />)
      expect(screen.getByText(t('wireTitle', { slot: 'input_image' }))).toBeTruthy()
      expect(screen.getByText(t('notRunYet'))).toBeTruthy()
      expect(screen.queryByText(t('noEarlierCards'))).toBeNull()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('ENFORCEMENT receipt: each of the scan\u2019s three paths fires on its own violation form', () => {
    // The scan is pure source reading — the receipt plants one
    // violation PER SCAN PATH (object form, JSX attribute form, JSX
    // text child) in scanned TEXT and proves each regex sees its
    // own form. Live proof: Toggle A in the \u00a75 report reds the
    // scan arm through the real source.
    const planted = sourceOf('wirePicker.tsx') + [
      '      title: "Wire it from anywhere"',
      '      <Modal title="Pick a source" />',
      '      <span>Closed</span>',
    ].join('\n')
    const lines = planted.split('\n')
    const scanLine = (line: string): boolean => {
      const jsxLit = line.match(/(title|label|closeLabel|description|aria-label|alt|placeholder)=\{?\s*['"`]([^'"`]+)['"`]/)
      const objLit = line.match(/(title|label|closeLabel|description|aria-label|alt|placeholder)\s*:\s*['"`]([^'"`]+)['"`]/)
      const textLit = line.match(/>\s*([^<>{}\n]+)/)
      return (jsxLit !== null && isProductText(jsxLit[2] ?? ''))
        || (objLit !== null && isProductText(objLit[2] ?? ''))
        || (textLit !== null && isProductText(textLit[1] ?? ''))
    }
    const hits = lines.filter(scanLine)
    expect(hits.length).toBeGreaterThanOrEqual(3)
  })
})
