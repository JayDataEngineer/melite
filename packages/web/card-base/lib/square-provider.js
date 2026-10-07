/** square-provider.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { DEFAULT_SQUARE_ACCEPT, MESH_SQUARE_ACCEPT, isImageUrl, readAsDataUrl, } from "./square.js";
import { uploadInputFile } from "./wire.js";
import { rejectionVoice } from "./rejection-voice.js";
import css from './card.module.css';
/** The media-kind the picker fetches for a field: image fields name
 *  image; mesh fields name the MEDIA vocabulary's kind for 3D, which
 *  is `model` — NOT `mesh`. `mesh` is the client PREVIEW kind
 *  (preview-kinds.ts), a different vocabulary; the media list door
 *  admits image/audio/video/model/all and refuses anything else with
 *  `media/kind`, so asking it for `mesh` was a guaranteed refusal that
 *  the picker swallowed into an empty list (the "From media" row was
 *  empty for every mesh field, with no error anywhere). file fields
 *  take the whole library (their accept narrows client-side per row). */
function mediaKindForField(f) {
    if (f.type === 'image')
        return 'image';
    if (f.type === 'mesh')
        return 'model';
    return 'all';
}
/** THE OS-DIALOG ACCEPT, derived per field (primitive ③): mesh rows
 *  offer the GLB pair; everything else keeps the image triad (the
 *  historic default). The provider's ONE hidden input re-targets
 *  imperatively at click time — the accept is a property of the
 *  field being picked, never of the provider instance. */
export function acceptOfField(f) {
    return f !== null && f.type === 'mesh' ? MESH_SQUARE_ACCEPT : DEFAULT_SQUARE_ACCEPT;
}
/** THE ONE square provider (the old SlotGrid law, DSH substrate):
 *  every slot-shaped field of a stage gets the same verbs — file
 *  upload (the /v1/uploads door + the data-URL mirror), media drop
 *  (the asset MIME → the param), and THE PICKER (a DSH Menu anchored
 *  on the square listing the other stages' latest outputs; picking
 *  one writes the PARAM — the slot is the wire, no separate wiring
 *  mechanic exists). ONE definition; the constructor and every
 *  claimed atom ride it. */
