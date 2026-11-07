/**
 * square.tsx — InputSquare, THE ONE square for any slot-shaped value
 * — the base's default input component. Ported from the old system's
 * SlotSquare law (packages/web-kit/ui/SlotSquare.tsx, 2026-08-08:
 * "the look for it will be reused for the sub-card system") onto the
 * DSH substrate: ui-primitives glyphs, module CSS under the
 * web-styling chrome laws, no lucide/cn/tip.
 *
 * THE PLUS LAW (2026-09-13, the operator): the empty square
 * carries the PLUS — "add a source" — and the click opens the
 * three-entry source menu (From flow / From media / From file) in
 * the provider; a bare square without a picker still files.
 * THE OLD LAW, KEPT — a square thumbnail with label + badge
 * + the THREE source verbs (operator, 2026-09-12: "we rendered a
 * square and gave the option to do 1 of 3 things"):
 *   a) from previous card  → onClick (the host opens the wire picker;
 *                            badge = the upstream card's title)
 *   b) from file upload    → onPickFile/onDropFile (hidden input +
 *                            OS drop — the ONE read path readAsDataURL)
 *   c) from media bar      → onDropAsset (the ASSET_DRAG_MIME contract
 *                            the drop surface already serves)
 * plus the X (detach). The consumer owns the doors — this shell only
 * voices them (ui-attachment's own law: presentation registers, the
 * service seams stay with their owners).
 *
 * THE CONSTRUCTION LAW (2026-09-12, the card-base founding): a card
 * package EMITS an image input → the base constructs THIS square
 * automatically. One input component; no card hand-rolls its own
 * file field ever again.
 */
