import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/** V2vLeafFace.tsx — THE VIDEO2VIDEO FORM'S WINDOWS FACE (queue 11
 *  reopened, operator 2026-11-08: "Doesn't have a cut here. … NO
 *  WINDOWS IN THE FORM!" — their correction of my strip-head-only
 *  reading: the leaf form CARRIES the windows and the
 *  split-by-timestamp seat "with the option to select how context
 *  is carried").
 *
 *  THE SEAM: the paint/bbox/orbit law (stroke 95 — the mod popup
 *  CARRIES the visual preview): the host (the estate's card view)
 *  delivers this component through card-base's `v2vFace` prop; the
 *  edit kind's DECL seats `leaf_face: 'v2v-windows'`; the leaf
 *  embeds the face above its field stack. The face reads the ROW's
 *  calls (the same windows the timeline strip draws under the
 *  swapped calls section — ONE truth, two views of one draft) and
 *  commits the next array through the envelope channel (v2vCommit
 *  → onEdit + onPatch on `calls`).
 *
 *  THE LAW is v2vSplit.ts's pure split — the SAME lattice snap and
 *  carry reframe the strip head's mutation updaters ride; the
 *  parity arm in the form's wall (leaf-v2v-face.spec.tsx) judges
 *  both doors against one fixture. */
import { useState } from 'react';
import { Button, Input } from '@deepseek-ai/dsh-client-ui-primitives';
import { studioCopy } from "./studioCopy.js";
import { splitCallsAt } from "./v2vSplit.js";
import { isStarterCallText } from "./commissions.js";
/** The split seat's three states — ONE vocabulary everywhere (the
 *  operator's 2026-11-09 segmented law: "There is ONE knob for
 *  carry" — the collapsed anchor hid the two carry modes): all
 *  three states render VISIBLE as a segmented control, never behind
 *  a dropdown. The labels are the strip seam editor's own compact
 *  words (CallCard's seamModeRow, verbatim from studioCopy) — the
 *  leaf's split seat, the leaf's per-window override, and the
 *  strip's per-seam editor all speak Stock / Carry / Carry +
 *  keyframe; the long teaching ("no carry", "22-frame overlap")
 *  rides the tips, verbatim. The long splitCarry rows stay on the
 *  strip head's own split menu — its door, its words. */
const CARRY_ROWS = [
    { id: 'cut', label: studioCopy.seamModeStock, tip: studioCopy.seamModeStockTip },
    { id: 'extend', label: studioCopy.seamModeCarry, tip: studioCopy.seamModeCarryTip },
    { id: 'carry+keyframe', label: studioCopy.seamModeCarryKeyframe, tip: studioCopy.seamModeCarryKeyframeTip },
];
/** The per-seam rows — the strip seam editor's own compact
 *  vocabulary (CallCard's seamModeRow, verbatim labels + tips): the
 *  leaf's per-window override speaks the same three states as the
 *  strip head, never a second spelling. */
const SEAM_ROWS = [
    { id: 'cut', label: studioCopy.seamModeStock, tip: studioCopy.seamModeStockTip },
    { id: 'extend', label: studioCopy.seamModeCarry, tip: studioCopy.seamModeCarryTip },
    { id: 'carry+keyframe', label: studioCopy.seamModeCarryKeyframe, tip: studioCopy.seamModeCarryKeyframeTip },
];
/**
 * THE FACE'S OWN APPEARANCE (inline, the paint/bbox/orbit law —
 * stroke 95: an embedded leaf face styles ITSELF, never a css
 * module in the emit closure and never the host's stylesheet; the
 * v2vFace.ts export law "no CSS" stays true). The recipes are the
 * studio's established vocabulary: the callRefs panel card for
 * each window row, the modStageCaption voice for the head, the
 * seamModeRow layout for the split seat — dsw tokens for every
 * color, the face reads native in any host. (The appearance
 * audit, operator 2026-11-09: "the modal that appears for vid2vid
 * … looks awful" — the face previously shipped ZERO styling: the
 * windows rendered as a browser-default <ol> with decimal
 * numerals and list indent inside the mod popup's 11px stage
 * column, and the split seat wrapped as unstyled inline blocks.) */
