/**
 * use-resolved.ts — THE STUDIO SEAM, ONE UNIVERSAL DEFAULT SYSTEM
 * (operator, 2026-09-18: "there is no universal default system
 * right?"). ONE resolver composes EVERY layer — schema defaults <-
 * model_defaults <- base (the persisted/bench layer) <- user — and
 * the surface reads THE ONE resolved map. Never a hand `??` ladder
 * at a call site: a ladder IS a second resolver, and every extra
 * arm is a place the truth forks.
 *
 * PRE-FETCH LAW: the spec arrives async, but the resolved map is
 * STILL the layer composition — base under user, verbatim — so a
 * synchronous render shows the document's own held values; the
 * fetch landing fills the declared defaults under them (the same
 * one map, richer). Nothing renders blank, nothing flickers, no
 * call site branches on spec-null.
 *
 * THE EDIT LAW: `undefined` is the tri-state's inherit signal (the
 * unset) — it rides verbatim, the caller's write owns what it
 * means. Edits coerce at the SCHEMA BOUNDARY (coerceFieldEdit):
 * numeric strings ride as numbers, unparseable strings ride
 * verbatim for the run's schema parse to refuse LOUD, and keys the
 * spec never declared (the mod bag) ride verbatim — the mod plane
 * owns their validation.
 */
import { useCallback, useMemo } from 'react'
import { useFormSpec } from './form.tsx'
import { coerceFieldEdit, fieldsOf, resolveValue } from './spec.ts'
import type { FormSpecDoc, SpecField } from './spec.ts'

/** The resolved studio seam: spec + error from the door, values
 * resolved through the ONE cascade, edits coerced at the schema
 * boundary. `user` is the surface's explicit layer (a document's
 * params — sparse by design); `base` is the persisted layer under
 * it (the bench/stage row's params), when the surface has one. */
export function useResolvedForm(
  family: string,
  user: Record<string, unknown>,
  onWrite: (name: string, v: unknown) => void,
  base?: Record<string, unknown>,
): {
  spec: FormSpecDoc | null
  error: string | null
  /** What the rows SHOW: every layer composed — exactly what a run
   * composes. The surface reads THIS map and nothing else. */
  resolved: Record<string, unknown>
  /** The one edit verb: coerce through the spec's own field, then
   * the caller's write. */
  edit: (name: string, v: unknown) => void
  /** The spec's field row by wire name (the coercion's own lookup,
   * exposed for hosts that render their own atoms). */
  fieldOf: (name: string) => SpecField | undefined
} {
  const { spec, error } = useFormSpec(family)
  const resolved = useMemo(
    () => resolveValueLayered(spec, base, user),
    [spec, base, user],
  )
  const fieldOf = useCallback(
    (name: string): SpecField | undefined =>
      spec !== null ? fieldsOf(spec).find((f) => f.name === name) : undefined,
    [spec],
  )
  const edit = useCallback(
    (name: string, v: unknown): void => {
      const f = fieldOf(name)
      // THE STUDIOS' BLANK-INHERITS LAW (the knob-audit law,
      // 2026-09-19: "blanking the window width writes undefined —
      // blank inherits preset geometry"): on THIS rail a numeric
      // row's EMPTY edit is the unset signal, never a loud "" at
      // the run. The bench drill keeps '' verbatim (display
      // continuity through clear-and-retype) — each face owns its
      // blank semantics at its own door.
      if (v === '' && f !== undefined
          && (f.type === 'number' || f.type === 'seed' || f.type === 'slider')) {
        onWrite(name, undefined)
        return
      }
      onWrite(name, coerceFieldEdit(f, v))
    },
    [fieldOf, onWrite],
  )
  return { spec, error, resolved, edit, fieldOf }
}

/** The layer composition — PURE, exported for the seam's own wall:
 * with a spec it is exactly resolveValue (schema <- model_defaults
 * <- base <- user); without one (the pre-fetch render, the dead
 * door) it is still the LAYERS — base under user, verbatim — so
 * every surface reads the same shape at every moment. */
export function resolveValueLayered(
  spec: FormSpecDoc | null,
  base: Record<string, unknown> | undefined,
  user: Record<string, unknown>,
): Record<string, unknown> {
  if (spec === null) {
    const out: Record<string, unknown> = { ...(base ?? {}) }
    // THE INHERIT LAW (same as resolveValue's user layer): a
    // materialized undefined is the unset signal — it inherits
    // base's held value, never blanks it.
    for (const [k, v] of Object.entries(user)) {
      if (v === null || v === undefined) continue
      out[k] = v
    }
    return out
  }
  return resolveValue(spec, user, base)
}
