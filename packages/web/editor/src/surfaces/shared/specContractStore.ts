"use client"

// specContractStore — the Zustand half of the NO SILENT DROPS contract.
//
// 2026-08-11 directive: "make declarative contracts in the Zustand and
// pydantic so it's impossible to fail this". Every form-spec that enters
// the app passes through THIS store. The store runs validateSpecContract
// on load and keeps the verdict as state:
//
//   state "loaded"   → the spec is contract-clean, components render it
//   state "violation" → the spec declared a capability that cannot render
//                      (zero options / all-uninstalled / malformed) — the
//                      UI MUST show this, never an empty dropdown
//   state "error"    → the fetch itself failed — the UI shows the error
//                      with Retry (never a silently-hidden mod grid)
//
// There is NO setFormSpec: components cannot place a spec into the store
// except through loadFormSpec, which validates. A broken spec can never
// be held, so it can never be rendered silently.

import { create } from "zustand"
import { useCallback, useEffect, useLayoutEffect, useRef } from "react"
import { editorClient } from "@/rpc/editorClient"
import { validateSpecContract, type SpecViolation } from "@melite/formats"
import { setRequiredEmptyResolver } from "@melite/catalog"
import type { FormSpec } from "@melite/contracts"
import { useToastStore } from "@melite/ui"

export type SpecContractState = "idle" | "loading" | "loaded" | "violation" | "error"

export interface SpecContractRecord {
 /** The contract-valid spec (null until state === "loaded"). TYPED as
  * FormSpec — validateSpecContract is the ONE boundary that pronounces
  * the unknown wire body a FormSpec; consumers read it cast-free. */
 spec: FormSpec | null
 state: SpecContractState
 violations: SpecViolation[]
 /** Fetch-failure message (state === "error"). */
 error: string | null
 /** Terminal-class tag (state === "error"). "unknown-service"
  * means the requested id names no known model (retired or renamed
  * — the 2026-09-05 img-edit fossil: a stored stage kept requesting
  * the retired family head and Retry re-looped on the same corpse).
  * UI can point at the Model select instead of a bare Retry. Absent
  * for transient failures. */
 errorKind?: "unknown-service"
 /** Substitution (state === "loaded"): the requested service was
  * terminal-unknown and opts.fallbackService was served instead.
  * Stored under the REQUESTED key so subscribers resolve; UI toasts
  * the swap. Absent when no substitution happened. */
 substitutedFrom?: string
}

interface SpecContractStoreState {
 /** Keyed by model/service (e.g. "z-image"). Shared by ALL surfaces —
 * the model catalog is global data, not per-surface user state. */
 records: Record<string, SpecContractRecord>
 /** Load (and validate) a service's form-spec. Passive subscribers call
  * without opts and dedup on an existing loaded/loading record. Card-open
  * callers pass { fresh: true } — the catalog re-assembles on every
  * supervisor restart, so a session-old "loaded" record can be STALE
  * (old fields / missing mods on an opened card); fresh ALWAYS
  * revalidates against the backend (2026-08-12).
 * Callers that know the card's current default pass { fallbackService }
 * — a terminal-unknown service (retired/renamed id) then loads the
 * substitute through the same contract instead of stranding on Retry
 * (2026-09-05); the record carries substitutedFrom and UI toasts it. */
 loadFormSpec: (service: string, opts?: { fresh?: boolean, fallbackService?: string }) => Promise<SpecContractRecord>
 /** Refetch + re-validate after an error or violation (the Retry button). */
 retryFormSpec: (service: string, opts?: { fallbackService?: string }) => Promise<SpecContractRecord>
}

const EMPTY: SpecContractRecord = { spec: null, state: "idle", violations: [], error: null }

/**
 * Delay before the one automatic re-probe after a fetch failure. The gateway
 * flaps during dev_reload_supervisor restarts (backend saves) — restart
 * windows are a few seconds; apiFetch already burned its ~15s retry budget
 * by the time this catch runs, so one more attempt after a short pause
 * catches the recovery. Exactly ONE re-probe — a second failure records
 * "error" (visible face + Retry).
 */
const REPROBE_DELAY_MS = 2_500

// ── TERMINAL-404 (2026-09-05) ─────────────────────────────────────────────
// A form-spec 404 with "model not found" is NOT a flap — the id names no
// known model (a retired/renamed family head; the img-edit fossil kept a
// stored stage requesting a dead id and Retry re-looped on the corpse).
// Wire contract: the gateway emits exactly {"error": "model not found"}
// and editorClient formats `form-spec <id> failed (<status>): <error>`.
// Both halves must match so a 404 from another door never misfires.
// Terminal refusals skip the reprobe and substitute when the caller
// supplied a fallback — reprobing a corpse is an infinite loop.
function isUnknownService(message: string): boolean {
 return /failed \(404\)/.test(message) && /model not found/.test(message)
}

