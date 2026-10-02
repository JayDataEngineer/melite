/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { RefObject } from "react"
import type { CardStage } from "@melite/contracts"
import { statusOf, RUN_STATUS_WORDS } from "@melite/contracts/stageView"
import { refGenreOf } from '@melite/models-h3/timelineContract'
import { EmptyState, PaneHeader } from "@melite/card-base/client"
import { FilmPlayer } from "@melite-plugin/timeline/ui/timeline"
import type { FilmPlayerHandle } from "@melite-plugin/timeline/ui/timeline"
import { Clapperboard } from '@melite/card-base/client'
import s from "./studio.module.css"

type HistRow = { runId?: string; status?: string; at?: number; durationSec?: number; video: string }

function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {}
}

function historyRows(stage: CardStage): HistRow[] {
  const sources: unknown[][] = []
  const metadataHistory = stage.result?.metadata?.history
  if (Array.isArray(metadataHistory)) sources.push(metadataHistory as unknown[])
  if (Array.isArray(stage.history)) sources.push(stage.history)
  const out: HistRow[] = []
  for (const raw of sources) for (const value of raw) {
    const entry = recordOf(value)
    const direct = typeof entry.video === "string" ? entry.video : ""
    const artifacts = recordOf(entry.artifacts)
    const assets = Array.isArray(entry.assetUrls)
      ? entry.assetUrls.filter((url): url is string => typeof url === "string")
      : []
    const rows = Object.entries(artifacts)
      .filter((entry): entry is [string, string] => {
        const [name, url] = entry
        return typeof url === "string" && url !== "" && refGenreOf(name, url) === "video"
      })
    const film = rows.find(([name, url]) => /(?:^|\/)h3_t4_film_\d+_\.mp4$/i.test(name) || /h3_t4_film_\d+_\.mp4(?:$|[?#])/i.test(url))
    const named = rows[0]?.[1]
    const flat = assets.find((url) => refGenreOf("", url) === "video")
    const video: string = direct !== "" && refGenreOf("", direct) === "video"
      ? direct
      : film?.[1] ?? named ?? flat ?? ""
    if (video === "") continue
    const runId = typeof entry.runId === "string"
      ? entry.runId
      : typeof entry.run_id === "string" ? entry.run_id : undefined
    out.push({
      ...(runId !== undefined ? { runId } : {}),
      ...(typeof entry.status === "string" ? { status: entry.status } : {}),
      ...(typeof entry.at === "number" ? { at: entry.at } : {}),
      ...(typeof entry.durationSec === "number" ? { durationSec: entry.durationSec } : {}),
      video,
    })
  }
  const seen = new Set<string>()
  return out.filter((entry): boolean => {
    const key = entry.runId ?? entry.video
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

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
    className={s.filmBox}
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
       const hist = historyRows(stage)
      if (!hist?.length) return null
      return (
        <div data-testid="tl-run-history" className={s.histRow}>
          <span className={s.histTitle}>
            Runs ({hist.length})
          </span>
          {hist.slice(0, 8).map((h, i) => {
            // the owner's done family decides the tick — a run the
            // estate settles 'succeeded' or a cached row is as done
            // as 'completed'. A word outside the vocabulary is not a
            // done run: this seat reads membership itself, because
            // the contract fold refuses unknown words (operator
            // decision 2026-10-12) and the studio must still mount
            // for any word it is handed. The word is derived ONCE —
            // an absent status folds to "" here, which the
            // membership test already answers, so the classifier is
            // never handed a coalesced second read.
            const word = (h.status ?? "").toLowerCase()
            return (
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
              className={s.histChip}
            >
              {(RUN_STATUS_WORDS.has(word) && statusOf(word) === "done") ? "✓" : "×"}{" "}
              {(h.runId ?? "run").replace(/^run-/, "").slice(0, 8)} · {h.durationSec ?? "?"}s
            </a>
            )
          })}
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
    <div className={s.heroRow}>
      {filmstrip.final && (
        <div
          data-testid="tl-final-cut"
          className={s.finalCut}
        >
          <FilmPlayer
            ref={filmRef}
            src={filmstrip.final}
            className={s.player}
            data-testid="tl-film-player"
            onTime={handleFilmTime}
            onPlayingChange={handlePlayingChange}
            onDuration={onDuration}
          />
          <div className={s.cutBar}>
            <Clapperboard className={s.cutIcon} aria-hidden />
            <span className={s.cutTitle}>Final cut</span>
            <span className={s.cutTime}>
              {(frameIdx / (filmMap?.fps ?? (fps || 24))).toFixed(2)}s · frame {frameIdx}/{barTotal}
            </span>
            <a
              href={filmstrip.final}
              target="_blank"
              rel="noreferrer"
              className={s.cutOpen}
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
            className={s.winTile}
          >
            {/* eslint-disable-next-line jsx-a11y/media-has-caption -- muted B-roll progress tile */}
            <video
              src={w.url}
              muted
              playsInline
              preload="metadata"
              controls
              className={s.winVid}
            />
            <span className={s.winName} title={w.name}>
              {/_w(\d+)_/.exec(w.name)?.[1] != null ? `window ${/_w(\d+)_/.exec(w.name)![1]}` : w.name}
            </span>
          </div>
        ))}
      {!filmstrip.windows.length && !filmstrip.final && (
        <EmptyState
          icon={<Clapperboard className={s.emptyGlyph} aria-hidden />}
          title="No render yet — author the calls below, then Run."
          hint="Each window renders once; unchanged windows reuse across retakes."
        />
      )}
    </div>
  </div>
    </>
  )
}
