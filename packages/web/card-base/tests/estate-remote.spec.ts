/**
 * estate-remote.spec.ts — THE UNWRAP LAW + THE CAS DISCRIMINATOR
 * (estate-remote.ts unit arms): unwrapRemote resolves the value on
 * ok and throws EstateRefusedError carrying the estate's message
 * VERBATIM; a failure without message text falls back to the voice
 * (never an empty toast); code/details ride only when the failure
 * carries them (arrays never ride); a malformed failure still
 * refuses LOUD, never a TypeError. isCasConflict matches the ONE
 * stable code — never instanceof alone, never message text (the
 * two dead-matcher incidents, 2026-09-15 and 2026-10-09).
 */
import { expect, test } from 'vitest'
import { RemoteError, type RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import {
  CAS_CONFLICT_CODE,
  EstateRefusedError,
  isCasConflict,
  unwrapRemote,
} from '../src/estate-remote.ts'

/** Await the refusal (the error branch must throw — resolving is the defect). */
async function refused(result: RemoteResult<unknown>, voice: string): Promise<unknown> {
  try {
    await unwrapRemote(result, voice)
  } catch (e: unknown) {
    return e
  }
  throw new Error('unwrapRemote resolved a refusal — the error branch must throw')
}

test('unwrapRemote resolves the value on ok — direct and promised', async () => {
  // THE PROMISE SEAM: call sites hand the namespace promise directly
  await expect(unwrapRemote({ ok: true, value: 42 }, 'bench/get')).resolves.toBe(42)
  await expect(unwrapRemote(Promise.resolve({ ok: true, value: 'v' }), 'drafts/get')).resolves.toBe('v')
})

test('unwrapRemote throws the estate message VERBATIM with code + details', async () => {
  const err = await refused(
    { ok: false, error: new RemoteError('gateway/bad-request', 'door says no', {}) },
    'media/list',
  )
  // the client never paraphrases a refusal (the door's own law)
  expect(err).toBeInstanceOf(EstateRefusedError)
  const refusal = err as EstateRefusedError
  expect(refusal.name).toBe('EstateRefusedError')
  expect(refusal.message).toBe('door says no')
  expect(refusal.code).toBe('gateway/bad-request')
  expect(refusal.details).toEqual({})
})

test('an empty-message refusal still speaks — the voice fallback, code kept', async () => {
  const err = await refused(
    { ok: false, error: new RemoteError('gateway/bad-request', '', {}) },
    'media/list',
  ) as EstateRefusedError
  // an empty toast names nothing: the voice speaks the seat
  expect(err.message).toBe('media/list: refused')
  expect(err.code).toBe('gateway/bad-request')
})

test('a code-less failure refuses with undefined code + details, message verbatim', async () => {
  const err = await refused(
    { ok: false, error: { message: 'stale write' } } as unknown as RemoteResult<unknown>,
    'bench/ensure',
  ) as EstateRefusedError
  expect(err).toBeInstanceOf(EstateRefusedError)
  expect(err.message).toBe('stale write')
  expect(err.code).toBeUndefined()
  expect(err.details).toBeUndefined()
})

test('array details never ride (the wire-chain envelope law)', async () => {
  const err = await refused(
    { ok: false, error: { message: 'm', code: 'c', details: ['x'] } } as unknown as RemoteResult<unknown>,
    'runs/status',
  ) as EstateRefusedError
  expect(err.message).toBe('m')
  expect(err.code).toBe('c')
  expect(err.details).toBeUndefined()
})

test('a malformed failure still refuses LOUD — never a TypeError', async () => {
  const err = await refused(
    { ok: false, error: null } as unknown as RemoteResult<unknown>,
    'runs/status',
  ) as EstateRefusedError
  expect(err).toBeInstanceOf(EstateRefusedError)
  expect(err.message).toBe('runs/status: refused')
  expect(err.code).toBeUndefined()
  expect(err.details).toBeUndefined()
})

test('EstateRefusedError carries code + details; absent details stay absent', () => {
  const full = new EstateRefusedError('nope', 'some/code', { lane: 'x' })
  expect(full.name).toBe('EstateRefusedError')
  expect(full.message).toBe('nope')
  expect(full.code).toBe('some/code')
  expect(full.details).toEqual({ lane: 'x' })
  const bare = new EstateRefusedError('nope')
  expect(bare.code).toBeUndefined()
  expect(bare.details).toBeUndefined()
})

test('isCasConflict matches the ONE stable code — never message text', () => {
  // the live CAS phrasings ride any message; only the code speaks
  expect(isCasConflict(new EstateRefusedError('bench moved under the patch', CAS_CONFLICT_CODE))).toBe(true)
  // a CAS-sounding MESSAGE under another code is not a CAS verdict
  // (the substring-law incidents: each new door phrasing slipped
  // past the arms and the rebase went dead in production)
  expect(isCasConflict(new EstateRefusedError('bench/cas-conflict happened', 'admission/locked'))).toBe(false)
  expect(isCasConflict(new EstateRefusedError('nope', 'other/code'))).toBe(false)
  expect(isCasConflict(new EstateRefusedError('nope'))).toBe(false)
  expect(isCasConflict(new Error('bench/cas-conflict'))).toBe(false)
  expect(isCasConflict(null)).toBe(false)
  expect(isCasConflict(undefined)).toBe(false)
})
