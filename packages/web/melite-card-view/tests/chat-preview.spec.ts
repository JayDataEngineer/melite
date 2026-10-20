// chat-preview.spec.ts — Q3 (operator 2026-11-09): the chat shows the
// finished image/audio/video INLINE, not just the bench link.
//
// THE FROZEN LAW: the in-chat hero renders the SETTLED stage's own
// artifacts (one hero per stage, harvested off the draft doc the card
// already fetched) — never a live tail. The live progress stays on
// the bench; the thread keeps a replay-safe snapshot.
import { describe, expect, it } from 'vitest'
import { chatPreviewsFor } from '../src/client/chat-preview.ts'

const stage = (id: string, result: unknown, status = 'success'): Record<string, unknown> => ({
  id, status, result,
})

describe('Q3 CHAT PREVIEWS (frozen heroes, one per stage)', () => {
  it('a stage with a video artifact previews video', () => {
    const out = chatPreviewsFor([
      stage('s_0', { artifacts: { output: 'https://cdn/x/clip.mp4' } }),
    ])
    expect(out).toEqual([{
      stageId: 's_0',
      kind: 'video',
      artifacts: [{ name: 'output', url: 'https://cdn/x/clip.mp4' }],
      runStatus: 'success',
    }])
  })

  it('a stage with an image artifact previews image', () => {
    const out = chatPreviewsFor([
      stage('s_0', { url: 'https://cdn/x/pic.png' }),
    ])
    expect(out[0]?.kind).toBe('image')
  })

  it('a stage with an audio artifact previews audio', () => {
    const out = chatPreviewsFor([
      stage('s_0', { artifacts: { track: 'https://cdn/x/song.mp3' } }),
    ])
    expect(out[0]?.kind).toBe('audio')
  })

  it('a stage with no renderable artifacts previews nothing (never a dead hero)', () => {
    expect(chatPreviewsFor([stage('s_0', {})])).toEqual([])
    expect(chatPreviewsFor([stage('s_0', { artifacts: { mesh: 'https://cdn/x/body.glb' } })])).toEqual([])
    expect(chatPreviewsFor([stage('s_0', null)])).toEqual([])
  })

  it('mesh and text stages stay out (the operator named image/audio/video)', () => {
    const out = chatPreviewsFor([
      stage('s_mesh', { artifacts: { out: 'https://cdn/x/body.glb' } }),
      stage('s_text', { artifacts: { out: 'https://cdn/x/note.txt' } }),
    ])
    expect(out).toEqual([])
  })

  it('one hero per stage: the first renderable artifact wins', () => {
    const out = chatPreviewsFor([
      stage('s_0', { artifacts: { a: 'https://cdn/x/pic.png', b: 'https://cdn/x/pic2.png' } }),
    ])
    expect(out).toHaveLength(1)
    expect(out[0]?.artifacts).toHaveLength(1)
  })

  it('stages keep their own identity (no cross-stage bleed)', () => {
    const out = chatPreviewsFor([
      stage('s_0', { artifacts: { o: 'https://cdn/x/a.mp4' } }),
      stage('s_1', { artifacts: { o: 'https://cdn/x/b.png' } }),
    ])
    expect(out.map((p) => [p.stageId, p.kind])).toEqual([['s_0', 'video'], ['s_1', 'image']])
  })
})
