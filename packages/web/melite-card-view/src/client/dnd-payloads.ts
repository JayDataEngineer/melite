/** dnd-payloads.ts — the old system's drag MIME pair + parsers
 * (extracted from CardsTab.tsx hour 15; the MIME pair is the law). */



/** The OLD system's drag contract, VERBATIM (2026-08-08/08-22 era,
 *  recovered from d13560be^ packages/web-kit): capability tiles carry
 *  a fully-resolved card; asset tiles carry {url, type}. One drop
 *  target, two contracts, no ambiguity — the MIME pair is the law. */
export const CAPABILITY_DRAG_MIME = 'application/tech-noir-capability'
export const ASSET_DRAG_MIME = 'application/tech-noir-asset'
/** The tile-reorder drag's MIME (native HTML5 sortable — DSH ships no
 *  drag library; the estate drags natively). Carries the source id. */
export const CARD_DRAG_MIME = 'application/x-melite-card'

interface CapabilityDropPayload { service: string; title: string; params?: Record<string, unknown>; kind?: string }

/** Parse the capability MIME off a drop event. null = absent or
 *  malformed (falls through to the asset/file path) — old law. */
export function parseCapabilityDrop(raw: string): CapabilityDropPayload | null {
  if (raw === '') return null
  try {
    const p = JSON.parse(raw) as Partial<CapabilityDropPayload>
    if (typeof p.service === 'string' && typeof p.title === 'string') return p as CapabilityDropPayload
    return null
  } catch { return null }
}

interface AssetDropPayload { url?: string; type?: string }

export function parseAssetDrop(raw: string): AssetDropPayload {
  if (raw === '') return {}
  try { return JSON.parse(raw) as AssetDropPayload } catch { return {} }
}
