/**
 * cardElements — melite-core's CARD ELEMENT claims (2026-08-19, the
 * overrides doctrine). The tile's icon / preview / run cells, extracted
 * VERBATIM from flowCardTile and registered on the element slots at
 * precedence 10 — the quietest tier. Dogfood law, BOTH directions: the
 * tile consults the slots (never names a renderer), and melite-core's own
 * rendering rides the SAME seam a plugin override would. A plugin
 * shadows these by registering louder (e.g. precedence 200); it never
 * forks the tile.
 *
 * Tier plan (10 = first-party default; body lane mirrors this):
 *   10  melite-core/kind-icon     — kinds-lane icon data → genre fallback
 *   10  melite-core/asset-preview — motion/video/audio/img/icon cell
 *   10  melite-core/tile-run      — play/reroll button (seed-visibility rule)
 */
import { Activity, Film, Music, FileText, Image as ImageIcon, Box, Play, RotateCw, Shapes } from "lucide-react"
import { useState } from "react"
import { cn } from "@melite/ui"
import { Tip } from "@melite/ui/tip"
import { Button } from "@melite/ui/button"
import { audioViewerSlot } from "@melite/slots"
import { kindDef } from "@melite/slots"
import { useMotionThumbStore } from "@melite/ui"
import { cardIsRunnable, tilePlayAffordance, isAudioOutput } from "./flowCardTypes"
import type { CardGenre } from "@melite/contracts"
import { cardIconSlot, type CardIconInput, type CardPreviewProps, type CardRunProps } from "@melite/slots"

// The genre glyph chain tail — moved VERBATIM from flowCardTile (the
// kinds-lane icon is the HEAD of the chain; this is the pre-lane default).
const GENRE_ICON: Record<CardGenre, typeof ImageIcon> = {
  image: ImageIcon, video: Film, "3d": Box, audio: Music, motion: Activity,
  other: Shapes, text: FileText,
}

// ── icon: kinds-lane data → genre glyph → generic image ─────────────
function resolveKindIcon({ stage, genre }: CardIconInput) {
  // The kinds lane owns the head: a kind-declared icon (yaml) wins over
  // the genre glyph. Both are DATA; this claim just folds them into the
  // one component the host renders.
  return { Icon: kindDef(stage.kind).icon ?? GENRE_ICON[genre] ?? ImageIcon }
}

// ── missing artifact: the pruned-run state ─────────────────────────
// A run's sidecar outlives its artifacts (the gateway serves runs from
// data/runs/output; an externally pruned run dir 404s every asset URL —
// the operator's 2026-09-05 "krea-2" alt-text cards). A dead <img> renders
// its alt text as document content (the broken preview); this cell
// replaces it at onError: an honest "artifact missing — run pruned" note
// on the quiet field, never alt-text-as-content. The dead-url comparison
// (not a boolean) auto-resets when the url changes — no effect needed.
export function MissingArtifactCell({ label, className }: { label: string; className?: string }) {
  return (
    <div
      className={cn("flex flex-col items-center justify-center gap-1 bg-sidebar-accent/40 px-2 text-center", className)}
      role="img"
      aria-label={`artifact missing for ${label}`}
      title="artifact missing — the run's output directory was pruned"
    >
      <ImageIcon className="h-5 w-5 shrink-0 text-muted-foreground/40" />
      <p className="text-[10px] leading-tight text-muted-foreground/70">artifact missing — run pruned</p>
    </div>
  )
}

// ── preview: the artifact cell, extracted verbatim ──────────────────
/** The default preview cell. Motion cards output NPZ (not viewable as
 *  <img>); MotionCardEditor stashes a canvas screenshot in the motion
 *  thumb store — shown when present, else the dark motion placeholder.
 *  Audio outputs render the waveform (an <img> of a .wav URL is a
 *  broken-image icon — the "bugs out" the user saw); video branches to a
 *  muted loop; everything else is the plain artifact <img>. No artifact
 *  → the icon-slot glyph on a quiet field (never a blank void).
 *  FILL CONTRACT (2026-08-26, "the entire card IS the preview"): the
 *  host's preview cell is flex-1 min-h-0 (flowCardTile LAYOUT LAW),
 *  so every branch FILLS it — media rides flex-1 + object-cover (grows
 *  with a stretched row instead of stranding blank card background below
 *  the artifact), the idle placeholder keeps the host's SQUARE ratio as
 *  its solo floor while still growing (SQUARE LAW, flowCardTile —
 *  2026-08-23), and the audio wave centers via my-auto. */
