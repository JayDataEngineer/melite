/**
 * Card chrome primitives — the ONE joiner + the ONE file reader
 * (founded 2026-09-12, debt extermination: anny/ideo cx, motion/h3
 * clsx-cn, and the four identical readAsDataURL copies collapsed
 * here). DOM-free, no CSS, no atoms — safe for node and browser.
 *
 * Per-seam subpath: `@melite/card-base/chrome`.
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

/** Blob → data URL (FileReader promise). */
export function readAsDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error ?? new Error("read failed"))
    reader.readAsDataURL(file)
  })
}

/** THE ESTATE'S DRAG CONTRACT (2026-09-18, exterminated): the MIME
 *  under which an upstream asset rides a drop payload — a JSON blob
 *  {url, name, …} carried by the source's dataTransfer. h3's kit and
 *  motion's kit each redeclared it; card-base, the card-view's
 *  CardsTab and input-square already consumed it. One definition
 *  estate-wide (the drag is a shared contract, not a studio rule). */
export const ASSET_DRAG_MIME = "application/tech-noir-asset"