// ── THE REQUIRED-EMPTY SEAM (2026-08-21) ─────────────────────────────────────
// @melite/catalog validates generate bodies but knows ZERO model ids (the
// audioPromptModels list is dead). WE own the served specs — so WE push
// the resolver INTO the package (one direction; the package never
// imports app code). Registered once at module load: for any model with
// a loaded spec, report required fields whose current value is empty.
setRequiredEmptyResolver((model, values) => {
  const record = useSpecContractStore.getState().records[model]
  const spec = record?.spec
  if (!spec) return null // unknown to us — not our verdict to give
  // spec is FormSpec — fields is the typed array (validated non-empty
  // by the contract's fields gate).
  const missing: string[] = []
  for (const f of spec.fields) {
    if (!f?.required || !f.name) continue
    const v = values[f.name]
    if (v === undefined || v === null || v === "") missing.push(f.name)
  }
  return missing
})

export const useSpecContractStore = create<SpecContractStoreState>((set, get) => ({
 records: {},

 loadFormSpec: async (service: string, opts?: { fresh?: boolean, fallbackService?: string }): Promise<SpecContractRecord> => {
  // Passive subscribers (mounts) dedup on loaded/loading — the record
  // stands (contract-valid by construction: it only becomes "loaded"
  // through validateSpecContract).
  const existing = get().records[service]
  if (!opts?.fresh && (existing?.state === "loaded" || existing?.state === "loading")) return existing
  // CARD-OPEN REVALIDATION (2026-08-12): a "loaded" record can be STALE —
  // the catalog re-assembles on every supervisor restart (backend saves
  // re-import YAML: new mods/fields appear mid-session), and an earlier
  // passive mount may have cached it. Card-open callers pass fresh: true
  // → ALWAYS revalidate against the backend — the catalog is the truth,
  // never a session-old ghost. In-flight dedup: N simultaneous opens
  // share ONE fetch.
  if (existing?.state === "loading") return existing

  set((s) => ({
   records: { ...s.records, [service]: { ...EMPTY, state: "loading" } },
  }))

  let spec: unknown
  let substitutedFrom: string | undefined
  // Record + toast a fetch failure (the 2026-08-14 toast-only rule).
  // Retry preserves the fallback so a substituted record re-resolves
  // instead of re-looping on the corpse.
  const fail = (message: string, kind?: "unknown-service"): SpecContractRecord => {
   const record: SpecContractRecord = kind
    ? { ...EMPTY, state: "error", error: message, errorKind: kind }
    : { ...EMPTY, state: "error", error: message }
   set((s) => ({ records: { ...s.records, [service]: record } }))
   const retryOpts = opts?.fallbackService ? { fallbackService: opts.fallbackService } : undefined
   useToastStore.getState().addToast(
     "error",
     message,
     { label: "Retry", onClick: () => { void get().retryFormSpec(service, retryOpts) } },
   )
   return record
  }
  // Resolve a terminal-unknown service via the caller's fallback.
  // Returns a failure record (caller returns it) when the fallback is
  // absent or fails; returns null with `spec` loaded when it lands.
  const resolveUnknown = async (): Promise<SpecContractRecord | null> => {
   const fallback = opts?.fallbackService
   if (fallback && fallback !== service) {
    try {
     spec = await editorClient.getFormSpec(fallback)
     substitutedFrom = service
     return null
    } catch (fe) {
     const feMsg = fe instanceof Error ? fe.message : String(fe)
     console.error("[specContractStore] fallback form-spec fetch failed:", feMsg, "(dead:", service, ")")
     return fail(`Form spec for '${service}' failed to load — unknown model (retired or renamed?). Its substitute '${fallback}' failed too — ${feMsg}.`, "unknown-service")
    }
   }
   return fail(`Form spec for '${service}' failed to load — unknown model (retired or renamed?). Pick a current model from the Model select — Retry re-fetches the same id.`, "unknown-service")
  }
  try {
   spec = await editorClient.getFormSpec(service)
  } catch (e) {
   // TRANSIENT-FAILURE REPROBE (2026-08-11): the gateway flaps during
   // dev_reload_supervisor restarts (backend saves) — a fetch can land in
   // a 502 window mid-restart. apiFetch retried for ~15s and still failed;
   // one delayed re-probe catches the recovery so "close the card and
   // reopen it" happens AUTOMATICALLY (the user's live complaint: "open
   // create image, no mod slot; reopen it, mod slot"). Bounded: exactly
   // one re-probe — a second failure records "error" (visible + Retry).
   const firstMsg = e instanceof Error ? e.message : String(e)
   // TERMINAL-404 FIRST (2026-09-05): an unknown model is not a flap —
   // skip the reprobe, substitute or fail terminally with re-pick
   // guidance (the img-edit fossil: Retry re-looped on a dead id).
   if (isUnknownService(firstMsg)) {
    const rec = await resolveUnknown()
    if (rec) return rec
   } else {
    try {
     await new Promise((r) => setTimeout(r, REPROBE_DELAY_MS))
     spec = await editorClient.getFormSpec(service)
    } catch (e2) {
     const msg = e2 instanceof Error ? e2.message : String(e2)
     console.error("[specContractStore] form-spec fetch failed:", msg, "(first:", firstMsg, ")")
     // A flap that resolves into a rename lands terminally here — the
     // same substitution, no second reprobe.
     if (isUnknownService(msg)) {
      const rec = await resolveUnknown()
      if (rec) return rec
     } else {
      return fail(`Form spec for '${service}' failed to load — ${msg}. Modifiers may be missing. Retry re-fetches the spec.`)
     }
    }
   }
  }

  // ── THE CONTRACT ── the verdict is state; nothing renders without it.
  // The validator's returned `spec` IS the typed crossing (FormSpec) —
  // the store holds it directly; no consumer re-casts.
  const { valid, violations, spec: validSpec } = validateSpecContract(spec)
  // The served id: the fallback's when substituted (the violation toast
  // must name the spec that actually violated, not the dead request).
  const effective = substitutedFrom ? (opts?.fallbackService ?? service) : service
  const base: SpecContractRecord = valid
    ? { spec: validSpec ?? null, state: "loaded", violations: [], error: null }
    : { spec: null, state: "violation", violations, error: null }
  const record: SpecContractRecord = substitutedFrom && base.state === "loaded"
    ? { ...base, substitutedFrom }
    : base
  set((s) => ({ records: { ...s.records, [service]: record } }))
  if (record.state === "loaded" && record.substitutedFrom && opts?.fallbackService) {
   // The user asked for a dead id and got its substitute — say so (info,
   // not error: the card works, but the Model select still shows the dead
   // id until the stage is re-saved with the substitute).
   useToastStore.getState().addToast(
    "info",
    `'${record.substitutedFrom}' isn't a known model — showing '${opts.fallbackService}' instead.`,
   )
  }
  if (!valid) {
   // 2026-08-14 rule: errors surface through TOASTS ONLY, never a persistent
   // line in the webapp (the old per-surface banner is gone).
   const first = violations[0]
   const msg = first
    ? first.kind && first.kind !== "spec"
      ? `${first.kind}: ${first.message}`
      : first.message
    : "the spec response did not match the expected shape"
   useToastStore.getState().addToast(
    "error",
    `Form spec for '${effective}' violated its contract — ${msg}. Retry re-fetches the spec.`,
    { label: "Retry", onClick: () => { void get().retryFormSpec(service, opts?.fallbackService ? { fallbackService: opts.fallbackService } : undefined) } },
   )
  }
  return record
 },

 /** Retry after error/violation — refetch + re-validate (new verdict).
  * Always fresh: an explicit Retry never reuses the failed record. */
 retryFormSpec: (service: string, opts?: { fallbackService?: string }) => get().loadFormSpec(service, { fresh: true, ...opts }),
}))

