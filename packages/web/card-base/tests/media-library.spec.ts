// media-library.spec.ts — THE RUNS-TREE LIBRARY (media-library.ts):
// kind-filtered media/list rows for the picker's injected source.
// The filter is the honesty law (a row missing either string is not
// a pickable asset — and rows that pass ride intact, never
// reshaped); the non-array arm is the shape guard (a shapeless
// answer is an empty library, never a crash).
import { afterEach, expect, test } from 'vitest'
import { RemoteError } from '@deepseek-ai/dsh-typert-protocol'

import { fetchMediaLibrary } from '../src/media-library.ts'
import { bindEstateRemoteFromRemote, unbindEstateRemote, type EstateNamespaces } from '../src/estate-remote.ts'

afterEach(() => {
  unbindEstateRemote()
})

/** Bind ONLY the media lane (the bench/drafts/runs namespaces ride
 *  the bind law's honest-shape dummies — wire.spec.ts's grammar). */
function bindMediaLane(
  list: (kind: string, signal?: AbortSignal) => Promise<unknown>,
): void {
  bindEstateRemoteFromRemote({
    bench: { list: (): null => null } as unknown as EstateNamespaces['bench'],
    drafts: { get: (): null => null } as unknown as EstateNamespaces['drafts'],
    runs: { list: (): null => null } as unknown as EstateNamespaces['runs'],
    media: { list } as unknown as EstateNamespaces['media'],
  })
}

const mediaValue = (items: unknown): unknown => ({ ok: true, value: { count: 0, items } })

test('THE KIND SOURCE: the kind forwards and url+name rows ride (the filter judges, never reshapes)', async () => {
  let seenKind: string | undefined
  bindMediaLane(async (kind: string) => {
    seenKind = kind
    return mediaValue([
      { url: '/melite-media/runs/r1/a.png', name: 'a.png', kind: 'image', runId: 'r1', served_from: 'root' },
      { url: '/melite-media/runs/r1/b.png', name: 'b.png', kind: 'image', runId: 'r1', served_from: 'root' },
    ])
  })
  // the filter is presence-of-strings, not a reshape: the picker's
  // row (kind, runId, served_from) rides intact to the consumer
  expect(await fetchMediaLibrary('image')).toEqual([
    { url: '/melite-media/runs/r1/a.png', name: 'a.png', kind: 'image', runId: 'r1', served_from: 'root' },
    { url: '/melite-media/runs/r1/b.png', name: 'b.png', kind: 'image', runId: 'r1', served_from: 'root' },
  ])
  expect(seenKind).toBe('image')
})

test('THE SHAPING FILTER: a row missing either string is not a pickable asset', async () => {
  bindMediaLane(async () => mediaValue([
    { url: '/melite-media/runs/r1/a.png', name: 'a.png' },
    { url: '/melite-media/runs/r1/noname.png' },
    { name: 'nourl.png' },
    { url: 7, name: 'numeric-url.png' },
    { url: '/melite-media/runs/r1/numeric-name.png', name: 7 },
    null,
    'a-string-row',
    { url: '', name: '' },
  ]))
  // the empty-string pair passes the typeof filter (the picker's own
  // law — the filter judges type, never content) and rides intact
  expect(await fetchMediaLibrary('image')).toEqual([
    { url: '/melite-media/runs/r1/a.png', name: 'a.png' },
    { url: '', name: '' },
  ])
})

test('THE SHAPELESS ANSWER: a non-list items body is an empty library (never a crash)', async () => {
  for (const items of ['not-a-list', 7, null, undefined, { url: '/x.png' }]) {
    bindMediaLane(async () => mediaValue(items))
    expect(await fetchMediaLibrary('image')).toEqual([])
    unbindEstateRemote()
  }
})

test('THE EMPTY LIBRARY: zero rows is zero picks', async () => {
  bindMediaLane(async () => mediaValue([]))
  expect(await fetchMediaLibrary('mesh')).toEqual([])
})

test('THE SIGNAL: the caller aborts the list read, not a bare socket', async () => {
  let seen: AbortSignal | undefined
  bindMediaLane(async (_kind: string, signal?: AbortSignal) => {
    seen = signal
    return mediaValue([])
  })
  const ctl = new AbortController()
  await fetchMediaLibrary('audio', ctl.signal)
  expect(seen).toBe(ctl.signal)
})

test('THE LOUD REFUSAL: a refusing lane throws the estate verdict (never a silent empty shelf)', async () => {
  bindMediaLane(async () => ({ ok: false, error: new RemoteError('gateway/bad-request', 'media is rebuilding', {}) }))
  await expect(fetchMediaLibrary('image')).rejects.toThrow(/media is rebuilding/)
})
