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
import { clsx, type ClassValue } from "clsx"

/** Plain classnames joiner (no conflicting utilities to merge —
 *  plain join is exact). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ")
}

/** The merging joiner (clsx — objects/arrays/conditionals). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs)
}

/** Blob → data URL (the shared FileReader promise, @melite/formats). */
export { readAsDataURL } from '@melite/formats/readFile'

/** THE ESTATE'S DRAG CONTRACT (2026-09-18, exterminated): the MIME
 *  under which an upstream asset rides a drop payload — a JSON blob
 *  {url, name, …} carried by the source's dataTransfer. h3's kit and
 *  motion's kit each redeclared it; card-base, the card-view's
 *  CardsTab and input-square already consumed it. One definition
 *  estate-wide (the drag is a shared contract, not a studio rule). */
export const ASSET_DRAG_MIME = "application/tech-noir-asset"

export interface AssetDropPayload {
  url?: string
  type?: string
}

export function parseAssetDrop(raw: string): AssetDropPayload {
  if (raw === '') return {}
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return {} }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
  const payload = parsed as Record<string, unknown>
  const url = typeof payload['url'] === 'string' && payload['url'] !== '' ? payload['url'] : undefined
  const type = typeof payload['type'] === 'string' && payload['type'] !== '' ? payload['type'] : undefined
  return {
    ...(url === undefined ? {} : { url }),
    ...(type === undefined ? {} : { type }),
  }
}
