/**
 * FormCard — the action-card form renderer.
 *
 * Renders one FormSpec (from /v1/form-spec) as the card body: sections,
 * the six simple field types (select | text | textarea | number | seed |
 * boolean), tooltips, required marks — plus the ideogram_canvas FIELD SLOT,
 * which mounts IdeoCanvasField: the advanced Ideogram spatial-layout editor
 * imported from git history (see ideoField.ts / IdeoCanvasField.tsx headers).
 * Owns NO network — the deck passes the spec in and reads values out via ref
 * for the Run button.
 */
import { useImperativeHandle, useRef, type RefObject } from 'react'
import css from './deck.module.css'
import type { FormField, FormSpec } from './deck-data.ts'
import { IdeoCanvasField } from './IdeoCanvasField.tsx'

export interface FormCardHandle {
  /** Current values, coerced per declared type; empty strings dropped. */
  values(): Record<string, unknown>
  /** True when every required field has a non-empty value. */
  valid(): boolean
}

const TEXT_TYPES = new Set(['text', 'textarea'])

/**
 * Structured guide from the wire: {title, sections:[{label, body, code, list_}]}.
 * Some specs ship a plain string guide instead — both render, neither reaches
 * React as a raw object (that crashes the slot: React #31, caught live
 * 2026-08-21 on krea-2).
 */
function GuideNode({ guide }: { guide: unknown }) {
  if (typeof guide === 'string') {
    return <pre className={css.guideBody}>{guide}</pre>
  }
  if (!guide || typeof guide !== 'object') return null
  const g = guide as { title?: unknown; sections?: unknown }
  const sections = Array.isArray(g.sections) ? g.sections : []
  return (
    <div className={css.guideBody}>
      {typeof g.title === 'string' ? <p className={css.guideTitle}>{g.title}</p> : null}
      {sections.map((raw, i) => {
        const s = (raw && typeof raw === 'object' ? raw : {}) as {
          label?: unknown; body?: unknown; code?: unknown; list_?: unknown; list?: unknown
        }
        const list = Array.isArray(s.list_) ? s.list_ : (Array.isArray(s.list) ? s.list : [])
        return (
          <p key={i} className={css.guideSection}>
            {typeof s.label === 'string' ? <strong>{s.label}: </strong> : null}
            {typeof s.body === 'string' ? s.body : null}
            {typeof s.code === 'string' ? <code>{s.code}</code> : null}
            {list.filter(x => typeof x === 'string').length > 0 ? (
              <span className={css.guideList}> ({list.filter((x): x is string => typeof x === 'string').join(' · ')})</span>
            ) : null}
          </p>
        )
      })}
    </div>
  )
}

function FieldTooltip({ text }: { text: string }) {
  return (
    <span className={css.fieldHint} title={text} aria-label={text}>?</span>
  )
}

