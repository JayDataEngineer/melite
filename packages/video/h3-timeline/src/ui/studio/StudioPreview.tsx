/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { Clapperboard } from "lucide-react"
import type { RefObject } from "react"
import type { CardStage } from "@melite/contracts"
import { FilmPlayer } from "@melite/ui/FilmPlayer"
import type { FilmPlayerHandle } from "@melite/ui/FilmPlayer"
import { EmptyState, PaneHeader } from "@melite/ui"

/** Preview pane: final cut + window tiles + run history (lines 3928–4061).
 * Chrome rides the shared kit (2026-09-07): preview PaneHeader +
 * EmptyState (the aspirational TimelinePreview twin is deleted; this
 * pane is the one preview).
 *
 *  Behavior-neutral wiring (the ONLY edit in the whole split): the inline
 *  `onDuration={(sec) => setFilmDurSec(sec)}` is now the `onDuration` prop —
 *  the tenant passes the identical closure. The `running` prop is threaded
 *  explicitly (unlike the aspirational TimelinePreview sibling, which
 *  derives it from stage.status — that derivation can transiently disagree
 *  with the shell's live run flag, so this pane keeps the prop). */
export function StudioPreview({
  stage, running, filmstrip, filmRef, filmMap, frameIdx, barTotal, fps,
  handleFilmTime, handlePlayingChange, onDuration,
}: {
  stage: CardStage
  running: boolean
  filmstrip: { final: string | null; windows: Array<{ name: string; url: string }> }
  filmRef: RefObject<FilmPlayerHandle | null>
  filmMap: { fps?: number } | null
  frameIdx: number
  barTotal: number
  fps: number
  handleFilmTime: (sec: number) => void
  handlePlayingChange: (playing: boolean) => void
  onDuration: (sec: number) => void
}) {
  return (
    <>
  {/* ── MAIN — the preview (NLE order: the video ABOVE, the cut strip
      pinned BELOW — "VIEWPORT above, STRIP below", the CardStudio
      tenant convention). The filmstrip is the hero: the final cut as a
      playable tile, the run's windows behind it, mask-strip style. */}
  <div
    data-testid="tl-filmstrip"
    className="flex min-h-0 flex-1 flex-col rounded-md border border-border/50 bg-sidebar/30 px-2.5 py-2"
  >
    <PaneHeader
      variant="preview"
      title="Preview"
      meta={
        running
          ? "— filling as the run lands…"
          : filmstrip.windows.length
            ? "— from the last run (unchanged windows reuse on re-run)"
            : "— run compiles the calls into windows; each renders once, seams chained"
      }
    />
    {/* ── Run history — prior runs of THIS card, stamped by the gateway's
        draft write-back into result.metadata.history (newest first).
        Each chip links its run's final cut; the title carries the full
        run id, status, wall time. */}
    {(() => {
      type HistRow = { runId?: string; status?: string; at?: number; durationSec?: number; video?: string }
      const meta = stage.result?.metadata as { history?: HistRow[] } | undefined
      const hist = meta?.history
      if (!hist?.length) return null
      return (
        <div data-testid="tl-run-history" className="flex shrink-0 flex-wrap items-center gap-1 pb-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/60">
            Runs ({hist.length})
          </span>
          {hist.slice(0, 8).map((h, i) => (
            <a
              key={h.runId ?? i}
              href={h.video}
              target="_blank"
              rel="noreferrer"
              title={
                h.runId +
                " · " + (h.status ?? "?") +
                " · " + (h.durationSec ?? "?") + "s" +
                (h.at ? " · " + new Date(h.at * 1000).toLocaleString() : "")
              }
              className="rounded border border-sidebar-border/50 bg-sidebar/40 px-1.5 py-0.5 font-mono text-[9px] text-foreground/70 transition-colors hover:border-brand/50 hover:text-brand"
            >
              {h.status === "completed" ? "✓" : "×"}{" "}
              {(h.runId ?? "run").replace(/^run-/, "").slice(0, 8)} · {h.durationSec ?? "?"}s
            </a>
          ))}
        </div>
      )
    })()}
    {/* The hero — ONE player: the final cut IS the combined timeline
        (2026-09-01, operator: "the video preview shows more than one
        video instead of the combined timeline"). The window tiles
        render ONLY while a run is in flight (progress evidence, before
        a stitch exists); once the film lands, the player + the synced
        MotionTimelineBar below are the surface — the bar's call clips
        carry the per-window hover previews. */}
    <div className="flex min-h-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
      {filmstrip.final && (
        <div
          data-testid="tl-final-cut"
          className="flex h-full min-w-0 flex-1 flex-col gap-1 rounded-md border border-brand/50 bg-brand/[0.07] p-1.5 shadow-[0_0_18px_-6px_rgba(0,229,236,0.35)]"
        >
          <FilmPlayer
            ref={filmRef}
            src={filmstrip.final}
            className="min-h-0 w-full flex-1 rounded bg-black/50"
            data-testid="tl-film-player"
            onTime={handleFilmTime}
            onPlayingChange={handlePlayingChange}
            onDuration={onDuration}
          />
          <div className="flex items-center gap-1 px-0.5">
            <Clapperboard className="h-3 w-3 shrink-0 text-brand" aria-hidden />
            <span className="text-[9px] font-medium uppercase tracking-wide text-foreground/80">Final cut</span>
            <span className="ml-1 text-[9px] tabular-nums text-muted-foreground/60">
              {(frameIdx / (filmMap?.fps ?? (fps || 24))).toFixed(2)}s · frame {frameIdx}/{barTotal}
            </span>
            <a
              href={filmstrip.final}
              target="_blank"
              rel="noreferrer"
              className="ml-auto text-[9px] text-brand underline-offset-2 hover:underline"
            >
              open
            </a>
          </div>
        </div>
      )}
      {/* (REVERTED 2026-09-02, operator: "random popups / a second
          video view comes up" — the same verdict as 2026-09-01's
          "the video preview shows more than one video". Windows
          render ONLY while no final cut exists (progress evidence,
          mid-run). Once the film lands, the ONE FilmPlayer above is
          the preview — window tiles beside it read as stray popups
          and bury the hero. The bar's call clips still carry
          per-window hover previews for window-level review.) */}
      {!filmstrip.final && filmstrip.windows.map((w) => (
          <div
            key={w.name}
            data-testid="tl-window-tile"
            data-window={w.name}
            title={w.name}
            className="flex h-full w-36 shrink-0 flex-col gap-1 rounded-md border border-border/60 bg-sidebar/40 p-1.5 transition-colors hover:border-brand/40"
          >
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- muted B-roll progress tile */}
            <video
              src={w.url}
              muted
              playsInline
              preload="metadata"
              controls
              className="min-h-0 w-full flex-1 rounded bg-black/50 object-cover"
            />
            <span className="truncate px-0.5 text-[9px] tabular-nums text-foreground/60" title={w.name}>
              {/_w(\d+)_/.exec(w.name)?.[1] != null ? `window ${/_w(\d+)_/.exec(w.name)![1]}` : w.name}
            </span>
          </div>
        ))}
      {!filmstrip.windows.length && !filmstrip.final && (
        <EmptyState
          icon={<Clapperboard className="h-5 w-5 text-muted-foreground/25" aria-hidden />}
          title="No render yet — author the calls below, then Run."
          hint="Each window renders once; unchanged windows reuse across retakes."
        />
      )}
    </div>
  </div>
    </>
  )
}
