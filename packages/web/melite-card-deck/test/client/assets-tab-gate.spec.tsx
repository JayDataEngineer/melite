// assets-tab-gate.spec.tsx — THE OPERATOR-GATE WALL (2026-10-22, the
// auto-mode cure): the lane's auto_provision posture lets agent
// sessions — which cannot answer a window.confirm dialog — run the
// two DECLARED arms without the prompt. The wall holds the law the
// row names: only the declared arms open in auto mode; the raw-URL
// arms stay operator-gated FOREVER (an unvetted source never rides
// the auto lane, in any posture), and the lifecycle arms keep the
// prompt too (they stop or restart a shared server). The rejection
// path is the operator posture itself: with auto_provision false,
// every arm confirms.
import { describe, expect, test } from 'vitest'
import { confirmNeeded } from '../../src/client/assets-tab'

describe('the manage arm operator gate (confirmNeeded)', () => {
  test('the declared arms open without the prompt in auto mode', () => {
    expect(confirmNeeded('provision_model', true)).toBe(false)
    expect(confirmNeeded('install_extension', true)).toBe(false)
  })

  test('THE FOREVER-GATE: a raw-URL arm confirms even in auto mode', () => {
    expect(confirmNeeded('install_extension_url', true)).toBe(true)
    expect(confirmNeeded('download_model', true)).toBe(true)
  })

  test('the lifecycle arms confirm even in auto mode', () => {
    for (const action of ['launch', 'restart', 'stop', 'snapshot_save', 'snapshot_restore', 'free']) {
      expect(confirmNeeded(action, true)).toBe(true)
    }
  })

  test('THE REJECTION PATH: the operator posture confirms every arm', () => {
    for (const action of ['provision_model', 'install_extension', 'install_extension_url', 'download_model', 'restart']) {
      expect(confirmNeeded(action, false)).toBe(true)
    }
  })
})
