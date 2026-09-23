// film-memory-warn.spec.ts — F-6(b): the film lane warns at admission.
//
// Tiers: PURE (filmLoadOf matrix + the pressure decision against
// stub memory — no engine) always runs; FETCH proves the stats
// reader against stub fetch arms (low/high/unreachable/malformed).
import { describe, expect, test } from 'vitest'
import { fetchEngineMem, filmLoadOf, filmMemoryWarn, type EngineMem } from '../src/filmMemoryWarn.ts'

const GIB = 1024 ** 3

describe('filmLoadOf (pure)', () => {
  test('a 3-call doc loads windows + frames + geometry', () => {
    expect(filmLoadOf({
      calls: [
        { start_frame: 0, end_frame: 124 },
        { start_frame: 124, end_frame: 243 },
        { start_frame: 243, end_frame: 362 },
      ],
      width: 1344,
      height: 768,
    })).toEqual({ windows: 3, frames: 362, width: 1344, height: 768 })
  })
  test('no calls means no film (single-shot docs never warn)', () => {
    expect(filmLoadOf({ width: 1344 })).toBeNull()
    expect(filmLoadOf({ calls: [] })).toBeNull()
    expect(filmLoadOf({ calls: 'x' })).toBeNull()
  })
  test('misshapen spans skip (validate owns shape — the warn never refuses)', () => {
    expect(filmLoadOf({
      calls: [
        { start_frame: 0, end_frame: 124 },
        { start_frame: 124, end_frame: 100 },
        { start_frame: 'a', end_frame: 200 },
        null,
      ],
    })).toEqual({ windows: 4, frames: 124, width: 0, height: 0 })
  })
  test('nothing computable means nothing to warn about', () => {
    expect(filmLoadOf({ calls: [{ start_frame: 5, end_frame: 5 }] })).toBeNull()
  })
})

describe('filmMemoryWarn (pure)', () => {
  const load = { windows: 3, frames: 362, width: 1344, height: 768 }
  test('pressure below the 20% line warns (the measured failure: 3%)', () => {
    const warn = filmMemoryWarn(load, { vramFree: 0.8 * GIB, vramTotal: 24.5 * GIB })
    expect(warn).toContain('film admission')
    expect(warn).toContain('0.8 of 24.5 GiB free')
    expect(warn).toContain('(3%)')
    expect(warn).toContain('3-window film (362 frames, 1344x768)')
    expect(warn).toContain('restart')
  })
  test('headroom above the line stays quiet (the measured success: 35%)', () => {
    expect(filmMemoryWarn(load, { vramFree: 8.7 * GIB, vramTotal: 24.5 * GIB })).toBeNull()
  })
  test('the line itself is quiet (strictly-below fires)', () => {
    expect(filmMemoryWarn(load, { vramFree: 4.9 * GIB, vramTotal: 24.5 * GIB })).toBeNull()
    expect(filmMemoryWarn(load, { vramFree: 4.89 * GIB, vramTotal: 24.5 * GIB })).not.toBeNull()
  })
  test('telemetry down means no warn (admission never blocks on stats)', () => {
    expect(filmMemoryWarn(load, null)).toBeNull()
  })
  test('degenerate totals never warn (no invented denominator)', () => {
    expect(filmMemoryWarn(load, { vramFree: 1, vramTotal: 0 })).toBeNull()
    expect(filmMemoryWarn(load, { vramFree: -1, vramTotal: 24.5 * GIB })).toBeNull()
  })
  test('unstated geometry names itself', () => {
    const warn = filmMemoryWarn({ windows: 2, frames: 200, width: 0, height: 0 }, { vramFree: 1 * GIB, vramTotal: 24.5 * GIB })
    expect(warn).toContain('unstated geometry')
  })
})

describe('fetchEngineMem (stub fetch)', () => {
  const ok = (devices: unknown) => async () => ({ json: async () => ({ devices }) }) as never
  test('the primary device serves the film', async () => {
    const mem = await fetchEngineMem('http://x', ok([
      { name: 'cuda:0', vram_total: 25 * GIB, vram_free: 1 * GIB },
      { name: 'cuda:1', vram_total: 25 * GIB, vram_free: 20 * GIB },
    ]) as never)
    expect(mem).toEqual({ vramFree: 1 * GIB, vramTotal: 25 * GIB })
  })
  test('any failure reads null (unreachable, empty, malformed)', async () => {
    const throwing = async (): Promise<never> => { throw new Error('down') }
    expect(await fetchEngineMem('http://x', throwing as never)).toBeNull()
    expect(await fetchEngineMem('http://x', ok([]) as never)).toBeNull()
    expect(await fetchEngineMem('http://x', ok([{ vram_free: 'lots' }]) as never)).toBeNull()
  })
  test('a hung engine never hangs admission (the fenced abort)', async () => {
    const hanging = (_url: string, opts: { signal: AbortSignal }) => new Promise<never>((_, reject) => {
      opts.signal.addEventListener('abort', () => reject(new Error('aborted')))
    })
    expect(await fetchEngineMem('http://x', hanging as never, 20)).toBeNull()
  })
})
