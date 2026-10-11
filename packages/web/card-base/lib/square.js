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
import { isModelUrl, mediaVocab } from '@melite/contracts/mediaKinds';
import { IconPlusOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { GlbStagePreview } from "./glb-stage.js";
import { ASSET_DRAG_MIME, parseAssetDrop } from "./chrome.js";
import { Upload } from "./icons.js";
import css from './card.module.css';
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
export function isImageUrl(value) {
    return (/^data:image\//i.test(value) ||
        /^blob:/i.test(value) ||
        /^(?:https?:)?\/[^"'<>]*\./i.test(value) && IMAGE_EXT_RE.test(value));
}
/** THE MESH FACE of the same rule (the mesh wire type, 2026-09-21 —
 *  the base-gaps primitive ③): a .glb/.gltf value — an estate path
 *  ('data/input/x.glb') or a run artifact URL — renders the ONE
 *  square with the inline GLB thumb (the mini GlbStagePreview), the
 *  same square grammar as images: never a bespoke mesh picker. */
export function isMeshUrl(value) {
    // THE CONTRACT OWNS THIS (2026-10-13): four seats carried their
    // own model regex and had already drifted on query/fragment
    // handling. The vocabulary in @melite/contracts answers for all.
    return isModelUrl(value);
}
export const DEFAULT_SQUARE_ACCEPT = 'image/png,image/jpeg,image/webp';
export const MESH_SQUARE_ACCEPT = '.glb,.gltf';
export function InputSquare(props) {
    const { label, value, metric, disabled } = props;
    const seat = props.ariaLabel ?? label;
    const fileRef = useRef(null);
    const boxRef = useRef(null);
    const [over, setOver] = useState(false);
    const thumb = typeof value === 'string' && isImageUrl(value) ? value : null;
    const mesh = thumb === null && typeof value === 'string' && value !== '' && isMeshUrl(value)
        ? value : null;
    const empty = thumb === null && mesh === null;
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
        'aria-label': (seat || 'source') + (seat !== '' ? ' source' : ''),
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
    }, thumb !== null
        ? h('img', { className: css.squareThumb, src: thumb, alt: label })
        : mesh !== null
            ? h('div', { className: css.squareMesh }, h(GlbStagePreview, { assets: [{ id: 'square-mesh', url: mesh }], label: 'square-mesh' }))
            : props.emptyIcon === undefined
                ? h(IconPlusOutlineRegular, { className: css.squareGlyph })
                : h('span', { className: css.squareEmptyIcon }, props.emptyIcon), props.actions !== undefined && props.actions !== null && props.actions !== false && !disabled
        ? h('span', {
            className: css.squareActions,
            onClick: (event) => { event.stopPropagation(); },
        }, props.actions)
        : null, !empty && props.onClear !== undefined
        ? h('button', {
            className: css.squareX,
            type: 'button',
            title: 'Detach',
            'aria-label': 'Detach ' + (seat || 'source'),
            onClick: (e) => { e.stopPropagation(); props.onClear(); },
        }, '✕')
        : null, props.showFileAction === true && props.onFile !== undefined && !disabled
        ? h('button', {
            className: css.squarePick,
            type: 'button',
            title: `Pick a file for ${label}`,
            'aria-label': `Pick a file for ${label}`,
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