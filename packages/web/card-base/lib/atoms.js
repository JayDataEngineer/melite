/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Menu, Pill, Switch } from '@deepseek-ai/dsh-client-ui-primitives';
import { InputSquare, estateInputUrl } from "./square.js";
import { titleCaseId } from "./spec.js";
import css from './card.module.css';
import { useSquareProvider } from "./square-provider.js";
import { chromeCopy } from "./locales/chromeCopy.js";
export function SourceRow(props) {
    const field = {
        // THE EDGE-BEARING NAME (the list-seat law): a caller that owns
        // a declared input edge (the stack's owning field) threads it so
        // the From-flow picker narrows by THAT edge's kind; the legacy
        // synthetic name carries no edge and lists unfiltered.
        name: props.name ?? '__source_row__',
        label: props.label,
        type: props.kind === 'image' ? 'image' : 'file',
    };
    const onEditField = useCallback((name, v) => {
        void name;
        // NO COERCION (the string-verbs proof): the provider's onEdit
        // call sites all pass strings — pick/onAsset are string-typed,
        // clear is the '' literal, upload passes ONLY the estate name
        // (refusals ride host.error, never the value seam — 2026-10-24)
        // — so a non-string can never arrive.
        props.onEdit(v);
    }, [props.onEdit]);
    const { square, wireMenu } = useSquareProvider(onEditField, {
        candidates: props.candidates ?? [],
        ...(props.candidatesFor !== undefined ? { candidatesFor: props.candidatesFor } : {}),
        ...(props.loadMedia !== undefined ? { loadMedia: props.loadMedia } : {}),
        ...(props.onFile !== undefined ? { onFile: props.onFile } : {}),
        ...(props.accept !== undefined ? { accept: props.accept } : {}),
        ...(props.renderSourcePick !== undefined ? { renderSourcePick: props.renderSourcePick } : {}),
    });
    // NO HOST GUARD (the slot-shape proof): field.type is image|file
    // by construction (line 324) and square() returns undefined only
    // for non-slot types — host is ALWAYS defined here, so both the
    // shown pick and the verbs spread below ride it directly.
    const host = square(field);
    // THE PERSISTED-UPLOAD MIRROR (2026-10-13): host.display is the
    // fresh-upload data-URL mirror — IN-MEMORY ONLY, empty after
    // close/reopen. The fallback value is the estate path the param
    // persists ('data/input/x.png'), which no <img> can fetch; the
    // assets door serves it. Without this arm the reopened cell
    // rendered a BLANK square for a value that was alive the whole
    // time (the operator's live burn: "works perfect until I close
    // the card and re-open").
    const shown = host.display
        ?? (typeof props.value === 'string' ? estateInputUrl(props.value) : null)
        ?? props.value ?? null;
    return h('div', { className: css.sourceRow, 'data-source-row': props.label }, wireMenu, h(InputSquare, {
        label: props.hideLabel === true ? '' : props.label,
        ...(props.ariaLabel !== undefined ? { ariaLabel: props.ariaLabel } : {}),
        // THE VALUE RIDES VERBATIM (2026-11-04, the detach law): the
        // square owns the renderability split (thumb / mesh / the held
        // face) and the ✕ rides the HELD fact — a bare name or an
        // unresolved path arrives here as a value, never null-ed into
        // the PLUS face the slot could not detach from.
        value: shown,
        ...(host.verbs),
    }), 
    // THE REFUSAL FACE (2026-10-24): a failed upload's voice renders
    // UNDER the square in the danger color — it NEVER enters the
    // value seam, so it can never land in the input stack as a
    // phantom "image reference" beside the retry's real path.
    typeof host.error === 'string' && host.error !== ''
        ? h('p', {
            className: css.sourceRowErr,
            'data-slot-error': props.label,
            title: host.error,
            role: 'alert',
        }, host.error)
        : null);
}
/** THE DSH MENU SELECT for one spec field (the axes idiom,
 *  promoted): owner-held open bit, trigger Button rendered in place
 *  (aria-label = the field label), compact portaled rows, check
 *  selection. axes' AxisMenuSelect delegates here — one seam. */
