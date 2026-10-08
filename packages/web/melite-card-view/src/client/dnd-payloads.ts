/** dnd-payloads.ts — the drag contract's re-export seam (the old
 *  system's MIME pair + parsers, one home since the J10 consolidation,
 *  2026-10-18: card-base chrome.ts owns the MIME pair and BOTH parse
 *  halves; the only local fact left is the tile-reorder MIME). */


export { ASSET_DRAG_MIME, CAPABILITY_DRAG_MIME, parseAssetDrop, parseCapabilityDrop, isMalformedCapabilityDrop, type AssetDropPayload, type CapabilityDropPayload } from '@melite/card-base/client'
/** The tile-reorder drag's MIME (native HTML5 sortable — DSH ships no
 *  drag library; the estate drags natively). Carries the source id. */
export const CARD_DRAG_MIME = 'application/x-melite-card'
