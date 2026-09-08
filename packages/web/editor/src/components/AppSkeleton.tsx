// AppSkeleton — the loading shell shown while App.tsx awaits the three
// boot-time async ops (initializeTimeline, syncEnhanceFromBackend,
// initTagSync). These used to gate the ENTIRE app behind a full-screen
// spinner — a blank void for ~5 seconds. This skeleton mirrors the real
// WorkspaceLayout shape (ActivityBar rail + left drawer + header + main
// content area) so the user sees immediate structural feedback instead
// of a void: the page "is" the app, just dimmed.
//
// DSH EMBED: the rail + drawer are dead lanes inside DSH (isDshEmbed, the
// same law WorkspaceLayout renders under). Mirroring them in the boot
// skeleton painted chrome that the real layout never shows in embed —
// the "left app rail flashes for a second" symptom when the cards deck
// boots its /editor/ iframe. Embedded boots render the center skeleton
// alone, exactly what the embedded layout will show.
//
import { isDshEmbed } from "@/embedMode"
// The shapes are deliberately coarse (no real icons, no real text) —
// fine detail would flicker when the real layout lands. The pulse rate
// (Tailwind's animate-pulse, 2s cubic-bezier) matches shadcn's Skeleton
// convention. Each region sizes to the REAL fixed widths the layout
// uses (ActivityBar w-12, drawers w-64) so there's no layout shift when
// the real component swaps in.
import { Skeleton } from "@melite/ui/skeleton"

/**
 * A single pulsing icon slot for the ActivityBar rail.
 * Matches the real icon button: h-9 w-9 rounded-lg.
 */
function RailIconSlot() {
  return <Skeleton className="h-9 w-9 rounded-lg" />
}

/**
 * The left drawer skeleton — mirrors the Media drawer's tile grid.
 * The real AppSidebar renders a 2-column square-tile grid; the skeleton
 * approximates that with a CSS grid of pulsing squares.
 */
function DrawerSkeleton() {
  return (
    <div className="flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border/60 bg-sidebar">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-sidebar-border/60 px-3 py-2.5">
        <Skeleton className="h-4 w-20" />
        <div className="flex-1" />
        <Skeleton className="h-6 w-6 rounded-md" />
      </div>
      {/* Search bar */}
      <div className="px-3 py-2">
        <Skeleton className="h-7 w-full rounded-md" />
      </div>
      {/* Tile grid */}
      <div className="grid flex-1 grid-cols-2 gap-1.5 overflow-hidden px-2 pb-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

/**
 * The main content skeleton — header tab strip + a card grid placeholder.
 * Mirrors the Library tab's card canvas (the default boot surface).
 */
function MainSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-background">
      {/* Header tab strip — standalone only: the embed layout has zero top
          chrome (the floating status cluster is gated off there), so an
          embedded skeleton must not promise one. */}
      {!isDshEmbed && (
        <div className="flex items-center gap-3 border-b border-border/60 px-4 h-11 shrink-0">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-12" />
          <div className="flex-1" />
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>
      )}
      {/* Content area — card grid */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        {/* Section label */}
        <Skeleton className="h-4 w-28" />
        {/* Card grid */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Full workspace skeleton — the complete loading shell.
 * Renders the ActivityBar rail + left drawer + main content, matching
 * the real WorkspaceLayout's flex structure so the swap is seamless.
 */
export function AppSkeleton() {
  return (
    <div className="flex h-screen w-full bg-background">
      {/* ActivityBar rail + left drawer — standalone only (dead lanes in
          the DSH embed; painting them here is the boot flash). */}
      {!isDshEmbed && (
        <>
          <div className="tn-seam relative z-30 flex w-12 shrink-0 flex-col items-center border-r border-sidebar-border/60 bg-sidebar py-2.5">
            <div className="flex flex-col items-center gap-1">
              <RailIconSlot />
              <RailIconSlot />
            </div>
            <Skeleton className="mx-2 my-1.5 h-px w-7 rounded-full" />
            <div className="flex flex-col items-center gap-1">
              <RailIconSlot />
              <RailIconSlot />
            </div>
            <div className="flex-1" />
            <div className="flex flex-col items-center gap-1">
              <RailIconSlot />
            </div>
          </div>
          {/* Left drawer (mirrors the Media drawer — the default open drawer) */}
          <DrawerSkeleton />
        </>
      )}
      {/* Main content */}
      <MainSkeleton />
    </div>
  )
}
