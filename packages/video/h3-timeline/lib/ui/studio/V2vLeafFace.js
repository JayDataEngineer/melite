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
import { Button, Input, Menu } from '@deepseek-ai/dsh-client-ui-primitives';
import { studioCopy } from "./studioCopy.js";
import { splitCallsAt } from "./v2vSplit.js";
/** The carry menu's three rows — the §0.9 vocabulary, the same
 *  labels the strip head's carry menu serves (one dictionary). */
const CARRY_ROWS = [
    { id: 'cut', label: studioCopy.splitCarryStock },
    { id: 'extend', label: studioCopy.splitCarryCarry },
    { id: 'carry+keyframe', label: studioCopy.splitCarryKeyframe },
];
/** the carry's own label (the three-row universe is closed — a
 *  Record, never a find-with-fallback that can reach nothing). */
const CARRY_LABEL = {
    cut: studioCopy.splitCarryStock,
    extend: studioCopy.splitCarryCarry,
    'carry+keyframe': studioCopy.splitCarryKeyframe,
};
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
const FACE = { display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 };
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
const SPLIT_SEAT = { display: 'flex', alignItems: 'center', gap: 4, padding: '2px 2px 0' };
const REFUSAL = { fontSize: 9, lineHeight: 1.35, color: 'var(--dsw-alias-state-error-primary)', overflowWrap: 'anywhere' };
/** The windows face itself: the spans list + the split seat. */
export function V2vLeafFace(props) {
    const [splitAtSec, setSplitAtSec] = useState('');
    const [carry, setCarry] = useState('cut');
    const [menuOpen, setMenuOpen] = useState(false);
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
    return (_jsxs("div", { style: FACE, "data-v2v-face": "windows", children: [_jsx("div", { style: HEAD, "data-v2v-head": true, children: studioCopy.v2vFormHead }), _jsx("div", { style: HINT, "data-v2v-hint": true, children: studioCopy.v2vFormHint }), calls.length === 0
                ? _jsx("div", { style: HINT, "data-v2v-empty": true, children: studioCopy.v2vFormEmptyNote })
                : _jsx("ol", { style: WINDOWS, "data-v2v-windows": true, children: calls.map((c, i) => (_jsx("li", { style: WINDOW, "data-v2v-window": i, children: studioCopy.v2vWindowRow(i + 1, secs(c.start_frame), secs(c.end_frame), i > 0 ? (c.transition ?? 'cut') : '', c.text ?? '') }, i))) }), _jsxs("div", { style: SPLIT_SEAT, "data-v2v-split-seat": true, children: [_jsx(Input, { type: "number", min: 0, step: 0.1, style: { flex: '1 1 72px', minWidth: 0 }, "data-testid": "v2v-split-at", "aria-label": studioCopy.v2vFormSplitLabel, title: studioCopy.v2vFormSplitTip, placeholder: studioCopy.v2vFormSplitPlaceholder, value: splitAtSec, onInput: (e) => { setSplitAtSec(e.target.value); }, onChange: (e) => { setSplitAtSec(e.target.value); } }), _jsx(Menu, { open: menuOpen, onClose: () => { setMenuOpen(false); }, compact: true, portal: true, items: CARRY_ROWS, selectedId: carry, onSelect: (id) => {
                            setMenuOpen(false);
                            setCarry(id);
                        }, anchor: _jsx(Button, { variant: "outline", size: "sm", "data-testid": "v2v-split-carry", "aria-label": studioCopy.splitCarryLabel, title: studioCopy.splitCarryTip, onClick: () => { setMenuOpen(!menuOpen); }, children: CARRY_LABEL[carry] }) }), _jsx(Button, { variant: "primary", size: "sm", "data-testid": "v2v-split-cut", "aria-label": studioCopy.v2vFormCutAria, title: studioCopy.v2vFormSplitTip, onClick: press, children: studioCopy.v2vFormCutAria })] }), refusal !== null ? _jsx("div", { style: REFUSAL, "data-v2v-refusal": true, children: refusal }) : null] }));
}
//# sourceMappingURL=V2vLeafFace.js.map