export function SpecMenuSelect(props) {
    const [open, setOpen] = useState(false);
    const current = props.rows.find((r) => r.id === props.value);
    return h(Menu, {
        open: open && props.disabled !== true,
        onClose: () => { setOpen(false); },
        compact: true,
        portal: true,
        items: props.rows.map((r) => ({ id: r.id, label: r.label })),
        selectedId: props.value,
        onSelect: (id) => { setOpen(false); props.onPick(id); },
        anchor: h(Button, {
            type: 'button',
            size: 'sm',
            variant: 'outline',
            className: css.specSelect,
            'aria-label': props.label,
            ...(props.markers ?? {}),
            ...(props.disabled === true ? { disabled: true } : {}),
            // (operator 2026-11-05) the anchor's hover title falls back
            // to the current row's own label — a titled face, never mute.
            ...(props.title !== undefined || current !== undefined
                ? { title: props.title ?? current?.label }
                : {}),
            onClick: () => { setOpen(!open); },
        }, 
        // THE FACE'S OWN CLAMP (operator 2026-11, defect 2: "pills /
        // badges for the dropdown buttons OVERFLOWS when the contents
        // are too long, instead of just being cut off"): the label rides
        // its OWN span, not the button's text node. DSH's Button base is
        // display:inline-flex (Button.module.css .button) and a flex
        // container ignores text-overflow — .specSelect's own
        // display:block wins only while the cascade order holds, which
        // made the bug "sometimes". A flex ITEM with min-width:0 +
        // overflow:hidden clamps regardless of which stylesheet lands
        // last; the full text stays on the title (the 2026-11-05 face).
        h('span', { className: css.specSelectText }, current?.label ?? '')),
    });
}
/** THE TRI-STATE ATOM (hour 15, stroke C): inherit / on / off —
 *  promoted from h3's studio-local TriControl (same semantics, same
 *  option order). Serves schema-bound fields of type 'tri' AND the
 *  standalone rail rows that hand-rolled the select before. */
export function TriStateAtom({ label, value, onEdit, name, disabled }) {
    // THE MENU (S7h): inherit/on/off as three rows — the ids map
    // back at the pick ('' = inherit = undefined).
    return h(SpecMenuSelect, {
        label,
        value: value === undefined ? '' : String(value),
        rows: [
            { id: '', label: chromeCopy.inheritPlaceholder },
            { id: 'true', label: chromeCopy.boolOnLabel },
            { id: 'false', label: chromeCopy.boolOffLabel },
        ],
        ...(disabled === true ? { disabled: true } : {}),
        onPick: (id) => { onEdit(name, id === '' ? undefined : id === 'true'); },
    });
}
/** The slider's local display during a drag (the settle law's
 *  carrier): local owns the bubble while dragging; an external move
 *  of the backing value (agent write, revive, another card opened)
 *  reclaims the display. */
function useLocalSliderValue(value) {
    // Number('') === 0 in JS — a blank backing (the clear's own
    // write-through) must read as the BLANK (NaN), never as zero: a
    // knob that shows 0 after a clear paints a number the draft
    // never held (the no-fallback law).
    const num = typeof value === 'string' && value.trim() === ''
        ? Number.NaN
        : typeof value === 'number' ? value : Number(value);
    const [local, setLocal] = useState(null);
    useEffect(() => { setLocal(null); }, [num]); // eslint-disable-line react-hooks/exhaustive-deps
    // NO FALLBACK (operator, hour 26): a HELD value that is not a
    // finite number is an ERROR, surfaced by the atom (null = the
    // refused face) — NEVER the field default painted over it while
    // the run composes the poison. ABSENT alone may seed (the
    // initial-value law, resolved upstream by resolveValue).
    return {
        value: local !== null ? local : (Number.isFinite(num) ? num : null),
        set: setLocal,
    };
}
/** THE SETTLE LAW for slider atoms (hour 15, stroke C — grown from
 *  mask-studio's draft absorber, 2026-08-10): a drag fires input
 *  60×/sec; if every step wrote to the card, updateStageParams →
 *  _recomputeKeys would hash multi-MB paint data 60×/sec and freeze
 *  the editor. The atom shows the drag locally and persists ONCE on
 *  settle (the change event = release / keyboard step). External
 *  writes (agent, revive) re-sync the display when the backing
 *  value actually moves.
 *
 *  THE VARIANT-ENVELOPE CLAMP (the dragbar law, 2026-10-13): the
 *  track clamps to the ACTIVE variant's declared envelope (min and
 *  max intersected with the field's own bounds) — an
 *  out-of-envelope value cannot be dragged or saved from the form
 *  while the wire gate stays loud for API authors. A HELD value
 *  outside the envelope renders AS ITSELF, refused (the
 *  no-fallback law): the track never paints a clamped neighbor over
 *  an impossible contract. @param f the knob's field row.
 *  @param value the resolved display value.
 *  @param onEdit the settle seam.
 *  @param envelope the active variant's [min,max] for THIS knob,
 *  null when the variant declares none. */
