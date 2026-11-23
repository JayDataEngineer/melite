import { describe, expect, it } from 'vitest'
import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { InputSquare, estateInputUrl } from '../src/square.tsx'

/** THE PERSISTED-UPLOAD MIRROR WALL (2026-10-13, LAW 4). The law: a
 *  param that persists an estate upload ('data/input/x.png' — the
 *  uploads door's own param currency) renders its thumbnail from the
 *  assets door (/v1/assets/inputs/<name>) — never a blank face after
 *  close/reopen killed the in-memory blob mirror. The operator's live
 *  burn: "works perfect until I close the card and re-open." */
describe('estate input display mirror', () => {
  it('resolves an estate input path to the assets door URL', () => {
    expect(estateInputUrl('data/input/x.png')).toBe('/v1/assets/inputs/x.png')
  })

  it('heals the agent-landed host spelling of the same uploads leaf (the 2026-11-22 burn)', () => {
    // THE ABSOLUTE-TAIL ARM: the agent's construct lands '/home/…/data/input/x.png'
    // (the host spelling of the uploads leaf) — the same bytes the
    // assets door serves. Without this arm the square painted the
    // held face (the raw path as text) instead of the thumb.
    expect(estateInputUrl('/home/user/estate/data/input/x.png')).toBe('/v1/assets/inputs/x.png')
    expect(estateInputUrl('/mnt/data/input/a.jpeg')).toBe('/v1/assets/inputs/a.jpeg')
    expect(estateInputUrl('data/input/../x.png')).toBeNull()
    expect(estateInputUrl('/srv/data/input/sub/x.png')).toBeNull()
    expect(estateInputUrl('/mnt/data/a.png')).toBeNull()
  })

  it('percent-encodes the leaf name, never the path grammar', () => {
    expect(estateInputUrl('data/input/my file (1).webp'))
      .toBe('/v1/assets/inputs/my%20file%20(1).webp')
  })

  it('refuses non-image leaves and foreign trees', () => {
    expect(estateInputUrl('data/input/x.txt')).toBeNull()
    expect(estateInputUrl('runs/foo/x.png')).toBeNull()
    expect(estateInputUrl('data/input/nested/x.png')).toBeNull()
  })

  it('renders an <img> from the assets door for a persisted estate upload', () => {
    const markup = renderToStaticMarkup(
      h(InputSquare, { label: 's', value: 'data/input/x.png' }),
    )
    expect(markup.includes('src="/v1/assets/inputs/x.png"')).toBe(true)
    expect(markup.includes('data-slot-square')).toBe(true)
  })

  it('still renders data:, blob:, and http(s) faces verbatim', () => {
    const data = renderToStaticMarkup(
      h(InputSquare, { label: 's', value: 'data:image/png;base64,AAAA' }),
    )
    expect(data.includes('src="data:image/png;base64,AAAA"')).toBe(true)
    const http = renderToStaticMarkup(
      h(InputSquare, { label: 's', value: 'https://x.test/a.png' }),
    )
    expect(http.includes('src="https://x.test/a.png"')).toBe(true)
  })
})
