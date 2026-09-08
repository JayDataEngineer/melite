/**
 * useFormController — the ONE orchestration hook for schema-driven forms.
 *
 * `useFormSpecContract` (in @/lib/specContractStore) handles the FETCH +
 * CONTRACT: GET /v1/form-spec, validateSpecContract verdict, loading state,
 * error capture. This hook layers the ORCHESTRATION on top:
 *
 *   • value state           — the single Record<string, unknown> the parent
 *                              would otherwise declare with useState
 *   • default-merge         — on spec load, seed defaults while preserving
 *                              user-entered values for fields that still
 *                              exist in the new spec (model swap)
 *   • onChange              — the (name, value) → setValues updater, memoized
 *   • payload()             — buildPayload(model, values, {service, ...extra})
 *                              ready to POST to /v1/flows/start (flat)
 *
 * What this replaces (the duplicated glue in DirectorVideoForm, DirectorStudio,
 * and the Library canvas form-service branch):
 *
 *   const [values, setValues] = useState<Record<string, unknown>>({})
 *   const { spec } = useFormSpecContract(model, (s) => {
 *     setValues((prev) => {
 *       const merged = { ...s.defaults }
 *       for (const [k, v] of Object.entries(prev))
 *         if (s.fields.some((f) => f.name === k)) merged[k] = v
 *       return merged
 *     })
 *   })
 *   const onChange = useCallback((name, val) => setValues((p) => ({ ...p, [name]: val })), [])
 *   const payload = buildPayload(model, values, { service })
 *
 * Usage:
 *   const { spec, loading, error, values, onChange, payload } = useFormController({ model })
 *   // ... <SchemaForm spec={spec} values={values} onChange={onChange} />
 *   // ... await editorClient.runGeneration({ ...payload(), service })
 *
 * The backend remains the single source of truth for defaults, grouping,
 * and layout — this hook only manages the client-side value state and the
 * default-merge-on-swap policy.
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from "react"
import { useFormSpecContract } from "@/surfaces/shared/specContractStore"
import type { FormSpec } from "@melite/contracts"
import { buildPayload } from "./SchemaForm.utils"

export interface UseFormControllerOptions {
  /** The selected model route — drives the form-spec fetch. */
  model: string
  /** Optional service name baked into the payload as `{ service }`.
   *  Envelope chrome, never params: the gateway lift strips it
   *  (CARD_ENVELOPE_KEYS) before the card schema sees the body, and
   *  the click-time gate relaxes it. No producer passes it today. */
  service?: string
  /** When true (default), user-entered values for fields that still exist
   *  in a newly-loaded spec are preserved across a model swap. Set false
   *  for forms that should hard-reset on every spec change. */
  preserveAcrossSwap?: boolean
}

export interface UseFormControllerResult {
  spec: FormSpec | null
  loading: boolean
  error: string | null
  /** Current param values. Pass to <SchemaForm values={values}>. */
  values: Record<string, unknown>
  /** Direct setter exposed for the rare case a caller needs bulk updates. */
  setValues: Dispatch<SetStateAction<Record<string, unknown>>>
  /** (name, value) updater — pass to <SchemaForm onChange={onChange}>. */
  onChange: (name: string, value: unknown) => void
  /** Build the /v1/flows/start (flat-shape) payload from current
   *  values. Field names ARE param names; nulls/empties stripped. Extra
   *  fields merged last. */
  payload: (extra?: Record<string, unknown>) => Record<string, unknown>
}

export function useFormController(opts: UseFormControllerOptions): UseFormControllerResult {
  const { model, service, preserveAcrossSwap = true } = opts

  // ── Value state — the one Record the parent used to own ────────────
  const [values, setValues] = useState<Record<string, unknown>>({})

  // ── Spec fetch + default-merge ─────────────────────────────────────
  // The onSpec callback seeds defaults in the SAME tick as setSpec, so
  // there's no flash of new-fields + stale-values. When preserveAcrossSwap
  // is on, user-entered values survive a model swap for fields that still
  // exist in the new spec — this is the behavior every consumer wanted.
  const { spec, loading, error } = useFormSpecContract(model, (s) => {
    setValues((prev) => {
      const merged: Record<string, unknown> = { ...s.defaults }
      if (preserveAcrossSwap) {
        const keep = new Set(s.fields.map((f) => f.name))
        for (const [k, v] of Object.entries(prev)) {
          if (keep.has(k)) merged[k] = v
        }
      }
      return merged
    })
  })

  // ── onChange — memoized field updater ──────────────────────────────
  const onChange = useCallback((name: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  // ── payload() — buildPayload with service baked in ─────────────────
  // Pass the live schema's field names as `allowedFields` so stray values
  // from a stale form state can't leak into /v1/flows/start. Same
  // protection the
  // Library canvas applies directly — closes the original "rigged_path in
  // qwen-img-edit-2511 payload" schema-violation bug at the controller level.
  const payload = useCallback(
    (extra?: Record<string, unknown>) =>
      buildPayload(
        model,
        values,
        { ...(service ? { service } : {}), ...extra },
        spec ? new Set(spec.fields.map((f) => f.name)) : undefined,
      ),
    [model, values, service, spec],
  )

  return { spec, loading, error, values, setValues, onChange, payload }
}
