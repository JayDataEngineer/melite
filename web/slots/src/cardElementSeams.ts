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

// ── studio preview cell ─────────────────────────────────────────────
/** The STUDIO's preview region — the right-side viewport above the
 *  timeline strip. For image cards this is the generated image; for
 *  video timeline this is the FilmPlayer + run history; for audio this
 *  is the waveform. The default claim renders the stage's first
 *  artifact URL as an <img> or <video>; overrides (timeline, body-3d)
 *  render their own rich preview. */
export interface CardStudioPreviewProps {
  stage: CardStage
  /** The stage's first artifact URL, when one exists. */
  url: string | undefined
  genre: CardGenre
  running: boolean
}

export interface CardStudioPreviewElement {
  Preview: ComponentType<CardStudioPreviewProps>
}

export const cardStudioPreviewSlot = createUiSlot<CardStudioPreviewElement, CardStudioPreviewProps>("card-studio-preview")

// ── studio strip cell ──────────────────────────────────────────────
/** The STUDIO's bottom strip — pinned below the preview, above the
 *  card edge. A GENERIC composition slot: each card type puts whatever
 *  it needs here.
 *
 *  Video timeline  → MotionTimelineBar (calls, beats, audio lanes, keyframes)
 *  Image gen       → reference image strip / prompt history / thumbnail gallery
 *  Audio           → waveform / clip arrangement / stem mixer
 *  3D              → material picker / turntable controls
 *  Most cards      → null claim (no strip needed)
 *
 *  The strip is the interaction model for temporal cards — drag edges
 *  to move cuts, click to select, double-click to add. Non-temporal
 *  cards may use it for reference grids, input pickers, or status bars.
 *  The slot is ONE place; multiple children may compose inside it
 *  (the host renders the first claim, like every other slot). */
export interface CardStudioStripProps {
  stage: CardStage
  running: boolean
  /** Param write channel — the strip may own params (timeline bar
   *  writes frame positions, audio clips; reference strip writes
   *  image URLs; etc.). */
  onSave: (params: Record<string, unknown>) => void
}

export interface CardStudioStripElement {
  Strip: ComponentType<CardStudioStripProps>
}

export const cardStudioStripSlot = createUiSlot<CardStudioStripElement, CardStudioStripProps>("card-studio-strip")
