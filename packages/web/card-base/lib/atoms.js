/** atoms.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, useCallback, useEffect, useRef, useState } from 'react';
import { Button, Input, Menu, Pill, Switch } from '@deepseek-ai/dsh-client-ui-primitives';
import { InputSquare, estateInputUrl } from "./square.js";
import { titleCaseId } from "./spec.js";
import css from './card.module.css';
import { acceptOfField, useSquareProvider } from "./square-provider.js";
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
        // THE DUAL SEAT (input-prep audits F1/F2): a lane-agnostic
        // source admits BOTH image and audio — the pick's own shape
        // seats the lane (the studio flips on the pick), so the resting
        // lane's kind must not pin the drop judge. The modal narrowing
        // (kind) is untouched: the picker still asks the resting lane's
        // library; only the judges (drop, OS accept) widen.
        ...(props.admitsImageAudio === true ? { media: 'image+audio' } : {}),
        // THE REAL MEDIA HINT (the accept-prop→media-threading rework,
        // 2026-11-18): the owning field's declared kind rides INTO the
        // synthetic field, so acceptOfField derives the OS accept at BOTH
        // doors (the square's input and the provider's click-time
        // retarget) — the retired caller accept strings set only the wire
        // door's inert resting attr and both doors fell to the image
        // triad. The dual arm above stays the deliberate widening; a
        // caller passes one, never both.
        ...(props.media !== undefined && props.media !== '' ? { media: props.media } : {}),
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
        // THE ONE ACCEPT LAW (the split-accept burn, 2026-11-18): the
        // square's own OS dialog rides the provider's acceptOfField —
        // the same law the wire door retargets to at click. The old
        // shape always fell to DEFAULT_SQUARE_ACCEPT (the image triad),
        // so an audio lane's square door filtered the dialog to images.
        accept: host.accept,
        // THE VALUE RIDES VERBATIM (2026-11-04, the detach law): the
        // square owns the renderability split (thumb / mesh / the held
        // face) and the ✕ rides the HELD fact — a bare name or an
        // unresolved path arrives here as a value, never null-ed into
        // the PLUS face the slot could not detach from.
        value: shown,
        ...(host.verbs),
    }), 
    // THE UPLOADING FACE (2026-10-28): the attempt voices its own
    // filename UNDER the square in the neutral color — a busy
    // square is never mute, and never danger-colored (in flight is
    // not a refusal). role=status so the live region announces the
    // attempt without the alert semantics a refusal carries. The
    // line arrives ALREADY LOCALIZED on host.busyVoice (assembled
    // in the provider's t seat) — this face owns no dictionary key.
    // The truncation title keeps the raw filename (the reference's
    // own truncation-span idiom).
    typeof host.busyVoice === 'string' && host.busyVoice !== ''
        ? h('p', {
            className: css.sourceRowBusy,
            'data-slot-busy': props.label,
            title: host.busy ?? host.busyVoice,
            role: 'status',
        }, host.busyVoice)
        : null, 
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
            ...(props.title !== undefined || current !== undefined || props.face !== undefined
                ? { title: props.title ?? props.face ?? current?.label }
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
        h('span', { className: css.specSelectText }, props.face ?? current?.label ?? '')),
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
 *  while the wire gate stays loud for API authors.
 *
 *  THE CONTROL STAYS (operator 2026-11-19, the input-loss cure:
 *  "YOU TAKE AWAY THE INPUT BOX SO I CAN'T FIX IT"): a held value
 *  the lane refuses is rendered AS ITSELF in the typed box — never
 *  replaced by a text span, never clamped over — and the track
 *  stands down for that value (a range thumb would paint a clamped
 *  neighbor over an impossible contract). The box is the control
 *  that fixes the refusal, so it is the one face that never leaves.
 *  A typed draft outside the span does NOT land (no per-keystroke
 *  bench write, no unlanded strip): the text stays in the box with
 *  ONE local sentence, and the box reverts to the held truth on
 *  blur. A refusal the DOC already holds (a stale bench row) keeps
 *  a silent refused face — the form's lane banner is its single
 *  voice; the box's local sentence is only for a draft the banner
 *  cannot see.
 *  @param f the knob's field row.
 *  @param value the resolved display value.
 *  @param onEdit the settle seam.
 *  @param envelope the active variant's [min,max] for THIS knob,
 *  null when the variant declares none.
 *  @param step the lane-declared grain (the canvas pair's 32), else
 *  the field's own. */
