// @vitest-environment happy-dom
// chrome.spec.ts — THE CHROME PRIMITIVES (the ONE joiner + the ONE
// file reader): cx joins plain classnames exactly (no merge —
// conflicting utilities never meet here), cn merges via clsx
// (objects/arrays/conditionals), readAsDataURL resolves a Blob's
// data URL and refuses loud when the read fails.
import { expect, test } from 'vitest'

import { cn, cx, parseAssetDrop, readAsDataURL } from '../src/chrome.ts'

test('cx: the plain joiner — truthy parts joined with one space, falsy dropped', () => {
  expect(cx('a', 'b', 'c')).toBe('a b c')
  expect(cx('a', false, 'b', null, 'c', undefined)).toBe('a b c')
  expect(cx()).toBe('')
})

test('cn: the merging joiner — objects, arrays, and conditionals', () => {
  expect(cn('a', 'b')).toBe('a b')
  expect(cn('a', { b: true, c: false })).toBe('a b')
  expect(cn(['a', 'b'], { c: true })).toBe('a b c')
  expect(cn(null, undefined, false, '')).toBe('')
})

test('readAsDataURL: a Blob resolves to its data URL', async () => {
  const url = await readAsDataURL(new Blob(['hello'], { type: 'text/plain' }))
  expect(url.startsWith('data:text/plain')).toBe(true)
  expect(url).toContain('aGVsbG8=')
})

/** A controllable FileReader fake (platform-API double — the estate's
 *  fakes-not-mocks law): real reads go through happy-dom; failures
 *  are undrivable without one. */
function installReaderFake(behavior: 'fail-no-error' | 'fail-with-error'): void {
  const RealReader = globalThis.FileReader
  class FakeReader {
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    result: string | null = null
    error: Error | null = null
    readAsDataURL(_file: Blob): void {
      if (behavior === 'fail-with-error') this.error = new Error('disk refused the read')
      queueMicrotask(() => { this.onerror?.() })
    }
  }
  globalThis.FileReader = FakeReader as unknown as typeof RealReader
}

test('readAsDataURL: a reader failure REFUSES LOUD (never a silent empty string)', async () => {
  const RealReader = globalThis.FileReader
  try {
    installReaderFake('fail-with-error')
    await expect(readAsDataURL(new Blob(['x']))).rejects.toThrow(/disk refused the read/)
  } finally {
    globalThis.FileReader = RealReader
  }
})

test('readAsDataURL: a failure with no reader error still refuses (the backstop Error)', async () => {
  const RealReader = globalThis.FileReader
  try {
    installReaderFake('fail-no-error')
    await expect(readAsDataURL(new Blob(['x']))).rejects.toThrow(/read failed/)
  } finally {
    globalThis.FileReader = RealReader
  }
})

test('parseAssetDrop: only object string fields survive malformed input', () => {
  expect(parseAssetDrop('{"url":"/a.glb","type":"model/gltf-binary"}'))
    .toEqual({ url: '/a.glb', type: 'model/gltf-binary' })
  expect(parseAssetDrop('{"url":"","type":7,"name":"ignored"}')).toEqual({})
  expect(parseAssetDrop('')).toEqual({})
  expect(parseAssetDrop('garbage{')).toEqual({})
  for (const raw of ['null', '[]', '"value"', '7']) {
    expect(parseAssetDrop(raw)).toEqual({})
  }
})
