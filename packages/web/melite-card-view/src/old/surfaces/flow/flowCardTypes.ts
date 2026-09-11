/** flowCardTypes — the RUNTIME helpers over the @melite/contracts
 * card view-model (the types moved to the package; this file is
 * app behavior only). */
import type { CardStage, CardGenre, TilePlayAffordance } from "@melite/contracts"
import { kindDef } from "@melite/slots"

/** Audio output detection — genre-driven (the catalog declares `genre:
 * audio` on every audio family) with a URL-extension fallback for legacy
 * runs + data: URLs. Used by the tile thumbnail to render a waveform
 * instead of a broken <img>. */
export function isAudioOutput(url: string, genre?: CardGenre): boolean {
  if (genre === "audio") return true
  return (
    /\.(mp3|wav|flac|ogg|m4a|aac)(\?|#|$)/i.test(url) ||
    url.startsWith("data:audio/")
  )
}

/** A body card is an authoring surface (the Character Maker), not a runner:
 *  no family signature, no play affordance — its params feed downstream
 *  cards. ONE rule, both callers (tile play + the studio's Run row) —
 *  read from the kind registry (the runnable flag). */
export function cardIsRunnable(stage: CardStage): boolean {
  return kindDef(stage.kind).runnable
}

/** The tile-level play affordance (2026-08-07): null when no affordance
 * should render, else the {verb, icon} for the current state. */
export function tilePlayAffordance(stage: CardStage, running: boolean): TilePlayAffordance | null {
  if (running) return null
  switch (stage.status) {
    case "pending":
      return { verb: "Start", icon: "play" }
    case "error":
      return { verb: "Retry", icon: "reroll" }
    case "done":
    case "stale":
    case "cached":
    case "reused":
      // Explicit random-seed only — any other value (or absent) is a fixed
      // seed, where re-running produces identical bytes (a deceptive no-op).
      return stage.params?.seed === -1 ? { verb: "Reroll", icon: "reroll" } : null
    default:
      return null
  }
}
