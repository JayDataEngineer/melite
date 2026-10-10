"use client"

// catalogContractStore — the native-store half of the catalog contract.
//
// 2026-08-11 directive: "make declarative contracts in the Zustand and
// pydantic so it's impossible to fail this". The catalog module cache
// (lib/modelCatalog) stays the fetch funnel; loadCatalog reports its
// verdict HERE. The verdict IS state:
//
//   state "loaded"    → the catalog is contract-clean, surfaces render it
//   state "violation" → the wire sent a malformed catalog (backend bug) —
//                       a banner renders the violations, Retry re-fetches
//   state "error"     → the fetch itself failed — the banner shows the
//                       error with Retry
//
// A violated catalog is NEVER cached (loadCatalog refuses to ingest it),
// so it can never be rendered silently as an empty sidebar.
//
// 2026-08-18 — ERROR TOASTS FIRE ONCE PER OUTAGE and carry a wall-clock
// stamp: ensureCatalog's 3s retry loop re-reports the same failure on
// every attempt, and each report used to push a fresh toast (the reported
// "spammed every 5 seconds"). See the latch below reportError.

import type { CatalogViolation } from "./catalogContract.ts"
import { createClientStore } from "./clientStore.ts"
import { contractToast } from "./contractToast.ts"

export type CatalogContractState = "idle" | "loaded" | "violation" | "error"

export interface CatalogContractRecord {
  state: CatalogContractState
  violations: CatalogViolation[]
  /** Fetch-failure message (state === "error"). */
  error: string | null
}

interface CatalogContractStoreState {
  record: CatalogContractRecord
  /** The catalog funnel reported a contract-clean load. */
  reportOk: () => void
  /** The catalog funnel refused to ingest a malformed catalog. */
  reportViolation: (violations: CatalogViolation[]) => void
  /** The catalog funnel's fetch itself failed. */
  reportError: (message: string) => void
  /** Reset to idle (teardown / tests). */
  clear: () => void
}

const IDLE: CatalogContractRecord = { state: "idle", violations: [], error: null }

// ── 2026-08-18 — TOAST ONCE PER OUTAGE ───────────────────────────────────
// ensureCatalog retries a failed fetch every 3s until the gateway comes
// back, and EVERY attempt re-reports through reportError — without a latch
// that is a fresh error toast per cycle ("spammed every 5 seconds, when I
// only need it once"). The record stays per-attempt truthful (state and
// message update on every report); only the TOAST is suppressed while the
// SAME outage continues. A different message (502 → connection refused) is
// genuinely new information and toasts once more; reportOk re-arms the
// latch so the NEXT outage announces itself exactly once too.
let _lastToastedOutage: string | null = null

/** Wall-clock stamp for error surfaces — a once-only toast may outlive the
 *  outage that produced it, so the operator should also see WHEN it fired.
 *  24h local time, seconds resolution. */
function _stamp(): string {
  return new Date().toLocaleTimeString([], { hour12: false })
}

/** Retry = force re-fetch the catalog (bypasses the TTL cache), which
 *  re-validates + re-reports. Lazy import: modelCatalog imports THIS store
 *  (for CatalogContractError reporting) — a static import would be circular. */
function retryCatalog(): void {
  import("./modelCatalog.ts")
    .then(({ loadCatalog }) => loadCatalog({ force: true }))
    .catch((err: unknown) => {
      // The funnel re-reported when loadCatalog ran — a fresh toast
      // already fired. But the import() itself can fail (chunk/HMR
      // edge): that failure reaches ONLY this log (audit R-S2) — it
      // must not vanish entirely.
      console.error("[catalogContract] retryCatalog failed:", err)
    })
}

export const useCatalogContractStore = createClientStore<CatalogContractStoreState>(
  (set, get) => ({
    record: IDLE,

    reportOk: () => {
      // Read BEFORE the write — the error→ok transition decides the recovery
      // toast.
      const wasOutage = get().record.state === "error"
      _lastToastedOutage = null // re-arm: the next outage is a NEW event
      set({ record: { state: "loaded", violations: [], error: null } })
      // Close the loop the once-only error opened: the outage announced itself
      // with ONE toast, so its end also gets exactly one (info, 5s
      // auto-dismiss). Only for error→ok — a violation clearing means a
      // backend deploy landed; the sidebar repopulating is signal enough
      // there.
      if (wasOutage) {
        contractToast("info", `Catalog back online (at ${_stamp()}).`)
      }
    },

    reportViolation: (violations) => {
      console.error(`[catalogContract] catalog contract violation (at ${_stamp()}):`, violations)
      set({ record: { state: "violation", violations, error: null } })
      const first = violations[0]
      const msg = first
        ? first.kind && first.kind !== "catalog"
          ? `${first.kind}: ${first.message}`
          : first.message
        : "the catalog response did not match the expected shape"
      contractToast(
        "error",
        `Catalog contract violation — ${msg} (at ${_stamp()}). Some models may be missing. Retry re-fetches the catalog.`,
        { label: "Retry", onClick: retryCatalog },
      )
    },

    reportError: (message) => {
      // Trim: fetch-layer messages can carry trailing whitespace, which used
      // to render as "502 Bad Gateway . Retry".
      const clean = message.trim()
      console.error(`[catalogContract] catalog fetch failed (at ${_stamp()}):`, clean)
      // The record is per-attempt truth — always updated, never latched.
      set({ record: { state: "error", violations: [], error: clean } })
      if (clean === _lastToastedOutage) return // same ongoing outage — no re-toast
      _lastToastedOutage = clean
      contractToast(
        "error",
        `Catalog unavailable — ${clean} (at ${_stamp()}). Retry re-fetches the catalog.`,
        { label: "Retry", onClick: retryCatalog },
      )
    },

    clear: () => {
      _lastToastedOutage = null
      set({ record: IDLE })
    },
  }),
)
