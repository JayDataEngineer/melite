/** dnd-payloads.ts — the old system's drag MIME pair + parsers
 * (extracted from CardsTab.tsx hour 15; the MIME pair is the law). */



/** The drag contract: capability tiles carry a fully-resolved card;
 *  asset tiles carry {url, type}. One drop target, two contracts, no
 *  ambiguity — the MIME pair is the law. */
export { ASSET_DRAG_MIME, CAPABILITY_DRAG_MIME, parseAssetDrop, type AssetDropPayload } from '@melite/card-base/client'
/** The tile-reorder drag's MIME (native HTML5 sortable — DSH ships no
 *  drag library; the estate drags natively). Carries the source id. */
export const CARD_DRAG_MIME = 'application/x-melite-card'

interface CapabilityDropPayload { service: string; title: string; params?: Record<string, unknown>; kind?: string }

/** Parse the capability MIME off a drop event. null = absent or
 *  malformed (falls through to the asset/file path) — old law.
 *
 *  L9 (the fallback audit, 2026-09-28): `null` once covered TWO
 *  different worlds — the MIME data genuinely absent (a foreign
 *  drag: fall through, correct) and the MIME PRESENT but the body
 *  unparseable (a corrupt capability drag the old law swallowed
 *  silent). The third state below separates them; the drop handler
 *  badges the corrupt body instead of doing nothing. */
export function parseCapabilityDrop(raw: string): CapabilityDropPayload | null {
  if (raw === '') return null
  try {
    const p = JSON.parse(raw) as Partial<CapabilityDropPayload>
    if (typeof p.service === 'string' && typeof p.title === 'string') return p as CapabilityDropPayload
    return null
  } catch { return null }
}

/** True when the capability MIME body is PRESENT but unparseable or
 *  shape-wrong — a corrupt drag, not a foreign one. The consumer
 *  must badge this (never a silent no-op); foreign drags (raw === '')
 *  stay silent. */
export function isMalformedCapabilityDrop(raw: string): boolean {
  if (raw === '') return false
  try {
    const p = JSON.parse(raw) as Partial<CapabilityDropPayload>
    return !(typeof p.service === 'string' && typeof p.title === 'string')
  } catch { return true }
}
