/**
 * MEDIA SHARE DOOR (operator 2026-11-12, verbatim: "Look up in dsh,
 * this already exists for images. The agent can already make a
 * toolcall to show images in the chat window via explicit tool call.
 * We just need to use this, and extend it for video and audio.").
 *
 * THE LAW: in-thread media sharing rides the HARNESS `present`
 * toolcall — DSH's own delivery declaration (delivery cards + the
 * right-sidebar document seat). Melite mints NO share verb (the
 * share-verb design died with this ruling; a melite_* share tool in
 * the estate's roster reds the NO-VERB arm); melite's seat is the
 * RENDERER EXTENSION: @melite/media-preview registers the estate's
 * video and audio vocabularies (derived from @melite/contracts
 * mediaVocab — never a private list) into ctx.documentPreviews with
 * keyed bodies under the same ids, so a presented .mp4/.wav previews
 * where a presented .png already does instead of hitting the
 * unsupported-preview dead end. The qvoice no-play-button law rides
 * the audio body (embeddings, not PCM).
 *
 * THE ARMS (LAW 4 — each invariant its own firing arm, real doors):
 *   REGISTRATION  — the real client apply lands both definitions and
 *                   both keyed bodies; toggle = gut apply → reds.
 *   VOCAB-DERIVED — extensions ARE mediaVocab's sets (a private list
 *                   that drops an extension reds).
 *   PLAYER        — the real bodies static-render native controls
 *                   elements from bytes; toggle = unmount the
 *                   element → reds.
 *   QVOICE        — a qvoice name renders ZERO audio elements (the
 *                   no-play-button law); toggle the body's
 *                   isPlayableAudioName gate → reds.
 *   NO-VERB       — the melite-tools tool sources declare no
 *                   share/present verb (the harness tool owns the
 *                   door), and the run voice points at the harness
 *                   present toolcall on both host-path arms.
 *
 * React rides the media-preview package's own linked instance via
 * createRequire (the walls lane carries no root react; Node ESM
 * refuses the directory import) — react ships one CJS file, so the
 * bodies' own imports and this require land the same instance.
 */
import { describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
// CJS require through the package's own tree (Node ESM refuses bare
// directory imports and the walls lane carries no root react): the
// resolved files are the SAME instance the bodies' imports reach —
// react ships one CJS file, one require cache.
const packageRequire = createRequire(import.meta.url)
const { createElement } = packageRequire('../../../../packages/web/media-preview/node_modules/react') as typeof import('react')
const { renderToStaticMarkup } = packageRequire('../../../../packages/web/media-preview/node_modules/react-dom/server') as typeof import('react-dom/server')
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { apply, audioPreviewDefinition, videoPreviewDefinition } from '@melite/media-preview/client'
import { AudioDocumentBody, VideoDocumentBody } from '@melite/media-preview/client'
import { mediaVocab } from '@melite/contracts/mediaKinds'

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..')
const TOOLS_DIR = join(ROOT, 'packages/harness/melite-tools/src/tools')

/** The fake client ctx (effect + slots + the registry recorder). */
const fakeCtx = (): { ctx: Record<string, unknown>; definitions: Array<Record<string, unknown>>; bodies: Array<{ name: string; key: string }> } => {
  const definitions: Array<Record<string, unknown>> = []
  const bodies: Array<{ name: string; key: string }> = []
  return {
    definitions,
    bodies,
    ctx: {
      effect: (fn: () => unknown): unknown => fn(),
      documentPreviews: {
        register: (definition: Record<string, unknown>): (() => void) => {
          definitions.push(definition)
          return () => {}
        },
      },
      slots: {
        inject: (_key: string, callback: () => unknown): unknown => callback(),
        register: (options: { name: string; key: string }, _component: unknown): (() => void) => {
          bodies.push({ name: options.name, key: options.key })
          return () => {}
        },
      },
    },
  }
}

/** The slot owner face for one previewed file (PropsRuntime spreads
 * these on the body props). */
const ownerFor = (leaf: string): Parameters<typeof VideoDocumentBody>[0] =>
  ({
    resourceAddress: `dsh-file://session/s_1/runs/r_1/${encodeURIComponent(leaf).replace(/%3A/gi, ':')}`,
    content: { kind: 'bytes', data: new Uint8Array([1, 2, 3, 4]) },
    wrap: false,
    scrollportRef: () => {},
    addResource: () => {},
    setResources: () => {},
  }) as unknown as Parameters<typeof VideoDocumentBody>[0]

describe('REGISTRATION — apply lands both definitions and both keyed bodies at the same ids', () => {
  it('the real client apply registers exactly the two documentPreviews rows and the two sidebar.right.tab.document bodies', () => {
    const { ctx, definitions, bodies } = fakeCtx()
    apply(ctx as never)
    expect(definitions.map((d) => d['id']).sort()).toEqual(['melite.preview.audio', 'melite.preview.video'])
    expect(bodies).toEqual([
      { name: 'sidebar.right.tab.document', key: 'melite.preview.video' },
      { name: 'sidebar.right.tab.document', key: 'melite.preview.audio' },
    ])
    for (const definition of definitions) {
      expect(definition['priority']).toBe('extension')
      expect(definition['loading']).toBe('bytes-complete')
      expect(definition['binaryExtensions']).toEqual(definition['extensions'])
    }
  })

  it('every registration rides ctx.effect (the disposer law)', () => {
    const effects: Array<() => unknown> = []
    const ctx = {
      effect: (fn: () => unknown): unknown => {
        effects.push(fn)
        return () => {}
      },
      documentPreviews: { register: (): (() => void) => () => {} },
      slots: {
        inject: (_key: string, callback: () => unknown): unknown => callback(),
        register: (): (() => void) => () => {},
      },
    }
    apply(ctx as never)
    expect(effects.length).toBe(4)
  })
})

describe('VOCAB-DERIVED — the extension sets ARE mediaVocab\'s, never a private list', () => {
  it('the video definition covers exactly the estate video vocabulary', () => {
    expect(videoPreviewDefinition().extensions).toEqual(mediaVocab().video)
  })
  it('the audio definition covers exactly the estate audio vocabulary (qvoice included)', () => {
    expect(audioPreviewDefinition().extensions).toEqual(mediaVocab().audio)
    expect(audioPreviewDefinition().extensions).toContain('qvoice')
  })
})

describe('PLAYER — the real bodies mount native controls players from the seat\'s bytes', () => {
  it('the video body static-renders a controls video element', () => {
    const markup = renderToStaticMarkup(createElement(VideoDocumentBody, ownerFor('film.mp4')))
    expect(markup).toContain('<video')
    expect(markup).toContain('controls')
    expect(markup).toContain('src=')
  })
  it('the audio body static-renders a controls audio element for a playable name', () => {
    const markup = renderToStaticMarkup(createElement(AudioDocumentBody, ownerFor('voice.flac')))
    expect(markup).toContain('<audio')
    expect(markup).toContain('controls')
  })
})

describe('QVOICE — a .qvoice preview carries NO player (the no-play-button law)', () => {
  it('the audio body renders zero audio elements for a qvoice name, naming the embedding face', () => {
    const markup = renderToStaticMarkup(createElement(AudioDocumentBody, ownerFor('narrator.qvoice')))
    expect(markup).not.toContain('<audio')
    expect(markup).toContain('qvoice')
  })
})

describe('NO-VERB — the harness present tool owns the door; melite mints no share verb', () => {
  it('no melite tool source declares a share/present verb', () => {
    for (const name of ['melite-flow.ts', 'melite-discover.ts', 'melite-load.ts', 'melite-construct.ts', 'melite-read.ts', 'melite-view.ts', 'run-status.ts', 'comfy-manage.ts']) {
      const text = readFileSync(join(TOOLS_DIR, name), 'utf8')
      expect(text, `${name} declares no melite share/present verb`).not.toMatch(/name:\s*['"]melite_(share|present)/)
    }
  })
  it('the run voice points at the HARNESS door on both host-path arms', () => {
    expect(readFileSync(join(TOOLS_DIR, 'melite-flow.ts'), 'utf8')).toContain('the harness present toolcall')
    expect(readFileSync(join(TOOLS_DIR, 'run-status.ts'), 'utf8')).toContain('the harness present toolcall')
  })
})

describe('SEAT — the renderer rows ride the composed seat (the root patch)', () => {
  it('the root cordis patch carries the media-preview row with the web-surface disable', () => {
    const patch = readFileSync(join(ROOT, 'cordis.patch.yml'), 'utf8')
    const at = patch.indexOf('id: media-preview')
    expect(at, 'root patch carries the media-preview row').toBeGreaterThan(0)
    expect(patch.slice(at, at + 260)).toContain('startedBundles')
  })
})
