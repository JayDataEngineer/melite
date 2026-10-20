// run-rescue-live-alignment.spec.ts — THE LIVE-STATE COPY JUDGED
// AGAINST THE SERVICE TRUTH (audit F8, 2026-10-20: one stuck law,
// one spelling, both seats).
//
// THE CLIENT COPY LAW: the web client package cannot import the
// node-side service into its browser bundle, so run-rescue-core.ts
// carries its own LIVE_ACQUIRE_STATES — a copy of
// @melite/estate-provisioning's LIVE_ACQUIRE_STATES (contracts.ts).
// A copy nobody judges is a copy that drifts: the day the service
// adds a live state the client does not know, the client's poll
// loops would treat live flight as settled (the k2/m false-ready,
// born again); the day the service retires one, the client polls a
// settled row into its ceiling (the F6b stuck face). This wall pins
// the copy to the truth — same members, nothing more, nothing less
// — and the terminal/settled vocabulary's complement law: every
// service ProvisionState is either LIVE or in the client's settled
// vocabulary, never both, never neither.
import { describe, expect, it } from 'vitest'
import { LIVE_ACQUIRE_STATES as SERVICE_LIVE, PROVISION_STATES } from '@melite/estate-provisioning'
import { ACQUIRE_TERMINAL, LIVE_ACQUIRE_STATES as CLIENT_LIVE, isAcquireSettled } from '../src/client/run-rescue-core.ts'

describe('the live-state copy is pinned to the service truth (one stuck law, both seats)', () => {
  it('the client LIVE_ACQUIRE_STATES copy carries exactly the service members', () => {
    expect([...CLIENT_LIVE].sort()).toEqual([...SERVICE_LIVE].sort())
  })

  it('every service ProvisionState is LIVE or settled-vocabulary — never both, never neither', () => {
    for (const state of PROVISION_STATES) {
      const live = CLIENT_LIVE.has(state)
      const settledWord = ACQUIRE_TERMINAL.has(state)
      expect(live && settledWord,
        `"${state}" is spelled both LIVE and settled — one law, one spelling`,
      ).toBe(false)
    }
    // the polled vocabulary partitions: live ∪ settled covers every
    // service state the acquire ledger can report. 'unknown' and
    // 'absent' are resource-row states, not weight-ledger ones — a
    // poll never answers them, and the loop's default (keep polling
    // anything unrecognized) rides them to the ceiling honestly.
    const polled = new Set([...CLIENT_LIVE, ...ACQUIRE_TERMINAL])
    for (const state of PROVISION_STATES) {
      if (state === 'unknown' || state === 'absent') continue
      expect(polled.has(state),
        `"${state}" is neither live nor settled — a poll answering it has no law`,
      ).toBe(true)
    }
  })

  it('a live state never settles at any byte count; a verdict state settles at any byte count', () => {
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
  })
})