import { createElement as h, useRef, useState } from 'react';
import { isModelUrl, mediaKindOf, mediaVocab } from '@melite/contracts/mediaKinds';
import { runHostMediaUrl } from '@melite/contracts/benchStage';
import { IconPlusOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { GlbStagePreview } from "./glb-stage.js";
import { ASSET_DRAG_MIME, parseAssetDrop } from "./chrome.js";
import { Upload } from "./icons.js";
import css from './card.module.css';
import { t } from "./locales/square.js";
export { ASSET_DRAG_MIME } from "./chrome.js";
/** THE "is this a thumbnail" rule (SlotSquare's, kept verbatim):
 *  data: images, blob: fresh-upload mirrors, and http(s)/root-relative
 *  artifact URLs. Every slot-shaped value renders the same way. */
// THE IMAGE FACE IS THE SHARED VOCABULARY, MINUS SVG (the
// MCP/media audit's M1): these predicates used to retype their own
// extension list, so an extension the classifier knows (svg) never
// rendered, one it does not (avif) rendered but never listed, and
// neither was a bug anyone could see. The list is the media
// contract's now, plus avif (which the square has always rendered)
// MINUS svg — a DELIBERATE divergence, pinned by the square wall:
// an svg is classified as an image (it IS one) but a square would
// embed it as a document, so the thumbnail face refuses it and the
// picker offers it as a file.
const IMAGE_EXTS = [...mediaVocab().image, "avif"].filter((e) => e !== "svg");
const IMAGE_EXT_RE = new RegExp("\\.(?:" + IMAGE_EXTS.join("|") + ")(?:[?#]|$)", "i");
/**
 * @param value - the attached value to test (estate path, artifact URL, or data URL).
 * @returns true when the value renders an image thumbnail on the square.
 */
export function isImageUrl(value) {
    return (/^data:image\//i.test(value) ||
        /^blob:/i.test(value) ||
        /^(?:https?:)?\/[^"'<>]*\./i.test(value) && IMAGE_EXT_RE.test(value));
}
/** THE INPUT-PATH DISPLAY MIRROR (2026-10-13, the operator's live
 *  burn: uploads persist as estate paths — 'data/input/x.png', the
 *  uploads door's own param currency — and the square rendered a
 *  BLANK face because no isImageUrl arm matches a relative path).
 *  The uploads door's contract already serves the bytes for the img
 *  tags (GET /v1/assets/inputs/<name>, doors.ts's own doc line);
 *  this resolver is the display half: an estate input path with an
 *  image extension renders from the assets door. DISPLAY ONLY —
 *  the param keeps the estate path verbatim (the run stages it
 *  into the engine's input dir; the currency law, wire.ts). */
/**
 * @param value - the attached value (an estate input path or any other string).
 * @returns the assets-door display URL for an estate input path, else null.
 */
export function estateInputUrl(value) {
    const m = /^data\/input\/([^/]+)$/.exec(value);
    if (m === null)
        return null;
    const name = m[1];
    return IMAGE_EXT_RE.test(name) ? '/v1/assets/inputs/' + encodeURIComponent(name) : null;
}
/** THE VIDEO FACE of the same rule (the operator's live burn,
 *  2026-10-28: a clip value — `data/input/Makhna clip.webm`, the
 *  uploads door's own param currency — rendered the HELD face (raw
 *  text, never a player), and an in-flight video upload's data-URL
 *  mirror rendered megabytes of base64 AS TEXT. The assets door
 *  already answers video bytes (video/mp4, doors.ts's own doc
 *  line); the square just never asked). A video value — a data:
 *  video URL, an estate input path with a video extension, or any
 *  servable video URL — renders the ONE square with a muted inline
 *  <video> (metadata preload, no autoplay: a grid that plays is a
 *  burn of its own). The classifier is the shared vocabulary's
 *  (mediaKindOf — never a private extension list); blob: mirrors
 *  are image-arm only (the provider mints them from image Files).
 */
/**
 * @param value - the attached value to test (estate path, artifact URL, or data URL).
 * @returns true when the value renders an inline video player on the square.
 */
export function isVideoUrl(value) {
    if (/^data:video\//i.test(value))
        return true;
    if (/^blob:/i.test(value))
        return false;
    // split with a limit still splits (the isModelUrl idiom): [0] is
    // the query/fragment-stripped name the vocabulary judges.
    const withoutQuery = value.split(/[?#]/, 1)[0] ?? value;
    return mediaKindOf(withoutQuery) === 'video';
}
/**
 * @param value - the attached value (an estate input path or any other string).
 * @returns the assets-door display URL for an estate input path with a video extension, else null.
 */
export function estateInputVideoUrl(value) {
    const m = /^data\/input\/([^/]+)$/.exec(value);
    if (m === null)
        return null;
    const name = m[1];
    return mediaKindOf(name) === 'video' ? '/v1/assets/inputs/' + encodeURIComponent(name) : null;
}
/** THE MESH FACE of the same rule (the mesh wire type, 2026-09-21 —
 *  the base-gaps primitive ③): a .glb/.gltf value — an estate path
 *  ('data/input/x.glb') or a run artifact URL — renders the ONE
 *  square with the inline GLB thumb (the mini GlbStagePreview), the
 *  same square grammar as images: never a bespoke mesh picker. */
/**
 * @param value - the attached value to test.
 * @returns true when the value is a .glb/.gltf and renders the inline mesh thumb.
 */
export function isMeshUrl(value) {
    // THE CONTRACT OWNS THIS (2026-10-13): four seats carried their
    // own model regex and had already drifted on query/fragment
    // handling. The vocabulary in @melite/contracts answers for all.
    return isModelUrl(value);
}
export const DEFAULT_SQUARE_ACCEPT = 'image/png,image/jpeg,image/webp';
export const MESH_SQUARE_ACCEPT = '.glb,.gltf';
export const VIDEO_SQUARE_ACCEPT = 'video/mp4,video/webm,video/quicktime';
/**
 * @param props - the field's label, attached value, verbs (pick/file/asset/clear), and optional chrome (badge, metric, emptyIcon, accept, showFileAction).
 * @returns the square: thumb/empty face, the verbs' controls, and the caption.
 */
export function InputSquare(props) {
    const { label, value, metric, disabled } = props;
    const seat = props.ariaLabel ?? label;
    const fileRef = useRef(null);
    const boxRef = useRef(null);
    const [over, setOver] = useState(false);
    // THE DEAD-SRC FACE (the agent-slot burn's other half, 2026-11-12):
    // a value isImageUrl passes but the origin cannot serve (a host
    // path addressing no run media, a dead remote) renders the
    // BROWSER'S broken-image glyph — an error the UI never chose. The
    // <img>'s own onError flips that src to the HELD face (the value in
    // the mono line, the detach ✕ still armed) — the same held face the
    // unrenderable spellings paint, reached from the wire's own
    // verdict. Keyed by src: a NEW value retries its own fetch.
    const [dead, setDead] = useState(null);
    // THE DISPLAY ORDER (the mirror law): a persisted estate upload
    // ('data/input/x.png') renders from the assets door — never a
    // blank face after close/reopen (the fresh-upload mirror rides a
    // different prop seat, SourceRow's shown).
    // THE HOST-PATH ARM (the agent-slot preview burn, 2026-11-12): an
    // agent patches melite_view's HOST spelling into the slot — a real,
    // run-stageable artifact path no <img> can fetch. The contract's
    // runHostMediaUrl rewrites it to the media route the same bytes
    // serve from (run-id segment → /melite-media/runs/…), gated by each
    // arm's own kind vocabulary so an .mp4 host path renders the video
    // arm, never an <img>.
    const hostMedia = typeof value === 'string' ? runHostMediaUrl(value) : null;
    const thumb = typeof value === 'string'
        ? estateInputUrl(value)
            ?? (hostMedia !== null && IMAGE_EXT_RE.test(value) ? hostMedia : null)
            ?? (isImageUrl(value) ? value : null)
        : null;
    const mesh = thumb === null && typeof value === 'string' && value !== '' && isMeshUrl(value)
        ? (hostMedia ?? value) : null;
    // THE VIDEO ARM (the no-preview cure, 2026-10-28): below the image
    // arm (the vocabularies are disjoint, so order never misfires —
    // mediaKindsDisjoint pins it), above mesh. An estate video path
    // renders from the assets door; a data: video URL renders
    // verbatim (the in-flight upload mirror — never megabytes of
    // base64 as text again).
    const video = thumb === null && mesh === null && typeof value === 'string' && value !== ''
        ? estateInputVideoUrl(value)
            ?? (hostMedia !== null && isVideoUrl(value) ? hostMedia : null)
            ?? (isVideoUrl(value) ? value : null)
        : null;
    // the dead-src flip only SPEAKS for the face it killed: a flipped
    // thumb renders the held face below (a new value changes thumb, the
    // flip goes stale, the img retries).
    const thumbDead = dead !== null && dead === thumb;
    const videoDead = dead !== null && dead === video;
    // THE DETACH LAW (2026-11-04, the stale-✕ cure): `held` is the
    // durable fact — the slot OWNS a value. `empty` is the VIEW fact —
    // nothing renders. The ✕ (a write verb) rides HELD, never the
    // view: a value no preview can render (a bare artifact name, an
    // unresolved path) kept its square on the PLUS face with NO ✕, so
    // the slot could be re-picked but never detached — the write
    // affordance gated on presentation inverted the presenter law
    // (the face derives from the value; the verb belongs to the fact).
    const held = typeof value === 'string' && value !== '';
    const empty = thumb === null && mesh === null && video === null && !held;
    const acceptsDrop = (event) => {
        // PAYLOAD FIRST (the typeless-drop law): a drop carrying an asset
        // payload or files IS a drop — types is a hint browsers populate,
        // never the arbiter (synthetic drops and some hosts leave it
        // empty/null while carrying files).
        if (event.dataTransfer.getData(ASSET_DRAG_MIME) !== '' || event.dataTransfer.files.length > 0)
            return true;
        const types = event.dataTransfer.types;
        if (types === undefined || types === null)
            return false;
        return types.includes(ASSET_DRAG_MIME) || types.includes('Files');
    };
    const pick = () => {
        if (disabled)
            return;
        if (props.onPick !== undefined)
            props.onPick(boxRef.current);
        else if (empty && props.onFile !== undefined)
            fileRef.current?.click();
    };
    return h('div', { className: css.squareWrap + (disabled ? ' ' + css.squareOff : '') }, h('div', {
        ref: boxRef,
        className: css.squareBox + (over ? ' ' + css.squareOver : ''),
        role: 'button',
        tabIndex: 0,
        'data-slot-square': true,
        'aria-label': seat !== '' ? t('seatSource', { seat }) : t('sourceFallback'),
        onClick: pick,
        onKeyDown: (e) => { if (e.key === 'Enter')
            pick(); },
        onDragOver: (e) => {
            if (disabled || !acceptsDrop(e))
                return;
            e.preventDefault();
            setOver(true);
        },
        onDragLeave: () => { setOver(false); },
        onDrop: (e) => {
            setOver(false);
            if (disabled || !acceptsDrop(e))
                return;
            e.preventDefault();
            const asset = parseAssetDrop(e.dataTransfer.getData(ASSET_DRAG_MIME));
            if (asset.url !== undefined && props.onAsset !== undefined) {
                props.onAsset(asset.url);
                return;
            }
            const file = e.dataTransfer.files[0];
            if (file !== undefined && props.onFile !== undefined)
                props.onFile(file);
        },
    }, thumb !== null && !thumbDead
        ? h('img', {
            className: css.squareThumb,
            src: thumb,
            alt: label,
            onError: () => { setDead(thumb); },
        })
        : video !== null && !videoDead
            ? h('video', {
                className: css.squareThumb,
                src: video,
                muted: true,
                playsInline: true,
                preload: 'metadata',
                onError: () => { setDead(video); },
            })
            : mesh !== null
                ? h('div', { className: css.squareMesh }, h(GlbStagePreview, { assets: [{ id: 'square-mesh', url: mesh }], label: 'square-mesh' }))
                // THE HELD FACE: a full slot shows WHAT it holds — the raw
                // value in the mono line — never the PLUS "add" glyph (the
                // same detach law's view arm; the hover title is the
                // locale's, the content is data, not copy).
                : held
                    ? h('span', { className: css.squareHeld, title: t('heldNoPreview') }, value)
                    : props.emptyIcon === undefined
                        ? h(IconPlusOutlineRegular, { className: css.squareGlyph })
                        : h('span', { className: css.squareEmptyIcon }, props.emptyIcon), props.actions !== undefined && props.actions !== null && props.actions !== false && !disabled
        ? h('span', {
            className: css.squareActions,
            onClick: (event) => { event.stopPropagation(); },
        }, props.actions)
        : null, !empty && props.onClear !== undefined
        ? h('button', {
            // ARGUED RAW SEAT (S7j): the 22px overlay icon-verbs are
            // DSH's own helpButton idiom — raw <button> + module css
            // around a small glyph (ui-primitives settings-form
            // fields.tsx:71-76); the chip-contrast wall owns their
            // token pair.
            className: css.squareX,
            type: 'button',
            title: t('detach'),
            'aria-label': t('detachSeat', { seat: seat || t('sourceFallback') }),
            onClick: (e) => { e.stopPropagation(); props.onClear(); },
        }, '✕')
        : null, props.showFileAction === true && props.onFile !== undefined && !disabled
        ? h('button', {
            // ARGUED RAW SEAT (S7j): the helpButton idiom again — the
            // 22px overlay icon-verb (fields.tsx:71-76 receipt).
            className: css.squarePick,
            type: 'button',
            title: t('pickFileFor', { label }),
            'aria-label': t('pickFileFor', { label }),
            'data-slot-pick': true,
            onClick: (event) => {
                event.stopPropagation();
                fileRef.current?.click();
            },
        }, h(Upload, { 'aria-hidden': true }))
        : null), label !== '' ? h('span', { className: css.squareLabel, 'data-slot-label': true }, label) : null, props.badge === undefined
        ? null
        : h('span', { className: css.squareBadge, 'data-slot-badge': true }, props.badge), metric !== undefined ? h('span', { className: css.squareMetric }, metric) : null, props.onFile !== undefined && !disabled
        ? h('input', {
            // ARGUED RAW SEAT (S6j/S7j, the file-input class): the
            // catalog ships no file atom (the Input atom is text-only),
            // and DSH's own composer rides the native hidden control
            // (ui-conversation skeleton/InputBar.tsx:434-441).
            ref: fileRef,
            type: 'file',
            accept: props.accept ?? DEFAULT_SQUARE_ACCEPT,
            className: css.squareFileInput,
            'data-slot-input': true,
            'aria-hidden': true,
            tabIndex: -1,
            onChange: (e) => {
                const file = e.target.files?.[0];
                if (file !== undefined && file !== null)
                    props.onFile?.(file);
                if (fileRef.current !== null)
                    fileRef.current.value = '';
            },
        })
        : null);
}
//# sourceMappingURL=square.js.map