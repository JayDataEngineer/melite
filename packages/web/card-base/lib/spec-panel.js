/** spec-panel.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import { fieldVisible, fieldsOf, resolveFamilyKey } from "./spec.js";
import css from './card.module.css';
import { useFormSpec } from "./use-form-spec.js";
import { SpecFieldRow } from "./rows.js";
/** THE DYNAMIC PARAMETER PANEL (2026-09-17, the operator's shared-
 * component law): sections of the SERVED form-spec's rows at their
 * wire names — ONE mechanism every card seats, never a per-card
 * re-walk. The card owns POLICY through the DECLARATION (which
 * fields exist, their visible_when leaves); the base owns MECHANISM
 * (fetch → walker → row atoms → visibility grammar → the error
 * law). A row the door never declared renders NOTHING (no ghost,
 * no twin); a refused spec renders AS an error — never a thinner
 * panel. */
export function SpecPanel({ model, sections, values, onEdit, spec: specProp, error: errorProp }) {
    const owned = useFormSpec(model);
    const spec = specProp !== undefined ? specProp : owned.spec;
    const error = specProp !== undefined ? (errorProp ?? null) : owned.error;
    if (error !== null) {
        return h('div', {
            className: css.specGroup,
            role: 'alert',
            'data-testid': 'spec-panel-error',
        }, 
        // THE PANE GRAMMAR (S7 class-4 residue, 2026-11-05): a group
        // title renders a real heading element with the group-title
        // class — the reference's own section heads are h3/h4 with
        // module css (PluginManagerPage.tsx:209 `h4.sectionTitle`,
        // TrajectoryTable.tsx:846,850 `h4.usageHeading`), never a
        // div wearing the class.
        h('h4', { className: css.specGroupTitle }, 'form-spec failed — parameters unavailable'), h('div', { className: css.specHint }, error));
    }
    if (spec === null)
        return null;
    const byName = new Map(fieldsOf(spec).map((f) => [f.name, f]));
    // THE MODEL GUARD's key (the FAMILIES-DRY law): the served doc's
    // own boarded rows resolve the serving key to its base (a composed
    // variant/quant row walks as the base the leaves declare); the
    // model prop stays the fallback (a host-handed doc resolves the
    // same way — the doc, never the caller, owns the rows).
    const guardModel = resolveFamilyKey(spec) ?? model;
    return h('div', { className: css.specForm }, sections.map((sec) => h('div', {
        className: css.specGroup,
        key: sec.title,
        ...(sec.testid !== undefined ? { 'data-testid': sec.testid } : {}),
    }, 
    // THE PANE GRAMMAR (see the error arm): a real heading element.
    h('h4', { className: css.specGroupTitle }, sec.title), sec.rows.map((row) => {
        const f = byName.get(row.name);
        if (f === undefined)
            return null;
        // the DECLARATION's own grammar gates the leaf (visible_when:
        // "key=value" guards, &-ANDed) — never a hand-rolled predicate.
        // The MODEL GUARD rides the values the same way (the base's
        // mechanism: the resolved serving family seeds the grammar,
        // the leaf declares it)
        if (!fieldVisible(f, { ...values, model: guardModel }))
            return null;
        return h(SpecFieldRow, {
            key: row.name, f, value: values[row.name], values, onEdit,
        });
    }))));
}
//# sourceMappingURL=spec-panel.js.map
