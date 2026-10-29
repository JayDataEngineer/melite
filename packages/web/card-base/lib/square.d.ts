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
import { createElement as h, type ReactNode } from 'react';
export { ASSET_DRAG_MIME } from './chrome.js';
/**
 * @param value - the attached value to test (estate path, artifact URL, or data URL).
 * @returns true when the value renders an image thumbnail on the square.
 */
export declare function isImageUrl(value: string): boolean;
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
export declare function estateInputUrl(value: string): string | null;
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
export declare function isVideoUrl(value: string): boolean;
/**
 * @param value - the attached value (an estate input path or any other string).
 * @returns the assets-door display URL for an estate input path with a video extension, else null.
 */
export declare function estateInputVideoUrl(value: string): string | null;
/** THE MESH FACE of the same rule (the mesh wire type, 2026-09-21 —
 *  the base-gaps primitive ③): a .glb/.gltf value — an estate path
 *  ('data/input/x.glb') or a run artifact URL — renders the ONE
 *  square with the inline GLB thumb (the mini GlbStagePreview), the
 *  same square grammar as images: never a bespoke mesh picker. */
/**
 * @param value - the attached value to test.
 * @returns true when the value is a .glb/.gltf and renders the inline mesh thumb.
 */
export declare function isMeshUrl(value: string): boolean;
export interface InputSquareVerbs {
    /** a) THE PICKER — the slot IS the wire: opens the menu of the
     *  other stages' latest outputs (+ upload + clear); receives the
     *  square's element so the menu anchors on it. */
    onPick?: (anchor?: unknown) => void;
    /** b) from file upload — the hidden picker AND OS drops. */
    onFile?: (file: File) => void;
    /** c) from media bar — the asset-tray drop (URL payload). */
    onAsset?: (url: string) => void;
    /** The X (detach) — fired when a value is set. */
    onClear?: () => void;
}
export declare const DEFAULT_SQUARE_ACCEPT = "image/png,image/jpeg,image/webp";
export declare const MESH_SQUARE_ACCEPT = ".glb,.gltf";
export declare const VIDEO_SQUARE_ACCEPT = "video/mp4,video/webm,video/quicktime";
export interface InputSquareProps extends InputSquareVerbs {
    /** Short field key shown under the square (e.g. "input_image").
     *  Empty string = NO caption (the owning section already names it
     *  — the 2026-09-15 duplicate-label fix). */
    label: string;
    /** The ACCESSIBLE name when the visible caption is not the seat's
     *  name (the input stacks, #37: the head names the list, cells
     *  show their INDEX — aria carries "Reference images 1"). Falls
     *  back to `label`. */
    ariaLabel?: string;
    /** Attached value → thumbnail when it passes isImageUrl; a
     *  .glb/.gltf value renders the inline mini GLB viewport instead
     *  (the mesh wire type — same square, same verbs). */
    value?: string | null;
    /** Secondary mono line. */
    metric?: string;
    disabled?: boolean;
    accept?: string;
    badge?: ReactNode;
    actions?: ReactNode;
    emptyIcon?: ReactNode;
    showFileAction?: boolean;
}
/**
 * @param props - the field's label, attached value, verbs (pick/file/asset/clear), and optional chrome (badge, metric, emptyIcon, accept, showFileAction).
 * @returns the square: thumb/empty face, the verbs' controls, and the caption.
 */
export declare function InputSquare(props: InputSquareProps): ReturnType<typeof h>;
//# sourceMappingURL=square.d.ts.map