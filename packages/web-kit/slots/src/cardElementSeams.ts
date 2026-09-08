/**
 * cardElementSeams — the card's ELEMENT slots (2026-08-19, the
 * overrides doctrine: "cards are a composition of elements").
 * The body was the first slot (cardBodySeam); the card's other cells
 * follow on the SAME kernel: the tile is a composition, and every cell
 * is a place a provider can claim. A plugin can shadow the preview cell
 * (its own thumbnail renderer), the icon (an animated glyph), or the run
 * affordance (a custom action surface) — by registering louder, never
 * by forking the tile.
 *
 * Law split (recorded in the docs): KINDS are data (one owner per kind,
 * no shadowing — they are persisted document vocabulary); ELEMENTS are
 * chrome (many claimants, precedence decides — the DSH widget model).
 *
 * First-party defaults register in cardElements.tsx at precedence 10
 * (dogfood law: melite-core's own rendering is just the quietest claim).
 * Hosts fail-safe: an unclaimed cell renders the host's own fallback,
 * never a blank.
 */
import type { ComponentType } from "react"
import { createUiSlot } from "./uiSlotSeam"
import type { CardStage } from "@melite/contracts"
import type { CardGenre } from "@melite/contracts"
// ── icon ────────────────────────────────────────────────────────────
/** The walk input: everything an icon decision needs. */
export interface CardIconInput {
  stage: CardStage
  genre: CardGenre
}

/** The claim: a glyph component (className-sized, like lucide). */
export interface CardIconElement {
  Icon: ComponentType<{ className?: string }>
}

export const cardIconSlot = createUiSlot<CardIconElement, CardIconInput>("card-icon")

// ── preview cell ────────────────────────────────────────────────────
/** Props the preview component receives. The default claim computes the
 *  motion thumbnail itself (it owns the motionThumb store read); an
 *  override gets the same three facts and renders its own cell. */
export interface CardPreviewProps {
  stage: CardStage
  /** The stage's first artifact URL, when one exists. */
  url: string | undefined
  genre: CardGenre
}

export interface CardPreviewElement {
  Preview: ComponentType<CardPreviewProps>
}

export const cardPreviewSlot = createUiSlot<CardPreviewElement, CardPreviewProps>("card-preview")

// ── run affordance ──────────────────────────────────────────────────
/** Props the run component receives — the SAME facts the visibility
 *  rule (tilePlayAffordance) consumes. The default claim hides itself
 *  when tapping would be a no-op; an override decides for itself. */
export interface CardRunProps {
  stage: CardStage
  running: boolean
  /** The execute callback. Undefined = this surface wires no run — the
 *  default claim stays hidden. */
  onRun: (() => void) | undefined
}

export interface CardRunElement {
  Run: ComponentType<CardRunProps>
}

export const cardRunSlot = createUiSlot<CardRunElement, CardRunProps>("card-run")

// ── studio cells ───────────────────────────────────────────────────
// (History, 2026-09-07: the studio preview/strip ELEMENT slots
//  (cardStudioPreviewSlot / cardStudioStripSlot) are DELETED — the
//  aspirational element-slot decomposition never gained a consumer.
//  The studio's preview + strip ride the StudioShell CENTER and
//  BOTTOM seams now (tenant-declared ReactNode, the shared pane
//  kit's PaneShell/PaneHeader chrome — docs/design/studio-chrome.md),
//  which composes without a claim registry. The card TILE's element
//  slots above stay live: icon/preview/run are tile chrome.)
