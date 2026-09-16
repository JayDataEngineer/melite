/**
 * decodeRuns/decodeDrafts — the ONE validation site per feed
 * (malformed shapes fall back to empty HERE, never at render):
 *
 *   runs    — keyless rows drop LOUDLY into the errors channel (a run
 *             without a string run_id is undedupeable and unkeyable);
 *             non-array feeds fall back to empty;
 *   drafts  — non-array members fall back to empty, loudly typed.
 */
import { describe, expect, it } from 'vitest'

import { decodeDrafts, decodeRuns } from '../src/client/decode.ts'

describe('decodeRuns — the runs validation site', () => {
  it('passes clean rows through with the errors channel intact', () => {
    const feed = decodeRuns({
      runs: [{ run_id: 'r1', prompt: 'a cube' }],
      errors: [{ gateway: 'g', message: 'm' }],
    })
    expect(feed).toEqual({
      runs: [{ run_id: 'r1', prompt: 'a cube' }],
      errors: [{ gateway: 'g', message: 'm' }],
    })
  })

  it('drops keyless rows loudly (never a partial, never silent)', () => {
    const feed = decodeRuns({
      runs: [{ run_id: 'r1' }, { name: 'no id' }, { run_id: '' }, { run_id: 7 }, null],
      errors: [],
    })
    expect(feed.runs).toEqual([{ run_id: 'r1' }])
    expect(feed.errors).toEqual([
      { gateway: 'runs', message: 'dropped 4 rows without run_id (unkeyable)' },
    ])
  })

  it('non-array feeds fall back to empty (the wire guards the render)', () => {
    expect(decodeRuns(null)).toEqual({ runs: [], errors: [] })
    expect(decodeRuns({})).toEqual({ runs: [], errors: [] })
    expect(decodeRuns({ runs: 'nope', errors: 'nope' })).toEqual({ runs: [], errors: [] })
  })
})

describe('decodeDrafts — the drafts validation site', () => {
  it('passes clean rows through', () => {
    expect(decodeDrafts({ drafts: [{ draft_id: 'd1' }], errors: [] })).toEqual({
      drafts: [{ draft_id: 'd1' }],
      errors: [],
    })
  })

  it('non-array members fall back to empty', () => {
    expect(decodeDrafts(null)).toEqual({ drafts: [], errors: [] })
    expect(decodeDrafts({ drafts: 'nope', errors: 'nope' })).toEqual({ drafts: [], errors: [] })
  })
})
