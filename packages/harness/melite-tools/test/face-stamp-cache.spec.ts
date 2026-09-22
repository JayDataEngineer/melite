// face-stamp-cache.spec.ts — F-7: the stamp resolves once per process.
//
// Own file: the module caches in its registry and vitest isolates
// registries per file, so this arm can burn the cache with fakes
// without touching the live-shape arm.
import { describe, expect, test } from 'vitest'
import { faceStamp } from '../src/faceStamp.ts'

describe('faceStamp cache', () => {
  test('the second call rides the first value (a redeploy is a new process)', () => {
    const fake = (hash: string) => (args: string[]) => (args[0] === 'rev-parse' ? hash : '')
    const first = faceStamp('/repo-a', fake('aaaaaaa'))
    const second = faceStamp('/repo-b', fake('bbbbbbb'))
    expect(first).toBe('aaaaaaa')
    expect(second).toBe('aaaaaaa')
  })
})