export function SpecSliderAtom({ f, value, onEdit, envelope }) {
    const shown = useLocalSliderValue(value);
    // THE BOX'S OWN SETTLE (the blank law): a clear writes '' through
    // (the draft coerces at patch) but must NOT unseat the knob —
    // the route would flap the control mid-edit and swallow the next
    // keystroke. The box keeps its own local TEXT: blank or mid-typed
    // strings show as typed; the track holds its last finite number.
    const [boxText, setBoxText] = useState(null);
    useEffect(() => { setBoxText(null); }, [shown.value]); // eslint-disable-line react-hooks/exhaustive-deps
    // the refused face: the held value is not a number the run can
    // compose — rendered AS ITSELF (raw), the slider refuses to
    // imply a healthy number it does not hold. A BLANK ('') is not
    // poison: it is the clear's own write, the knob keeps its seat.
    if (shown.value === null && value !== '') {
        return h('span', { className: css.specSliderRow, 'data-refused': f.name }, h('span', { className: css.specSliderValue }, String(value) + ' — REFUSED: not a number'));
    }
    // the envelope's refused face: a HELD out-of-envelope number is
    // an impossible contract — rendered as itself, never clamped over.
    // A disjoint envelope (its min above the field's max or its max
    // below the field's min) admits no value at all — the knob is
    // refused outright, the DECL's own broken state named.
    const clamped = envelope !== undefined && envelope !== null
        ? {
            min: Math.max(f.min ?? Number.NEGATIVE_INFINITY, envelope[0]),
            max: Math.min(f.max ?? Number.POSITIVE_INFINITY, envelope[1]),
        }
        : null;
    if (clamped !== null && (clamped.min > clamped.max
        || (shown.value !== null && (shown.value < clamped.min || shown.value > clamped.max)))) {
        const lo = clamped.min > clamped.max ? Math.min(clamped.min, clamped.max) : clamped.min;
        const hi = clamped.min > clamped.max ? Math.max(clamped.min, clamped.max) : clamped.max;
        return h('span', { className: css.specSliderRow, 'data-refused': f.name }, h('span', { className: css.specSliderValue }, (shown.value === null ? String(value) : String(shown.value)) + ' — OUTSIDE the variant envelope ['
            + String(lo) + ', ' + String(hi) + ']'));
    }
    // THE MIXED KNOB (the operator's 2026-11-05 order: "if we could
    // change to the swipe and type in mix parameters selection knobs
    // that would be ideal"): one control, two faces sharing one
    // value — the range swipes (the settle law below), the typed box
    // types (each landed keystroke persists — typing is deliberate,
    // never a 60Hz drag). The VALUE still travels raw on every face;
    // coerce once at patch, the estate's law.
    // The blank state (backing '' after a clear): the box shows its
    // own text, the track holds the nearest bound until a number
    // lands — the knob never unseats mid-edit.
    const trackValue = shown.value ?? (clamped !== null ? Math.min(Math.max(0, clamped.min), clamped.max) : (f.min ?? 0));
    const boxValue = boxText ?? String(shown.value ?? '');
    // ARGUED RAW SEAT (S7c/S7g/S7j, the slider law): the catalog ships
    // no slider/range atom (ui-primitives types/index.d.ts export set),
    // and DSH's own field widget renders its embedded control raw
    // (settings-form fields.tsx:95-106) — the native range stays.
    return h('span', { className: css.specSliderRow }, h('input', {
        className: css.specSlider,
        type: 'range',
        min: clamped !== null ? clamped.min : (f.min ?? 0),
        max: clamped !== null ? clamped.max : (f.max ?? 10),
        step: f.step ?? 0.1,
        value: trackValue,
        onInput: (e) => { shown.set(Number(e.target.value)); },
        onChange: (e) => { onEdit(f.name, e.target.value); },
        'aria-label': f.label + ' ' + chromeCopy.sliderAriaWord,
    }), h(Input, {
        type: 'number',
        min: clamped !== null ? clamped.min : f.min,
        max: clamped !== null ? clamped.max : f.max,
        step: f.step,
        className: css.specSliderInput,
        value: boxValue,
        onChange: (e) => {
            // the typed face writes raw through EXACTLY like the number
            // face it replaced (a clear persists '' — the draft coerces
            // at patch; the settled knob re-syncs when a number lands).
            // The number echo keeps the track live while the box owns
            // its own text (the settle law above).
            const raw = e.target.value;
            setBoxText(raw);
            if (raw !== '') {
                const n = Number(raw);
                if (Number.isFinite(n))
                    shown.set(n);
            }
            onEdit(f.name, raw);
        },
        'aria-label': f.label,
    }));
}
/** One spec atom — typed by the declaration, edited as a raw string
 *  while typing (decimal dots survive; coercion happens once at patch). */
