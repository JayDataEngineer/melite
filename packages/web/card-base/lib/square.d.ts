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
export declare function isImageUrl(value: string): boolean;
/** THE MESH FACE of the same rule (the mesh wire type, 2026-09-21 —
 *  the base-gaps primitive ③): a .glb/.gltf value — an estate path
 *  ('data/input/x.glb') or a run artifact URL — renders the ONE
 *  square with the inline GLB thumb (the mini GlbStagePreview), the
 *  same square grammar as images: never a bespoke mesh picker. */
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
export declare function InputSquare(props: InputSquareProps): ReturnType<typeof h>;
//# sourceMappingURL=square.d.ts.map