/** The zero-law sentence a declaration may state in its tooltip
 * ("0 = the clip's own width (…).") — the first sentence, chipped on
 * the face exactly while the knob holds the 0 (cure D, 2026-10-28). */
const ZERO_LAW_RE = /^0 =[^.]*\./;
export function SpecSliderAtom({ f, value, onEdit, envelope, step }) {
    const shown = useLocalSliderValue(value);
    // THE BOX'S OWN SETTLE (the blank law): a clear writes '' through
    // (the draft coerces at patch) but must NOT unseat the knob —
    // the route would flap the control mid-edit and swallow the next
    // keystroke. The box keeps its own local TEXT: blank or mid-typed
    // strings show as typed; the track holds its last finite number.
    const [boxText, setBoxText] = useState(null);
    // THE LOCAL VOICE (one sentence, draft-only): the typed text did
    // not land because it is outside the knob's span. A HELD refusal
    // never speaks here — the form's lane banner owns that row.
    const [refusal, setRefusal] = useState(null);
    useEffect(() => { setBoxText(null); setRefusal(null); }, [shown.value]); // eslint-disable-line react-hooks/exhaustive-deps
    // THE ENVELOPE'S EFFECTIVE SPAN: the field's own bounds intersected
    // with the active variant's envelope. A disjoint intersection
    // admits NOTHING (the DECL's own broken state) — the box still
    // renders, every typed value is refused.
    const clamped = envelope !== undefined && envelope !== null
        ? {
            min: Math.max(f.min ?? Number.NEGATIVE_INFINITY, envelope[0]),
            max: Math.min(f.max ?? Number.POSITIVE_INFINITY, envelope[1]),
        }
        : null;
    const lo = clamped !== null ? clamped.min : (f.min ?? Number.NEGATIVE_INFINITY);
    const hi = clamped !== null ? clamped.max : (f.max ?? Number.POSITIVE_INFINITY);
    const noSpan = lo > hi;
    // THE HELD FACE (no-fallback law): a held value the span cannot
    // hold is shown AS ITSELF in the box — the track stands down
    // (a clamped neighbor would be a lie). A BLANK ('') is not poison:
    // it is the clear's own write, the knob keeps its seat.
    const poison = shown.value === null && value !== undefined && value !== null && value !== '';
    const heldRefused = poison || noSpan
        || (shown.value !== null && (shown.value < lo || shown.value > hi));
    const verdictOf = (raw) => {
        if (raw === '')
            return 'blank';
        const n = Number(raw);
        if (raw.trim() === '' || !Number.isFinite(n))
            return 'refuse';
        return noSpan || n < lo || n > hi ? 'refuse' : 'land';
    };
    const draftRefused = boxText !== null && verdictOf(boxText) === 'refuse';
    const refused = heldRefused || draftRefused;
    // the fallback paint for a blank backing: the nearest admitted
    // number (a legal unstated state — not a lie about a held value).
    const trackValue = shown.value
        ?? (clamped !== null && !noSpan ? Math.min(Math.max(0, clamped.min), clamped.max) : (f.min ?? 0));
    const backingText = shown.value !== null
        ? String(shown.value)
        : (value === undefined || value === null || value === '' ? '' : String(value));
    const boxValue = boxText ?? backingText;
    const gapLo = noSpan ? Math.min(lo, hi) : lo;
    const gapHi = noSpan ? Math.max(lo, hi) : hi;
    const spanWord = () => {
        if (Number.isFinite(gapLo) && Number.isFinite(gapHi))
            return 'outside ' + gapLo + '–' + gapHi;
        if (Number.isFinite(gapLo))
            return 'below ' + gapLo;
        // only the high end is finite here: a refusal is above it (the
        // low-only span words itself in the arm above; both ends
        // infinite admits every finite draft, and a disjoint span rides
        // sliderDraftNoSpan instead of this sentence)
        return 'above ' + gapHi;
    };
    const refusalText = refusal === null
        ? null
        : noSpan
            ? chromeCopy.sliderDraftNoSpan()
            : Number.isFinite(Number(refusal))
                ? chromeCopy.sliderDraftRefusal({ value: refusal.trim(), span: spanWord() })
                : chromeCopy.sliderDraftNaN({ value: refusal.trim() });
    // ARGUED RAW SEAT (S7c/S7g/S7j, the slider law): the catalog ships
    // no slider/range atom (ui-primitives types/index.d.ts export set),
    // and DSH's own field widget renders its embedded control raw
    // (settings-form fields.tsx:95-106) — the native range stays.
    // THE MIXED KNOB (the operator's 2026-11-05 order): one control,
    // two faces sharing one value — the range swipes, the typed box
    // types; the box commits only inside the span (a draft outside it
    // is held locally, one sentence, no write).
    return h('span', {
        className: css.specSliderRow,
        ...(refused ? { 'data-refused': f.name } : {}),
    }, heldRefused ? null : h('input', {
        className: css.specSlider,
        type: 'range',
        min: Number.isFinite(lo) ? lo : 0,
        max: Number.isFinite(hi) ? hi : 10,
        step: step ?? f.step ?? 0.1,
        value: trackValue,
        onInput: (e) => { shown.set(Number(e.target.value)); },
        onChange: (e) => { onEdit(f.name, e.target.value); },
        'aria-label': f.label + ' ' + chromeCopy.sliderAriaWord,
    }), h(Input, {
        // A non-number truth cannot paint in a number input (the DOM
        // sanitizes it to '') — the text face keeps the poison visible
        // and editable; a numeric truth renders the number box.
        type: poison ? 'text' : 'number',
        ...(noSpan || !Number.isFinite(lo) ? {} : { min: lo }),
        ...(noSpan || !Number.isFinite(hi) ? {} : { max: hi }),
        step: step ?? f.step,
        className: css.specSliderInput,
        value: boxValue,
        ...(refused ? { 'aria-invalid': true } : {}),
        onChange: (e) => {
            const raw = e.target.value;
            setBoxText(raw);
            setRefusal(null);
            const verdict = verdictOf(raw);
            if (verdict === 'blank') {
                onEdit(f.name, '');
                return;
            }
            if (verdict === 'refuse')
                return;
            shown.set(Number(raw));
            onEdit(f.name, raw);
        },
        onBlur: () => {
            // THE BLUR SETTLE (the frictionless-authoring ruling): the
            // draft is judged ONCE, when the box is left — never one
            // keystroke at a time. A refused draft speaks ONE sentence
            // and the box returns to the held truth (nothing landed; a
            // box painting unlanded text would lie about the run's
            // input).
            const raw = boxText;
            if (raw === null)
                return;
            if (raw.trim() === '') {
                setBoxText(null);
                return;
            }
            if (verdictOf(raw) === 'land') {
                setBoxText(null);
                return;
            }
            setRefusal(raw);
            setBoxText(null);
        },
        'aria-label': f.label,
    }), 
    // THE ZERO-LAW CHIP (cure D, 2026-10-28): a held 0 whose
    // declaration's tooltip states a "0 = …" law SHOWS the law on
    // the face — the openjutsu burn: Width/Height 0 (inherit the
    // clip's geometry) painted a bare 0 with the law buried in the
    // hover tooltip. Derived from the DECL's own sentence — no
    // per-card special case; off the 0 the law is not the live
    // state and the chip goes.
    ...(shown.value === 0 && typeof f.tooltip === 'string' && f.tooltip.startsWith('0 =')
        ? [h('span', { className: css.specSliderZero, 'data-zero-law': f.name }, ZERO_LAW_RE.exec(f.tooltip)?.[0] ?? f.tooltip)]
        : []), ...(refusalText !== null
        ? [h('span', { className: css.specSliderRefusal, 'data-slider-refusal': f.name, role: 'status' }, refusalText)]
        : []));
}
/** One spec atom — typed by the declaration, edited as a raw string
 *  while typing (decimal dots survive; coercion happens once at patch). */
