/**
 * Card chrome primitives — the ONE joiner + the card-base face of the
 * ONE file reader (founded 2026-09-12, debt extermination: anny/ideo
 * cx, motion/h3 clsx-cn). DOM-free, no CSS, no atoms — safe for node
 * and browser.
 *
 * `readAsDataURL` is @melite/formats' implementation, re-served here
 * so cards reach one door; @melite/formats/readFile.ts owns the body.
 *
 * Reached through the `/client` door (`@melite/card-base/client`).
 */
import { type ClassValue } from "clsx";
/** Plain classnames joiner (no conflicting utilities to merge —
 *  plain join is exact). */
export declare function cx(...parts: Array<string | false | null | undefined>): string;
/** The merging joiner (clsx — objects/arrays/conditionals). */
export declare function cn(...inputs: ClassValue[]): string;
/** Blob → data URL (the shared FileReader promise, @melite/formats). */
export { readAsDataURL } from '@melite/formats/readFile';
/** THE ESTATE'S DRAG CONTRACT (2026-09-18, exterminated): the MIME
 *  under which an upstream asset rides a drop payload — a JSON blob
 *  {url, name, …} carried by the source's dataTransfer. h3's kit and
 *  motion's kit each redeclared it; card-base, the card-view's
 *  CardsTab and input-square already consumed it. One definition
 *  estate-wide (the drag is a shared contract, not a studio rule). */
export declare const ASSET_DRAG_MIME = "application/tech-noir-asset";
/** The capability drag's MIME — a fully-resolved card rides the
 *  payload. Lives beside ASSET_DRAG_MIME: one home for the drag
 *  contract's MIME pair (DRY sweep C4+J10, 2026-10-18 — the literal
 *  previously rode both formats/capabilityCards.ts and card-view's
 *  dnd-payloads.ts). */
export declare const CAPABILITY_DRAG_MIME = "application/tech-noir-capability";
export interface AssetDropPayload {
    url?: string;
    type?: string;
}
export declare function parseAssetDrop(raw: string): AssetDropPayload;
/** A resolved card riding the capability drag (the drop's target
 *  params seed). `params`/`kind` are optional passengers. */
export interface CapabilityDropPayload {
    service: string;
    title: string;
    params?: Record<string, unknown>;
    kind?: string;
}
/** Parse the capability MIME off a drop event. null = absent or
 *  shape-wrong (falls through to the asset/file path).
 *
 *  L9 (the fallback audit, 2026-09-28): null once covered TWO worlds —
 *  the MIME genuinely absent (a foreign drag: fall through, correct)
 *  and the MIME PRESENT but unparseable (a corrupt capability drag
 *  the old law swallowed silent). isMalformedCapabilityDrop separates
 *  them; the drop handler badges the corrupt body instead of a no-op.
 *  The pair moved here from card-view's dnd-payloads.ts so the whole
 *  drag contract — MIME pair + both parsers — has ONE home beside the
 *  asset half (DRY sweep J10, 2026-10-18). */
export declare function parseCapabilityDrop(raw: string): CapabilityDropPayload | null;
/** True when the capability MIME body is PRESENT but unparseable or
 *  shape-wrong — a corrupt drag, not a foreign one. The consumer must
 *  badge this (never a silent no-op); foreign drags (raw === '') stay
 *  silent. */
export declare function isMalformedCapabilityDrop(raw: string): boolean;
//# sourceMappingURL=chrome.d.ts.map