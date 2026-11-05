/** spec-panel.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import { type FormSpecDoc } from './spec.js';
/** One dynamic-parameter section: a title riding the master form's
 * own group chrome, a stable testid for the behaviorals, and its
 * rows. */
export interface SpecPanelSection {
    title: string;
    testid?: string;
    rows: SpecPanelRow[];
}
/** One dynamic-parameter row: the served field at its WIRE name.
 * Row VISIBILITY rides the DECLARATION's own visible_when grammar
 * ("key=value" guards, `&`-ANDed — fieldVisible interprets); the
 * section owner lists names, never hand-rolled predicates. */
export interface SpecPanelRow {
    name: string;
}
/** THE DERIVED SECTIONS (the motion-params journey audit's class
 * cure, 2026-10-16 — dev_docs/audits/journey/motion-params-dry-2026-10-16.md
 * F3: the hand-typed sections list is the killed h3 shape, burn #2).
 * The served spec's own fields group and order themselves: the host
 * names the groups it seats (with each group's title/testid chrome),
 * the DECLARATION supplies the rows in declared order. A group with
 * no served rows renders nothing; a served row whose group the host
 * did not name stays unseated (the host owns its partition — the
 * seat-parity census judges that partition both directions). This
 * replaces every `sections={[...]}` hand list: a declared knob can
 * never again drop out of the panel behind a list nobody remembered
 * to extend (the cfg_type class). */
export declare function panelSectionsOf(spec: FormSpecDoc | null | undefined, named: Record<string, {
    title: string;
    testid?: string;
}>): SpecPanelSection[];
/** THE DYNAMIC PARAMETER PANEL (2026-09-17, the operator's shared-
 * component law): sections of the SERVED form-spec's rows at their
 * wire names — ONE mechanism every card seats, never a per-card
 * re-walk. The card owns POLICY through the DECLARATION (which
 * fields exist, their visible_when leaves); the base owns MECHANISM
 * (fetch → walker → row atoms → visibility grammar → the error
 * law). A row the door never declared renders NOTHING (no ghost,
 * no twin); a refused spec renders AS an error — never a thinner
 * panel. */
export declare function SpecPanel({ model, sections, values, onEdit, spec: specProp, error: errorProp }: {
    model: string;
    sections: SpecPanelSection[];
    values: Record<string, unknown>;
    onEdit(name: string, v: unknown): void;
    /** When a host owns the served doc (e.g. co-locating a mod lane over
     * the SAME fetch), it passes the doc + error through — SpecPanel
     * skips its own fetch so the door is never hit twice. Default:
     * fetch itself. */
    spec?: FormSpecDoc | null;
    error?: string | null;
}): ReturnType<typeof h>;
//# sourceMappingURL=spec-panel.d.ts.map