function FieldRow({ field, value, onChange }: {
  field: FormField
  value: unknown
  onChange(v: unknown): void
}) {
  const label = field.label || field.name
  const str = value === undefined || value === null ? '' : String(value)
  const commonProps = {
    id: `f-${field.name}`,
    className: css.input,
    onChange: undefined as unknown as undefined,
  }
  switch (true) {
    case field.type === 'boolean':
      return (
        <label className={css.fieldRow} htmlFor={commonProps.id}>
          <span className={css.fieldLabel}>
            {label}
            {field.required ? <span className={css.req}>*</span> : null}
          </span>
          <input
            id={commonProps.id}
            type="checkbox"
            checked={value === true}
            onChange={e => onChange(e.target.checked)}
          />
        </label>
      )
    case field.type === 'select': {
      const opts = field.options ?? []
      return (
        <div className={css.fieldRow}>
          <label className={css.fieldLabel} htmlFor={commonProps.id}>
            {label}
            {field.required ? <span className={css.req}>*</span> : null}
            {field.tooltip ? <FieldTooltip text={field.tooltip} /> : null}
          </label>
          <select
            id={commonProps.id}
            className={css.input}
            value={str}
            onChange={e => onChange(e.target.value)}
          >
            {opts.map(o => (
              <option key={o.value} value={o.value}>{o.label || o.value}</option>
            ))}
          </select>
        </div>
      )
    }
    case field.type === 'number':
      return (
        <div className={css.fieldRow}>
          <label className={css.fieldLabel} htmlFor={commonProps.id}>
            {label}
            {field.required ? <span className={css.req}>*</span> : null}
            {field.tooltip ? <FieldTooltip text={field.tooltip} /> : null}
          </label>
          <input
            id={commonProps.id}
            className={css.input}
            type="number"
            value={str}
            step={field.step ?? undefined}
            onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      )
    case field.type === 'seed':
      return (
        <div className={css.fieldRow}>
          <label className={css.fieldLabel} htmlFor={commonProps.id}>
            {label}
            {field.tooltip ? <FieldTooltip text={field.tooltip} /> : null}
          </label>
          <input
            id={commonProps.id}
            className={css.input}
            type="number"
            value={str}
            onChange={e => onChange(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </div>
      )
    case TEXT_TYPES.has(field.type):
      return (
        <div className={css.fieldRow}>
          <label className={css.fieldLabel} htmlFor={commonProps.id}>
            {label}
            {field.required ? <span className={css.req}>*</span> : null}
            {field.tooltip ? <FieldTooltip text={field.tooltip} /> : null}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={commonProps.id}
              className={css.textarea}
              rows={field.name === 'prompt' || field.name === 'negative_prompt' ? 4 : 2}
              value={str}
              onChange={e => onChange(e.target.value)}
            />
          ) : (
            <input
              id={commonProps.id}
              className={css.input}
              type="text"
              value={str}
              onChange={e => onChange(e.target.value)}
            />
          )}
        </div>
      )
    default:
      // Unknown type: honest passthrough as text so new schema types stay usable.
      return (
        <div className={css.fieldRow}>
          <label className={css.fieldLabel} htmlFor={commonProps.id}>
            {label}
            <span className={css.typeBadge}>{field.type}</span>
          </label>
          <input
            id={commonProps.id}
            className={css.input}
            type="text"
            value={str}
            onChange={e => onChange(e.target.value)}
          />
        </div>
      )
  }
}

export function FormCard({ spec, handle }: { spec: FormSpec; handle?: RefObject<FormCardHandle | null> }) {
  const values = useRef<Record<string, unknown>>({})
  // Seed defaults from the spec on spec change.
  for (const f of spec.fields) {
    if (!(f.name in values.current)) values.current[f.name] = f.default ?? ''
  }
  useImperativeHandle(handle, () => ({
    values: () => {
      const out: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(values.current)) {
        if (v === '' || v === null || v === undefined) continue
        out[k] = v
      }
      return out
    },
    valid: () => spec.fields.every(f => !f.required || String(values.current[f.name] ?? '') !== ''),
  }), [spec])

  const sections = new Map<string, FormField[]>()
  for (const f of spec.fields) {
    const key = f.section ?? 'Parameters'
    if (!sections.has(key)) sections.set(key, [])
    sections.get(key)!.push(f)
  }

  return (
    <div className={css.formCard} data-form={spec.form}>
      {[...sections.entries()].map(([name, fields]) => (
        <section key={name} className={css.formSection} data-section={name}>
          <h4 className={css.sectionTitle}>{name}</h4>
          {fields.map(f => (
            f.type === 'ideogram_canvas' ? (
              <div key={f.name} className={css.fieldRow} data-field={f.name}>
                <span className={css.fieldLabel}>
                  {f.label || f.name}
                  {f.required ? <span className={css.req}>*</span> : null}
                  {f.tooltip ? <FieldTooltip text={f.tooltip} /> : null}
                </span>
                <IdeoCanvasField
                  value={values.current[f.name]}
                  onChange={v => { values.current[f.name] = v }}
                  getValues={() => ({ ...values.current })}
                  setSibling={(name, v) => { values.current[name] = v }}
                />
              </div>
            ) : (
              <FieldRow
                key={f.name}
                field={f}
                value={values.current[f.name]}
                onChange={v => { values.current[f.name] = v }}
              />
            )
          ))}
        </section>
      ))}
      {spec.guide ? (
        <details className={css.guide}>
          <summary>Prompt guide</summary>
          <GuideNode guide={spec.guide} />
        </details>
      ) : null}
    </div>
  )
}