export function RayCoreCardPreview({ stage, url, genre }: CardPreviewProps) {
  audioViewerSlot.useVersion() // the waveform cell flows in from melite-audio
  // The hook is called unconditionally (Rules of Hooks) — the selector
  // returns undefined for non-motion genres so those cards never
  // re-render when a thumbnail lands.
  const motionThumb = useMotionThumbStore((s) =>
    genre === "motion" ? s.thumbnails[stage.id] : undefined,
  )
  // Pruned-run state (2026-09-05): a dead artifact URL swaps to the
  // missing cell at onError. Compared by url so a new artifact (re-run)
  // renders without a reset effect.
  const [deadUrl, setDeadUrl] = useState<string | null>(null)
  const Icon = resolveKindIcon({ stage, genre }).Icon
  if (genre === "motion") {
    return motionThumb ? (
      <img src={motionThumb} alt={stage.title} className="block h-full w-full object-cover" loading="lazy" />
    ) : (
      <div className="flex w-full flex-1 items-center justify-center bg-[#0e0e1a]">
        <Activity className="h-7 w-7 text-brand/40" />
      </div>
    )
  }
  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground/25">
        <Icon className="h-7 w-7" />
      </div>
    )
  }
  if (/^.*\.(mp4|webm)$/i.test(url)) {
    return <video src={url} className="block h-full w-full object-cover" muted loop playsInline />
  }
  if (isAudioOutput(url, genre)) {
    // Audio output — the waveform IS the thumbnail. pointer-events-none
    // so the click falls through to the tile's onClick (opens the
    // drilldown) — interactive scrub / play lives in the drilldown's
    // full AudioPlayer.
    return (
      <div className="pointer-events-none my-auto flex h-16 w-full shrink-0 items-center bg-[#0e0e1a] px-3">
        <AudioWaveCell url={url} />
      </div>
    )
  }
  if (deadUrl === url) {
    return <MissingArtifactCell label={stage.title} className="h-full w-full" />
  }
  return (
    <img
      src={url}
      alt={stage.title}
      className="block h-full w-full object-cover"
      loading="lazy"
      onError={() => setDeadUrl(url)}
    />
  )
}

// ── run: the tile play/reroll affordance, extracted verbatim ────────
/** The default run affordance — visible ONLY when tapping it actually
 *  does something useful:
 *  • pending / error → start or retry (always meaningful)
 *  • done / stale / cached / reused with seed = -1 → reroll (random mode
 *    only; a fixed seed produces an identical output, so the affordance
 *    would be a deceptive no-op)
 *  • running → hidden (the stage is already going)
 *  • skipped → hidden (no work to do)
 *  The user's spec is exact: "only if the seed is set to -1 for rerolls".
 *  Click STOP-PROPAGATION so it never opens the inline detail — that
 *  stays a separate click (preview/zoom). */
export function RayCoreTileRun({ stage, running, onRun }: CardRunProps) {
  const playAffordance = tilePlayAffordance(stage, running)
  const showPlay = playAffordance !== null && onRun !== undefined && cardIsRunnable(stage)
  if (!showPlay || !onRun) return null
  return (
    <Tip tip={playAffordance!.verb}>
      <Button
        type="button"
        variant="default"
        size="icon"
        onClick={(e) => { e.stopPropagation(); onRun() }}
        aria-label={playAffordance!.verb}
        data-tile-play={playAffordance!.verb.toLowerCase()}
        className="absolute bottom-1 right-1.5 h-6 w-6 rounded-full bg-brand text-white shadow-md shadow-brand/30 transition-all hover:bg-brand/85 hover:scale-105 active:scale-95"
      >
        {playAffordance!.icon === "play"
          ? <Play className="h-3 w-3 translate-x-px" />
          : <RotateCw className="h-3 w-3" />}
      </Button>
    </Tip>
  )
}

// ── registration (2026-08-21 lane parity) ────────────────────────────
// PREVIEW + RUN ride the UI-CLAIM LANE now: packages/melite-core/ui/
// {asset-preview,tile-run}/ui.yaml → GET /v1/ui-slots → syncPluginUi —
// the first-party claims ride the same wire as any override (the
// drawer/sidebar law). The bridge components re-export the
// implementations below (curated tier). The ICON claim stays a CODE
// registration by SHAPE, not lag: it is a per-stage DATA fold
// (kinds-lane icon → genre glyph → generic), and the ui lane's
// factories bind FIXED components — a fold is not a component claim. It
// contains zero plugin domain (genre glyphs are the shell's generic
// fallback vocabulary); its inputs are already lane data (the kinds
// lane).
const _disposers = [
  cardIconSlot.register({ id: "melite-core/kind-icon", precedence: 10, resolve: resolveKindIcon }),
]

/** Test organ: drop the first-party claims (the seam itself stays). */
export function disposeRayCoreCardElements(): void {
  for (const d of _disposers) d()
}

// ── the audio tile cell (viewer seam, 2026-08-21) ────────────────────────
// The peaks waveform FLOWS IN from melite-audio over the ui-claim wire
// (tile mode). Claim absent (plugin disabled) → an honest dark cell
// with a music glyph — never a broken <img>.
function AudioWaveCell({ url }: { url: string }) {
  const Viewer = audioViewerSlot.resolve(null)?.Viewer
  if (!Viewer) {
    return <span className="pointer-events-none text-muted-foreground/40">audio</span>
  }
  return <Viewer url={url} mode="tile" />
}
