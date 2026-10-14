/** rows.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h } from 'react';
import { composeUnset, fieldRequired, unsetFaceLabel, unsetFaceTip } from "./spec.js";
import { chromeCopy } from "./locales/chromeCopy.js";
import css from './card.module.css';
import { SpecAtom } from "./atoms.js";
import { ControlRow, Tip } from "./layout.js";
/** THE INFO GLYPH (hour 21): the field's declared help prose (the
 *  schema's extra.tooltip) rides a hover (i) beside the label — one
 *  definition for every card; absent prose, no glyph. The text is
 *  aria-carried (the DSH Tooltip is hover-only). */
export function infoGlyph(f) {
    if (f.tooltip === undefined || f.tooltip === '')
        return null;
    // children rides the props object — Tip's signature requires a
    // single ReactElement child (the hyperscript spread overload
    // won't carry it for a typed function component)
    return h(Tip, {
        tip: f.tooltip,
        children: h('span', { className: css.specInfo, role: 'note', 'aria-label': chromeCopy.infoGlyphAria({ tooltip: f.tooltip }) }, 'i'),
    });
}
/** THE SEED DICE (stroke 39 — the operator's QOL law): the seed
 *  knob carries the RANDOM sentinel -1 (GATE S: -1 mints a fresh
 *  seed in the lane, EVERY run). The dice sits at the key line's
 *  right end, across from the field's name: FILLED pips = random
 *  (a new seed every run), HOLLOW pips = fixed (this exact seed
 *  re-runs). The state DERIVES from the resolved value alone — no
 *  hidden mode to drift; the click writes the value: fixed → -1
 *  (random), random → a minted concrete int (the kit's own mint
 *  law, Math.floor(random * 2147483647)). Typing a number while
 *  random fixes it — the dice unfills by derivation, one source
 *  of truth. The input never paints the sentinel: random shows
 *  the placeholder, never "-1". */
export function SeedDice({ random, onToggle }) {
    return h('button', {
        type: 'button',
        className: css.specDice + (random ? ' ' + css.specDiceOn : ''),
        'data-seed-dice': random ? 'random' : 'fixed',
        'aria-pressed': random,
        'aria-label': chromeCopy.seedDiceAria,
        title: random
            ? chromeCopy.seedRandomTitle
            : chromeCopy.seedFixedTitle,
        onClick: onToggle,
    }, h('svg', { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': 'true' }, h('rect', { x: 1.4, y: 1.4, width: 13.2, height: 13.2, rx: 3.2, stroke: 'currentColor', strokeWidth: 1.3 }), 
    // the 5-pip face: 4 corners + center — filled when random,
    // hollow when fixed (one glyph, the pip fill IS the state)
    h('circle', { cx: 5, cy: 5, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }), h('circle', { cx: 11, cy: 5, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }), h('circle', { cx: 8, cy: 8, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }), h('circle', { cx: 5, cy: 11, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) }), h('circle', { cx: 11, cy: 11, r: 1.35, ...(random ? { fill: 'currentColor' } : { stroke: 'currentColor', strokeWidth: 1 }) })));
}
export function SpecFieldRow({ f, value, values, onEdit, square, wireCandidates, envelope }) {
    // the row is a DIV, not a wrapper label: the atoms self-label
    // (aria-label) — a button inside a <label> steals the label
    // association (interactive-in-label is the discouraged shape
    // anyway; the reset chips retired hour-26 — the unset path is the
    // tri-state's native undefined, no chrome needed)
    const seedKnob = f.name === 'seed';
    const seedRandom = seedKnob && (value === -1 || value === '-1');
    // THE REQUIRED STAR (the conditional face, 2026-10-12): the
    // unconditional required:true OR the required_when guards against
    // the sibling values — the form declares exactly what compose
    // demands in THIS state (the sam3 prompt law)
    const star = fieldRequired(f, values ?? {});
    return h('div', { className: css.specField }, seedKnob
        // THE DICE SEAT (stroke 39): the key line becomes a header —
        // name left, dice right, per the operator's placement law
        // ("a dice icon to the top right, across from Seed")
        ? h('div', { className: css.specFieldHead }, h('span', { className: css.specFieldKey }, f.label, star ? h('span', { className: css.specRequired }, ' *') : null, infoGlyph(f)), h(SeedDice, {
            random: seedRandom,
            onToggle: () => {
                if (seedRandom) {
                    // random → fixed: mint NOW (the kit's mint law) so
                    // the visual shows the exact seed that will run
                    onEdit(f.name, Math.floor(Math.random() * 2147483647));
                }
                else {
                    // fixed → random: the sentinel — the lane mints
                    // every run (GATE S)
                    onEdit(f.name, -1);
                }
            },
        }))
        : h('span', { className: css.specFieldKey }, f.label, star ? h('span', { className: css.specRequired }, ' *') : null, infoGlyph(f)), h(SpecAtom, {
        f,
        // THE SENTINEL NEVER PAINTS: random shows the placeholder,
        // never "-1" (the dice carries the state's face)
        value: seedRandom ? undefined : value,
        ...(seedRandom ? { placeholder: chromeCopy.seedRandomPlaceholder } : {}),
        ...(envelope !== undefined ? { envelope } : {}),
        onEdit, square, ...(wireCandidates !== undefined ? { wireCandidates } : {}),
    }));
}
/** ── THE OVERRIDE PARAMETER LAYER (hour 22 — the operator's law) ──
 *
 * OverlayKnob: ONE generic primitive for every LAYERED parameter
 * face — a sparse overlay over a base over the schema floor (h3's
 * call knobs over run stamps; any card's stages over a flow, its
 * variants over a base). It renders ONE field's control with THE
 * UNSET-FACE LAW (composeUnset, the generic surface): an unset
 * value shows EXACTLY what composes — the base layer's explicit
 * stamp, else the schema's own declared default (the admission gate
 * fills it), else 'inherit' (honest only when no schema truth
 * exists). REPLACE semantics at the write: unset edits serialize
 * ABSENT (undefined, never a sentinel).
 *
 * The field rides the SERVED envelope's walk (SpecField — the same
 * schemastery serialization every other face consumes): type, label,
 * options, default, min/max/step, tooltip — all the schema's truth,
 * never a per-card projection. Cards own only WHAT layers exist and
 * which keys ride them; this row owns the semantics, once. */
