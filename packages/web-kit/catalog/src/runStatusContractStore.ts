"use client"

// runStatusContractStore — the native-store half of the run-status contract.
//
// 2026-08-11 directive: "make declarative contracts in the Zustand and
// pydantic so it's impossible to fail this". pollFlowRun reports the
// status channel's verdict HERE. The verdict IS state:
//
//   null         → the channel is clean (or no run has lied yet)
//   {violation}  → the channel lied: contract violation (a 200 body failing
//                  the core, or the backend's 500 `violations} signature)
//   {error}      → the channel's body was unparseable
//
// The run card's catch already flips the CARD to error (pollFlowRun
// throws RunStatusContractError). This store records the verdict + fires a
// TOAST with Retry — the 2026-08-14 rule: errors surface through TOASTS
// ONLY, never a persistent line rendered in the webapp (the old banner was
// removed). Retry re-polls the SAME run: if the backend recovered, the
// verdict clears; if it is still bad, the toast re-fires.

import { useSyncExternalStore } from "react"
import type { RunStatusViolation } from "./runStatusContract"
import { contractToast } from "./contractToast"

export type RunStatusVerdict =
 | { kind: "violation"; runId: string; violations: RunStatusViolation[] }
 | { kind: "error"; runId: string; message: string }

/** Re-poll the run — the toast's Retry action. Recovered → clear; still
 * bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
 * whole protocol layer; the store only needs it on click. */
function repoll(runId: string): void {
  import("./FlowProtocol")
    .then(({ pollFlowRun }) =>
      pollFlowRun(runId, undefined, { maxWaitMs: 30_000, intervalMs: 2_000 }),
    )
    .then(() => useRunStatusContractStore.getState().clear())
    .catch(() => {
      // Still bad / gone / timed out — the card shows the truth; nothing
      // further to toast (the poll itself re-reported if it lied again).
    })
}

function toastVerdict(v: RunStatusVerdict): void {
  const toast = contractToast
  if (v.kind === "violation") {
    const first = v.violations[0]?.message ?? "the status response did not match the expected shape"
    toast(
      "error",
      `Run ${v.runId}: ${v.violations.length} contract issue(s) — ${first}. ` +
        `Retry to re-check, or re-run the card.`,
      { label: "Retry", onClick: () => repoll(v.runId) },
    )
  } else {
    toast(
      "error",
      `Run ${v.runId}: status channel error — ${v.message}. Retry to re-check.`,
      { label: "Retry", onClick: () => repoll(v.runId) },
    )
  }
}

interface RunStatusContractStoreState {
 verdict: RunStatusVerdict | null
 reportViolation: (runId: string, violations: RunStatusViolation[]) => void
 reportError: (runId: string, message: string) => void
 clear: () => void
}

// ── Native store (DSH ships no state library — no zustand) ─────────────────
// Module-level verdict + listener set + useSyncExternalStore hook. The repoll
// wiring above is unchanged; the action bodies below are verbatim apart from
// set() → _setState().
const _listeners = new Set<() => void>()

function _subscribe(listener: () => void): () => void {
  _listeners.add(listener)
  return () => {
    _listeners.delete(listener)
  }
}

type _Patch =
  | Partial<RunStatusContractStoreState>
  | ((s: RunStatusContractStoreState) => Partial<RunStatusContractStoreState>)

function _setState(patch: _Patch, replace?: boolean): void {
  const p =
    typeof patch === "function"
      ? (patch as (s: RunStatusContractStoreState) => Partial<RunStatusContractStoreState>)(_state)
      : patch
  if (replace === true) {
    _state = p as RunStatusContractStoreState
  } else {
    _state = { ..._state, ...p }
  }
  _listeners.forEach((l) => l())
}

function _getState(): RunStatusContractStoreState {
  return _state
}

const _seed: RunStatusContractStoreState = ({
 verdict: null,

 reportViolation: (runId, violations) => {
  console.error("[runStatusContract] status channel violation:", runId, violations)
  const verdict: RunStatusVerdict = { kind: "violation", runId, violations }
  _setState({ verdict })
  toastVerdict(verdict)
 },

 reportError: (runId, message) => {
  console.error("[runStatusContract] status channel error:", runId, message)
  const verdict: RunStatusVerdict = { kind: "error", runId, message }
  _setState({ verdict })
  toastVerdict(verdict)
 },

 clear: () => _setState({ verdict: null }),
})

let _state: RunStatusContractStoreState = _seed

const _initialState: RunStatusContractStoreState = _state

function _useRunStatusContractStoreHook(): RunStatusContractStoreState
function _useRunStatusContractStoreHook<T>(
  selector: (s: RunStatusContractStoreState) => T,
): T
/* v8 ignore next -- React-tree wiring: invoking the hook needs a renderer
 * for useSyncExternalStore (dom-project territory, like the slots seam's
 * useVersion). The selector contract is pinned node-side through
 * getState/subscribe in run-status-contract-store.spec.ts. (2026-09-12) */
function _useRunStatusContractStoreHook<T>(
  selector?: (s: RunStatusContractStoreState) => T,
): T | RunStatusContractStoreState {
  const getSnapshot = selector
    ? () => selector(_getState())
    : () => _getState() as unknown as T
  return useSyncExternalStore(_subscribe, getSnapshot)
}

export const useRunStatusContractStore = Object.assign(
  _useRunStatusContractStoreHook,
  {
    getState: _getState,
    setState: _setState,
    subscribe: _subscribe,
    getInitialState: (): RunStatusContractStoreState => _initialState,
    destroy: (): void => {},
  },
)
