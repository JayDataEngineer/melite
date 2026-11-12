// client-index.spec — THE SHARE DOOR'S REGISTRATIONS (operator
// 2026-11-12: reuse the harness present toolcall; extend it for
// video and audio): apply() lands exactly two documentPreviews
// definitions (video + audio) derived from @melite/contracts
// mediaVocab — never a private extension list — and two keyed bodies
// under 'sidebar.right.tab.document' at the SAME ids. Every
// registration rides ctx.effect (the disposer law); a failing site
// logs loud and never kills its sibling (the shell law).
//
// Fake client ctx (effect + slots + documentPreviews recorder); the
// real React bodies render in mediaDocument.spec.tsx.
import { expect, it, vi } from 'vitest'

import {
  apply,
  AUDIO_PREVIEW_ID,
  audioPreviewDefinition,
  VIDEO_PREVIEW_ID,
  videoPreviewDefinition,
} from '../src/client/index.ts'
import { mediaVocab } from '@melite/contracts/mediaKinds'

interface RecordedDefinition {
  id: string
  extensions: readonly string[]
  binaryExtensions?: readonly string[]
  priority?: 'builtin' | 'extension'
  title: () => string
  loading: 'text-pages' | 'bytes-complete' | 'renderer'
}

const fakeCtx = (): {
  ctx: Record<string, unknown>
  definitions: RecordedDefinition[]
  bodies: Array<{ name: string; key: string; component: unknown }>
} => {
  const definitions: RecordedDefinition[] = []
  const bodies: Array<{ name: string; key: string; component: unknown }> = []
  return {
    definitions,
    bodies,
    ctx: {
      effect: (fn: () => unknown): unknown => fn(),
      documentPreviews: {
        register: (definition: RecordedDefinition): (() => void) => {
          definitions.push(definition)
          return () => {}
        },
      },
      slots: {
        inject: (_key: string, callback: () => unknown): unknown => callback(),
        register: (options: { name: string; key: string }, component: unknown): (() => void) => {
          bodies.push({ name: options.name, key: options.key, component })
          return () => {}
        },
      },
    },
  }
}

it('registers the video renderer over mediaVocab\'s video set, binary-whole, bytes-complete, extension band', () => {
  const def = videoPreviewDefinition()
  expect(def.id).toBe('melite.preview.video')
  expect(def.extensions).toEqual(mediaVocab().video)
  expect(def.binaryExtensions).toEqual(mediaVocab().video)
  expect(def.priority).toBe('extension')
  expect(def.loading).toBe('bytes-complete')
})

it('registers the audio renderer over mediaVocab\'s audio set — qvoice included (the embedding face needs the seat)', () => {
  const def = audioPreviewDefinition()
  expect(def.id).toBe('melite.preview.audio')
  expect(def.extensions).toEqual(mediaVocab().audio)
  expect(def.extensions).toContain('qvoice')
  expect(def.binaryExtensions).toEqual(mediaVocab().audio)
  expect(def.priority).toBe('extension')
  expect(def.loading).toBe('bytes-complete')
})

it('apply lands both definitions and both keyed bodies at the same ids', () => {
  const { ctx, definitions, bodies } = fakeCtx()
  apply(ctx as never)
  expect(definitions.map((d) => d.id).sort()).toEqual(['melite.preview.audio', 'melite.preview.video'])
  expect(bodies).toEqual([
    { name: 'sidebar.right.tab.document', key: VIDEO_PREVIEW_ID, component: expect.anything() },
    { name: 'sidebar.right.tab.document', key: AUDIO_PREVIEW_ID, component: expect.anything() },
  ])
})

it('a failing registration site logs loud and its sibling still lands (the shell law)', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const definitions: RecordedDefinition[] = []
    const bodies: Array<{ name: string; key: string }> = []
    const ctx = {
      effect: (fn: () => unknown): unknown => fn(),
      documentPreviews: {
        register: (definition: RecordedDefinition): (() => void) => {
          // the video registration collides (a duplicate live id, the
          // registry's own throw); the audio arm must survive it
          if (definition.id === 'melite.preview.video') throw new Error('duplicate live implementation name')
          definitions.push(definition)
          return () => {}
        },
      },
      slots: {
        inject: (_key: string, callback: () => unknown): unknown => callback(),
        register: (options: { name: string; key: string }): (() => void) => {
          bodies.push({ name: options.name, key: options.key })
          return () => {}
        },
      },
    }
    apply(ctx as never)
    expect(definitions.map((d) => d.id)).toEqual(['melite.preview.audio'])
    expect(bodies.map((b) => b.key)).toEqual([VIDEO_PREVIEW_ID, AUDIO_PREVIEW_ID])
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain('video renderer registration failed')
  } finally {
    errorSpy.mockRestore()
  }
})

it('EVERY registration site isolates its own failure — a throw at each seat logs once and the rest still land', () => {
  const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  try {
    const sites = ['video-def', 'video-body', 'audio-def', 'audio-body']
    for (const failing of sites) {
      errorSpy.mockClear()
      const definitions: RecordedDefinition[] = []
      const bodies: Array<{ name: string; key: string }> = []
      const ctx = {
        effect: (fn: () => unknown): unknown => fn(),
        documentPreviews: {
          register: (definition: RecordedDefinition): (() => void) => {
            if (failing === 'video-def' && definition.id === 'melite.preview.video') throw new Error('collision')
            if (failing === 'audio-def' && definition.id === 'melite.preview.audio') throw new Error('collision')
            definitions.push(definition)
            return () => {}
          },
        },
        slots: {
          inject: (_key: string, callback: () => unknown): unknown => callback(),
          register: (options: { name: string; key: string }): (() => void) => {
            if (failing === `${options.key === VIDEO_PREVIEW_ID ? 'video' : 'audio'}-body`) throw new Error('slot collision')
            bodies.push({ name: options.name, key: options.key })
            return () => {}
          },
        },
      }
      apply(ctx as never)
      expect(errorSpy, `${failing} logs its own site once`).toHaveBeenCalledTimes(1)
      // the site that did not fail still lands: a definition site
      // failure leaves BOTH bodies (their seats are separate); a
      // body site failure leaves BOTH definitions
      if (failing === 'video-def') {
        expect(definitions.map((d) => d.id)).toEqual(['melite.preview.audio'])
        expect(bodies.map((b) => b.key)).toEqual([VIDEO_PREVIEW_ID, AUDIO_PREVIEW_ID])
      } else if (failing === 'audio-def') {
        expect(definitions.map((d) => d.id)).toEqual(['melite.preview.video'])
        expect(bodies.map((b) => b.key)).toEqual([VIDEO_PREVIEW_ID, AUDIO_PREVIEW_ID])
      } else if (failing === 'video-body') {
        expect(definitions.map((d) => d.id)).toEqual(['melite.preview.video', 'melite.preview.audio'])
        expect(bodies.map((b) => b.key)).toEqual([AUDIO_PREVIEW_ID])
      } else {
        expect(definitions.map((d) => d.id)).toEqual(['melite.preview.video', 'melite.preview.audio'])
        expect(bodies.map((b) => b.key)).toEqual([VIDEO_PREVIEW_ID])
      }
    }
  } finally {
    errorSpy.mockRestore()
  }
})

it('the renderer titles are the toolbar labels (locale-stable words)', () => {
  expect(videoPreviewDefinition().title()).toBe('Video')
  expect(audioPreviewDefinition().title()).toBe('Audio')
})