const FACE = { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 };
const HEAD = { fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.7 };
const HINT = { fontSize: 9, lineHeight: 1.35, color: 'var(--dsw-alias-label-tertiary)' };
const WINDOWS = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 };
const WINDOW = {
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border-l1)',
    background: 'var(--dsw-alias-bg-layer-1)',
    padding: '4px 6px',
    fontVariantNumeric: 'tabular-nums',
    fontSize: 10,
    lineHeight: 1.4,
    overflowWrap: 'anywhere',
};
const SPLIT_SEAT = { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 2px 0', flexWrap: 'wrap' };
/** the segmented three-state (split seat + per-seam rows share the
 *  recipe — inline, the face's own appearance law above). */
const SEGMENT = { display: 'inline-flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' };
/** the per-seam override seat — the compact twin of the strip's
 *  seamModeRow, under its own window's row. */
const SEAM_SEAT = { display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 };
/** the per-row split seat — seconds INTO this row (one recipe on
 *  every window row, the global seat's own words). */
const ROW_SPLIT = { display: 'flex', gap: 4, alignItems: 'center', marginTop: 4, flexWrap: 'wrap' };
const REFUSAL = { fontSize: 9, lineHeight: 1.35, color: 'var(--dsw-alias-state-error-primary)', overflowWrap: 'anywhere' };
/** The windows face itself: the spans list + the split seat. */
export function V2vLeafFace(props) {
    const [splitAtSec, setSplitAtSec] = useState('');
    /** every window row's own split-time-in-seconds field (the
     *  operator's 2026-11-09 order: "the ability in EVERY window to
     *  set the split time by seconds" — seconds stated INTO that
     *  row, never one global field only). */
    const [rowSec, setRowSec] = useState({});
    const [carry, setCarry] = useState('cut');
    const [refusal, setRefusal] = useState(null);
    const calls = props.value.calls;
    const secs = (frames) => (frames / (props.value.fps || 24)).toFixed(2);
    const press = () => {
        const stated = Number(splitAtSec);
        if (splitAtSec.trim() === '' || !Number.isFinite(stated) || stated < 0) {
            setRefusal(studioCopy.v2vFormRefusal);
            return;
        }
        const next = splitCallsAt(calls, Math.round(stated * (props.value.fps || 24)), carry);
        if (next === null) {
            setRefusal(studioCopy.v2vFormRefusal);
            return;
        }
        setRefusal(null);
        props.onChange(next);
    };
    /** THE PER-ROW SPLIT PRESS: the stated seconds are INTO the named
     *  row (frame = row.start + s·fps) — a value past the row's own
     *  end REFUSES (it never silently resolves into another window,
     *  the boundary law the global seat rides); grid legality stays
     *  splitCallsAt's own refusal. */
    const pressRow = (i) => {
        const raw = rowSec[i] ?? '';
        const stated = Number(raw);
        const row = calls[i];
        if (raw.trim() === '' || !Number.isFinite(stated) || stated < 0 || row === undefined) {
            setRefusal(studioCopy.v2vFormRefusal);
            return;
        }
        const frame = Math.round(row.start_frame + stated * (props.value.fps || 24));
        if (frame <= row.start_frame || frame >= row.end_frame) {
            setRefusal(studioCopy.v2vFormRefusal);
            return;
        }
        const next = splitCallsAt(calls, frame, carry);
        if (next === null) {
            setRefusal(studioCopy.v2vFormRefusal);
            return;
        }
        setRefusal(null);
        props.onChange(next);
    };
    /** THE PER-SEAM OVERRIDE (operator 2026-11-09: "no per-window
     *  seam editor in the leaf" — the data carried per-seam
     *  transition, the engine reads it, the split sets it, but the
     *  leaf offered no control to change an EXISTING seam): every
     *  non-first window carries the same compact 3-state segmented
     *  the strip head serves, bound to THAT row's transition and
     *  committed through onChange (the leaf's own envelope channel —
     *  one truth, two views of one draft). */
    const setSeam = (i, value) => {
        const next = calls.map((w, j) => (j === i ? { ...w, transition: value } : w));
        props.onChange(next);
    };
    return (_jsxs("div", { style: FACE, "data-v2v-face": "windows", children: [_jsx("div", { style: HEAD, "data-v2v-head": true, children: studioCopy.v2vFormHead }), _jsx("div", { style: HINT, "data-v2v-hint": true, children: studioCopy.v2vFormHint }), calls.length === 0
                ? _jsx("div", { style: HINT, "data-v2v-empty": true, children: studioCopy.v2vFormEmptyNote })
                : _jsx("ol", { style: WINDOWS, "data-v2v-windows": true, children: calls.map((c, i) => (_jsxs("li", { style: WINDOW, "data-v2v-window": i, children: [studioCopy.v2vWindowRow(i + 1, secs(c.start_frame), secs(c.end_frame), i > 0 ? (c.transition ?? 'extend') : '', isStarterCallText(c.text ?? '') ? '' : (c.text ?? '')), _jsxs("div", { style: ROW_SPLIT, "data-v2v-row-split": i, children: [_jsx(Input, { type: "number", min: 0, step: 0.1, style: { flex: '1 1 56px', minWidth: 0, width: 56 }, "data-testid": `v2v-row-split-at-${i}`, "aria-label": `${studioCopy.v2vFormSplitLabel} — W${i + 1}`, title: studioCopy.v2vFormSplitTip, placeholder: studioCopy.v2vFormSplitPlaceholder, value: rowSec[i] ?? '', onInput: (e) => { setRowSec({ ...rowSec, [i]: e.target.value }); }, onChange: (e) => { setRowSec({ ...rowSec, [i]: e.target.value }); } }), _jsx(Button, { variant: "outline", size: "sm", "data-testid": `v2v-row-split-${i}`, "aria-label": `${studioCopy.v2vFormCutAria} — W${i + 1}`, title: studioCopy.v2vFormSplitTip, onClick: () => { pressRow(i); }, children: studioCopy.v2vFormCutAria })] }), i > 0
                                ? _jsx("div", { style: SEAM_SEAT, "data-v2v-seam": i, role: "group", "aria-label": `${studioCopy.seamModeAria} — W${i + 1}`, children: SEAM_ROWS.map((row) => {
                                        const active = (c.transition ?? 'extend') === row.id;
                                        return (_jsx(Button, { variant: active ? 'primary' : 'outline', size: "sm", "data-testid": `v2v-seam-${i}-${row.id}`, "aria-pressed": active, "aria-label": `${studioCopy.seamModeAria}: ${row.label}`, title: row.tip, onClick: () => { setSeam(i, row.id); }, children: row.label }, row.id));
                                    }) })
                                : null] }, i))) }), _jsxs("div", { style: SPLIT_SEAT, "data-v2v-split-seat": true, children: [_jsx(Input, { type: "number", min: 0, step: 0.1, style: { flex: '1 1 72px', minWidth: 0 }, "data-testid": "v2v-split-at", "aria-label": studioCopy.v2vFormSplitLabel, title: studioCopy.v2vFormSplitTip, placeholder: studioCopy.v2vFormSplitPlaceholder, value: splitAtSec, onInput: (e) => { setSplitAtSec(e.target.value); }, onChange: (e) => { setSplitAtSec(e.target.value); } }), _jsx("div", { style: SEGMENT, role: "group", "aria-label": studioCopy.splitCarryLabel, "data-testid": "v2v-split-carry", children: CARRY_ROWS.map((row) => {
                            const active = carry === row.id;
                            return (_jsx(Button, { variant: active ? 'primary' : 'outline', size: "sm", "data-testid": `v2v-split-carry-${row.id}`, "aria-pressed": active, "aria-label": `${studioCopy.splitCarryLabel}: ${row.label}`, title: row.tip, onClick: () => { setCarry(row.id); }, children: row.label }, row.id));
                        }) }), _jsx(Button, { variant: "primary", size: "sm", "data-testid": "v2v-split-cut", "aria-label": studioCopy.v2vFormCutAria, title: studioCopy.v2vFormSplitTip, onClick: press, children: studioCopy.v2vFormCutAria })] }), refusal !== null ? _jsx("div", { style: REFUSAL, "data-v2v-refusal": true, children: refusal }) : null] }));
}
//# sourceMappingURL=V2vLeafFace.js.map
