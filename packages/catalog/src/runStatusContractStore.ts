"use client"

// runStatusContractStore — the Zustand half of the run-status contract.
//
// 2026-08-11 directive: "make declarative contracts in the Zustand and
// pydantic so it's impossible to fail this". pollPipelineRun reports the
// status channel's verdict HERE. The verdict IS state:
//
//   null         → the channel is clean (or no run has lied yet)
//   {violation}  → the channel lied: contract violation (a 200 body failing
//                  the core, or the backend's 500 `violations} signature)
//   {error}      → the channel's body was unparseable
//
// The run card's catch already flips the CARD to error (pollPipelineRun
// throws RunStatusContractError). This store records the verdict + fires a
// TOAST with Retry — the 2026-08-14 rule: errors surface through TOASTS
// ONLY, never a persistent line rendered in the webapp (the old banner was
// removed). Retry re-polls the SAME run: if the backend recovered, the
// verdict clears; if it is still bad, the toast re-fires.

import { create } from "zustand"
import type { RunStatusViolation } from "./runStatusContract"
import { useToastStore } from "@melite/ui"

export type RunStatusVerdict =
 | { kind: "violation"; runId: string; violations: RunStatusViolation[] }
 | { kind: "error"; runId: string; message: string }

/** Re-poll the run — the toast's Retry action. Recovered → clear; still
 * bad → re-report (a fresh toast). Lazy import: pipelineProtocol pulls the
 * whole protocol layer; the store only needs it on click. */
function repoll(runId: string): void {
  import("./pipelineProtocol")
    .then(({ pollPipelineRun }) =>
      pollPipelineRun(runId, undefined, { maxWaitMs: 30_000, intervalMs: 2_000 }),
    )
    .then(() => useRunStatusContractStore.getState().clear())
    .catch(() => {
      // Still bad / gone / timed out — the card shows the truth; nothing
      // further to toast (the poll itself re-reported if it lied again).
    })
}

function toastVerdict(v: RunStatusVerdict): void {
  const toast = useToastStore.getState().addToast
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

export const useRunStatusContractStore = create<RunStatusContractStoreState>((set) => ({
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
}))
