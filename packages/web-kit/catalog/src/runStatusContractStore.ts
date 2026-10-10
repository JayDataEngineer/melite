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

import type { RunStatusViolation } from "./runStatusContract.ts"
import { createClientStore } from "./clientStore.ts"
import { contractToast } from "./contractToast.ts"

export type RunStatusVerdict =
  | { kind: "violation"; runId: string; violations: RunStatusViolation[] }
  | { kind: "error"; runId: string; message: string }

interface RunStatusContractStoreState {
  verdict: RunStatusVerdict | null
  reportViolation: (runId: string, violations: RunStatusViolation[]) => void
  reportError: (runId: string, message: string) => void
  clear: () => void
}

/** In-flight repolls, keyed by runId (audit R-S2, 2026-10-22): a
 *  double-clicked Retry (or Retry on two stacked toasts for the same
 *  run) must not mint two concurrent 30s pollers — each re-reporting,
 *  duplicate violation toasts. The second press while a repoll for the
 *  same run is live is a no-op. */
const repollInFlight = new Set<string>()

/** Re-poll the run — the toast's Retry action. Recovered → clear; still
 *  bad → re-report (a fresh toast). Lazy import: FlowProtocol pulls the
 *  whole protocol layer; the store only needs it on click. */
function repoll(runId: string): void {
  if (repollInFlight.has(runId)) return
  repollInFlight.add(runId)
  import("./FlowProtocol.ts")
    .then(({ pollFlowRun }) =>
      pollFlowRun(runId, undefined, { maxWaitMs: 30_000, intervalMs: 2_000 }),
    )
    .then(() => useRunStatusContractStore.getState().clear())
    .catch((err: unknown) => {
      // Still bad / gone / timed out — the card shows the truth; nothing
      // further to toast (the poll itself re-reported if it lied again).
      // The failure is LOGGED though (audit R-S2): a swallowed 404/gone
      // used to leave the stale verdict standing with no trace anywhere.
      console.error("[runStatusContract] repoll failed:", runId, err)
    })
    .finally(() => {
      repollInFlight.delete(runId)
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

export const useRunStatusContractStore = createClientStore<RunStatusContractStoreState>(
  (set) => ({
    verdict: null,

    reportViolation: (runId, violations) => {
      console.error("[runStatusContract] status channel violation:", runId, violations)
      const verdict: RunStatusVerdict = { kind: "violation", runId, violations }
      set({ verdict })
      toastVerdict(verdict)
    },

    reportError: (runId, message) => {
      console.error("[runStatusContract] status channel error:", runId, message)
      const verdict: RunStatusVerdict = { kind: "error", runId, message }
      set({ verdict })
      toastVerdict(verdict)
    },

    clear: () => set({ verdict: null }),
  }),
)
