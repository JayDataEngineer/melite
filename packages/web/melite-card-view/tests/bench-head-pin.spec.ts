import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'

// THE PINNED-HEADER BAND LAW (ERRORS.md additional issue, the media
// flow tab-title gap, 2026-10-19): the bench panel (.cardsBench) is
// the scroll container of a sticky anchored header (.benchHead /
// .runHead, position:sticky top:0). A scroll container that carries
// padding-top puts a band ABOVE its sticky header's pinned rest —
// the header pins at the content-box top, the padding strip never
// paints the header's background, and scrolling content shows
// through the strip: the "massive gap between the tabs along the top
// and the rev title bar" the operator scrolled into. The law: the
// scroll container declares NO padding-top; the anchored header
// carries the spacing INSIDE its own painted box, so the pin is
// flush with the scrollport and the band is dead.

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/client/card.module.css'), 'utf8')

function blockOf(selector: string): string {
  const at = css.indexOf(selector + ' {')
  expect(at, `${selector} exists in card.module.css`).toBeGreaterThanOrEqual(0)
  const end = css.indexOf('}', at)
  return css.slice(at, end)
}

function paddingTopOf(selector: string): string | null {
  const block = blockOf(selector)
  const top = block.match(/padding-top:\s*([^;]+);/)
  if (top !== null) return (top[1] ?? '').trim()
  const short = block.match(/(?:^|\n)  padding:\s*([^;]+);/)
  if (short === null) return null
  const first = (short[1] ?? '').trim().split(/\s+/)[0]
  return first === undefined ? null : first
}

describe('THE PINNED-HEADER BAND LAW', () => {
  test('the bench scroll container declares no padding-top (the band class)', () => {
    const pt = paddingTopOf('.cardsBench')
    expect(pt === null || pt === '0', `.cardsBench padding-top is dead — found: ${String(pt)} — a padded scroll container strands a band above its sticky header`).toBe(true)
  })
  test('the anchored headers carry the top spacing inside their painted box', () => {
    for (const head of ['.benchHead', '.runHead']) {
      const pt = paddingTopOf(head)
      expect(pt !== null && pt !== '0', `${head} carries the top spacing (found: ${String(pt)}) — moved off the scroll container, into the painted pin`).toBe(true)
    }
  })
})
