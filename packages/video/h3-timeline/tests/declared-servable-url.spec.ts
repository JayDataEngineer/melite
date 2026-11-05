// declared-servable-url.spec.ts — THE SERVABLE DECLARED FACE (the
// operator's broken-images burn, 2026-11-15): the declared chip may
// paint only a src the origin can serve. An absolute host path is
// real, run-stageable transport currency — and no <img> can fetch it;
// the chip painted the browser's broken glyph instead of the held
// face. The resolver is the ONE spelling of that judgment (mirroring
// the card-base square): estate upload path → assets door, run-id host
// path → media route, a served value verbatim, an absolute host path →
// nothing (held face).
import { describe, expect, it } from 'vitest'
import { declaredServableUrl } from '../src/ui/studio/refUtils.ts'

const RUN = 'run-065be7aab4e0-aab00b68'

describe('declaredServableUrl — the chip paints only what the origin can serve', () => {
  it('an ABSOLUTE HOST path resolves to nothing (the burn verbatim)', () => {
    expect(declaredServableUrl('/home/user/test/showcase/titledrops/chibi_sheet_v2.png')).toBeNull()
    expect(declaredServableUrl('/Users/op/Pictures/x.png')).toBeNull()
    expect(declaredServableUrl('/mnt/data/out/x.jpg')).toBeNull()
  })

  it('a RUN-ID host path heals to the media route the same bytes serve from', () => {
    expect(declaredServableUrl(`/home/user/output/runs/${RUN}/output/frame.png`))
      .toBe(`/melite-media/runs/${RUN}/output/frame.png`)
  })

  it('a persisted estate upload renders from the assets door', () => {
    expect(declaredServableUrl('data/input/chibi_sheet_v2.png')).toBe('/v1/assets/inputs/chibi_sheet_v2.png')
  })

  it('served currency rides verbatim (never rewritten)', () => {
    expect(declaredServableUrl('https://u/l1.png')).toBe('https://u/l1.png')
    expect(declaredServableUrl('/estate/a.avif')).toBe('/estate/a.avif')
  })

  it('a non-image value (a clip, a pack name) resolves to nothing — no thumb, no glyph', () => {
    expect(declaredServableUrl('clip.webm')).toBeNull()
    expect(declaredServableUrl('my-lora.safetensors')).toBeNull()
  })
})