export function useSquareProvider(onEdit, wire) {
    const [mirror, setMirror] = useState({});
    const [pickAt, setPickAt] = useState(null);
    // THE PICKER MODAL seat (2026-09-13): From flow / From media open
    // ONE selector modal — mode decides the rows; From file goes to the
    // OS dialog. The flat click-through picker is dead (the operator:
    // "Flat pick didn't even make any sense").
    const [modalAt, setModalAt] = useState(null);
    // the From file capture: the menu closes (pickAt → null) BEFORE the
    // OS dialog answers — the field rides a ref from the menu click.
    const fieldRef = useRef(null);
    const [mediaRows, setMediaRows] = useState(null);
    // the refusal that emptied it (null = the list is honest-empty)
    const [mediaErr, setMediaErr] = useState(null);
    const fileRef = useRef(null);
    const onFile = useCallback(async (f, file) => {
        if (wire.onFile !== undefined) {
            wire.onFile(file);
            return;
        }
        try {
            const dataUrl = await readAsDataUrl(file);
            // THE MESH EXCEPTION: a freshly read GLB is a data: URL with no
            // .glb name, so mirroring it would hide the square's real value
            // (the estate path the door is about to answer). Images keep
            // their data-URL preview; a mesh waits for its named path.
            if (f.type !== 'mesh')
                setMirror((m) => ({ ...m, [f.name]: dataUrl }));
            const { name } = await uploadInputFile(file);
            onEdit(f.name, name);
        }
        catch (e) {
            onEdit(f.name, rejectionVoice(e));
        }
    }, [onEdit, wire.onFile]);
    const square = (f) => {
        // THE SLOT-SHAPED TYPES (primitive ③ boards mesh): image, file,
        // and mesh — a .glb value renders the same square grammar with
        // the inline GLB thumb; every other type is not slot-shaped.
        if (f.type !== 'image' && f.type !== 'file' && f.type !== 'mesh')
            return undefined;
        return {
            display: mirror[f.name] ?? null,
            verbs: {
                onPick: (anchor) => {
                    const el = anchor instanceof HTMLElement ? anchor : null;
                    setPickAt(el !== null
                        ? { rect: el.getBoundingClientRect(), field: f }
                        : { rect: new DOMRect(8, 8, 1, 1), field: f });
                },
                onFile: (file) => { void onFile(f, file); },
                onAsset: (url) => { onEdit(f.name, url); },
                onClear: () => {
                    setMirror((m) => { const n = { ...m }; delete n[f.name]; return n; });
                    onEdit(f.name, '');
                },
            },
        };
    };
    const sourceMenu = pickAt === null ? null : h(Menu, {
        open: true,
        anchor: null,
        getAnchorRect: () => pickAt.rect,
        items: [
            { id: '__flow__', label: 'From flow' },
            { id: '__media__', label: 'From media' },
            { id: '__file__', label: 'From file' },
            { type: 'separator', id: 'sep' },
            { id: '__none__', label: '— clear —', danger: true },
        ],
        onSelect: (id) => {
            const f = pickAt.field;
            setPickAt(null);
            if (id === '__flow__') {
                setModalAt({ mode: 'flow', field: f });
                return;
            }
            if (id === '__media__') {
                setModalAt({ mode: 'media', field: f });
                return;
            }
            if (id === '__file__') {
                fieldRef.current = f;
                // THE ACCEPT IS THE FIELD'S (mesh → the GLB pair): the ONE
                // input re-targets imperatively at click time — a property
                // of the field being picked, never of the provider.
                const input = fileRef.current;
                input.accept = acceptOfField(f);
                input.click();
                return;
            }
            // NO __none__ GUARD (the exhaustive-menu proof): this closure's
            // items are the four literal ids above and the three arms above
            // return — reaching here MEANS __none__ (the danger row). A
            // fourth guard would be untestable dead code (v8 cannot count a
            // block-end implicit else) guarding an impossible state.
            setMirror((m) => { const n = { ...m }; delete n[f.name]; return n; });
            onEdit(f.name, '');
            return;
        },
        onClose: () => { setPickAt(null); },
        portal: true,
    });
    // THE PICKER MODAL (default face; the seam may claim it): ONE
    // component, two row sources — flow candidates (edge-law narrowed)
    // and the media library (kind-filtered through the wire's door).
    // THE DEP LAW: the effect keys on the loader FUNCTION, never the
    // wire object — callers build the wire inline per render (a fresh
    // identity every pass), so keying on `wire` re-fires the load on
    // every setMediaRows render: an infinite load loop that OOMs the
    // tab (input-square's From-media wall caught it: 4GB, zero tests
    // run). The loader is a stable module reference at every call
    // site (CardsTab injects fetchMediaLibrary), so the load fires
    // once per modal opening.
    const loadMedia = wire?.loadMedia;
    useEffect(() => {
        if (modalAt?.mode !== 'media')
            return;
        if (loadMedia === undefined) {
            setMediaRows([]);
            return;
        }
        const ctrl = new AbortController();
        setMediaRows(null);
        loadMedia(mediaKindForField(modalAt.field), ctrl.signal)
            .then((items) => { setMediaRows(items.map((it) => ({ id: it.url, label: it.name, url: it.url }))); setMediaErr(null); })
            // A REFUSAL IS NOT AN EMPTY LIBRARY. The old arm caught into
            // setMediaRows([]), which rendered "nothing to pick yet" for a
            // door that had actually refused (the `mesh`-vs-`model` kind
            // mismatch shipped exactly that: an empty picker, no error). The
            // message rides the empty state so a broken list is legible.
            .catch((e) => { setMediaRows([]); setMediaErr(e instanceof Error ? e.message : String(e)); });
        return () => { ctrl.abort(); };
    }, [modalAt, loadMedia]);
    const pickerModal = modalAt === null ? null : (() => {
        const f = modalAt.field;
        const candidates = modalAt.mode === 'flow'
            ? (wire.candidatesFor !== undefined ? wire.candidatesFor(f) : wire.candidates)
            : (mediaRows ?? []);
        const req = { mode: modalAt.mode, kind: mediaKindForField(f), field: f, candidates };
        const pick = (url) => {
            setModalAt(null);
            if (url !== '')
                onEdit(f.name, url);
        };
        const fallback = h(Modal, {
            open: true,
            onClose: () => { setModalAt(null); },
            title: modalAt.mode === 'flow' ? 'From flow' : 'From media',
            description: modalAt.mode === 'flow'
                ? 'The other stages\u2019 latest outputs' + (req.kind !== 'all' ? ' (' + req.kind + ')' : '')
                : 'The runs library' + (req.kind !== 'all' ? ' (' + req.kind + ')' : ''),
            closeLabel: 'Close picker',
        }, candidates.length === 0
            ? h('p', { className: css.pickEmpty }, modalAt.mode === 'media' && mediaRows === null
                ? 'loading\u2026'
                // the door REFUSED — say so. An empty list that is really
                // a refusal is how the mesh picker stayed mysteriously
                // empty for a release (the mesh/model kind mismatch).
                : mediaErr !== null
                    ? 'media library unavailable \u2014 ' + mediaErr
                    : 'nothing to pick yet')
            : h('ul', { className: css.pickList }, candidates.map((c) => h('li', { key: c.id, className: css.pickRow }, h('button', {
                type: 'button',
                className: css.pickBtn,
                'data-testid': 'source-pick-row',
                onClick: () => { pick(c.url); },
            }, isImageUrl(c.url)
                ? h('img', { className: css.pickThumb, src: c.url, alt: c.label, loading: 'lazy' })
                : h('span', { className: css.pickGlyph }, c.label.slice(0, 1).toUpperCase()), h('span', { className: css.pickLabel }, c.label))))));
        return wire.renderSourcePick !== undefined ? wire.renderSourcePick(req, fallback) : fallback;
    })();
    // THE FILE INPUT lives OUTSIDE the Menu (the Menu's close path
    // tears its children down before the From file branch can click);
    // it rides the provider fragment and closes over pickAt per render.
    const fileInput = h('input', {
        ref: fileRef,
        type: 'file',
        // the RESTING accept (the triad); the '__file__' branch re-targets
        // per field at click time — wire.accept stays the bespoke override.
        accept: wire.accept ?? acceptOfField(null),
        'aria-hidden': true,
        tabIndex: -1,
        style: { display: 'none' },
        onChange: (e) => {
            const inp = e;
            const file = inp.target.files?.[0];
            const f = fieldRef.current;
            if (f !== null && file !== undefined && file !== null) {
                fieldRef.current = null;
                void onFile(f, file);
            }
            // NO NULL GUARD (the always-mounted proof): this handler fires
            // only while the provider fragment is mounted and the ref rides
            // its always-rendered hidden input (same shape as square.tsx's
            // retired guard) — unmounts deliver no change events.
            fileRef.current.value = '';
        },
    });
    const wireMenu = h(Fragment, null, sourceMenu, pickerModal, fileInput);
    return { square, wireMenu };
}
//# sourceMappingURL=square-provider.js.map