export function OverlayKnob({ name, field, value, base, ariaLabel, onEdit, }) {
    const label = field?.label ?? name;
    const face = composeUnset(base, field?.default);
    const tip = unsetFaceTip(face, field?.type === 'boolean'
        ? (v) => (v === 'true' ? chromeCopy.boolOnLabel : v === 'false' ? chromeCopy.boolOffLabel : v)
        : undefined);
    const aria = ariaLabel ?? label;
    const boolLabel = (v) => (v === 'true' ? chromeCopy.boolOnLabel : v === 'false' ? chromeCopy.boolOffLabel : v);
    // BOOLEAN FACE — on/off selects with the ghost carrying the
    // composed truth in the on/off vocabulary.
    if (field?.type === 'boolean') {
        const f = {
            name, label: aria, type: 'select',
            options: [{ value: 'true', label: chromeCopy.boolOnLabel }, { value: 'false', label: chromeCopy.boolOffLabel }],
            tooltip: tip,
        };
        return h(ControlRow, { label, density: 'sm', children: h(SpecAtom, {
                f,
                ghost: face.composed === undefined ? chromeCopy.inheritPlaceholder : boolLabel(unsetFaceLabel(face)),
                value: value === true ? 'true' : value === false ? 'false' : undefined,
                onEdit: (_, v) => onEdit(v === undefined || v === '' ? undefined : v === 'true'),
            }) });
    }
    // ENUM FACE — options ARE the schema's (declaration order); the
    // ghost names what unset composes.
    if (Array.isArray(field?.options) && field.options.length > 0) {
        const f = { name, label: aria, type: 'select', options: field.options, tooltip: tip };
        return h(ControlRow, { label, density: 'sm', children: h(SpecAtom, {
                f,
                ghost: unsetFaceLabel(face),
                value: typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined,
                onEdit: (_, v) => onEdit(v === '' ? undefined : v),
            }) });
    }
    // NUMBER FACE — the declaration's own min/max/step ride the atom;
    // the placeholder IS the composed truth (12 means the engine sends
    // 12), never a bare 'inherit' when a default composes.
    if (field?.type === 'number' || field?.type === 'integer') {
        const f = {
            name, label: aria, type: 'number',
            step: field.step ?? (field.type === 'integer' ? 1 : 0.1),
            ...(field.min !== undefined ? { min: field.min } : {}),
            ...(field.max !== undefined ? { max: field.max } : {}),
            tooltip: tip,
        };
        return h(ControlRow, { label, density: 'sm', children: h(SpecAtom, {
                f,
                value: typeof value === 'number' ? value : undefined,
                placeholder: face.composed === undefined ? chromeCopy.inheritPlaceholder : face.composed,
                onEdit: (_, v) => {
                    if (typeof v !== 'string' || v.trim() === '') {
                        onEdit(undefined);
                        return;
                    }
                    const n = Number(v);
                    onEdit(Number.isFinite(n) ? n : undefined);
                },
            }) });
    }
    // STRING FACE — free-text knobs; '' trims to the unset mark.
    const f = { name, label: aria, type: 'text', tooltip: tip };
    return h(ControlRow, { label, density: 'sm', children: h(SpecAtom, {
            f,
            value: typeof value === 'string' ? value : undefined,
            placeholder: face.composed === undefined ? chromeCopy.inheritPlaceholder : face.composed,
            onEdit: (_, v) => {
                const t = typeof v === 'string' ? v.trim() : '';
                onEdit(t === '' ? undefined : t);
            },
        }) });
}
//# sourceMappingURL=rows.js.map