/**
 * useFormSpecContract — the ONE hook for getting a form-spec into component
 * state (Door B deletion, 2026-08-11). The legacy useFormSpec/loadFormSpec
 * in lib/formSpec bypassed validateSpecContract; THIS hook reads the verdict
 * store, so a spec can only ever render after passing the contract. It
 * subscribes to records[service] and fires the store's loadFormSpec on
 * mount / service change (the store's in-flight guard dedups concurrent
 * mounts).
 *
 * `onSpec` fires the first time the record becomes "loaded", via
 * useLayoutEffect — so the default-merge happens BEFORE paint, the same
 * no-flash semantics as the deleted useFormSpec.
 */
export function useFormSpecContract(
  service: string,
  onSpec?: (spec: FormSpec) => void,
): {
  spec: FormSpec | null
  loading: boolean
  error: string | null
  state: SpecContractState
  violations: SpecViolation[]
  retry: () => void
} {
  const record = useSpecContractStore((s) => s.records[service] ?? EMPTY)
  const onSpecRef = useRef(onSpec)
  onSpecRef.current = onSpec
  // Fire onSpec exactly once per load. useLayoutEffect (not useEffect):
  // the merge lands before paint — no flash of new-fields + stale-values.
  const notified = useRef<string | null>(null)
  useLayoutEffect(() => {
    if (record.state === "loaded" && record.spec && notified.current !== service) {
      notified.current = service
      // record.spec is FormSpec (the validator's typed crossing at the
      // store boundary) — no cast needed here.
      onSpecRef.current?.(record.spec)
    }
  }, [record.state, record.spec, service])

  useEffect(() => {
    if (!service) return
    void useSpecContractStore.getState().loadFormSpec(service)
  }, [service])

  const retry = useCallback(() => {
    void useSpecContractStore.getState().retryFormSpec(service)
  }, [service])

  return {
    spec: record.state === "loaded" ? record.spec : null,
    loading: record.state === "loading",
    error: record.state === "error" ? record.error : null,
    state: record.state,
    violations: record.violations,
    retry,
  }
}
