// run-rescue-live-alignment.spec.ts — THE LIVE-STATE VOCABULARY
// JUDGED AGAINST THE SERVICE TRUTH (audit F8, 2026-10-20: one stuck
// law, one spelling, both seats; audit F6b: the derived terminal).
//
// THE DERIVATION LAW: the web client no longer carries its own LIVE
// list (the old copy drifted — the overshoot dropped 'active' and
// every landed acquire rode the ceiling into the stuck face at
// 100%). run-rescue-core.ts imports the service's own
// LIVE_ACQUIRE_STATES through the browser-safe contracts subpath
// (@melite/estate-provisioning/contracts — types + literal sets,
// no node runtime) and DERIVES the terminal vocabulary:
// provision states minus {unknown, absent} minus live. A derivation
// nobody judges is a derivation that rots back into a list: this
// wall pins the client's sets to the service truth — same members,
// nothing more, nothing less — and the terminal/settled
// vocabulary's complement law: every service ProvisionState is
// either LIVE or in the client's settled vocabulary, never both,
// never neither.
import { describe, expect, it } from 'vitest'
import { LIVE_ACQUIRE_STATES as SERVICE_LIVE, PROVISION_STATES } from '@melite/estate-provisioning'
import { ACQUIRE_TERMINAL, ACQUIRE_WAITING, LIVE_ACQUIRE_STATES as CLIENT_LIVE, isAcquireSettled } from '../src/client/run-rescue-core.ts'

describe('the live-state copy is pinned to the service truth (one stuck law, both seats)', () => {
  it('the client LIVE_ACQUIRE_STATES copy carries exactly the service members', () => {
    expect([...CLIENT_LIVE].sort()).toEqual([...SERVICE_LIVE].sort())
  })

  it('the waiting word is the service queue state, exactly (the durable download seat, 2026-10-21)', () => {
    expect(ACQUIRE_WAITING).toBe('requested')
    expect(CLIENT_LIVE.has(ACQUIRE_WAITING)).toBe(false)
    expect(ACQUIRE_TERMINAL.has(ACQUIRE_WAITING)).toBe(false)
  })

  it('the terminal vocabulary is DERIVED from the service sets, never listed (audit F6b)', () => {
    // the derivation the core claims: every provision state except
    // the unknowns, the waiting queue word, and the live flights. A
    // hardcoded list that drops a member (the F6b overshoot dropped
    // 'active') reds here.
    const derived = new Set(
      PROVISION_STATES.filter((state) => state !== 'unknown' && state !== 'absent'
        && state !== ACQUIRE_WAITING && !SERVICE_LIVE.has(state)))
    expect([...ACQUIRE_TERMINAL].sort()).toEqual([...derived].sort())
  })

  it('every service ProvisionState is LIVE, WAITING, or settled-vocabulary — never two, never neither', () => {
    for (const state of PROVISION_STATES) {
      const live = CLIENT_LIVE.has(state)
      const settledWord = ACQUIRE_TERMINAL.has(state)
      const waiting = state === ACQUIRE_WAITING
      expect(live && settledWord,
        `"${state}" is spelled both LIVE and settled — one law, one spelling`,
      ).toBe(false)
      expect(waiting && (live || settledWord),
        `"${state}" is spelled waiting AND live/settled — the queue word owns its own law`,
      ).toBe(false)
    }
    // the polled vocabulary partitions: live ∪ waiting ∪ settled
    // covers every service state the acquire ledger can report.
    // 'unknown' and 'absent' are resource-row states, not
    // weight-ledger ones — a poll never answers them, and the
    // loop's default (keep polling anything unrecognized) rides
    // them to the ceiling honestly.
    const polled = new Set([...CLIENT_LIVE, ...ACQUIRE_TERMINAL, ACQUIRE_WAITING])
    for (const state of PROVISION_STATES) {
      if (state === 'unknown' || state === 'absent') continue
      expect(polled.has(state),
        `"${state}" is neither live, waiting, nor settled — a poll answering it has no law`,
      ).toBe(true)
    }
  })

  it('a live state never settles at any byte count; a verdict state settles at any byte count; the waiting row never settles', () => {
    for (const state of CLIENT_LIVE) {
      expect(isAcquireSettled({ operationId: 'op-x', state, bytes: 5_413_698_958, total: 5_413_698_958 }),
        `live "${state}" at 100% must keep polling — the engine owns the verdict`,
      ).toBe(false)
    }
    for (const state of ['failed', 'blocked']) {
      expect(isAcquireSettled({ operationId: 'op-x', state, bytes: 0, total: 5_413_698_958 }),
        `verdict "${state}" settles at any byte count — the engine judged`,
      ).toBe(true)
    }
    expect(isAcquireSettled({ operationId: 'op-x', state: ACQUIRE_WAITING, bytes: 0, total: 0 }),
      'the waiting row settles — the queue has no verdict, the poll keeps watching for the claim',
    ).toBe(false)
  })
})
