/** spec-panel.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react'
import { type FormSpecDoc, type SpecField, fieldVisible, fieldsOf, resolveFamilyKey } from './spec.ts'
import css from './card.module.css'
import { useFormSpec } from './use-form-spec.ts'
import { SpecFieldRow } from './rows.tsx'

/** One dynamic-parameter section: a title riding the master form's
 * own group chrome, a stable testid for the behaviorals, and its
 * rows. */
export interface SpecPanelSection {
  title: string
  testid?: string
  rows: SpecPanelRow[]
}

/** One dynamic-parameter row: the served field at its WIRE name.
 * Row VISIBILITY rides the DECLARATION's own visible_when grammar
 * ("key=value" guards, `&`-ANDed — fieldVisible interprets); the
 * section owner lists names, never hand-rolled predicates. */
export interface SpecPanelRow {
  name: string
}

/** THE DYNAMIC PARAMETER PANEL (2026-09-17, the operator's shared-
 * component law): sections of the SERVED form-spec's rows at their
 * wire names — ONE mechanism every card seats, never a per-card
 * re-walk. The card owns POLICY through the DECLARATION (which
 * fields exist, their visible_when leaves); the base owns MECHANISM
 * (fetch → walker → row atoms → visibility grammar → the error
 * law). A row the door never declared renders NOTHING (no ghost,
 * no twin); a refused spec renders AS an error — never a thinner
 * panel. */
export function SpecPanel({ model, sections, values, onEdit, spec: specProp, error: errorProp }: {
  model: string
  sections: SpecPanelSection[]
  values: Record<string, unknown>
  onEdit(name: string, v: unknown): void
  /** When a host owns the served doc (e.g. co-locating a mod lane over
   * the SAME fetch), it passes the doc + error through — SpecPanel
   * skips its own fetch so the door is never hit twice. Default:
   * fetch itself. */
  spec?: FormSpecDoc | null
  error?: string | null
}): ReturnType<typeof h> {
  const owned = useFormSpec(model)
  const spec = specProp !== undefined ? specProp : owned.spec
  const error = specProp !== undefined ? (errorProp ?? null) : owned.error
  if (error !== null) {
    return h('div', {
      className: css.specGroup,
      role: 'alert',
      'data-testid': 'spec-panel-error',
    },
      h('div', { className: css.specGroupTitle }, 'form-spec failed — parameters unavailable'),
      h('div', { className: css.specHint }, error),
    )
  }
  if (spec === null) return null as unknown as ReturnType<typeof h>
  const byName = new Map(fieldsOf(spec).map((f: SpecField) => [f.name, f]))
  // THE MODEL GUARD's key (the FAMILIES-DRY law): the served doc's
  // own boarded rows resolve the serving key to its base (a composed
  // variant/quant row walks as the base the leaves declare); the
  // model prop stays the fallback (a host-handed doc resolves the
  // same way — the doc, never the caller, owns the rows).
  const guardModel = resolveFamilyKey(spec) ?? model
  return h('div', { className: css.specForm },
    sections.map((sec) => h('div', {
      className: css.specGroup,
      key: sec.title,
      ...(sec.testid !== undefined ? { 'data-testid': sec.testid } : {}),
    },
      h('div', { className: css.specGroupTitle }, sec.title),
      sec.rows.map((row) => {
        const f = byName.get(row.name)
        if (f === undefined) return null
        // the DECLARATION's own grammar gates the leaf (visible_when:
        // "key=value" guards, &-ANDed) — never a hand-rolled predicate.
        // The MODEL GUARD rides the values the same way (the base's
        // mechanism: the resolved serving family seeds the grammar,
        // the leaf declares it)
        if (!fieldVisible(f, { ...values, model: guardModel })) return null
        return h(SpecFieldRow, {
          key: row.name, f, value: values[row.name], values, onEdit,
        })
      }),
    )),
  )
}
