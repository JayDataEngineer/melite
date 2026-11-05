// chat-preview.spec.ts — Q3 (operator 2026-11-09), refrozen 2026-11-19:
// the chat shows the finished image/audio/video INLINE, not just the
// bench link.
//
// THE FROZEN LAW (the refresh-flood burn, 2026-11-19: a page refresh
// re-rendered the same settled artifacts in every historical chat
// card, repeating): the in-chat hero renders the PRESS'S OWN settled
// outputs — the preview rows the tool's presentationMeta persisted at
// settle time, one hero per pressed stage that minted a url. Never
// the present-time draft doc (every historical card would stamp the
// whole bench's current heroes under itself, N times over); never a
// live tail. A call that pressed nothing carries no rows and renders
// no strip.
import { describe, expect, it } from 'vitest'
import { chatPreviewsFor } from '../src/client/chat-preview.ts'

const row = (stage: string, url: unknown, status = 'done'): Record<string, unknown> => ({
  stage, url, status,
})

describe('Q3 CHAT PREVIEWS (the press\'s own frozen heroes)', () => {
  it('a pressed stage with a video url previews video', () => {
    const out = chatPreviewsFor([row('s_0', 'https://cdn/x/clip.mp4')])
    expect(out).toEqual([{
      stageId: 's_0',
      kind: 'video',
      artifacts: [{ name: 'clip.mp4', url: 'https://cdn/x/clip.mp4' }],
      runStatus: 'done',
    }])
  })

  it('an image url previews image; an audio url previews audio', () => {
    const out = chatPreviewsFor([
      row('s_img', 'https://cdn/x/pic.png'),
      row('s_snd', 'https://cdn/x/song.mp3'),
    ])
    expect(out.map((p) => p.kind)).toEqual(['image', 'audio'])
  })

  it('mesh/text rows and rows with no url stay out (never a dead hero)', () => {
    expect(chatPreviewsFor([row('s_mesh', 'https://cdn/x/body.glb')])).toEqual([])
    expect(chatPreviewsFor([row('s_text', 'https://cdn/x/note.txt')])).toEqual([])
    expect(chatPreviewsFor([row('s_0', '')])).toEqual([])
    expect(chatPreviewsFor([row('s_0', null)])).toEqual([])
  })

  it('a row without stage identity stays out (no anonymous hero)', () => {
    expect(chatPreviewsFor([{ url: 'https://cdn/x/pic.png' }])).toEqual([])
    expect(chatPreviewsFor([{ stage: '', url: 'https://cdn/x/pic.png' }])).toEqual([])
  })

  it('rows keep their own identity (no cross-stage bleed)', () => {
    const out = chatPreviewsFor([
      row('s_0', 'https://cdn/x/a.mp4'),
      row('s_1', 'https://cdn/x/b.png'),
    ])
    expect(out.map((p) => [p.stageId, p.kind])).toEqual([['s_0', 'video'], ['s_1', 'image']])
  })

  it('an empty row list answers empty (a card that pressed nothing renders no strip)', () => {
    expect(chatPreviewsFor([])).toEqual([])
  })

  it('the status rides verbatim (the hero faces read the press\'s own verdict)', () => {
    const out = chatPreviewsFor([row('s_0', 'https://cdn/x/clip.mp4', 'failed')])
    expect(out[0]?.runStatus).toBe('failed')
  })
})
