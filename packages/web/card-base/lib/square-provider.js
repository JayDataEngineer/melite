/** square-provider.tsx — extracted from form.tsx (hour 15, the godfile split; the
 * operator's DRY audit law: one seam, one small file, one wall). */
import { createElement as h, Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { Menu, Modal } from '@deepseek-ai/dsh-client-ui-primitives';
import { DEFAULT_SQUARE_ACCEPT, MESH_SQUARE_ACCEPT, VIDEO_SQUARE_ACCEPT, isImageUrl, isVideoUrl, } from "./square.js";
import { readAsDataURL } from "./chrome.js";
import { uploadInputFile } from "./wire.js";
import { rejectionVoice } from "./rejection-voice.js";
import { t } from "./locales/square.js";
import { EmptyState } from "./layout.js";
import css from './card.module.css';
/** The media-kind the picker fetches for a field: image fields name
 *  image; mesh fields name the MEDIA vocabulary's kind for 3D, which
 *  is `model` — NOT `mesh`. `mesh` is the client PREVIEW kind
 *  (preview-kinds.ts), a different vocabulary; the media list door
 *  admits image/audio/video/model/all and refuses anything else with
 *  `media/kind`, so asking it for `mesh` was a guaranteed refusal that
 *  the picker swallowed into an empty list (the "From media" row was
 *  empty for every mesh field, with no error anywhere). file fields
 *  take the whole library unless a media hint narrows the seat (a
 *  video-hinted file field lists the video library only). */
function mediaKindForField(f) {
    if (f.type === 'image')
        return 'image';
    if (f.type === 'mesh')
        return 'model';
    // The single-field media hint (the operator's picker law, live
    // lane 2026-10-28: video seats never list the whole catalog).
    if (f.type === 'file' && f.media === 'video')
        return 'video';
    return 'all';
}
/** THE OS-DIALOG ACCEPT, derived per field (primitive ③): mesh rows
 *  offer the GLB pair; video-hinted rows offer the video formats
 *  (the same media hint the picker rides); everything else keeps
 *  the image triad (the historic default). The provider's ONE
 *  hidden input re-targets imperatively at click time — the accept
 *  is a property of the field being picked, never of the provider
 *  instance. */
export function acceptOfField(f) {
    if (f === null)
        return DEFAULT_SQUARE_ACCEPT;
    if (f.type === 'mesh')
        return MESH_SQUARE_ACCEPT;
    if (f.media === 'video')
        return VIDEO_SQUARE_ACCEPT;
    return DEFAULT_SQUARE_ACCEPT;
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
    // THE PICKER SEARCH (2026-11-12, the operator's burn: "THERE IS
    // NO SEARCH" over a library the picker lists bare): one query
    // string filtering BOTH row sources client-side by label
    // substring — the library door's own filtering stays kind-scoped
    // (the seat's media hint); this is the find-in-list the operator
    // asked for. Reset on every modal open (a stale query hiding the
    // next seat's rows is its own burn).
    const [pickQuery, setPickQuery] = useState('');
    // the From file capture: the menu closes (pickAt → null) BEFORE the
    // OS dialog answers — the field rides a ref from the menu click.
    const fieldRef = useRef(null);
    const [mediaRows, setMediaRows] = useState(null);
    // the refusal that emptied it (null = the list is honest-empty)
    const [mediaErr, setMediaErr] = useState(null);
    const fileRef = useRef(null);
    // THE REFUSAL FACE (2026-10-24, the operator's live burn: "when I
    // upload it is normal, but two image references go in"): a FAILED
    // upload used to commit its refusal text AS THE PARAM VALUE
    // (onEdit(name, rejectionVoice(e))) — the error string landed in
    // the input stack as an "image reference", and the retry's real
    // path landed beside it: two references for one upload. A refusal
    // is a FACE, never a value: it rides this per-field state, renders
    // on the square, and clears with the next attempt or any
    // successful settle.
    const [uploadErr, setUploadErr] = useState({});
    // THE IN-FLIGHT SEAT (the upload-lag cure, 2026-10-28): the old
    // attempt face was the empty string in the refusal seat —
    // rendered as NOTHING, so a minutes-long clip POST read as a
    // dead square. The attempt now carries its own seat (the dropped
    // filename) with its own neutral face; the refusal seat stays
    // refusal-only ('' at attempt-start clears the last refusal, text
    // on failure, deleted on success).
    const [uploadBusy, setUploadBusy] = useState({});
    const onFile = useCallback(async (f, file) => {
        if (wire.onFile !== undefined) {
            wire.onFile(file);
            return;
        }
        setUploadErr((m) => ({ ...m, [f.name]: '' }));
        setUploadBusy((m) => ({ ...m, [f.name]: file.name }));
        try {
            const dataUrl = await readAsDataURL(file);
            // THE MESH EXCEPTION: a freshly read GLB is a data: URL with no
            // .glb name, so mirroring it would hide the square's real value
            // (the estate path the door is about to answer). Images keep
            // their data-URL preview; a mesh waits for its named path.
            if (f.type !== 'mesh')
                setMirror((m) => ({ ...m, [f.name]: dataUrl }));
            // THE SINGLE READ rides along: the mirror above already paid
            // the full-file base64 — the door posts it, never re-reads.
            const { name } = await uploadInputFile(file, undefined, dataUrl);
            setUploadErr((m) => { const n = { ...m }; delete n[f.name]; return n; });
            setUploadBusy((m) => { const n = { ...m }; delete n[f.name]; return n; });
            setUploadErr((m) => { const n = { ...m }; delete n[f.name]; return n; });
            // THE MIRROR DIES WITH THE COMMIT (2026-10-24, the operator's
            // burn "two image references go in"): the pick's data-URL
            // preview was seeded at attempt-start; once the estate path
            // lands in the value, the committed entry's own thumb owns the
            // square and the add-cell's preview must VANISH — an uncleaned
            // mirror rendered a second image reference beside the entry,
            // curable only by a refresh (local state, never the store).
            setMirror((m) => { const n = { ...m }; delete n[f.name]; return n; });
            onEdit(f.name, name);
        }
        catch (e) {
            setUploadErr((m) => ({ ...m, [f.name]: rejectionVoice(e) }));
            setUploadBusy((m) => { const n = { ...m }; delete n[f.name]; return n; });
        }
    }, [onEdit, wire.onFile]);
    const square = (f) => {
        // THE SLOT-SHAPED TYPES (primitive ③ boards mesh): image, file,
        // and mesh — a .glb value renders the same square grammar with
        // the inline GLB thumb; every other type is not slot-shaped.
        if (f.type !== 'image' && f.type !== 'file' && f.type !== 'mesh')
            return undefined;
        // THE ALREADY-LOCALIZED PROP (the square-copy locale law): the
        // in-flight line is assembled HERE in the trio (square-provider
        // owns a t seat) and rides the host as finished copy — atoms.tsx
        // renders the prop verbatim and owns no dictionary key, so the
        // dead-key arm keeps judging the trio alone.
        const busyName = uploadBusy[f.name] ?? null;
        return {
            display: mirror[f.name] ?? null,
            // THE REFUSAL FACE rides the host (empty string = an attempt in
            // flight; a non-empty string = the last refusal's voice). The
            // attempt's OWN face rides `busy` (the dropped filename, the
            // truncation title) + `busyVoice` (the finished line) —
            // never the danger color: in flight is not a refusal.
            error: uploadErr[f.name] ?? null,
            busy: busyName,
            busyVoice: busyName === null || busyName === '' ? null : t('uploading', { name: busyName }),
            verbs: {
                onPick: (anchor) => {
                    const el = anchor instanceof HTMLElement ? anchor : null;
                    setPickAt(el !== null
                        ? { rect: el.getBoundingClientRect(), field: f }
                        : { rect: new DOMRect(8, 8, 1, 1), field: f });
                },
                onFile: (file) => { void onFile(f, file); },
                onAsset: (url) => {
                    setUploadErr((m) => { const n = { ...m }; delete n[f.name]; return n; });
                    onEdit(f.name, url);
                },
                onClear: () => {
                    setMirror((m) => { const n = { ...m }; delete n[f.name]; return n; });
                    setUploadErr((m) => { const n = { ...m }; delete n[f.name]; return n; });
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
            { id: '__flow__', label: t('fromFlow') },
            { id: '__media__', label: t('fromMedia') },
            { id: '__file__', label: t('fromFile') },
            { type: 'separator', id: 'sep' },
            { id: '__none__', label: t('clearSlot'), danger: true },
        ],
        onSelect: (id) => {
            const f = pickAt.field;
            setPickAt(null);
            // the query resets IN THE SAME BATCH as the open (an effect
            // keyed on modalAt re-rendered the modal once even for a
            // no-op '' → '' — the seam claim double-fired; the operators'
            // own rule: a stale query never hides the next seat's rows)
            if (id === '__flow__') {
                setPickQuery('');
                setModalAt({ mode: 'flow', field: f });
                return;
            }
            if (id === '__media__') {
                setPickQuery('');
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
        const rawCandidates = modalAt.mode === 'flow'
            ? (wire.candidatesFor !== undefined ? wire.candidatesFor(f) : wire.candidates)
            : (mediaRows ?? []);
        // the search narrows by LABEL (case-insensitive substring); an
        // empty query is the whole list, the historic behavior
        const q = pickQuery.trim().toLowerCase();
        const candidates = q === ''
            ? rawCandidates
            : rawCandidates.filter((c) => c.label.toLowerCase().includes(q));
        const req = { mode: modalAt.mode, kind: mediaKindForField(f), field: f, candidates };
        const pick = (url) => {
            setModalAt(null);
            if (url !== '')
                onEdit(f.name, url);
        };
        const fallback = h(Modal, {
            open: true,
            onClose: () => { setModalAt(null); },
            title: modalAt.mode === 'flow' ? t('fromFlow') : t('fromMedia'),
            description: modalAt.mode === 'flow'
                ? t('flowDescription', { kindSuffix: req.kind !== 'all' ? ' (' + req.kind + ')' : '' })
                : t('mediaDescription', { kindSuffix: req.kind !== 'all' ? ' (' + req.kind + ')' : '' }),
            closeLabel: t('closePicker'),
        }, q !== '' && rawCandidates.length > 0 && candidates.length === 0
            // THE NO-MATCH FACE (2026-11-12): a filtered-empty list is
            // the query's own result, never "nothing to pick" — the
            // operator would read a healthy library as empty.
            ? h('p', { className: css.pickEmpty }, t('noMatchFor', { query: pickQuery.trim() }))
            : candidates.length === 0
                // THE EMPTY LAW (S7 class-4 residue, 2026-11-05): the picker's
                // empty face rides EmptyState (layout.tsx) — the DSH
                // empty-state shape (WorkspaceBrowser.tsx:266-280), the same
                // component the stage previews speak; the copy stays the
                // locale's (loading / the door's refusal / nothing to pick).
                ? h(EmptyState, {
                    variant: 'bare', className: css.pickEmpty,
                    title: modalAt.mode === 'media' && mediaRows === null
                        ? t('loading')
                        // the door REFUSED — say so. An empty list that is really
                        // a refusal is how the mesh picker stayed mysteriously
                        // empty for a release (the mesh/model kind mismatch).
                        : mediaErr !== null
                            ? t('mediaUnavailable', { reason: mediaErr })
                            : t('nothingToPick'),
                })
                : h(Fragment, null, h('div', { className: css.pickSearch }, h('input', {
                    // ARGUED RAW SEAT (the row-face class, S7j): no search
                    // atom in the ui-primitives catalog; DSH's own picker
                    // dialogs ride the native input (WorkspaceBrowser's
                    // filter row) — same grammar as the OS picker's own
                    // find field.
                    type: 'search',
                    className: css.pickSearchInput,
                    value: pickQuery,
                    placeholder: t('searchPlaceholder'),
                    'aria-label': t('searchPlaceholder'),
                    onChange: (e) => { setPickQuery(e.target.value); },
                })), h('ul', { className: css.pickList }, candidates.map((c) => h('li', { key: c.id, className: css.pickRow }, h('button', {
                    // ARGUED RAW SEAT (S7j, the row-face class): a
                    // full-width selection row carrying a thumb — DSH's
                    // own lists type row buttons raw + module css
                    // (ui-deliverables ChangedFiles.tsx:83 css.row).
                    type: 'button',
                    className: css.pickBtn,
                    'data-testid': 'source-pick-row',
                    onClick: () => { pick(c.url); },
                }, 
                // THE VIDEO PREVIEW SEAT (2026-11-12, the operator's
                // burn: "VIDEOS HAVE NO IMAGE PREVIEWS" — a video row
                // was a letter glyph): a video URL renders the same
                // 40px thumb seat as an image, riding a muted
                // metadata-preload video element (the first frame;
                // the stage-preview strip's own idiom). Non-media
                // rows keep the glyph.
                isImageUrl(c.url)
                    ? h('img', { className: css.pickThumb, src: c.url, alt: c.label, loading: 'lazy' })
                    : isVideoUrl(c.url)
                        ? h('video', { className: css.pickThumb, src: c.url, alt: c.label, muted: true, playsInline: true, preload: 'metadata' })
                        : h('span', { className: css.pickGlyph }, c.label.slice(0, 1).toUpperCase()), h('span', { className: css.pickLabel }, c.label)))))));
        return wire.renderSourcePick !== undefined ? wire.renderSourcePick(req, fallback) : fallback;
    })();
    // THE FILE INPUT lives OUTSIDE the Menu (the Menu's close path
    // tears its children down before the From file branch can click);
    // it rides the provider fragment and closes over pickAt per render.
    const fileInput = h('input', {
        // ARGUED RAW SEAT (S6j/S7j, the file-input class): no file atom in
        // the catalog (the Input atom is text-only); DSH's own composer
        // rides the native hidden control (InputBar.tsx:434-441).
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