export function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost, envelope }) {
    // THE INPUT SQUARE (the old law: slot-shaped values render the ONE
    // square with the three source verbs — never a bare text Input).
    // THE CONSTRUCTION LAW: an emitted image/file input constructs THIS
    // component — automatically, for every card, no per-card handling.
    // MESH BOARDS THE SAME FACE (primitive ③, 2026-09-21): a 'mesh'
    // wtype field is slot-shaped — the square's thumb is the inline
    // mini GLB viewport, the verbs are the same three sources.
    if ((f.type === 'image' || f.type === 'file' || f.type === 'mesh') && square !== undefined) {
        // THE PERSISTED-UPLOAD MIRROR (2026-10-13, the rail's own arm):
        // square.display is the fresh-upload data-URL mirror — IN-MEMORY
        // ONLY, deleted on commit (square-provider's mirror-dies law).
        // The fallback value is the estate path the param persists
        // ('data/input/x.png'), which no <img> can fetch; the assets
        // door serves it. SourceRow already resolves this arm — the rail
        // MUST too: without it every committed image upload renders a
        // BLANK square (isImageUrl rejects the relative path), while
        // .glb values pass via isMeshUrl's path-agnostic vocabulary
        // (the operator's live burn: "upload succeeds, no preview").
        const shown = square.display !== undefined && square.display !== null && square.display !== ''
            ? square.display
            : (typeof value === 'string' ? estateInputUrl(value) : null)
                ?? (typeof value === 'string' ? value : null);
        // THE VALUE RIDES VERBATIM (2026-11-04, the detach law — the
        // same seat as SourceRow's): an unrenderable value is HELD, the
        // square's held face carries it, and the ✕ stays armed. The old
        // null+metric pair painted the PLUS on a full slot with no way
        // out.
        return h(InputSquare, {
            label: f.label !== '' ? f.label : f.name,
            value: shown,
            ...square.verbs,
        });
    }
    // THE MULTI-SELECT CHIPS (the YOLO-classes law, 2026-10-08 — the
    // operator's verdict: a detector-owned vocabulary is NEVER a
    // freeform text box): a closed vocabulary with multi renders as
    // toggle chips; the wire is a COMMA-JOINED string in the options'
    // declared order (deterministic — Set order never leaks).
    if (f.type === 'select' && f.multi === true && Array.isArray(f.options) && f.options.length > 0) {
        const rows = f.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
        const held = new Set(String(value ?? '').split(',').map((w) => w.trim()).filter((w) => w !== ''));
        return h('div', { className: css.specChips, role: 'group', 'aria-label': f.label,
            ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}) }, rows.map((row) => {
            const on = held.has(row.value);
            // DSH Pill (the interactive chip, law 1): the toggle row is
            // the primitive's own case — Pill renders a button when
            // onClick rides it and owns its active face. The old
            // `data-chip` test hook left with the hand-rolled chip: no
            // reader anywhere in the tree, and data-* props do not
            // cross Pill's prop type.
            return h(Pill, {
                key: row.value,
                active: on,
                'aria-pressed': on,
                onClick: () => {
                    const next = new Set(held);
                    if (on) {
                        next.delete(row.value);
                    }
                    else {
                        next.add(row.value);
                    }
                    onEdit(f.name, rows.filter((r) => next.has(r.value)).map((r) => r.value).join(','));
                },
            }, titleCaseId(row.label));
        }));
    }
    if (f.type === 'select' && Array.isArray(f.options) && f.options.length > 0) {
        // THE MENU (S7h): the enum's rows ride the DSH Menu — the
        // trigger carries the current titled face. THE INHERIT GHOST
        // stays the '' row (undefined binds to it — the ghost IS the
        // unset mark, never the first listed option painted over an
        // unheld value: the 1:1 lie). normalize: '1024' |
        // {value:'1024', label:'1K'} → one shape. THE TITLE-CASE FACE
        // (the operator's sweep law): every label renders titled — the
        // value rides verbatim. (2026-09-18: a verbatim-authored
        // carve-out was tried and REVERTED — the estate's own door
        // picker (input-square) pins the blanket law; prose labels
        // title-case like ids, pattern conformance.)
        const rows = [];
        if (ghost !== undefined) {
            rows.push({ id: '', label: ghost });
        }
        for (const o of f.options) {
            const row = typeof o === 'string' ? { value: o, label: o } : o;
            rows.push({ id: row.value, label: titleCaseId(row.label) });
        }
        return h(SpecMenuSelect, {
            label: f.label,
            value: String(value ?? ''),
            rows,
            ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}),
            onPick: (id) => { onEdit(f.name, id); },
        });
    }
    if (f.type === 'slider') {
        return h(SpecSliderAtom, { f, value, onEdit, ...(envelope !== undefined ? { envelope } : {}) });
    }
    if (f.type === 'tri') {
        // THE TRI-STATE ATOM (hour 15, stroke C — h3's TriControl
        // semantics, promoted): boolean | undefined — inherit (the
        // upstream default), on, off. One spelling everywhere.
        return h(TriStateAtom, {
            label: f.label !== '' ? f.label : f.name,
            value: value === undefined || value === null ? undefined : (value === true || value === 'true'),
            onEdit,
            name: f.name,
        });
    }
    if (f.type === 'switch' || f.type === 'boolean') {
        // NO FALLBACK (operator, hour 26): a HELD value that is neither
        // boolean nor their wire strings is an ERROR — rendered as
        // itself, refused. Painting OFF over a poison truthy (while the
        // run composes it) was a 1:1 lie.
        if (value !== undefined && value !== null
            && typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
            return h('span', { className: css.specField, 'data-refused': f.name }, f.label + ': ' + String(value) + ' — REFUSED: not a boolean');
        }
        // the primitives catalog owns the two-state toggle — Switch, with
        // its required label (the control cannot ship unnamed)
        const on = value === true || value === 'true';
        return h(Switch, {
            label: f.label,
            checked: on,
            onChange: (next) => { onEdit(f.name, next); },
        });
    }
    if (f.type === 'textarea') {
        // THE TEXTAREA LAW (stroke 23, the operator's word): "they
        // should start two lines, then as text enters them, they grow."
        // rows=2 sets the floor; mount + value writes resize the box to
        // its content (height:auto → scrollHeight, never below the
        // two-row floor). THE STABLE REF (2026-09-21, the operator's
        // per-tick card jerk): an INLINE closure ref detaches/reattaches
        // EVERY render — every progress tick re-ran the auto→measure→set
        // thrash and the card's content height jittered on tall screens.
        // fitStable attaches ONCE per mount; the value-effect refits on
        // real content change only (outside writes, the enhance sweep).
        const fitStable = useCallback((el) => {
            if (el === null)
                return;
            el.style.height = 'auto';
            el.style.height = Math.max(el.scrollHeight, 2 * 22) + 'px';
        }, []);
        const fitEl = useRef(null);
        useEffect(() => {
            // non-null by the ref law: the callback ref attaches BEFORE
            // effects fire — the null arm was dead and gate-uncovered
            const el = fitEl.current;
            el.style.height = 'auto';
            el.style.height = Math.max(el.scrollHeight, 2 * 22) + 'px';
        }, [String(value ?? '')]);
        // ARGUED RAW SEAT (S7j): the catalog ships no Textarea atom
        // (ui-primitives types/index.d.ts export set), and DSH's own
        // client types textareas raw inside its widgets (ui-message-
        // feedback FeedbackDialog.tsx:117-124) — the auto-grow law's
        // native element stays, refit stable per the law above.
        return h('textarea', {
            className: css.specTextarea,
            rows: 2,
            value: String(value ?? ''),
            placeholder: f.placeholder ?? '',
            ref: (el) => { const ta = (el ?? null); fitEl.current = ta; fitStable(ta); },
            onChange: (e) => {
                const el = e.target;
                fitStable(el);
                onEdit(f.name, el.value);
            },
            'aria-label': f.label,
        });
    }
    // NUMBER FACE (2026-09-18, the operator's conviction: "you
    // handrolled and avoided the parameter system we developed, as
    // number fields are just from text" — the estate's own atom was
    // the hand-roll, degrading EVERY number to a freeform string).
    // Numbers render the NUMBER control: type=number carrying the
    // field's own min/max/step facts (the declaration's law, the
    // steppers and the bounds in the OS's own grammar). The VALUE
    // still travels as the raw string — coerce once at patch, the
    // estate's law, unchanged.
    // A BOUNDED number (min+max declared) with a HELD number and NO
    // ghost renders the MIXED KNOB (swipe + type, the operator's
    // 2026-11-05 order). A placeholder marks the UNSET-AWARE seats
    // (the overlay layer): their blank means the UNSET mark and their
    // ghost names what composes — a track would paint a default the
    // engine never composed (the no-fallback law), so they keep the
    // typed face. An absent value keeps the typed face for the same
    // reason. A held BLANK ('' — the clear's own write-through) keeps
    // the knob's seat: the control must not flap mid-edit.
    if (f.type === 'number' && f.min !== undefined && f.max !== undefined
        && (placeholder ?? f.placeholder) === undefined) {
        const held = typeof value === 'number' ? value
            : typeof value === 'string' && value !== '' ? Number(value)
                : Number.NaN;
        if (Number.isFinite(held) || value === '') {
            return h(SpecSliderAtom, { f, value, onEdit, ...(envelope !== undefined ? { envelope } : {}) });
        }
    }
    if (f.type === 'number') {
        return h(Input, {
            type: 'number',
            min: f.min,
            max: f.max,
            step: f.step,
            value: String(value ?? ''),
            placeholder: placeholder ?? f.placeholder ?? '',
            onChange: (e) => onEdit(f.name, e.target.value),
            'aria-label': f.label,
            ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}),
        });
    }
    // seed, text — the raw-string Input (coerce once at patch)
    return h(Input, {
        value: String(value ?? ''),
        placeholder: placeholder ?? f.placeholder ?? '',
        onChange: (e) => onEdit(f.name, e.target.value),
        'aria-label': f.label,
        ...(f.tooltip !== undefined && f.tooltip !== '' ? { title: f.tooltip } : {}),
    });
}
/** THE MODEL AXES (the pass-along law, 2026-09-12): the Model select
 *  plus ONE SELECT PER SERVED AXIS GROUP — Variant, Quant, Recipe,
 *  Precision, … the declaration's whole vocabulary, NEVER a hardcoded
 *  list (the operator's lane proof caught the hardcoded Quant-only
 *  list dropping seedvr2's and qwen's other axes). Order: the door's
 *  variant_groups contract, else first-seen. Chain: an axis' options
 *  are the rows composing with the axes above (the row's `owner`).
 *  Each pick applies the row's defaults overlay through onEdit — the
 *  values (model + every axis key + overlay keys) ride the caller's
 *  map and pass along at Run. Renders nothing when the spec declares
 *  no matrix. */
//# sourceMappingURL=atoms.js.map