export function SpecAtom({ f, value, onEdit, square, wireCandidates, placeholder, ghost, envelope, step, hideSquareLabel }) {
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
        return h('div', { className: css.sourceRow, 'data-source-row': f.name }, h(InputSquare, {
            label: hideSquareLabel === true ? '' : (f.label !== '' ? f.label : f.name),
            // the aria seat stays even under the hidden caption (the
            // SourceRow idiom: readers keep the name, sighted get one)
            ...(hideSquareLabel === true ? { ariaLabel: f.label !== '' ? f.label : f.name } : {}),
            // THE SEAT'S OWN VOCABULARY (the vid2vid modal cure,
            // 2026-11-09): the square's hidden file input accepts the
            // FIELD's media family — a video seat offers video files,
            // never the image triad. acceptOfField is the ONE derivation
            // (the provider's menu door already rode it); the square's
            // own dormant input now rides the same law.
            accept: acceptOfField(f),
            value: shown,
            ...square.verbs,
        }), 
        // THE ATTEMPT + REFUSAL FACES (the seat-kind judge's law, the
        // modleaf-add journey audit 2026-11-09): a square that carries
        // the provider's verbs carries its FACES too — SourceRow's own
        // pair, verbatim (busy = the neutral in-flight line under the
        // square, error = the danger-colored refusal). Before this,
        // the mod leaf's seats fired the judge but rendered NOTHING:
        // a wrong-kind drop refused SILENTLY — the exact burn the
        // judge exists to end.
        typeof square.busyVoice === 'string' && square.busyVoice !== ''
            ? h('p', {
                className: css.sourceRowBusy,
                'data-slot-busy': f.name,
                title: square.busy ?? square.busyVoice,
                role: 'status',
            }, square.busyVoice)
            : null, typeof square.error === 'string' && square.error !== ''
            ? h('p', {
                className: css.sourceRowErr,
                'data-slot-error': f.name,
                title: square.error,
                role: 'alert',
            }, square.error)
            : null);
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
        return h(SpecSliderAtom, { f, value, onEdit, ...(envelope !== undefined ? { envelope } : {}), ...(step !== undefined ? { step } : {}) });
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
        // THE HELD FACE RIDES THE KNOB for every stated value (the
        // input-loss cure, 2026-11-19): a non-numeric truth renders in
        // the knob's own text box (refused, editable); the typed
        // spinner would blank it — input[type=number] cannot paint a
        // non-number — and hide the very value to fix.
        if (value !== undefined) {
            return h(SpecSliderAtom, { f, value, onEdit, ...(envelope !== undefined ? { envelope } : {}), ...(step !== undefined ? { step } : {}) });
        }
    }
    if (f.type === 'number') {
        // THE SEATED-SPAN SPINNER (the canvas burn's typed half): the
        // unset-aware typed face soft-clamps its HTML bounds to the
        // lane envelope when one states them — the box's spinners end
        // at the seated family's ceiling, the same span the track and
        // the write door judge (an unset seat stays unset: the value
        // law above is untouched).
        const lo = envelope !== undefined && envelope !== null
            ? Math.max(f.min ?? Number.NEGATIVE_INFINITY, envelope[0]) : f.min;
        const hi = envelope !== undefined && envelope !== null
            ? Math.min(f.max ?? Number.POSITIVE_INFINITY, envelope[1]) : f.max;
        return h(Input, {
            type: 'number',
            min: lo,
            max: hi,
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
