/**
 * THE DUPLICATE-SERVICE VERDICT (nativity audit 2026-11-05 D7): the
 * ONE named predicate home for cordis's second-provide throw. The
 * arm fires the REAL cordis verdict through the predicate — a second
 * provide() on a live Context, not a hand-typed message — and refuses
 * the look-alikes (another service's verdict, foreign phrasing,
 * non-Error). Toggle-out proof: gut isDuplicateServiceSeat's body and
 * the first assertion reds; the card-view chatFileMentions seat (the
 * predicate's consumer) loses its already-seated arm with it.
 */
import { Context } from '@deepseek-ai/cordis'
import { describe, expect, test } from 'vitest'
import { isDuplicateServiceSeat } from '../src/estate-remote.ts'

/** Fire cordis's REAL duplicate-service verdict for a name. */
function realDuplicateThrow(service: string): unknown {
  const ctx = new Context()
  ctx.provide(service, () => ({}))
  try {
    ctx.provide(service, () => ({}))
  } catch (error) {
    return error
  }
  throw new Error('cordis did not throw on the second provide — the probe is stale')
}

describe('isDuplicateServiceSeat — the verdict discrimination (D7)', () => {
  test('the REAL cordis second-provide throw reads as the verdict for its own name', () => {
    const thrown = realDuplicateThrow('chatFileMentions')
    expect(thrown).toBeInstanceOf(Error)
    expect(String(thrown)).toContain('has been registered at <')
    expect(isDuplicateServiceSeat(thrown, 'chatFileMentions')).toBe(true)
  })

  test('another service\'s verdict is not this seat\'s (the name is judged)', () => {
    const thrown = realDuplicateThrow('someOtherSeat')
    expect(isDuplicateServiceSeat(thrown, 'chatFileMentions')).toBe(false)
  })

  test('look-alike phrasing, a foreign tail, and non-Errors all refuse', () => {
    expect(isDuplicateServiceSeat(new Error('service "chatFileMentions" got registered over at <x>'), 'chatFileMentions')).toBe(false)
    expect(isDuplicateServiceSeat(new Error('service "chatFileMentions" has been registered at <x'), 'chatFileMentions')).toBe(false)
    expect(isDuplicateServiceSeat(new Error('chatFileMentions already provided'), 'chatFileMentions')).toBe(false)
    expect(isDuplicateServiceSeat(undefined, 'chatFileMentions')).toBe(false)
    expect(isDuplicateServiceSeat('service "chatFileMentions" has been registered at <root>', 'chatFileMentions')).toBe(false)
  })
})
