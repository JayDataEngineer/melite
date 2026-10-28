import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/** THE VIDEO HERO FIT LAW (operator 2026-11-12: the zoom-card video
 *  "not shrink-to-fit" — a portrait film resolved to intrinsic
 *  height inside the shell's auto-height preview cell and overflowed
 *  the card). The truth home is the css rule block itself; this wall
 *  judges the REAL rule text (comments stripped) and the render-side
 *  class binding — never a frozen copy. */
const HERE = dirname(fileURLToPath(import.meta.url))
const CSS_PATH = resolve(HERE, '../src/preview.module.css')
const TSX_PATH = resolve(HERE, '../src/preview.tsx')

function heroBlock(): string {
  const bare = readFileSync(CSS_PATH, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  const m = bare.match(/\.hero\s*\{[^}]*\}/)
  if (m === null) throw new Error('the .hero rule block is gone from preview.module.css')
  return m[0]
}

describe('THE VIDEO HERO FIT LAW (2026-11-12 zoom burn)', () => {
  it('the hero caps at 46vh on its own aspect — the flex-fill law reds', () => {
    const block = heroBlock()
    expect(block, 'the 46vh cap (the heroImg law, mirrored)').toContain('height: 46vh')
    expect(block, 'width auto — the element sizes by its own aspect, never a painted full-width box').toContain('width: auto')
    expect(block, 'the horizontal clamp — a wide film never overflows the column').toContain('max-width: 100%')
    expect(block, 'contain — the clamped box letterboxes, never crops').toContain('object-fit: contain')
    expect(block, 'centered — no dead left seat beside a portrait film').toContain('margin: 0 auto')
    expect(block, 'flex 0 0 auto — the hero never GROWS the auto-height cell (the scroll-seat disease)').toContain('flex: 0 0 auto')
  })

  it('the video hero binds the class — a law the element never rides reds', () => {
    const tsx = readFileSync(TSX_PATH, 'utf8')
    const seat = tsx.match(/h\('video', \{\s*className: s\.hero,[^}]*\}/)
    if (seat === null) throw new Error('the video hero no longer binds s.hero')
    expect(seat[0], 'the hero keeps its controls — a film is watched, not framed').toContain('controls: true')
  })
})
